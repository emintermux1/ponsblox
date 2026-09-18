import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isFomoIdentityLookupPaused, looksLikeAgentId, missingMuseAgent } from "./agent-profile";

describe("missing Muse agent status", () => {
  it("Fomo 404 is HTTP not_found without pause", () => {
    const row = missingMuseAgent("does-not-exist", { status: 404, code: "HTTP_404" });
    assert.equal(row.code, "not_found");
    assert.equal(row.reason, "No Muse agent");
    assert.equal(row.fomoLookupPaused, undefined);
  });

  it("Fomo 402/429/5xx/timeout is still not_found, lookup paused", () => {
    assert.equal(isFomoIdentityLookupPaused(402, "QUOTA_EXCEEDED"), true);
    assert.equal(isFomoIdentityLookupPaused(429, "RATE_LIMIT"), true);
    assert.equal(isFomoIdentityLookupPaused(503, "network"), true);
    assert.equal(isFomoIdentityLookupPaused(504, "TIMEOUT"), true);
    const row = missingMuseAgent("does-not-exist", { status: 402, code: "QUOTA_EXCEEDED" });
    assert.equal(row.kind, "unavailable");
    assert.equal(row.code, "not_found");
    assert.equal(row.fomoLookupPaused, true);
  });

  it("Fomo 404 is not a paused lookup", () => {
    assert.equal(isFomoIdentityLookupPaused(404, "not_found"), false);
  });

  it("agent UUIDs are not human profile slugs", () => {
    assert.equal(looksLikeAgentId("a4b59e17-bc3b-45fa-8b4c-80e0ac8e9d19"), true);
    assert.equal(looksLikeAgentId("muse_profile_ui"), false);
  });
});
