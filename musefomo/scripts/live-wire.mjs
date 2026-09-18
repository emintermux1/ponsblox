import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function parseEnv(source) {
  const out = {};
  for (const line of source.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    out[line.slice(0, index).trim()] = line.slice(index + 1);
  }
  return out;
}

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return parseEnv(readFileSync(path, "utf8"));
}

const env = {
  ...loadEnv(join(root, "..", ".env.local")),
  ...loadEnv(join(root, "..", "..", ".env.local")),
};

function redact(text, secrets) {
  let next = String(text ?? "");
  for (const secret of secrets) {
    if (secret) next = next.split(secret).join("[redacted]");
  }
  return next;
}

async function probeFomoscan() {
  const key = env.FOMOSCAN_API_KEY?.trim();
  const base = (env.FOMOSCAN_API_URL?.trim() || "https://api.fomoscan.sh").replace(/\/$/, "");
  if (!key) {
    process.stdout.write("fomoscan local: missing FOMOSCAN_API_KEY\n");
    return;
  }
  const response = await fetch(`${base}/v2/me`, {
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Api-Key": key,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let code = `HTTP_${response.status}`;
  try {
    const body = JSON.parse(text);
    code = body?.error?.code ?? code;
  } catch {
    // status only
  }
  process.stdout.write(`fomoscan local status=${response.status} code=${code}\n`);
}

async function inspectAgents() {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    process.stdout.write("db: DATABASE_URL missing\n");
    return { claimedTrading: 0, pending: 0 };
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { ssl: "require", max: 1, prepare: false });
  try {
    const rows = await sql`
      select a.status, a.handle, a.wallet_address is not null as has_wallet,
             coalesce(p.trading_enabled, false) as trading_enabled
      from agents a
      left join agent_permissions p on p.agent_id = a.id
      order by a.created_at desc
      limit 20
    `;
    const claimedTrading = rows.filter((row) => row.status === "claimed" && row.has_wallet && row.trading_enabled).length;
    const pending = rows.filter((row) => row.status === "pending_claim").length;
    process.stdout.write(
      `db agents=${rows.length} claimedTrading=${claimedTrading} pending=${pending} handles=${rows
        .map((row) => `${row.handle}:${row.status}:wallet=${row.has_wallet}:trade=${row.trading_enabled}`)
        .join(",")}\n`,
    );
    return { claimedTrading, pending, wallets: rows.filter((row) => row.has_wallet).map((row) => row) };
  } catch (error) {
    process.stdout.write(`db query failed: ${error instanceof Error ? error.message : "error"}\n`);
    return { claimedTrading: 0, pending: 0 };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function registerIfNeeded(claimedTrading) {
  if (claimedTrading > 0) {
    process.stdout.write("register skipped: claimed trading agent exists\n");
    return null;
  }
  const response = await fetch("https://musefomo.family/api/agents/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle: `muse_${Date.now().toString(36)}`, displayName: "Muse" }),
  });
  const body = await response.json().catch(() => ({}));
  const claimUrl = body?.claim?.url;
  if (claimUrl) {
    process.stdout.write(`claim URL ${claimUrl}\n`);
    return claimUrl;
  }
  process.stdout.write(`register status=${response.status} code=${body?.error?.code ?? "none"}\n`);
  return null;
}

async function heliusWebhook() {
  const key = env.HELIUS_API_KEY?.trim();
  const secret = env.HELIUS_WEBHOOK_SECRET?.trim();
  process.stdout.write("helius dashboard https://dashboard.helius.dev/webhooks\n");
  process.stdout.write("helius header x-helius-secret (no query). Authorization Bearer also accepted.\n");
  process.stdout.write("helius url https://musefomo.family/api/webhooks/helius\n");
  if (!key) {
    process.stdout.write("helius: HELIUS_API_KEY missing\n");
    return;
  }
  const list = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${key}`);
  process.stdout.write(`helius list status=${list.status}\n`);
  if (!list.ok) return;
  const webhooks = await list.json();
  const rows = Array.isArray(webhooks) ? webhooks : [];
  const match = rows.find((row) => String(row.webhookURL ?? "").includes("musefomo.family/api/webhooks/helius"));
  process.stdout.write(`helius existing=${rows.length} familyMatch=${Boolean(match)}\n`);
  if (match || !secret) return;
  const created = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      webhookURL: "https://musefomo.family/api/webhooks/helius",
      webhookType: "enhanced",
      transactionTypes: ["ANY"],
      accountAddresses: [],
      authHeader: secret,
    }),
  });
  const text = redact(await created.text(), [key, secret]);
  process.stdout.write(`helius create status=${created.status} ${text.slice(0, 180)}\n`);
}

await probeFomoscan();
const agents = await inspectAgents();
await registerIfNeeded(agents.claimedTrading);
await heliusWebhook();
process.stdout.write("dflow fill: skipped (session signer key present, autonomous sign path not wired; humans sign)\n");
