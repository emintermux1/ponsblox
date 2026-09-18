import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatChange,
  quietScreenPulse,
  sanitizeScreenPulse,
  screenView,
} from "./screen-texture.ts";

describe("screen pulse", () => {
  it("stays lit in SIM without inventing a ticker or fill", () => {
    const view = screenView(quietScreenPulse());
    assert.equal(view.lit, true);
    assert.equal(view.title, "SIM");
    assert.equal(view.change, "—");
    assert.equal(view.mark, "SIM");
    assert.notEqual(view.title, "PAID");
    assert.notEqual(view.title, "$PAID");
  });

  it("shows a live name and change", () => {
    const view = screenView({
      ticker: "WIF",
      name: "dogwifhat",
      changePct: 4.2,
      source: "gecko",
    });
    assert.equal(view.lit, true);
    assert.equal(view.title, "dogwifhat");
    assert.equal(view.change, "+4.20%");
    assert.equal(view.changeTone, "up");
    assert.equal(view.mark, "REAL");
    assert.equal(formatChange(-1.5), "-1.50%");
  });

  it("never paints PAID or pad-coin spam", () => {
    const paid = screenView(
      sanitizeScreenPulse({
        ticker: "$PAID",
        name: "PAID",
        changePct: 80,
        source: "gecko",
      }),
    );
    assert.equal(paid.lit, true);
    assert.notEqual(paid.title, "PAID");
    assert.notEqual(paid.title, "$PAID");
    assert.equal(paid.title, "SIM");
    assert.equal(paid.mark, "SIM");

    const pad = sanitizeScreenPulse({
      ticker: "SNAPPAD",
      name: "Snap Pad",
      changePct: 3,
      source: "birdeye",
    });
    assert.equal(pad.ticker, null);
    assert.equal(pad.name, null);

    const dex = screenView({
      ticker: "WIF",
      name: "dogwifhat",
      changePct: 1.25,
      source: "dexscreener",
    });
    assert.equal(dex.lit, true);
    assert.equal(dex.mark, "REAL");
    assert.equal(dex.source, "DEXSCREENER");
  });
});
