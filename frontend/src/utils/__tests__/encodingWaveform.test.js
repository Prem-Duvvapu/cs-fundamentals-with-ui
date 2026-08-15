import { describe, it, expect } from 'vitest'
import { computeWaveform } from '../encodingWaveform'

describe('encodingWaveform', () => {
  it('should compute NRZ-L waveform correctly for bit sequence 101', () => {
    const result = computeWaveform('101', 'nrz-l')
    expect(result).toHaveLength(3)
    expect(result[0].firstHalf).toBe('H')
    expect(result[1].firstHalf).toBe('L')
    expect(result[2].firstHalf).toBe('H')
  })

  it('should compute Manchester encoding correctly according to IEEE 802.3', () => {
    const result = computeWaveform('10', 'manchester')
    expect(result).toHaveLength(2)
    // 1 is High to Low
    expect(result[0].firstHalf).toBe('H')
    expect(result[0].secondHalf).toBe('L')
    // 0 is Low to High
    expect(result[1].firstHalf).toBe('L')
    expect(result[1].secondHalf).toBe('H')
  })

  it('should handle empty or invalid inputs gracefully', () => {
    expect(computeWaveform('', 'nrz-l')).toEqual([])
    expect(computeWaveform('abc', 'nrz-l')).toEqual([])
  })
})
