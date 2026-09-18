import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatBpsAsPct, formatLamportsAsSol, MISSING_METRIC, mulDiv, parseDecimal, parseInteger } from "./money";

describe("integer money helpers", () => {
  it("rejects non-integers", () => {
    assert.equal(parseInteger("1.5"), null);
    assert.equal(parseInteger("abc"), null);
    assert.equal(parseInteger("10"), 10n);
  });

  it("parses decimals by truncation", () => {
    assert.equal(parseDecimal("1.999", 2), 199n);
    assert.equal(parseDecimal("1.9", 2), 190n);
  });

  it("formats missing metrics as --", () => {
    assert.equal(formatLamportsAsSol(null), MISSING_METRIC);
    assert.equal(formatBpsAsPct(null), MISSING_METRIC);
    assert.equal(formatBpsAsPct(10_000n), "100%");
  });

  it("mulDiv stays in bigint", () => {
    assert.equal(mulDiv(1000n, 40n, 100n), 400n);
  });
});
