import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function parseEnv(source) {
  const out = {};
  for (const line of source.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    out[line.slice(0, index)] = line.slice(index + 1);
  }
  return out;
}

const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const names = [
  "PRIVY_AUTHORIZATION_PRIVATE_KEY",
  "PRIVY_AUTHORIZATION_KEY_ID",
  "NEXT_PUBLIC_APP_URL",
];
env.NEXT_PUBLIC_APP_URL = "https://musefomo.family";

for (const name of names) {
  const value = env[name];
  if (!value) {
    process.stdout.write(`${name} missing\n`);
    continue;
  }
  for (const target of ["production", "preview"]) {
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
        name.startsWith("NEXT_PUBLIC_") ? "--no-sensitive" : "--sensitive",
      ],
      { input: value, encoding: "utf8", shell: true },
    );
    process.stdout.write(`${name} ${target} ${result.status === 0 ? "ok" : "fail"}\n`);
  }
}
