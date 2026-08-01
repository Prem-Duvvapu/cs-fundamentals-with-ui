import React from 'react'

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
  return (
    <div className="viz-controls-card">
      <div className="control-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="control-group buttons-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={onTogglePlay}
            className={`btn ${isPlaying ? 'btn-pause' : 'btn-play'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play Simulation'}
          </button>
          
          {onStepBackward && (
            <button
              onClick={onStepBackward}
              disabled={currentTime <= 0}
              className="btn btn-secondary"
              title="Step Backward"
            >
              ⏮ Step Back
            </button>
          )}

          <button
            onClick={onStepForward}
            disabled={currentTime >= maxTime && maxTime > 0}
            className="btn btn-secondary"
            title="Step Forward"
          >
            Step ⏭
          </button>

          <button
            onClick={onReset}
            className="btn btn-secondary"
            title="Reset to Start"
          >
            ↺ Reset
          </button>
        </div>

        {onSpeedChange && (
          <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Speed:</label>
            <select
              value={speed}
              onChange={e => onSpeedChange(Number(e.target.value))}
              className="select-input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value={2000}>0.5x (Slow)</option>
              <option value={1000}>1.0x (Normal)</option>
              <option value={500}>2.0x (Fast)</option>
              <option value={200}>5.0x (Ultra)</option>
            </select>
          </div>
        )}
      </div>

      {maxTime > 0 && (
        <div className="timeline-slider-container" style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span className="time-badge" style={{ fontSize: '0.8rem' }}>
              Step: {currentTime} / {maxTime}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={maxTime}
            value={currentTime}
            onChange={e => onSeek && onSeek(Number(e.target.value))}
            className="slider"
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}
