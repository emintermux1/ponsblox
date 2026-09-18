import fs from "fs";

const blob = fs.readFileSync(".tmp-scrape/fomoscan-lb-blob.txt", "utf8");
for (const key of ["24h", "24H", "7d", "7D", "30d", "30D", "all", "best", "traders"]) {
  console.log(key, blob.indexOf(`"${key}":`), blob.indexOf(`"${key}":{`), blob.indexOf(`"${key}":[`));
}
console.log("sample around 24", blob.slice(Math.max(0, blob.indexOf("24") - 40), blob.indexOf("24") + 80));
const keys = [...blob.matchAll(/"([a-zA-Z0-9]{2,8})":\{/g)].map((m) => m[1]);
console.log("object keys", [...new Set(keys)].slice(0, 40));
