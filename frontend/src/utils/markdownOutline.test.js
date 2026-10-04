import { describe, expect, it } from 'vitest'
import { parseMarkdownOutline } from './markdownOutline'

describe('category outlines use the reader heading pipeline', () => {
  it('preserves duplicate-ID allocation, formatting, entities, closing hashes and hidden deeper headings', () => {
    expect(parseMarkdownOutline('# Metadata\n\n## 🟢 Beginner Level\n\n### `Map<K, V>` &amp; **sets** ###\n\n#### Duplicate\n\n### Duplicate\n\n### Duplicate')).toEqual([
      { id: 'beginner-level', title: 'Beginner Level', level: 2 },
      { id: 'map-k-v-sets', title: 'Map<K, V> & sets', level: 3 },
      { id: 'duplicate-2', title: 'Duplicate', level: 3 },
      { id: 'duplicate-3', title: 'Duplicate', level: 3 }
    ])
  })
  it('ignores headings inside code fences', () => {
    expect(parseMarkdownOutline('~~~text\n## Not a heading\n~~~\n\n### Real heading')).toEqual([{ id: 'real-heading', title: 'Real heading', level: 3 }])
  })
})
