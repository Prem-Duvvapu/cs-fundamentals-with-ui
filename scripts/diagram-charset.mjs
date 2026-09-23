// SVG images embed a font subset. Source line endings must not change that subset.
export function subsetCharacters(diagrams) {
  const chars = new Set()
  for (let code = 0x20; code <= 0x7e; code++) chars.add(String.fromCharCode(code))
  for (const diagram of diagrams) for (const char of diagram.code) chars.add(char)
  chars.delete('\n')
  chars.delete('\r')
  return [...chars].sort().join('')
}
