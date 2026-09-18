import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('https://redditpad.family/launch?v=space', { waitUntil: 'networkidle' })
const result = await page.evaluate(() => {
  const body = getComputedStyle(document.body)
  const h1 = document.querySelector('h1')
  const h1s = h1 ? getComputedStyle(h1) : null
  function spacePx(el) {
    if (!el) return null
    const cs = getComputedStyle(el)
    const mk = (t) => {
      const s = document.createElement('span')
      s.style.cssText = `font:${cs.font};letter-spacing:${cs.letterSpacing};word-spacing:${cs.wordSpacing};visibility:hidden;position:absolute`
      s.textContent = t
      document.body.appendChild(s)
      const w = s.getBoundingClientRect().width
      s.remove()
      return w
    }
    return Number((mk('x x') - mk('xx')).toFixed(3))
  }
  return {
    href: location.href,
    bodyFont: body.fontFamily,
    bodyLetter: body.letterSpacing,
    bodyWord: body.wordSpacing,
    bodySize: body.fontSize,
    h1Text: h1?.textContent ?? null,
    h1Font: h1s?.fontFamily ?? null,
    h1Letter: h1s?.letterSpacing ?? null,
    h1Word: h1s?.wordSpacing ?? null,
    h1Size: h1s?.fontSize ?? null,
    bodySpacePx: spacePx(document.body),
    h1SpacePx: spacePx(h1),
    faces: [...document.fonts].slice(0, 12).map((f) => `${f.family} ${f.weight} ${f.status}`),
  }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
