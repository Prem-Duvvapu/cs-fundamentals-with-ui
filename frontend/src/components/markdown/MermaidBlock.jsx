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

function diagramDescription(code) {
  const declaration = code
    .split('\n')
    .map(line => line.trim())
    .find(line => line && !line.startsWith('%%')) || ''

  if (/^sequenceDiagram\b/i.test(declaration)) return 'Sequence diagram for the surrounding lesson'
  if (/^(flowchart|graph)\b/i.test(declaration)) return 'Flowchart for the surrounding lesson'
  if (/^stateDiagram(?:-v2)?\b/i.test(declaration)) return 'State diagram for the surrounding lesson'
  if (/^classDiagram\b/i.test(declaration)) return 'Class diagram for the surrounding lesson'
  if (/^erDiagram\b/i.test(declaration)) return 'Entity relationship diagram for the surrounding lesson'
  if (/^gantt\b/i.test(declaration)) return 'Timeline diagram for the surrounding lesson'
  if (/^mindmap\b/i.test(declaration)) return 'Mind map for the surrounding lesson'
  if (/^pie\b/i.test(declaration)) return 'Pie chart for the surrounding lesson'
  return 'Diagram for the surrounding lesson'
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
    <figure className="mermaid-block u-scroll-x-hint" data-diagram-hash={hash}>
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
      <figcaption className="scroll-hint-caption">Scroll to see the full diagram →</figcaption>
    </figure>
  )
}
