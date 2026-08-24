import React, { useState } from 'react'

function resolveCorrectIndex({ correct, correctAnswer, options = [] }) {
  if (typeof correct === 'number') return correct
  if (typeof correctAnswer === 'number') return correctAnswer
  if (typeof correctAnswer === 'string') {
    const byLetter = ['A', 'B', 'C', 'D', 'E'].indexOf(correctAnswer.trim().toUpperCase())
    if (byLetter >= 0 && byLetter < options.length) return byLetter
    const byText = options.findIndex(opt => opt === correctAnswer)
    if (byText >= 0) return byText
  }
  return -1
}

export default function QuizCard({
  question,
  answer,
  codeSnippet,
  difficulty = 'Core Fundamental',
  options,
  correct,
  correctAnswer,
  explanation
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [selected, setSelected] = useState(null)

  const hasOptions = Array.isArray(options) && options.length > 0
  const correctIndex = hasOptions ? resolveCorrectIndex({ correct, correctAnswer, options }) : -1

  const handleSelect = (idx) => {
    setSelected(idx)
    setShowAnswer(true)
  }

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
        {!hasOptions && (
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
          >
            {showAnswer ? '🙈 Hide Answer' : '💡 Reveal Answer'}
          </button>
        )}
      </div>

      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', lineHeight: 1.4 }}>
        {question}
      </h4>

      {codeSnippet && (
        <pre style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#cbd5e1', overflowX: 'auto', margin: '0.75rem 0' }}>
          <code>{codeSnippet}</code>
        </pre>
      )}

      {hasOptions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {options.map((opt, idx) => {
            const isSelected = selected === idx
            const isCorrect = idx === correctIndex
            const revealed = selected !== null
            let optStyle = {
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0'
            }
            if (!revealed && isSelected) {
              optStyle = { background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', color: '#bfdbfe' }
            }
            if (revealed && isCorrect) {
              optStyle = { background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#a7f3d0' }
            }
            if (revealed && isSelected && !isCorrect) {
              optStyle = { background: 'rgba(244,63,94,0.15)', border: '1px solid #f43f5e', color: '#fecdd3' }
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={revealed}
                aria-label={`${String.fromCharCode(65 + idx)}. ${opt}`}
                style={{
                  textAlign: 'left',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  cursor: revealed ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  ...optStyle
                }}
              >
                <strong style={{ marginRight: '0.5rem' }}>{String.fromCharCode(65 + idx)}.</strong>
                {opt}
                {revealed && isCorrect && <span style={{ marginLeft: '0.5rem' }}>✅</span>}
                {revealed && isSelected && !isCorrect && <span style={{ marginLeft: '0.5rem' }}>❌</span>}
              </button>
            )
          })}
        </div>
      )}

      {(answer || explanation) && showAnswer && (
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
          <div>{explanation || answer}</div>
        </div>
      )}
    </div>
  )
}
