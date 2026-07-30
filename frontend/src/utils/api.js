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
