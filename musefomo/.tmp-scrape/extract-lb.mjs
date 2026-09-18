import fs from "fs";

const html = fs.readFileSync(".tmp-scrape/fomoscan-lb.html", "utf8");

const pushes = [...html.matchAll(/self\.__next_f\.push\(\[(\d+),("[\s\S]*?")\]\)/g)];
let blob = "";
for (const push of pushes) {
  try {
    blob += JSON.parse(push[2]);
  } catch {
    blob += push[2];
  }
}
fs.writeFileSync(".tmp-scrape/fomoscan-lb-blob.txt", blob);
console.log("blob", blob.length, "pushes", pushes.length);

const idx = blob.indexOf("thesis");
console.log("first thesis idx", idx);
if (idx >= 0) console.log(blob.slice(Math.max(0, idx - 200), idx + 400));

const handleIdx = blob.indexOf("Napoleone");
console.log("napoleone idx", handleIdx);
if (handleIdx >= 0) console.log(blob.slice(Math.max(0, handleIdx - 200), handleIdx + 400));

const pnlIdx = blob.indexOf("pnlUsd");
console.log("pnlUsd idx", pnlIdx);
if (pnlIdx >= 0) console.log(blob.slice(Math.max(0, pnlIdx - 200), pnlIdx + 400));

console.log("thesis count in blob", (blob.match(/thesis/g) || []).length);
console.log("handle count", (blob.match(/handle/g) || []).length);
console.log("visible thesis snippets in html:");
let from = 0;
let n = 0;
while (n < 6) {
  const i = html.indexOf("thesis", from);
  if (i < 0) break;
  console.log("---", html.slice(Math.max(0, i - 80), i + 160).replace(/\s+/g, " "));
  from = i + 6;
  n += 1;
}
