import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  fallback,
  getAddress,
  http,
  toHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import {
  ARC_ADDRESSES,
  ARC_CHAIN_ID,
  ARC_EXPLORER,
  ARC_RPC_URLS,
  ARGUS_CONSTANTS,
  DEFAULT_TAX,
  LAUNCH_PORTAL,
  argusTokenUrl,
} from "./addresses.js";
import {
  erc20Abi,
  portal7LaunchAbi,
  portalCommonAbi,
  quoteRouteRegistryAbi,
} from "./abi.js";
import { mineHookSalt } from "./hookSalt.js";

export const arcMainnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [...ARC_RPC_URLS] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_EXPLORER },
  },
});

export type LaunchInput = {
  name: string;
  symbol: string;
  imageUri: string;
  description: string;
  twitter: string;
  website?: string;
  telegram?: string;
};

export type LaunchOnchainResult = {
  token: Address;
  txHash: Hex;
  argusUrl: string;
};

function assertAllowlistedTx(args: {
  chainId: number;
  to: Address;
  value: bigint;
}): void {
  if (args.chainId !== ARC_CHAIN_ID) {
    throw new Error(`Refusing unexpected chain ${args.chainId}`);
  }
  if (getAddress(args.to) !== LAUNCH_PORTAL) {
    throw new Error(`Refusing unexpected destination ${args.to}`);
  }
  if (args.value !== 0n) {
    throw new Error("Refusing unexpected transaction value");
  }
}

export function createArcClients(args: {
  privateKey: Hex;
  rpcUrl?: string;
}): {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: ReturnType<typeof privateKeyToAccount>;
} {
  const account = privateKeyToAccount(args.privateKey);
  const urls = args.rpcUrl
    ? [args.rpcUrl, ...ARC_RPC_URLS.filter((u) => u !== args.rpcUrl)]
    : [...ARC_RPC_URLS];
  const transport = fallback(urls.map((url) => http(url, { timeout: 12_000 })));
  const publicClient = createPublicClient({
    chain: arcMainnet,
    transport,
  });
  const walletClient = createWalletClient({
    account,
    chain: arcMainnet,
    transport,
  });
  return { publicClient, walletClient, account };
}

async function expectConvert(
  publicClient: PublicClient,
  portal: Address,
  quote: Address,
): Promise<number> {
  const registry = await publicClient.readContract({
    address: portal,
    abi: portalCommonAbi,
    functionName: "registry",
  });
  const payout = await publicClient.readContract({
    address: registry,
    abi: quoteRouteRegistryAbi,
    functionName: "payoutAssetFor",
    args: [quote],
  });
  return getAddress(payout) === getAddress(quote) ? 1 : 2;
}

export async function assertPortalReady(
  publicClient: PublicClient,
): Promise<void> {
  const chainId = await publicClient.getChainId();
  if (chainId !== ARC_CHAIN_ID) {
    throw new Error(`RPC chain ${chainId} is not Arc mainnet ${ARC_CHAIN_ID}`);
  }
  const code = await publicClient.getCode({ address: LAUNCH_PORTAL });
  if (!code || code === "0x") {
    throw new Error("LAUNCH_PORTAL has no code on this RPC");
  }
  const words = await publicClient.readContract({
    address: LAUNCH_PORTAL,
    abi: portalCommonAbi,
    functionName: "LAUNCH_STRUCT_WORDS",
  });
  if (words !== ARGUS_CONSTANTS.launchStructWords) {
    throw new Error(
      `Portal LAUNCH_STRUCT_WORDS=${words}, expected ${ARGUS_CONSTANTS.launchStructWords}`,
    );
  }
  const approved = await publicClient.readContract({
    address: LAUNCH_PORTAL,
    abi: portalCommonAbi,
    functionName: "quoteApproved",
    args: [ARC_ADDRESSES.usdc],
  });
  if (!approved) {
    throw new Error("USDC is not an approved Argus quote on this Portal");
  }
}

