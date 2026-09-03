import { useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import MermaidBlock from './MermaidBlock'
import 'katex/dist/katex.min.css'

import java from 'highlight.js/lib/languages/java'
import sql from 'highlight.js/lib/languages/sql'
import c from 'highlight.js/lib/languages/c'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'

// rehype-highlight registers ~190 languages by default, which alone added
// ~300KB to the bundle. Register only what curriculum content uses (plus a
// few likely additions) — an unregistered language degrades to plain text,
// it does not error.
const HIGHLIGHT_LANGUAGES = { java, sql, c, python, bash, json, xml, javascript }

function extractText(children) {
  return String(children).replace(/\n$/, '')
}

const TIER_DETAILS = {
  '🟢': { name: 'beginner', glyph: '●', label: 'Beginner' },
  '🟡': { name: 'intermediate', glyph: '◐', label: 'Intermediate' },
  '🔴': { name: 'expert', glyph: '◆', label: 'Expert' }
}

function getTierHeading(children) {
  const text = extractText(children).trim()
  const tierEntry = Object.entries(TIER_DETAILS).find(([emoji]) => text.startsWith(emoji))
  if (!tierEntry) return { text, tier: null }
  const [emoji, tier] = tierEntry
  return { text: text.slice(emoji.length).trim(), tier }
}

export function headingId(children) {
  return extractText(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Full GFM + math + Mermaid renderer for the 3-tier curriculum Markdown in
 * content/. Replaces the previous 68-line regex renderer in TopicViewer —
 * see content/CONTENT_SPEC.md for what topic authors may rely on here.
 */
export default function MarkdownRenderer({ content }) {
  // A lesson can render several tables; each needs a distinct accessible name
  // so assistive tech doesn't announce identical "Scrollable table" regions.
  const tableCountRef = useRef(0)
  tableCountRef.current = 0

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        rehypeKatex,
        [rehypeHighlight, { languages: HIGHLIGHT_LANGUAGES, detect: false }]
      ]}
      components={{
        // TopicPage owns the document's single h1. Curriculum files retain
        // their title as authoring metadata, but the reader does not repeat it.
        h1() {
          return null
        },
        h2({ children }) {
          const { text, tier } = getTierHeading(children)
          return (
            <h2 id={headingId(text)}>
              {tier && (
                <span className={`tier-badge tier-badge--${tier.name}`} aria-hidden="true">
                  <span>{tier.glyph}</span> {tier.label}
                </span>
              )}
              {text}
            </h2>
          )
        },
        h3({ children }) {
          return <h3 id={headingId(children)}>{children}</h3>
        },
        pre({ children }) {
          const child = Array.isArray(children) ? children[0] : children
          const childClassName = child?.props?.className || ''
          // A mermaid fence renders its own container — skip the <pre> wrapper
          // so MermaidBlock isn't nested inside one.
          if (/language-mermaid/.test(childClassName)) {
            return children
          }
          return <pre>{children}</pre>
        },
        table({ children, ...props }) {
          tableCountRef.current += 1
          return (
            <div className="table-scroll" tabIndex="0" role="region" aria-label={`Scrollable table ${tableCountRef.current}`}>
              <table {...props}>{children}</table>
            </div>
          )
        },
        code({ className, children, ...rest }) {
          const match = /language-(\w+)/.exec(className || '')
          const lang = match?.[1]
          if (lang === 'mermaid') {
            return <MermaidBlock code={extractText(children)} />
          }
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
