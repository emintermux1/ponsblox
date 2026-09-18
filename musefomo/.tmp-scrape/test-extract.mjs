import fs from "fs";

const blob = fs.readFileSync(".tmp-scrape/fomoscan-lb-blob.txt", "utf8");
const parts = blob.split('{"handle":"').slice(1);
console.log("handle parts", parts.length);
let withPnl = 0;
const handles = [];
for (const part of parts) {
  const handle = part.slice(0, part.indexOf('"'));
  const pnlUsd = Number(/"pnlUsd":(-?[0-9.]+)/.exec(part)?.[1] ?? NaN);
  if (Number.isFinite(pnlUsd)) {
    withPnl += 1;
    handles.push([handle, pnlUsd]);
  }
}
console.log("with pnl", withPnl);
console.log(handles.slice(0, 12));

const thesisParts = blob.split('"thesis":"').length - 1;
console.log("thesis quoted", thesisParts);
console.log("24h slice len", (() => {
  const start = blob.indexOf('"24h":{');
  return blob.slice(start, start + 500);
})());
