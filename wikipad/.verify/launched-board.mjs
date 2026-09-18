import { chromium } from 'playwright'

const CA = '0xc6a8840c4946b8a476415048a2cbbe1bc81bf5bb'
const BASE = process.env.WIKIPAD_BASE || 'http://localhost:5186'
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`${BASE}/launched`, { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForSelector('.wikitable, .empty, .err', { timeout: 45000 })
const launched = await page.locator('#root').innerText()
await page.screenshot({ path: 'launched.png', fullPage: true })

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForSelector('text=Recently Launched', { timeout: 20000 })
await page.waitForSelector('.wikitable, .empty', { timeout: 45000 })
const home = await page.locator('#root').innerText()
await page.screenshot({ path: 'home-launched.png', fullPage: true })

const navLaunched = await page.locator('.sidebar a', { hasText: 'Launched' }).getAttribute('href')
const homeLink = await page.locator('a', { hasText: 'All launched markets' }).getAttribute('href')
const buyHref = await page.locator('.wikitable a', { hasText: 'Buy' }).first().getAttribute('href')
await page.locator('.sidebar a', { hasText: 'Launched' }).click()
await page.waitForURL('**/launched')
const afterNav = page.url()

console.log('LAUNCHED_HAS_H1', launched.includes('Launched'))
console.log('LAUNCHED_HAS_CA_SHORT', launched.includes(CA.slice(0, 6)))
console.log('LAUNCHED_HAS_WIKIPAD', launched.includes('WIKIPAD') || launched.includes('WikiPad'))
console.log('LAUNCHED_HAS_BUY', launched.includes('Buy'))
console.log('LAUNCHED_HAS_EMPTY', launched.includes('No WikiPad markets yet'))
console.log('LAUNCHED_HAS_TABLE', launched.includes('Token') && launched.includes('Contract'))
console.log('HOME_HAS_RECENT', home.includes('Recently Launched'))
console.log('HOME_HAS_ALL_LINK', homeLink === '/launched')
console.log('NAV_LAUNCHED', navLaunched)
console.log('BUY_HREF', buyHref)
console.log('NAV_CLICK_URL', afterNav)
console.log('HOME_HAS_TABLE_OR_EMPTY', home.includes('Token') || home.includes('No WikiPad'))
console.log('ERRORS', errors)
await browser.close()
