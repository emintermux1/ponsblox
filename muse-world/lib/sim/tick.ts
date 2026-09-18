import { cleanTicker } from "@/lib/adapters/parse";
import { pickStoryBeat, upsertWallPin, type StoryBeat } from "@/lib/sim/stories";
import { grokAskPacket } from "@/lib/world/grok-watch";
import {
  PACKET_HOLD_MS,
  arriveActivity,
  chillHome,
  nearXZ,
  stationFor,
} from "@/lib/world/layout";
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
  name?: string | null;
  changePct?: number | null;
  source?: string;
};

const WALK_SPEED = 0.32;

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

export function realTicker(value: string | null | undefined): string | null {
  return cleanTicker(value);
}

export function pickTicker(fallback: string | null): string | null {
  return realTicker(fallback);
}

export function deskGrokLive(events: WorldEvent[], now = Date.now()): boolean {
  return events.some((event) => {
    if (now - event.at > 16_000) {
      return false;
    }
    switch (event.kind) {
      case "GROK_REQUESTED":
        return true;
      case "GROK_RESPONSE":
        return event.source === "bot" || event.source === "xai";
      case "TREND_SPIKE":
      case "NEW_DISCOVERY":
      case "POSITION_OPENED":
      case "POSITION_CLOSED":
      case "THESIS_CREATED":
      case "VIRAL_POST":
      case "BOREDOM":
      case "SOCIAL_REACTION":
        return false;
      default:
        return assertNever(event.kind);
    }
  });
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
  if (text.includes("$PAID") || /\bPAID\b/.test(text)) {
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
  arrive: MuseActivity,
  arriveFacing: number,
): MuseState {
  const [x, y, z] = muse.position;
  const dx = target[0] - x;
  const dy = target[1] - y;
  const dz = target[2] - z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1 || dist <= speed) {
    return { ...muse, activity: arrive, position: target, facing: arriveFacing };
  }
  const step = Math.min(speed, dist);
  return {
    ...muse,
    activity: "WALKING",
    facing: Math.atan2(dx, dz),
    position: [x + (dx / dist) * step, y + dy * 0.35, z + (dz / dist) * step],
  };
}

function defaultWork(id: MuseId): MuseActivity {
  switch (id) {
    case "scroller":
      return "SCROLLING";
    case "trader":
      return "TRADING";
    case "chill":
      return "CHILLING";
    case "builder":
      return "RESEARCHING";
    default:
      return assertNever(id);
  }
}

function livingActivity(activity: MuseActivity, id: MuseId): MuseActivity {
  return activity === "IDLE" ? defaultWork(id) : activity;
}

function nextActivity(muse: MuseState, pulse: boolean, random: () => number): MuseActivity {
  switch (muse.id) {
    case "scroller":
      if (pulse && random() < 0.55) return "REACTING";
      return random() < 0.82 ? "SCROLLING" : random() < 0.55 ? "WATCHING" : "THINKING";
    case "trader":
      if (pulse) return random() < 0.55 ? "WATCHING" : "TRADING";
      if (random() < 0.62) return "TRADING";
      if (random() < 0.7) return "WATCHING";
      return "THINKING";
    case "chill":
      if (random() < 0.48) return "SMOKING";
      if (random() < 0.9) return "CHILLING";
      return "WATCHING";
    case "builder":
      if (pulse && random() < 0.4) return "REACTING";
      return random() < 0.7 ? "RESEARCHING" : "THINKING";
    default:
      return assertNever(muse.id);
  }
}

function shouldSwitch(muse: MuseState, spiked: boolean, random: () => number): boolean {
  if (muse.activity === "WALKING") {
    return false;
  }
  if (spiked) {
    return random() < 0.72;
  }
  if (muse.activity === "REACTING") {
    return random() < 0.5;
  }
  if (muse.activity === "IDLE") {
    return true;
  }
  return random() < 0.11;
}

function desiredActivity(muse: MuseState, spiked: boolean, random: () => number): MuseActivity {
  if (!shouldSwitch(muse, spiked, random)) {
    return livingActivity(muse.activity, muse.id);
  }
  return livingActivity(nextActivity(muse, spiked, random), muse.id);
}

