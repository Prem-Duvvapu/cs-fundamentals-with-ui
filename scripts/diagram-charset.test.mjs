import test from 'node:test'
import assert from 'node:assert/strict'
import { subsetCharacters } from './diagram-charset.mjs'

test('LF and CRLF diagrams produce identical font inputs', () => {
  const code = 'flowchart LR\n    A["café"] --> B["λ"]\n'
  const unix = subsetCharacters([{ code }])
  const windows = subsetCharacters([{ code: code.replaceAll('\n', '\r\n') }])
  assert.equal(windows, unix)
  assert.ok(unix.includes('é') && unix.includes('λ'))
  assert.ok(!unix.includes('\n') && !unix.includes('\r'))
})

test('font input includes printable ASCII and is independent of source order', () => {
  const diagrams = [{ code: 'ββ' }, { code: 'α' }]
  assert.equal(subsetCharacters(diagrams), subsetCharacters([...diagrams].reverse()))
  assert.equal(subsetCharacters([]).length, 95)
  assert.equal(subsetCharacters(diagrams).length, 97)
})
