# Muse Grok

The living penthouse at [musegrok.world](https://musegrok.world). Four official fluffy Muse mascots — Pip, Tape, Sable, Halo — scroll, trade, research, and chill. Muse is the brain. Grok is a tool they call — not the owner.

This site is a **sender / bridge**. It can wake Grok Bot and accept a later ingest POST. It has **no public Grok session API**. There is **no official Bot → site event stream**.

```
cd muse-world
npm install
cp .env.example .env.local
# paste values locally — never commit .env or .env.local
npm run dev
```

Open http://localhost:3000 — production is https://musegrok.world

## Owner setup

Do this on your machine. Do not paste secrets into git, chat, or this repo.

1. **Grok Bot webhook.** Open Grok Bot → Routines → webhook. Copy the POST URL and Bearer key into `.env.local` as `GROK_BOT_WEBHOOK_URL` and `GROK_BOT_WEBHOOK_KEY`.
2. **Ingest secret.** Create a long random value and set `GROK_INGEST_SECRET` in `.env.local`. The Bot must send it as `x-muse-ingest` when it POSTs `/api/grok/ingest`. If this name is unset, the ingest route does not reject callers — set it.
3. **Public URL.** Set `NEXT_PUBLIC_APP_URL` to the origin the Bot should call (`http://localhost:3000` locally, `https://musegrok.world` in production). Give the Bot `public/grok-bot.md` (served at `/grok-bot.md`).
4. **Cursor GitHub App.** Grant the Cursor GitHub App access to this repo so the Bot can write code when a routine asks it to.
5. **Optional xAI.** Paste `XAI_API_KEY` if you want a fast Chat Completions call to `api.x.ai`. That is **not** the Grok Bot app.
6. **Paste-list names.** Other names in `.env.example` are unused keys so you can paste the same local values. Muse Grok does not read most of them yet. Never commit values.
7. Slack (if you use it) stays on the owner’s Slack. This site is not a Slack listener.

## SIM vs REAL

The adapter source is the only honest label. **Never treat a line as a live Grok reply unless that source is REAL** (`xai` from xAI, or `bot` after a successful ingest). A webhook 200 is not a reply.

| Surface | SIM | REAL |
| --- | --- | --- |
| Room, camera, Muse loops | Always in the browser. No prompt required. | — |
| Market pulse (`lib/adapters/market.ts`) | Fetch fail or timeout → `source: "sim"`. Room keeps moving and does not pretend Gecko answered. | GeckoTerminal Solana trending → `source: "gecko"`. |
| Grok wake (`lib/adapters/grok.ts` → `wakeGrokBot`) | Missing `GROK_BOT_WEBHOOK_URL` or `GROK_BOT_WEBHOOK_KEY` → `source: "sim"`, text `no Grok key — SIM context only`. | POST webhook with Bearer / `X-Automation-Key`. HTTP 200 means a **run started**. Adapter then returns `source: "bot"` with `Grok Bot woken — waiting on ingest`. That is a wake ack, **not** a Grok completion. |
| Optional xAI (`askXai`) | No `XAI_API_KEY` or non-OK / empty body → skipped. | Chat Completions at `XAI_API_URL` (default `https://api.x.ai/v1`) → `source: "xai"`. Labeled separately from the Bot app. |
| Grok Bot completion | There is no stream to poll. Nothing arrives unless the Bot POSTs. | Bot `POST /api/grok/ingest` with `x-muse-ingest` (or `Authorization: Bearer`) → in-memory `GROK_RESPONSE` with `source: "bot"`. This is the only Bot text that is REAL. |
| Desk fills / execution | Simulated activity. This app does not place trades. | Not wired here. Do not invent fills. |

`GrokSource` in `types/world.ts` is `"bot" | "xai" | "sim"`.

## No Bot → site event stream

Grok Bot has **no public session API**. xAI and the Bot app do not push tokens, tool calls, or routine logs into this site.

What exists instead:

- **Out:** `POST /api/grok/wake` (and the sim loop in `lib/sim/loop.ts`) call `askGrok` in `lib/adapters/grok.ts`, which may POST your webhook.
- **In:** the Bot must `POST /api/grok/ingest` when it finishes. Skill text: `public/grok-bot.md`.
- **Site poll:** `GET /api/events` ticks the in-memory world and sometimes wakes Grok. That is **this app’s** poll, not an official Grok feed.
- **Browser:** `components/world/use-living-world.ts` keeps the loft alive locally and merges new server event ids when a poll returns them.

World state lives in process memory (`lib/world/store.ts`). On Vercel, ingest on one instance may not be visible to `/api/events` on another. That is a host limit, not a hidden Grok stream.

## Env contract

Names only — see `.env.example`. Paste values into `.env.local` (gitignored). **Never commit `.env`, `.env.local`, or secret values.**

**This app reads today**

| Name | Role |
| --- | --- |
| `GROK_BOT_WEBHOOK_URL` | Routine webhook URL |
| `GROK_BOT_WEBHOOK_KEY` | Bearer / `X-Automation-Key` |
| `GROK_INGEST_SECRET` | Shared secret for `/api/grok/ingest` |
| `XAI_API_KEY` | Optional xAI Chat Completions |
| `XAI_API_URL` | Optional; adapter defaults to `https://api.x.ai/v1` |
| `NEXT_PUBLIC_APP_URL` | Origin printed for the Bot ingest URL. Production example: `https://musegrok.world` |

**Copied names (paste locally; unused by Muse Grok adapters)**

From musefomo: `HELIUS_API_KEY`, `HELIUS_WEBHOOK_SECRET`, `PRIVY_APP_ID`, `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_JWKS_URL`, `PRIVY_AUTHORIZATION_PRIVATE_KEY`, `PRIVY_AUTHORIZATION_KEY_ID`, `DFLOW_API_KEY`, `BIRDEYE_API_KEY`, `GMGN_API_KEY`, `SOLSCAN_API_KEY`, `FOMOSCAN_API_KEY`, `FOMOSCAN_API_URL`, `BLOCKSCOUT_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIAL_PEPPER`.

From indexpad: `INDEXPAD_API_BASE`, `INDEXPAD_API_KEY`, `PINATA_JWT`, `PONS_API_BASE`, `PONS_API_KEY`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_PONS_FACTORY`, `NEXT_PUBLIC_PONS_LAUNCH_AND_BUY`, `NEXT_PUBLIC_PONS_LAUNCH_CONFIG_ID`, `NEXT_PUBLIC_PONS_PAIR`, `NEXT_PUBLIC_ROBINHOOD_CHAIN_ID`, `NEXT_PUBLIC_ROBINHOOD_RPC`, `NEXT_PUBLIC_ROBINHOOD_EXPLORER`.

From longer: `PINATA_JWT`, `NEXT_PUBLIC_PONS_FACTORY`, `NEXT_PUBLIC_PONS_LAUNCH_AND_BUY`, `NEXT_PUBLIC_ROBINHOOD_RPC`, `NEXT_PUBLIC_ROBINHOOD_EXPLORER`, `NEXT_PUBLIC_ROBINHOOD_CHAIN_ID`, `NEXT_PUBLIC_NVDA3X_ADDRESS`, `NEXT_PUBLIC_META3X_ADDRESS`, `NEXT_PUBLIC_TSLA3X_ADDRESS`, `NEXT_PUBLIC_AAPL3X_ADDRESS`, `NEXT_PUBLIC_MSFT3X_ADDRESS`.

## Real paths

| Path | What it is |
| --- | --- |
| `lib/adapters/grok.ts` | Wake webhook + optional xAI. Returns `sim` / `bot` (wake ack) / `xai`. |
| `lib/adapters/market.ts` | Public GeckoTerminal. Fail-open `sim`. |
| `app/api/grok/wake/route.ts` | `POST` — Muse asks; calls `askGrok`. |
| `app/api/grok/ingest/route.ts` | `POST` — Bot result. Header `x-muse-ingest`. |
| `app/api/events/route.ts` | `GET` — in-memory world tick. Not a Grok stream. |
| `app/api/market/route.ts` | `GET` — market pulse. |
| `public/grok-bot.md` | Bot skill. Served at `/grok-bot.md`. |

## Deploy

Public host: **https://musegrok.world**. App root: `muse-world`. Framework: Next.js (`vercel.json`).

- **Production env:** paste the Grok names you use locally (`GROK_BOT_WEBHOOK_URL`, `GROK_BOT_WEBHOOK_KEY`, `GROK_INGEST_SECRET`, optional `XAI_API_KEY`, `NEXT_PUBLIC_APP_URL=https://musegrok.world`)
- Do not delete this Vercel project or retarget other domains. A sibling deploy attaches Vercel + `musegrok.world`.

```bash
cd muse-world
npx vercel --name muse-world --yes
```

## Check

```
cd muse-world
npx next typegen
npm run check
```

`next typegen` writes gitignored route types (`LayoutProps`). `tsc --noEmit` is green after that.

## Stack

Next.js 16 · TypeScript · React Three Fiber · Three.js · GSAP easing · Framer Motion HUD
