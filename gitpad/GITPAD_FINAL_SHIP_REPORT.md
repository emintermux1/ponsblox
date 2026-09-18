# GitPad final ship report

Internally reviewed. Not an independent security audit. GitPad contracts are not externally audited.

Stack: Vite + React + TypeScript + viem. Port 5177. Env prefix `VITE_*`.

## READY

- Production build passes (`npm run check`, `npm test`, `npm run build`).
- 37 unit/integration tests pass. No tests were disabled.
- Client bundle does not contain `GITHUB_TOKEN`, `PINATA_JWT`, or OAuth secrets.
- Official Pons V2 factory `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` and launch-and-buy `0xe33E9E479dF8802cb0866d5d05258bEc4cF62948` match https://docs.ponsfamily.com/v2 on chain 4663.
- Launch Studio still requires an explicit click to open the wallet. Enter does not deploy. LIVE is reserved for a receipt that contains `TokenLaunched`.
- Existing-token flow refuses invented compatibility (`0x1111…1111` → “Not a Pons V2 launch”).
- Unknown URLs render a 404 instead of the homepage.
- Homepage hierarchy is GitPad → Explore Trending / Launch → Pulse, trending, Be First, live launches.
- Naming is GitPad everywhere. Token display names stay `{Name} By GitLab`.

The product is **not** declared production-ready until the items in `GITPAD_BLOCKERS.md` are cleared. The remaining gaps are configuration and one real signed launch — not unfinished UI.

## FIXED IN FINAL PASS

- Homepage: removed duplicate tape, momentum strip, and “next market” closer. Hero line is `CODE → REPOSITORY → TOKEN`.
- Nav: `Connect` renamed to `Existing` (wallet connect stays in the chrome). Active route is marked.
- 404 page + `parseLocation` no longer treats unknown paths as home.
- Per-route title, description, canonical, Open Graph, and X image tags.
- Error boundary around the app. Skip link and `:focus-visible`.
- GitHub `403` is private/blocked unless the rate-limit remaining header is actually `0`.
- API 500 responses no longer echo raw exception text to the browser.
- Token page: contract address wraps; empty holder/volume charts removed.
- Repository pages surface archived, disabled, fork, and rename (canonical GitHub id).
- Dead unused files removed: `ConnectToken`, `TokenPreview`, `FeeEconomics`, `FeeSplitEditor`, and four unused hooks.
- Vercel headers include CSP. Vite boot warns when `GITHUB_TOKEN` / `PINATA_JWT` are unset and when chain id is not 4663.
- Lime “Live on Pons” glow removed. 320–430px spacing tightened.

## INTEGRATIONS VERIFIED

| Integration | Status |
|---|---|
| Pons V2 factory + `launchToken` / `launchAndBuy` / `TokenLaunched` | Addresses and ABI match official docs. No invented methods. |
| Quote pair | Native ETH (`pairToken` 0x0). |
| GitHub REST | Search, repo dossier, rename redirect, archived/fork flags. Rate-limit vs private distinguished. |
| Wallet (EIP-6963) | Connect / switch chain / reject paths classified. No auto-send. |
| IPFS / Pinata | Honest “not configured” when `PINATA_JWT` is unset. No fake CID. |
| GitHub OAuth claim | Returns configuration error when client id/secret are unset. |
| GitPadFeeRouter / registry | Hidden until `VITE_GITPAD_*` is set after contract deploy. |
| Bitquery market | Holders/volume stay **Unavailable**. |

There is no official Pons HTTP API in the trust path.

## TEST RESULTS

| Check | Result |
|---|---|
| `npm run check` | Pass |
| `npm test` (37) | Pass |
| `npm run build` | Pass (vite 1.33s; main JS 155 kB gzip) |
| ESLint | Not configured. TypeScript is the compile gate. |
| Playwright / browser E2E | Not in the repo. Primary journeys were walked in the Cursor browser against `localhost:5177`. |
| `forge test` | Foundry is not installed on this machine. Router tests live at `contracts/test/GitPadFeeRouter.t.sol`. |

