import { render } from '@testing-library/react'
import MarkdownRenderer from '../markdown/MarkdownRenderer'

it('assigns unique readable IDs to formatted headings and ignores code fences', () => {
  const content = '## 🟢 Beginner Level\n\n### Using `this` and **objects**\n\n### Example\n\n### Example\n\n### Example 2\n\n```text\n### Not a heading\n```'
  const { container, rerender } = render(<MarkdownRenderer content={content} />)
  const ids = () => [...container.querySelectorAll('h2, h3')].map(heading => heading.id)
  expect(ids()).toEqual(['beginner-level', 'using-this-and-objects', 'example', 'example-2', 'example-2-2'])
  expect(container.querySelector('h2')).toHaveAttribute('data-toc-title', 'Beginner Level')
  rerender(<MarkdownRenderer content={content} />)
  expect(ids()).toEqual(['beginner-level', 'using-this-and-objects', 'example', 'example-2', 'example-2-2'])
})
