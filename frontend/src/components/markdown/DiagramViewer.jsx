import { useRef, useState } from 'react'
export default function DiagramViewer({ src, description }) {
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [zoom, setZoom] = useState(100)
  const [active, setActive] = useState(false)
  function open() { setZoom(100); setActive(true); dialog.current?.showModal() }
  return <><button className="diagram-expand" type="button" ref={trigger} onClick={open}>Explore diagram</button><dialog className="diagram-viewer" ref={dialog} aria-label="Full-size lesson diagram" onClose={() => { setActive(false); trigger.current?.focus() }}>
    <div className="diagram-viewer-toolbar"><strong>Lesson diagram</strong><div><button type="button" onClick={() => setZoom(value => Math.max(50, value - 25))} disabled={zoom <= 50}>Zoom out</button><output aria-live="polite">{zoom}%</output><button type="button" onClick={() => setZoom(value => Math.min(300, value + 25))} disabled={zoom >= 300}>Zoom in</button><button type="button" onClick={() => setZoom(100)}>Fit</button><button type="button" onClick={() => dialog.current?.close()}>Close</button></div></div>
    <div className="diagram-viewer-canvas" tabIndex={0} aria-label="Diagram viewport; scroll to inspect">{active && <img src={src} alt={description} style={{ width: `${zoom}%` }} />} </div><p>{description}</p><a href={src} target="_blank" rel="noreferrer">Open original image in a new tab</a>
  </dialog></>
}
