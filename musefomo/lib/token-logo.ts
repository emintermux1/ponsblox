import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import type { DiscoverTokenRow } from "@/lib/types";

export type TokenLogoRef = {
  address: string;
  chain: string;
};

export type TokenLook = {
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
};

export type JupiterMintRow = {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  marketCap: number | null;
};

export type GeckoPoolBody = {
  data?: Array<{
    attributes?: {
      address?: string;
      name?: string;
      base_token_price_usd?: string;
      market_cap_usd?: string;
      volume_usd?: { h24?: string };
      price_change_percentage?: { h24?: string };
    };
    relationships?: { base_token?: { data?: { id?: string } } };
  }>;
  included?: Array<{
    id?: string;
    type?: string;
    attributes?: {
      address?: string;
      symbol?: string;
      name?: string;
      image_url?: string;
    };
  }>;
};

type CacheRow = { url: string | null; at: number };

const HIT_MS = 24 * 60 * 60_000;
const MISS_MS = 60_000;
const FETCH_MS = 4_000;
const BATCH_WAIT_MS = 24;
const JUPITER_BATCH = 80;
const DEX_BATCH = 30;

const memory = new Map<string, CacheRow>();
const inflight = new Map<string, Promise<string | null>>();
const queued = new Map<string, TokenLogoRef>();
const waiters = new Map<string, Array<(url: string | null) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const DEX_TOKEN_RE =
  /(?:dd|cdn)\.dexscreener\.com\/(?:ds-data\/)?tokens\/([a-z0-9-]+)\/([1-9A-HJ-NP-Za-km-z]{32,44}|0x[a-fA-F0-9]{40})/i;
const CID_RE = /(?:ipfs:\/\/|\/ipfs\/)(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,}|bafk[a-z0-9]{50,})/i;
const PLACEHOLDER = new Set(["-", "—", "–", "−", "n/a", "na", "null", "undefined"]);

export function unwrapImageSrc(src?: string | null): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  const nested = proxyInnerUrl(trimmed);
  if (nested) return unwrapImageSrc(nested);
  return trimmed;
}

export function canonicalImageUrl(raw?: string | null): string | null {
  const value = unwrapImageSrc(raw);
  if (!value || PLACEHOLDER.has(value.toLowerCase()) || isProxyImagePath(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const cid = value.match(CID_RE)?.[1];
  if (cid) return `https://ipfs.io/ipfs/${cid}`;
  if (/^http:\/\//i.test(value)) return `https://${value.slice(7)}`;
  if (/^https:\/\//i.test(value)) return value;
  return null;
}

export function tokenImageSrc(raw?: string | null): string | null {
  return asHttpsLogo(raw);
}

export function asHttpsLogo(raw?: string | null): string | null {
  const canonical = canonicalImageUrl(raw);
  if (!canonical || isProxyImagePath(canonical)) return null;
  const pinata = rewriteIpfs(canonical)[0];
  const next = pinata ?? canonical;
  return next.startsWith("https://") ? next : null;
}

export function pickLogoUri(...values: unknown[]): string | null {
  for (const value of values) {
    const url = asHttpsLogo(typeof value === "string" ? value : null);
    if (url) return url;
  }
  return null;
}

export function cleanTokenLabel(value?: string | null, mint?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || PLACEHOLDER.has(trimmed.toLowerCase())) return null;
  if (looksLikeMint(trimmed) || looksLikeEvm(trimmed)) return null;
  if (mint && trimmed.length >= 8 && mint.startsWith(trimmed)) return null;
  return trimmed;
}

export function preferLabel(
  primary?: string | null,
  fallback?: string | null,
  mint?: string | null,
): string | null {
  return cleanTokenLabel(primary, mint) ?? cleanTokenLabel(fallback, mint);
}

export function applyTokenLook(row: DiscoverTokenRow, look: TokenLook): DiscoverTokenRow {
  return {
    ...row,
    symbol: preferLabel(look.symbol, row.symbol, row.mint),
    name: preferLabel(look.name, row.name, row.mint),
    imageUrl: asHttpsLogo(look.imageUrl) ?? asHttpsLogo(row.imageUrl),
  };
}

export function mapJupiterMints(rows: unknown[]): JupiterMintRow[] {
  const out: JupiterMintRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const mint = finiteString(item.id) ?? finiteString(item.address);
    if (!mint) continue;
    out.push({
      mint,
      symbol: cleanTokenLabel(finiteString(item.symbol), mint),
      name: cleanTokenLabel(finiteString(item.name), mint),
      imageUrl: pickLogoUri(item.icon, item.logoURI, item.logo_uri, item.logo, item.imageUrl),
      priceUsd: finiteNumber(item.usdPrice) ?? finiteNumber(item.price),
      marketCap: finiteNumber(item.mcap) ?? finiteNumber(item.fdv),
    });
  }
  return out;
}

export function jupiterRowsToDiscover(rows: JupiterMintRow[]): DiscoverTokenRow[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: row.imageUrl,
    priceUsd: row.priceUsd,
    volumeUsd: null,
    volumeLamports: null,
    marketCap: row.marketCap,
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    source: "market",
  }));
}

