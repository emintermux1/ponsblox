# Let’s Arc

Reply `@letslauncharc $TICKER Coin Name` to any X post. The worker launches a real token on [Argus](https://argus.world) (Arc mainnet, chain 5042) through Portal #7 and replies with the live token URL.

This is not a mock. Launches are wallet-signed `portal.launch(...)` transactions against the production Argus portal.

## Architecture

- **Vercel (Next.js)** — private admin dashboard, health API, optional X Account Activity webhook
- **Persistent worker** — `npm run worker` (local or any always-on host). Polls mention timeline every 2s, or uses the X filtered stream when a bearer token can subscribe
- **PostgreSQL** — idempotency on `trigger_tweet_id` (UNIQUE)

Do not run the signer on Vercel. `LAUNCHER_PRIVATE_KEY` stays on the worker.

## Command format

```
@letslauncharc $TICKER Coin Name
```

Must be a **reply** to another post. Parsing is deterministic (no LLM).

## Run

```bash
cd letsarc
cp .env.example .env
npm install
npm run probe          # live Argus/Arc checks, no wallet required
npm run worker         # X + launches
npm run web:dev        # admin on :3017
```

## Admin retry

Retry is allowed only when status is `FAILED` and `transaction_hash` is empty. If a hash exists, the worker reconciles that transaction instead of sending another.
