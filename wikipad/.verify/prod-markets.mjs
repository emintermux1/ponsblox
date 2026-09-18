import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
await page.goto('https://wikipad.family/markets?v=restore', { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.waitForSelector('h1', { timeout: 20000 })
await page.waitForTimeout(3000)
const text = await page.locator('#root').innerText()
console.log(text.slice(0, 2200))
console.log('DUMP', /HTTP request failed|eth_call|JSON-RPC|ContractCall/i.test(text))
console.log('OFFICIAL', /\$WIKIPAD/.test(text))
console.log('ROBINHOOD', /Robin Hood/.test(text))
console.log('HITLER', /Adolf Hitler/.test(text))
console.log('VLAD', /Vlad Tenev|MASTER/.test(text))
await browser.close()