export function geckoIncludedLooks(body: GeckoPoolBody | null | undefined): Map<string, TokenLook> {
  const looks = new Map<string, TokenLook>();
  for (const item of body?.included ?? []) {
    if (item.type && item.type !== "token") continue;
    const address = item.attributes?.address ?? (item.id?.includes("_") ? item.id.split("_").pop() : item.id);
    if (!address) continue;
    const look: TokenLook = {
      symbol: cleanTokenLabel(item.attributes?.symbol ?? null, address),
      name: cleanTokenLabel(item.attributes?.name ?? null, address),
      imageUrl: pickLogoUri(item.attributes?.image_url),
    };
    looks.set(address, look);
    if (item.id) looks.set(item.id, look);
  }
  return looks;
}

export async function loadJupiterTrendingRows(): Promise<DiscoverTokenRow[]> {
  const rows = await getJson<unknown[]>("https://lite-api.jup.ag/tokens/v2/toptrending/24h");
  return jupiterRowsToDiscover(mapJupiterMints(Array.isArray(rows) ? rows : []));
}

export async function paintTokenRows(rows: DiscoverTokenRow[]): Promise<DiscoverTokenRow[]> {
  const need = [
    ...new Set(
      rows
        .filter((row) => !canonicalImageUrl(row.imageUrl) || !cleanTokenLabel(row.symbol, row.mint))
        .map((row) => row.mint)
        .filter((mint) => looksLikeMint(mint) || looksLikeEvm(mint)),
    ),
  ];
  const looks = await resolveLooks(need);
  return rows.map((row) => applyTokenLook(row, looks.get(row.mint) ?? emptyLook()));
}

export function extractTokenRef(src?: string | null, mint?: string | null): TokenLogoRef | null {
  const explicit = mint?.trim();
  if (explicit && looksLikeMint(explicit)) return { address: explicit, chain: "solana" };
  if (explicit && looksLikeEvm(explicit)) return { address: explicit, chain: "robinhood" };

  const unwrapped = unwrapImageSrc(src);
  if (!unwrapped) return null;
  if (looksLikeMint(unwrapped)) return { address: unwrapped, chain: "solana" };
  if (looksLikeEvm(unwrapped)) return { address: unwrapped, chain: "robinhood" };

  const dex = unwrapped.match(DEX_TOKEN_RE);
  if (dex?.[1] && dex[2]) return { address: dex[2], chain: dex[1].toLowerCase() };
  return null;
}

export function tokenLetter(symbol?: string | null, mint?: string | null): string {
  const named = cleanTokenLabel(symbol, mint);
  if (named) {
    const letters = named.replace(/[^A-Za-z0-9]/g, "");
    if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
    if (letters.length === 1) return letters.toUpperCase();
  }
  if (mint && mint.length >= 2) return mint.slice(0, 2);
  return "?";
}

