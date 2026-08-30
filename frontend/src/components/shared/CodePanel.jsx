import React from 'react'
import Panel from './Panel'

export default function CodePanel({ code = '', activeLine = -1, title = 'Implementation snippet', language = 'text' }) {
  if (!code) return null

  const lines = code.trim().split('\n')

  return (
    <Panel tone="deep" className="code-panel" role="region" aria-label={`${title}, ${language} code`}>
      <div className="code-panel-header"><span aria-hidden="true">💻</span> {title}</div>
      <pre className="code-panel-body">
        <code className={`language-${language}`}>
          {lines.map((line, index) => {
            const lineNumber = index + 1
            const active = lineNumber === activeLine
            return (
              <span className={`code-panel-line ${active ? 'is-active' : ''}`} key={index}>
                <span className="code-panel-line-number" aria-hidden="true">{lineNumber}</span>
                <span className="code-panel-line-content">{line || ' '}</span>
              </span>
            )
          })}
        </code>
      </pre>
    </Panel>
  )
}
