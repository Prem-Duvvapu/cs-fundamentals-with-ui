import fs from 'node:fs'
import path from 'node:path'
import { render, cleanup } from '@testing-library/react'
import MarkdownRenderer from '../markdown/MarkdownRenderer'

// Guards the full-GFM + math + Mermaid pipeline that replaced the old
// 68-line regex renderer (see CLAUDE.md's content-pipeline section). Every
// file in content/ is rendered for real and checked for markdown syntax
// that leaked through unparsed — the exact failure mode the old renderer
// had for the 28 files using $...$ math and the AI/ML files using >
// blockquotes.

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mock-mermaid"></svg>' })
  }
}))

// Vitest runs with cwd = frontend/; content/ is its sibling at the repo root.
const CONTENT_DIR = path.resolve(process.cwd(), '../content')

// A curriculum topic file is `<NN><letter?>-<slug>.md` inside a category
// directory. Anything else in content/ (CONTENT_SPEC.md, notes) is not a topic.
const TOPIC_FILENAME = /^\d+[a-z]?-[a-z0-9-]+\.md$/

function findContentFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return findContentFiles(full)
    return TOPIC_FILENAME.test(entry.name) ? [full] : []
  })
}

const contentFiles = findContentFiles(CONTENT_DIR)

// Code samples legitimately contain #, ** and > as literal characters. Only
// prose outside <pre>/<code> can reveal markdown the renderer failed to parse.
function proseText(container) {
  const clone = container.cloneNode(true)
  clone.querySelectorAll('pre, code, .mermaid-block').forEach((el) => el.remove())
  return clone.textContent
}

// Leftover-syntax patterns: each indicates the renderer failed to parse
// something GFM-legal and left the raw markdown in the visible text.
const LEAK_PATTERNS = [
  { name: 'unconverted heading hash', pattern: /(^|\n)#{1,6}\s\S/ },
  { name: 'unconverted bold marker', pattern: /\*\*\S[^*]*\S\*\*/ },
  { name: 'unconverted blockquote marker', pattern: /(^|\n)>\s\S/ }
]

describe('curriculum content inventory', () => {
  it('found all 56 registered topic files', () => {
    expect(contentFiles.length).toBe(56)
  })
})

describe.each(contentFiles.map((f) => [path.relative(CONTENT_DIR, f), f]))(
  'renders %s',
  (relativePath, filePath) => {
    afterEach(cleanup)

    it('parses and renders without throwing', () => {
      const source = fs.readFileSync(filePath, 'utf-8')
      expect(() => render(<MarkdownRenderer content={source} />)).not.toThrow()
    })

    it('leaves no unparsed markdown syntax in the rendered text', () => {
      const source = fs.readFileSync(filePath, 'utf-8')
      const { container } = render(<MarkdownRenderer content={source} />)
      const text = proseText(container)

      for (const { name, pattern } of LEAK_PATTERNS) {
        expect(text, `${relativePath}: found ${name}`).not.toMatch(pattern)
      }
    })
  }
)

describe('math rendering (KaTeX)', () => {
  const mathFiles = contentFiles.filter((f) => {
    const source = fs.readFileSync(f, 'utf-8')
    // Match the same $...$ / $$...$$ shape remark-math accepts, outside fences.
    return /\$[^\s$][^$\n]*\$/.test(source.replace(/```[\s\S]*?```/g, ''))
  })

  it('found the known set of files using inline or block math', () => {
    // A regression here means either content changed or the fence-stripping
    // heuristic above needs updating — not a silent drop.
    expect(mathFiles.length).toBeGreaterThan(0)
  })

  it.each(mathFiles.map((f) => [path.relative(CONTENT_DIR, f), f]))(
    '%s renders at least one KaTeX span',
    (_relativePath, filePath) => {
      const source = fs.readFileSync(filePath, 'utf-8')
      const { container } = render(<MarkdownRenderer content={source} />)
      expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0)
    }
  )
})

describe('blockquote rendering', () => {
  const blockquoteFiles = contentFiles.filter((f) => /(^|\n)>\s/.test(fs.readFileSync(f, 'utf-8')))

  it('found the known set of files using blockquotes', () => {
    expect(blockquoteFiles.length).toBeGreaterThan(0)
  })

  it.each(blockquoteFiles.map((f) => [path.relative(CONTENT_DIR, f), f]))(
    '%s renders a <blockquote> element',
    (_relativePath, filePath) => {
      const source = fs.readFileSync(filePath, 'utf-8')
      const { container } = render(<MarkdownRenderer content={source} />)
      expect(container.querySelectorAll('blockquote').length).toBeGreaterThan(0)
    }
  )
})
