import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { GET as getEvents } from "../app/api/events/route";
import { POST as ingestGrok } from "../app/api/grok/ingest/route";
import { POST as wakeGrokClick } from "../app/api/grok/wake/route";
import { resetGrokWakeClocksForTests } from "../lib/adapters/grok";
import { seedWorld } from "../lib/world/defaults";
import { getWorld, setWorld } from "../lib/world/store";

const envNames = [
  "GROK_BOT_WEBHOOK_URL",
  "GROK_BOT_WEBHOOK_KEY",
  "GROK_INGEST_SECRET",
  "XAI_API_KEY",
  "XAI_API_URL",
] as const;

const priorEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
const priorWorld = getWorld();

beforeEach(() => {
  resetGrokWakeClocksForTests();
  setWorld(seedWorld());
});

afterEach(() => {
  mock.restoreAll();
  resetGrokWakeClocksForTests();
  setWorld(priorWorld);
  for (const name of envNames) {
    const value = priorEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

function clearOptionalApis() {
  for (const name of envNames) {
    delete process.env[name];
  }
}

describe("visible grok wake API", () => {
  it("click wake without keys writes a labeled SIM loft thought", async () => {
    clearOptionalApis();
    setWorld(seedWorld());
    mock.method(globalThis, "fetch", async () => {
      throw new Error("click wake must not invent a live call without keys");
    });

    const response = await wakeGrokClick(
      new Request("http://localhost/api/grok/wake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ museId: "trader", goal: "context", observation: "quiet" }),
      }),
    );
    const body = (await response.json()) as {
      reason?: string;
      source?: string;
      thought?: string;
      reply?: { source?: string };
    };

    assert.equal(response.status, 200);
    assert.equal(body.reason, "click");
    assert.equal(body.source, "sim");
    assert.equal(body.reply?.source, "sim");
    assert.match(body.thought ?? "", /^SIM · /);
    assert.equal(getWorld().events[0]?.source, "sim");
    assert.notEqual(getWorld().events[0]?.source, "bot");
  });

  it("click wake with XAI_API_KEY writes an xai/REAL caption", async () => {
    clearOptionalApis();
    setWorld(seedWorld());
    process.env.XAI_API_KEY = "test-xai-fixture";
    process.env.XAI_API_URL = "https://xai.test";
    mock.method(globalThis, "fetch", async () => {
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "thin book, PASS" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const response = await wakeGrokClick(
      new Request("http://localhost/api/grok/wake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ museId: "scroller", observation: "WIF is in the room" }),
      }),
    );
    const body = (await response.json()) as {
      source?: string;
      thought?: string;
      xai?: { source?: string; summary?: string };
    };

    assert.equal(response.status, 200);
    assert.equal(body.source, "xai");
    assert.equal(body.xai?.source, "xai");
    assert.equal(body.thought, "xai/REAL · thin book, PASS");
    assert.equal(getWorld().muses.scroller.thought, "xai/REAL · thin book, PASS");
    assert.equal(getWorld().events[0]?.source, "xai");
    assert.match(getWorld().events[0]?.text ?? "", /xai\/REAL/);
  });

  it("interval events wake writes a loft thought without inventing Bot text", async () => {
    clearOptionalApis();
    setWorld(seedWorld());
    mock.method(globalThis, "fetch", async () => {
      throw new Error("interval market/grok fixture failure");
    });

    const response = await getEvents();
    assert.equal(response.status, 200);
    const thought = getWorld().muses.trader.thought;
    assert.match(thought ?? "", /^SIM · /);
    const grokEvent = getWorld().events.find((event) => event.kind === "GROK_REQUESTED");
    assert.ok(grokEvent);
    assert.equal(grokEvent?.source, "sim");
    assert.notEqual(grokEvent?.source, "bot");
  });

  it("ingest is the only Bot text and becomes a loft caption", async () => {
    clearOptionalApis();
    setWorld(seedWorld());
    process.env.GROK_INGEST_SECRET = "test-ingest-fixture";

    const response = await ingestGrok(
      new Request("http://localhost/api/grok/ingest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-muse-ingest": "test-ingest-fixture",
        },
        body: JSON.stringify({ museId: "builder", summary: "thin book, WATCH" }),
      }),
    );
    const body = (await response.json()) as { ok?: boolean; source?: string };
    assert.equal(response.status, 200);
    assert.equal(body.source, "bot");
    assert.equal(getWorld().muses.builder.thought, "bot/REAL · thin book, WATCH");
    assert.equal(getWorld().events[0]?.source, "bot");
    assert.match(getWorld().events[0]?.text ?? "", /bot\/REAL/);
  });
});
