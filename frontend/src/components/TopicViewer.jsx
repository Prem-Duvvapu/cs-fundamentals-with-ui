import { useState, useEffect, lazy, Suspense } from 'react'

// react-markdown + KaTeX + highlight.js are ~600KB and are only needed once
// a topic's content is actually being read, so they get their own chunk
// rather than loading with the app shell.
const MarkdownRenderer = lazy(() => import('./markdown/MarkdownRenderer'))

const CATEGORY_MAP = {
  'process-management': 'os', 'memory-management': 'os', 'cpu-scheduling': 'os', 'synchronization': 'os', 'deadlocks': 'os', 'file-systems': 'os', 'io-systems': 'os', 'disk-scheduling': 'os',
  'network-fundamentals': 'networking', 'physical-layer-media': 'networking', 'osi-model': 'networking', 'data-link-layer': 'networking', 'ip-subnetting': 'networking', 'routing-algorithms': 'networking', 'tcp-ip': 'networking', 'tcp-congestion': 'networking', 'transport-layer-protocols': 'networking', 'application-layer': 'networking', 'network-security': 'networking', 'network-performance-qos': 'networking',
  'dbms-introduction': 'dbms', 'dbms-architecture': 'dbms', 'er-model': 'dbms', 'relational-algebra-calculus': 'dbms', 'functional-dependencies-keys': 'dbms', 'database-normalization': 'dbms', 'dbms-indexing': 'dbms', 'storage-raid-indexing': 'dbms', 'transactions-acid': 'dbms', 'concurrency-control': 'dbms', 'query-optimization': 'dbms', 'distributed-databases-cap': 'dbms',
  'embeddings-vector-db': 'aiml', 'rag-architecture': 'aiml', 'model-serving': 'aiml', 'llm-parameters': 'aiml', 'feature-stores': 'aiml', 'recommendation-systems': 'aiml',
  'java-execution-pipeline': 'java-spring', 'java-memory-model': 'java-spring', 'java-oop-pillars': 'java-spring', 'java-static-final-records': 'java-spring', 'java-functional-lambdas': 'java-spring', 'java-generics': 'java-spring', 'java-collections-framework': 'java-spring', 'java-hashmap-internals': 'java-spring', 'java-streams-optional': 'java-spring', 'java-reflection-exceptions': 'java-spring', 'java-multithreading-concurrency': 'java-spring', 'jvm-gc': 'java-spring', 'spring-bean-lifecycle': 'java-spring', 'spring-mvc-lifecycle': 'java-spring', 'jpa-hibernate-lifecycle': 'java-spring', 'spring-batch-lifecycle': 'java-spring', 'quartz-scheduler': 'java-spring', 'design-patterns-solid': 'java-spring'
}

export default function TopicViewer({ topicId, category }) {
  const [content, setContent] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    const cat = category || CATEGORY_MAP[topicId] || 'os'

    fetch(`/api/v1/content/${cat}/${topicId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.text()
      })
      .then(text => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoading(false)
      })
  }, [topicId, category])

  if (loading) return <div className="topic-content"><p>Loading...</p></div>

  if (notFound) return <div className="topic-content"><p>Content not available yet.</p></div>

  return (
    <div className="topic-content">
      <Suspense fallback={<p>Loading...</p>}>
        <MarkdownRenderer content={content} />
      </Suspense>
    </div>
  )
}
