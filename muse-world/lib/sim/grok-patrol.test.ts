import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { claimsExecutedFill } from "../adapters/parse";
import { seedWorld } from "../world/defaults";
import { GROK_ORB_POS, nearXZ } from "../world/layout";
import { applyGrokFocus, applyGrokWake } from "../world/pick";
import { tickSnapshot } from "./tick";
import {
  GROK_BODY_HEX,
  GROK_EYE_HEX,
  MUSE_FUR_HEX,
  SIM_TASK_LINE,
  assignSimTask,
  classifyTaskKind,
  grokLeftTheShelf,
  grokOf,
  kindForMuse,
  makeSimTask,
  makeXaiTask,
  mostActiveMuseId,
  nextPatrolId,
  shoulderOf,
  stepGrokWorld,
  taskChipText,
  taskKindLabel,
} from "./grok-patrol";

describe("Grok is not a cream muse", () => {
  it("keeps official white pill-slot chrome off the fur hex", () => {
    assert.equal(GROK_BODY_HEX, "#ffffff");
    assert.equal(GROK_EYE_HEX, "#0a0a0a");
    assert.equal(MUSE_FUR_HEX, "#f3eee4");
    assert.notEqual(GROK_BODY_HEX, MUSE_FUR_HEX);
  });
});

describe("Grok patrol", () => {
  it("leaves the shelf for the most active muse and does not park there", () => {
    const world = seedWorld();
    assert.ok(nearXZ(world.grok.position, GROK_ORB_POS, 0.05));
    assert.equal(mostActiveMuseId(world), "trader");
    let next = world;
    for (let i = 0; i < 8; i += 1) {
      next = stepGrokWorld(next, 1_000 + i * 400, () => 0.1);
    }
    assert.equal(grokLeftTheShelf(next), true);
    assert.ok(!nearXZ(next.grok.position, GROK_ORB_POS, 0.28));
    const dest = shoulderOf(next.muses.trader);
    assert.ok(
      Math.hypot(
        dest[0] - next.grok.position[0],
        dest[2] - next.grok.position[2],
      ) < 2.2,
    );
  });

  it("hovers, then walks to the next muse", () => {
    let world = seedWorld();
    world = stepGrokWorld(world, 10, () => 0.1);
    const first = world.grok.targetId;
    world = {
      ...world,
      grok: { ...world.grok, hoverUntil: 20, position: shoulderOf(world.muses[first]) },
    };
    const later = stepGrokWorld(world, 30, () => 0.1);
    assert.equal(later.grok.targetId, nextPatrolId(world, first));
    assert.notEqual(later.grok.targetId, first);
  });
});

describe("Grok tasks", () => {
  it("emits a short SIM literary task onto the muse and HUD chip", () => {
    const world = assignSimTask(seedWorld(), "trader", 20_000, () => 0.2);
    const task = world.muses.trader.task;
    assert.ok(task);
    assert.equal(task?.kind, "WATCH_TAPE");
    assert.equal(task?.line, "check the tape");
    assert.equal(task?.source, "sim");
    assert.equal(task?.honesty, "SIM");
    assert.equal(taskChipText(task), "WATCH TAPE · check the tape");
    assert.match(world.muses.trader.thought ?? "", /^SIM · check the tape$/);
    assert.equal(world.packet?.from, "grok");
    assert.equal(world.packet?.to, "trader");
    assert.equal(world.events[0]?.source, "sim");
    assert.notEqual(world.events[0]?.source, "bot");
    assert.doesNotMatch(world.events[0]?.text ?? "", /Grok Bot|bot\/REAL|\$PAID/);
  });

  it("covers the four loft chores", () => {
    assert.equal(taskKindLabel("SCROLL"), "SCROLL");
    assert.equal(taskKindLabel("WATCH_TAPE"), "WATCH TAPE");
    assert.equal(taskKindLabel("PIN_NOTE"), "PIN A NOTE");
    assert.equal(taskKindLabel("CHILL"), "CHILL");
    assert.equal(kindForMuse("scroller"), "SCROLL");
    assert.equal(kindForMuse("builder"), "PIN_NOTE");
    assert.equal(kindForMuse("chill"), "CHILL");
    assert.equal(SIM_TASK_LINE.WATCH_TAPE, "check the tape");
    assert.equal(classifyTaskKind("pin a note for the wall", "CHILL"), "PIN_NOTE");
  });

  it("labels a usable xAI line REAL/xai and never invents fills or Bot", () => {
    const live = makeXaiTask("builder", "pin a note", 3);
    assert.equal(live?.source, "xai");
    assert.equal(live?.honesty, "REAL");
    assert.equal(live?.kind, "PIN_NOTE");
    assert.equal(makeXaiTask("trader", "opened a position on WIF", 4), null);
    assert.equal(makeXaiTask("trader", "let me think through the book", 5), null);
    assert.equal(makeXaiTask("trader", "$PAID", 6), null);
    assert.equal(claimsExecutedFill("executed the trade"), true);
    assert.notEqual(makeSimTask("trader", 7).source, "bot");
  });

  it("click wake assigns immediately, then xAI can upgrade the chip", () => {
    const focused = applyGrokFocus(seedWorld(), "scroller", 40);
    assert.equal(focused.muses.scroller.task?.kind, "SCROLL");
    assert.equal(focused.muses.scroller.task?.source, "sim");
    assert.equal(focused.grokWake.phase, "waking");
    const woken = applyGrokWake(
      focused,
      { reply: { source: "xai", summary: "stay on the feed" } },
      "scroller",
      41,
    );
    assert.equal(woken.muses.scroller.task?.source, "xai");
    assert.equal(woken.muses.scroller.task?.line, "stay on the feed");
    assert.equal(woken.packet?.from, "grok");
    assert.equal(woken.packet?.to, "scroller");
  });

  it("client tick assigns after the interval without fetching", () => {
    const fetchMock = { count: 0 };
    const world = seedWorld();
    const due = world.startedAt + 13_000;
    const next = tickSnapshot(world, { kind: "QUIET", ticker: null }, due, () => 0.15);
    assert.ok(next.grok.task);
    assert.equal(next.grok.task?.source, "sim");
    assert.match(next.grok.task?.line ?? "", /check the tape|stay on the feed|pin a note|let it pass/);
    assert.equal(fetchMock.count, 0);
    assert.doesNotMatch(next.events[0]?.text ?? "", /\$PAID|Grok Bot/);
    assert.ok(grokLeftTheShelf(next) || grokOf(next).targetId);
  });
});
