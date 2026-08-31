import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { RelationalAlgebraEngine } from '../../../utils/simulationEngines/relationalAlgebraEngine'
import conceptData from '../../../data/dbms-concepts-relational-algebra.json'

export default function RelationalAlgebraVisualizer() {
  const engine = useMemo(() => new RelationalAlgebraEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleOperationChange = (op) => {
    engine.setOperation(op)
    setEngineState(engine.getCurrentState())
    setIsPlaying(false)
  }

  const handleNext = () => {
    setEngineState(engine.nextStep())
  }

  const handlePrev = () => {
    setEngineState(engine.prevStep())
  }

  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, operation, employees, departments } = engineState

  return (
    <ConceptModuleShell
      conceptId={conceptData.id}
      title={conceptData.title}
      subtitle={conceptData.subtitle}
      mentalModel={conceptData.mentalModel}
      theoryData={conceptData.theoryData}
      quizData={conceptData.quizData}
    >
      <div className="u-col-lg">
        {/* Operation Selector Bar */}
        <div className="filter-bar">
          <span className="filter-bar-label">Operation:</span>
          {[
            { id: 'selection', label: 'Selection (σ)' },
            { id: 'projection', label: 'Projection (π)' },
            { id: 'inner-join', label: 'Inner Join (⋈)' },
            { id: 'left-join', label: 'Left Outer Join (⟕)' }
          ].map(op => (
            <button
              key={op.id}
              onClick={() => handleOperationChange(op.id)}
              className={`filter-chip ${operation === op.id ? 'is-active' : ''}`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Math & Query Formula Cards */}
        <div className="metrics-3col">
          <div className="ra-formula-card is-info">
            <div className="label">Relational Algebra</div>
            <div className="value">{stepData.formula}</div>
          </div>
          <div className="ra-formula-card is-success">
            <div className="label">Equivalent SQL Query</div>
            <div className="value">{stepData.sqlEquivalent}</div>
          </div>
          <div className="ra-formula-card is-purple">
            <div className="label">Tuple Calculus (TRC)</div>
            <div className="value">{stepData.trcFormula}</div>
          </div>
        </div>

        {/* Dual Input Tables & Active Scanner */}
        <div className="ra-table-grid">
          {/* Left Table: Employees */}
          <div className="ra-table-card">
            <div className="ra-table-card-header">
              <h4>Relation: Employees (R)</h4>
              <span className="mono-label">Cardinality: {employees.length} tuples</span>
            </div>
            <div className="viz-table-scroll">
              <table className="ra-table">
                <thead>
                  <tr>
                    <th>emp_id</th>
                    <th>name</th>
                    <th>dept_id</th>
                    <th>salary</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr
                      key={emp.emp_id}
                      className={stepData.activeLeftRow === idx ? 'is-active-left' : ''}
                    >
                      <td>{emp.emp_id}</td>
                      <td>{emp.name}</td>
                      <td>{emp.dept_id || 'NULL'}</td>
                      <td>${emp.salary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Table: Departments */}
          <div className="ra-table-card">
            <div className="ra-table-card-header">
              <h4>Relation: Departments (S)</h4>
              <span className="mono-label">Cardinality: {departments.length} tuples</span>
            </div>
            <div className="viz-table-scroll">
              <table className="ra-table">
                <thead>
                  <tr>
                    <th>dept_id</th>
                    <th>dept_name</th>
                    <th>location</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, idx) => (
                    <tr
                      key={dept.dept_id}
                      className={stepData.activeRightRow === idx ? 'is-active-right' : ''}
                    >
                      <td>{dept.dept_id}</td>
                      <td>{dept.dept_name}</td>
                      <td>{dept.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Result Table */}
        <div className="detail-card">
          <div className="ra-result-header">
            <div>
              <h4>Result Relation Output</h4>
              <p>{stepData.description}</p>
            </div>
            <span className="status-chip is-normal">
              Tuples: {stepData.resultRows.length}
            </span>
          </div>

          {stepData.resultRows.length === 0 ? (
            <div className="ra-result-empty">
              No result tuples emitted yet in this step. Step through the simulation to observe evaluation.
            </div>
          ) : (
            <div className="viz-table-scroll">
              <table className="ra-table ra-result-table">
                <thead>
                  <tr>
                    {Object.keys(stepData.resultRows[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stepData.resultRows.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, vIdx) => (
                        <td key={vIdx} className={val === 'NULL' ? 'is-null' : ''}>
                          {typeof val === 'number' && val > 1000 ? `$${val.toLocaleString()}` : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="metrics-2col">
          <StateInspector
            title="Relational Algebra Engine State"
            state={{
              operation: stepData.operationName,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              emittedTuples: stepData.resultRows.length,
              status: engineState.stepIndex === engineState.totalSteps - 1 ? 'COMPLETED' : 'EVALUATING'
            }}
          />
          <SimulationControlBar
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrev={handlePrev}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        </div>
      </div>
    </ConceptModuleShell>
  )
}
