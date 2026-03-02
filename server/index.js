import express from 'express'
import { config } from 'dotenv'
import { readFileSync, existsSync, watchFile } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scrapeQuery, CITIES, closeBrowser } from './scraper.js'

config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const DB_PATH = join(__dirname, '../data/db.json')

let db = {}

function loadDb() {
  if (!existsSync(DB_PATH)) return
  try {
    db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
    const total = Object.values(db).reduce(
      (sum, cats) => sum + Object.values(cats).reduce((s, arr) => s + arr.length, 0), 0,
    )
    console.log(`DB loaded: ${Object.keys(db).length} cities, ${total} businesses`)
  } catch (err) {
    console.error('Failed to load DB:', err.message)
  }
}

loadDb()
if (existsSync(DB_PATH)) watchFile(DB_PATH, { interval: 5000 }, loadDb)

app.get('/api/cities', (_req, res) => {
  const list = Object.entries(CITIES).map(([key, { name }]) => ({ key, name }))
  res.json(list)
})

app.get('/api/categories', (req, res) => {
  const { city } = req.query
  if (city && db[city]) {
    const cats = Object.keys(db[city]).filter(c => db[city][c]?.length > 0)
    return res.json(cats)
  }
  const all = new Set()
  for (const cats of Object.values(db)) {
    for (const cat of Object.keys(cats)) {
      if (cats[cat]?.length > 0) all.add(cat)
    }
  }
  res.json([...all].sort())
})

app.get('/api/search', (req, res) => {
  const { category, city } = req.query
  if (!category) return res.status(400).json({ error: 'Укажите категорию' })
  if (!city)     return res.status(400).json({ error: 'Выберите город' })

  const cityData = db[city]
  if (!cityData) return res.json({ results: [], total: 0 })

  const q = category.toLowerCase().trim()
  let results = cityData[q]

  if (!results) {
    for (const [cat, items] of Object.entries(cityData)) {
      if (cat.toLowerCase().includes(q) || q.includes(cat.toLowerCase())) {
        results = items
        break
      }
    }
  }

  res.json({ results: results || [], total: results?.length || 0 })
})

let scraping = false

app.get('/api/live-search', async (req, res) => {
  const { query, city } = req.query
  if (!query?.trim()) return res.status(400).json({ error: 'Укажите запрос' })
  if (!city)          return res.status(400).json({ error: 'Выберите город' })
  if (!CITIES[city])  return res.status(400).json({ error: 'Неизвестный город' })

  if (scraping) {
    return res.status(429).json({ error: 'Парсер уже работает. Дождитесь завершения.' })
  }

  scraping = true
  let cancelled = false
  req.on('close', () => { cancelled = true })

  try {
    console.log(`Live search: "${query.trim()}" in ${CITIES[city].name}`)
    const results = await scrapeQuery(query.trim(), city)
    if (cancelled) return
    res.json({ results, total: results.length })
  } catch (err) {
    console.error('Live search error:', err.message)
    if (!cancelled) {
      res.status(500).json({ error: `Ошибка парсинга: ${err.message}` })
    }
  } finally {
    scraping = false
  }
})

const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const server = app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`)
})

async function shutdown() {
  await closeBrowser()
  server.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
