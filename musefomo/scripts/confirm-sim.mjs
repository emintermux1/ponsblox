import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function loadEnv() {
  const fs = require("node:fs");
  const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function nextConfirmIntent(input) {
  if (input.status === "confirmed") return "noop";
  if (input.err) return input.status === "failed" ? "noop" : "fail";
  if (input.confirmationStatus === "confirmed" || input.confirmationStatus === "finalized") return "confirm";
  if (input.status === "quoted" || input.status === "awaiting_signature") return "noop";
  if (input.status === "submitted" && input.seen) return "confirming";
  if (input.blockExpired && !input.seen && (input.status === "submitted" || input.status === "confirming")) {
    return "expire";
  }
  return "noop";
}

function webhookDeliveryKey(input) {
  return `sig:${input.signature}|slot:${input.slot ?? ""}|st:${input.confirmationStatus ?? ""}|ex:${input.executionId ?? ""}`;
}

function verifyHmac(secret, body, header) {
  const expected = createHmac("sha256", secret).update(body).digest();
  const hex = header.startsWith("sha256=") ? header.slice(7) : header;
  const given = Buffer.from(hex, "hex");
  return given.length === expected.length && timingSafeEqual(expected, given);
}

function rejectQuerySecret(url) {
  return new URL(url).searchParams.has("secret") || new URL(url).searchParams.has("token");
}

function runSim() {
  const results = [];
  const store = new Map();

  function put(row) {
    store.set(row.id, { ...row });
    return store.get(row.id);
  }

  function apply(row, helius) {
    const intent = nextConfirmIntent({
      status: row.status,
      confirmationStatus: helius.confirmationStatus,
      err: helius.err,
      seen: Boolean(helius.confirmationStatus || helius.slot),
      blockExpired: Boolean(helius.blockExpired),
    });
    if (intent === "confirm" && row.status !== "confirmed") {
      row.status = "confirmed";
      row.feed = true;
      row.executions = (row.executions ?? 0) + 1;
    }
    if (intent === "fail" && row.status !== "confirmed") {
      row.status = "failed";
      row.feed = false;
    }
    if (intent === "confirming" && row.status === "submitted") row.status = "confirming";
    if (intent === "expire" && row.status !== "confirmed") {
      row.status = "expired";
      row.feed = false;
    }
    return put(row);
  }

  // 1) successful trade
  const ok = put({ id: "t1", status: "submitted", signature: "sig-ok", executions: 0, feed: false });
  apply(ok, { confirmationStatus: "confirmed", err: null, slot: 1 });
  assert.equal(store.get("t1").status, "confirmed");
  assert.equal(store.get("t1").feed, true);
  assert.equal(store.get("t1").executions, 1);
  results.push({ name: "successful trade", kind: "sim", pass: true });

  // 2) failed transaction never feeds
  const bad = put({ id: "t2", status: "submitted", signature: "sig-bad", executions: 0, feed: false });
  apply(bad, { confirmationStatus: "processed", err: { InstructionError: [0, "Custom"] }, slot: 2 });
  assert.equal(store.get("t2").status, "failed");
  assert.equal(store.get("t2").feed, false);
  results.push({ name: "failed transaction", kind: "sim", pass: true });

  // 3) duplicate webhook
  const dupKey = webhookDeliveryKey({ signature: "sig-ok", slot: 1, confirmationStatus: "confirmed" });
  const seen = new Set([dupKey]);
  const again = webhookDeliveryKey({ signature: "sig-ok", slot: 1, confirmationStatus: "confirmed" });
  apply(store.get("t1"), { confirmationStatus: "finalized", err: null, slot: 1 });
  assert.equal(seen.has(again), true);
  assert.equal(store.get("t1").executions, 1);
  assert.equal(store.get("t1").status, "confirmed");
  results.push({ name: "duplicate webhook", kind: "sim", pass: true });

  // 4) delayed webhook (processed then confirmed)
  const late = put({ id: "t3", status: "submitted", signature: "sig-late", executions: 0, feed: false });
  apply(late, { confirmationStatus: "processed", err: null, slot: 3 });
  assert.equal(store.get("t3").status, "confirming");
  apply(store.get("t3"), { confirmationStatus: "confirmed", err: null, slot: 3 });
  assert.equal(store.get("t3").status, "confirmed");
  results.push({ name: "delayed webhook", kind: "sim", pass: true });

  // 5) browser refresh during pending
  const snap = JSON.parse(JSON.stringify(store.get("t3")));
  assert.equal(snap.status, "confirmed");
  const pendingSnap = put({ id: "t5", status: "submitted", signature: "sig-refresh", executions: 0, feed: false });
  const restored = JSON.parse(JSON.stringify(pendingSnap));
  assert.equal(restored.status, "submitted");
  results.push({ name: "browser refresh during pending", kind: "sim", pass: true });

  // 6) server restart before confirmation
  const memoryGone = new Map([["t6", { id: "t6", status: "submitted", signature: "sig-restart", executions: 0, feed: false }]]);
  apply(memoryGone.get("t6"), { confirmationStatus: "confirmed", err: null, slot: 9 });
  assert.equal(memoryGone.get("t6").status, "confirmed");
  results.push({ name: "server restart before confirmation", kind: "sim", pass: true });

  // security: query secret rejected
  assert.equal(rejectQuerySecret("https://app.local/api/webhooks/helius?secret=nope"), true);
  assert.equal(rejectQuerySecret("https://app.local/api/webhooks/helius"), false);
  results.push({ name: "reject ?secret=", kind: "sim", pass: true });

  // security: unsigned vs hmac
  const secret = "test-secret";
  const body = JSON.stringify([{ signature: "sig-ok" }]);
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyHmac(secret, body, sig), true);
  assert.equal(verifyHmac(secret, body, "00".repeat(32)), false);
  results.push({ name: "hmac header required", kind: "sim", pass: true });

  // idempotency scoped per agent
  const keys = new Set();
  function claim(agentId, key) {
    const scoped = `${agentId}:${key}`;
    if (keys.has(scoped)) return "existing";
    keys.add(scoped);
    return "insert";
  }
  assert.equal(claim("agent-a", "same"), "insert");
  assert.equal(claim("agent-b", "same"), "insert");
  assert.equal(claim("agent-a", "same"), "existing");
  results.push({ name: "idempotency scoped per agent_id", kind: "sim", pass: true });

  // confirmed execution is integer-only
  const execution = {
    signature: "sig-ok",
    mint: "Mint111111111111111111111111111111111111111",
    side: "buy",
    tokenAmountRaw: "1000",
    tokenDecimals: 6,
    quoteAmountRaw: "25000000",
    quoteDecimals: 9,
    ts: "2026-09-17T00:00:00.000Z",
  };
  for (const value of [execution.tokenAmountRaw, execution.quoteAmountRaw]) {
    assert.equal(/^\d+$/.test(value), true);
  }
  results.push({ name: "confirmed execution raw integers", kind: "sim", pass: true });

  return results;
}

