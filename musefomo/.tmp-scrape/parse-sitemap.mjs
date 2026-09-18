import fs from "fs";

const xml = fs.readFileSync(".tmp-scrape/family-sitemap.xml", "utf8");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log("locs", locs.length);
const interesting = locs.filter((u) => /profile|thesis|feed|leader|blog|recap|print|learn/i.test(u));
console.log("interesting", interesting.length);
for (const u of interesting.slice(0, 80)) console.log(u);
const profiles = locs.filter((u) => /\/profile\//i.test(u));
console.log("profiles", profiles.length);
for (const u of profiles.slice(0, 40)) console.log(u);
const theses = locs.filter((u) => /thesis/i.test(u));
console.log("thesis urls", theses.length);
for (const u of theses.slice(0, 40)) console.log(u);
