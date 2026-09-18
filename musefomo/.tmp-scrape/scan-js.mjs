import fs from "fs";

function scan(name) {
  const text = fs.readFileSync(`.tmp-scrape/${name}`, "utf8");
  const urls = [...text.matchAll(/https?:\\?\/\\?\/[a-zA-Z0-9._\/:?&=-]+/g)].map((m) =>
    m[0].replace(/\\\//g, "/"),
  );
  const unique = [...new Set(urls)].filter((u) => /fomo|thesis|feed|leader|api\./i.test(u));
  console.log("===", name, "urls", unique.slice(0, 40));
  const paths = [...text.matchAll(/["'`](\/[a-zA-Z0-9_\-\/{}:]+)["'`]/g)].map((m) => m[1]);
  console.log(
    "paths",
    [...new Set(paths)].filter((p) => /thesis|feed|leader|user|profile|v2/i.test(p)).slice(0, 40),
  );
}

for (const f of ["qc.js", "main.js"]) {
  if (fs.existsSync(`.tmp-scrape/${f}`)) scan(f);
}
