import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyMind } from "./defaults";
import {
  clamp01,
  grokSignalLive,
  nodePulse,
  projectMindNode,
  signalCadence,
} from "./mind-graph";

test("nodePulse rises with value and stays bounded", () => {
  const low = nodePulse(0.1, 0.4, 0);
  const high = nodePulse(0.9, 0.4, 0);
  assert.ok(high > low);
  assert.ok(low > 0 && high < 2.2);
});

test("signalCadence is faster when GROK is live", () => {
  assert.ok(signalCadence(0.7, true) < signalCadence(0.7, false));
  assert.ok(signalCadence(0.9, true) < signalCadence(0.1, true));
});

test("grokSignalLive is a status, not a transcript", () => {
  const idle = emptyMind("find asymmetric setups");
  assert.equal(grokSignalLive(idle), false);
  idle.nodes.GROK = 0.4;
  assert.equal(grokSignalLive(idle), true);
  idle.nodes.GROK = 0.1;
  idle.grok = "WATCH";
  assert.equal(grokSignalLive(idle), true);
});

test("projectMindNode keeps GROK and ACTION on the map", () => {
  const grok = projectMindNode("GROK", 220, 158);
  const action = projectMindNode("ACTION", 220, 158);
  assert.ok(grok.x > 0 && grok.x < 220 && grok.y > 0 && grok.y < 158);
  assert.ok(action.x > 0 && action.x < 220 && action.y > 0 && action.y < 158);
  assert.ok(clamp01(1.4) === 1 && clamp01(-0.2) === 0);
});
