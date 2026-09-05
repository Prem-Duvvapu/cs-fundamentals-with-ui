#!/usr/bin/env node
/**
 * Pre-renders every ```mermaid fence in content/ to static SVG, once, at build time.
 *
 * Why this exists rather than rendering in the reader's browser: client-side mermaid put a
 * "Rendering diagram…" state, a render queue, a webfont race and a per-visitor ~700KB library on
 * the critical path of every lesson, and its own label-width estimate clips text (see the width
 * correction below). None of that is a per-visitor problem — the 280-odd diagrams are authored
 * once and read many times, so they belong in the build.
 *
 * Each diagram is rendered twice, once per theme, because mermaid bakes theme colours into the
 * SVG as literal values; the page shows the matching one via CSS.
 *
 * Usage: node scripts/render-diagrams.mjs [--check]
 *   --check  verify every diagram already has up-to-date output; exits non-zero otherwise
 *            (for CI, so a content edit without a re-render can't ship stale diagrams)
 *
 * Known limitation: a small number of diagrams (classDiagram/erDiagram inheritance connectors,
 * observed so far) get very slightly different bezier control points for an edge curve between
 * separate runs of identical input — the diagram is visually equivalent either way, but it means
 * `--check` can occasionally flag one of those as stale with no real content change. This traces
 * to mermaid/dagre's own edge-routing, not this script; re-running resolves it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const CONTENT_DIR = path.resolve(REPO_ROOT, 'content')
const OUT_DIR = path.resolve(REPO_ROOT, 'frontend/public/diagrams')
const MANIFEST_PATH = path.resolve(REPO_ROOT, 'frontend/src/generated/diagramManifest.json')
const APP_CSS = path.resolve(REPO_ROOT, 'frontend/src/App.css')

const require = createRequire(path.resolve(REPO_ROOT, 'frontend/package.json'))
const { diagramHash } = await import(pathToFileURL(path.resolve(REPO_ROOT, 'frontend/src/utils/diagramHash.js')).href)

const THEMES = ['dark', 'light']

function findContentFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findContentFiles(full))
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out.sort()
}

function collectDiagrams() {
  const seen = new Map()
  for (const file of findContentFiles(CONTENT_DIR)) {
    const content = fs.readFileSync(file, 'utf-8')
    const regex = /```mermaid\s*\n([\s\S]*?)```/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const code = match[1].trim()
      const hash = diagramHash(code)
      if (!seen.has(hash)) {
        seen.set(hash, { hash, code, source: path.relative(REPO_ROOT, file).replace(/\\/g, '/') })
      }
    }
  }
  return [...seen.values()]
}

/** The :root / [data-theme="light"] token blocks, so the rendered SVG uses the real palette. */
function readThemeTokens() {
  const css = fs.readFileSync(APP_CSS, 'utf-8')
  const pick = (block) => Object.fromEntries(
    [...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map(m => [m[1], m[2].trim()])
  )
  const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)
  const lightBlock = /\[data-theme=["']light["']\]\s*\{([\s\S]*?)\n\}/.exec(css)
  const dark = rootBlock ? pick(rootBlock[1]) : {}
  const light = { ...dark, ...(lightBlock ? pick(lightBlock[1]) : {}) }
  return { dark, light }
}

function resolveToken(tokens, name, fallback) {
  let value = tokens[name]
  for (let i = 0; i < 5 && value && value.startsWith('var('); i++) {
    const inner = /var\(\s*(--[a-z0-9-]+)/i.exec(value)
    value = inner ? tokens[inner[1]] : undefined
  }
  return value || fallback
}

function themeVariables(tokens) {
  const t = (name, fallback) => resolveToken(tokens, name, fallback)
  return {
    fontSize: '14px',
    background: 'transparent',
    primaryColor: t('--bg-raised', '#1c2438'),
    primaryTextColor: t('--text-primary', '#f2f5fa'),
    primaryBorderColor: t('--cat-base', '#a78bfa'),
    secondaryColor: t('--bg-surface', '#131a29'),
    secondaryBorderColor: t('--border-strong', '#3b4763'),
    tertiaryColor: t('--bg-page', '#0b0f1a'),
    tertiaryBorderColor: t('--border-default', '#2a344b'),
    lineColor: t('--text-muted', '#8593a8'),
    textColor: t('--text-prose', '#dce3ee'),
    mainBkg: t('--bg-surface', '#131a29'),
    nodeBorder: t('--cat-base', '#a78bfa'),
    clusterBkg: t('--bg-inset', '#080c15'),
    clusterBorder: t('--border-default', '#2a344b'),
    edgeLabelBackground: t('--bg-surface', '#131a29'),
    actorBkg: t('--bg-surface', '#131a29'),
    actorBorder: t('--cat-base', '#a78bfa'),
    actorTextColor: t('--text-primary', '#f2f5fa'),
    actorLineColor: t('--border-strong', '#3b4763'),
    signalColor: t('--text-secondary', '#b3c0d4'),
    signalTextColor: t('--text-prose', '#dce3ee'),
    labelBoxBkgColor: t('--bg-raised', '#1c2438'),
    labelBoxBorderColor: t('--cat-base', '#a78bfa'),
    labelTextColor: t('--text-primary', '#f2f5fa'),
    noteBkgColor: t('--state-warning-tint', '#2e2109'),
    noteBorderColor: t('--state-warning', '#fbbf24'),
    noteTextColor: t('--text-prose', '#dce3ee')
  }
}

const mermaidPath = require.resolve('mermaid/dist/mermaid.min.js')

function pageHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  /* Match the app's own body font so label metrics are measured against the real thing. */
  body { margin: 0; font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; }
</style>
</head><body><div id="host"></div></body></html>`
}

async function renderAll({ checkOnly }) {
  const diagrams = collectDiagrams()
  console.log(`Found ${diagrams.length} unique diagrams in content/.`)

  const tokens = readThemeTokens()
  // playwright's entry is CJS, so the namespace object puts its exports under .default here.
  const playwright = await import(pathToFileURL(require.resolve('playwright')).href)
  const { chromium } = playwright.default ?? playwright
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
  await page.setContent(pageHtml())
  await page.addScriptTag({ path: mermaidPath })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })

  const manifest = {}
  const failures = []
  let stale = 0

  for (const diagram of diagrams) {
    manifest[diagram.hash] = { source: diagram.source }
    for (const theme of THEMES) {
      const outFile = path.join(OUT_DIR, `${diagram.hash}-${theme}.svg`)
      const result = await page.evaluate(async ({ code, vars, id }) => {
        const mermaid = window.mermaid
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          themeVariables: vars,
          htmlLabels: true,
          flowchart: { padding: 16 },
          sequence: { actorMargin: 60, messageMargin: 40, boxMargin: 12 }
        })
        try {
          const { svg } = await mermaid.render(id, code)
          const host = document.getElementById('host')
          host.innerHTML = svg
          const svgEl = host.querySelector('svg')

          // The permanent fix for clipped labels: mermaid's own width estimate for an htmlLabels
          // node runs 15-25% under the label's real rendered width, so it bakes a foreignObject
          // too narrow for its own text and the overflow gets clipped. Here, in a real browser
          // with the real font, the true width is measurable — so widen each box to fit and push
          // the surrounding shape out by the same amount, correcting the geometry at the source
          // instead of relying on the reader's CSS to paper over it.
          let widened = 0
          svgEl.querySelectorAll('foreignObject').forEach(fo => {
            const inner = fo.firstElementChild
            if (!inner) return
            const declared = parseFloat(fo.getAttribute('width') || '0')
            const needed = Math.ceil(inner.scrollWidth) + 2
            if (needed > declared) {
              const delta = needed - declared
              fo.setAttribute('width', String(needed))
              const x = parseFloat(fo.getAttribute('x') || '0')
              fo.setAttribute('x', String(x - delta / 2))
              const shape = fo.closest('.node, .label')?.querySelector('rect, polygon, path')
              if (shape && shape.tagName === 'rect') {
                const rw = parseFloat(shape.getAttribute('width') || '0')
                const rx = parseFloat(shape.getAttribute('x') || '0')
                shape.setAttribute('width', String(rw + delta))
                shape.setAttribute('x', String(rx - delta / 2))
              }
              widened++
            }
          })

          // A subgraph title can extend past its own cluster's box (a long connecting edge, or a
          // deeply nested/adjacent subgraph, can leave less room than the title needs), and SVG
          // paints in document order — so a later-drawn sibling cluster's opaque background can
          // paint over an earlier cluster's overflowing title, hiding text without ever "clipping"
          // it in the DOM (confirmed on content/aiml/01-embeddings-vector-db.md's HNSW diagram: a
          // deliberately long "long-range jump" edge widens Layer 2 enough to paint over Layer 1's
          // title). Moving every cluster title to the end of the SVG guarantees it paints last —
          // on top of every node, edge and cluster background — regardless of layout spacing.
          svgEl.querySelectorAll('.cluster-label').forEach(label => svgEl.appendChild(label))

          const box = svgEl.getBBox()
          return {
            ok: true,
            svg: host.innerHTML,
            width: Math.ceil(box.width + box.x * 2) || Math.ceil(box.width),
            height: Math.ceil(box.height),
            viewBox: svgEl.getAttribute('viewBox'),
            widened
          }
        } catch (error) {
          return { ok: false, error: error?.message || String(error) }
        }
      }, { code: diagram.code, vars: themeVariables(tokens[theme]), id: `d${diagram.hash}${theme}` })

      if (!result.ok) {
        failures.push(`${diagram.source} [${diagram.hash} ${theme}]: ${result.error}`)
        continue
      }

      const existing = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : null
      if (existing !== result.svg) {
        stale++
        if (!checkOnly) fs.writeFileSync(outFile, result.svg, 'utf-8')
      }

      if (theme === 'dark') {
        const vb = (result.viewBox || '').split(/\s+/).map(Number)
        manifest[diagram.hash].width = vb.length === 4 ? Math.ceil(vb[2]) : result.width
        manifest[diagram.hash].height = vb.length === 4 ? Math.ceil(vb[3]) : result.height
        manifest[diagram.hash].widened = result.widened
      }
    }
  }

  await browser.close()

  const manifestJson = JSON.stringify(manifest, null, 2) + '\n'
  const manifestChanged = !fs.existsSync(MANIFEST_PATH) || fs.readFileSync(MANIFEST_PATH, 'utf-8') !== manifestJson
  if (!checkOnly && manifestChanged) fs.writeFileSync(MANIFEST_PATH, manifestJson, 'utf-8')

  // A content edit changes a diagram's hash, orphaning its old *-dark.svg/*-light.svg pair (a
  // renamed hash, not an overwrite) — sweep them so public/diagrams never accumulates dead assets.
  const validHashes = new Set(Object.keys(manifest))
  let orphaned = 0
  for (const file of fs.readdirSync(OUT_DIR)) {
    const match = /^([0-9a-f]{8})-(dark|light)\.svg$/.exec(file)
    if (!match || !validHashes.has(match[1])) {
      orphaned++
      if (!checkOnly) fs.rmSync(path.join(OUT_DIR, file))
    }
  }

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} diagram(s) failed to render:`)
    failures.forEach(f => console.error(`   - ${f}`))
    return 1
  }

  const totalWidened = Object.values(manifest).reduce((sum, m) => sum + (m.widened || 0), 0)
  if (checkOnly) {
    if (stale > 0 || manifestChanged || orphaned > 0) {
      console.error(`\n❌ ${stale} diagram file(s) out of date, ${orphaned} orphaned. Run: node scripts/render-diagrams.mjs`)
      return 1
    }
    console.log(`\n✅ All ${diagrams.length} diagrams are up to date.`)
    return 0
  }

  console.log(`\n✅ Rendered ${diagrams.length} diagrams x ${THEMES.length} themes -> ${path.relative(REPO_ROOT, OUT_DIR)}`)
  console.log(`   ${stale} file(s) written, ${orphaned} orphaned file(s) removed; widened ${totalWidened} label box(es) that mermaid had sized too narrow.`)
  return 0
}

const checkOnly = process.argv.includes('--check')
process.exit(await renderAll({ checkOnly }))
