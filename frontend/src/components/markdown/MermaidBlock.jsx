import { useEffect, useRef, useState } from 'react'

// Mermaid is loaded once, lazily, and kept out of the main bundle chunk —
// most topics render zero or a handful of diagrams and the library is ~500KB.
let mermaidPromise = null
let diagramCounter = 0

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => mod.default)
  }
  return mermaidPromise
}

function mermaidConfiguration(element) {
  const styles = getComputedStyle(element || document.documentElement)
  const css = (name) => styles.getPropertyValue(name).trim()

  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'var(--font-body)',
    themeVariables: {
      fontSize: '14px',
      background: 'transparent',
      primaryColor: css('--bg-raised'),
      primaryTextColor: css('--text-primary'),
      primaryBorderColor: css('--cat-base'),
      secondaryColor: css('--bg-surface'),
      secondaryBorderColor: css('--border-strong'),
      tertiaryColor: css('--bg-page'),
      tertiaryBorderColor: css('--border-default'),
      lineColor: css('--text-muted'),
      textColor: css('--text-prose'),
      mainBkg: css('--bg-surface'),
      nodeBorder: css('--cat-base'),
      clusterBkg: css('--bg-inset'),
      clusterBorder: css('--border-default'),
      edgeLabelBackground: css('--bg-surface'),
      actorBkg: css('--bg-surface'),
      actorBorder: css('--cat-base'),
      actorTextColor: css('--text-primary'),
      actorLineColor: css('--border-strong'),
      signalColor: css('--text-secondary'),
      signalTextColor: css('--text-prose'),
      labelBoxBkgColor: css('--bg-raised'),
      labelBoxBorderColor: css('--cat-base'),
      labelTextColor: css('--text-primary'),
      noteBkgColor: css('--state-warning-tint'),
      noteBorderColor: css('--state-warning'),
      noteTextColor: css('--text-prose')
    }
  }
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
  const [themeVersion, setThemeVersion] = useState(0)

  useEffect(() => {
    const handleThemeChange = () => setThemeVersion(version => version + 1)
    window.addEventListener('cs-fundamentals:theme-change', handleThemeChange)
    return () => window.removeEventListener('cs-fundamentals:theme-change', handleThemeChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)

    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return null
        mermaid.initialize(mermaidConfiguration(containerRef.current))
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
  }, [code, themeVersion])

  if (error) {
    return (
      <div ref={containerRef} className="mermaid-block mermaid-block-error" role="img" aria-label="Diagram failed to render, showing source">
        <p className="mermaid-error-message">⚠ Diagram could not be rendered: {error}</p>
        <pre><code>{code}</code></pre>
      </div>
    )
  }

  if (!svg) {
    return <div ref={containerRef} className="mermaid-block mermaid-block-loading" aria-live="polite">Rendering diagram…</div>
  }

  return (
    <>
      <div
        className="mermaid-block u-scroll-x-hint"
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="scroll-hint-caption">Scroll to see the full diagram →</p>
    </>
  )
}
