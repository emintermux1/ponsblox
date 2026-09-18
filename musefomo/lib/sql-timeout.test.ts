import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cancelQuery, queryRowsBudget } from "./sql-timeout";

describe("sql timeout", () => {
  it("cancels a leftover query when the budget expires", async () => {
    let cancelled = 0;
    const query = Object.assign(new Promise<unknown[]>(() => undefined), {
      cancel() {
        cancelled += 1;
      },
    });
    const started = Date.now();
    const rows = await queryRowsBudget<{ id: string }>(query, 40);
    assert.deepEqual(rows, []);
    assert.equal(cancelled, 1);
    assert.ok(Date.now() - started < 200);
  });

  it("does not cancel after the query already settled", async () => {
    let cancelled = 0;
    const query = Object.assign(Promise.resolve([{ id: "1" }]), {
      cancel() {
        cancelled += 1;
      },
    });
    const rows = await queryRowsBudget<{ id: string }>(query, 80);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(rows, [{ id: "1" }]);
    assert.equal(cancelled, 0);
  });

  it("ignores values that are not cancellable", () => {
    cancelQuery(null);
    cancelQuery({});
    cancelQuery(Promise.resolve(1));
  });
});
