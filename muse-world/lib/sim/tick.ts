import type {
  MuseActivity,
  MuseId,
  MuseState,
  WorldEvent,
  WorldEventKind,
  WorldSnapshot,
} from "@/types/world";
import { assertNever } from "@/types/world";

export type Pulse = {
  kind: WorldEventKind | "QUIET";
  ticker: string | null;
};

const THOUGHTS: Record<MuseId, string[]> = {
  scroller: [
    "mid",
    "wait",
    "why is everyone posting this",
    "this is moving",
    "who launched this",
    "checking replies",
    "seen this before",
  ],
  trader: [
    "volume?",
    "checking",
    "send to grok",
    "watching",
    "might be early",
    "nah",
    "interesting",
  ],
  chill: ["…", "nah", "later", "window", "smoke", "they can have it"],
  builder: [
    "thread this",
    "same structure",
    "card it",
    "send to trader",
    "thesis forming",
    "weak evidence",
  ],
};

const TICKERS = ["PAID", "WIF", "BONK", "PINT", "JUP", "PENGU"];

export function pickTicker(fallback: string | null): string {
  return fallback ?? TICKERS[Math.floor(Math.random() * TICKERS.length)] ?? "WIF";
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function nudge(value: number, delta: number): number {
  return clamp01(value + delta);
}

function eventId(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pushEvent(
  events: WorldEvent[],
  kind: WorldEventKind,
  text: string,
  museId: MuseId | null,
  source: WorldEvent["source"] = "world",
): WorldEvent[] {
  return [
    {
      id: eventId(),
      kind,
      museId,
      text,
      at: Date.now(),
      source,
    },
    ...events,
  ].slice(0, 24);
}

export function setThought(muse: MuseState, text: string, ms = 2600): MuseState {
  return { ...muse, thought: text, thoughtUntil: Date.now() + ms };
}

function clearExpiredThought(muse: MuseState, now: number): MuseState {
  if (muse.thought && muse.thoughtUntil < now) {
    return { ...muse, thought: null };
  }
  return muse;
}

function walkToward(
  muse: MuseState,
  target: [number, number, number],
  speed: number,
): MuseState {
  const [x, y, z] = muse.position;
  const dx = target[0] - x;
  const dz = target[2] - z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    return { ...muse, activity: "CHILLING", position: target };
  }
  return {
    ...muse,
    activity: "WALKING",
    facing: Math.atan2(dx, dz),
    position: [x + (dx / dist) * speed, y, z + (dz / dist) * speed],
  };
}

function nextActivity(muse: MuseState, pulse: boolean): MuseActivity {
  switch (muse.id) {
    case "scroller":
      if (pulse && Math.random() < 0.55) return "REACTING";
      return Math.random() < 0.88 ? "SCROLLING" : "THINKING";
    case "trader":
      if (pulse) return "THINKING";
      if (Math.random() < 0.45) return "WATCHING";
      if (Math.random() < 0.72) return "TRADING";
      return "THINKING";
    case "chill":
      if (Math.random() < 0.4) return "WALKING";
      if (Math.random() < 0.58) return "SMOKING";
      if (Math.random() < 0.86) return "CHILLING";
      return "WATCHING";
    case "builder":
      if (pulse && Math.random() < 0.4) return "REACTING";
      return Math.random() < 0.74 ? "RESEARCHING" : "THINKING";
    default:
      return assertNever(muse.id);
  }
}

export function applyActivity(
  muse: MuseState,
  activity: MuseActivity,
  ticker: string,
): MuseState {
  const mind = { ...muse.mind, nodes: { ...muse.mind.nodes } };
  mind.nodes.GROK = nudge(mind.nodes.GROK, -0.016);
  switch (activity) {
    case "SCROLLING":
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, 0.04);
      mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, -0.03);
      mind.observed = "timeline noise";
      break;
    case "THINKING":
      mind.nodes.CURIOSITY = nudge(mind.nodes.CURIOSITY, 0.06);
      mind.nodes.GROK = nudge(mind.nodes.GROK, muse.id === "trader" ? 0.11 : 0.035);
      mind.observed = `weighing ${ticker}`;
      break;
    case "WATCHING":
      mind.watching = ticker;
      mind.action = "WATCH";
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, 0.05);
      if (muse.id === "trader") {
        mind.nodes.GROK = nudge(mind.nodes.GROK, 0.04);
      }
      break;
    case "TRADING":
      mind.nodes.RISK = nudge(mind.nodes.RISK, 0.04);
      mind.nodes.CONVICTION = nudge(mind.nodes.CONVICTION, 0.03);
      mind.action = mind.nodes.CONVICTION > 0.62 ? "HOLD" : "WATCH";
      break;
    case "RESEARCHING":
      mind.nodes.MEMORY = nudge(mind.nodes.MEMORY, 0.05);
      mind.memory = `notes on ${ticker}`;
      break;
    case "CHILLING":
    case "SMOKING":
    case "IDLE":
      mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, 0.05);
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, -0.04);
      mind.action = "IDLE";
      break;
    case "WALKING":
      mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, -0.02);
      break;
    case "TALKING":
    case "REACTING":
      mind.nodes.SOCIAL = nudge(mind.nodes.SOCIAL, 0.08);
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, 0.1);
      break;
    default:
      return assertNever(activity);
  }
  return { ...muse, activity, mind };
}

