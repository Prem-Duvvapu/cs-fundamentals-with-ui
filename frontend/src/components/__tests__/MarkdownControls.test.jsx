import { fireEvent, render, screen } from '@testing-library/react'
import MarkdownRenderer from '../markdown/MarkdownRenderer'

it('keeps code wrapping when the reader parent updates', () => {
  const content = '## Example\n\n```java\nSystem.out.println("hello");\n```'
  const { rerender } = render(<MarkdownRenderer content={content} />)
  fireEvent.click(screen.getByRole('button', { name: 'Wrap code' }))
  expect(screen.getByRole('button', { name: 'Wrap code' })).toHaveAttribute('aria-pressed', 'true')
  rerender(<MarkdownRenderer content={content} onReady={() => {}} />)
  expect(screen.getByRole('button', { name: 'Wrap code' })).toHaveAttribute('aria-pressed', 'true')
})
