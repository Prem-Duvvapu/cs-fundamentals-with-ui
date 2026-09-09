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
    const clean = value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (clean && clean.length <= 80 && !seen.has(clean)) {
      seen.add(clean)
      labels.push(clean)
    }
  }
  for (const match of code.matchAll(/"([^"]+)"|'([^']+)'|\[([^\]]+)]|\{([^}]+)}/g)) {
    add(match[1] || match[2] || match[3] || match[4])
    if (labels.length === 4) break
  }
  for (const match of code.matchAll(/^\s*(?:participant|actor)\s+\S+\s+as\s+(.+)$/gim)) {
    add(match[1])
    if (labels.length === 4) break
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
