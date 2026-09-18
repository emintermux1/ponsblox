import {
  encodeFunctionData,
  formatUnits,
  isAddress,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
  type Log,
  type WalletClient,
} from "viem";
import { explorerTokenUrl, robinhood, ZERO } from "@/lib/chain";
import type { LaunchIndexCoinInput, PonsToken } from "@/types";
import { CURVE_ABI, ERC20_ABI, FACTORY_ABI, ROUTER_ABI, TOKEN_INFO_ABI, TOKEN_LAUNCHED } from "./abi";
import { publicClient } from "./client";
import {
  LAUNCH_CONFIG_ID,
  LOGO_MAX_BYTES,
  PAIR_TOKEN,
  PONS_FACTORY,
  PONS_LAUNCH_AND_BUY,
  QUOTE_DECIMALS,
} from "./config";

export type FactoryStatus = {
  approved: boolean;
  launchEnabled: boolean;
  launchFee: string;
  launchFeeEth: string;
  maxCreatorTaxBps: number;
  launchConfigEnabled: boolean | null;
};

export type LaunchCall = {
  to: Address;
  functionName: "launchToken" | "launchAndBuy";
  value: bigint;
  data: Hex;
  approveToken: Address | null;
  approveSpender: Address | null;
  approveAmount: string;
  quoteIn: string;
  launchFee: bigint;
};

function isNativePair(addr: string) {
  return addr.toLowerCase() === ZERO.toLowerCase();
}

export async function readCanLaunch(account: Address): Promise<boolean> {
  return publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: "canLaunch",
    args: [account],
  });
}

export async function readFactoryStatus(): Promise<FactoryStatus> {
  const [approved, fee, enabled, maxTax, config] = await Promise.all([
    isNativePair(PAIR_TOKEN)
      ? Promise.resolve(true)
      : publicClient.readContract({
          address: PONS_FACTORY,
          abi: FACTORY_ABI,
          functionName: "approvedPairTokens",
          args: [PAIR_TOKEN],
        }),
    publicClient.readContract({ address: PONS_FACTORY, abi: FACTORY_ABI, functionName: "launchFee" }),
    publicClient.readContract({ address: PONS_FACTORY, abi: FACTORY_ABI, functionName: "launchEnabled" }),
    publicClient.readContract({
      address: PONS_FACTORY,
      abi: FACTORY_ABI,
      functionName: "maxCreatorTaxBps",
    }),
    publicClient
      .readContract({
        address: PONS_FACTORY,
        abi: FACTORY_ABI,
        functionName: "getLaunchConfig",
        args: [LAUNCH_CONFIG_ID],
      })
      .catch(() => null),
  ]);
  return {
    approved,
    launchEnabled: enabled,
    launchFee: fee.toString(),
    launchFeeEth: formatUnits(fee, 18),
    maxCreatorTaxBps: Number(maxTax),
    launchConfigEnabled: config ? Boolean(config.enabled) : null,
  };
}

export function checkLogo(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const bytes = new TextEncoder().encode(v).length;
  if (bytes > LOGO_MAX_BYTES) {
    return v.startsWith("data:")
      ? `A pasted image is ${bytes} bytes and Pons allows ${LOGO_MAX_BYTES}. Host it and paste the link.`
      : `${bytes} bytes, over Pons' ${LOGO_MAX_BYTES} byte logo limit.`;
  }
  if (!/^(https:\/\/|ipfs:\/\/)/i.test(v)) return "Use a link starting with https:// or ipfs://";
  return null;
}

export function validateLaunchDraft(d: LaunchIndexCoinInput): string | null {
  if (!d.name.trim()) return "Name is required";
  if (!/^[A-Za-z0-9]{2,11}$/.test(d.symbol.trim())) return "Symbol must be 2–11 letters or digits";
  const logoErr = checkLogo(d.logo);
  if (logoErr) return logoErr;
  if (!isAddress(d.recipient)) return "Recipient is not a valid address";
  if (d.quoteIn.trim()) {
    try {
      if (parseUnits(d.quoteIn.trim(), QUOTE_DECIMALS) < 0n) return "First buy must be a positive amount";
    } catch {
      return "First buy must be an amount, or empty";
    }
  }
  return null;
}

