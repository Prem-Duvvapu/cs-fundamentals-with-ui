#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const CONTENT_DIR = path.resolve(REPO_ROOT, 'content')
const TOPIC_SERVICE_PATH = path.resolve(REPO_ROOT, 'backend/src/main/java/com/csfundamentals/service/TopicService.java')
const COVERAGE_MANIFEST_PATH = path.resolve(CONTENT_DIR, 'COVERAGE_MANIFEST.json')

const TOPIC_FILE_REGEX = /^(\d+[a-z]?)-([a-z0-9-]+)\.md$/
const MIN_ANSWER_CLAUSES = 3
const VALID_MERMAID_TYPES = [
  'flowchart', 'sequenceDiagram', 'stateDiagram-v2', 'stateDiagram',
  'classDiagram', 'erDiagram', 'gantt', 'block-beta', 'journey',
  'pie', 'gitGraph', 'mindmap', 'quadrantChart', 'C4Context'
]

function getRegisteredTopicIds() {
  if (!fs.existsSync(TOPIC_SERVICE_PATH)) return []
  const text = fs.readFileSync(TOPIC_SERVICE_PATH, 'utf-8')
  const matches = [...text.matchAll(/new\s+Topic\(\s*"([^"]+)"/g)]
  return matches.map(m => m[1])
}

function findContentFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findContentFiles(fullPath))
    } else if (TOPIC_FILE_REGEX.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files.sort()
}

function extractTopicSlug(filename) {
  const match = filename.match(TOPIC_FILE_REGEX)
  return match ? match[2] : null
}

function getContentByTopic(files) {
  const contentByTopic = new Map()
  for (const file of files) {
    const topicId = extractTopicSlug(path.basename(file))
    if (topicId) {
      contentByTopic.set(topicId, {
        file,
        content: fs.readFileSync(file, 'utf-8')
      })
    }
  }
  return contentByTopic
}

function getProseOnly(source) {
  return source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '')
}

function normalizeCoverageText(text) {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
}

function describeTermGroup(termGroup) {
  return Array.isArray(termGroup)
    ? `one of [${termGroup.map(term => `"${term}"`).join(', ')}]`
    : `"${termGroup}"`
}

function isValidTermGroup(termGroup) {
  if (typeof termGroup === 'string') return termGroup.trim().length > 0
  return Array.isArray(termGroup)
    && termGroup.length > 0
    && termGroup.every(term => typeof term === 'string' && term.trim().length > 0)
}

function containsTermGroup(prose, termGroup) {
  const alternatives = Array.isArray(termGroup) ? termGroup : [termGroup]
  return alternatives.some(term => prose.includes(normalizeCoverageText(term)))
}

export function readCoverageManifest(manifestPath = COVERAGE_MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    return { entries: [], errors: [`Coverage manifest is missing: ${path.relative(REPO_ROOT, manifestPath)}`] }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    if (!Array.isArray(parsed.entries)) {
      return { entries: [], errors: ['Coverage manifest must contain an "entries" array'] }
    }
    return { entries: parsed.entries, errors: [] }
  } catch (error) {
    return { entries: [], errors: [`Coverage manifest is not valid JSON: ${error.message}`] }
  }
}

