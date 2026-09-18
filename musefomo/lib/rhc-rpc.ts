import { cacheSWR } from "@/lib/cache";
import { finitePrice, PROVIDER_BUDGET_MS, publicJson } from "@/lib/fast-fetch";
import { looksLikeEvm } from "@/lib/format";

/** SOURCE: longer/snappad/redditpad — docs.ponsfamily.com/v2 + public Robinhood RPC. */
export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";
export const ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";
export const PONS_FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e";
export const PONS_LAUNCHPAD = (ca: string) => `https://www.ponsfamily.com/launchpad/token/${ca}`;
export const RHC_TOKEN = (ca: string) => `${ROBINHOOD_EXPLORER}/token/${ca}`;

const PRO_REST = `https://api.blockscout.com/${ROBINHOOD_CHAIN_ID}/api/v2`;
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const SEL = {
  getLaunchedToken: "3cf28b5a",
  getReserves: "0902f1ac",
  logo: "fb7f21eb",
} as const;

type RpcResult = { result?: string };

export type DexRobinhoodQuote = {
  priceUsd: number;
  volumeUsd: number | null;
  marketCap: number | null;
  imageUrl: string | null;
  symbol: string | null;
  name: string | null;
};

function blockscoutKey(): string | null {
  return process.env.BLOCKSCOUT_API_KEY?.trim() || null;
}

function blockscoutHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
  };
  const key = blockscoutKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function blockscoutJson<T>(path: string, ms = 4_000): Promise<T | null> {
  const key = blockscoutKey();
  if (key) {
    try {
      const response = await fetch(`${PRO_REST}${path}`, {
        headers: blockscoutHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(ms),
      });
      if (response.ok) return (await response.json()) as T;
    } catch {
      // instance fallback below
    }
  }
  return publicJson<T>(`${ROBINHOOD_EXPLORER}/api/v2${path}`, ms);
}

async function ethCall(to: string, data: string): Promise<string | null> {
  try {
    const response = await fetch(ROBINHOOD_RPC, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_BUDGET_MS),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as RpcResult;
    return typeof body.result === "string" && body.result.startsWith("0x") ? body.result : null;
  } catch {
    return null;
  }
}

function word(hex: string, index: number): string {
  const start = 2 + index * 64;
  return hex.slice(start, start + 64);
}

function addrFromWord(wordHex: string): string | null {
  if (wordHex.length < 64) return null;
  const value = `0x${wordHex.slice(24)}`;
  return looksLikeEvm(value) ? value : null;
}

function uintFromWord(wordHex: string): bigint | null {
  if (!wordHex) return null;
  try {
    return BigInt(`0x${wordHex}`);
  } catch {
    return null;
  }
}

function decodeAbiString(hex: string): string | null {
  if (hex.length < 2 + 64 + 64) return null;
  const offset = Number(uintFromWord(word(hex, 0)) ?? -1n);
  if (!Number.isFinite(offset) || offset < 0) return null;
  const lenWord = hex.slice(2 + offset * 2, 2 + offset * 2 + 64);
  const len = Number(uintFromWord(lenWord) ?? -1n);
  if (!Number.isFinite(len) || len <= 0 || len > 512) return null;
  const dataStart = 2 + offset * 2 + 64;
  const bytes = hex.slice(dataStart, dataStart + len * 2);
  try {
    return Buffer.from(bytes, "hex").toString("utf8").trim() || null;
  } catch {
    return null;
  }
}

export async function readPonsCurve(token: string): Promise<{
  curve: string;
  exists: boolean;
} | null> {
  if (!looksLikeEvm(token)) return null;
  const data = `0x${SEL.getLaunchedToken}${token.slice(2).toLowerCase().padStart(64, "0")}`;
  const raw = await ethCall(PONS_FACTORY, data);
  if (!raw || raw.length < 2 + 15 * 64) return null;
  const curve = addrFromWord(word(raw, 1));
  const exists = (uintFromWord(word(raw, 14)) ?? 0n) === 1n;
  if (!curve || !exists) return null;
  return { curve, exists };
}

