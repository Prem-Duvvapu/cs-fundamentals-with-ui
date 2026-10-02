import { useRef, useState } from 'react'
import { exportLearningData, previewLearningImport, mergeLearningImport, MAX_IMPORT_BYTES } from '../../utils/learningState'
import { readAll, importProgress } from '../../utils/topicProgress'

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export default function LearningBackup({ topics = [] }) {
  const input = useRef(null)
  const [preview, setPreview] = useState(null)
  const [message, setMessage] = useState('')
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportLearningData(readAll()), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'cs-fundamentals-learning.json'; link.click(); URL.revokeObjectURL(url)
  }
  async function read(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPreview(null)
    if (file.size > MAX_IMPORT_BYTES) { setMessage('Choose a file smaller than 8 MB.'); return }
    try {
      const result = previewLearningImport(await file.text(), topics.length ? topics.map(topic => topic.id) : null)
      if (result.ok) { setPreview(result); setMessage('') }
      else setMessage(result.error)
    } catch { setMessage('Could not read this file.') }
  }
  function confirm() {
    const result = importProgress({ version: 1, progress: preview.progress })
    if (!result.ok) { setMessage('Could not import lesson progress from this backup.'); return }
    mergeLearningImport(preview.learning)
    setPreview(null)
    setMessage('Backup merged. Nothing on this device was removed; differing drafts were kept side by side.')
  }
  return <section className="learning-backup"><h2>Back up your learning</h2><p>Bookmarks, completed lessons, reading positions, written answers, review dates and recorded attempts live in this browser. Export a copy to keep them when you change devices. Importing accepts both older progress-only backups and full learning backups, and never overwrites your text-size preference.</p><div className="progress-transfer-actions"><button type="button" onClick={download}>Export learning data</button><button type="button" onClick={() => input.current?.click()}>Import learning data</button><input ref={input} type="file" accept=".json,application/json" onChange={read} hidden /></div>{preview && <div className="backup-preview" role="group" aria-label="Backup preview"><p>This backup contains progress for {plural(preview.lessons, 'lesson')}, {plural(preview.drafts, 'written answer')}, {plural(preview.assessments, 'self-assessment')} and {plural(preview.readings, 'reading position')}.{preview.version === 1 && ' It is an older progress-only backup.'}</p>{preview.conflicts > 0 && <p>{plural(preview.conflicts, 'answer')} differ from what is saved here. Your current text stays in place and the imported version is kept alongside it.</p>}{preview.unknownTopics > 0 && <p>{plural(preview.unknownTopics, 'item')} refer to lessons not in the current curriculum. They are kept but not shown.</p>}<button type="button" onClick={confirm}>Merge backup</button><button type="button" onClick={() => setPreview(null)}>Cancel</button></div>}{message && <p role="status">{message}</p>}</section>
}
