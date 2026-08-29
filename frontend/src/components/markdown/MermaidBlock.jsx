import { useEffect, useRef, useState } from 'react'

// Mermaid is loaded once, lazily, and kept out of the main bundle chunk —
// most topics render zero or a handful of diagrams and the library is ~500KB.
let mermaidPromise = null
let diagramCounter = 0

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'var(--font-main)',
        themeVariables: {
          fontSize: '14px',
          background: 'transparent',
          primaryColor: '#1e293b',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#8b5cf6',
          secondaryColor: '#151c2c',
          secondaryBorderColor: '#3b82f6',
          tertiaryColor: '#0b0f19',
          tertiaryBorderColor: '#2e3a52',
          lineColor: '#64748b',
          textColor: '#f8fafc',
          mainBkg: '#151c2c',
          nodeBorder: '#8b5cf6',
          clusterBkg: '#1b2436',
          clusterBorder: '#2e3a52',
          edgeLabelBackground: '#151c2c',
          actorBkg: '#151c2c',
          actorBorder: '#8b5cf6',
          actorTextColor: '#f8fafc',
          actorLineColor: '#3e4c68',
          signalColor: '#94a3b8',
          signalTextColor: '#e2e8f0',
          labelBoxBkgColor: '#151c2c',
          labelBoxBorderColor: '#8b5cf6',
          labelTextColor: '#f8fafc',
          noteBkgColor: '#1e293b',
          noteBorderColor: '#f59e0b',
          noteTextColor: '#f8fafc'
        }
      })
      return mermaid
    })
  }
  return mermaidPromise
}

/**
 * Renders one ```mermaid fence. On a parse/render failure it falls back to
 * the raw source in a <pre><code> block rather than a blank page or a thrown
 * error — a malformed diagram in curriculum content must never take the
 * whole article down with it.
 */
export default function MermaidBlock({ code }) {
  const containerRef = useRef(null)
  const [svg, setSvg] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)

    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return null
        const id = `mermaid-diagram-${diagramCounter++}`
        return mermaid.render(id, code)
      })
      .then((result) => {
        if (cancelled || !result) return
        setSvg(result.svg)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Diagram failed to render')
      })

    return () => {
      cancelled = true
    }
  }, [code])

  if (error) {
    return (
      <div className="mermaid-block mermaid-block-error" role="img" aria-label="Diagram failed to render, showing source">
        <p className="mermaid-error-message">⚠ Diagram could not be rendered: {error}</p>
        <pre><code>{code}</code></pre>
      </div>
    )
  }

  if (!svg) {
    return <div className="mermaid-block mermaid-block-loading" aria-live="polite">Rendering diagram…</div>
  }

  return (
    <div
      className="mermaid-block"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
