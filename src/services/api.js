const API_BASE = '/api'

export async function fetchCities() {
  const res = await fetch(`${API_BASE}/cities`)
  return res.json()
}

export async function fetchCategories(city) {
  const params = city ? `?city=${city}` : ''
  const res = await fetch(`${API_BASE}/categories${params}`)
  return res.json()
}

export async function searchBusinesses(category, city) {
  const params = new URLSearchParams({ category, city })
  const res = await fetch(`${API_BASE}/search?${params}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ошибка поиска')
  return data
}

export async function liveSearch(query, city) {
  const params = new URLSearchParams({ query, city })
  const res = await fetch(`${API_BASE}/live-search?${params}`, { signal: AbortSignal.timeout(600000) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ошибка парсинга')
  return data
}
