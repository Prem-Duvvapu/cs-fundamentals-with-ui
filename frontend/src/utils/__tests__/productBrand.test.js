import fs from 'node:fs'
import path from 'node:path'
import { TOUR_STEPS } from '../tourSteps'
import { previewLearningImport } from '../learningState'

it('introduces the exact product name in the initial document and guided tour', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')
  const initialDocument = new DOMParser().parseFromString(html, 'text/html')
  expect(initialDocument.title).toBe('Backend Engineering')
  expect(initialDocument.querySelector('meta[name="description"]').content).toContain('Learn Backend Engineering')
  expect(TOUR_STEPS[0].title).toBe('Welcome to Backend Engineering')
})

it('names the product in import errors while accepting existing backup identities', () => {
  expect(previewLearningImport('null')).toEqual({ ok: false, error: 'This is not a Backend Engineering backup file.' })
  expect(previewLearningImport(JSON.stringify({ app: 'cs-fundamentals-with-ui', version: 1, progress: {} })).ok).toBe(true)
})