export function validateCoverageEntries(entries, registeredTopicIds, contentByTopic) {
  const errors = []
  const seenIds = new Set()

  for (const entry of entries) {
    const label = typeof entry?.id === 'string' && entry.id.length > 0
      ? `Coverage entry "${entry.id}"`
      : 'Coverage entry with no valid id'

    if (typeof entry?.id !== 'string' || entry.id.length === 0) {
      errors.push(`${label} must define a non-empty string id`)
    } else if (seenIds.has(entry.id)) {
      errors.push(`${label} duplicates a manifest id`)
    } else {
      seenIds.add(entry.id)
    }

    if (typeof entry?.topicId !== 'string' || entry.topicId.length === 0) {
      errors.push(`${label} must define a non-empty topicId`)
      continue
    }
    if (typeof entry?.requiredHeading !== 'string' || !entry.requiredHeading.startsWith('### ')) {
      errors.push(`${label} must define requiredHeading as a level-three Markdown heading phrase`)
      continue
    }
    if (!Array.isArray(entry?.requiredTerms) || entry.requiredTerms.length === 0) {
      errors.push(`${label} must define a non-empty requiredTerms array`)
      continue
    }
    entry.requiredTerms.forEach((termGroup, index) => {
      if (!isValidTermGroup(termGroup)) {
        errors.push(`${label} requiredTerms[${index}] must be a non-empty string or non-empty array of string aliases`)
      }
    })

    if (!registeredTopicIds.includes(entry.topicId)) {
      errors.push(`${label} references unknown TopicService ID "${entry.topicId}"`)
    }

    const target = contentByTopic.get(entry.topicId)
    if (!target) {
      errors.push(`${label} targets "${entry.topicId}", but its content file is missing`)
      continue
    }
    if (!target.content.includes(entry.requiredHeading)) {
      const relPath = path.relative(REPO_ROOT, target.file).replace(/\\/g, '/')
      errors.push(`${label} requires heading phrase "${entry.requiredHeading}" in ${relPath}`)
    }

    const prose = normalizeCoverageText(getProseOnly(target.content))
    entry.requiredTerms
      .filter(isValidTermGroup)
      .filter(termGroup => !containsTermGroup(prose, termGroup))
      .forEach(termGroup => {
        const relPath = path.relative(REPO_ROOT, target.file).replace(/\\/g, '/')
        errors.push(`${label} is missing required coverage term ${describeTermGroup(termGroup)} in ${relPath}`)
      })
  }

  return errors
}

export function getApplicableCoverageEntries(entries, topicIds = null) {
  return topicIds ? entries.filter(entry => topicIds.has(entry.topicId)) : entries
}

function validateMermaidBlock(blockContent) {
  const lines = blockContent.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const nonCommentLines = lines.filter(l => !l.startsWith('%%'))
  if (nonCommentLines.length === 0) {
    return { valid: false, reason: 'Empty Mermaid block' }
  }
  const firstLine = nonCommentLines[0]
  const startsWithValidType = VALID_MERMAID_TYPES.some(type =>
    firstLine === type || firstLine.startsWith(type + ' ') || firstLine.startsWith(type + '\n')
  )
  if (!startsWithValidType) {
    return { valid: false, reason: `Unknown or invalid Mermaid diagram type: "${firstLine}"` }
  }
  return { valid: true }
}

// `validateMermaidBlock` above only checks the declared diagram type, not the diagram's actual
// grammar — a well-formed-looking block can still fail to parse in the browser (this caught a
// real `Note over X,Y: "quoted text"` bug in content/java-spring/01c-java-memory-model.md that
// every unit test missed because they all mock the `mermaid` package). This loads the real
// mermaid package from frontend/node_modules — via createRequire since `scripts/` has no
// node_modules of its own — and actually parses each block, the same check MermaidBlock.jsx's
// render path depends on.
let mermaidInstance = null

async function loadMermaid() {
  if (mermaidInstance) return mermaidInstance
  const req = createRequire(path.resolve(REPO_ROOT, 'frontend/package.json'))
  const { JSDOM } = (await import(pathToFileURL(req.resolve('jsdom')).href))
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  if (!globalThis.window) globalThis.window = dom.window
  if (!globalThis.document) globalThis.document = dom.window.document
  if (!globalThis.navigator) globalThis.navigator = dom.window.navigator
  const mermaidModule = await import(pathToFileURL(req.resolve('mermaid')).href)
  mermaidInstance = mermaidModule.default
  mermaidInstance.initialize({ startOnLoad: false, securityLevel: 'strict' })
  return mermaidInstance
}

async function validateMermaidSyntax(mermaidBlocks) {
  if (mermaidBlocks.length === 0) return []
  const mermaid = await loadMermaid()
  const errors = []
  for (let i = 0; i < mermaidBlocks.length; i++) {
    try {
      await mermaid.parse(mermaidBlocks[i].code)
    } catch (err) {
      const reason = (err?.message || String(err)).split('\n')[0]
      errors.push(`Mermaid diagram #${i + 1} fails to parse: ${reason}`)
    }
  }
  return errors
}

