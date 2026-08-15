export const tcpHeaderFields = [
  {
    name: 'Source Port',
    bits: 16,
    bytes: '0-1',
    description: 'Port number of the sending application process (e.g., 5173 for local web client).',
    example: '5173'
  },
  {
    name: 'Destination Port',
    bits: 16,
    bytes: '2-3',
    description: 'Port number of the destination application process (e.g., 443 for HTTPS, 80 for HTTP).',
    example: '443'
  },
  {
    name: 'Sequence Number',
    bits: 32,
    bytes: '4-7',
    description: 'Byte offset of the first data byte in this segment within the overall TCP byte stream.',
    example: '1000'
  },
  {
    name: 'Acknowledgment Number',
    bits: 32,
    bytes: '8-11',
    description: 'Valid if ACK flag is set. Contains the next sequential byte number expected from the remote sender.',
    example: '2501'
  },
  {
    name: 'Data Offset (Header Length)',
    bits: 4,
    bytes: '12 (high 4 bits)',
    description: 'Number of 32-bit (4-byte) words in the header. Default is 5 (20 bytes); max is 15 (60 bytes).',
    example: '5 (20 Bytes)'
  },
  {
    name: 'Control Flags (URG, ACK, PSH, RST, SYN, FIN)',
    bits: 6,
    bytes: '13',
    description: '6 1-bit control indicators: SYN (establish), ACK (acknowledge), FIN (close), RST (abort), PSH (push data), URG (urgent).',
    example: '[SYN, ACK]'
  },
  {
    name: 'Window Size (rwnd)',
    bits: 16,
    bytes: '14-15',
    description: 'Advertised receiver buffer capacity for flow control. Max 65,535 bytes (can scale to 1GB via Window Scale Option).',
    example: '64,240 Bytes'
  },
  {
    name: 'Checksum',
    bits: 16,
    bytes: '16-17',
    description: '16-bit 1s complement checksum covering the pseudo-IP header, TCP header, and segment payload.',
    example: '0x8FA2'
  },
  {
    name: 'Urgent Pointer',
    bits: 16,
    bytes: '18-19',
    description: 'Offset to urgent out-of-band byte when URG flag is asserted.',
    example: '0x0000'
  },
  {
    name: 'Options & Padding',
    bits: '0-320',
    bytes: '20-59 (Optional)',
    description: 'Optional extensions including Maximum Segment Size (MSS), Window Scale, SACK Permitted, and Timestamps.',
    example: 'MSS: 1460, SACK: Permitted'
  }
]

export const udpHeaderFields = [
  {
    name: 'Source Port',
    bits: 16,
    bytes: '0-1',
    description: 'Optional port number of the sending application process.',
    example: '53 (DNS Client)'
  },
  {
    name: 'Destination Port',
    bits: 16,
    bytes: '2-3',
    description: 'Port number of the receiving service (e.g., 53 for DNS, 123 for NTP).',
    example: '53 (DNS Server)'
  },
  {
    name: 'Length',
    bits: 16,
    bytes: '4-5',
    description: 'Total byte length of the UDP header (8 bytes) + UDP Data payload.',
    example: '512 Bytes'
  },
  {
    name: 'Checksum',
    bits: 16,
    bytes: '6-7',
    description: 'Error detection checksum calculated over IPv4 pseudo-header and UDP datagram.',
    example: '0xEF12'
  }
]
