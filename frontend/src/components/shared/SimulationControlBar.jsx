import React, { useId } from 'react'

export default function SimulationControlBar({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onReset,
  currentTime,
  maxTime,
  speed,
  onSpeedChange,
  onSeek
}) {
  const speedId = useId()

  return (
    <div className="viz-controls-card simulation-control-bar">
      <div className="u-row-between control-row">
        <div className="control-group buttons-group">
          <button type="button" onClick={onTogglePlay} className="btn btn-primary" aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}>
            <span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span>{' '}{isPlaying ? 'Pause' : 'Play simulation'}
          </button>

          {onStepBackward && (
            <button type="button" onClick={onStepBackward} disabled={currentTime <= 0} className="btn btn-secondary" aria-label="Step backward">
              <span aria-hidden="true">⏮</span> Step back
            </button>
          )}

          <button type="button" onClick={onStepForward} disabled={currentTime >= maxTime && maxTime > 0} className="btn btn-secondary" aria-label="Step forward">
            Step <span aria-hidden="true">⏭</span>
          </button>
          <button type="button" onClick={onReset} className="btn btn-secondary" aria-label="Reset simulation">
            <span aria-hidden="true">↺</span> Reset
          </button>
        </div>

        {onSpeedChange && (
          <div className="control-group speed-control">
            <label htmlFor={speedId}>Speed</label>
            <select id={speedId} value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))} className="select-input">
              <option value={2000}>0.5x (Slow)</option>
              <option value={1000}>1.0x (Normal)</option>
              <option value={500}>2.0x (Fast)</option>
              <option value={200}>5.0x (Ultra)</option>
            </select>
          </div>
        )}
      </div>

      {maxTime > 0 && (
        <div className="timeline-slider-container">
          <output className="time-badge" aria-live="polite">Step {currentTime} of {maxTime}</output>
          <input
            type="range"
            min="0"
            max={maxTime}
            value={currentTime}
            onChange={(event) => onSeek?.(Number(event.target.value))}
            className="slider"
            aria-label="Simulation step"
            aria-valuetext={`Step ${currentTime} of ${maxTime}`}
          />
        </div>
      )}
    </div>
  )
}