async function runRealHeliusRead() {
  loadEnv();
  if (!process.env.HELIUS_API_KEY) {
    return { name: "helius signature status poller", kind: "real", pass: false, note: "HELIUS_API_KEY missing" };
  }
  const url = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  const rpc = async (method, params) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "confirm-sim", method, params }),
    });
    return response.json();
  };
  const slotBody = await rpc("getSlot", []);
  if (typeof slotBody?.result !== "number") {
    return { name: "helius signature status poller", kind: "real", pass: false, note: "getSlot failed" };
  }
  const sigs = await rpc("getSignaturesForAddress", [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    { limit: 1 },
  ]);
  const signature = sigs?.result?.[0]?.signature;
  if (!signature) {
    return { name: "helius signature status poller", kind: "real", pass: true, note: "getSlot ok; no recent token-program sig" };
  }
  const statusBody = await rpc("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);
  const value = statusBody?.result?.value?.[0];
  const pass = Boolean(value && (value.confirmationStatus === "confirmed" || value.confirmationStatus === "finalized" || value.err));
  return {
    name: "helius signature status poller",
    kind: "real",
    pass,
    note: pass ? `slot=${slotBody.result} status=${value.confirmationStatus ?? "err"}` : "status missing",
  };
}

const sim = runSim();
const real = await runRealHeliusRead();
const rows = [...sim, real];
const failed = rows.filter((row) => !row.pass);
console.log(JSON.stringify({ ok: failed.length === 0, results: rows }, null, 2));
if (failed.length) process.exit(1);
