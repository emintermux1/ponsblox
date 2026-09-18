import { getAddress, type Address, type Hex } from "viem";

/** Arc public mainnet. Verified via eth_chainId on rpc.mainnet.arc.io = 0x13b2. */
export const ARC_CHAIN_ID = 5042;

export const ARC_RPC_URLS = [
  "https://rpc.mainnet.arc.io",
  "https://argus.world/rpc",
] as const;

export const ARC_EXPLORER = "https://arc-scan.org";

/**
 * Addresses taken from the live Argus production bundle
 * (argus.world/_next/static/chunks/1slbcy-7139oy.js, 2026-09-16).
 * Docs: https://argus.world/docs/integrate — new launches go to Portal #7.
 */
export const ARC_ADDRESSES = {
  poolManager: getAddress("0x8366a39CC670B4001A1121B8F6A443A643e40951"),
  stateView: getAddress("0xF3334192D15450CdD385c8B70e03f9A6bD9E673b"),
  positionManager: getAddress("0x6049c9a0e26405C0985f9E3685C87d0aE917f82B"),
  universalRouter: getAddress("0x4fcA4a51Ab4F23A7447b3284fBd7D73289A89Fb1"),
  swapRouter02: getAddress("0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77"),
  permit2: getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3"),
  multicall3: getAddress("0xcA11bde05977b3631167028862bE2a173976CA11"),
  usdc: getAddress("0x3600000000000000000000000000000000000000"),
  treasury: getAddress("0x934DEA9Ab179De155db10519aA89a8C418C50705"),
  launchConfig: getAddress("0x8Bf56C35faEA89D81E8eEe45c2FfB3994148A840"),
  launchConfig7: getAddress("0x87FE2242b83680F3912829014A5915c9B0A51dD3"),
  argusToken: getAddress("0xeCe5cA8bf9220718E5727754026757512212cb3c"),
} as const;

/** Current new-launch target (Portal #7). */
export const LAUNCH_PORTAL: Address = getAddress(
  "0xB021Be536808f551b31789422Fd28a6c9c6e97Da",
);

export const ARGUS_CONSTANTS = {
  poolFee: 10_000,
  tickSpacing: 200,
  tokenDecimals: 18,
  quoteDecimals: 6,
  totalSupply: 1_000_000_000n * 10n ** 18n,
  startFdvUsdc6: 2_500n * 10n ** 6n,
  bondFdvUsdc6: 45_000n * 10n ** 6n,
  maxTaxBps: 1_000,
  treasuryBps: 1_000,
  hookFlags: 8260n,
  hookFlagMask: 16383n,
  launchStructWords: 11,
} as const;

/** Argus "Creator-backed" preset from the live create form. */
export const DEFAULT_TAX = {
  buyTaxBps: 100,
  sellTaxBps: 100,
  creatorBps: 10_000,
  burnBps: 0,
  dividendBps: 0,
  liquidityBps: 0,
} as const;

export const ALLOWED_PORTALS: readonly Address[] = [LAUNCH_PORTAL];

export function argusTokenUrl(token: Address): string {
  return `https://argus.world/token/${getAddress(token)}`;
}

export function explorerTxUrl(hash: Hex): string {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

export function explorerAddressUrl(address: Address): string {
  return `${ARC_EXPLORER}/address/${getAddress(address)}`;
}
