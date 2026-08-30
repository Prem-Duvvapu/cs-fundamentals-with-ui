import React from 'react'
import FieldGrid from './FieldGrid'
import MetricTile from './MetricTile'
import Panel from './Panel'

function formatValue(value) {
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function formatLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').trim()
}

export default function StateInspector({ title = 'Internal state inspector', data = {}, highlightKey = null }) {
  if (!data || Object.keys(data).length === 0) return null

  const changedValue = highlightKey != null && Object.hasOwn(data, highlightKey)
    ? `${formatLabel(highlightKey)} changed to ${formatValue(data[highlightKey])}`
    : ''

  return (
    <Panel tone="deep" className="state-inspector">
      <h4 className="state-inspector-title"><span aria-hidden="true">🔍</span> {title}</h4>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{changedValue}</div>
      <FieldGrid>
        {Object.entries(data).map(([key, value]) => (
          <MetricTile
            key={key}
            label={formatLabel(key)}
            value={formatValue(value)}
            highlighted={highlightKey === key}
          />
        ))}
      </FieldGrid>
    </Panel>
  )
}
