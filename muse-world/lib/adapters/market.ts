import "server-only";

import {
  finiteChange,
  mergeMarketPulse,
  mintFromGeckoTokenId,
  pulseDisplayName,
  quietMarketPulse,
  quietProviders,
  tickerFromName,
  tickerFromSymbol,
  type HeliusConfirm,
  type MarketHit,
  type MarketProviderId,
  type MarketPulse,
  type ProviderStatus,
} from "@/lib/adapters/parse";
import { assertSource, honestyFromLabel, type PacketLabel } from "@/lib/adapters/source";
import { assertNever } from "@/types/world";

export type { MarketPulse };

type GeckoPool = {
  attributes?: {
    name?: string;
    volume_usd?: { h1?: string; h24?: string };
    price_change_percentage?: { m5?: string; h1?: string; h6?: string; h24?: string };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
  };
};

type ListedToken = {
  address?: string;
  token_address?: string;
  symbol?: string;
  name?: string;
  volume?: number;
  volume24hUSD?: number;
  v24hUSD?: number;
  price_change_percent?: number | string;
  price_change_percent1h?: number | string;
  price24hChangePercent?: number | string;
  priceChange24hPercent?: number | string;
  priceChange24h?: number | string;
  v24hChangePercent?: number | string;
};

const UA = { Accept: "application/json", "User-Agent": "MuseWorld/1.0" };
const LIVE_TTL_MS = 12_000;
const STALE_LIVE_MS = 60_000;
const TREND_LIMIT = 12;

let lastPulse: MarketPulse = quietMarketPulse(quietProviders());
let lastAt = 0;
let lastLiveAt = 0;

export function resetMarketPulseCache(): void {
  lastPulse = quietMarketPulse(quietProviders());
  lastAt = 0;
  lastLiveAt = 0;
}

function marketLabel(source: MarketPulse["source"]): PacketLabel {
  switch (source) {
    case "sim":
    case "gecko":
    case "birdeye":
    case "gmgn":
    case "helius":
      return source;
    default:
      return assertNever(source);
  }
}

function stampPulse(pulse: MarketPulse): MarketPulse {
  assertSource(honestyFromLabel(marketLabel(pulse.source)));
  return { ...pulse, fills: [] };
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

function hitFromListed(
  source: Exclude<MarketProviderId, "helius">,
  row: ListedToken,
): MarketHit | null {
  const ticker = tickerFromSymbol(row.symbol) ?? tickerFromName(row.name);
  const name = pulseDisplayName(row.name ?? row.symbol, ticker);
  const mint = row.address ?? row.token_address ?? null;
  if (!ticker && !name) {
    return null;
  }
  return {
    source,
    ticker,
    name,
    mint,
    volumeUsd: Number(row.volume24hUSD ?? row.v24hUSD ?? row.volume ?? 0),
    changePct: finiteChange(
      row.price_change_percent1h ??
        row.price24hChangePercent ??
        row.priceChange24hPercent ??
        row.v24hChangePercent ??
        row.price_change_percent ??
        row.priceChange24h,
    ),
  };
}

function geckoHit(row: GeckoPool): MarketHit | null {
  const ticker = tickerFromName(row.attributes?.name);
  const name = pulseDisplayName(row.attributes?.name, ticker);
  if (!ticker && !name) {
    return null;
  }
  const change = row.attributes?.price_change_percentage;
  return {
    source: "gecko",
    ticker,
    name,
    mint: mintFromGeckoTokenId(row.relationships?.base_token?.data?.id),
    volumeUsd: Number(row.attributes?.volume_usd?.h1 ?? row.attributes?.volume_usd?.h24 ?? 0),
    changePct: finiteChange(change?.h1 ?? change?.h24 ?? change?.h6 ?? change?.m5),
  };
}

async function peekGecko(): Promise<MarketHit | ProviderStatus> {
  try {
    const body = (await readJson(
      "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
      UA,
      1800,
    )) as { data?: GeckoPool[] } | null;
    const rows = body?.data ?? [];
    if (rows.length === 0) {
      return "error";
    }
    for (const row of rows.slice(0, TREND_LIMIT)) {
      const hit = geckoHit(row);
      if (hit) {
        return hit;
      }
    }
    return "error";
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
      `https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${TREND_LIMIT}`,
      { ...UA, "X-API-KEY": key, "x-chain": "solana" },
      1800,
    )) as { data?: { tokens?: ListedToken[] } } | null;
    const rows = body?.data?.tokens ?? [];
    if (rows.length === 0) {
      return "error";
    }
    for (const row of rows) {
      const hit = hitFromListed("birdeye", row);
      if (hit) {
        return hit;
      }
    }
    return "error";
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
      `https://openapi.gmgn.ai/v1/market/rank?chain=sol&interval=1h&limit=${TREND_LIMIT}&orderby=volume`,
      { ...UA, "x-api-key": key },
      1800,
    );
    const rows = listedTokens(body);
    if (rows.length === 0) {
      return "error";
    }
    for (const row of rows) {
      const hit = hitFromListed("gmgn", row);
      if (hit) {
        return hit;
      }
    }
    return "error";
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
      result?: {
        id?: string;
        content?: { metadata?: { symbol?: string; name?: string } };
      };
    };
    if (!body.result) {
      return "error";
    }
    const symbol = tickerFromSymbol(body.result.content?.metadata?.symbol ?? null);
    const name = pulseDisplayName(body.result.content?.metadata?.name, symbol);
    return { symbol, name, mint: body.result.id ?? mint };
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

function listedTokens(body: unknown): ListedToken[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const root = body as Record<string, unknown>;
  const data = root.data;
  const nested = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const lists = [data, nested?.rank, nested?.list, nested?.tokens, root.rank, root.list, root.tokens];
  const out: ListedToken[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const row of list) {
      if (row && typeof row === "object") {
        out.push(row as ListedToken);
      }
    }
    if (out.length > 0) {
      return out.slice(0, TREND_LIMIT);
    }
  }
  return out;
}
