import React, { useState } from 'react'
import DbmsIntroVisualizer from './dbms/DbmsIntroVisualizer'
import ErModelVisualizer from './dbms/ErModelVisualizer'
import BPlusTreeVisualizer from './dbms/BPlusTreeVisualizer'
import RelationalAlgebraVisualizer from './dbms/RelationalAlgebraVisualizer'
import FunctionalDependencyVisualizer from './dbms/FunctionalDependencyVisualizer'
import NormalizationVisualizer from './dbms/NormalizationVisualizer'
import ConcurrencyControlVisualizer from './dbms/ConcurrencyControlVisualizer'
import StorageIndexingVisualizer from './dbms/StorageIndexingVisualizer'
import QueryOptimizerVisualizer from './dbms/QueryOptimizerVisualizer'
import DistributedDbVisualizer from './dbms/DistributedDbVisualizer'

export default function DbmsVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'dbms-introduction': return 'intro'
      case 'dbms-architecture': return 'architecture'
      case 'er-model': return 'er-model'
      case 'functional-dependencies-keys': return 'closure'
      case 'relational-algebra-calculus': return 'relational-algebra'
      case 'database-normalization': return 'normalization'
      case 'dbms-indexing': return 'btree'
      case 'storage-raid-indexing': return 'storage'
      case 'transactions-acid':
      case 'concurrency-control': return 'concurrency'
      case 'query-optimization': return 'query'
      case 'distributed-databases-cap': return 'distributed'
      default: return 'relational-algebra'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // Architecture state
  const [dataIndepLog, setDataIndepLog] = useState([])
  const [diskEngine, setDiskEngine] = useState('Standard HDD Block Allocation')
  const [conceptualColumns, setConceptualColumns] = useState(['Student_ID', 'Name', 'Major', 'GPA'])

  const triggerPhysicalChange = () => {
    const engines = [
      'NVMe SSD B+ Tree Clustered Storage',
      'Columnar Parquet Compressed File Index',
      'LSM-Tree Key-Value Disk Engine',
      'Standard HDD Block Allocation'
    ]
    const nextEngine = engines[(engines.indexOf(diskEngine) + 1) % engines.length]
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
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🗄 Interactive DBMS Concept Visualizer Suite</h2>
          <p>Explore Relational Algebra, Functional Dependencies, Normalization, B+ Trees, Concurrency Control, Storage/RAID, Query Optimizer & Distributed Databases.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher" style={{ marginTop: '1rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <button
            onClick={() => setActiveTab('intro')}
            className={`main-tab-btn ${activeTab === 'intro' ? 'active-tab' : ''}`}
          >
            📁 File System vs DBMS
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`main-tab-btn ${activeTab === 'architecture' ? 'active-tab' : ''}`}
          >
            🏗 3-Schema Architecture
          </button>
          <button
            onClick={() => setActiveTab('er-model')}
            className={`main-tab-btn ${activeTab === 'er-model' ? 'active-tab' : ''}`}
          >
            📐 ER Model & Mapping
          </button>
          <button
            onClick={() => setActiveTab('relational-algebra')}
            className={`main-tab-btn ${activeTab === 'relational-algebra' ? 'active-tab' : ''}`}
          >
            🧮 Relational Algebra (σ, π, ⋈, ⟕)
          </button>
          <button
            onClick={() => setActiveTab('closure')}
            className={`main-tab-btn ${activeTab === 'closure' ? 'active-tab' : ''}`}
          >
            🗝 Keys & (X)⁺ Closures
          </button>
          <button
            onClick={() => setActiveTab('normalization')}
            className={`main-tab-btn ${activeTab === 'normalization' ? 'active-tab' : ''}`}
          >
            📊 Normalization (1NF-BCNF)
          </button>
          <button
            onClick={() => setActiveTab('btree')}
            className={`main-tab-btn ${activeTab === 'btree' ? 'active-tab' : ''}`}
          >
            🌳 B+ Tree Indexing
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`main-tab-btn ${activeTab === 'storage' ? 'active-tab' : ''}`}
          >
            💾 RAID 0/1/5/10 & Bitmaps
          </button>
          <button
            onClick={() => setActiveTab('concurrency')}
            className={`main-tab-btn ${activeTab === 'concurrency' ? 'active-tab' : ''}`}
          >
            🔒 Strict 2PL & Deadlocks
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`main-tab-btn ${activeTab === 'query' ? 'active-tab' : ''}`}
          >
            ⚡ Query Optimizer (CBO)
          </button>
          <button
            onClick={() => setActiveTab('distributed')}
            className={`main-tab-btn ${activeTab === 'distributed' ? 'active-tab' : ''}`}
          >
            🌐 2PC & CAP Theorem
          </button>
        </div>
      </div>

      {/* SUB-TAB CONTENT 0: FILE SYSTEM VS DBMS INTRO */}
      {activeTab === 'intro' && (
        <DbmsIntroVisualizer />
      )}

      {/* SUB-TAB CONTENT 1: ARCHITECTURE & DATA INDEPENDENCE */}
      {activeTab === 'architecture' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🏛 ANSI-SPARC 3-Schema Architecture Diagram</h3>
            
            <div className="encap-layers-container">
              {/* External Level */}
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--accent-purple)' }}>
                <span className="layer-title" style={{ color: 'var(--accent-purple)' }}>1. External Level (User Views)</span>
                <span className="header-pill" style={{ background: '#7c3aed' }}>View A: Student GPA | View B: Admin Billing</span>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ↕ Logical Data Independence Mapping Layer
              </div>

              {/* Conceptual Level */}
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--accent-blue)' }}>
                <span className="layer-title" style={{ color: 'var(--accent-blue)' }}>2. Conceptual Schema</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {conceptualColumns.map((col, idx) => (
                    <span key={idx} className="header-pill" style={{ background: '#1d4ed8' }}>{col}</span>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ↕ Physical Data Independence Mapping Layer
              </div>

              {/* Internal Level */}
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--accent-green)' }}>
                <span className="layer-title" style={{ color: 'var(--accent-green)' }}>3. Internal Schema (Physical Storage)</span>
                <span className="header-pill" style={{ background: '#047857' }}>{diskEngine}</span>
              </div>
            </div>

            <div className="action-buttons-group" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
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
            <div className="event-log-container" style={{ maxHeight: '250px' }}>
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
      )}

      {/* SUB-TAB CONTENT 1.5: ER MODEL & RELATIONAL MAPPING */}
      {activeTab === 'er-model' && (
        <ErModelVisualizer />
      )}

      {/* SUB-TAB CONTENT 2: RELATIONAL ALGEBRA */}
      {activeTab === 'relational-algebra' && (
        <RelationalAlgebraVisualizer />
      )}

      {/* SUB-TAB CONTENT 3: CLOSURE & CANDIDATE KEYS */}
      {activeTab === 'closure' && (
        <FunctionalDependencyVisualizer />
      )}

      {/* SUB-TAB CONTENT 4: NORMALIZATION */}
      {activeTab === 'normalization' && (
        <NormalizationVisualizer />
      )}

      {/* SUB-TAB CONTENT 5: B+ TREE INDEX SIMULATOR */}
      {activeTab === 'btree' && (
        <BPlusTreeVisualizer />
      )}

      {/* SUB-TAB CONTENT 6: STORAGE & RAID */}
      {activeTab === 'storage' && (
        <StorageIndexingVisualizer />
      )}

      {/* SUB-TAB CONTENT 7: CONCURRENCY CONTROL & 2PL */}
      {activeTab === 'concurrency' && (
        <ConcurrencyControlVisualizer />
      )}

      {/* SUB-TAB CONTENT 8: QUERY OPTIMIZER */}
      {activeTab === 'query' && (
        <QueryOptimizerVisualizer />
      )}

      {/* SUB-TAB CONTENT 9: DISTRIBUTED DB & CAP */}
      {activeTab === 'distributed' && (
        <DistributedDbVisualizer />
      )}
    </div>
  )
}
