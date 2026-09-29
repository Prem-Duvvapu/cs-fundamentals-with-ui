import { useRef, useState } from 'react'
import { exportLearningData, previewLearningImport, mergeLearningImport } from '../../utils/learningState'
import { readAll, importProgress } from '../../utils/topicProgress'
export default function LearningBackup() {
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
    if (file.size > 8_000_000) { setMessage('Choose a file smaller than 8 MB.'); return }
    try {
      const result = previewLearningImport(await file.text())
      if (result.ok) { setPreview(result); setMessage('') }
      else setMessage(result.error)
    } catch { setMessage('Could not read this file.') }
  }
  function confirm() {
    const result = importProgress({ version: 1, progress: preview.value.progress })
    if (!result.ok) { setMessage('Could not import progress.'); return }
    mergeLearningImport(preview.learning)
    setPreview(null)
    setMessage('Learning data merged. Existing conflicting drafts were kept; imported alternatives are included in future backups.')
  }
  return <section className="learning-backup"><h2>Back up your learning</h2><p>Reading positions and written answers live in this browser. Export a copy to keep them when you change devices. Your text-size preference stays on this device when importing.</p><div className="progress-transfer-actions"><button onClick={download}>Export learning data</button><button onClick={() => input.current?.click()}>Import learning data</button><input ref={input} type="file" accept=".json,application/json" onChange={read} hidden /></div>{preview && <div className="backup-preview"><p>Merge {preview.drafts} drafts and {preview.readings} reading positions, plus saved lesson progress. {preview.conflicts} conflicting drafts will be preserved as separate backup entries.</p><button onClick={confirm}>Merge backup</button><button onClick={() => setPreview(null)}>Cancel</button></div>}{message && <p role="status">{message}</p>}</section>
}
