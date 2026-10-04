import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import { rehypeHeadingIds } from './markdownHeadings.js'

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
  .use(remarkRehype).use(rehypeHeadingIds)

function textContent(node) {
  return node.type === 'text' ? node.value : (node.children || []).map(textContent).join('')
}

export function parseMarkdownOutline(markdown) {
  const tree = processor.runSync(processor.parse(markdown))
  const headings = []
  function visit(node) {
    if (node.type === 'element' && /^h[23]$/.test(node.tagName)) {
      headings.push({ id: node.properties.id, title: textContent(node).replace(/^(🟢|🟡|🔴)\s*/, '').trim(), level: Number(node.tagName[1]) })
    }
    node.children?.forEach(visit)
  }
  visit(tree)
  return headings
}