function stepMuse(muse: MuseState, desired: MuseActivity, ticker: string | null): MuseState {
  const dest = stationFor(muse.id, desired);
  const arrive = arriveActivity(muse.id, desired);
  if (!nearXZ(muse.position, dest.position, 0.12)) {
    return walkToward(muse, dest.position, WALK_SPEED, arrive, dest.facing);
  }
  return applyActivity(
    { ...muse, position: dest.position, facing: dest.facing },
    arrive,
    ticker,
  );
}

export function applyActivity(
  muse: MuseState,
  activity: MuseActivity,
  ticker: string | null,
): MuseState {
  const mind = { ...muse.mind, nodes: { ...muse.mind.nodes } };
  const subject = realTicker(ticker);
  const about = subject ?? "the room";
  if (mind.watching && !realTicker(mind.watching)) {
    mind.watching = null;
  }
  mind.nodes.GROK = nudge(mind.nodes.GROK, -0.016);
  switch (activity) {
    case "SCROLLING":
      mind.nodes.ATTENTION = nudge(mind.nodes.ATTENTION, 0.04);
      mind.nodes.BOREDOM = nudge(mind.nodes.BOREDOM, -0.03);
      mind.observed = subject ? `timeline on ${subject}` : "timeline noise";
      break;
    case "THINKING":
      mind.nodes.CURIOSITY = nudge(mind.nodes.CURIOSITY, 0.06);
      mind.nodes.GROK = nudge(mind.nodes.GROK, muse.id === "trader" ? 0.11 : 0.035);
      mind.observed = `weighing ${about}`;
      break;
    case "WATCHING":
      if (subject) {
        mind.watching = subject;
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
      if (subject) {
        mind.watching = subject;
      }
      mind.observed = subject ? `tape on ${subject}` : "the tape";
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
      mind.action = "PASS";
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
      if (subject && muse.id !== "chill") {
        mind.watching = subject;
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
  const ticker = realTicker(beat.ticker);
  switch (beat.type) {
    case "discovery": {
      if (!ticker) {
        return { muses, events, packet, wallPins };
      }
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
      if (!ticker) {
        return { muses, events, packet, wallPins };
      }
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
      if (!ticker) {
        return { muses, events, packet, wallPins };
      }
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
      if (!ticker) {
        return { muses, events, packet, wallPins };
      }
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
      if (!ticker) {
        return { muses, events, packet, wallPins };
      }
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
                  action: "PASS",
                  observed: "armchair",
                  nodes: {
                    ...muses.chill.mind.nodes,
                    FOMO: nudge(muses.chill.mind.nodes.FOMO, -0.06),
                  },
                },
              },
              chillHome(now),
              WALK_SPEED,
              "CHILLING",
              stationFor("chill", "CHILLING").facing,
            ),
            "they can have it",
            3200,
            now,
          ),
        },
        events: pushEvent(
          events,
          "BOREDOM",
          ticker
            ? `${muses.chill.name} lets ${ticker} pass`
            : `${muses.chill.name} does not care`,
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
  const pulseTicker = realTicker(pulse.ticker);
  const subject =
    pulseTicker ??
    realTicker(world.muses.trader.mind.watching) ??
    realTicker(world.muses.scroller.mind.watching);
  const spiked =
    (pulse.kind === "TREND_SPIKE" || pulse.kind === "VIRAL_POST") && Boolean(subject);
  const events = world.events;
  const packet = sanitizePacket(
    world.packet && now - world.packet.t < PACKET_HOLD_MS ? world.packet : null,
  );
  const wallPins = sanitizeWallPins(world.wallPins ?? []);
  const muses = { ...world.muses };
  let grokAskFrom: MuseId | null = null;

  for (const id of Object.keys(muses) as MuseId[]) {
    let muse = clearExpiredThought(muses[id], now);
    if (muse.mind.watching && !cleanTicker(muse.mind.watching)) {
      muse = { ...muse, mind: { ...muse.mind, watching: null } };
    }
    const desired = desiredActivity(muse, spiked, random);
    muse = stepMuse(muse, desired, subject);
    if (random() < 0.16) {
      const line = pick(THOUGHTS[muse.id], random);
      muse = setThought(muse, line, 2600, now);
      if (line === "send to grok") {
        grokAskFrom = muse.id;
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
    pulseTicker: subject,
    now,
    random,
  });
  if (!beat) {
    return {
      ...world,
      muses,
      events,
      packet: grokAskFrom && !packet ? grokAskPacket(grokAskFrom, now) : packet,
      wallPins,
    };
  }
  return { ...world, ...applyStoryBeat(beat, muses, events, packet, wallPins, now, random) };
}
