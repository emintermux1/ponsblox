import fs from "fs";

function flightBlob(html) {
  const pushes = [...html.matchAll(/self\.__next_f\.push\(\[(\d+),("[\s\S]*?")\]\)/g)];
  let blob = "";
  for (const push of pushes) {
    try {
      blob += JSON.parse(push[2]);
    } catch {
      blob += push[2];
    }
  }
  return blob;
}

const files = [
  "fs-theses.html",
  "fs-traders.html",
  "wc-nap.html",
  "wc-human.html",
  "wc-late.html",
];

for (const name of files) {
  const html = fs.readFileSync(`.tmp-scrape/${name}`, "utf8");
  const blob = flightBlob(html);
  fs.writeFileSync(`.tmp-scrape/${name}.blob.txt`, blob);
  const keys = ["thesis", "note", "caption", "text", "body", "content", "handle", "Napoleone", "tokenSymbol", "author"];
  const counts = Object.fromEntries(keys.map((k) => [k, (blob.match(new RegExp(k, "g")) || []).length]));
  console.log("===", name, "blob", blob.length, counts);
  const title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
  console.log("title", title);
  const h1 = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  console.log("heads", h1.slice(0, 6));
}