// The spec's "no answer shorter than 3 sentences" bar is really a bar on *depth* —
// direct answer -> mechanism -> trade-off. Counting full stops alone measures the wrong
// thing: this curriculum's voice joins clauses with semicolons, so a dense two-full-stop
// answer can carry all three beats while a padded four-sentence one carries none. A
// semicolon ends an independent clause, so it counts as a beat here. Code fences, inline
// code, math, decimals and common abbreviations are neutralised first — each is a false
// terminator that would otherwise inflate the count.
export function countAnswerClauses(text) {
  const prose = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' CODE ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' MATH ')
    .replace(/\$[^$\n]+\$/g, ' MATH ')
    .replace(/\b(e\.g|i\.e|etc|vs|approx|cf)\./gi, '$1')
    .replace(/\b\d+\.\d+/g, 'NUM')

  return prose
    // A closing quote, bracket or parenthesis may sit between the terminator and the
    // whitespace — `... for you."` ends a clause just as `... for you.` does.
    .split(/[.!?;]["'\u201d\u2019)\]]*(?=\s|$)/)
    .map(part => part.trim())
    .filter(Boolean)
    .length
}

const QUESTION_HEADER = /\*\*Q(\d+)\.\s+([^*]+)\*\*\s*(?:`\[(?:easy|medium|hard)\]`|\[(?:easy|medium|hard)\])/g

// Returns { question, clauses } for every answer below the depth bar.
export function findThinAnswers(interviewText, minClauses = MIN_ANSWER_CLAUSES) {
  const headers = [...interviewText.matchAll(QUESTION_HEADER)]
  const thin = []

  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index + headers[i][0].length
    const end = i + 1 < headers.length ? headers[i + 1].index : interviewText.length
    const clauses = countAnswerClauses(interviewText.slice(start, end))
    if (clauses < minClauses) {
      thin.push({ question: `Q${headers[i][1]}`, clauses })
    }
  }

  return thin
}

function checkHtmlOutsideCode(source) {
  // Strip code fences
  const withoutFences = source.replace(/```[\s\S]*?```/g, '')
  // Strip inline code
  const withoutInlineCode = withoutFences.replace(/`[^`\n]+`/g, '')
  // Strip markdown links with autolink <http...> or <mailto:...>
  const withoutAutoLinks = withoutInlineCode.replace(/<(https?:\/\/[^>]+|mailto:[^>]+)>/g, '')
  // Detect raw HTML tags like <div, <span, <table, <p, <br, etc.
  const htmlTagPattern = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>/g
  const matches = []
  let match
  while ((match = htmlTagPattern.exec(withoutAutoLinks)) !== null) {
    matches.push(match[0])
  }
  return matches
}

export async function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relPath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/')
  const errors = []
  const warnings = []

  // 1. Line count >= 400
  const lineCount = lines.length
  if (lineCount < 400) {
    errors.push(`Line count is ${lineCount} (target: 400-600 lines, minimum 400)`)
  }

  // 2. Exact tier headings
  const beginnerIdx = content.indexOf('## 🟢 Beginner Level')
  const intermediateIdx = content.indexOf('## 🟡 Intermediate Level')
  const expertIdx = content.indexOf('## 🔴 Expert Level')

  if (beginnerIdx === -1) {
    errors.push('Missing exact heading: "## 🟢 Beginner Level"')
  }
  if (intermediateIdx === -1) {
    errors.push('Missing exact heading: "## 🟡 Intermediate Level"')
  }
  if (expertIdx === -1) {
    errors.push('Missing exact heading: "## 🔴 Expert Level"')
  }

  if (beginnerIdx !== -1 && intermediateIdx !== -1 && expertIdx !== -1) {
    if (!(beginnerIdx < intermediateIdx && intermediateIdx < expertIdx)) {
      errors.push('Tier headings must appear in strict order: Beginner -> Intermediate -> Expert')
    }
  }

  // 3. Mermaid blocks and distribution across tiers
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g
  const mermaidBlocks = []
  let match
  while ((match = mermaidRegex.exec(content)) !== null) {
    mermaidBlocks.push({
      index: match.index,
      code: match[1]
    })
  }

  if (mermaidBlocks.length < 3) {
    errors.push(`Found ${mermaidBlocks.length} Mermaid diagrams (required: >= 3, at least 1 per tier)`)
  }

  const diagramTypes = mermaidBlocks
    .map(block => block.code.trim().replace(/^%%.*\n\s*/, '').match(/^([A-Za-z0-9-]+)/)?.[1])
    .filter(Boolean)

  // Check valid diagram types
  mermaidBlocks.forEach((block, idx) => {
    const val = validateMermaidBlock(block.code)
    if (!val.valid) {
      errors.push(`Mermaid diagram #${idx + 1}: ${val.reason}`)
    }
  })

  // Actually parse each diagram with the real mermaid package — catches grammar errors
  // (e.g. a quoted Note label) that a type-keyword check can't.
  errors.push(...await validateMermaidSyntax(mermaidBlocks))

  // Check at least one diagram per tier if all headings present
  if (beginnerIdx !== -1 && intermediateIdx !== -1 && expertIdx !== -1) {
    const beginnerDiagrams = mermaidBlocks.filter(b => b.index > beginnerIdx && b.index < intermediateIdx).length
    const intermediateDiagrams = mermaidBlocks.filter(b => b.index > intermediateIdx && b.index < expertIdx).length
    const expertDiagrams = mermaidBlocks.filter(b => b.index > expertIdx).length

    if (beginnerDiagrams === 0) errors.push('Missing Mermaid diagram in Beginner tier')
    if (intermediateDiagrams === 0) errors.push('Missing Mermaid diagram in Intermediate tier')
    if (expertDiagrams === 0) errors.push('Missing Mermaid diagram in Expert tier')
  }

  // 4. Common Misconceptions
  if (!/###\s+Common Misconceptions/i.test(content)) {
    errors.push('Missing "### Common Misconceptions" section')
  }

  // 5. Interview Questions
  const interviewSection = content.match(/###\s+Interview Questions([\s\S]*)$/i)
  let qaCount = 0
  if (!interviewSection) {
    errors.push('Missing "### Interview Questions" section')
  } else {
    const interviewText = interviewSection[1]
    const qMatches = [...interviewText.matchAll(/\*\*Q\d+\.\s+([^*]+)\*\*\s*(`\[(?:easy|medium|hard)\]`|\[(?:easy|medium|hard)\])/g)]
    qaCount = qMatches.length

    if (qaCount < 12 || qaCount > 15) {
      errors.push(`Found ${qaCount} Interview Q&A pairs (required: 12-15 questions)`)
    }

    // Check all questions have difficulty tags
    const allQHeaderMatches = [...interviewText.matchAll(/\*\*Q\d+\.[^*]+\*\*/g)]
    if (allQHeaderMatches.length > qaCount) {
      errors.push(`${allQHeaderMatches.length - qaCount} question(s) are missing difficulty tags ([easy]/[medium]/[hard])`)
    }

    const thinAnswers = findThinAnswers(interviewText)
    if (thinAnswers.length > 0) {
      const detail = thinAnswers.map(a => `${a.question} (${a.clauses})`).join(', ')
      errors.push(`${thinAnswers.length} answer(s) below the ${MIN_ANSWER_CLAUSES}-clause depth bar: ${detail}`)
    }
  }

  // 6. Raw HTML check
  const rawHtml = checkHtmlOutsideCode(content)
  if (rawHtml.length > 0) {
    errors.push(`Found ${rawHtml.length} raw HTML tags outside code blocks: ${rawHtml.slice(0, 3).join(', ')}${rawHtml.length > 3 ? '...' : ''}`)
  }

  return {
    file: relPath,
    fullPath: filePath,
    lineCount,
    diagramCount: mermaidBlocks.length,
    diagramTypes,
    qaCount,
    errors,
    warnings,
    isValid: errors.length === 0
  }
}

