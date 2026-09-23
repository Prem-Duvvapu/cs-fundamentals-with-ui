import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyExamples } from './verify-java-examples.mjs'

const lesson = (source, output = 'Hello') => `\`\`\`java runnable=Hello\n${source}\n\`\`\`\n\n\`\`\`text output=Hello\n${output}\n\`\`\``
const program = 'public class Hello { public static void main(String[] args) { System.out.println("Hello"); } }'

test('compiles and executes the actual fenced source, including CRLF input', () => {
  assert.equal(verifyExamples(lesson(program).replaceAll('\n', '\r\n')), 1)
})

test('rejects Java syntax errors instead of accepting a structurally valid fence', () => {
  assert.throws(() => verifyExamples(lesson('public class Hello { broken }')), /compilation failed/)
})

test('rejects output that disagrees with the lesson', () => {
  assert.throws(() => verifyExamples(lesson(program, 'Goodbye')), /output mismatch/)
})

test('requires paired, unique example/output markers and ignores unmarked excerpts', () => {
  assert.equal(verifyExamples('```java\nnot a complete program\n```'), 0)
  assert.throws(() => verifyExamples(`\`\`\`java runnable=Hello\n${program}\n\`\`\``), /missing expected output/)
  assert.throws(() => verifyExamples('```text output=Hello\nHello\n```'), /no runnable example/)
  assert.throws(() => verifyExamples(lesson(program) + '\n' + lesson(program)), /duplicate runnable/)
})
