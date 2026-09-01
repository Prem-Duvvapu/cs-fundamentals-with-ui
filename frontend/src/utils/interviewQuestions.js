const INTERVIEW_HEADING = /^ {0,3}###[\t ]+Interview Questions[\t ]*$/
const SECTION_BOUNDARY = /^ {0,3}#{1,3}(?:[\t ]+|$)/
const QUESTION_LINE = /^ {0,3}\*\*Q(\d+)\.[\t ]+(.+?)\*\*[\t ]*`?\[(easy|medium|hard)\]`?[\t ]*$/i

function openingFence(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
  if (!match) return null

  const marker = match[1]
  const trailing = match[2]
  if (marker[0] === '`' && trailing.includes('`')) return null

  return { character: marker[0], length: marker.length }
}

function closesFence(line, fence) {
  const trimmed = line.replace(/^ {0,3}/, '').trimEnd()
  if (!trimmed || trimmed[0] !== fence.character) return false

  const marker = trimmed.match(/^(`+|~+)/)?.[0]
  return Boolean(
    marker &&
    marker[0] === fence.character &&
    marker.length >= fence.length &&
    trimmed.slice(marker.length).trim() === ''
  )
}

function findInterviewSection(lines) {
  let fence = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (fence) {
      if (closesFence(line, fence)) fence = null
      continue
    }

    const nextFence = openingFence(line)
    if (nextFence) {
      fence = nextFence
      continue
    }

    if (INTERVIEW_HEADING.test(line)) return index + 1
  }

  return -1
}

function interviewSectionLines(lines, startIndex) {
  const section = []
  let fence = null

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]

    if (fence) {
      section.push(line)
      if (closesFence(line, fence)) fence = null
      continue
    }

    const nextFence = openingFence(line)
    if (nextFence) {
      fence = nextFence
      section.push(line)
      continue
    }

    if (SECTION_BOUNDARY.test(line)) break
    section.push(line)
  }

  return section
}

function trimBlankLines(lines) {
  let start = 0
  let end = lines.length

  while (start < end && lines[start].trim() === '') start += 1
  while (end > start && lines[end - 1].trim() === '') end -= 1

  return lines.slice(start, end).join('\n')
}

function idScope(topicId) {
  const slug = String(topicId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'interview'
}

/**
 * Parses the explicit interview-practice section from a curriculum lesson.
 * Answers remain Markdown so callers can pass them through the shared renderer.
 */
export function parseInterviewQuestions(content, topicId) {
  if (typeof content !== 'string' || content.length === 0) return []

  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const sectionStart = findInterviewSection(lines)
  if (sectionStart === -1) return []

  const section = interviewSectionLines(lines, sectionStart)
  const questions = []
  const scope = idScope(topicId)
  let current = null
  let fence = null

  const finishCurrent = () => {
    if (!current) return
    questions.push({
      id: `${scope}-q${current.number}`,
      number: current.number,
      question: `Q${current.number}. ${current.prompt}`,
      difficulty: current.difficulty,
      answerMarkdown: trimBlankLines(current.answerLines)
    })
  }

  for (const line of section) {
    if (fence) {
      if (current) current.answerLines.push(line)
      if (closesFence(line, fence)) fence = null
      continue
    }

    const nextFence = openingFence(line)
    if (nextFence) {
      fence = nextFence
      if (current) current.answerLines.push(line)
      continue
    }

    const questionMatch = line.match(QUESTION_LINE)
    if (questionMatch) {
      finishCurrent()
      current = {
        number: Number.parseInt(questionMatch[1], 10),
        prompt: questionMatch[2].trim(),
        difficulty: questionMatch[3].toLowerCase(),
        answerLines: []
      }
      continue
    }

    if (current) current.answerLines.push(line)
  }

  finishCurrent()
  return questions
}
