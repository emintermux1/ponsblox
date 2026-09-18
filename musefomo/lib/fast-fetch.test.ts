import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { raceTimeout } from "./fast-fetch";

describe("raceTimeout", () => {
  it("cancels a leftover thenable when the budget expires", async () => {
    let cancelled = 0;
    const work = Object.assign(new Promise<string>(() => undefined), {
      cancel() {
        cancelled += 1;
      },
    });
    const started = Date.now();
    const value = await raceTimeout(work, "empty", 40);
    assert.equal(value, "empty");
    assert.ok(cancelled >= 1);
    assert.ok(Date.now() - started < 200);
  });
});
