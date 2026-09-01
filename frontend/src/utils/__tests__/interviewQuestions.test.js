import fs from 'node:fs'
import path from 'node:path'
import { parseInterviewQuestions } from '../interviewQuestions'

describe('parseInterviewQuestions', () => {
  it('reads only the exact interview section and stops before Further Reading', () => {
    const source = `**Q90. Outside the section?** \`[hard]\`

This must never become a card.

### Interview Questions and Answers

**Q91. In a similarly named section?** \`[hard]\`

This must also be ignored.

### Interview Questions

Introductory copy is not part of an answer.

**Q1. What is the safe boundary?** \`[easy]\`

The answer belongs to the card.

### Further Reading

- [Primary source](https://example.com)

**Q2. Is this still an interview question?** \`[hard]\`

No.`

    expect(parseInterviewQuestions(source, 'process-management')).toEqual([
      {
        id: 'process-management-q1',
        number: 1,
        question: 'Q1. What is the safe boundary?',
        difficulty: 'easy',
        answerMarkdown: 'The answer belongs to the card.'
      }
    ])
  })

  it('preserves answer Markdown while normalising CRLF input', () => {
    const source = [
      '### Interview Questions',
      '',
      '**Q7. How does the answer retain structure?** `[MEDIUM]`',
      '',
      'Use `inline code`, $O(1)$ math, and a [source](https://example.com).',
      '',
      '- First mechanism',
      '- Second mechanism'
    ].join('\r\n')

    const [question] = parseInterviewQuestions(source, 'Java / HashMap Internals')

    expect(question).toEqual({
      id: 'java-hashmap-internals-q7',
      number: 7,
      question: 'Q7. How does the answer retain structure?',
      difficulty: 'medium',
      answerMarkdown: [
        'Use `inline code`, $O(1)$ math, and a [source](https://example.com).',
        '',
        '- First mechanism',
        '- Second mechanism'
      ].join('\n')
    })
  })

  it('ignores headings and Q-like lines inside backtick fences', () => {
    const source = `\`\`\`markdown
### Interview Questions
**Q99. Is fenced documentation a card?** \`[hard]\`
\`\`\`

### Interview Questions

**Q1. What can an answer demonstrate?** \`[easy]\`

It can include a literal authoring example:

\`\`\`markdown
### Further Reading
**Q88. Is this a new card?** \`[hard]\`
\`\`\`

The answer continues after the fence.

**Q2. What follows the fenced example?** \`[medium]\`

A real second answer.`

    const questions = parseInterviewQuestions(source, 'fence-demo')

    expect(questions).toHaveLength(2)
    expect(questions[0].answerMarkdown).toContain('### Further Reading')
    expect(questions[0].answerMarkdown).toContain('**Q88. Is this a new card?**')
    expect(questions[0].answerMarkdown).toContain('The answer continues after the fence.')
    expect(questions[1].question).toBe('Q2. What follows the fenced example?')
  })

  it('recognises tilde fences and does not close a longer fence too early', () => {
    const source = `### Interview Questions

**Q1. What belongs to this answer?** \`[easy]\`

~~~~markdown
~~~
### Further Reading
**Q2. Still fenced?** \`[hard]\`
~~~
~~~~

Answer tail.

**Q3. What is the real next card?** \`[hard]\`

The third answer.`

    const questions = parseInterviewQuestions(source)

    expect(questions.map(({ id }) => id)).toEqual(['interview-q1', 'interview-q3'])
    expect(questions[0].answerMarkdown).toContain('**Q2. Still fenced?**')
    expect(questions[0].answerMarkdown).toContain('Answer tail.')
  })

  it.each(['# Replacement document', '## Replacement tier', '### Further Reading'])(
    'stops at the next level-three-or-higher boundary: %s',
    (boundary) => {
      const source = `### Interview Questions

**Q1. Where does this answer end?** \`[easy]\`

Before the boundary.

${boundary}

Leaked prose.

**Q2. Should this card exist?** \`[hard]\`

No.`

      const questions = parseInterviewQuestions(source)

      expect(questions).toHaveLength(1)
      expect(questions[0].answerMarkdown).toBe('Before the boundary.')
    }
  )

  it('returns no questions for missing, inexact, or non-string content', () => {
    expect(parseInterviewQuestions('### Interview Question\n\n**Q1. Wrong heading?** `[easy]`')).toEqual([])
    expect(parseInterviewQuestions('#### Interview Questions\n\n**Q1. Wrong level?** `[easy]`')).toEqual([])
    expect(parseInterviewQuestions('')).toEqual([])
    expect(parseInterviewQuestions(null)).toEqual([])
  })

  it('produces deterministic IDs for repeated parsing', () => {
    const source = `### Interview Questions

**Q12. Why should IDs be deterministic?** \`[hard]\`

Deck state and deep links need the same authored question to keep the same identifier.`

    const first = parseInterviewQuestions(source, 'rag-architecture')
    const second = parseInterviewQuestions(source, 'rag-architecture')

    expect(first[0].id).toBe('rag-architecture-q12')
    expect(second[0].id).toBe(first[0].id)
  })
})

describe('curriculum interview-question parsing', () => {
  const contentDirectory = path.resolve(process.cwd(), '../content')
  const topicFilename = /^\d+[a-z]?-(.+)\.md$/
  const topicFiles = fs.readdirSync(contentDirectory, { withFileTypes: true }).flatMap((category) => {
    if (!category.isDirectory()) return []
    const categoryDirectory = path.join(contentDirectory, category.name)
    return fs.readdirSync(categoryDirectory)
      .filter((filename) => topicFilename.test(filename))
      .map((filename) => ({ category: category.name, filename, filePath: path.join(categoryDirectory, filename) }))
  })

  it('extracts all validated questions from all 63 lessons without trailing-section leakage', () => {
    const questions = topicFiles.flatMap(({ category, filename, filePath }) => {
      const topicId = filename.match(topicFilename)[1]
      const parsed = parseInterviewQuestions(fs.readFileSync(filePath, 'utf8'), topicId)

      expect(parsed.length, `${category}/${filename}`).toBeGreaterThanOrEqual(12)
      expect(parsed.length, `${category}/${filename}`).toBeLessThanOrEqual(15)
      expect(parsed.every(({ answerMarkdown }) => !answerMarkdown.includes('### Further Reading')), `${category}/${filename}`).toBe(true)
      return parsed
    })

    expect(topicFiles).toHaveLength(63)
    expect(questions).toHaveLength(883)
    expect(new Set(questions.map(({ id }) => id)).size).toBe(questions.length)
  })
})
