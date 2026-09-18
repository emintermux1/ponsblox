import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  boardsFromPublicHtml,
  extractFamilyProfileHandles,
  extractPublicTheses,
  extractPublicTraders,
  flightBlobFromHtml,
  payloadBlobFromHtml,
  windowSlice,
} from "./public-social";

const html = `<script>self.__next_f.push([1,${JSON.stringify(
  `"24h":{"label":"24H","best":[{"handle":"alpha","displayName":"Alpha","avatar":null,"twitter":null,"followers":12,"pnlUsd":100.5,"volumeUsd":200,"trades":3},{"handle":"beta","displayName":"Beta","avatar":"https://img.example/b.jpg","twitter":null,"followers":4,"pnlUsd":50,"volumeUsd":80,"trades":2}]} "7d":{"label":"7D","best":[{"handle":"gamma","displayName":"Gamma","avatar":null,"twitter":null,"followers":1,"pnlUsd":9,"volumeUsd":11,"trades":1}]}`,
)}])</script>`;

describe("public social harvest", () => {
  it("extracts handle/pnl rows without inventing people", () => {
    const rows = extractPublicTraders(windowSlice(flightBlobFromHtml(html), "24h"));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].handle, "alpha");
    assert.equal(rows[0].pnlUsd, 100.5);
    assert.equal(rows[1].handle, "beta");
  });

  it("splits windows and skips empty ones", () => {
    const boards = boardsFromPublicHtml(html);
    assert.equal(boards["24h"]?.count, 2);
    assert.equal(boards["7d"]?.entries[0]?.handle, "gamma");
    assert.equal(boards["30d"], undefined);
    assert.equal(boards.all, undefined);
  });

  it("keeps only public theses with text and a real author", () => {
    const blob = `{"id":"t1","authorHandle":"alpha","authorName":"Alpha","thesis":"long SOL here","tokenSymbol":"SOL"}`;
    const rows = extractPublicTheses(blob);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].authorHandle, "alpha");
    assert.equal(rows[0].thesis, "long SOL here");
    assert.equal(extractPublicTheses(`{"handle":"ghost","thesis":""}`).length, 0);
    assert.equal(extractPublicTheses(`{"thesis":"no author"}`).length, 0);
  });

  it("reads escaped thesis JSON and family OG handles without inventing text", () => {
    const rows = extractPublicTheses(
      String.raw`{\"id\":\"t2\",\"authorHandle\":\"kaiser\",\"thesis\":\"fade this pump\"}`,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.authorHandle, "kaiser");
    assert.equal(rows[0]?.thesis, "fade this pump");
    assert.deepEqual(
      extractFamilyProfileHandles(
        `<title>@Napoleone on fomo</title><meta property="og:title" content="@LateEarly on fomo"/>`,
      ),
      ["Napoleone", "LateEarly"],
    );
    assert.ok(payloadBlobFromHtml(`<script id="__NEXT_DATA__">{"ok":true}</script>`).includes('"ok":true'));
  });

  it("falls back to loose traders when window keys are present", () => {
    const blob = `"24h":{"label":"24H","best":[{"handle":"Napoleone","displayName":"Napoleone","avatar":null,"twitter":null,"followers":3,"pnlUsd":12.5,"volumeUsd":40,"trades":2}]}`;
    const html = `<script>self.__next_f.push([1,${JSON.stringify(blob)}])</script>`;
    const boards = boardsFromPublicHtml(html);
    assert.equal(boards["24h"]?.entries[0]?.handle, "Napoleone");
  });
});
