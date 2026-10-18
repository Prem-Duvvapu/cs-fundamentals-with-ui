import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarkdownRenderer from '../markdown/MarkdownRenderer'
import { resolveCurriculumLink } from '../../utils/curriculumLinks'

const repository = 'https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/blob/main'

describe('links from curriculum Markdown', () => {
  it('opens runnable artifacts at their repository path instead of deployment /examples', () => {
    render(<MarkdownRenderer sourceCategory="aiml" content={'[Train the model](../../examples/labs/aiml/train.py)\n\n[Lab guide](../../examples/labs/README.md#offline-evaluation)'} />)
    expect(screen.getByRole('link', { name: 'Train the model' })).toHaveAttribute('href', `${repository}/examples/labs/aiml/train.py`)
    expect(screen.getByRole('link', { name: 'Lab guide' })).toHaveAttribute('href', `${repository}/examples/labs/README.md#offline-evaluation`)
  })
  it('keeps registered cross-lesson navigation inside the app with its section', () => {
    render(<MarkdownRenderer sourceCategory="java-spring" content={'[ACID](../dbms/06-transactions-acid.md#durability)\n\n[OOP](01d-java-oop-pillars.md)'} />)
    expect(screen.getByRole('link', { name: 'ACID' })).toHaveAttribute('href', '/topic/transactions-acid#durability')
    expect(screen.getByRole('link', { name: 'OOP' })).toHaveAttribute('href', '/topic/java-oop-pillars')
  })
  it('preserves external, route, query and same-document links', () => {
    render(<MarkdownRenderer sourceCategory="os" content={'[DNS](https://example.org/dns?q=1#ttl)\n\n[Search](/search?q=lock)\n\n[Here](#beginner)\n\n[Query](?view=practice)'} />)
    expect(screen.getByRole('link', { name: 'DNS' })).toHaveAttribute('href', 'https://example.org/dns?q=1#ttl')
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search?q=lock')
    expect(screen.getByRole('link', { name: 'Here' })).toHaveAttribute('href', '#beginner')
    expect(screen.getByRole('link', { name: 'Query' })).toHaveAttribute('href', '?view=practice')
  })
  it('does not turn an unknown or category-mismatched file into a registered topic', () => {
    expect(resolveCurriculumLink('../dbms/01-java-oop-pillars.md', 'os')).toBe(`${repository}/content/dbms/01-java-oop-pillars.md`)
    expect(resolveCurriculumLink('../dbms/99-not-registered.md', 'os')).toBe(`${repository}/content/dbms/99-not-registered.md`)
    expect(resolveCurriculumLink('../guide.md', undefined)).toBe('../guide.md')
  })
  it('retains react-markdown unsafe-protocol filtering after URL resolution', () => {
    render(<MarkdownRenderer sourceCategory="aiml" content={'[Unsafe](javascript:alert%281%29)'} />)
    expect(screen.getByText('Unsafe').getAttribute('href') || '').not.toMatch(/javascript:/i)
  })
})
