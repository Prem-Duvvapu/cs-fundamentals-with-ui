import { useEffect, useState } from 'react'
import diagramManifest from '../../generated/diagramManifest.json'
import { diagramHash } from '../../utils/diagramHash'

const THEME_EVENT = 'cs-fundamentals:theme-change'

function readTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function diagramAssetUrl(hash, theme) {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}diagrams/${hash}-${theme}.svg`
}

function diagramType(code) {
  const declaration = code
    .split('\n')
    .map(line => line.trim())
    .find(line => line && !line.startsWith('%%')) || ''

  if (/^sequenceDiagram\b/i.test(declaration)) return 'Sequence diagram'
  if (/^(flowchart|graph)\b/i.test(declaration)) return 'Flowchart'
  if (/^stateDiagram(?:-v2)?\b/i.test(declaration)) return 'State diagram'
  if (/^classDiagram\b/i.test(declaration)) return 'Class diagram'
  if (/^erDiagram\b/i.test(declaration)) return 'Entity relationship diagram'
  if (/^gantt\b/i.test(declaration)) return 'Timeline diagram'
  if (/^mindmap\b/i.test(declaration)) return 'Mind map'
  if (/^pie\b/i.test(declaration)) return 'Pie chart'
  return 'Diagram'
}

function diagramDescription(code) {
  const labels = []
  const seen = new Set()
  const add = value => {
    const clean = value
      .replace(/<br\s*\/?>/gi, ' ')
      // Mermaid's UML stereotype syntax (`<<interface>>`) must go before the generic HTML-tag
      // strip below, which otherwise partial-matches it (`<[^>]+>` stops at the first `>`,
      // consuming only `<<interface>` and leaving a stray trailing `>` in the label).
      .replace(/<<[^>]*>>/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      // A state-transition capture like `A --> Ready: admitted` grabs `Ready:` (no space before
      // the colon) as the bare endpoint token; strip it so it dedupes against a plain `Ready`.
      .replace(/:+$/, '')
    // A state diagram's anonymous start/end node (`[*]`) captures as a bare `*` — not a label.
    if (labels.length < 4 && clean && clean.length <= 80 && /[a-zA-Z0-9]/.test(clean) && !seen.has(clean)) {
      seen.add(clean)
      labels.push(clean)
    }
  }
  for (const match of code.matchAll(/"([^"]+)"|'([^']+)'|\[([^\]]+)]|\{([^}]+)}/g)) {
    add(match[1] || match[2] || match[3] || match[4])
    if (labels.length >= 4) break
  }
  for (const match of code.matchAll(/^\s*(?:participant|actor)\s+\S+\s+as\s+(.+)$/gim)) {
    add(match[1])
    if (labels.length >= 4) break
  }
  // State diagrams name states as bare, unquoted transition endpoints (`Ready --> Running`),
  // which the quote/bracket capture above never sees (`[*]`, the anonymous start/end state, is
  // excluded, not a real state name). Only try this when nothing else was found: flowchart nodes
  // use the same `-->` arrow, and a node's `id["quoted label"]` has no space before its bracket,
  // so `\S+` can capture a truncated `id["partial` fragment — harmless as a last resort, wrong to
  // mix in alongside the clean quoted labels the first loop above already found.
  if (labels.length === 0) {
    for (const match of code.matchAll(/^\s*(\S+)\s*-{2,3}>\s*(\S+)/gm)) {
      if (match[1] !== '[*]') add(match[1])
      if (labels.length >= 4) break
      if (match[2] !== '[*]') add(match[2])
      if (labels.length >= 4) break
    }
  }
  return labels.length > 0 ? `${diagramType(code)} showing ${labels.join(', ')}` : `${diagramType(code)} for the surrounding lesson`
}

function DiagramFallback({ code, message }) {
  return (
    <div className="mermaid-block mermaid-block-error" role="figure" aria-label="Diagram unavailable, showing source">
      <p className="mermaid-error-message">⚠ {message}</p>
      <pre><code>{code}</code></pre>
    </div>
  )
}

/**
 * Displays one pre-rendered Mermaid asset. Diagrams are rendered for both themes by
 * scripts/render-diagrams.mjs, so the reader only selects an image and never loads Mermaid.
 * A missing or failed asset degrades to the source instead of leaving an empty article.
 */
export default function MermaidBlock({ code }) {
  const [theme, setTheme] = useState(readTheme)
  const [failedAsset, setFailedAsset] = useState(null)
  const hash = diagramHash(code)
  const metadata = diagramManifest[hash]
  const assetUrl = metadata ? diagramAssetUrl(hash, theme) : null

  useEffect(() => {
    const handleThemeChange = (event) => {
      const requestedTheme = event.detail?.theme
      setTheme(requestedTheme === 'light' || requestedTheme === 'dark' ? requestedTheme : readTheme())
    }
    window.addEventListener(THEME_EVENT, handleThemeChange)
    return () => window.removeEventListener(THEME_EVENT, handleThemeChange)
  }, [])

  if (!metadata) {
    return <DiagramFallback code={code} message="Pre-rendered diagram is unavailable. Showing its source." />
  }

  if (failedAsset === assetUrl) {
    return <DiagramFallback code={code} message="Diagram asset could not be loaded. Showing its source." />
  }

  return (
    <figure className="mermaid-block u-scroll-x-hint" data-diagram-hash={hash} tabIndex="0" aria-label="Scrollable lesson diagram">
      <a className="mermaid-open-link" href={assetUrl} target="_blank" rel="noreferrer" aria-label="Open full-size diagram in a new tab">
        <img
          className="mermaid-diagram"
          src={assetUrl}
          width={metadata.width}
          height={metadata.height}
          alt={diagramDescription(code)}
          loading="lazy"
          decoding="async"
          onError={() => setFailedAsset(assetUrl)}
        />
      </a>
      <figcaption>
        <span className="scroll-hint-caption">Scroll to inspect the diagram, or open it full size →</span>
        <details className="diagram-text-alternative">
          <summary>Read diagram as text</summary>
          <pre><code>{code}</code></pre>
        </details>
      </figcaption>
    </figure>
  )
}