export function logoCandidates(src?: string | null, mint?: string | null): string[] {
  const ref = extractTokenRef(src, mint);
  const out: string[] = [];
  const push = (url?: string | null) => {
    const next = asHttpsLogo(url);
    if (next && !out.includes(next)) out.push(next);
    for (const extra of rewriteIpfs(url)) {
      if (!out.includes(extra)) out.push(extra);
    }
  };
  push(src);
  if (ref) {
    push(`https://dd.dexscreener.com/ds-data/tokens/${ref.chain}/${ref.address}.png`);
    push(`https://dd.dexscreener.com/ds-data/tokens/${ref.chain}/${ref.address}.png?size=lg`);
    if (ref.chain === "solana") {
      push(`https://img.birdeye.so/${ref.address}.png`);
      push(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${ref.address}/logo.png`);
    }
  }
  return out;
}

export function resolveTokenLogo(src?: string | null, mint?: string | null): Promise<string | null> {
  const direct = asHttpsLogo(src);
  const ref = extractTokenRef(src, mint);
  if (!ref) return Promise.resolve(direct);
  const key = cacheKey(ref);
  const cached = readCache(key);
  if (cached !== undefined) return Promise.resolve(asHttpsLogo(cached) ?? direct);
  if (direct && isOfficialLogo(direct)) return Promise.resolve(direct);
  const pending = inflight.get(key);
  if (pending) return pending.then((url) => asHttpsLogo(url) ?? direct);
  const work = enqueue(ref).then((url) => asHttpsLogo(url) ?? direct);
  inflight.set(key, work);
  return work.finally(() => {
    inflight.delete(key);
  });
}

function emptyLook(): TokenLook {
  return { symbol: null, name: null, imageUrl: null };
}

async function resolveLooks(mints: string[]): Promise<Map<string, TokenLook>> {
  const looks = new Map<string, TokenLook>();
  if (!mints.length) return looks;
  const refs = mints.map((mint) => ({
    address: mint,
    chain: looksLikeEvm(mint) ? "robinhood" : "solana",
  }));
  const found = new Map<string, string>();
  const meta = new Map<string, { symbol: string | null; name: string | null }>();
  await fillJupiter(refs, found, meta);
  await fillDex(refs, found);
  await fillGecko(refs, found);
  await fillBirdeye(refs, found);
  await fillCoinGecko(refs, found);
  for (const ref of refs) {
    const key = cacheKey(ref);
    const imageUrl = found.get(key) ?? null;
    const labels = meta.get(ref.address);
    looks.set(ref.address, {
      symbol: labels?.symbol ?? null,
      name: labels?.name ?? null,
      imageUrl,
    });
    if (imageUrl) writeCache(key, imageUrl);
  }
  return looks;
}

function enqueue(ref: TokenLogoRef): Promise<string | null> {
  const key = cacheKey(ref);
  queued.set(key, ref);
  if (flushTimer == null) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushQueue();
    }, BATCH_WAIT_MS);
  }
  return new Promise((resolve) => {
    const list = waiters.get(key) ?? [];
    list.push(resolve);
    waiters.set(key, list);
  });
}

async function flushQueue(): Promise<void> {
  const batch = [...queued.values()];
  queued.clear();
  const found = new Map<string, string>();
  const missing = batch.filter((ref) => readCache(cacheKey(ref)) === undefined);
  try {
    if (missing.length) {
      await fillJupiter(missing, found);
      await fillDex(missing, found);
      await fillGecko(missing, found);
      await fillBirdeye(missing, found);
      await fillCoinGecko(missing, found);
    }
  } finally {
    for (const ref of batch) {
      const key = cacheKey(ref);
      const cached = readCache(key);
      const url = cached !== undefined ? cached : (found.get(key) ?? null);
      if (cached === undefined) writeCache(key, url);
      settle(key, url);
    }
  }
}

function settle(key: string, url: string | null): void {
  const list = waiters.get(key);
  waiters.delete(key);
  for (const resolve of list ?? []) resolve(url);
}

async function fillJupiter(
  refs: TokenLogoRef[],
  found: Map<string, string>,
  meta?: Map<string, { symbol: string | null; name: string | null }>,
): Promise<void> {
  const sol = refs.filter((ref) => ref.chain === "solana" && !found.has(cacheKey(ref)));
  for (const chunk of chunks(sol, JUPITER_BATCH)) {
    const rows = await getJson<unknown>(
      `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(chunk.map((row) => row.address).join(","))}`,
    );
    for (const mapped of mapJupiterMints(Array.isArray(rows) ? rows : [])) {
      if (mapped.imageUrl) found.set(cacheKey({ address: mapped.mint, chain: "solana" }), mapped.imageUrl);
      meta?.set(mapped.mint, { symbol: mapped.symbol, name: mapped.name });
    }
  }
}

async function fillDex(refs: TokenLogoRef[], found: Map<string, string>): Promise<void> {
  const need = refs.filter((ref) => !found.has(cacheKey(ref)));
  const byChain = new Map<string, TokenLogoRef[]>();
  for (const ref of need) {
    const list = byChain.get(ref.chain) ?? [];
    list.push(ref);
    byChain.set(ref.chain, list);
  }
  await Promise.all(
    [...byChain.entries()].map(async ([chain, list]) => {
      for (const chunk of chunks(list, DEX_BATCH)) {
        const rows = await getJson<unknown>(
          `https://api.dexscreener.com/tokens/v1/${chain}/${chunk.map((row) => row.address).join(",")}`,
        );
        const pairs = Array.isArray(rows) ? rows : [];
        for (const pair of pairs) {
          if (!pair || typeof pair !== "object") continue;
          const item = pair as {
            chainId?: unknown;
            baseToken?: { address?: unknown; logoURI?: unknown };
            quoteToken?: { address?: unknown; logoURI?: unknown };
            info?: { imageUrl?: unknown; header?: unknown };
          };
          const image = pickLogoUri(
            item.info?.imageUrl,
            item.baseToken?.logoURI,
            item.quoteToken?.logoURI,
          );
          if (!image) continue;
          const pairChain = typeof item.chainId === "string" ? item.chainId : chain;
          const addresses = [item.baseToken?.address, item.quoteToken?.address].filter(
            (value): value is string => typeof value === "string" && !!value,
          );
          for (const address of addresses) {
            found.set(cacheKey({ address, chain: pairChain }), image);
            for (const ref of chunk) {
              if (ref.address === address) found.set(cacheKey(ref), image);
            }
          }
        }
      }
    }),
  );
}

