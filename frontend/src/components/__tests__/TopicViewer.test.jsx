import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import TopicViewer from '../TopicViewer'

// TopicViewer intentionally lazy-loads the sizeable Markdown stack. Its rendering
// semantics have dedicated real-pipeline coverage in TopicViewer.markdown.test.jsx;
// this unit suite only needs to verify the content handed across the boundary.
// Keeping that boundary synchronous avoids filesystem-dependent dynamic-import
// timeouts on WSL/OneDrive and makes these interaction tests deterministic.
vi.mock('../markdown/MarkdownRenderer', () => ({
  default: ({ content }) => (
    <div>
      <div data-testid="markdown-content">{content}</div>
      {[...content.matchAll(/^## (?!#)(.+)$/gm)].map(([, title]) => (
        <span
          hidden
          key={title}
          id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
        />
      ))}
    </div>
  )
}))

beforeEach(() => {
  global.fetch = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    media: '(min-width: 1024px)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn()
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete Element.prototype.scrollIntoView
})

describe('TopicViewer', () => {
  it('shows loading state initially', () => {
    global.fetch.mockResolvedValueOnce(new Response(''))
    render(<TopicViewer topicId="process-management" />)
    expect(screen.getByText('Loading topic…')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /loading topic/i })).toBeInTheDocument()
  })

  it('renders markdown content after fetch', async () => {
    const md = '# Process Management\n\nA process is a program in execution.'
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="process-management" />)

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('A process is a program in execution.')
    })
    expect(screen.queryByRole('heading', { level: 1, name: 'Process Management' })).not.toBeInTheDocument()
  })

  it('shows fallback when fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<TopicViewer topicId="unknown" />)

    await waitFor(() => {
      expect(screen.getByText('Content not available yet.')).toBeInTheDocument()
    })
  })

  it('shows fallback when the backend returns 404 for an unregistered topic id', async () => {
    global.fetch.mockResolvedValueOnce(new Response('', { status: 404 }))

    render(<TopicViewer topicId="not-a-real-topic" />)

    await waitFor(() => {
      expect(screen.getByText('Content not available yet.')).toBeInTheDocument()
    })
  })

  it('fetches from the correct API endpoint', async () => {
    global.fetch.mockResolvedValueOnce(new Response(''))
    render(<TopicViewer topicId="cpu-scheduling" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/content/os/cpu-scheduling')
    })
  })

  it('passes code blocks to the Markdown renderer intact', async () => {
    const md = '```java\nint x = 1;\n```'
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="test" />)

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('int x = 1;')
    })
  })

  it('renders tier navigation and an interview-practice deck for structured content', async () => {
    const md = `## 🟢 Beginner Level

Begin here.

## 🟡 Intermediate Level

Build on it.

## 🔴 Expert Level

Apply it.

### Interview Questions

**Q1. What should you check first?** \`[easy]\`

Check the observable symptoms, identify the responsible subsystem, and validate the fix against a realistic failure case.`
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="process-management" />)

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /jump to learning level/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /test your recall/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /reveal answer/i })).toBeInTheDocument()
  })

  it('renders answer Markdown without leaking the following section', async () => {
    const md = `## 🔴 Expert Level

### Interview Questions

**Q1. How should the answer be presented?** \`[medium]\`

Use **structured reasoning**, \`inline code\`, and a [primary source](https://example.com).

### Further Reading

- This must stay outside the answer.`
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="process-management" />)

    const reveal = await screen.findByRole('button', { name: /reveal answer/i }, { timeout: 15000 })
    expect(reveal).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(reveal)

    expect(reveal).toHaveAttribute('aria-expanded', 'true')
    const answer = document.getElementById(reveal.getAttribute('aria-controls'))
    await waitFor(() => expect(answer).toHaveTextContent('structured reasoning'))
    expect(answer.querySelector('[data-testid="markdown-content"]')).toHaveTextContent('inline code')
    expect(answer.querySelector('[data-testid="markdown-content"]')).toHaveTextContent('primary source')
    expect(answer).not.toHaveTextContent('This must stay outside the answer')
  })

  it('provides labelled reader controls, a table of contents toggle, and a continue action', async () => {
    const md = `## 🟢 Beginner Level

Begin here.

## 🟡 Intermediate Level

Build on it.

## 🔴 Expert Level

Apply it.`
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="process-management" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /read in three passes/i })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: /table of contents/i })).toBeInTheDocument()
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('Beginner Level')
    })

    const continueButton = screen.getByRole('button', { name: /continue reading at beginner level/i })
    fireEvent.click(continueButton)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })

    const toggle = screen.getByRole('button', { name: /hide table of contents/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(screen.queryByRole('navigation', { name: /table of contents/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show table of contents/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('starts with the table of contents collapsed below the desktop breakpoint', async () => {
    window.matchMedia.mockReturnValue({
      matches: false,
      media: '(min-width: 1024px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
    global.fetch.mockResolvedValueOnce(new Response('## 🟢 Beginner Level\n\nBegin here.'))

    render(<TopicViewer topicId="process-management" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show table of contents/i })).toHaveAttribute('aria-expanded', 'false')
    })
    expect(screen.queryByRole('navigation', { name: /table of contents/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show table of contents/i }))
    expect(screen.getByRole('navigation', { name: /table of contents/i })).toBeInTheDocument()
  })

  it('adapts the table of contents when crossing the desktop breakpoint', async () => {
    let handleBreakpointChange
    window.matchMedia.mockReturnValue({
      matches: true,
      media: '(min-width: 1024px)',
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') handleBreakpointChange = handler
      }),
      removeEventListener: vi.fn()
    })
    global.fetch.mockResolvedValueOnce(new Response('## 🟢 Beginner Level\n\nBegin here.'))

    render(<TopicViewer topicId="process-management" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hide table of contents/i })).toBeInTheDocument()
    })

    act(() => handleBreakpointChange({ matches: false }))
    expect(screen.getByRole('button', { name: /show table of contents/i })).toHaveAttribute('aria-expanded', 'false')

    act(() => handleBreakpointChange({ matches: true }))
    expect(screen.getByRole('button', { name: /hide table of contents/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it.each([
    ['sql-querying', 'dbms'],
    ['spring-boot-internals', 'java-spring'],
    ['spring-rest-api-design', 'java-spring'],
    ['spring-security', 'java-spring'],
    ['spring-caching-async', 'java-spring'],
    ['spring-testing-production', 'java-spring'],
    ['ml-fundamentals', 'aiml']
  ])('uses the shared category map for %s', async (topicId, category) => {
    global.fetch.mockResolvedValueOnce(new Response('# SQL'))
    render(<TopicViewer topicId={topicId} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/v1/content/${category}/${topicId}`)
    })
  })
})
