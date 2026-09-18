import { chromium } from 'playwright'

const CA = '0xc6a8840c4946b8a476415048a2cbbe1bc81bf5bb'
const BASE = process.env.WIKIPAD_BASE || 'http://localhost:5186'
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
const dumps = []
page.on('pageerror', (e) => dumps.push(String(e)))

async function shot(path, waitMs = 2500) {
  await page.waitForSelector('.wikitable, .empty', { timeout: 20000 })
  await page.waitForTimeout(waitMs)
  const text = await page.locator('#root').innerText()
  await page.screenshot({ path, fullPage: true })
  return text
}

await page.goto(`${BASE}/markets`, { waitUntil: 'domcontentloaded', timeout: 20000 })
const markets = await shot('markets.png', 18000)
await page.goto(`${BASE}/launched`, { waitUntil: 'domcontentloaded', timeout: 20000 })
const launched = await shot('launched.png', 4000)
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForSelector('text=Recently Launched', { timeout: 20000 })
const home = await shot('home-launched.png', 4000)

function report(label, text) {
  const rpcDump = /HTTP request failed|eth_call|JSON-RPC|ContractCall|rpc\.mainnet/i.test(text)
  const rows = (text.match(/WikiPad/g) || []).length
  console.log(label, {
    official: text.includes('WIKIPAD') || text.includes('WikiPad'),
    caShort: text.includes(CA.slice(0, 6)),
    table: text.includes('Market') && text.includes('Page'),
    dump: rpcDump,
    wikiPadMarks: rows,
    robinhood: /ROBINHOOD/i.test(text),
    hitler: /HITLER/i.test(text),
    vlad: /VLAD|Tenev|MASTER/i.test(text),
  })
}

report('MARKETS', markets)
report('LAUNCHED', launched)
report('HOME', home)
console.log('PAGEERRORS', dumps)
await browser.close()
