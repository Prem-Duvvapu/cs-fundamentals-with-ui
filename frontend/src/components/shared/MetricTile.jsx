import React from 'react'

export default function MetricTile({ label, value, highlighted = false, className = '', ...props }) {
  const classes = ['metric-tile', highlighted && 'is-highlighted', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      <span className="metric-tile-label">{label}</span>
      <span className="metric-tile-value">{value}</span>
    </div>
  )
}