async function fillBirdeye(refs: TokenLogoRef[], found: Map<string, string>): Promise<void> {
  const need = refs.filter((ref) => ref.chain === "solana" && !found.has(cacheKey(ref)));
  await mapPool(need, 4, async (ref) => {
    const body = await getJson<{
      data?: { logoURI?: unknown; logo_uri?: unknown; logo?: unknown };
    }>(`https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(ref.address)}`);
    const data = body?.data;
    const url = pickLogoUri(data?.logoURI, data?.logo_uri, data?.logo);
    if (url) found.set(cacheKey(ref), url);
  });
}

async function fillGecko(refs: TokenLogoRef[], found: Map<string, string>): Promise<void> {
  const need = refs.filter((ref) => !found.has(cacheKey(ref)));
  await mapPool(need, 4, async (ref) => {
    const network = geckoNetwork(ref.chain);
    if (!network) return;
    const body = await getJson<{ data?: { attributes?: { image_url?: unknown } } }>(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${ref.address}`,
    );
    const attrs = body?.data?.attributes as { image_url?: unknown; logoURI?: unknown } | undefined;
    const url = pickLogoUri(attrs?.image_url, attrs?.logoURI);
    if (url) found.set(cacheKey(ref), url);
  });
}

async function fillCoinGecko(refs: TokenLogoRef[], found: Map<string, string>): Promise<void> {
  const need = refs.filter((ref) => !found.has(cacheKey(ref)));
  await mapPool(need, 3, async (ref) => {
    const platform = coinGeckoPlatform(ref.chain);
    if (!platform) return;
    const body = await getJson<{ image?: { large?: unknown; small?: unknown; thumb?: unknown } }>(
      `https://api.coingecko.com/api/v3/coins/${platform}/contract/${ref.address}`,
    );
    const url = pickLogoUri(body?.image?.large, body?.image?.small, body?.image?.thumb);
    if (url) found.set(cacheKey(ref), url);
  });
}

