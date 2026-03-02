import { chromium } from 'playwright'

let browser = null

const SCROLL_PAUSE = 800
const MAX_SCROLLS = 50

export const CITIES = {
  moscow:          { name: 'Москва',            id: 213, slug: 'moscow' },
  spb:             { name: 'Санкт-Петербург',   id: 2,   slug: 'saint-petersburg' },
  novosibirsk:     { name: 'Новосибирск',       id: 65,  slug: 'novosibirsk' },
  yekaterinburg:   { name: 'Екатеринбург',      id: 54,  slug: 'yekaterinburg' },
  kazan:           { name: 'Казань',            id: 43,  slug: 'kazan' },
  // nizhny_novgorod: { name: 'Нижний Новгород',   id: 47,  slug: 'nizhny_novgorod' },
  // chelyabinsk:     { name: 'Челябинск',         id: 56,  slug: 'chelyabinsk' },
  // samara:          { name: 'Самара',            id: 51,  slug: 'samara' },
  // omsk:            { name: 'Омск',              id: 66,  slug: 'omsk' },
  rostov:          { name: 'Ростов-на-Дону',    id: 39,  slug: 'rostov-na-donu' },
  // ufa:             { name: 'Уфа',              id: 172, slug: 'ufa' },
  // krasnoyarsk:     { name: 'Красноярск',        id: 62,  slug: 'krasnoyarsk' },
  // voronezh:        { name: 'Воронеж',           id: 193, slug: 'voronezh' },
  // perm:            { name: 'Пермь',             id: 50,  slug: 'perm' },
  // volgograd:       { name: 'Волгоград',         id: 38,  slug: 'volgograd' },
  krasnodar:       { name: 'Краснодар',         id: 35,  slug: 'krasnodar' },
  sochi:           { name: 'Сочи',              id: 239, slug: 'sochi' },
  stavropol:       { name: 'Ставрополь',        id: 36,  slug: 'stavropol' },
  // tyumen:          { name: 'Тюмень',            id: 55,  slug: 'tyumen' },
  // vladivostok:     { name: 'Владивосток',       id: 75,  slug: 'vladivostok' },
  // irkutsk:         { name: 'Иркутск',           id: 63,  slug: 'irkutsk' },
  // kaliningrad:     { name: 'Калининград',       id: 22,  slug: 'kaliningrad' },
  // tomsk:           { name: 'Томск',             id: 67,  slug: 'tomsk' },
}

export async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--window-size=1280,900'],
    })
  }
  return browser
}

export async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {})
    browser = null
  }
}

function extractItem(raw) {
  return {
    name: raw.title || '',
    phones: (raw.phones || []).map(p => p.value || p.number || '').filter(Boolean).join(', '),
    address: raw.address || '',
    categories: (raw.subtitleItems || [])
      .filter(s => s.type === 'category')
      .map(s => s.text)
      .join(', '),
  }
}

export function parseItems(html) {
  const idx = html.indexOf('{"config"')
  if (idx === -1) return null
  const endIdx = html.indexOf('</script>', idx)
  if (endIdx === -1) return null

  try {
    const data = JSON.parse(html.substring(idx, endIdx))
    const results = data.stack?.[0]?.results
    if (!results?.items) return null

    return {
      items: results.items.map(extractItem),
      total: results.totalResultCount || results.items.length,
    }
  } catch {
    return null
  }
}

function parseAjaxResponse(json) {
  const items = []

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj.items)) {
      for (const raw of obj.items) {
        if (raw.title) items.push(extractItem(raw))
      }
    }
    if (obj.results) walk(obj.results)
    if (obj.data) walk(obj.data)
    if (Array.isArray(obj.stack)) obj.stack.forEach(walk)
  }

  walk(json)
  return items
}

async function scrollAndCollect(page, collected, onProgress) {
  let prevSize = collected.size
  let staleRounds = 0

  for (let i = 0; i < MAX_SCROLLS; i++) {
    await page.evaluate(() => {
      const el = document.querySelector('.scroll__container') ||
                 document.querySelector('[class*="searchList"]') ||
                 document.querySelector('[class*="scroll"]')
      if (el) el.scrollTop += 600
    })
    await page.waitForTimeout(SCROLL_PAUSE)

    if (collected.size === prevSize) {
      staleRounds++
      if (staleRounds >= 3) break
    } else {
      onProgress?.('scrolling', collected.size)
      staleRounds = 0
      prevSize = collected.size
    }
  }
}

function buildUrl(query, city) {
  const searchText = `${city.name} ${query}`
  return `https://yandex.ru/maps/${city.id}/${city.slug}/search/${encodeURIComponent(searchText)}`
}

function dedupeKey(item) {
  return `${item.name}||${item.address}`
}

export async function scrapeQuery(query, cityKey, { onProgress } = {}) {
  const city = CITIES[cityKey]
  if (!city) throw new Error(`Неизвестный город: ${cityKey}`)

  const bro = await getBrowser()
  const context = await bro.newContext({
    locale: 'ru-RU',
    viewport: { width: 1280, height: 900 },
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })

  const collected = new Map()

  try {
    const page = await context.newPage()

    page.on('response', async (response) => {
      const url = response.url()
      if (!url.includes('/maps/api/') && !url.includes('/search/')) return
      if (response.status() !== 200) return
      try {
        const json = await response.json()
        for (const it of parseAjaxResponse(json)) {
          if (it.name) collected.set(dedupeKey(it), it)
        }
      } catch {}
    })

    await page.goto(buildUrl(query, city), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await page.waitForTimeout(2000)

    const html = await page.content()
    if (html.includes('Вы не робот') || html.includes('SmartCaptcha')) {
      onProgress?.('captcha')
      try {
        await page.waitForSelector('a[href*="/org/"]', { timeout: 300000 })
        await page.waitForTimeout(2000)
      } catch {
        await page.close()
        return []
      }
    }

    const freshHtml = await page.content()
    const initial = parseItems(freshHtml)
    if (!initial || initial.items.length === 0) {
      await page.close()
      return []
    }

    for (const it of initial.items) {
      if (it.name) collected.set(dedupeKey(it), it)
    }

    if (initial.total > initial.items.length) {
      onProgress?.('scrolling', collected.size, initial.total)
      await scrollAndCollect(page, collected, onProgress)
    }

    await page.close()

    const results = [...collected.values()]
    onProgress?.('done', results.length)
    return results
  } finally {
    await context.close()
  }
}

process.on('SIGINT', closeBrowser)
process.on('SIGTERM', closeBrowser)
