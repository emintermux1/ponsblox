import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const repoRoot = "C:\\Users\\emin\\ponsblox";
const appRoot = join(repoRoot, "musefomo");
const parent = readFileSync(join(repoRoot, ".env.local"), "utf8");
const map = {};
for (const line of parent.split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  map[line.slice(0, i)] = line.slice(i + 1);
}

const required = [
  "DFLOW_API_KEY",
  "HELIUS_API_KEY",
  "PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
  "PRIVY_JWKS_URL",
  "FOMOSCAN_API_KEY",
  "FOMOSCAN_API_URL",
];
for (const key of required) {
  if (!map[key]) throw new Error(`missing parent env ${key}`);
}

const dbPass = randomBytes(24).toString("base64url");
const webhook = randomBytes(24).toString("hex");
const pepper = randomBytes(24).toString("hex");
const anon =
  "sb_publishable_QJG1EALpqgkM9qSyojLU7g_l5h2fN9k";

const encodedPass = encodeURIComponent(dbPass);
const lines = [
  `DFLOW_API_KEY=${map.DFLOW_API_KEY}`,
  `HELIUS_API_KEY=${map.HELIUS_API_KEY}`,
  `PRIVY_APP_ID=${map.PRIVY_APP_ID}`,
  `NEXT_PUBLIC_PRIVY_APP_ID=${map.PRIVY_APP_ID}`,
  `PRIVY_APP_SECRET=${map.PRIVY_APP_SECRET}`,
  `PRIVY_JWKS_URL=${map.PRIVY_JWKS_URL}`,
  `FOMOSCAN_API_KEY=${map.FOMOSCAN_API_KEY}`,
  `FOMOSCAN_API_URL=${map.FOMOSCAN_API_URL}`,
  `SUPABASE_URL=https://jzuhkjghntqieblcbdvx.supabase.co`,
  `NEXT_PUBLIC_SUPABASE_URL=https://jzuhkjghntqieblcbdvx.supabase.co`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
  `DATABASE_URL=postgresql://musefomo_runtime:${encodedPass}@db.jzuhkjghntqieblcbdvx.supabase.co:5432/postgres?sslmode=require`,
  `HELIUS_WEBHOOK_SECRET=${webhook}`,
  `CREDENTIAL_PEPPER=${pepper}`,
  `NEXT_PUBLIC_APP_URL=http://localhost:3000`,
];

writeFileSync(join(appRoot, ".env.local"), `${lines.join("\n")}\n`);
writeFileSync(join(appRoot, ".db-bootstrap.json"), JSON.stringify({ password: dbPass }));
process.stdout.write("env written\n");
