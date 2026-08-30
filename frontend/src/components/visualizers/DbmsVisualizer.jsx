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
import TransactionsAcidVisualizer from './dbms/TransactionsAcidVisualizer'
import DbmsArchitectureVisualizer from './dbms/DbmsArchitectureVisualizer'

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
      case 'transactions-acid': return 'transactions'
      case 'concurrency-control': return 'concurrency'
      case 'query-optimization': return 'query'
      case 'distributed-databases-cap': return 'distributed'
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
          <p>Explore Relational Algebra, Functional Dependencies, Normalization, B+ Trees, Concurrency Control, Storage/RAID, Query Optimizer & Distributed Databases.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher hub-subnav">
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
            onClick={() => setActiveTab('transactions')}
            className={`main-tab-btn ${activeTab === 'transactions' ? 'active-tab' : ''}`}
          >
            🔄 ACID & WAL Recovery
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
        <DbmsArchitectureVisualizer />
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

      {/* SUB-TAB CONTENT 6.5: TRANSACTIONS, ACID & CRASH RECOVERY */}
      {activeTab === 'transactions' && (
        <TransactionsAcidVisualizer />
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
