import { chromium } from 'playwright'
import { resolve } from 'node:path'

const BASE = 'https://wikipad.family'
const out = resolve(import.meta.dirname)
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))

function dumpish(text) {
  return /eth_call|HTTP request failed|rpc\.mainnet|viem|Request body/i.test(text)
}

await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForSelector('.topic-card', { timeout: 30_000 })
const home = await page.locator('main').innerText()
console.log('HOME_VIRAL', home.includes('Viral topics'))
console.log('HOME_WRITER_FEES', home.includes('Fees go to the page writer.'))
console.log('HOME_DUMP', dumpish(home))
console.log('HOME_CARDS', await page.locator('.topic-card').count())
console.log('HOME_WIKIPAD_TAG', (await page.locator('.product-tag').count()) > 0)
await page.screenshot({ path: resolve(out, 'prod-home.png'), fullPage: true })

await page.goto(`${BASE}/wiki/Internet`, { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForSelector('.firstHeading', { timeout: 30_000 })
await page.waitForTimeout(2500)
const topic = await page.locator('main').innerText()
console.log('TOPIC_TITLE', await page.locator('.firstHeading').innerText())
console.log('TOPIC_WRITER_HEAD', topic.includes('Page writer'))
console.log('TOPIC_WRITER_NAME', /Pancho507/.test(topic))
console.log('TOPIC_FEES', topic.includes('Fees go to the page writer.'))
console.log('TOPIC_RESERVED', topic.includes('Fees reserved for this writer'))
console.log('TOPIC_DUMP', dumpish(topic))
await page.screenshot({ path: resolve(out, 'prod-topic.png'), fullPage: true })

await page.goto(`${BASE}/launch/Internet`, { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForSelector('.toc', { timeout: 30_000 })
await page.waitForTimeout(2500)
let launch = await page.locator('main').innerText()
console.log('LAUNCH_VERIFY', launch.includes('Page writer') || launch.includes('Pancho507'))
console.log('LAUNCH_DUMP', dumpish(launch))
if (await page.getByRole('button', { name: 'Continue' }).count()) {
  for (let i = 0; i < 5; i++) {
    const btn = page.getByRole('button', { name: 'Continue' })
    if (!(await btn.count()) || await btn.isDisabled()) break
    await btn.click()
    await page.waitForTimeout(250)
  }
}
launch = await page.locator('main').innerText()
console.log('LAUNCH_PREVIEW_WRITER', launch.includes('Page writer') || launch.includes('Pancho507'))
console.log('LAUNCH_PREVIEW_META', launch.includes('editorName') && launch.includes('editorFeeTo'))
console.log('LAUNCH_PREVIEW_DUMP', dumpish(launch))
console.log('LAUNCH_CONNECT', /Connect wallet to launch|Launch on Pons V2/i.test(launch))
await page.screenshot({ path: resolve(out, 'prod-launch.png'), fullPage: true })

await page.goto(`${BASE}/markets`, { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForSelector('.wikitable, .empty, .rpc-notice', { timeout: 30_000 })
await page.waitForTimeout(1500)
const markets = await page.locator('main').innerText()
console.log('MARKETS_WIKIPAD_FIRST', markets.includes('$WIKIPAD'))
console.log('MARKETS_TAG_COUNT', await page.locator('.product-tag').count())
console.log('MARKETS_ROWS', await page.locator('.wikitable tbody tr').count())
console.log('MARKETS_DUMP', dumpish(markets))
await page.screenshot({ path: resolve(out, 'prod-markets.png'), fullPage: true })

await browser.close()
