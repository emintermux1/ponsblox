import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dexEmbedSrc, dexPairAddress } from "./dex-embed";

describe("DexScreener embed", () => {
  it("builds a solana embed from a real pair, never a fake ticker page", () => {
    const pair = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
    assert.equal(dexPairAddress(pair), pair);
    assert.equal(
      dexEmbedSrc({ pairAddress: pair }),
      `https://dexscreener.com/solana/${pair}?embed=1&theme=dark&trades=0&info=0`,
    );
    assert.match(dexEmbedSrc({ pairAddress: pair }) ?? "", /dexscreener\.com/);
    assert.equal(dexPairAddress("Catecoin"), null);
    assert.equal(dexPairAddress("PAID"), null);
    assert.equal(dexEmbedSrc({ pairAddress: "PAID", mint: "WIF" }), null);
  });
});
