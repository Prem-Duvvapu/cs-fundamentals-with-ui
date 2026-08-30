import { useState } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import conceptData from '../../../data/dbms-concepts-architecture.json'

const STORAGE_ENGINES = [
  'Standard HDD Block Allocation',
  'NVMe SSD B+ Tree Clustered Storage',
  'Columnar Parquet Compressed File Index',
  'LSM-Tree Key-Value Disk Engine'
]

export default function DbmsArchitectureVisualizer() {
  const [dataIndepLog, setDataIndepLog] = useState([])
  const [diskEngine, setDiskEngine] = useState(STORAGE_ENGINES[0])
  const [conceptualColumns, setConceptualColumns] = useState(['Student_ID', 'Name', 'Major', 'GPA'])

  const triggerPhysicalChange = () => {
    const nextEngine = STORAGE_ENGINES[(STORAGE_ENGINES.indexOf(diskEngine) + 1) % STORAGE_ENGINES.length]
    setDiskEngine(nextEngine)
    setDataIndepLog(prev => [
      `[PHYSICAL CHANGE] Changed Internal Storage Engine to: "${nextEngine}".`,
      `✅ PHYSICAL DATA INDEPENDENCE: Conceptual Schema & External User Views REMAIN UNCHANGED (0 SQL queries broken).`,
      ...prev
    ])
  }

  const triggerLogicalChange = () => {
    const newCol = `Extra_Attr_${conceptualColumns.length + 1}`
    setConceptualColumns(prev => [...prev, newCol])
    setDataIndepLog(prev => [
      `[LOGICAL CHANGE] Added Column "${newCol}" to Conceptual Schema.`,
      `✅ LOGICAL DATA INDEPENDENCE: External User Views & Legacy queries run without modification.`,
      ...prev
    ])
  }

  return (
    <ConceptModuleShell
      conceptId={conceptData.id}
      title={conceptData.title}
      subtitle={conceptData.subtitle}
      mentalModel={conceptData.mentalModel}
      theoryData={conceptData.theoryData}
      quizData={conceptData.quizData}
    >
      <div className="metrics-grid">
        <div className="viz-card">
          <h3>🏛 ANSI-SPARC 3-Schema Architecture Diagram</h3>

          <div className="encap-layers-container">
            <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--cat-os-base)' }}>
              <span className="layer-title" style={{ color: 'var(--cat-os-base)' }}>1. External Level (User Views)</span>
              <span className="header-pill" style={{ background: 'var(--cat-os-border)' }}>View A: Student GPA | View B: Admin Billing</span>
            </div>

            <div className="schema-mapping-caption">
              ↕ Logical Data Independence Mapping Layer
            </div>

            <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--state-info)' }}>
              <span className="layer-title" style={{ color: 'var(--state-info)' }}>2. Conceptual Schema</span>
              <div className="schema-column-row">
                {conceptualColumns.map((col, idx) => (
                  <span key={idx} className="header-pill" style={{ background: 'var(--state-info-border)' }}>{col}</span>
                ))}
              </div>
            </div>

            <div className="schema-mapping-caption">
              ↕ Physical Data Independence Mapping Layer
            </div>

            <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--state-success)' }}>
              <span className="layer-title" style={{ color: 'var(--state-success)' }}>3. Internal Schema (Physical Storage)</span>
              <span className="header-pill" style={{ background: 'var(--state-success-border)' }}>{diskEngine}</span>
            </div>
          </div>

          <div className="action-buttons-group mt-lg">
            <button onClick={triggerPhysicalChange} className="btn btn-primary">
              ⚡ Modify Physical Storage (Test Physical Independence)
            </button>
            <button onClick={triggerLogicalChange} className="btn btn-secondary">
              ➕ Add Conceptual Attribute (Test Logical Independence)
            </button>
          </div>
        </div>

        <div className="viz-card">
          <h3>📜 Data Independence Audit Log</h3>
          <div className="event-log-container">
            {dataIndepLog.map((log, idx) => (
              <div key={idx} className="log-entry">
                <span className="log-text">{log}</span>
              </div>
            ))}
            {dataIndepLog.length === 0 && (
              <span className="empty-text">Click the buttons on the left to simulate physical disk changes or logical schema alterations!</span>
            )}
          </div>
        </div>
      </div>
    </ConceptModuleShell>
  )
}
