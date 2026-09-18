import { writeFileSync } from "fs";

const UA = "MuseFOMO/1.0 (+https://musefomo.family)";
const urls = [
  ["wc-nap.html", "https://www.fomoscan.sh/wallet-checker/Napoleone"],
  ["wc-human.html", "https://www.fomoscan.sh/wallet-checker/humanbeingET"],
  ["wc-late.html", "https://www.fomoscan.sh/wallet-checker/LateEarly"],
  ["wc-kaiser.html", "https://www.fomoscan.sh/wallet-checker/xxxxxxxxxxxxxxxxxxxxxxxxx"],
  ["fs-theses.html", "https://www.fomoscan.sh/theses"],
  ["fs-thesis.html", "https://www.fomoscan.sh/thesis"],
  ["fs-feed.html", "https://www.fomoscan.sh/feed"],
  ["fs-traders.html", "https://www.fomoscan.sh/traders"],
  ["fs-profiles.html", "https://www.fomoscan.sh/profiles"],
];

await Promise.all(
  urls.map(async ([name, url]) => {
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/html", "User-Agent": UA },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      writeFileSync(`.tmp-scrape/${name}`, text);
      const thesis = (text.match(/"thesis":/g) || []).length;
      const flights = (text.match(/self\.__next_f\.push/g) || []).length;
      console.log(name, res.status, text.length, "thesis=", thesis, "flights=", flights, url);
    } catch (err) {
      console.log(name, "ERR", err instanceof Error ? err.message : err);
    }
  }),
);
