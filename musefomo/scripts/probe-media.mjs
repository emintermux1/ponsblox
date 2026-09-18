import { readFileSync } from "node:fs";

function env() {
  const out = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function keysOf(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  const out = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      out.push(...keysOf(child, path));
    } else {
      const sample =
        typeof child === "string"
          ? child.slice(0, 80)
          : Array.isArray(child)
            ? `array(${child.length})`
            : child;
      out.push(`${path}=${sample}`);
    }
  }
  return out;
}

const e = env();
const base = (e.FOMOSCAN_API_URL || "https://api.fomoscan.sh").replace(/\/$/, "");

const thesis = await fetch(`${base}/v2/thesis`, {
  headers: { Authorization: `Bearer ${e.FOMOSCAN_API_KEY}`, Accept: "application/json" },
}).then((r) => r.json());

const item = thesis?.data?.items?.[0] ?? thesis?.items?.[0];
console.log("THESIS_ITEM");
for (const line of keysOf(item).filter((row) => /avatar|image|pic|pfp|photo|twitter|author|handle|symbol|token/i.test(row))) {
  console.log(line);
}

const handle = item?.authorHandle || item?.author?.handle;
if (handle) {
  const user = await fetch(`${base}/v2/user/handle/${encodeURIComponent(handle)}`, {
    headers: { Authorization: `Bearer ${e.FOMOSCAN_API_KEY}`, Accept: "application/json" },
  }).then((r) => r.json());
  console.log("USER", handle);
  for (const line of keysOf(user?.data ?? user).filter((row) => /avatar|image|pic|pfp|photo|twitter|banner|social/i.test(row))) {
    console.log(line);
  }
}

const board = await fetch(`${base}/v2/leaderboard/tokens/trending`, {
  headers: { Authorization: `Bearer ${e.FOMOSCAN_API_KEY}`, Accept: "application/json" },
}).then((r) => r.json());
const token = board?.data?.entries?.[0] ?? board?.entries?.[0];
console.log("TOKEN_ENTRY");
for (const line of keysOf(token)) console.log(line);

const mint = token?.id;
if (mint) {
  const dex = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`).then((r) => r.json());
  const pair = (dex.pairs || []).find((p) => p.chainId === "solana") || dex.pairs?.[0];
  console.log("DEX", {
    pairs: (dex.pairs || []).length,
    image: pair?.info?.imageUrl,
    pair: pair?.pairAddress,
    symbol: pair?.baseToken?.symbol,
  });
  const v1 = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`).then((r) => r.json()).catch(() => null);
  console.log("DEX_V1", Array.isArray(v1) ? { n: v1.length, image: v1[0]?.info?.imageUrl, pair: v1[0]?.pairAddress } : typeof v1);

  if (pair?.pairAddress) {
    const gecko = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pair.pairAddress}/ohlcv/minute?aggregate=15&limit=20`,
      { headers: { Accept: "application/json" } },
    );
    const gj = await gecko.json();
    console.log("GECKO_PAIR", gecko.status, (gj.data?.attributes?.ohlcv_list || []).length);
  }
}

const search = await fetch("https://api.dexscreener.com/latest/dex/search?q=wifout").then((r) => r.json());
const w = (search.pairs || []).find((p) => p.chainId === "solana");
console.log("WIFOUT", {
  n: (search.pairs || []).length,
  symbol: w?.baseToken?.symbol,
  mint: w?.baseToken?.address,
  pair: w?.pairAddress,
  image: w?.info?.imageUrl,
});