function chillHome(now: number): [number, number, number] {
  const cycle = Math.floor(now / 14000) % 3;
  if (cycle === 0) return [-1.6, 0.62, 3.5];
  if (cycle === 1) return [-5.4, 0.62, 2.2];
  return [-3.1, 0.62, 4.2];
}

export function tickSnapshot(
  world: WorldSnapshot,
  pulse: Pulse,
): WorldSnapshot {
  const now = Date.now();
  const ticker = pickTicker(pulse.ticker);
  const spiked = pulse.kind === "TREND_SPIKE" || pulse.kind === "VIRAL_POST";
  let events = world.events;
  let packet = world.packet && now - world.packet.t < 2400 ? world.packet : null;
  const muses = { ...world.muses };

  if (spiked && Math.random() < 0.65) {
    events = pushEvent(events, pulse.kind === "QUIET" ? "VIRAL_POST" : pulse.kind, `tape leans ${ticker}`, "scroller");
  }

  for (const id of Object.keys(muses) as MuseId[]) {
    let muse = clearExpiredThought(muses[id], now);
    if (muse.id === "chill" && (muse.activity === "WALKING" || Math.random() < 0.3)) {
      muse = walkToward(muse, chillHome(now), 0.07);
    } else {
      muse = applyActivity(muse, nextActivity(muse, spiked), ticker);
    }
    if (Math.random() < 0.16) {
      const line = pick(THOUGHTS[muse.id]);
      muse = setThought(muse, line);
      if (line === "send to grok") {
        muse = {
          ...muse,
          mind: {
            ...muse.mind,
            nodes: { ...muse.mind.nodes, GROK: nudge(muse.mind.nodes.GROK, 0.42) },
          },
        };
      }
    }
    muses[id] = muse;
  }

  if (spiked && Math.random() < 0.55) {
    packet = { from: "scroller", to: "trader", label: ticker, t: now };
    events = pushEvent(
      events,
      "NEW_DISCOVERY",
      `${muses.scroller.name} discovered $${ticker}`,
      "scroller",
    );
    muses.trader = applyActivity(
      {
        ...muses.trader,
        mind: {
          ...muses.trader.mind,
          observed: `volume accelerating on ${ticker}`,
          memory: `saw ${ticker} just now`,
          watching: ticker,
        },
      },
      "REACTING",
      ticker,
    );
    muses.scroller = setThought(muses.scroller, "send to trader");
  }

  if (muses.builder.activity === "RESEARCHING" && Math.random() < 0.12) {
    events = pushEvent(
      events,
      "THESIS_CREATED",
      `${muses.builder.name} pinned a card on ${ticker}`,
      "builder",
    );
    packet = { from: "builder", to: "trader", label: ticker, t: now };
    muses.builder = setThought(muses.builder, "card it");
  }

  if (muses.chill.mind.nodes.BOREDOM > 0.7 && Math.random() < 0.2) {
    events = pushEvent(events, "BOREDOM", `${muses.chill.name} does not care`, "chill");
  }

  return { ...world, muses, events, packet };
}
