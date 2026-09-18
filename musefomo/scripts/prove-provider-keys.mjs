import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const localPath = resolve(root, ".env.local");

function readLocal(name) {
  if (!existsSync(localPath)) return "";
  for (const line of readFileSync(localPath, "utf8").split(/\r?\n/)) {
    if (line.startsWith(`${name}=`)) return line.slice(name.length + 1).trim();
  }
  return "";
}

const birdeye = readLocal("BIRDEYE_API_KEY");
const solscan = readLocal("SOLSCAN_API_KEY");
const mint = "So11111111111111111111111111111111111111112";

async function hit(label, url, headers) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return { provider: label, ok: response.ok, status: response.status };
  } catch {
    return { provider: label, ok: false, status: 0 };
  }
}

const results = await Promise.all([
  birdeye
    ? hit("birdeye", `https://public-api.birdeye.so/defi/price?address=${mint}`, {
        "X-API-KEY": birdeye,
        "x-chain": "solana",
      })
    : { provider: "birdeye", ok: false, status: 0, reason: "missing_key" },
  solscan
    ? hit("solscan", `https://pro-api.solscan.io/v2.0/token/meta?address=${mint}`, {
        token: solscan,
      })
    : { provider: "solscan", ok: false, status: 0, reason: "missing_key" },
]);

console.log(JSON.stringify(results));
process.exit(results.every((row) => row.ok) ? 0 : 1);
