import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../lib/db.ts", import.meta.url);
let source = readFileSync(path, "utf8");
source = source.replaceAll("await sql()`", "await db()`");
source = source.replace(/await sql<([A-Za-z0-9_]+)\[\]>`/g, "await rows<$1>(db()`");
source = source.replace(
  /await rows<([A-Za-z0-9_]+)>\(db\(\)`([\s\S]*?)`;/g,
  "await rows<$1>(db()`$2`);",
);
writeFileSync(path, source);
console.log("ok");
