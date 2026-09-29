import { Children, isValidElement, useRef, useState } from 'react'
function sourceText(children) {
  return Children.toArray(children).map(child => isValidElement(child) ? sourceText(child.props.children) : String(child)).join('')
}
export default function CodeBlock({ children }) {
  const [copied, setCopied] = useState('')
  const [wrap, setWrap] = useState(false)
  const preRef = useRef(null)
  const first = Children.toArray(children)[0]
  const language = /language-(\w+)/.exec(first?.props?.className || '')?.[1] || 'text'
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(sourceText(children))
      setCopied('Copied')
    } catch {
      const range = document.createRange()
      range.selectNodeContents(preRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      setCopied('Code selected. Use your browser’s Copy command.')
    }
  }
  return <div className="code-block"><div className="code-block-toolbar"><span>{language}</span><div><button type="button" aria-pressed={wrap} onClick={() => setWrap(value => !value)}>Wrap code</button><button type="button" onClick={copy}>Copy code</button></div></div><pre ref={preRef} className={`u-scroll-x-hint ${wrap ? 'code-block--wrap' : ''}`} tabIndex={0}>{children}</pre>{copied && <p role="status" className="code-copy-status">{copied}</p>}</div>
}
