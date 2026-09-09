export function calculateIpv4Subnet(ipAddress, cidr) {
  const parts = (ipAddress || '').split('.')
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32 || parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) {
    return { valid: false }
  }
  const octets = parts.map(Number)
  if (octets.some(octet => octet < 0 || octet > 255)) return { valid: false }

  const ipNumber = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
  const maskNumber = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0
  const networkNumber = (ipNumber & maskNumber) >>> 0
  const lastAddressNumber = (networkNumber | (~maskNumber >>> 0)) >>> 0
  const numberToIp = value => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.')
  const totalHosts = 2 ** (32 - cidr)
  const firstHost = cidr >= 31 ? networkNumber : networkNumber + 1
  const lastHost = cidr >= 31 ? lastAddressNumber : lastAddressNumber - 1

  return {
    valid: true,
    networkIp: numberToIp(networkNumber),
    broadcastIp: numberToIp(lastAddressNumber),
    subnetMask: numberToIp(maskNumber),
    firstHost: numberToIp(firstHost),
    lastHost: numberToIp(lastHost),
    totalHosts,
    usableHosts: totalHosts > 2 ? totalHosts - 2 : totalHosts,
    lastAddressLabel: cidr <= 30 ? 'Broadcast IP' : 'Last subnet address'
  }
}
