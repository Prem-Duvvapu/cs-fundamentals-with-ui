export function computeWaveform(bitString, encoding) {
  const cleanBits = (bitString || '').replace(/[^01]/g, '')
  if (!cleanBits) return []

  const bits = cleanBits.split('')
  const result = []

  let currentLevel = 'L' // For NRZ-I and Differential Manchester state tracking

  bits.forEach((bit, idx) => {
    switch (encoding) {
      case 'nrz-l': {
        const level = bit === '1' ? 'H' : 'L'
        result.push({
          bit,
          index: idx,
          firstHalf: level,
          secondHalf: level,
          label: bit === '1' ? '+V (High)' : '0V (Low)',
          transition: 'None'
        })
        break
      }
      case 'nrz-i': {
        if (bit === '1') {
          currentLevel = currentLevel === 'H' ? 'L' : 'H'
        }
        result.push({
          bit,
          index: idx,
          firstHalf: currentLevel,
          secondHalf: currentLevel,
          label: currentLevel === 'H' ? '+V' : '0V',
          transition: bit === '1' ? 'Invert at Start' : 'No Transition'
        })
        break
      }
      case 'manchester': {
        // Manchester IEEE 802.3 standard: 0 = L->H, 1 = H->L
        const first = bit === '1' ? 'H' : 'L'
        const second = bit === '1' ? 'L' : 'H'
        result.push({
          bit,
          index: idx,
          firstHalf: first,
          secondHalf: second,
          label: bit === '1' ? 'High ➔ Low' : 'Low ➔ High',
          transition: 'Mid-bit Transition'
        })
        break
      }
      case 'diff-manchester': {
        // Differential Manchester:
        // Transition at start if bit == '0', no transition at start if bit == '1'.
        // Mid-bit transition ALWAYS occurs for clocking.
        if (bit === '0') {
          currentLevel = currentLevel === 'H' ? 'L' : 'H'
        }
        const first = currentLevel
        const second = currentLevel === 'H' ? 'L' : 'H'
        currentLevel = second // update state for next bit start
        result.push({
          bit,
          index: idx,
          firstHalf: first,
          secondHalf: second,
          label: `${first} ➔ ${second}`,
          transition: bit === '0' ? 'Start & Mid Transition' : 'Mid Transition Only'
        })
        break
      }
      default:
        break
    }
  })

  return result
}