Browser evidence this pass:

- `/` — GitPad, Explore Trending, Launch, Pulse, trending cards from GitHub, Be First, empty live launches.
- `/this-is-not-a-route` — “This path is not on GitPad.” Title `Not found — GitPad`.
- `/launch` through repository → token → fees → review. Enter does not deploy. DEPLOY TOKEN stays disabled without a wallet.
- `/launch?mode=existing` — invalid CA is rejected. Fee routing stays unsupported until a real Pons token and a permitted wallet.

FLOW A could not be completed past Review: no injected wallet in this browser. FLOW B validate works; fee writes require a live router and a permitted recipient. FLOW C stops at OAuth configuration.

## PERFORMANCE NOTES

- Routes other than Home are code-split (`React.lazy`).
- Homepage no longer double-fetches a “rising” list.
- GitHub search/repo reads are cached 3 minutes server-side.
- Indexer scans in 2,000-block chunks with an idempotent processed-key set.
- Avoid new polling loops; Pulse/feed are request-on-load.
- Google fonts still load from fonts.googleapis.com (CSP allows it).

## SECURITY NOTES

- Same-origin check on POST/PUT. Per-route rate limit. Security headers in Vite and Vercel (CSP still allows `'unsafe-eval'` because Vite’s runtime needs it).
- README HTML is escaped before a small markdown subset is rendered.
- Launch analytics reject `wallet` / `address` and store only `{ event, session }`.
- Admin JSON requires `VITE_GITPAD_ADMINS`. Client allowlist is not a secret.
- The Cursor security-review subagent could not compute a git diff in this workspace. This pass was a manual review of `gitpad/` plus the fixes above.
- Do not claim an independent audit.

## KNOWN LIMITATIONS

- File store at `gitpad/.data/store.json`. `DATABASE_URL` / `REDIS_URL` are unused.
- Holder count, volume, and launch block time stay Unavailable without a market indexer.
- Cross-browser (Safari/Firefox/Edge) was not run in this environment — only Chromium in Cursor.
- Share cards never auto-post.

## REQUIRED PRODUCTION SECRETS

See `gitpad/.env.example`. Server-only:

- `GITHUB_TOKEN` — required for production traffic (unauthenticated GitHub 429s).
- `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` / `GITHUB_OAUTH_REDIRECT` — required for claim.
- `PINATA_JWT` — required for IPFS CIDs (https image URLs work without it).
- `BITQUERY_API_KEY` — optional; otherwise holders/volume stay Unavailable.

Public, set after you deploy `gitpad/contracts`:

- `VITE_GITPAD_FACTORY`, `VITE_GITPAD_REGISTRY`, `VITE_GITPAD_FEE_ROUTER`, `VITE_GITPAD_TREASURY`, `VITE_GITPAD_ADMINS`

Pons public addresses may be left empty; the app uses the docs-published factory on 4663.

## DEPLOYMENT STEPS

1. Confirm factory / launch-and-buy / chain 4663 against https://docs.ponsfamily.com/v2
2. Set `GITHUB_TOKEN`. Set OAuth + Pinata if you want claim and IPFS.
3. Deploy GitPad contracts in the order in `contracts/README.md`. Set `VITE_GITPAD_*`.
4. `npm run check && npm test && npm run build` from `gitpad/`
5. `forge install foundry-rs/forge-std && forge test` where Foundry is installed
6. Deploy the Vite app (Vercel rewrites API + SPA). Confirm `/api/health` does not leak secrets.
7. Walk Launch Studio on Robinhood Chain 4663 with a funded wallet. Confirm LIVE only after `TokenLaunched`.
8. Confirm an unsupported existing token shows FEE ROUTING NOT SUPPORTED.
