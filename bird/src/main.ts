import { BUY_URL, CA, shortCa } from './ca.ts'
import { Game } from './game.ts'
import { QUESTS, type Costume } from './hunt.ts'
import './styles.css'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const huntPanel = document.querySelector<HTMLElement>('#hunt')
const claimPanel = document.querySelector<HTMLElement>('#claim')
const questsEl = document.querySelector<HTMLElement>('#quests')
const pointsEl = document.querySelector<HTMLElement>('#points')
const medalsEl = document.querySelector<HTMLElement>('#medals')
const skinsEl = document.querySelector<HTMLElement>('#skins')
const huntBtn = document.querySelector<HTMLButtonElement>('#open-hunt')
const closeBtn = document.querySelector<HTMLButtonElement>('#close-hunt')
const claimBtn = document.querySelector<HTMLButtonElement>('#open-claim')
const closeClaim = document.querySelector<HTMLButtonElement>('#close-claim')
const doClaim = document.querySelector<HTMLButtonElement>('#do-claim')
const bankEl = document.querySelector<HTMLElement>('#bank')
const streakEl = document.querySelector<HTMLElement>('#streak')
const dailyEl = document.querySelector<HTMLElement>('#daily')
const availEl = document.querySelector<HTMLElement>('#claim-avail')
const doneEl = document.querySelector<HTMLElement>('#claim-done')
const copyCaBtn = document.querySelector<HTMLButtonElement>('#copy-ca')
const copyCaClaim = document.querySelector<HTMLButtonElement>('#copy-ca-claim')
const buyLink = document.querySelector<HTMLAnchorElement>('#buy')

if (
  !canvas ||
  !huntPanel ||
  !claimPanel ||
  !questsEl ||
  !pointsEl ||
  !medalsEl ||
  !skinsEl ||
  !huntBtn ||
  !closeBtn ||
  !claimBtn ||
  !closeClaim ||
  !doClaim ||
  !bankEl ||
  !streakEl ||
  !dailyEl ||
  !availEl ||
  !doneEl ||
  !copyCaBtn ||
  !copyCaClaim ||
  !buyLink
) {
  throw new Error('missing ui')
}

const huntRoot = huntPanel
const claimRoot = claimPanel
const questList = questsEl
const pointsLabel = pointsEl
const medalList = medalsEl
const skinRow = skinsEl
const bankLabel = bankEl
const streakLabel = streakEl
const dailyRow = dailyEl
const availLabel = availEl
const doneLabel = doneEl
const claimAction = doClaim
const caBtn = copyCaBtn
const caClaimBtn = copyCaClaim
const buy = buyLink
buy.href = BUY_URL
caBtn.textContent = `CA ${shortCa()}`
caClaimBtn.textContent = `Copy CA ${shortCa()}`

async function copyCa(btn: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(CA)
    const prev = btn.textContent
    btn.textContent = 'Copied'
    setTimeout(() => {
      btn.textContent = prev
    }, 1200)
  } catch {
    return
  }
}

const game = new Game(canvas)
game.onHunt = renderHunt

function overlayOpen() {
  return !huntRoot.hidden || !claimRoot.hidden
}

function renderHunt() {
  const { hunt } = game
  const pts = hunt.points.toLocaleString()
  pointsLabel.textContent = pts
  bankLabel.textContent = pts
  streakLabel.textContent = String(hunt.streak)
  availLabel.textContent = pts
  doneLabel.textContent = hunt.claimed.toLocaleString()
  claimAction.disabled = hunt.points <= 0
  questList.innerHTML = QUESTS.map((q) => {
    const done = hunt.done.includes(q.id)
    return `<li class="${done ? 'done' : ''}"><b>${q.label}</b> <span>+${q.pts}</span></li>`
  }).join('')
  dailyRow.innerHTML = QUESTS.slice(0, 4)
    .map((q) => {
      const done = hunt.done.includes(q.id)
      return `<article class="punch ${done ? 'done' : ''}"><small>Daily set</small><b>${q.label}</b><span>+${q.pts} points</span></article>`
    })
    .join('')
  medalList.innerHTML = hunt.medals.length
    ? hunt.medals.map((m) => `<li>${m}</li>`).join('')
    : '<li>skim hawks · hug the sun · finish a desert nest</li>'
  const skins: { id: Costume; label: string }[] = [
    { id: 'classic', label: 'Classic' },
    { id: 'gold', label: 'Gold · 20 worms' },
    { id: 'night', label: 'Night · level 4' },
    { id: 'rewards', label: 'Rewards · 2 nests' },
  ]
  skinRow.innerHTML = skins
    .map((s) => {
      const open = hunt.unlocked.includes(s.id)
      const on = hunt.costume === s.id
      return `<button type="button" data-skin="${s.id}" ${open ? '' : 'disabled'} class="${on ? 'on' : ''}">${s.label}</button>`
    })
    .join('')
}

function setHunt(open: boolean) {
  huntRoot.hidden = !open
  if (open) claimRoot.hidden = true
  game.paused = overlayOpen()
  if (open) renderHunt()
}

function setClaim(open: boolean) {
  claimRoot.hidden = !open
  if (open) huntRoot.hidden = true
  game.paused = overlayOpen()
  if (open) renderHunt()
}

huntBtn.addEventListener('click', () => {
  renderHunt()
  setHunt(true)
})
closeBtn.addEventListener('click', () => setHunt(false))
claimBtn.addEventListener('click', () => {
  renderHunt()
  setClaim(true)
})
closeClaim.addEventListener('click', () => setClaim(false))
caBtn.addEventListener('click', () => void copyCa(caBtn))
caClaimBtn.addEventListener('click', () => void copyCa(caClaimBtn))
claimAction.addEventListener('click', () => {
  game.claim()
  renderHunt()
})
skinRow.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest('button')
  const id = btn?.dataset.skin as Costume | undefined
  if (!id) return
  game.setCostume(id)
  renderHunt()
})

canvas.addEventListener('pointerdown', (ev) => {
  if (overlayOpen()) return
  ev.preventDefault()
  game.tapDown()
})
addEventListener('pointerup', () => game.tapUp())
addEventListener('pointercancel', () => game.tapUp())
addEventListener('keydown', (ev) => {
  if (ev.repeat) return
  if (ev.code === 'Space' || ev.code === 'ArrowUp') {
    ev.preventDefault()
    if (overlayOpen()) return
    game.tapDown()
  }
})
addEventListener('keyup', (ev) => {
  if (ev.code === 'Space' || ev.code === 'ArrowUp') {
    ev.preventDefault()
    game.tapUp()
  }
})

renderHunt()
game.tick(performance.now())
