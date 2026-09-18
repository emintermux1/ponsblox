import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_NAMES = new Set([
  "NEXT_PUBLIC_PRIVY_APP_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "FOMOSCAN_API_URL",
  "SUPABASE_URL",
  "PRIVY_APP_ID",
  "PRIVY_JWKS_URL",
]);

const REQUIRED = [
  "DFLOW_API_KEY",
  "HELIUS_API_KEY",
  "PRIVY_APP_ID",
  "NEXT_PUBLIC_PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
  "PRIVY_JWKS_URL",
  "PRIVY_AUTHORIZATION_PRIVATE_KEY",
  "PRIVY_AUTHORIZATION_KEY_ID",
  "FOMOSCAN_API_KEY",
  "FOMOSCAN_API_URL",
  "DATABASE_URL",
  "HELIUS_WEBHOOK_SECRET",
  "CREDENTIAL_PEPPER",
  "NEXT_PUBLIC_APP_URL",
];

const SKIP = new Set(["VERCEL_OIDC_TOKEN"]);
const root = dirname(fileURLToPath(import.meta.url));
const parentEnv = join(root, "..", "..", ".env.local");
const localEnv = join(root, "..", ".env.local");

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

const env = { ...loadEnv(localEnv), ...loadEnv(parentEnv) };
env.NEXT_PUBLIC_APP_URL = "https://musefomo.family";
if (env.PRIVY_APP_ID && !env.NEXT_PUBLIC_PRIVY_APP_ID) {
  env.NEXT_PUBLIC_PRIVY_APP_ID = env.PRIVY_APP_ID;
}

const present = REQUIRED.filter((name) => Boolean(env[name]?.trim()));
const missingOnDisk = REQUIRED.filter((name) => !env[name]?.trim());
process.stdout.write(`disk present ${present.join(",")}\n`);
process.stdout.write(`disk missing ${missingOnDisk.join(",") || "none"}\n`);

const targets = ["production", "preview"];
const names = [...new Set([...REQUIRED, ...Object.keys(env)])].filter(
  (name) => !SKIP.has(name) && env[name],
);

for (const name of names) {
  const value = env[name];
  const sensitive = !PUBLIC_NAMES.has(name);
  for (const target of targets) {
    const result = spawnSync(
      "npx",
      [
        "vercel",
        "env",
        "add",
        name,
        target,
        "--yes",
        "--force",
        "--scope",
        "agab717171-2964s-projects",
        sensitive ? "--sensitive" : "--no-sensitive",
      ],
      {
        input: value,
        encoding: "utf8",
        shell: true,
        cwd: join(root, ".."),
      },
    );
    const ok = result.status === 0;
    process.stdout.write(`${name} ${target} ${ok ? "ok" : "fail"}\n`);
    if (!ok) {
      const raw = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
      process.stdout.write(`${raw.split(value).join("[redacted]").slice(0, 400)}\n`);
    }
  }
}
