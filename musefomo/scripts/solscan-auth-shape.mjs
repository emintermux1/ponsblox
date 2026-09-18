import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(import.meta.dirname, "..", ".env.local");
if (!existsSync(path)) {
  console.log(JSON.stringify({ present: false }));
  process.exit(1);
}
let value = "";
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  if (line.startsWith("SOLSCAN_API_KEY=")) {
    value = line.slice("SOLSCAN_API_KEY=".length);
    break;
  }
}
const trimmed = value.trim();
console.log(
  JSON.stringify({
    present: Boolean(trimmed),
    length: trimmed.length,
    jwtShape: trimmed.startsWith("eyJ") && trimmed.split(".").length === 3,
    hasWhitespace: /\s/.test(value),
    quoted: (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")),
  }),
);
