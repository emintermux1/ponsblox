import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const out = resolve(import.meta.dirname)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text())
})

await page.goto('http://localhost:5186/', { waitUntil: 'networkidle' })
await page.waitForSelector('.wordmark')
await page.screenshot({ path: resolve(out, 'home.png'), fullPage: true })
const homeText = await page.locator('main').innerText()
console.log('HOME_HAS_TAGLINE', homeText.includes('Every page is now a market.'))
console.log('HOME_HAS_SEARCH', await page.locator('input[aria-label="Search Wikipedia"]').count())
console.log('HOME_TRENDING', await page.locator('.topic-card').count())

await page.fill('input[aria-label="Search Wikipedia"]', 'Internet')
await page.waitForSelector('.search-hit')
await page.screenshot({ path: resolve(out, 'search.png'), fullPage: true })
const hitTitles = await page.locator('.search-hit strong').allTextContents()
console.log('SEARCH_HITS', hitTitles.slice(0, 5).join(' | '))

await page.locator('.search-hit', { hasText: 'Internet' }).first().click()
await page.waitForURL('**/wiki/**')
await page.waitForSelector('.infobox')
await page.screenshot({ path: resolve(out, 'topic.png'), fullPage: true })
const topic = await page.locator('main').innerText()
console.log('TOPIC_TITLE', await page.locator('.firstHeading').innerText())
console.log('TOPIC_HAS_QID', topic.includes('Q75') || topic.includes('Wikidata'))
console.log('TOPIC_HAS_VIEWS', /24H views/i.test(topic))
console.log('TOPIC_INDEX', (await page.locator('.infobox').innerText()).replace(/\s+/g, ' ').slice(0, 240))

await page.getByRole('link', { name: 'Pair & Launch' }).first().click()
await page.waitForURL('**/launch/**')
await page.waitForSelector('.verify, .toc')
if (await page.locator('.verify').count()) {
  await page.getByRole('button', { name: 'Continue' }).click()
}
await page.waitForSelector('input')
await page.screenshot({ path: resolve(out, 'launch-ticker.png'), fullPage: true })

for (const label of ['Continue', 'Continue', 'Continue']) {
  const btn = page.getByRole('button', { name: label })
  if (await btn.count()) await btn.click()
  await page.waitForTimeout(200)
}
await page.screenshot({ path: resolve(out, 'launch-preview.png'), fullPage: true })
const launchText = await page.locator('main').innerText()
console.log('LAUNCH_HAS_CONNECT', /Connect wallet to launch|Launch on Pons V2/i.test(launchText))
console.log('LAUNCH_HAS_METADATA', launchText.includes('wikipedia_page_id') || launchText.includes('pageid'))
console.log('LAUNCH_HAS_Q75', launchText.includes('Q75'))
console.log('URL', page.url())

await browser.close()
