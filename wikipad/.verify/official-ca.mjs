import { chromium } from 'playwright'

const CA = '0xc6a8840c4946b8a476415048a2cbbe1bc81bf5bb'
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
const failed = []
page.on('pageerror', (e) => errors.push(`pageerror ${e}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console ${m.text()}`)
})
page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText || ''}`))
await page.goto('http://[::1]:5186/', { waitUntil: 'domcontentloaded', timeout: 15000 })
await page.waitForTimeout(2500)
const html = await page.locator('#root').innerHTML()
console.log('ROOT_LEN', html.length)
console.log('ROOT_SNIP', html.slice(0, 1500).replace(/\s+/g, ' '))
console.log('ERRORS')
for (const e of errors) console.log(' -', e)
console.log('FAILED')
for (const e of failed) console.log(' -', e)
console.log('HAS_INFOBOX', html.includes('infobox'))
console.log('HAS_EXACT_CA', html.includes(CA))
console.log('HAS_TICKER', html.includes('$WIKIPAD'))
await browser.close()
