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

// mermaid.initialize()/render() mutate module-level state inside the library itself, so firing
// them from several MermaidBlock instances at once (any topic with more than one diagram, which
// mounts them all in the same tick) races: one call's initialize() can stomp the config another
// call's render() is mid-way through reading, and the observed failure mode is a render() promise
// that never settles — the diagram sits on "Rendering diagram…" forever. Routing every instance's
// work through one FIFO queue makes them behave as if written with sequential awaits, at the cost
// of diagrams appearing one after another instead of simultaneously (imperceptible in practice).
let renderQueue = Promise.resolve()

// A queue only helps if it always drains: without a bound, one task that never settles (a
// pathological diagram, a stalled font/network fetch inside it) wedges every diagram queued
// behind it on the page, forever — trading the original race for a worse, page-wide version of
// the same "stuck on Rendering diagram…" symptom. Racing each task against a timeout guarantees
// the queue always moves on, whatever the cause; a diagram that hits it shows the normal error
// fallback instead of hanging.
const MERMAID_RENDER_TIMEOUT_MS = 12000

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Diagram took too long to render')), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

function queueMermaidTask(task) {
  const scheduled = renderQueue.then(
    () => withTimeout(task(), MERMAID_RENDER_TIMEOUT_MS),
    () => withTimeout(task(), MERMAID_RENDER_TIMEOUT_MS)
  )
  renderQueue = scheduled.catch(() => {})
  return scheduled
}

// mermaid measures each label's text to size its node box the instant it renders. --font-body is
// a self-hosted webfont (IBM Plex Sans) that may not have finished downloading yet on an early
// mount, so that measurement can happen against the fallback font in the stack; the swap to the
// real (often wider) font repaints the text without ever re-measuring the box, clipping it. Not
// present in jsdom (document.fonts is undefined there), so this is a no-op in tests.
async function ensureFontsReady() {
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready
    }
  } catch {
    // A font-loading failure shouldn't block the diagram from rendering with fallback fonts.
  }
}

function mermaidConfiguration(element) {
  const styles = getComputedStyle(element || document.documentElement)
  // A fallback is required, not cosmetic: mermaid throws ("Unsupported color format") on an empty
  // string rather than falling back itself, so any environment where these custom properties
  // haven't resolved yet (or don't resolve at all, e.g. jsdom in tests) would otherwise take the
  // whole diagram down to the raw-source error state. Values below mirror the dark theme's :root
  // defaults in App.css.
  const css = (name, fallback) => styles.getPropertyValue(name).trim() || fallback

  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'var(--font-body)',
    themeVariables: {
      fontSize: '14px',
      background: 'transparent',
      primaryColor: css('--bg-raised', '#1c2438'),
      primaryTextColor: css('--text-primary', '#f2f5fa'),
      primaryBorderColor: css('--cat-base', '#a78bfa'),
      secondaryColor: css('--bg-surface', '#131a29'),
      secondaryBorderColor: css('--border-strong', '#3b4763'),
      tertiaryColor: css('--bg-page', '#0b0f1a'),
      tertiaryBorderColor: css('--border-default', '#2a344b'),
      lineColor: css('--text-muted', '#8593a8'),
      textColor: css('--text-prose', '#dce3ee'),
      mainBkg: css('--bg-surface', '#131a29'),
      nodeBorder: css('--cat-base', '#a78bfa'),
      clusterBkg: css('--bg-inset', '#080c15'),
      clusterBorder: css('--border-default', '#2a344b'),
      edgeLabelBackground: css('--bg-surface', '#131a29'),
      actorBkg: css('--bg-surface', '#131a29'),
      actorBorder: css('--cat-base', '#a78bfa'),
      actorTextColor: css('--text-primary', '#f2f5fa'),
      actorLineColor: css('--border-strong', '#3b4763'),
      signalColor: css('--text-secondary', '#b3c0d4'),
      signalTextColor: css('--text-prose', '#dce3ee'),
      labelBoxBkgColor: css('--bg-raised', '#1c2438'),
      labelBoxBorderColor: css('--cat-base', '#a78bfa'),
      labelTextColor: css('--text-primary', '#f2f5fa'),
      noteBkgColor: css('--state-warning-tint', '#2e2109'),
      noteBorderColor: css('--state-warning', '#fbbf24'),
      noteTextColor: css('--text-prose', '#dce3ee')
    },
    // A touch more breathing room than mermaid's default node/actor padding, now that the
    // box-sizing fix (App.css) makes that padding actually render instead of getting clipped.
    htmlLabels: true,
    flowchart: { padding: 16 },
    sequence: { actorMargin: 60, messageMargin: 40, boxMargin: 12 }
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

    queueMermaidTask(async () => {
      const [mermaid] = await Promise.all([loadMermaid(), ensureFontsReady()])
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
