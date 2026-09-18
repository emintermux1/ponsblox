import "server-only";

import {
  mergeMarketPulse,
  mintFromGeckoTokenId,
  quietMarketPulse,
  quietProviders,
  tickerFromName,
  tickerFromSymbol,
  type HeliusConfirm,
  type MarketHit,
  type MarketPulse,
  type ProviderStatus,
} from "@/lib/adapters/parse";
import { assertSource, honestyFromLabel } from "@/lib/adapters/source";

export type { MarketPulse };

type GeckoPool = {
  attributes?: {
    name?: string;
    volume_usd?: { h1?: string };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
  };
};

const UA = { Accept: "application/json", "User-Agent": "MuseWorld/1.0" };
const LIVE_TTL_MS = 12_000;
const STALE_LIVE_MS = 60_000;

let lastPulse: MarketPulse = quietMarketPulse(quietProviders());
let lastAt = 0;
let lastLiveAt = 0;

function stampPulse(pulse: MarketPulse): MarketPulse {
  assertSource(honestyFromLabel(pulse.source === "sim" ? "sim" : "gecko"));
  return pulse;
}

async function readJson(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown | null> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 20 },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function peekGecko(): Promise<MarketHit | ProviderStatus> {
  try {
    const body = (await readJson(
      "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
      UA,
      1800,
    )) as { data?: GeckoPool[] } | null;
    const row = body?.data?.[0];
    if (!row) {
      return "error";
    }
    return {
      source: "gecko",
      ticker: tickerFromName(row.attributes?.name),
      mint: mintFromGeckoTokenId(row.relationships?.base_token?.data?.id),
      volumeUsd: Number(row.attributes?.volume_usd?.h1 ?? 0),
    };
  } catch {
    return "error";
  }
}

async function peekBirdeye(): Promise<MarketHit | ProviderStatus> {
  const key = process.env.BIRDEYE_API_KEY?.trim();
  if (!key) {
    return "skip";
  }
  try {
    const body = (await readJson(
      "https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=1",
      { ...UA, "X-API-KEY": key, "x-chain": "solana" },
      1800,
    )) as { data?: { tokens?: { address?: string; symbol?: string; volume24hUSD?: number; v24hUSD?: number }[] } } | null;
    const row = body?.data?.tokens?.[0];
    const mint = row?.address ?? null;
    if (!mint) {
      return "error";
    }
    return {
      source: "birdeye",
      ticker: tickerFromSymbol(row?.symbol),
      mint,
      volumeUsd: Number(row?.volume24hUSD ?? row?.v24hUSD ?? 0),
    };
  } catch {
    return "error";
  }
}

async function peekGmgn(): Promise<MarketHit | ProviderStatus> {
  const key = process.env.GMGN_API_KEY?.trim();
  if (!key) {
    return "skip";
  }
  try {
    const body = await readJson(
      "https://openapi.gmgn.ai/v1/market/rank?chain=sol&interval=1h&limit=1&orderby=volume",
      { ...UA, "x-api-key": key },
      1800,
    );
    const row = firstListedToken(body);
    const mint = row?.address ?? row?.token_address ?? null;
    if (!mint) {
      return "error";
    }
    return {
      source: "gmgn",
      ticker: tickerFromSymbol(row?.symbol),
      mint,
      volumeUsd: Number(row?.volume ?? 0),
    };
  } catch {
    return "error";
  }
}

async function confirmHelius(mint: string | null): Promise<HeliusConfirm | ProviderStatus> {
  const key = process.env.HELIUS_API_KEY?.trim();
  if (!key) {
    return "skip";
  }
  if (!mint) {
    return "skip";
  }
  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "muse-world-asset",
        method: "getAsset",
        params: { id: mint },
      }),
      signal: AbortSignal.timeout(1800),
      next: { revalidate: 20 },
    });
    if (!response.ok) {
      return "error";
    }
    const body = (await response.json()) as {
      result?: { id?: string; content?: { metadata?: { symbol?: string } } };
    };
    const symbol = body.result?.content?.metadata?.symbol ?? null;
    if (!body.result) {
      return "error";
    }
    return { symbol: tickerFromSymbol(symbol), mint: body.result.id ?? mint };
  } catch {
    return "error";
  }
}

export async function peekMarketPulse(): Promise<MarketPulse> {
  const now = Date.now();
  if (now - lastAt < LIVE_TTL_MS) {
    return stampPulse(lastPulse);
  }
  lastAt = now;
  try {
    const [gecko, birdeye, gmgn] = await Promise.all([
      peekGecko(),
      peekBirdeye(),
      peekGmgn(),
    ]);
    const seed =
      (typeof gecko === "object" ? gecko.mint : null) ??
      (typeof birdeye === "object" ? birdeye.mint : null) ??
      (typeof gmgn === "object" ? gmgn.mint : null);
    const helius = await confirmHelius(seed);
    const pulse = mergeMarketPulse({ gecko, birdeye, gmgn, helius });
    if (pulse.source === "sim" && lastPulse.source !== "sim" && now - lastLiveAt < STALE_LIVE_MS) {
      return stampPulse(lastPulse);
    }
    lastPulse = pulse;
    if (pulse.source !== "sim") {
      lastLiveAt = now;
    }
    return stampPulse(lastPulse);
  } catch {
    if (lastPulse.source !== "sim" && now - lastLiveAt < STALE_LIVE_MS) {
      return stampPulse(lastPulse);
    }
    lastPulse = quietMarketPulse(quietProviders());
    return stampPulse(lastPulse);
  }
}

function firstListedToken(
  body: unknown,
): { address?: string; token_address?: string; symbol?: string; volume?: number } | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const root = body as Record<string, unknown>;
  const data = root.data;
  const nested = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const lists = [data, nested?.rank, nested?.list, nested?.tokens, root.rank, root.list, root.tokens];
  for (const list of lists) {
    if (Array.isArray(list) && list[0] && typeof list[0] === "object") {
      return list[0] as { address?: string; token_address?: string; symbol?: string; volume?: number };
    }
  }
  return null;
}
