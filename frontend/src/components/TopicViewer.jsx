import { useState, useEffect } from 'react'

export default function TopicViewer({ topicId }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    fetch(`/api/v1/content/os/${topicId}`)
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
  }, [topicId])

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
