# MUSE WORLD

A living cinematic loft. Four Muse agents scroll, trade, research, and chill. Grok is a tool they call — not the owner.

```
npm install
npm run dev
```

Open http://localhost:3000

## What is real

- **Room / camera / Muse loops** run in the browser. No prompt required.
- **Market pulse** reads public GeckoTerminal Solana trending. If it fails, the room keeps simulating and does not pretend Gecko answered.
- **Grok Bot** is woken only when `GROK_BOT_WEBHOOK_URL` + `GROK_BOT_WEBHOOK_KEY` are set. HTTP 200 means a run started, not that Grok finished.
- **Grok ingest:** the Bot should `POST /api/grok/ingest` with `x-muse-ingest: $GROK_INGEST_SECRET` and `{ "museId": "trader", "summary": "…" }`.
- **xAI Chat** is optional (`XAI_API_KEY`) for a fast tool call. Labeled separately from the Bot app.
- **No fake fills.** Desk activity is simulated until DFlow + a claimed Privy wallet exist.

## Grok Bot setup

1. Open Grok Bot → Routines → webhook. Copy POST URL and Bearer key into `.env.local`.
2. Connect the Cursor GitHub App to this repo so the Bot can write code.
3. Slack listener is optional (owner’s Slack, not this site).

## Keys

Copy names from `.env.example`. Paste values from musefomo / indexpad / longer locally. Never commit secrets.

## Stack

Next.js 16 · TypeScript · React Three Fiber · Three.js · GSAP easing · Framer Motion HUD