function proxyInnerUrl(value: string): string | null {
  const relative = value.startsWith("/api/img?") || value.startsWith("/_next/image?");
  if (relative) {
    try {
      return new URL(value, "https://musefomo.family").searchParams.get("url");
    } catch {
      return null;
    }
  }
  try {
    const parsed = new URL(value);
    if (parsed.pathname === "/api/img" || parsed.pathname === "/_next/image") {
      return parsed.searchParams.get("url");
    }
  } catch {
    return null;
  }
  return null;
}

function isProxyImagePath(value: string): boolean {
  return (
    value.startsWith("/api/img") ||
    value.startsWith("/_next/image") ||
    /\/api\/img(?:\?|$)/.test(value) ||
    /\/_next\/image(?:\?|$)/.test(value)
  );
}

function isOfficialLogo(url: string): boolean {
  return /(?:cdn|dd)\.dexscreener\.com\/cms\/|static\.jup\.ag|static\.datapi\.jup\.ag|arweave\.net|githubusercontent\.com|ipfs|birdeye\.so|geckoterminal\.com|coingecko\.com|fotofolio\.xyz|phantom\.app/i.test(
    url,
  );
}

function rewriteIpfs(raw?: string | null): string[] {
  if (!raw) return [];
  const match = raw.match(CID_RE);
  if (!match?.[1]) return [];
  const cid = match[1];
  return [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];
}

function geckoNetwork(chain: string): string | null {
  switch (chain) {
    case "solana":
      return "solana";
    case "robinhood":
      return "robinhood";
    case "ethereum":
    case "eth":
      return "eth";
    case "base":
      return "base";
    case "bsc":
      return "bsc";
    case "arbitrum":
      return "arbitrum";
    case "polygon":
      return "polygon_pos";
    default:
      return null;
  }
}

function coinGeckoPlatform(chain: string): string | null {
  switch (chain) {
    case "solana":
      return "solana";
    case "ethereum":
    case "eth":
      return "ethereum";
    case "base":
      return "base";
    case "bsc":
      return "binance-smart-chain";
    default:
      return null;
  }
}

function cacheKey(ref: TokenLogoRef): string {
  return `${ref.chain}:${ref.address}`;
}

function readCache(key: string): string | null | undefined {
  const row = memory.get(key) ?? readSession(key);
  if (!row) return undefined;
  const ttl = row.url ? HIT_MS : MISS_MS;
  if (Date.now() - row.at > ttl) {
    memory.delete(key);
    return undefined;
  }
  memory.set(key, row);
  return row.url;
}

function writeCache(key: string, url: string | null): void {
  const row = { url, at: Date.now() };
  memory.set(key, row);
  writeSession(key, row);
}

function readSession(key: string): CacheRow | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`mf.logo.v1.${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheRow;
    if (!parsed || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(key: string, row: CacheRow): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(`mf.logo.v1.${key}`, JSON.stringify(row));
  } catch {
    /* quota */
  }
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function mapPool<T>(items: T[], concurrency: number, work: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (current !== undefined) await work(current);
    }
  });
  await Promise.all(workers);
}

function finiteString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

