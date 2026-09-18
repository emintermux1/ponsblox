# GitPad onchain modules

Robinhood Chain (4663). These contracts sit **beside** the live Pons V2 factory.
They do not replace it.

## Addresses you already have

- Pons V2 factory: `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e`
- Pons launch-and-buy: `0xe33E9E479dF8802cb0866d5d05258bEc4cF62948`
- Quote pair: native ETH (`pairToken` 0x0)

## Why users still call Pons directly

`canLaunch(address)` is evaluated for `msg.sender`. A wrapper that called
`launchToken` would need the *factory* to be allowlisted, not the creator.
GitPad therefore:

1. User wallet → Pons `launchToken` / `launchAndBuy`
2. User wallet → `GitPadFactory.linkRepository`

## Deploy order

1. `PonsV2Adapter(ponsFactory)`
2. `GitPadRepositoryRegistry(owner)`
3. `GitPadMetadataRegistry(owner)`
4. `GitPadFactory(owner, adapter, registry, metadata)`
5. `GitPadFeeRouter(owner, adapter)`
6. `registry.setRegistrar(gitPadFactory)`
7. `metadata.setWriter(gitPadFactory)`

Then set on the site:

```
VITE_GITPAD_ADAPTER=
VITE_GITPAD_REGISTRY=
VITE_GITPAD_METADATA=
VITE_GITPAD_FACTORY=
VITE_GITPAD_FEE_ROUTER=
```

Until those are set, the UI still launches on Pons and keeps the repo map locally.
It will not pretend the GitPad contracts exist.

## Fee routing honesty

Pons documents `transferCreatorFeeRecipient(token, newRecipient)`, callable
only by the **current** creator fee recipient. GitPad uses that — and only
that — to move an existing token onto `GitPadFeeRouter`. If the connected
wallet is not the recipient and the recipient is not already the router,
the UI says fee routing is unsupported.

These contracts are **internally reviewed**, not independently audited.
