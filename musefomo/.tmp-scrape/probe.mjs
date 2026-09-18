import fs from "fs";

function stats(name, html) {
  const keys = ["thesis", "authorHandle", "__next_f", "__NEXT_DATA__", "pnlUsd", "handle", "Napoleone", "userHandle"];
  const out = { name, len: html.length };
  for (const k of keys) out[k] = (html.match(new RegExp(k, "g")) || []).length;
  const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  out.nextData = nd ? nd[1].length : 0;
  out.flights = (html.match(/self\.__next_f\.push/g) || []).length;
  out.titles = [...html.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
  out.ogDesc = [...html.matchAll(/property="og:description" content="([^"]*)"/g)].map((m) => m[1]).slice(0, 2);
  return out;
}

const files = [
  ".tmp-scrape/fomoscan-home.html",
  ".tmp-scrape/fomoscan-lb.html",
  ".tmp-scrape/fomo-napoleone.html",
  ".tmp-scrape/fomo-human.html",
  ".tmp-probe/fomo-leaderboard.html",
  ".tmp-probe/fomo-profile-lateearly.html",
  ".tmp-probe/fomo-feed.html",
  ".tmp-probe/page-printgod.html",
  ".tmp-probe/page-social.html",
  ".tmp-probe/page-recap.html",
  ".tmp-probe/page-notanicecat.html",
  ".tmp-probe/page-leaderboard-answer.html",
];

for (const p of files) {
  if (!fs.existsSync(p)) {
    console.log("missing", p);
    continue;
  }
  console.log(JSON.stringify(stats(p, fs.readFileSync(p, "utf8"))));
}

if (fs.existsSync(".tmp-scrape/fomo-manifest.js")) {
  const man = fs.readFileSync(".tmp-scrape/fomo-manifest.js", "utf8");
  const ids = [...man.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]);
  const paths = [...man.matchAll(/"path":"([^"]*)"/g)].map((m) => m[1]);
  const modules = [...man.matchAll(/"module":"([^"]+)"/g)].map((m) => m[1]);
  console.log(
    "routeIds",
    ids.filter((id) => /feed|thesis|leader|profile|social|web|recap|print/i.test(id)),
  );
  console.log(
    "paths",
    [...new Set(paths)].filter((p) => /feed|thesis|leader|profile|social|web|recap|print/i.test(p)),
  );
  console.log(
    "modules",
    modules.filter((p) => /feed|thesis|leader|profile|social/i.test(p)).slice(0, 40),
  );
}
