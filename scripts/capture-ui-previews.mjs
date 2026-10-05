#!/usr/bin/env node
// Reproducible UI previews and reader-density measurements for the built frontend.
// Usage: npm run build --prefix frontend && node scripts/capture-ui-previews.mjs [outputDir]
// Optional: CS_PREVIEW_ROUTES=reader,home to limit routes. Uses API fixtures (see lib/ui-fixtures.mjs),
// so the images are presentation evidence, not real-backend integration checks.
import fs from 'node:fs'
import path from 'node:path'
import { launchChromium, repoRoot, routeFixtureApi, startStaticServer } from './lib/ui-fixtures.mjs'

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'category', path: '/category/java-spring' },
  { name: 'reader', path: '/topic/java-execution-pipeline', reader: true },
  { name: 'practice', path: '/topic/java-execution-pipeline?view=practice', ready: '.interview-question' },
  { name: 'reader-long-title', path: '/topic/spring-mvc-lifecycle', reader: true },
  { name: 'reader-os', path: '/topic/cpu-scheduling', reader: true },
  { name: 'simulation', path: '/topic/cpu-scheduling?view=simulation', ready: '.viz-card, .viz-container, .action-buttons-grid' },
  { name: 'search', path: '/search?q=java', ready: '.topic-row' },
  { name: 'interview', path: '/interview/all', ready: '.interview-question' },
  { name: 'progress', path: '/progress' },
  { name: 'review', path: '/review' }
]
const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 375, height: 960 }]
const outputDir = path.resolve(process.argv[2] || path.join(repoRoot, 'frontend/test-results/ui-previews'))
const only = process.env.CS_PREVIEW_ROUTES?.split(',').map(value => value.trim()).filter(Boolean)
fs.mkdirSync(outputDir, { recursive: true })

const server = await startStaticServer()
const browser = await launchChromium()
const metrics = []
try {
  for (const theme of ['dark', 'light']) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: theme, reducedMotion: 'reduce' })
      await context.addInitScript(selected => { try { localStorage.setItem('cs-fundamentals-theme', selected) } catch {} }, theme)
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await routeFixtureApi(page)
      for (const route of ROUTES.filter(item => !only || only.includes(item.name))) {
        await page.goto(`${server.origin}${route.path}`, { waitUntil: 'domcontentloaded' })
        await page.locator(`html[data-theme="${theme}"]`).waitFor()
        await page.locator('h1').first().waitFor({ timeout: 15_000 })
        if (route.reader) await page.locator('.topic-content h2').first().waitFor({ timeout: 15_000 })
        if (route.ready) await page.locator(route.ready).first().waitFor({ timeout: 15_000 })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(150)
        const measured = await page.evaluate(() => {
          const top = selector => {
            const element = document.querySelector(selector)
            return element ? Math.round(element.getBoundingClientRect().top + window.scrollY) : null
          }
          const prose = document.querySelector('.topic-content p')
          let proseWidthCh = null
          if (prose) {
            const probe = document.createElement('span')
            probe.style.cssText = 'display:inline-block;width:1ch'
            prose.appendChild(probe)
            proseWidthCh = Math.round(prose.getBoundingClientRect().width / probe.getBoundingClientRect().width)
            probe.remove()
          }
          return {
            articleTop: top('.topic-content'),
            firstParagraphTop: top('.topic-content p'),
            proseWidthCh,
            proseFontPx: prose ? parseFloat(getComputedStyle(prose).fontSize) : null,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth
          }
        })
        const file = `${theme}-${viewport.name}-${route.name}.png`
        await page.screenshot({ path: path.join(outputDir, file), fullPage: false })
        metrics.push({ theme, viewport: viewport.name, route: route.name, path: route.path, file, overflow: measured.documentWidth > measured.viewportWidth + 1, ...measured, errors: [...errors] })
        errors.length = 0
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
  await server.close()
}

fs.writeFileSync(path.join(outputDir, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)
for (const item of metrics) {
  const reader = item.articleTop === null ? '' : ` article@${item.articleTop}px firstParagraph@${item.firstParagraphTop}px`
  console.log(`${item.theme.padEnd(5)} ${item.viewport.padEnd(7)} ${item.route.padEnd(17)}${reader}${item.overflow ? ' OVERFLOW' : ''}${item.errors.length ? ` errors=${item.errors.length}` : ''}`)
}
console.log(`Wrote ${metrics.length} previews and metrics.json to ${outputDir}`)
