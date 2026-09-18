import { cacheSWR } from "@/lib/cache";
import { finitePrice, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm } from "@/lib/format";
import {
  listBlockscoutTokens,
  RHC_TOKEN,
  searchDexRobinhood,
  type BlockscoutToken,
  type DexRobinhoodQuote,
} from "@/lib/rhc-rpc";
import type { DiscoverTokenRow } from "@/lib/types";

const DEX_QUERIES = ["PONS", "LINK", "WETH", "HOOD"] as const;

function fromScout(item: BlockscoutToken, rank: number): DiscoverTokenRow | null {
  const mint = item.address_hash;
  if (!mint || !looksLikeEvm(mint) || !(item.symbol || item.name)) return null;
  const price = finitePrice(item.exchange_rate);
  const volume = finitePrice(item.volume_24h);
  const mcap = finitePrice(item.circulating_market_cap);
  const holders = Number(item.holders_count);
  return {
    rank,
    mint,
    symbol: item.symbol ?? null,
    name: item.name ?? null,
    imageUrl: item.icon_url ?? null,
    priceUsd: price,
    volumeUsd: volume,
    volumeLamports: null,
    marketCap: mcap,
    priceChange24h: null,
    holders: Number.isFinite(holders) && holders > 0 ? holders : null,
    trades: null,
    pairAddress: null,
    chain: "robinhood",
    chainTag: "Robinhood Chain",
    href: RHC_TOKEN(mint),
    source: "market",
  };
}

function fromDex(address: string, quote: DexRobinhoodQuote, rank: number): DiscoverTokenRow | null {
  if (!looksLikeEvm(address) || !(quote.symbol || quote.name) || quote.priceUsd == null) return null;
  return {
    rank,
    mint: address,
    symbol: quote.symbol,
    name: quote.name,
    imageUrl: quote.imageUrl,
    priceUsd: quote.priceUsd,
    volumeUsd: quote.volumeUsd,
    volumeLamports: null,
    marketCap: quote.marketCap,
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    chain: "robinhood",
    chainTag: "Robinhood Chain",
    href: RHC_TOKEN(address),
    source: "market",
  };
}

function rankRows(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  return rows
    .sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0) || (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 24)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function resolveRobinhoodChainRows(): Promise<DiscoverTokenRow[]> {
  const scout = await raceTimeout(listBlockscoutTokens(), [], 4_200);
  const scoutRows = scout
    .map((item, index) => fromScout(item, index + 1))
    .filter((row): row is DiscoverTokenRow => Boolean(row && row.priceUsd != null));
  if (scoutRows.length) return rankRows(scoutRows);

  const searches = await raceTimeout(
    Promise.all(DEX_QUERIES.map((query) => searchDexRobinhood(query).catch(() => new Map<string, DexRobinhoodQuote>()))),
    [] as Map<string, DexRobinhoodQuote>[],
    4_200,
  );
  const byMint = new Map<string, DiscoverTokenRow>();
  for (const bag of searches) {
    for (const [address, quote] of bag) {
      const row = fromDex(address, quote, 0);
      if (!row) continue;
      const prev = byMint.get(address);
      if (!prev || (row.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) byMint.set(address, row);
    }
  }
  return rankRows([...byMint.values()]);
}

export async function loadRobinhoodChainRail(): Promise<DiscoverTokenRow[]> {
  return cacheSWR("discover:rhc:v2", 90_000, resolveRobinhoodChainRows, (rows) => rows.length > 0);
}
