#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export function verifyExamples(markdown, label = 'lesson') {
  const examples = new Map()
  const outputs = new Map()
  const fences = /^```(java|text) (runnable|output)=([A-Za-z][A-Za-z0-9_]*)\r?\n([\s\S]*?)^```[ \t]*\r?$/gm
  for (const [, language, kind, name, body] of markdown.matchAll(fences)) {
    if ((language === 'java') !== (kind === 'runnable')) throw new Error(`${label}: invalid ${language} ${kind} marker`)
    const target = kind === 'runnable' ? examples : outputs
    if (target.has(name)) throw new Error(`${label}: duplicate ${kind} marker for ${name}`)
    target.set(name, body.replace(/\r\n/g, '\n'))
  }
  for (const name of outputs.keys()) {
    if (!examples.has(name)) throw new Error(`${label}: output has no runnable example: ${name}`)
  }
  for (const [name, source] of examples) {
    if (!outputs.has(name)) throw new Error(`${label}: missing expected output for ${name}`)
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-java-example-'))
    try {
      const file = path.join(directory, `${name}.java`)
      fs.writeFileSync(file, source)
      const compile = spawnSync('javac', ['--release', '17', '-d', directory, file], { encoding: 'utf8', timeout: 30_000 })
      if (compile.error || compile.status !== 0) throw new Error(`${label}: ${name} compilation failed\n${compile.error?.message || compile.stderr}`)
      const run = spawnSync('java', ['-Xmx64m', '-cp', directory, name], { encoding: 'utf8', timeout: 5_000 })
      if (run.error || run.status !== 0) throw new Error(`${label}: ${name} execution failed\n${run.error?.message || run.stderr}`)
      const actual = run.stdout.replace(/\r\n/g, '\n').trimEnd()
      const expected = outputs.get(name).trimEnd()
      if (actual !== expected) throw new Error(`${label}: ${name} output mismatch\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }
  return examples.size
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('../content/java-spring/', import.meta.url))
  let count = 0
  try {
    for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.md'))) {
      count += verifyExamples(fs.readFileSync(path.join(directory, name), 'utf8'), name)
    }
    if (count === 0) throw new Error('No marked runnable Java examples found')
    console.log(`Verified ${count} runnable Java example(s): Java 17 compilation, execution and expected output.`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
