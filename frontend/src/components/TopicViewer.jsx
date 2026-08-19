import { useState, useEffect } from 'react'

const CATEGORY_MAP = {
  'process-management': 'os', 'memory-management': 'os', 'cpu-scheduling': 'os', 'synchronization': 'os', 'deadlocks': 'os', 'file-systems': 'os', 'io-systems': 'os', 'disk-scheduling': 'os',
  'network-fundamentals': 'networking', 'physical-layer-media': 'networking', 'osi-model': 'networking', 'data-link-layer': 'networking', 'ip-subnetting': 'networking', 'routing-algorithms': 'networking', 'tcp-ip': 'networking', 'tcp-congestion': 'networking', 'transport-layer-protocols': 'networking', 'application-layer': 'networking', 'network-security': 'networking', 'network-performance-qos': 'networking',
  'dbms-introduction': 'dbms', 'dbms-architecture': 'dbms', 'er-model': 'dbms', 'relational-algebra-calculus': 'dbms', 'functional-dependencies-keys': 'dbms', 'database-normalization': 'dbms', 'dbms-indexing': 'dbms', 'storage-raid-indexing': 'dbms', 'transactions-acid': 'dbms', 'concurrency-control': 'dbms', 'query-optimization': 'dbms', 'distributed-databases-cap': 'dbms',
  'embeddings-vector-db': 'aiml', 'rag-architecture': 'aiml', 'model-serving': 'aiml', 'llm-parameters': 'aiml', 'feature-stores': 'aiml', 'recommendation-systems': 'aiml',
  'java-execution-pipeline': 'java-spring', 'java-memory-model': 'java-spring', 'java-oop-pillars': 'java-spring', 'java-static-final-records': 'java-spring', 'java-functional-lambdas': 'java-spring', 'java-generics': 'java-spring', 'java-collections-framework': 'java-spring', 'java-hashmap-internals': 'java-spring', 'java-streams-optional': 'java-spring', 'java-reflection-exceptions': 'java-spring', 'java-multithreading-concurrency': 'java-spring', 'jvm-gc': 'java-spring', 'spring-bean-lifecycle': 'java-spring', 'spring-mvc-lifecycle': 'java-spring', 'jpa-hibernate-lifecycle': 'java-spring', 'spring-batch-lifecycle': 'java-spring', 'quartz-scheduler': 'java-spring', 'design-patterns-solid': 'java-spring'
}

export default function TopicViewer({ topicId, category }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const cat = category || CATEGORY_MAP[topicId] || 'os'

    fetch(`/api/v1/content/${cat}/${topicId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.text()
      })
      .then(text => {
        setContent(renderMarkdown(text))
        setLoading(false)
      })
      .catch(() => {
        setContent('<p>Content not available yet.</p>')
        setLoading(false)
      })
  }, [topicId, category])

  if (loading) return <div className="topic-content"><p>Loading...</p></div>

  return (
    <div className="topic-content" dangerouslySetInnerHTML={{ __html: content }} />
  )
}

function renderMarkdown(text) {
  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(\d+\..+)$/gm, '<li>$1</li>')
    .replace(/(?:<li>\d+\..*<\/li>\n?)+/g, '<ol>$&</ol>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[-:\s]+$/.test(c))) return '<tr class="sep"/>'
      return `<td>${cells.join('</td><td>')}</td>`
    })
    .replace(/(<td>.*<\/td>\n?)+/g, '<tr>$&</tr>')
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  html = '<p>' + html + '</p>'
    .replace(/<p><\/p>/g, '')
    .replace(/<br\/><\/p>/g, '</p>')

  return html
}
