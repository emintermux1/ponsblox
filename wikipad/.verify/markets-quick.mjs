import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
await page.goto('http://localhost:5186/markets', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForSelector('h1', { timeout: 20000 })
await page.waitForTimeout(2500)
const text = await page.locator('#root').innerText()
await page.screenshot({ path: 'markets.png', fullPage: true })
console.log(text.slice(0, 2500))
console.log('HAS_DUMP', /HTTP request failed|eth_call|JSON-RPC|ContractCall/i.test(text))
console.log('HAS_TABLE', text.includes('Market'))
console.log('HAS_WIKIPAD_MARK', /· WikiPad/.test(text) || text.includes('WikiPad'))
await browser.close()
