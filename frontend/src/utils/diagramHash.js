// Identifies a diagram by its source so the build-time renderer and the runtime lookup agree on
// a filename without needing a shared registry. FNV-1a: short, stable, dependency-free, and
// computable identically in Node (the render script) and the browser — Node's crypto isn't
// available in the bundle, and a hash mismatch would silently break every diagram.
export function diagramHash(source) {
  const normalized = source.replace(/\r\n/g, '\n').trim()
  let hash = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
