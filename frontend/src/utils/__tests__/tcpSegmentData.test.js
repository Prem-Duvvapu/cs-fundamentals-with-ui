import { describe, it, expect } from 'vitest'
import { tcpHeaderFields, udpHeaderFields } from '../tcpSegmentData'

describe('tcpSegmentData', () => {
  it('should define exactly 10 fields for TCP segment header specification', () => {
    expect(tcpHeaderFields).toHaveLength(10)
    const names = tcpHeaderFields.map(f => f.name)
    expect(names).toContain('Source Port')
    expect(names).toContain('Destination Port')
    expect(names).toContain('Sequence Number')
    expect(names).toContain('Acknowledgment Number')
    expect(names).toContain('Window Size (rwnd)')
    expect(names).toContain('Checksum')
  })

  it('should define exactly 4 fields for UDP datagram header (8 bytes fixed)', () => {
    expect(udpHeaderFields).toHaveLength(4)
    const names = udpHeaderFields.map(f => f.name)
    expect(names).toEqual(['Source Port', 'Destination Port', 'Length', 'Checksum'])
  })
})
