import { chromium } from 'playwright'
import { resolve } from 'node:path'

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:5186/', { waitUntil: 'networkidle' })
await page.waitForSelector('.wordmark')
const recent = await page.locator('h2').filter({ hasText: 'Recently Launched' }).locator('xpath=following-sibling::*[1]').innerText()
console.log('RECENT', recent.slice(0, 280))
console.log('HAS_GITPAD', /GITPAD/i.test(recent))
await page.screenshot({ path: resolve(import.meta.dirname, 'home-after.png'), fullPage: true })
await browser.close()
