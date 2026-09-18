const paid = "98kfF7rmsg1QDUEoCqNE7g7M1FdrTt92TEp2CLzypump";
const pair = "6e3jZLtf4tQbWZm3f7A66jF8tfZn6MRQVrbDFgcNWarA";

async function get(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)" },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const cg = await get(
  `https://api.coingecko.com/api/v3/coins/solana/contract/${paid}/market_chart?vs_currency=usd&days=1`,
);
console.log("COINGECKO", cg.status, cg.json?.prices?.length ?? 0, cg.json?.error ?? cg.json?.status);

await new Promise((r) => setTimeout(r, 2000));
const gecko = await get(
  `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pair}/ohlcv/hour?aggregate=1&limit=24&currency=usd`,
);
console.log(
  "GECKO_HOUR",
  gecko.status,
  gecko.json?.data?.attributes?.ohlcv_list?.length ?? 0,
  gecko.json?.status ?? null,
);
