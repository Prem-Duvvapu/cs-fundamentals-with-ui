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
      <div className="space-y-6">
        {/* Operation Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Operation:</span>
          {[
            { id: 'selection', label: 'Selection (σ)' },
            { id: 'projection', label: 'Projection (π)' },
            { id: 'inner-join', label: 'Inner Join (⋈)' },
            { id: 'left-join', label: 'Left Outer Join (⟕)' }
          ].map(op => (
            <button
              key={op.id}
              onClick={() => handleOperationChange(op.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                operation === op.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Math & Query Formula Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-blue-500/30">
            <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">Relational Algebra</div>
            <div className="font-mono text-sm text-blue-200">{stepData.formula}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/30">
            <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Equivalent SQL Query</div>
            <div className="font-mono text-xs text-emerald-200">{stepData.sqlEquivalent}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-purple-500/30">
            <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">Tuple Calculus (TRC)</div>
            <div className="font-mono text-xs text-purple-200">{stepData.trcFormula}</div>
          </div>
        </div>

        {/* Dual Input Tables & Active Scanner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Table: Employees */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-200">Relation: Employees (R)</h4>
              <span className="text-xs font-mono text-slate-400">Cardinality: {employees.length} tuples</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 px-2">emp_id</th>
                    <th className="py-2 px-2">name</th>
                    <th className="py-2 px-2">dept_id</th>
                    <th className="py-2 px-2">salary</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr
                      key={emp.emp_id}
                      className={`border-b border-slate-800/60 transition-colors ${
                        stepData.activeLeftRow === idx
                          ? 'bg-blue-500/20 text-blue-300 font-bold border-blue-500/50'
                          : 'text-slate-300 hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2 px-2">{emp.emp_id}</td>
                      <td className="py-2 px-2">{emp.name}</td>
                      <td className="py-2 px-2">{emp.dept_id || 'NULL'}</td>
                      <td className="py-2 px-2">${emp.salary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Table: Departments */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-200">Relation: Departments (S)</h4>
              <span className="text-xs font-mono text-slate-400">Cardinality: {departments.length} tuples</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 px-2">dept_id</th>
                    <th className="py-2 px-2">dept_name</th>
                    <th className="py-2 px-2">location</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, idx) => (
                    <tr
                      key={dept.dept_id}
                      className={`border-b border-slate-800/60 transition-colors ${
                        stepData.activeRightRow === idx
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/50'
                          : 'text-slate-300 hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2 px-2">{dept.dept_id}</td>
                      <td className="py-2 px-2">{dept.dept_name}</td>
                      <td className="py-2 px-2">{dept.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Result Table */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-semibold text-white">Result Relation Output</h4>
              <p className="text-xs text-slate-400 mt-0.5">{stepData.description}</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs">
              Tuples: {stepData.resultRows.length}
            </span>
          </div>

          {stepData.resultRows.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-mono text-xs bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
              No result tuples emitted yet in this step. Step through the simulation to observe evaluation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    {Object.keys(stepData.resultRows[0]).map(key => (
                      <th key={key} className="py-2 px-3 bg-slate-800/50 text-blue-400 uppercase tracking-wider">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stepData.resultRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      {Object.values(row).map((val, vIdx) => (
                        <td key={vIdx} className={`py-2.5 px-3 ${val === 'NULL' ? 'text-rose-400 italic' : 'text-slate-200'}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
