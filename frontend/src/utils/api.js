const BASE = '/api/v1'

export async function fetchTopics() {
  const res = await fetch(`${BASE}/topics`)
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

export async function fetchTopicsByCategory(category) {
  const res = await fetch(`${BASE}/topics/category/${category}`)
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

export async function fetchSearch({ q, category, limit } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  if (limit != null) params.set('limit', String(limit))
  const res = await fetch(`${BASE}/search?${params.toString()}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function fetchInterviewQuestions({ category, difficulty, offset, limit } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (difficulty) params.set('difficulty', difficulty)
  if (offset != null) params.set('offset', String(offset))
  if (limit != null) params.set('limit', String(limit))
  const res = await fetch(`${BASE}/interview/questions?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch interview questions')
  return res.json()
}

export async function fetchCpuSchedulingSimulation(payload) {
  const res = await fetch(`${BASE}/simulation/cpu-scheduling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}

export async function fetchPageReplacementSimulation(payload) {
  const res = await fetch(`${BASE}/simulation/page-replacement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}

export async function fetchSubnetSimulation(payload) {
  const res = await fetch(`${BASE}/simulation/subnet-calculator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}

export async function fetchBankersSimulation(payload) {
  const res = await fetch(`${BASE}/simulation/bankers-algorithm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}
