import { isPaidTicker } from "@/lib/adapters/parse";
import { pickStoryBeat, upsertWallPin, type StoryBeat } from "@/lib/sim/stories";
import { chillHome, PACKET_HOLD_MS } from "@/lib/world/layout";
import { packetNoteForBeat, sanitizePacket, sanitizeWallPins } from "@/lib/world/wall-copy";
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

const TICKERS = ["WIF", "BONK", "PINT", "JUP", "PENGU"];

export function pickTicker(fallback: string | null): string {
  if (fallback && !isPaidTicker(fallback)) {
    return fallback;
  }
  return TICKERS[Math.floor(Math.random() * TICKERS.length)] ?? "WIF";
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function nudge(value: number, delta: number): number {
  return clamp01(value + delta);
}

function eventId(now: number, random: () => number): string {
  return `ev_${now.toString(36)}_${Math.floor(random() * 1_000_000).toString(36)}`;
}

function pushEvent(
  events: WorldEvent[],
  kind: WorldEventKind,
  text: string,
  museId: MuseId | null,
  now: number,
  random: () => number,
  source: WorldEvent["source"] = "world",
): WorldEvent[] {
  if (kind === "POSITION_OPENED" || kind === "POSITION_CLOSED") {
    return events;
  }
  return [
    {
      id: eventId(now, random),
      kind,
      museId,
      text,
      at: now,
      source,
    },
    ...events,
  ].slice(0, 24);
}

export function setThought(muse: MuseState, text: string, ms = 2600, now = Date.now()): MuseState {
  return { ...muse, thought: text, thoughtUntil: now + ms };
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

function nextActivity(muse: MuseState, pulse: boolean, random: () => number): MuseActivity {
  switch (muse.id) {
    case "scroller":
      if (pulse && random() < 0.55) return "REACTING";
      return random() < 0.88 ? "SCROLLING" : "THINKING";
    case "trader":
      if (pulse) return "THINKING";
      if (random() < 0.45) return "WATCHING";
      if (random() < 0.72) return "TRADING";
      return "THINKING";
    case "chill":
      if (muse.mind.nodes.BOREDOM > 0.7 && random() < 0.4) return "WALKING";
      if (random() < 0.4) return "WALKING";
      if (random() < 0.58) return "SMOKING";
      if (random() < 0.86) return "CHILLING";
      return "WATCHING";
    case "builder":
      if (pulse && random() < 0.4) return "REACTING";
      return random() < 0.74 ? "RESEARCHING" : "THINKING";
    default:
      return assertNever(muse.id);
  }
}

export function applyActivity(
  muse: MuseState,
  activity: MuseActivity,
  ticker: string | null,
): MuseState {
  const mind = { ...muse.mind, nodes: { ...muse.mind.nodes } };
  const aboutTicker = ticker && !isPaidTicker(ticker) ? ticker : null;
  const about = aboutTicker ?? "the room";
  if (isPaidTicker(mind.watching)) {
    mind.watching = null;
  }
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
      mind.observed = `weighing ${about}`;
      break;
    case "WATCHING":
      if (aboutTicker) {
        mind.watching = aboutTicker;
      }
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
      mind.memory = `notes on ${about}`;
      break;
    case "CHILLING":
    case "SMOKING":
    case "IDLE":
      mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, 0.05);
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, -0.04);
      mind.nodes.FOMO = nudge(mind.nodes.FOMO, -0.03);
      mind.action = "IDLE";
      break;
    case "WALKING":
      mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, -0.02);
      break;
    case "TALKING":
    case "REACTING":
      mind.nodes.SOCIAL = nudge(mind.nodes.SOCIAL, 0.08);
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, 0.1);
      if (muse.id === "chill") {
        mind.nodes.FOMO = nudge(mind.nodes.FOMO, -0.04);
        mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, 0.03);
      } else {
        mind.nodes.FOMO = nudge(mind.nodes.FOMO, 0.05);
      }
      break;
    default:
      return assertNever(activity);
  }
  return { ...muse, activity, mind };
}

