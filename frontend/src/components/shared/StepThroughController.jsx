import React from 'react'

export default function StepThroughController({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onReset,
  onSelectStep,
  stepTitles = []
}) {
  return (
    <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onPrev}
            disabled={currentStep === 0}
            className="btn btn-secondary"
          >
            ← Previous Step
          </button>
          <button
            onClick={onNext}
            disabled={currentStep >= totalSteps - 1}
            className="btn btn-primary"
          >
            Next Step →
          </button>
          <button
            onClick={onReset}
            className="btn btn-secondary"
          >
            ↺ Reset
          </button>
        </div>

        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          Step {currentStep + 1} of {totalSteps}
        </div>
      </div>

      {stepTitles.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
          {stepTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => onSelectStep && onSelectStep(idx)}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: idx === currentStep ? 'var(--accent-blue, #3b82f6)' : 'rgba(255,255,255,0.1)',
                background: idx === currentStep ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: idx === currentStep ? '#60a5fa' : '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {idx + 1}. {title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
