import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchTopics } from '../utils/api'

const LEVEL_ORDER = { beginner: 0, intermediate: 1, expert: 2 }
const LEVEL_LABELS = { beginner: '🟢 Beginner Level', intermediate: '🟡 Intermediate Level', expert: '🔴 Expert Level' }

export default function HomePage() {
  const [topics, setTopics] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch(() => {
        setTopics([
          // Operating Systems
          { id: 'process-management', category: 'os', title: 'Process Management', level: 'beginner', summary: 'Process states, PCB, threads, context switching' },
          { id: 'memory-management', category: 'os', title: 'Memory Management', level: 'beginner', summary: 'Paging, segmentation, virtual memory, page replacement' },
          { id: 'cpu-scheduling', category: 'os', title: 'CPU Scheduling', level: 'intermediate', summary: 'FCFS, SJF, RR, MLFQ, Linux CFS' },
          { id: 'synchronization', category: 'os', title: 'Synchronization', level: 'intermediate', summary: 'Semaphores, monitors, RCU, lock-free programming' },
          { id: 'deadlocks', category: 'os', title: 'Deadlocks', level: 'intermediate', summary: 'Banker\'s algorithm, detection, prevention, recovery' },
          { id: 'file-systems', category: 'os', title: 'File Systems', level: 'expert', summary: 'Inodes, Ext4, Btrfs, ZFS, VFS architecture' },
          { id: 'io-systems', category: 'os', title: 'I/O Systems', level: 'expert', summary: 'DMA, interrupts, epoll, io_uring, kernel bypass' },
          
          // Computer Networks
          { id: 'osi-model', category: 'networking', title: 'OSI & TCP/IP Reference Models', level: 'beginner', summary: '7-Layer OSI model, encapsulation, decapsulation, headers' },
          { id: 'tcp-ip', category: 'networking', title: 'TCP 3-Way Handshake & Protocols', level: 'intermediate', summary: 'TCP vs UDP, 3-way handshake, sliding window, sockets' },
          
          // DBMS
          { id: 'relational-model', category: 'dbms', title: 'Relational Model, B+ Trees & ACID', level: 'intermediate', summary: 'Relational schema, B+ Tree indexing, ACID transactions' },
          { id: 'dbms-indexing', category: 'dbms', title: 'B+ Tree Indexing & 2PL Locks', level: 'expert', summary: 'B+ Tree search/split, 2-Phase Locking (2PL), MVCC' },
        ])
      })
  }, [])

  const filteredTopics = selectedCategory === 'all' 
    ? topics 
    : topics.filter(t => t.category === selectedCategory || (selectedCategory === 'os' && !t.category))

  const grouped = filteredTopics.reduce((acc, t) => {
    const level = t.level || 'beginner'
    if (!acc[level]) acc[level] = []
    acc[level].push(t)
    return acc
  }, {})

  const sortedLevels = Object.keys(grouped).sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b])

  return (
    <div>
      <div className="home-header">
        <h1>CS Fundamentals & Visualizations</h1>
        <p>
          Master Operating Systems, Computer Networks, and Database Management Systems —
          interactive animations and deep interview preparation.
        </p>

        <div className="main-tab-switcher" style={{ margin: '1.5rem auto 0 auto' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`main-tab-btn ${selectedCategory === 'all' ? 'active-tab' : ''}`}
          >
            🌟 All Topics
          </button>
          <button
            onClick={() => setSelectedCategory('os')}
            className={`main-tab-btn ${selectedCategory === 'os' ? 'active-tab' : ''}`}
          >
            💻 Operating Systems
          </button>
          <button
            onClick={() => setSelectedCategory('networking')}
            className={`main-tab-btn ${selectedCategory === 'networking' ? 'active-tab' : ''}`}
          >
            🌐 Computer Networks
          </button>
          <button
            onClick={() => setSelectedCategory('dbms')}
            className={`main-tab-btn ${selectedCategory === 'dbms' ? 'active-tab' : ''}`}
          >
            🗄 DBMS & SQL
          </button>
        </div>
      </div>

      {sortedLevels.map(level => (
        <div key={level} className="level-section">
          <h2>{LEVEL_LABELS[level] || level}</h2>
          <div className="card-grid">
            {grouped[level].map(topic => (
              <Link key={topic.id} to={`/topic/${topic.id}`} className="card">
                <span className={`badge ${topic.level || 'beginner'}`}>
                  {LEVEL_LABELS[topic.level] || topic.level}
                </span>
                <h3>{topic.title}</h3>
                <p>{topic.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
