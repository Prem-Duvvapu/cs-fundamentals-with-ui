import { render, screen, waitFor } from '@testing-library/react'
import TopicViewer from '../TopicViewer'

beforeEach(() => {
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TopicViewer', () => {
  it('shows loading state initially', () => {
    global.fetch.mockResolvedValueOnce(new Response(''))
    render(<TopicViewer topicId="process-management" />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders markdown content after fetch', async () => {
    const md = '# Process Management\n\nA process is a program in execution.'
    global.fetch.mockResolvedValueOnce(new Response(md))

    render(<TopicViewer topicId="process-management" />)

    // MarkdownRenderer is React.lazy()-loaded (keeps ~600KB of react-markdown/
    // KaTeX/highlight.js out of the main bundle); its first real dynamic
    // import needs more than waitFor's 1000ms default.
    await waitFor(() => {
      expect(screen.getByText('Process Management')).toBeInTheDocument()
    }, { timeout: 15000 })
    expect(screen.getByText('A process is a program in execution.')).toBeInTheDocument()
  }, 15000)

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
})
