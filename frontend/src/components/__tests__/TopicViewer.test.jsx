import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import TopicViewer from '../TopicViewer'

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

    // MarkdownRenderer is React.lazy()-loaded (keeps ~600KB of react-markdown/
    // KaTeX/highlight.js out of the main bundle); its first real dynamic
    // import needs more than waitFor's 1000ms default.
    await waitFor(() => {
      expect(screen.getByText('A process is a program in execution.')).toBeInTheDocument()
    }, { timeout: 30000 })
    expect(screen.queryByRole('heading', { level: 1, name: 'Process Management' })).not.toBeInTheDocument()
  }, 30000)

  it('shows fallback when fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<TopicViewer topicId="unknown" />)

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

  it('renders code blocks correctly', async () => {
    const md = '```java\nint x = 1;\n```'
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="test" />)

    await waitFor(() => {
      const code = document.querySelector('pre code')
      expect(code).toBeInTheDocument()
      expect(code.textContent).toContain('int x = 1;')
    }, { timeout: 15000 })
  }, 15000)

  it('renders tier navigation and an interview-practice deck for structured content', async () => {
    const md = `## 🟢 Beginner Level

Begin here.

## 🟡 Intermediate Level

Build on it.

## 🔴 Expert Level

Apply it.

**Q1. What should you check first?** \`[easy]\`

Check the observable symptoms, identify the responsible subsystem, and validate the fix against a realistic failure case.`
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="process-management" />)

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /jump to learning level/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /test your recall/i })).toBeInTheDocument()
    }, { timeout: 15000 })
    expect(screen.getByRole('button', { name: /reveal answer/i })).toBeInTheDocument()
    const beginnerHeading = screen.getByRole('heading', { name: /^beginner level$/i })
    expect(beginnerHeading).toHaveAttribute('id', 'beginner-level')
    expect(beginnerHeading.querySelector('.tier-badge--beginner')).toBeInTheDocument()
  }, 15000)

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
      expect(screen.getByRole('heading', { name: /beginner level/i })).toBeInTheDocument()
    }, { timeout: 15000 })

    const continueButton = screen.getByRole('button', { name: /continue reading at beginner level/i })
    fireEvent.click(continueButton)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })

    const toggle = screen.getByRole('button', { name: /hide table of contents/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(screen.queryByRole('navigation', { name: /table of contents/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show table of contents/i })).toHaveAttribute('aria-expanded', 'false')
  }, 15000)

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
    }, { timeout: 15000 })
    expect(screen.queryByRole('navigation', { name: /table of contents/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show table of contents/i }))
    expect(screen.getByRole('navigation', { name: /table of contents/i })).toBeInTheDocument()
  }, 15000)

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
    }, { timeout: 15000 })

    act(() => handleBreakpointChange({ matches: false }))
    expect(screen.getByRole('button', { name: /show table of contents/i })).toHaveAttribute('aria-expanded', 'false')

    act(() => handleBreakpointChange({ matches: true }))
    expect(screen.getByRole('button', { name: /hide table of contents/i })).toHaveAttribute('aria-expanded', 'true')
  }, 15000)

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