export async function readCurvePriceEth(curve: string): Promise<number | null> {
  const raw = await ethCall(curve, `0x${SEL.getReserves}`);
  if (!raw || raw.length < 2 + 128) return null;
  const quote = uintFromWord(word(raw, 0));
  const token = uintFromWord(word(raw, 1));
  if (quote == null || token == null || token === 0n || quote === 0n) return null;
  const price = Number(quote) / Number(token);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export async function readTokenLogo(token: string): Promise<string | null> {
  const raw = await ethCall(token, `0x${SEL.logo}`);
  if (!raw) return null;
  const logo = decodeAbiString(raw);
  if (!logo) return null;
  return /^(https:\/\/|ipfs:\/\/)/i.test(logo) ? logo : null;
}

export async function getEthUsd(): Promise<number | null> {
  return cacheSWR("rhc:eth-usd:v2", 60_000, async () => {
    const stats = await blockscoutJson<{ coin_price?: string }>("/stats", 4_000);
    const fromChain = finitePrice(stats?.coin_price);
    if (fromChain) return fromChain;
    const weth = await publicJson<Array<{ priceUsd?: string }>>(
      `https://api.dexscreener.com/tokens/v1/ethereum/${WETH}`,
      4_000,
    );
    const fromDex = finitePrice(Array.isArray(weth) ? weth[0]?.priceUsd : null);
    if (fromDex) return fromDex;
    const coinbase = await publicJson<{ data?: { rates?: { USD?: string } } }>(
      "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
      3_000,
    );
    return finitePrice(coinbase?.data?.rates?.USD);
  });
}

export type BlockscoutToken = {
  address_hash?: string;
  symbol?: string;
  name?: string;
  icon_url?: string | null;
  exchange_rate?: string | null;
  circulating_market_cap?: string | null;
  volume_24h?: string | null;
  holders_count?: string | number | null;
};

export async function readBlockscoutToken(address: string): Promise<BlockscoutToken | null> {
  if (!looksLikeEvm(address)) return null;
  return blockscoutJson<BlockscoutToken>(`/tokens/${address}`, 4_000);
}

export async function listBlockscoutTokens(): Promise<BlockscoutToken[]> {
  const body = await blockscoutJson<{ items?: BlockscoutToken[] }>("/tokens?type=ERC-20", 4_000);
  return body?.items ?? [];
}

type DexPair = {
  chainId?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  volume?: { h24?: number };
  marketCap?: number;
  fdv?: number;
  info?: { imageUrl?: string };
};

function quoteFromPair(pair: DexPair): { address: string; quote: DexRobinhoodQuote } | null {
  if (pair.chainId && pair.chainId !== "robinhood") return null;
  const address = pair.baseToken?.address;
  const priceUsd = finitePrice(pair.priceUsd);
  if (!address || !looksLikeEvm(address) || priceUsd == null) return null;
  return {
    address: address.toLowerCase(),
    quote: {
      priceUsd,
      volumeUsd: finitePrice(pair.volume?.h24),
      marketCap: finitePrice(pair.marketCap) ?? finitePrice(pair.fdv),
      imageUrl: pair.info?.imageUrl ?? null,
      symbol: pair.baseToken?.symbol ?? null,
      name: pair.baseToken?.name ?? null,
    },
  };
}

export async function quoteDexRobinhood(addresses: string[]): Promise<Map<string, DexRobinhoodQuote>> {
  const unique = [...new Set(addresses.filter((item) => looksLikeEvm(item)).map((item) => item.toLowerCase()))];
  const out = new Map<string, DexRobinhoodQuote>();
  if (!unique.length) return out;
  const body = await publicJson<DexPair[] | { pairs?: DexPair[] }>(
    `https://api.dexscreener.com/tokens/v1/robinhood/${unique.join(",")}`,
    4_000,
  );
  const pairs = Array.isArray(body) ? body : (body?.pairs ?? []);
  for (const pair of pairs) {
    const hit = quoteFromPair(pair);
    if (!hit) continue;
    const prev = out.get(hit.address);
    if (!prev || (hit.quote.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) out.set(hit.address, hit.quote);
  }
  return out;
}

export async function searchDexRobinhood(query: string): Promise<Map<string, DexRobinhoodQuote>> {
  const out = new Map<string, DexRobinhoodQuote>();
  const body = await publicJson<{ pairs?: DexPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
    4_000,
  );
  for (const pair of body?.pairs ?? []) {
    const hit = quoteFromPair(pair);
    if (!hit) continue;
    const prev = out.get(hit.address);
    if (!prev || (hit.quote.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) out.set(hit.address, hit.quote);
  }
  return out;
}
