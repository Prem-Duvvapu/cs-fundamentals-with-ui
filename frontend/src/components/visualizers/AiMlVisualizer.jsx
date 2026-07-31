import React, { useState } from 'react'

export default function AiMlVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'embeddings-vector-db': return 'embeddings'
      case 'rag-architecture': return 'rag'
      case 'model-serving': return 'vllm'
      case 'llm-parameters': return 'sampling'
      case 'feature-stores': return 'featurestore'
      case 'recommendation-systems': return 'recsys'
      default: return 'embeddings'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // ==========================================
  // MODE 1: VECTOR EMBEDDINGS & SIMILARITY CALCULATOR
  // ==========================================
  const [vecA, setVecA] = useState([0.8, 0.2, 0.5])
  const [vecB, setVecB] = useState([0.7, 0.3, 0.4])

  const dotProduct = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitude = a => Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))

  const dotVal = dotProduct(vecA, vecB)
  const magA = magnitude(vecA)
  const magB = magnitude(vecB)
  const cosineSim = (magA * magB) === 0 ? 0 : (dotVal / (magA * magB))
  const euclideanDist = Math.sqrt(vecA.reduce((sum, val, i) => sum + Math.pow(val - vecB[i], 2), 0))

  // ==========================================
  // MODE 2: RAG PIPELINE SIMULATOR
  // ==========================================
  const [ragStep, setRagStep] = useState(0)
  const [ragQuery, setRagQuery] = useState('What is our refund policy for subscription tier 2?')

  const ragPipelineSteps = [
    { title: 'Step 1: Raw Query Ingestion', detail: `User Query: "${ragQuery}"` },
    { title: 'Step 2: Vector Embedding Generation', detail: 'Generating 1536-dim Embedding Vector using text-embedding-3-small' },
    { title: 'Step 3: HNSW Vector Search (Qdrant / pgvector)', detail: 'Retrieving Top 3 nearest document chunks by Cosine Distance' },
    { title: 'Step 4: Context Prompt Assembly', detail: 'Injecting retrieved chunks into LLM System Context: "Answer query ONLY using text..."' },
    { title: 'Step 5: LLM Grounded Generation', detail: 'LLM outputs grounded response with 0% hallucination risk!' }
  ]

  // ==========================================
  // MODE 3: vLLM PAGEDATTENTION INSPECTOR
  // ==========================================
  const [pagedMode, setPagedMode] = useState('vllm') // 'traditional', 'vllm'

  // ==========================================
  // MODE 4: LLM SAMPLING & TEMPERATURE
  // ==========================================
  const [temp, setTemp] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const baseTokens = [
    { token: 'indexing', logit: 4.5, prob: 0.65 },
    { token: 'databases', logit: 3.2, prob: 0.22 },
    { token: 'clustering', logit: 2.1, prob: 0.09 },
    { token: 'banana', logit: -1.5, prob: 0.04 }
  ]

  const scaledTokens = baseTokens.map(t => {
    const scaledLogit = temp === 0 ? t.logit : t.logit / temp
    return { ...t, scaledLogit }
  })

  // ==========================================
  // MODE 5: FEATURE STORE & DATA DRIFT (PSI)
  // ==========================================
  const [driftPsi, setDriftPsi] = useState(0.28)

  // ==========================================
  // MODE 6: 2-STAGE RECOMMENDATION ARCHITECTURE
  // ==========================================
  const [recsysStep, setRecsysStep] = useState(0)

  return (
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🤖 AI & Machine Learning Systems for SDE-2 Engineers</h2>
          <p>Explore Vector Embeddings, RAG Pipelines, vLLM PagedAttention, LLM Sampling, Feature Stores & 2-Stage RecSys.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher" style={{ marginTop: '1rem' }}>
          <button
            onClick={() => setActiveTab('embeddings')}
            className={`main-tab-btn ${activeTab === 'embeddings' ? 'active-tab' : ''}`}
          >
            📐 Embeddings & Cosine Search
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`main-tab-btn ${activeTab === 'rag' ? 'active-tab' : ''}`}
          >
            🧩 RAG Architecture Engine
          </button>
          <button
            onClick={() => setActiveTab('vllm')}
            className={`main-tab-btn ${activeTab === 'vllm' ? 'active-tab' : ''}`}
          >
            ⚡ vLLM PagedAttention Cache
          </button>
          <button
            onClick={() => setActiveTab('sampling')}
            className={`main-tab-btn ${activeTab === 'sampling' ? 'active-tab' : ''}`}
          >
            🎛 LLM Sampling & Temperature
          </button>
          <button
            onClick={() => setActiveTab('featurestore')}
            className={`main-tab-btn ${activeTab === 'featurestore' ? 'active-tab' : ''}`}
          >
            🏬 Feature Store & Data Drift
          </button>
          <button
            onClick={() => setActiveTab('recsys')}
            className={`main-tab-btn ${activeTab === 'recsys' ? 'active-tab' : ''}`}
          >
            🎯 2-Stage RecSys Pipeline
          </button>
        </div>
      </div>

      {/* MODE 1: VECTOR EMBEDDINGS & SIMILARITY */}
      {activeTab === 'embeddings' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>📐 Vector Coordinate & Cosine Distance Calculator</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Vector A [x, y, z]:</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  {vecA.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      step="0.1"
                      value={val}
                      onChange={e => {
                        const newA = [...vecA]
                        newA[idx] = Number(e.target.value)
                        setVecA(newA)
                      }}
                      className="num-input"
                      style={{ flex: 1 }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Vector B [x, y, z]:</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  {vecB.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      step="0.1"
                      value={val}
                      onChange={e => {
                        const newB = [...vecB]
                        newB[idx] = Number(e.target.value)
                        setVecB(newB)
                      }}
                      className="num-input"
                      style={{ flex: 1 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>📊 Vector Similarity Search Results</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Cosine Similarity (A · B / ||A|| ||B||):</span>
                <strong style={{ color: 'var(--accent-purple)', fontSize: '1.3rem' }}>{cosineSim.toFixed(4)}</strong>
              </div>

              {/* Similarity Progress Bar */}
              <div style={{ background: '#1e293b', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ width: `${Math.max(0, cosineSim * 100)}%`, background: 'var(--accent-purple)', height: '100%' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Dot Product ($A \cdot B$):</span>
                <strong>{dotVal.toFixed(4)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Euclidean Distance ($L_2$):</span>
                <strong style={{ color: 'var(--accent-blue)' }}>{euclideanDist.toFixed(4)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: RAG PIPELINE SIMULATOR */}
      {activeTab === 'rag' && (
        <div className="viz-card">
          <h3>🧩 Retrieval-Augmented Generation (RAG) End-to-End Pipeline</h3>

          <div className="action-buttons-group" style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setRagStep(0)} className="btn btn-secondary">⏮ Reset Pipeline</button>
            <button onClick={() => setRagStep(prev => Math.min(4, prev + 1))} disabled={ragStep >= 4} className="btn btn-primary">
              Execute Next RAG Step ▶
            </button>
          </div>

          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
            <h4 style={{ color: 'var(--accent-purple)' }}>{ragPipelineSteps[ragStep].title}</h4>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{ragPipelineSteps[ragStep].detail}</p>
          </div>
        </div>
      )}

      {/* MODE 3: vLLM PAGEDATTENTION */}
      {activeTab === 'vllm' && (
        <div className="metrics-grid">
          <div className="viz-card" style={{ gridColumn: 'span 2' }}>
            <h3>⚡ vLLM PagedAttention GPU VRAM Memory Allocator</h3>

            <div className="main-tab-switcher" style={{ margin: '1rem 0' }}>
              <button onClick={() => setPagedMode('traditional')} className={`main-tab-btn ${pagedMode === 'traditional' ? 'active-tab' : ''}`}>
                Traditional KV Cache Allocation (60% VRAM Waste)
              </button>
              <button onClick={() => setPagedMode('vllm')} className={`main-tab-btn ${pagedMode === 'vllm' ? 'active-tab' : ''}`}>
                vLLM PagedAttention Virtual Paging (0% Fragmentation)
              </button>
            </div>

            {pagedMode === 'traditional' ? (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-red)' }}>⚠️ Static Contiguous GPU Allocation — High Fragmentation</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>Reserves 2048 contiguous tokens per request upfront regardless of actual generation length.</p>
                <div style={{ background: '#3f1212', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--accent-red)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  🚨 Out Of Memory (OOM) errors occur even when GPU has unallocated fragmented VRAM!
                </div>
              </div>
            ) : (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-green)' }}>✨ PagedAttention Block Engine — Virtual Memory Pages</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>Allocates fixed 16-token physical blocks dynamically on-demand from shared GPU page pool!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: LLM SAMPLING & TEMPERATURE */}
      {activeTab === 'sampling' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🎛 LLM Logit Scaling & Nucleus Sampling</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Temperature ($T$): {temp}</label>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={temp}
                  onChange={e => setTemp(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Top-P (Nucleus Cutoff): {topP}</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={topP}
                  onChange={e => setTopP(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>📊 Rescaled Token Probability Distribution</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              {scaledTokens.map(t => (
                <div key={t.token} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Token: <strong>"{t.token}"</strong></span>
                    <span>Scaled Logit: {t.scaledLogit.toFixed(2)}</span>
                  </div>
                  <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', marginTop: '0.2rem' }}>
                    <div style={{ width: `${Math.min(100, t.prob * 100)}%`, background: 'var(--accent-blue)', height: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 5: FEATURE STORE & DRIFT */}
      {activeTab === 'featurestore' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🏬 Feature Store & Population Stability Index (PSI) Drift</h3>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Simulated Feature PSI Data Drift Index: {driftPsi}</label>
              <input
                type="range"
                min="0.01"
                max="0.50"
                step="0.01"
                value={driftPsi}
                onChange={e => setDriftPsi(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: driftPsi < 0.1 ? '#064e3b' : driftPsi < 0.25 ? '#78350f' : '#7f1d1d' }}>
              <strong>Status: {driftPsi < 0.1 ? '✅ Normal (PSI < 0.1)' : driftPsi < 0.25 ? '⚠️ Moderate Drift Detected' : '🚨 CRITICAL DRIFT (PSI >= 0.25)'}</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                {driftPsi >= 0.25 ? 'Action Required: Trigger automated Kubeflow / MLflow model retraining pipeline!' : 'Model inputs match baseline training distribution.'}
              </p>
            </div>
          </div>

          <div className="viz-card">
            <h3>⚡ Online vs Offline Feature Lookup</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Online Store (Redis Key-Value):</span>
                <strong style={{ color: 'var(--accent-green)' }}>&lt; 5ms Latency (Live Inference)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Offline Store (S3 Parquet / Snowflake):</span>
                <strong style={{ color: 'var(--accent-blue)' }}>Batch High-Throughput (Point-in-Time Join)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 6: 2-STAGE RECOMMENDATION ARCHITECTURE */}
      {activeTab === 'recsys' && (
        <div className="metrics-grid">
          <div className="viz-card" style={{ gridColumn: 'span 2' }}>
            <h3>🎯 2-Stage Recommendation Engine Pipeline</h3>

            <div className="action-buttons-group" style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setRecsysStep(0)} className="btn btn-secondary">⏮ Step 1: Catalog (10,000,000 Items)</button>
              <button onClick={() => setRecsysStep(1)} className="btn btn-primary">Step 2: Two-Tower Candidate Retrieval (500 Candidates)</button>
              <button onClick={() => setRecsysStep(2)} className="btn btn-action">Step 3: Deep Ranking Model (Top 5 Items)</button>
            </div>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              {recsysStep === 0 && <h4>1. Total Catalog Space: 10,000,000 Items</h4>}
              {recsysStep === 1 && <h4>2. Two-Tower Vector ANN Retrieval: Filtered to 500 Candidates in 12ms</h4>}
              {recsysStep === 2 && <h4>3. Deep & Cross Network Ranking: Final Top 5 Items scored by pCTR × pCVR in 35ms</h4>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
