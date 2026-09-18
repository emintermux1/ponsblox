import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emptyHomeFeed } from "./feed";

describe("home feed", () => {
  it("does not list directory Muses on For You", () => {
    const feed = emptyHomeFeed("for-you");
    assert.equal(feed.agents.length, 0);
    assert.equal(feed.directory.length, 0);
  });
});
