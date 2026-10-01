import CodeBlock from './CodeBlock'
import { Children, isValidElement, memo, useLayoutEffect, useMemo, useRef } from 'react'
import { rehypeHeadingIds } from '../../utils/markdownHeadings'
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
  return Children.toArray(children).map(child => isValidElement(child) ? extractText(child.props.children) : String(child)).join('').replace(/\n$/, '')
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

/**
 * Full GFM + math + Mermaid renderer for the 3-tier curriculum Markdown in
 * content/. Replaces the previous 68-line regex renderer in TopicViewer —
 * see content/CONTENT_SPEC.md for what topic authors may rely on here.
 */
function MarkdownRenderer({ content, onReady }) {
  // A lesson can render several tables; each needs a distinct accessible name
  // so assistive tech doesn't announce identical "Scrollable table" regions.
  const tableCountRef = useRef(0)
  tableCountRef.current = 0

  useLayoutEffect(() => {
    onReady?.()
  }, [content, onReady])

  // ReactMarkdown treats a changed renderer function as a new component type.
  // Keep these functions stable so reader updates do not reset code/diagram controls.
  const components = useMemo(() => ({
    h1() { return null },
    h2({ node, children }) {
      const { text, tier } = getTierHeading(children)
      return <h2 id={node.properties.id} data-toc-title={text}>
        {tier && <span className={`tier-badge tier-badge--${tier.name}`} aria-hidden="true"><span>{tier.glyph}</span> {tier.label}</span>}
        {text}
      </h2>
    },
    h3({ node, children }) { return <h3 id={node.properties.id}>{children}</h3> },
    pre({ children }) {
      const child = Array.isArray(children) ? children[0] : children
      if (/language-mermaid/.test(child?.props?.className || '')) return children
      return <CodeBlock>{children}</CodeBlock>
    },
    table({ children, ...props }) {
      tableCountRef.current += 1
      return <>
        <div className="table-scroll u-scroll-x-hint" tabIndex="0" role="region" aria-label={`Scrollable table ${tableCountRef.current}`}>
          <table {...props}>{children}</table>
        </div>
        <p className="scroll-hint-caption">Scroll to see the full table →</p>
      </>
    },
    code({ className, children, ...rest }) {
      const lang = /language-(\w+)/.exec(className || '')?.[1]
      if (lang === 'mermaid') return <MermaidBlock code={extractText(children)} />
      return <code className={className} {...rest}>{children}</code>
    }
  }), [])

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        rehypeHeadingIds,
        rehypeKatex,
        [rehypeHighlight, { languages: HIGHLIGHT_LANGUAGES, detect: false }]
      ]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}

export default memo(MarkdownRenderer)