export async function readPonsToken(address: Address): Promise<PonsToken | null> {
  if (!isAddress(address)) return null;
  const launched = await publicClient
    .readContract({
      address: PONS_FACTORY,
      abi: FACTORY_ABI,
      functionName: "getLaunchedToken",
      args: [address],
    })
    .catch(() => null);
  if (!launched?.exists) return null;

  const curve = launched.curve;
  const pair = launched.pairToken;
  const pairNative = isNativePair(pair);
  const info = await publicClient
    .readContract({
      address,
      abi: TOKEN_INFO_ABI,
      functionName: "getTokenInfo",
    })
    .catch(() => null);

  const [name, symbol, logo, description, totalSupply, graduated, ready, reserves, pairSymbol] =
    await Promise.all([
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: "name" }).catch(() => "Unknown"),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: "symbol" }).catch(() => "???"),
      publicClient
        .readContract({ address, abi: ERC20_ABI, functionName: "logo" })
        .catch(() => info?.[1] || ""),
      publicClient
        .readContract({ address, abi: ERC20_ABI, functionName: "description" })
        .catch(() => info?.[2] || ""),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: "totalSupply" }).catch(() => 0n),
      publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: "graduated" }).catch(() => false),
      publicClient
        .readContract({ address: curve, abi: CURVE_ABI, functionName: "readyToGraduate" })
        .catch(() => false),
      publicClient.readContract({ address: curve, abi: CURVE_ABI, functionName: "getReserves" }).catch(() => null),
      pairNative
        ? Promise.resolve("ETH")
        : publicClient
            .readContract({ address: pair, abi: ERC20_ABI, functionName: "symbol" })
            .catch(() => "quote"),
    ]);

  const quoteReserve = reserves ? reserves[0] : 0n;
  const tokenReserve = reserves ? reserves[1] : 0n;
  let priceQuote: string | null = null;
  let marketCapQuote: string | null = null;
  if (tokenReserve > 0n && quoteReserve > 0n && totalSupply > 0n) {
    marketCapQuote = formatUnits((quoteReserve * totalSupply) / tokenReserve, QUOTE_DECIMALS);
    priceQuote = formatUnits((quoteReserve * 10n ** 18n) / tokenReserve, QUOTE_DECIMALS);
  }

  return {
    address: launched.token,
    curve,
    name: String(name),
    symbol: String(symbol),
    logo: String(logo || info?.[1] || ""),
    description: String(description || info?.[2] || ""),
    deployer: launched.deployer,
    creatorFeeRecipient: launched.creatorFeeRecipient,
    pairToken: launched.pairToken,
    pairSymbol: String(pairSymbol),
    priceQuote,
    marketCapQuote,
    quoteReserve: quoteReserve.toString(),
    tokenReserve: tokenReserve.toString(),
    totalSupply: totalSupply.toString(),
    graduated: Boolean(graduated),
    readyToGraduate: Boolean(ready),
    creatorTaxBps: Number(launched.creatorTaxBps),
    buybackEnabled: launched.buybackEnabled,
    phase: Number(launched.phase),
    explorerUrl: explorerTokenUrl(launched.token),
  };
}

const SCAN_CHUNK = 2000n;
const SCAN_WINDOWS = 8;

export async function scanRecentLaunches(): Promise<Address[]> {
  const latest = await publicClient.getBlockNumber();
  const found: Address[] = [];
  for (let i = 0; i < SCAN_WINDOWS; i++) {
    const to = latest - SCAN_CHUNK * BigInt(i);
    if (to <= 0n) break;
    const from = to > SCAN_CHUNK ? to - SCAN_CHUNK + 1n : 0n;
    const logs = await publicClient
      .getLogs({
        address: PONS_FACTORY,
        event: TOKEN_LAUNCHED,
        fromBlock: from,
        toBlock: to,
      })
      .catch(() => []);
    for (const log of logs) {
      const token = log.args.token as Address | undefined;
      if (token) found.push(token);
    }
  }
  return [...new Set(found.map((a) => a.toLowerCase() as Address))];
}

