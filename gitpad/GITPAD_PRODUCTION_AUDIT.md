# GitPad production audit

Internally reviewed. Not an independent security audit.

Stack: Vite + React + TypeScript + viem. This is not a Next.js app. `VITE_*` is the public prefix. `NEXT_PUBLIC_*` names in generic checklists map to the `VITE_*` keys in `.env.example`.

## COMPLETED

- Isolated Pons layer at `src/lib/pons/` (`client.ts`, `factory.ts`, `abi.ts`, `config.ts`, `types.ts`). The rest of GitPad talks to Pons through that layer.
- Official docs (`https://docs.ponsfamily.com/v2`) now list factory, launch-and-buy, hook, escrow, vault, locker, deployer, and `transferCreatorFeeRecipient`. Those are wired. No invented functions.
- Launch pipeline does not print LIVE until the receipt contains `TokenLaunched`. The token address is taken from that event only.
- Pending launches persist in `localStorage` (`gitpad.pendingLaunch`) so a refresh resumes receipt watch instead of losing the tx.
- Deployment terminal is a dedicated log of real steps. Final screen: name By GitLab, repo, contract, View Token / View Transaction / Share on X.
- Users type `React`. GitPad writes `React By GitLab`. The suffix cannot be edited off.
- Existing-token fee routing: supported only if the connected wallet is the current `creatorFeeRecipient` (`transferCreatorFeeRecipient`) or the recipient is already `GitPadFeeRouter` (`setRoute`). Otherwise: “Fee routing is not supported for this token.”
- GitPadFeeRouter: 10_000 bps, zero-address reject, duplicate recipient reject, reentrancy lock, safe ERC-20 transfer, events on every distribution, no leftover withdraw path. Internally reviewed.
- Registry stores canonical GitHub numeric id when provided. Names are not the unique key.
- IPFS metadata is validated before pin. A CID is shown only after Pinata returns one and the gateway can retrieve it. No invented CID.
- Indexer cursor (`lastBlock` + processed log keys) is idempotent. Reorgs rewind when the chain head is behind the cursor.
- Data source labels: GitHub / ONCHAIN / Market / GitPad calculated. Trend Score is titled as calculated, not onchain.
- Share / Open Graph SVG at `/api/og`.
- Security headers, same-origin POST check, per-route rate limit. Secrets stay server-side.
- Strict TypeScript. `npm run check` and `npm test` pass (14 unit/integration tests).
- Decorative fake zsh terminal replaced with live tape lines. Dead “Community → github.com” link removed.

## REAL INTEGRATIONS

| Integration | Source of truth |
|---|---|
| Pons V2 factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` — docs.ponsfamily.com/v2, chain 4663 |
| Launch and buy | `0xe33E9E479dF8802cb0866d5d05258bEc4cF62948` — same docs |
| Pair token | Native ETH (`pairToken` 0x0) |
| RPC / explorer | Robinhood public RPC + Blockscout |
| GitHub | REST API, server-side, cached |
| IPFS | Pinata `pinFileToIPFS` when `PINATA_JWT` is set |
| Wallet | EIP-6963, user-signed writes only |

There is no official Pons HTTP API in the trust path.

## REMAINING CONFIGURATION

Set these to turn features on. Until then the UI says Unavailable / not configured — it does not fake them.

## SECURITY NOTES

- Users call Pons `launchToken` / `launchAndBuy` from their own wallet. `canLaunch` is per `msg.sender`.
- Creator tax **bps** are immutable after launch. Recipient can change via documented `transferCreatorFeeRecipient`.
- GitPad contracts are **internally reviewed**, not independently audited. Do not claim otherwise.
- Fee router owner can still set routes (explicit admin). There is no silent extra recipient and no arbitrary ERC-20 withdraw.
- CSP in Vite allows `'unsafe-eval'` because the bundler requires it. Production should tighten after a non-Vite deploy if possible.
- HSTS is set on Vercel only, not on localhost.

## CONTRACT ASSUMPTIONS

- Live `TokenParams` includes `bytes32 salt` (docs snippet shows it).
- `LAUNCH_CONFIG_ID` defaults to `0`. The factory layer reads `getLaunchConfig` and refuses a disabled config.
- GitPad module addresses (`VITE_GITPAD_*`) are empty until you deploy `gitpad/contracts`. Local indexing still works.
- Registry `register` now takes `uint64 githubId`. Redeploy if an older revision was already published.

## KNOWN LIMITATIONS

- Holder count and volume stay **Unavailable** unless `BITQUERY_API_KEY` is set. Bitquery is a third party, not a Pons SDK. Not wired as a live feed in this audit.
- 24h / 7d treasury fees stay Unavailable until GitPadFeeRouter is live and distributions are timestamped.
- Full wallet E2E (connect → sign → confirm on 4663) cannot run in CI without a funded test wallet.
- Foundry is not installed in this environment. Router tests live at `contracts/test/GitPadFeeRouter.t.sol` and need `forge install foundry-rs/forge-std && forge test`.
- File store at `gitpad/.data/store.json` — `DATABASE_URL` / `REDIS_URL` are unused.
- SSR / Next.js was not adopted. This remains a Vite SPA with a server API middleware.

## BLOCKED — OFFICIAL CONFIGURATION REQUIRED

- **Independent contract audit** — none exists. Status: internally reviewed.
- **Official Pons market/holders API** — docs say index the factory yourself. Do not invent numbers.
- **Quote pair** — native ETH. GitPad does not launch against other quote tokens.
- **GitHub OAuth claim** — needs `GITHUB_OAUTH_CLIENT_ID` + `GITHUB_OAUTH_CLIENT_SECRET`.
- **IPFS pins** — needs `PINATA_JWT`.
- **On-chain repo registry / fee router** — needs deployed GitPad contracts + `VITE_GITPAD_*`.
- **Foundry execution** — `forge` is not on PATH here.
- **DATABASE_URL / REDIS_URL** — not part of this build.

## ENVIRONMENT VARIABLES REQUIRED

See `gitpad/.env.example`. Server secrets: `GITHUB_TOKEN`, `GITHUB_OAUTH_CLIENT_SECRET`, `PINATA_JWT`, `BITQUERY_API_KEY`. Never commit values.

## DEPLOYMENT CHECKLIST

1. Confirm factory / launch-and-buy / chain id against https://docs.ponsfamily.com/v2
2. Set `GITHUB_TOKEN` (rate limits) and optional OAuth + Pinata keys
3. Deploy GitPad contracts in the order in `contracts/README.md`
4. Set `VITE_GITPAD_*` and `VITE_GITPAD_ADMINS`
5. `npm run check` and `npm test`
6. `forge test` after installing Foundry + forge-std
7. Walk the launch path on Robinhood Chain 4663 with a real wallet
8. Confirm LIVE is shown only after `TokenLaunched` is in the receipt
9. Confirm an unsupported existing token shows fee routing unsupported
10. Confirm `/api/health` does not leak secrets
