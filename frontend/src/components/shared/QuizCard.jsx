import React, { useState } from 'react'
import CodePanel from './CodePanel'
import Panel from './Panel'
import StatePill from './StatePill'

function resolveCorrectIndex({ correct, correctAnswer, options = [] }) {
  if (typeof correct === 'number') return correct
  if (typeof correctAnswer === 'number') return correctAnswer
  if (typeof correctAnswer === 'string') {
    const byLetter = ['A', 'B', 'C', 'D', 'E'].indexOf(correctAnswer.trim().toUpperCase())
    if (byLetter >= 0 && byLetter < options.length) return byLetter
    const byText = options.findIndex((option) => option === correctAnswer)
    if (byText >= 0) return byText
  }
  return -1
}

function difficultyTone(difficulty) {
  const value = String(difficulty).toLowerCase()
  if (value.includes('easy')) return 'success'
  if (value.includes('medium')) return 'warning'
  if (value.includes('hard')) return 'danger'
  return 'idle'
}

export default function QuizCard({
  question,
  answer,
  codeSnippet,
  difficulty = 'Core fundamental',
  options,
  correct,
  correctAnswer,
  explanation
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [selected, setSelected] = useState(null)
  const hasOptions = Array.isArray(options) && options.length > 0
  const correctIndex = hasOptions ? resolveCorrectIndex({ correct, correctAnswer, options }) : -1
  const revealed = selected !== null

  const handleSelect = (index) => {
    setSelected(index)
    setShowAnswer(true)
  }

  return (
    <Panel className="quiz-card">
      <div className="quiz-card-header">
        <StatePill tone={difficultyTone(difficulty)}>{difficulty}</StatePill>
        {!hasOptions && (
          <button
            type="button"
            onClick={() => setShowAnswer((visible) => !visible)}
            className="btn btn-secondary quiz-reveal-button"
            aria-expanded={showAnswer}
          >
            <span aria-hidden="true">{showAnswer ? '🙈' : '💡'}</span>{' '}
            {showAnswer ? 'Hide answer' : 'Reveal answer'}
          </button>
        )}
      </div>

      <h4 className="quiz-question">{question}</h4>
      {codeSnippet && <CodePanel code={codeSnippet} title="Question code" />}

      {hasOptions && (
        <div className="quiz-options" role="group" aria-label="Answer choices">
          {options.map((option, index) => {
            const selectedOption = selected === index
            const correctOption = index === correctIndex
            const stateClass = revealed && correctOption
              ? 'is-correct'
              : revealed && selectedOption
                ? 'is-incorrect'
                : ''
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(index)}
                disabled={revealed}
                aria-label={`${String.fromCharCode(65 + index)}. ${option}`}
                className={`quiz-option ${stateClass}`}
              >
                <strong className="quiz-option-letter">{String.fromCharCode(65 + index)}.</strong>
                <span>{option}</span>
                {revealed && correctOption && <span className="quiz-option-glyph" aria-label="Correct">✓</span>}
                {revealed && selectedOption && !correctOption && <span className="quiz-option-glyph" aria-label="Incorrect">✗</span>}
              </button>
            )
          })}
        </div>
      )}

      {(answer || explanation) && showAnswer && (
        <div className="quiz-feedback" role="status" aria-live="polite">
          {hasOptions && (
            <strong className={selected === correctIndex ? 'feedback-correct' : 'feedback-incorrect'}>
              <span aria-hidden="true">{selected === correctIndex ? '✓' : '✗'}</span>{' '}
              {selected === correctIndex ? 'Correct' : 'Not quite'}
            </strong>
          )}
          <strong className="quiz-feedback-heading">Answer &amp; discussion</strong>
          <div>{explanation || answer}</div>
        </div>
      )}
    </Panel>
  )
}
