import React from 'react'

export default function LegendRow({ items = [], className = '', ariaLabel = 'Diagram legend' }) {
  if (!items.length) return null

  return (
    <ul className={['legend-row', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const entry = typeof item === 'string' ? { label: item } : item
        return (
          <li className="legend-row-item" key={entry.id ?? entry.label ?? index}>
            <span
              className={['legend-swatch', entry.className].filter(Boolean).join(' ')}
              aria-hidden="true"
            />
            <span>{entry.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
