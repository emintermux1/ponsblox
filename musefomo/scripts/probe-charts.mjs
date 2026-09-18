const mints = [
  "CTPoyCwkjMvoJwU4xvZZqoD8tiYk6yDchySiN5gGpump",
  "6JrR1iqPdinYTNvNPWTR2P7e2wSJ1rwdsrKGyhnzjUVr",
];

async function gecko(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const json = await res.json().catch(() => null);
  const n = json?.data?.attributes?.ohlcv_list?.length ?? 0;
  return { status: res.status, n };
}

for (const mint of mints) {
  const dex = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`).then((r) => r.json());
  const pair = Array.isArray(dex) ? dex[0] : dex?.pairs?.[0];
  console.log("MINT", mint, {
    symbol: pair?.baseToken?.symbol,
    pair: pair?.pairAddress,
    image: pair?.info?.imageUrl,
  });
  if (pair?.pairAddress) {
    console.log("  gecko hour", await gecko(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pair.pairAddress}/ohlcv/hour?aggregate=1&limit=24`));
  }
  const cg = await fetch(`https://api.coingecko.com/api/v3/coins/solana/contract/${mint}/market_chart?vs_currency=usd&days=1`);
  const body = await cg.json().catch(() => null);
  console.log("  coingecko", cg.status, body?.prices?.length ?? 0);
}
