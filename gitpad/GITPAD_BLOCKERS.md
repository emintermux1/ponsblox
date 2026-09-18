# GitPad launch blockers

Only items that block going live. Not a roadmap.

1. **No signed Pons launch in this environment.** FLOW A stops at Review. There is no connected wallet here, so `launchToken` / `launchAndBuy` has not been confirmed on Robinhood Chain 4663. Do not ship until one real wallet completes Deploy → `TokenLaunched` → token page → Copy CA → Share.

2. **`GITHUB_TOKEN` is required for production GitHub traffic.** Without it, Explore / repository dossiers / Launch Studio resolve hit GitHub 429s. The UI fails honestly; the product will not stay usable under load.

3. **Claim (FLOW C) is off until GitHub OAuth is set.** `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, and `GITHUB_OAUTH_REDIRECT` are unset. The claim button returns a configuration error instead of a fake verify.

4. **On-chain GitPad modules are not deployed.** `VITE_GITPAD_FEE_ROUTER` / registry / factory are empty. FLOW B can validate a Pons CA and attach a repository locally, but it cannot write fee routes or the repository registry until those contracts are published and the env is set.

5. **Foundry tests have not been executed here.** `forge` is not on PATH. Run `forge test` in `gitpad/contracts` before calling the router “ready.”

Clear these five, then the product can go live. Optional keys (`PINATA_JWT`, `BITQUERY_API_KEY`) degrade to Unavailable / https-only metadata and are not launch blockers.
