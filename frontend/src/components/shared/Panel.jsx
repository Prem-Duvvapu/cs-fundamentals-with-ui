import React from 'react'

export default function Panel({
  as: Component = 'section',
  tone = 'default',
  className = '',
  children,
  ...props
}) {
  const toneClass = tone === 'deep' ? 'u-panel-deep' : 'u-panel'
  const classes = [toneClass, className].filter(Boolean).join(' ')

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  )
}
