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
