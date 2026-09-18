import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const incomingPath = resolve(root, ".env.providers.local");
const localPath = resolve(root, ".env.local");

function parseEnv(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    out.set(line.slice(0, idx).trim(), line.slice(idx + 1));
  }
  return out;
}

if (!existsSync(incomingPath)) {
  console.error("missing provider env file");
  process.exit(1);
}

const incoming = parseEnv(readFileSync(incomingPath, "utf8"));
const names = [...incoming.keys()];
if (!names.length) {
  console.error("no provider keys to merge");
  process.exit(1);
}

const existingText = existsSync(localPath) ? readFileSync(localPath, "utf8") : "";
const lines = existingText.length ? existingText.split(/\r?\n/) : [];
const seen = new Set();
const next = [];
for (const line of lines) {
  const idx = line.indexOf("=");
  const key = idx > 0 ? line.slice(0, idx).trim() : "";
  if (key && incoming.has(key)) {
    next.push(`${key}=${incoming.get(key)}`);
    seen.add(key);
  } else {
    next.push(line);
  }
}
for (const [key, value] of incoming) {
  if (!seen.has(key)) next.push(`${key}=${value}`);
}
if (next.length && next[next.length - 1] !== "") next.push("");
writeFileSync(localPath, next.join("\n"), "utf8");
console.log(`merged local keys: ${names.join(",")}`);

function addVercel(name, value, environment) {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, environment, "--sensitive", "--force", "--yes"],
    {
      cwd: root,
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    },
  );
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const leaked = value && combined.includes(value);
  if (leaked) {
    console.error(`${name} ${environment}: vercel output contained a secret; omitted`);
  } else {
    const safe = combined
      .split(/\r?\n/)
      .filter((line) => line && !/value|token|key|secret|jwt|eyJ/i.test(line) || /Added|Updated|Retriev|Production|Preview|Created|Overwrit/i.test(line))
      .slice(0, 8)
      .join(" | ");
    console.log(`${name} ${environment}: exit=${result.status} ${safe}`);
  }
  if (result.status !== 0) process.exitCode = 1;
}

for (const [name, value] of incoming) {
  addVercel(name, value, "production");
  addVercel(name, value, "preview");
}
