import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { thesesFromFamilyHtml } from "./family-harvest";

function card(slug: string, title: string, desc: string, date: string) {
  return `<a href="/blog/learn/${slug}" data-discover="true"><div class="text-2xl text-text-primary mt-1 font-bold">${title}</div><div class="text-base font-normal text-text-secondary mt-2 leading-snug">${desc}</div><div class="text-text-secondary ml-3">${date}</div></a>`;
}

const LEARN_INDEX = `</head><body>
${card("logjam-meme-coin-penguin-trade", "How a Meme Coin Trader Turned a Gut Feeling Into a 6-Figure Win", "Crypto trader Logjam breaks down his epic Penguin meme coin trade on Solana, sharing lessons on patience.", "February 12, 2026")}
${card("chang-defi-crypto-trading-mistakes-gaming-meta", "Crypto Trading Mistakes with chang_defi", "Robert Chang shares hard-won lessons on crypto trading mistakes and onchain market psychology.", "February 09, 2026")}
${card("printgod-crypto-trading-guide-new-traders", "How Printgod Built His Crypto Trading Career From Zero: A New Trader's Guide", "Learn how crypto trader Printgod started with $1,000 from a part-time job and developed profitable trading strategies.", "January 22, 2026")}
</body>`;

describe("family harvest rejects blog/learn cards", () => {
  it("does not turn /blog/learn cards into theses", () => {
    assert.equal(thesesFromFamilyHtml(LEARN_INDEX).length, 0);
    assert.equal(thesesFromFamilyHtml("<p>no cards</p>").length, 0);
  });

  it("keeps a real thesis JSON body from public HTML", () => {
    const rows = thesesFromFamilyHtml(
      `{"id":"t1","authorHandle":"kaiser","authorName":"Kaiser","thesis":"fade this pump on SOL"}`,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.authorHandle, "kaiser");
    assert.equal(rows[0]?.thesis, "fade this pump on SOL");
  });
});
