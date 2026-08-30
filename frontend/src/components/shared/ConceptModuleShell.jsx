import React, { useId, useRef, useState } from 'react'
import CodePanel from './CodePanel'
import Panel from './Panel'
import QuizCard from './QuizCard'

function toDisplayText(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value.mode ?? value.description ?? value.text ?? JSON.stringify(value)
}

export default function ConceptModuleShell({
  title,
  subtitle,
  mentalModel,
  simulationComponent,
  children,
  theoryData,
  quizData = [],
  defaultTab = 'simulation'
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const tabRefs = useRef([])
  const shellId = useId()
  const tabs = [
    { id: 'simulation', icon: '⚡', label: 'Simulation' },
    { id: 'theory', icon: '📖', label: 'Theory' },
    { id: 'quiz', icon: '✓', label: `Self-check (${quizData.length})` }
  ]

  const selectTab = (tabId, index) => {
    setActiveTab(tabId)
    tabRefs.current[index]?.focus()
  }

  const handleTabKeyDown = (event, index) => {
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex == null) return
    event.preventDefault()
    selectTab(tabs[nextIndex].id, nextIndex)
  }

  return (
    <div className="concept-module-shell">
      <header className="viz-header">
        <div className="viz-title-group">
          <h2 className="concept-module-title">{title}</h2>
          {subtitle && <p className="concept-module-subtitle">{subtitle}</p>}
        </div>

        {mentalModel && (
          <aside className="mental-model-banner" aria-label="Mental model">
            <span aria-hidden="true">🎯</span>{' '}
            <strong>Mental model:</strong> {mentalModel}
          </aside>
        )}

        <div className="main-tab-switcher concept-module-tabs" role="tablist" aria-label={`${title} learning modes`}>
          {tabs.map((tab, index) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(node) => { tabRefs.current[index] = node }}
                id={`${shellId}-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${shellId}-${tab.id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`main-tab-btn ${selected ? 'active-tab' : ''}`}
              >
                <span aria-hidden="true">{tab.icon}</span>{' '}{tab.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="module-content-area">
        {activeTab === 'simulation' && (
          <div id={`${shellId}-simulation-panel`} role="tabpanel" aria-labelledby={`${shellId}-simulation-tab`} className="tab-simulation-panel">
            {simulationComponent || children}
          </div>
        )}

        {activeTab === 'theory' && (
          <div id={`${shellId}-theory-panel`} role="tabpanel" aria-labelledby={`${shellId}-theory-tab`} className="tab-theory-panel">
            {theoryData ? (
              <>
                <div className="theory-summary-grid">
                  {theoryData.failureModes && (
                    <Panel className="theory-panel theory-panel-danger">
                      <h3><span aria-hidden="true">🔥</span> Failure modes &amp; production pitfalls</h3>
                      <ul className="theory-list">
                        {theoryData.failureModes.map((item, index) => <li key={index}>{toDisplayText(item)}</li>)}
                      </ul>
                    </Panel>
                  )}

                  {theoryData.tradeOffs && (
                    <Panel className="theory-panel theory-panel-warning">
                      <h3><span aria-hidden="true">⚖️</span> Key trade-offs &amp; engineering decisions</h3>
                      <div className="theory-stack">
                        {theoryData.tradeOffs.map((item, index) => {
                          const structured = item && typeof item === 'object'
                          return structured ? (
                            <div className="theory-detail" key={index}>
                              <strong>{item.aspect}</strong>
                              <p><span aria-hidden="true">◆</span> {item.optionA}</p>
                              <p><span aria-hidden="true">◇</span> {item.optionB}</p>
                            </div>
                          ) : <p key={index}>{toDisplayText(item)}</p>
                        })}
                      </div>
                    </Panel>
                  )}
                </div>

                {theoryData.productionScenario && (
                  <Panel className="theory-panel theory-panel-success">
                    <h3><span aria-hidden="true">🏭</span> Production war story &amp; real scenario</h3>
                    <p>{theoryData.productionScenario}</p>
                  </Panel>
                )}

                {theoryData.codeSnippet && <CodePanel code={theoryData.codeSnippet} title="Core implementation or query pattern" />}

                {theoryData.interviewQA?.length > 0 && (
                  <Panel className="theory-panel theory-interview-panel">
                    <h3><span aria-hidden="true">💬</span> High-frequency technical &amp; architecture questions</h3>
                    <ol className="interview-question-list">
                      {theoryData.interviewQA.map((qa, index) => (
                        <li className="interview-question" key={index}>
                          <strong>{qa.q ?? qa.question}</strong>
                          <p>{qa.a ?? qa.answer}</p>
                        </li>
                      ))}
                    </ol>
                  </Panel>
                )}
              </>
            ) : <p className="empty-tab-message">Theory content is not available for this simulation yet.</p>}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div id={`${shellId}-quiz-panel`} role="tabpanel" aria-labelledby={`${shellId}-quiz-tab`} className="quiz-section">
            <div className="quiz-intro">
              <h3><span aria-hidden="true">✓</span> Interactive self-check &amp; knowledge assessment</h3>
              <p>Test your understanding against core fundamentals and architecture questions.</p>
            </div>
            {quizData.map((quiz, index) => <QuizCard key={index} {...quiz} />)}
          </div>
        )}
      </div>
    </div>
  )
}
