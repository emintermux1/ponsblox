# LAUNCHER

The launchpad to launch your launchpads.

- Studio: `http://localhost:5190/`
- Tenant preview: `http://localhost:5190/p/{slug}`
- Production: `https://launcher-lyart.vercel.app`
- Apex: `https://launcher.family` (DNS/certs propagating)
- Tenant: `https://{slug}.launcher.family`

Robinhood launches go through Pons V2. Arc uses our bonding pad on official testnet until Circle publishes mainnet RPC.

LAUNCHER token is live on Arc testnet: `0x6068D35dADD947Cab962B2f3FA7020C263B70e3b` — https://testnet.arcscan.app/address/0x6068D35dADD947Cab962B2f3FA7020C263B70e3b

```
npm run dev:launcher
npm run check -w @ponsblox/launcher
npm test -w @ponsblox/launcher
npm run test:contracts -w @ponsblox/launcher
```

## Contracts

Internally reviewed. Not an independent audit.

Foundry tests live in `contracts/test/`. This Windows box blocks `forge.exe` (Device Guard). The same cases run through Hardhat (`hh-test/launcher.spec.cjs`). CI runs Foundry.

```
forge install foundry-rs/forge-std --no-commit
forge test
```

Robinhood deploy (prints addresses; do not invent them):

```
CHAIN=robinhood node scripts/deploy.mjs
```

Arc testnet:

```
CHAIN=arc node scripts/deploy.mjs
```

Robinhood factory is live: `0x97a23452EB9FaB5D0e886335B3D7E098D906F3c9`.
Arc testnet factory is live: `0x7800BBDb5253f6fC4BCbe7B88C8745a62eD6cCcb`.
