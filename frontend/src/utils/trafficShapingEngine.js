/**
 * Simulates a single discrete tick of the Token Bucket traffic shaping algorithm.
 */
export function simulateTokenBucket(currentTokens, capacity, tokenRate, incomingPackets) {
  const cap = Math.max(1, capacity)
  const rate = Math.max(1, tokenRate)
  const incoming = Math.max(0, incomingPackets)

  // Add tokens up to capacity
  const tokensAvailable = Math.min(cap, currentTokens + rate)

  // Consume tokens for incoming packets
  const transmitted = Math.min(tokensAvailable, incoming)
  const remainingTokens = tokensAvailable - transmitted
  const dropped = incoming - transmitted

  return {
    tokens: remainingTokens,
    transmitted,
    dropped,
    tokensAdded: rate
  }
}

/**
 * Simulates a single discrete tick of the Leaky Bucket traffic shaping algorithm.
 */
export function simulateLeakyBucket(currentBuffer, capacity, leakRate, incomingPackets) {
  const cap = Math.max(1, capacity)
  const leak = Math.max(1, leakRate)
  const incoming = Math.max(0, incomingPackets)

  // New packets enter buffer up to capacity; excess is dropped immediately
  const availableSpace = Math.max(0, cap - currentBuffer)
  const acceptedToBuffer = Math.min(incoming, availableSpace)
  const dropped = incoming - acceptedToBuffer

  const totalInBuffer = currentBuffer + acceptedToBuffer

  // Leak packets out at constant rate
  const transmitted = Math.min(leak, totalInBuffer)
  const remainingBuffer = totalInBuffer - transmitted

  return {
    buffer: remainingBuffer,
    transmitted,
    dropped,
    accepted: acceptedToBuffer
  }
}
