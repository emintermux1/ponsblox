const ALLOWED_HOSTS = [
  "dexscreener.com",
  "cdn.dexscreener.com",
  "dd.dexscreener.com",
  "amazonaws.com",
  "cloudfront.net",
  "fomoscan.sh",
  "pbs.twimg.com",
  "abs.twimg.com",
  "twimg.com",
  "coingecko.com",
  "coin-images.coingecko.com",
  "assets.coingecko.com",
  "geckoterminal.com",
  "assets.geckoterminal.com",
  "gmgn.ai",
  "ipfs.io",
  "cf-ipfs.com",
  "nftstorage.link",
  "arweave.net",
  "shdwdrive.com",
  "helius-rpc.com",
  "irys.xyz",
  "jup.ag",
  "datapi.jup.ag",
  "static.datapi.jup.ag",
  "raw.githubusercontent.com",
  "githubusercontent.com",
  "img.fotofolio.xyz",
  "fotofolio.xyz",
  "birdeye.so",
  "phantom.app",
  "coinmarketcap.com",
  "s2.coinmarketcap.com",
  "googleusercontent.com",
  "pump.fun",
];

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new Response("missing url", { status: 400 });
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response("bad protocol", { status: 400 });
  }
  if (!hostAllowed(target.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }
  const upstream = await fetch(target.toString(), {
    headers: { Accept: "image/*,*/*;q=0.8" },
    cache: "force-cache",
  });
  if (!upstream.ok) return new Response("upstream failed", { status: 502 });
  const type = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/") && type !== "application/octet-stream") {
    return new Response("not an image", { status: 415 });
  }
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength > 2_500_000) return new Response("too large", { status: 413 });
  return new Response(bytes, {
    headers: {
      "content-type": type.startsWith("image/") ? type : "image/jpeg",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