function generateReport(results) {
  let report = `# Curriculum Content Gap Report\n\n`
  report += `Generated at: ${new Date().toISOString()}\n\n`
  report += `Total Topics: ${results.length}\n`
  report += `Fully Passing: ${results.filter(r => r.isValid).length} / ${results.length}\n\n`
  report += `| Topic | Lines | Diagrams | Q&A | Status | Gaps |\n`
  report += `|---|---|---|---|---|---|\n`

  for (const r of results) {
    const status = r.isValid ? '✅ PASS' : '❌ FAIL'
    const gaps = r.errors.length > 0 ? r.errors.join('; ') : 'None'
    report += `| \`${r.file}\` | ${r.lineCount} | ${r.diagramCount} | ${r.qaCount} | ${status} | ${gaps} |\n`
  }

  fs.writeFileSync(path.resolve(REPO_ROOT, 'content-gap-report.md'), report, 'utf-8')
  console.log(`\nReport written to content-gap-report.md`)
}

async function main() {
  const args = process.argv.slice(2)
  const isReportFlag = args.includes('--report')
  const specificFiles = args.filter(a => !a.startsWith('--'))

  const registeredTopicIds = getRegisteredTopicIds()
  console.log(`Found ${registeredTopicIds.length} registered topic IDs in TopicService.java.`)

  let filesToValidate = []
  if (specificFiles.length > 0) {
    filesToValidate = specificFiles.map(f => path.resolve(REPO_ROOT, f))
  } else {
    filesToValidate = findContentFiles(CONTENT_DIR)
  }

  let totalErrors = 0

  // Cross check registration
  if (specificFiles.length === 0) {
    const contentSlugs = filesToValidate.map(f => extractTopicSlug(path.basename(f)))
    const missingInContent = registeredTopicIds.filter(id => !contentSlugs.includes(id))
    const missingInService = contentSlugs.filter(slug => !registeredTopicIds.includes(slug))

    if (missingInContent.length > 0) {
      console.error(`\n❌ Topic IDs registered in TopicService but missing content file:`, missingInContent)
      totalErrors += missingInContent.length
    }
    if (missingInService.length > 0) {
      console.error(`\n❌ Content files missing registration in TopicService:`, missingInService)
      totalErrors += missingInService.length
    }
  }

  const manifest = readCoverageManifest()
  const manifestTopicIds = specificFiles.length > 0
    ? new Set(filesToValidate.map(file => extractTopicSlug(path.basename(file))).filter(Boolean))
    : null
  const applicableCoverageEntries = getApplicableCoverageEntries(manifest.entries, manifestTopicIds)
  const coverageFiles = specificFiles.length > 0 ? filesToValidate : findContentFiles(CONTENT_DIR)
  const coverageErrors = [
    ...manifest.errors,
    ...validateCoverageEntries(applicableCoverageEntries, registeredTopicIds, getContentByTopic(coverageFiles))
  ]

  if (coverageErrors.length > 0) {
    console.error(`\n❌ Coverage manifest (${applicableCoverageEntries.length} applicable entries):`)
    coverageErrors.forEach(error => console.error(`   - ${error}`))
    totalErrors += coverageErrors.length
  } else {
    console.log(`\n✅ Coverage manifest (${applicableCoverageEntries.length} applicable entries)`)
  }

  console.log(`\nValidating ${filesToValidate.length} file(s)...`)
  const results = []

  for (const file of filesToValidate) {
    const result = await validateFile(file)
    results.push(result)

    if (!result.isValid) {
      totalErrors += result.errors.length
      console.log(`\n❌ ${result.file} (${result.lineCount} lines, ${result.diagramCount} diagrams, ${result.qaCount} Q&As)`)
      result.errors.forEach(err => console.log(`   - ${err}`))
    } else {
      console.log(`\n✅ ${result.file} (${result.lineCount} lines, ${result.diagramCount} diagrams, ${result.qaCount} Q&As)`)
    }
  }

  // The type mix is reported, never enforced. `flowchart` legitimately dominates a curriculum
  // about processes and data paths, so a threshold here would be noise — but an author reaching
  // for a flowchart when CONTENT_SPEC section 5's table says `classDiagram` or `erDiagram` is a
  // real miss, and it stayed invisible until someone counted. Printing the mix every run is what
  // makes it noticeable.
  const typeCounts = new Map()
  for (const result of results) {
    for (const type of result.diagramTypes) {
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
    }
  }
  const diagramTotal = [...typeCounts.values()].reduce((sum, n) => sum + n, 0)
  if (diagramTotal > 0) {
    const mix = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type} ${count} (${Math.round((count / diagramTotal) * 100)}%)`)
      .join(', ')
    console.log(`\nDiagram type mix across ${diagramTotal} diagram(s): ${mix}`)
    console.log('   See CONTENT_SPEC.md section 5 — pick the type that matches the concept shape.')
  }

  if (isReportFlag) {
    generateReport(results)
  }

  console.log(`\n========================================`)
  console.log(`Summary: ${results.filter(r => r.isValid).length}/${results.length} files passed.`)
  if (totalErrors > 0) {
    console.log(`Total failures: ${totalErrors} issue(s) detected.`)
    process.exit(1)
  } else {
    console.log(`All content validation checks passed!`)
    process.exit(0)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
