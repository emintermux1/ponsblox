# LAUNCHER contracts

Internally reviewed. Not an independent audit.

Robinhood pads sit **beside** Pons V2 (`0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e`).
Users still call `launchToken` themselves (`canLaunch` is per-wallet), then `linkToken`.

Arc uses `ArcBondingPad` on official testnet (chain 5042002). Do not set a mainnet factory until Circle publishes RPC.

## Deploy order

1. `LauncherRegistry(admin)`
2. `ArcBondingPad()` (Arc only; on Robinhood pass `address(0)`)
3. `LauncherPadFactory(admin, registry, ponsOrZero, bondingOrZero)`
4. `registry.setFactory(factory)`
5. `LauncherFeeRouter(admin)`

Robinhood 4663 is live:

```
VITE_LAUNCHER_FACTORY=0x97a23452EB9FaB5D0e886335B3D7E098D906F3c9
VITE_LAUNCHER_REGISTRY=0xc801579C373832BAB4F2cB9c90d3582E3927938E
VITE_LAUNCHER_FEE_ROUTER=0x08e2f7dd349d1FA8802fa658c4C3C2ec9FD9B98E
```

LAUNCHER token is live on Arc testnet: `0x6068D35dADD947Cab962B2f3FA7020C263B70e3b`.

Arc testnet stays empty until that deploy prints addresses.
