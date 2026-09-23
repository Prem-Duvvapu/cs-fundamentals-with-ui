export function headingId(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
}

function textContent(node) {
  if (node.type === 'text') return node.value
  return (node.children || []).map(textContent).join('')
}

// Assign IDs from the parsed document so code fences and inline formatting are handled correctly.
export function rehypeHeadingIds() {
  return tree => {
    const used = new Set()
    function visit(node) {
      if (node.type === 'element' && /^h[2-6]$/.test(node.tagName)) {
        const base = headingId(textContent(node))
        let id = base
        let suffix = 2
        while (used.has(id)) id = `${base}-${suffix++}`
        used.add(id)
        node.properties = { ...node.properties, id }
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
}
