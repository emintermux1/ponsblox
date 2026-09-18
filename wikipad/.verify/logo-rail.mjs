import { chromium } from 'playwright'
import { resolve } from 'node:path'

const out = resolve(import.meta.dirname)
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
desktop.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await desktop.goto('http://localhost:5186/', { waitUntil: 'networkidle' })
await desktop.waitForSelector('.wordmark img')
await desktop.waitForSelector('.rightrail img')

const rail = desktop.locator('.rightrail')
const brand = desktop.locator('.brandbox')
const wordmark = desktop.locator('.wordmark img')
console.log('DESKTOP_WORDMARK_VISIBLE', await wordmark.isVisible())
console.log('DESKTOP_WORDMARK_SRC', await wordmark.getAttribute('src'))
console.log('DESKTOP_RAIL_VISIBLE', await rail.isVisible())
console.log('DESKTOP_RAIL_DISPLAY', await rail.evaluate((el) => getComputedStyle(el).display))
console.log('DESKTOP_LOGO_SRC', await desktop.locator('.brandbox img').getAttribute('src'))
console.log('DESKTOP_BRAND_W', await brand.evaluate((el) => Math.round(el.getBoundingClientRect().width)))
const railBox = await rail.boundingBox()
const articleBox = await desktop.locator('main.article').boundingBox()
console.log('DESKTOP_RAIL_X', railBox && Math.round(railBox.x))
console.log('DESKTOP_ARTICLE_RIGHT', articleBox && Math.round(articleBox.x + articleBox.width))
console.log('DESKTOP_RAIL_RIGHT_OF_ARTICLE', Boolean(railBox && articleBox && railBox.x >= articleBox.x + articleBox.width - 8))

await desktop.screenshot({ path: resolve(out, 'home-logo-desktop.png') })

await desktop.locator('.sidebar a', { hasText: 'Main page' }).click()
await desktop.waitForSelector('.rightrail img')
console.log('NAV_HOME_RAIL', await rail.isVisible())

await desktop.getByRole('link', { name: 'Launch' }).first().click()
await desktop.waitForURL('**/launch')
console.log('LAUNCH_RAIL', await desktop.locator('.rightrail').isVisible())

await desktop.goto('http://localhost:5186/', { waitUntil: 'domcontentloaded' })
await desktop.fill('input[aria-label="Search Wikipedia"]', 'Internet')
await desktop.waitForSelector('.search-hit')
await desktop.locator('.search-hit', { hasText: 'Internet' }).first().click()
await desktop.waitForURL('**/wiki/**')
await desktop.waitForSelector('.infobox')
const topicRail = await desktop.locator('.rightrail').isVisible()
const infobox = await desktop.locator('.infobox').boundingBox()
const topicMain = await desktop.locator('main').boundingBox()
console.log('TOPIC_RAIL', topicRail)
console.log('TOPIC_INFOBOX', Boolean(infobox))
console.log('TOPIC_MAIN_W', topicMain && Math.round(topicMain.width))
await desktop.screenshot({ path: resolve(out, 'topic-logo-desktop.png') })

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto('http://localhost:5186/', { waitUntil: 'networkidle' })
await mobile.waitForSelector('.wordmark img')
console.log('MOBILE_WORDMARK', await mobile.locator('.wordmark img').isVisible())
console.log('MOBILE_RAIL_VISIBLE', await mobile.locator('.rightrail').isVisible())
console.log('MOBILE_RAIL_DISPLAY', await mobile.locator('.rightrail').evaluate((el) => getComputedStyle(el).display))
const mainW = await mobile.locator('main').evaluate((el) => Math.round(el.getBoundingClientRect().width))
console.log('MOBILE_MAIN_W', mainW)
await mobile.screenshot({ path: resolve(out, 'home-logo-mobile.png') })

await browser.close()
