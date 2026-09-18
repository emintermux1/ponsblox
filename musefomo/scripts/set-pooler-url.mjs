import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const envPath = new URL("../.env.local", import.meta.url);
const source = readFileSync(envPath, "utf8");
const lines = source.split(/\r?\n/);
let current = "";
for (const line of lines) {
  if (line.startsWith("DATABASE_URL=")) current = line.slice("DATABASE_URL=".length);
}
if (!current) {
  console.log("missing DATABASE_URL");
  process.exit(1);
}
const parsed = new URL(current);
const pass = encodeURIComponent(decodeURIComponent(parsed.password));
const pooler = `postgresql://musefomo_runtime.jzuhkjghntqieblcbdvx:${pass}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;
const next = lines
  .map((line) => (line.startsWith("DATABASE_URL=") ? `DATABASE_URL=${pooler}` : line))
  .join("\n");
writeFileSync(envPath, next.endsWith("\n") ? next : `${next}\n`);
console.log("local DATABASE_URL host set to aws-1-eu-west-1.pooler.supabase.com:6543");

for (const target of ["production", "preview"]) {
  const result = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      "DATABASE_URL",
      target,
      "--yes",
      "--force",
      "--sensitive",
      "--scope",
      "agab717171-2964s-projects",
    ],
    { input: pooler, encoding: "utf8", shell: true },
  );
  console.log("vercel", target, result.status === 0 ? "ok" : "fail");
  if (result.status !== 0) {
    const raw = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
    console.log(raw.split(pooler).join("[redacted]").slice(0, 400));
  }
}