export async function launchOnArgus(args: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: ReturnType<typeof privateKeyToAccount>;
  input: LaunchInput;
  onStage?: (stage: string) => void | Promise<void>;
  onSubmitted?: (txHash: Hex) => void | Promise<void>;
}): Promise<LaunchOnchainResult> {
  const { publicClient, walletClient, account, input, onStage, onSubmitted } = args;
  const portal = LAUNCH_PORTAL;
  const quote = ARC_ADDRESSES.usdc;

  await assertPortalReady(publicClient);
  const chainId = await publicClient.getChainId();

  await onStage?.("mining_hook");
  const salt = toRandomSalt();
  const splitter = await publicClient.readContract({
    address: portal,
    abi: portalCommonAbi,
    functionName: "predictSplitter",
    args: [account.address, salt],
  });
  const initCodeHash = await publicClient.readContract({
    address: portal,
    abi: portalCommonAbi,
    functionName: "hookInitCodeHash",
    args: [
      splitter,
      DEFAULT_TAX.buyTaxBps,
      DEFAULT_TAX.sellTaxBps,
      quote,
    ],
  });
  const { hookSalt } = mineHookSalt({
    portal,
    creator: account.address,
    initCodeHash,
  });

  const convert = await expectConvert(publicClient, portal, quote);
  const params = {
    name: input.name,
    symbol: input.symbol,
    totalSupply: ARGUS_CONSTANTS.totalSupply,
    startFdvUsdc6: ARGUS_CONSTANTS.startFdvUsdc6,
    bondFdvUsdc6: ARGUS_CONSTANTS.bondFdvUsdc6,
    buyTaxBps: DEFAULT_TAX.buyTaxBps,
    sellTaxBps: DEFAULT_TAX.sellTaxBps,
    creatorBps: DEFAULT_TAX.creatorBps,
    burnBps: DEFAULT_TAX.burnBps,
    dividendBps: DEFAULT_TAX.dividendBps,
    liquidityBps: DEFAULT_TAX.liquidityBps,
    devBuyQuote: 0n,
    quoteAsset: quote,
    expectConvert: convert,
  } as const;
  const meta = {
    imageURI: input.imageUri,
    website: input.website ?? "",
    twitter: input.twitter,
    telegram: input.telegram ?? "",
    description: input.description,
  } as const;

  await onStage?.("simulating");
  const { request } = await publicClient.simulateContract({
    account: account.address,
    address: portal,
    abi: portal7LaunchAbi,
    functionName: "launch",
    args: [params, meta, salt, hookSalt],
    chain: arcMainnet,
  });

  assertAllowlistedTx({
    chainId,
    to: request.address,
    value: request.value ?? 0n,
  });
  if (request.functionName !== "launch") {
    throw new Error(`Refusing unexpected method ${request.functionName}`);
  }

  await onStage?.("submitting");
  const txHash = await walletClient.writeContract({
    ...request,
    account,
    chain: arcMainnet,
  });
  await onSubmitted?.(txHash);

  await onStage?.("confirming");
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 90_000,
  });
  if (receipt.status !== "success") {
    throw new Error(`Launch tx reverted: ${txHash}`);
  }

  const token = extractCreatedToken(receipt.logs, portal, account.address);
  if (!token) {
    throw new Error(
      `Launch confirmed (${txHash}) but TokenCreated was not found. Do not resubmit.`,
    );
  }

  return { token, txHash, argusUrl: argusTokenUrl(token) };
}

export type ReconcileResult =
  | { state: "pending"; txHash: Hex }
  | { state: "reverted"; txHash: Hex }
  | { state: "unknown"; txHash: Hex }
  | { state: "launched"; token: Address; txHash: Hex; argusUrl: string };

export async function reconcileLaunch(args: {
  publicClient: PublicClient;
  creator: Address;
  txHash: Hex;
}): Promise<ReconcileResult> {
  const receipt = await args.publicClient
    .getTransactionReceipt({ hash: args.txHash })
    .catch(() => null);
  if (!receipt) return { state: "pending", txHash: args.txHash };
  if (receipt.status !== "success") {
    return { state: "reverted", txHash: args.txHash };
  }
  const token = extractCreatedToken(receipt.logs, LAUNCH_PORTAL, args.creator);
  if (!token) return { state: "unknown", txHash: args.txHash };
  return {
    state: "launched",
    token,
    txHash: args.txHash,
    argusUrl: argusTokenUrl(token),
  };
}

function extractCreatedToken(
  logs: readonly { data: Hex; topics: readonly Hex[]; address: Address }[],
  portal: Address,
  creator: Address,
): Address | null {
  for (const log of logs) {
    if (getAddress(log.address) !== portal) continue;
    try {
      const decoded = decodeEventLog({
        abi: portalCommonAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (decoded.eventName !== "TokenCreated") continue;
      const token = decoded.args.token;
      const eventCreator = decoded.args.creator;
      if (getAddress(eventCreator) !== getAddress(creator)) continue;
      return getAddress(token);
    } catch {
      continue;
    }
  }
  return null;
}

function toRandomSalt(): Hex {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function getNativeBalance(
  publicClient: PublicClient,
  address: Address,
): Promise<bigint> {
  return publicClient.getBalance({ address });
}

export { erc20Abi };
