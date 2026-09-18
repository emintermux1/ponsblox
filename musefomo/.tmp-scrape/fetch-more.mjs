import { writeFileSync } from "fs";

const UA = "MuseFOMO/1.0 (+https://musefomo.family)";

async function grab(name, url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, ...headers },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    writeFileSync(`.tmp-scrape/${name}`, text);
    console.log(name, res.status, text.length, res.headers.get("content-type"), url);
    return text;
  } catch (err) {
    console.log(name, "ERR", err instanceof Error ? err.message : err, url);
    return "";
  }
}

await Promise.all([
  grab("qc.js", "https://fomo.family/assets/queryClient-v2-BjNKnqPP.js"),
  grab("main.js", "https://fomo.family/assets/main-v2-Byjhel9P.js"),
  grab("family-web.html", "https://fomo.family/web"),
  grab("family-social.html", "https://fomo.family/social"),
  grab("family-prices.html", "https://fomo.family/prices"),
  grab("family-learn.html", "https://fomo.family/learn"),
  grab("family-blog.html", "https://fomo.family/blog"),
  grab("family-sitemap.xml", "https://fomo.family/sitemap.xml"),
  grab("prod-thesis-min.json", "https://prod-api.fomo.family/v2/thesis", {
    Accept: "application/json",
  }),
  grab("prod-feed-min.json", "https://prod-api.fomo.family/v2/feed", { Accept: "application/json" }),
  grab("nap-data.txt", "https://fomo.family/profile/Napoleone.data", {
    Accept: "text/x-component, application/json, text/html",
  }),
  grab("feed-data.txt", "https://fomo.family/feed.data", {
    Accept: "text/x-component, application/json, text/html",
  }),
  grab("feed-rsc.html", "https://fomo.family/feed", {
    Accept: "text/x-component",
    RSC: "1",
    "Next-Url": "/feed",
  }),
]);
