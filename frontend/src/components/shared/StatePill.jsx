import React from 'react'

const TONE_GLYPHS = {
  success: '✓',
  warning: '▲',
  danger: '✗',
  info: '◆',
  idle: '—'
}

export default function StatePill({ tone = 'idle', glyph, children, className = '', ...props }) {
  const safeTone = Object.hasOwn(TONE_GLYPHS, tone) ? tone : 'idle'
  const classes = ['u-pill', `u-pill-${safeTone}`, className].filter(Boolean).join(' ')

  return (
    <span className={classes} {...props}>
      <span className="u-pill-glyph" aria-hidden="true">
        {glyph ?? TONE_GLYPHS[safeTone]}
      </span>
      <span>{children}</span>
    </span>
  )
}
