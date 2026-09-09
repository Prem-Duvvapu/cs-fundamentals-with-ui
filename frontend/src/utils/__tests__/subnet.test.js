import { calculateIpv4Subnet } from '../subnet'

describe('calculateIpv4Subnet', () => {
  it.each([
    [0, '0.0.0.0', '255.255.255.255', 4294967294],
    [24, '192.168.1.0', '192.168.1.255', 254],
    [30, '192.168.1.8', '192.168.1.11', 2]
  ])('calculates conventional /%s subnets', (cidr, network, lastAddress, usableHosts) => {
    const result = calculateIpv4Subnet('192.168.1.10', cidr)
    expect(result).toMatchObject({ valid: true, networkIp: network, broadcastIp: lastAddress, usableHosts })
  })

  it('treats both addresses in a /31 as point-to-point hosts', () => {
    expect(calculateIpv4Subnet('192.168.1.10', 31)).toMatchObject({
      firstHost: '192.168.1.10', lastHost: '192.168.1.11', usableHosts: 2, lastAddressLabel: 'Last subnet address'
    })
  })

  it('keeps a /32 host range inside its single-address subnet', () => {
    expect(calculateIpv4Subnet('10.0.0.1', 32)).toMatchObject({
      networkIp: '10.0.0.1', firstHost: '10.0.0.1', lastHost: '10.0.0.1', usableHosts: 1
    })
  })

  it.each([['10.0.0.1', -1], ['10.0.0.1', 33], ['10.0.0', 24], ['10.0.0.x', 24], ['300.0.0.1', 24]])(
    'rejects invalid input %s/%s', (ip, cidr) => expect(calculateIpv4Subnet(ip, cidr).valid).toBe(false)
  )
})
