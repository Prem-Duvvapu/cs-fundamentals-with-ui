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
    <div className="viz-controls-card step-through-controller">
      <div className="u-row-between step-controls-row">
        <div className="step-control-buttons">
          <button type="button" onClick={onPrev} disabled={currentStep === 0} className="btn btn-secondary" aria-label="Previous step">
            <span aria-hidden="true">←</span> Previous step
          </button>
          <button type="button" onClick={onNext} disabled={currentStep >= totalSteps - 1} className="btn btn-primary" aria-label="Next step">
            Next step <span aria-hidden="true">→</span>
          </button>
          <button type="button" onClick={onReset} className="btn btn-secondary" aria-label="Reset steps">
            <span aria-hidden="true">↺</span> Reset
          </button>
        </div>
        <output className="step-progress" aria-live="polite">Step {currentStep + 1} of {totalSteps}</output>
      </div>

      {stepTitles.length > 0 && (
        <div className="step-chip-scroll" aria-label="Simulation steps">
          <ol className="step-chip-list">
            {stepTitles.map((title, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onSelectStep?.(index)}
                  className={`step-chip ${index === currentStep ? 'is-active' : ''}`}
                  aria-current={index === currentStep ? 'step' : undefined}
                  aria-label={`Go to step ${index + 1}: ${title}`}
                >
                  {index + 1}. {title}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