function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((x) => x.toString(16).padStart(2, "0")).join("")}` as Hex;
}

export async function buildLaunchCall(d: LaunchIndexCoinInput): Promise<LaunchCall> {
  const status = await readFactoryStatus();
  if (!status.approved) throw new Error("Pons is not accepting this quote pair right now");
  if (!status.launchEnabled) throw new Error("Pons is not accepting launches right now");
  if (status.launchConfigEnabled === false) throw new Error("This launch config is disabled on Pons.");
  const err = validateLaunchDraft(d);
  if (err) throw new Error(err);

  const expectedEconomics = await publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: "previewLaunchEconomics",
    args: [LAUNCH_CONFIG_ID, PAIR_TOKEN],
  });
  const quoteIn = d.quoteIn.trim() ? parseUnits(d.quoteIn.trim(), QUOTE_DECIMALS) : 0n;
  const tax = Math.max(0, Math.min(d.creatorTaxBps ?? 0, status.maxCreatorTaxBps));
  const params = {
    name: d.name.trim(),
    symbol: d.symbol.trim().toUpperCase(),
    logo: d.logo.trim(),
    description: d.description.trim(),
    socials: {
      twitter: (d.twitter ?? "").trim(),
      telegram: (d.telegram ?? "").trim(),
      discord: "",
      website: (d.website ?? "").trim(),
      farcaster: "",
    },
    creatorFeeRecipient: d.recipient,
    creatorTaxBps: tax,
    buybackEnabled: Boolean(d.buybackEnabled),
    expectedEconomics,
    salt: randomSalt(),
  };

  if (quoteIn > 0n) {
    const native = isNativePair(PAIR_TOKEN);
    return {
      to: PONS_LAUNCH_AND_BUY,
      functionName: "launchAndBuy",
      value: native ? BigInt(status.launchFee) + quoteIn : BigInt(status.launchFee),
      data: encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: "launchAndBuy",
        args: [params, LAUNCH_CONFIG_ID, PAIR_TOKEN, quoteIn, 0n, d.recipient, []],
      }),
      approveToken: native ? null : PAIR_TOKEN,
      approveSpender: native ? null : PONS_LAUNCH_AND_BUY,
      approveAmount: native ? "0" : quoteIn.toString(),
      quoteIn: quoteIn.toString(),
      launchFee: BigInt(status.launchFee),
    };
  }

  return {
    to: PONS_FACTORY,
    functionName: "launchToken",
    value: BigInt(status.launchFee),
    data: encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "launchToken",
      args: [params, LAUNCH_CONFIG_ID, PAIR_TOKEN],
    }),
    approveToken: null,
    approveSpender: null,
    approveAmount: "0",
    quoteIn: "0",
    launchFee: BigInt(status.launchFee),
  };
}

export function tokenFromLaunchReceipt(logs: Log[]): { token: Address; curve: Address } | null {
  const parsed = parseEventLogs({ abi: FACTORY_ABI, logs, eventName: "TokenLaunched" });
  const ev = parsed[0];
  if (!ev?.args.token || !ev.args.curve) return null;
  return { token: ev.args.token as Address, curve: ev.args.curve as Address };
}

export async function sendLaunch(
  wallet: WalletClient,
  account: Address,
  call: LaunchCall,
): Promise<{ hash: Hash; token: Address; curve: Address }> {
  if (call.approveToken && call.approveSpender && BigInt(call.approveAmount) > 0n) {
    await wallet.writeContract({
      account,
      chain: robinhood,
      address: call.approveToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [call.approveSpender, BigInt(call.approveAmount)],
    });
  }

  await publicClient.call({
    account,
    to: call.to,
    data: call.data,
    value: call.value,
  }).catch((error: Error) => {
    throw new Error(error.message || "Simulation failed. The launch would revert.");
  });

  let hash: Hash;
  try {
    hash = await wallet.sendTransaction({
      account,
      chain: robinhood,
      to: call.to,
      data: call.data,
      value: call.value,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet send failed";
    if (/User rejected|denied|4001/i.test(message)) throw new Error("Wallet rejected the launch.");
    throw new Error(message);
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 }).catch((error: Error) => {
    throw new Error(error.message || "Timed out waiting for the receipt. No token address is assumed.");
  });
  if (receipt.status === "reverted") throw new Error("Launch reverted on chain. No token was created.");
  const extracted = tokenFromLaunchReceipt(receipt.logs);
  if (!extracted) {
    throw new Error("Receipt confirmed but TokenLaunched was not in the logs. Not inventing a token address.");
  }
  return { hash, token: extracted.token, curve: extracted.curve };
}
