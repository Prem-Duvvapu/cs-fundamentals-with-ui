import React, { useState } from 'react'
import QuizCard from './QuizCard'

export default function ConceptModuleShell({
  title,
  subtitle,
  mentalModel,
  simulationComponent,
  theoryData, // { failureModes, tradeOffs, productionScenario, codeSnippet, interviewQA }
  quizData = [], // array of { question, answer, codeSnippet, difficulty }
  defaultTab = 'simulation'
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="concept-module-shell" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Module Header */}
      <div className="viz-header" style={{ marginBottom: '1rem' }}>
        <div className="viz-title-group">
          <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', margin: '0 0 0.4rem 0' }}>{title}</h2>
          {subtitle && <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>{subtitle}</p>}
        </div>

        {/* Mental Model Banner */}
        {mentalModel && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12))',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '0 8px 8px 0',
              color: '#e2e8f0',
              fontSize: '0.9rem'
            }}
          >
            🎯 <strong>Mental Model:</strong> {mentalModel}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="main-tab-switcher" style={{ marginTop: '1.25rem' }}>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`main-tab-btn ${activeTab === 'simulation' ? 'active-tab' : ''}`}
          >
            ⚡ Interactive Visual Simulation
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`main-tab-btn ${activeTab === 'theory' ? 'active-tab' : ''}`}
          >
            📖 Deep Dive & Interview Theory
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`main-tab-btn ${activeTab === 'quiz' ? 'active-tab' : ''}`}
          >
            ✅ Interview Self-Check ({quizData.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="module-content-area" style={{ marginTop: '1rem' }}>
        {activeTab === 'simulation' && (
          <div className="tab-simulation-panel">
            {simulationComponent}
          </div>
        )}

        {activeTab === 'theory' && theoryData && (
          <div className="tab-theory-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Failure Modes & Trade-offs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {theoryData.failureModes && (
                <div className="viz-card" style={{ borderTop: '3px solid #ef4444' }}>
                  <h3 style={{ color: '#f87171', margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>
                    🔥 Failure Modes & Production Pitfalls
                  </h3>
                  <ul style={{ paddingLeft: '1.2rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0, fontSize: '0.9rem' }}>
                    {theoryData.failureModes.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {theoryData.tradeOffs && (
                <div className="viz-card" style={{ borderTop: '3px solid #f59e0b' }}>
                  <h3 style={{ color: '#fbbf24', margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>
                    ⚖️ Key Trade-offs & Engineering Decisions
                  </h3>
                  <ul style={{ paddingLeft: '1.2rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0, fontSize: '0.9rem' }}>
                    {theoryData.tradeOffs.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Production Scenario */}
            {theoryData.productionScenario && (
              <div className="viz-card" style={{ borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                <h3 style={{ color: '#34d399', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                  🏭 Production War Story & Real Scenario
                </h3>
                <p style={{ color: '#e2e8f0', lineHeight: 1.6, margin: 0, fontSize: '0.92rem' }}>
                  {theoryData.productionScenario}
                </p>
              </div>
            )}

            {/* Code Snippet */}
            {theoryData.codeSnippet && (
              <div className="viz-card">
                <h3 style={{ color: '#93c5fd', margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>
                  💻 Core Implementation / Query Pattern
                </h3>
                <pre style={{ background: '#020617', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85rem', color: '#f1f5f9', margin: 0 }}>
                  <code>{theoryData.codeSnippet}</code>
                </pre>
              </div>
            )}

            {/* Interview Q&A List */}
            {theoryData.interviewQA && theoryData.interviewQA.length > 0 && (
              <div className="viz-card">
                <h3 style={{ color: '#a78bfa', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                  💬 High-Frequency SDE-2 Interview Questions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {theoryData.interviewQA.map((qa, idx) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '0.3rem', fontSize: '0.92rem' }}>
                        Q{idx + 1}: {qa.q}
                      </strong>
                      <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
                        {qa.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="tab-quiz-panel">
            <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Test your understanding against typical SDE-2 backend interview probe questions. Click "Reveal Answer" to check your response.
            </p>
            {quizData.map((quiz, idx) => (
              <QuizCard key={idx} {...quiz} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