function applyStoryBeat(
  beat: StoryBeat,
  muses: Record<MuseId, MuseState>,
  events: WorldEvent[],
  packet: WorldSnapshot["packet"],
  wallPins: WorldSnapshot["wallPins"],
  now: number,
  random: () => number,
): Pick<WorldSnapshot, "muses" | "events" | "packet" | "wallPins"> {
  switch (beat.type) {
    case "discovery": {
      const ticker = beat.ticker;
      return {
        muses: {
          ...muses,
          scroller: setThought(muses.scroller, "send to trader", 2600, now),
          trader: applyActivity(
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
          ),
        },
        events: pushEvent(
          events,
          "NEW_DISCOVERY",
          `${muses.scroller.name} discovered something on the tape`,
          "scroller",
          now,
          random,
        ),
        packet: {
          from: "scroller",
          to: "trader",
          label: packetNoteForBeat("discovery"),
          t: now,
          kind: "NOTE",
        },
        wallPins,
      };
    }
    case "thesis": {
      const ticker = beat.ticker;
      const card = packetNoteForBeat("thesis", beat.slot);
      return {
        muses: {
          ...muses,
          builder: setThought(muses.builder, "card it", 2600, now),
          trader: {
            ...muses.trader,
            mind: {
              ...muses.trader.mind,
              memory: `card inbound on ${ticker}`,
              watching: muses.trader.mind.watching ?? ticker,
            },
          },
        },
        events: pushEvent(
          events,
          "THESIS_CREATED",
          `${muses.builder.name} pinned a card`,
          "builder",
          now,
          random,
        ),
        packet: {
          from: "builder",
          to: "wall",
          label: card,
          t: now,
          kind: "PIN",
          slot: beat.slot,
        },
        wallPins: upsertWallPin(wallPins, card, beat.slot, now),
      };
    }
    case "ask_card":
      return {
        muses: {
          ...muses,
          builder: setThought(muses.builder, "thread this", 2600, now),
        },
        events: pushEvent(
          events,
          "SOCIAL_REACTION",
          `${muses.trader.name} wants a card`,
          "trader",
          now,
          random,
        ),
        packet: {
          from: "trader",
          to: "builder",
          label: packetNoteForBeat("ask_card"),
          t: now,
          kind: "NOTE",
        },
        wallPins,
      };
    case "share_builder":
      return {
        muses: {
          ...muses,
          builder: setThought(muses.builder, "same structure", 2600, now),
        },
        events: pushEvent(
          events,
          "SOCIAL_REACTION",
          `${muses.scroller.name} pinged ${muses.builder.name}`,
          "scroller",
          now,
          random,
        ),
        packet: {
          from: "scroller",
          to: "builder",
          label: packetNoteForBeat("share_builder"),
          t: now,
          kind: "NOTE",
        },
        wallPins,
      };
    case "wave_chill":
      return {
        muses: {
          ...muses,
          chill: setThought(
            {
              ...muses.chill,
              mind: {
                ...muses.chill.mind,
                observed: "noise from the desk",
                nodes: {
                  ...muses.chill.mind.nodes,
                  FOMO: nudge(muses.chill.mind.nodes.FOMO, -0.05),
                  SOCIAL: nudge(muses.chill.mind.nodes.SOCIAL, 0.04),
                },
              },
            },
            "nah",
            2600,
            now,
          ),
        },
        events: pushEvent(
          events,
          "SOCIAL_REACTION",
          `${muses.scroller.name} waved at the couch`,
          "scroller",
          now,
          random,
        ),
        packet: {
          from: "scroller",
          to: "chill",
          label: packetNoteForBeat("wave_chill"),
          t: now,
          kind: "NOTE",
        },
        wallPins,
      };
    case "boredom":
      return {
        muses: {
          ...muses,
          chill: setThought(
            walkToward(
              {
                ...muses.chill,
                mind: {
                  ...muses.chill.mind,
                  action: "IDLE",
                  observed: "window",
                  nodes: {
                    ...muses.chill.mind.nodes,
                    FOMO: nudge(muses.chill.mind.nodes.FOMO, -0.06),
                  },
                },
              },
              chillHome(now),
              0.05,
            ),
            "they can have it",
            3200,
            now,
          ),
        },
        events: pushEvent(
          events,
          "BOREDOM",
          `${muses.chill.name} does not care`,
          "chill",
          now,
          random,
        ),
        packet,
        wallPins,
      };
    default:
      return assertNever(beat);
  }
}

export function tickSnapshot(
  world: WorldSnapshot,
  pulse: Pulse,
  now = Date.now(),
  random = Math.random,
): WorldSnapshot {
  const skippedPaid = isPaidTicker(pulse.ticker);
  const pulseTicker = skippedPaid ? null : pulse.ticker;
  const spiked =
    !skippedPaid && (pulse.kind === "TREND_SPIKE" || pulse.kind === "VIRAL_POST");
  const rawSubject =
    pulseTicker ?? world.muses.trader.mind.watching ?? world.muses.scroller.mind.watching;
  const subject = rawSubject && !isPaidTicker(rawSubject) ? rawSubject : null;
  const events = world.events;
  const packet = sanitizePacket(
    world.packet && now - world.packet.t < PACKET_HOLD_MS ? world.packet : null,
  );
  const wallPins = sanitizeWallPins(world.wallPins ?? []);
  const muses = { ...world.muses };

  for (const id of Object.keys(muses) as MuseId[]) {
    let muse = clearExpiredThought(muses[id], now);
    if (isPaidTicker(muse.mind.watching)) {
      muse = { ...muse, mind: { ...muse.mind, watching: null } };
    }
    if (muse.id === "chill" && (muse.activity === "WALKING" || random() < 0.3)) {
      muse = walkToward(muse, chillHome(now), 0.07);
    } else {
      muse = applyActivity(muse, nextActivity(muse, spiked, random), subject);
    }
    if (random() < 0.16) {
      const line = pick(THOUGHTS[muse.id], random);
      muse = setThought(muse, line, 2600, now);
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

  const beat = pickStoryBeat({
    muses,
    events,
    packet,
    wallPins,
    spiked,
    pulseTicker,
    now,
    random,
  });
  if (!beat) {
    return { ...world, muses, events, packet, wallPins };
  }
  return { ...world, ...applyStoryBeat(beat, muses, events, packet, wallPins, now, random) };
}
