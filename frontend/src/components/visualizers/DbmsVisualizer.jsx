import React, { useState } from 'react'
import BPlusTreeVisualizer from './dbms/BPlusTreeVisualizer'
import RelationalAlgebraVisualizer from './dbms/RelationalAlgebraVisualizer'
import FunctionalDependencyVisualizer from './dbms/FunctionalDependencyVisualizer'
import NormalizationVisualizer from './dbms/NormalizationVisualizer'
import ConcurrencyControlVisualizer from './dbms/ConcurrencyControlVisualizer'

export default function DbmsVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'functional-dependencies-keys': return 'closure'
      case 'relational-algebra-calculus': return 'relational-algebra'
      case 'database-normalization': return 'normalization'
      case 'dbms-indexing': return 'btree'
      case 'concurrency-control': return 'concurrency'
      default: return 'relational-algebra'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  return (
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🗄 Interactive DBMS Concept Visualizer Suite</h2>
          <p>Explore Relational Algebra, Functional Dependencies, Normalization, B+ Trees & Concurrency Control.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher hub-subnav">
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
            onClick={() => setActiveTab('concurrency')}
            className={`main-tab-btn ${activeTab === 'concurrency' ? 'active-tab' : ''}`}
          >
            🔒 Strict 2PL & Deadlocks
          </button>
        </div>
      </div>

      {/* SUB-TAB CONTENT: RELATIONAL ALGEBRA */}
      {activeTab === 'relational-algebra' && (
        <RelationalAlgebraVisualizer />
      )}

      {/* SUB-TAB CONTENT: CLOSURE & CANDIDATE KEYS */}
      {activeTab === 'closure' && (
        <FunctionalDependencyVisualizer />
      )}

      {/* SUB-TAB CONTENT: NORMALIZATION */}
      {activeTab === 'normalization' && (
        <NormalizationVisualizer />
      )}

      {/* SUB-TAB CONTENT: B+ TREE INDEX SIMULATOR */}
      {activeTab === 'btree' && (
        <BPlusTreeVisualizer />
      )}

      {/* SUB-TAB CONTENT: CONCURRENCY CONTROL & 2PL */}
      {activeTab === 'concurrency' && (
        <ConcurrencyControlVisualizer />
      )}
    </div>
  )
}
