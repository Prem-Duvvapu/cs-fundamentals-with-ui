import React, { useState } from 'react'

export default function QuizCard({ question, answer, codeSnippet, difficulty = 'Core Fundamental' }) {
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '1rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          {difficulty}
        </span>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
        >
          {showAnswer ? '🙈 Hide Answer' : '💡 Reveal Answer'}
        </button>
      </div>

      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', lineHeight: 1.4 }}>
        {question}
      </h4>

      {codeSnippet && (
        <pre style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#cbd5e1', overflowX: 'auto', margin: '0.75rem 0' }}>
          <code>{codeSnippet}</code>
        </pre>
      )}

      {showAnswer && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#e2e8f0',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}
        >
          <strong style={{ color: '#34d399', display: 'block', marginBottom: '0.4rem' }}>
            Answer & Discussion:
          </strong>
          <div>{answer}</div>
        </div>
      )}
    </div>
  )
}
