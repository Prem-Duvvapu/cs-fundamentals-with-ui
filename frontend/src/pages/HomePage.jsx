import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchTopics } from '../utils/api'

const LEVEL_ORDER = { beginner: 0, intermediate: 1, expert: 2 }
const LEVEL_LABELS = { beginner: '🟢 Beginner', intermediate: '🟡 Intermediate', expert: '🔴 Expert' }

export default function HomePage() {
  const [topics, setTopics] = useState([])

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch(() => {
        setTopics([
          { id: 'process-management', title: 'Process Management', level: 'beginner', summary: 'Process states, PCB, threads, context switching' },
          { id: 'memory-management', title: 'Memory Management', level: 'beginner', summary: 'Paging, segmentation, virtual memory, page replacement' },
          { id: 'cpu-scheduling', title: 'CPU Scheduling', level: 'intermediate', summary: 'FCFS, SJF, RR, MLFQ, Linux CFS' },
          { id: 'synchronization', title: 'Synchronization', level: 'intermediate', summary: 'Semaphores, monitors, RCU, lock-free programming' },
          { id: 'deadlocks', title: 'Deadlocks', level: 'intermediate', summary: 'Banker\'s algorithm, detection, prevention, recovery' },
          { id: 'file-systems', title: 'File Systems', level: 'expert', summary: 'Inodes, Ext4, Btrfs, ZFS, VFS architecture' },
          { id: 'io-systems', title: 'I/O Systems', level: 'expert', summary: 'DMA, interrupts, epoll, io_uring, kernel bypass' },
        ])
      })
  }, [])

  const grouped = topics.reduce((acc, t) => {
    const level = t.level || 'beginner'
    if (!acc[level]) acc[level] = []
    acc[level].push(t)
    return acc
  }, {})

  const sortedLevels = Object.keys(grouped).sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b])

  return (
    <div>
      <div className="home-header">
        <h1>CS Fundamentals</h1>
        <p>
          Operating Systems concepts explained from beginner to expert —
          interactive visualizations for deep interview preparation.
        </p>
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
