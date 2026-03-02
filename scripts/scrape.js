import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scrapeQuery, closeBrowser, CITIES } from '../server/scraper.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../data/db.json')
const BASE_DELAY = 3000

const CATEGORIES = [
  'кафе', 'рестораны', 'отели', 'аптеки', 'салоны красоты',
  'автосервис', 'стоматология', 'фитнес', 'продуктовые магазины',
  'доставка еды', 'парикмахерские', 'ветеринарные клиники',
  'химчистка', 'ремонт телефонов', 'цветочные магазины',
]

function loadDb() {
  if (!existsSync(DB_PATH)) return {}
  try { return JSON.parse(readFileSync(DB_PATH, 'utf-8')) }
  catch { return {} }
}

function saveDb(db) {
  mkdirSync(dirname(DB_PATH), { recursive: true })
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

function log(msg) {
  const ts = new Date().toLocaleTimeString('ru-RU')
  console.log(`[${ts}] ${msg}`)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 1000))
}

function parseArgs() {
  const args = process.argv.slice(2)
  const flags = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '')
    const val = args[i + 1]
    if (key && val) flags[key] = val
  }
  return flags
}

async function main() {
  const flags = parseArgs()
  const cityKeys = flags.city ? [flags.city] : Object.keys(CITIES)
  const categories = flags.category ? [flags.category] : CATEGORIES
  const db = loadDb()
  const total = cityKeys.length * categories.length
  let done = 0
  let skipped = 0

  log(`Задач: ${total} (${cityKeys.length} городов × ${categories.length} категорий)`)
  log(`База данных: ${DB_PATH}`)
  log('')

  for (const city of cityKeys) {
    if (!CITIES[city]) { log(`Неизвестный город: ${city}`); continue }
    if (!db[city]) db[city] = {}

    for (const category of categories) {
      done++
      if (db[city][category]?.length > 0 && !flags.force) {
        skipped++
        log(`[${done}/${total}] ${CITIES[city].name} / ${category} — уже есть (${db[city][category].length}), пропуск`)
        continue
      }

      log(`[${done}/${total}] ${CITIES[city].name} / ${category}`)

      try {
        const items = await scrapeQuery(category, city, {
          onProgress(stage, count, total) {
            if (stage === 'captcha') log('  ⚠ CAPTCHA — решите в окне браузера')
            if (stage === 'scrolling') log(`  Прокрутка (${count}/${total})...`)
            if (stage === 'details') log(`  Детали для ${count} доп. заведений...`)
            if (stage === 'done') log(`  ✓ ${count} заведений`)
          },
        })

        db[city][category] = items
        saveDb(db)
        const withPhones = items.filter(i => i.phones).length
        log(`  Итого: ${items.length} (${withPhones} с телефоном)`)
      } catch (err) {
        log(`  ✗ Ошибка: ${err.message}`)
      }

      await sleep(BASE_DELAY)
    }
  }

  await closeBrowser()

  const totalItems = Object.values(db).reduce(
    (sum, cats) => sum + Object.values(cats).reduce((s, arr) => s + arr.length, 0), 0,
  )
  log('')
  log(`Готово! Пропущено: ${skipped}. Всего записей в базе: ${totalItems}`)
}

main().catch(async (err) => {
  console.error('Fatal:', err)
  await closeBrowser()
  process.exit(1)
})
