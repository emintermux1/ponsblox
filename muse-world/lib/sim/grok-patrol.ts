import { claimsExecutedFill, isPaidTicker, loftCaptionFromText, makeGrokEvent } from "@/lib/adapters/parse";
import { GROK_ORB_POS, nearXZ } from "@/lib/world/layout";
import type {
  GrokAgent,
  GrokTask,
  GrokTaskKind,
  MuseActivity,
  MuseId,
  MuseState,
  SpatialPacket,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";

export const GROK_BODY_HEX = "#ffffff";
export const GROK_EYE_HEX = "#0a0a0a";
export const MUSE_FUR_HEX = "#f3eee4";

export const ASSIGN_MIN_MS = 12_000;
export const ASSIGN_SPAN_MS = 8_000;
export const HOVER_MIN_MS = 3_800;
export const HOVER_SPAN_MS = 2_800;
export const FLOAT_SPEED = 0.52;

export const SIM_TASK_LINE: Record<GrokTaskKind, string> = {
  SCROLL: "stay on the feed",
  WATCH_TAPE: "check the tape",
  PIN_NOTE: "pin a note",
  CHILL: "let it pass",
};

const TASK_HOLD_MS = 8_000;

export function seedGrokAgent(now = Date.now()): GrokAgent {
  return {
    position: [GROK_ORB_POS[0], GROK_ORB_POS[1], GROK_ORB_POS[2]],
    lookAt: [GROK_ORB_POS[0], GROK_ORB_POS[1] + 0.2, GROK_ORB_POS[2] - 1],
    targetId: "trader",
    hoverUntil: 0,
    nextAssignAt: now + ASSIGN_MIN_MS,
    task: null,
  };
}

export function grokOf(world: WorldSnapshot): GrokAgent {
  return world.grok ?? seedGrokAgent(world.startedAt);
}

export function activityScore(activity: MuseActivity): number {
  switch (activity) {
    case "RESEARCHING":
    case "TRADING":
      return 5;
    case "SCROLLING":
    case "THINKING":
    case "REACTING":
    case "TALKING":
      return 4;
    case "WATCHING":
      return 3;
    case "WALKING":
      return 2;
    case "SMOKING":
    case "CHILLING":
      return 1;
    case "IDLE":
      return 0;
    default:
      return assertNever(activity);
  }
}

export function mostActiveMuseId(world: WorldSnapshot, except?: MuseId | null): MuseId {
  let best: MuseId = except && except !== "scroller" ? "scroller" : "trader";
  let score = -1;
  for (const id of MUSE_IDS) {
    if (id === except) {
      continue;
    }
    const value = activityScore(world.muses[id].activity);
    if (value > score) {
      score = value;
      best = id;
    }
  }
  return best;
}

export function kindForMuse(id: MuseId): GrokTaskKind {
  switch (id) {
    case "scroller":
      return "SCROLL";
    case "trader":
      return "WATCH_TAPE";
    case "builder":
      return "PIN_NOTE";
    case "chill":
      return "CHILL";
    default:
      return assertNever(id);
  }
}

export function taskKindLabel(kind: GrokTaskKind): string {
  switch (kind) {
    case "SCROLL":
      return "SCROLL";
    case "WATCH_TAPE":
      return "WATCH TAPE";
    case "PIN_NOTE":
      return "PIN A NOTE";
    case "CHILL":
      return "CHILL";
    default:
      return assertNever(kind);
  }
}

export function classifyTaskKind(text: string, fallback: GrokTaskKind): GrokTaskKind {
  const lower = text.toLowerCase();
  if (/\b(pin|note|card|thesis)\b/.test(lower)) {
    return "PIN_NOTE";
  }
  if (/\b(chill|breath|later|sofa|armchair)\b/.test(lower)) {
    return "CHILL";
  }
  if (/\b(scroll|feed|timeline)\b/.test(lower)) {
    return "SCROLL";
  }
  if (/\b(tape|watch|desk|book)\b/.test(lower)) {
    return "WATCH_TAPE";
  }
  return fallback;
}

export function shoulderOf(muse: MuseState): [number, number, number] {
  const fx = Math.sin(muse.facing);
  const fz = Math.cos(muse.facing);
  return [
    muse.position[0] + fz * 0.64,
    muse.position[1] + 1.14,
    muse.position[2] - fx * 0.64,
  ];
}

export function museLookAt(muse: MuseState): [number, number, number] {
  return [muse.position[0], muse.position[1] + 0.82, muse.position[2]];
}

function parkedOnShelf(position: readonly [number, number, number]): boolean {
  const here: [number, number, number] = [position[0], position[1], position[2]];
  return nearXZ(here, GROK_ORB_POS, 0.28) && Math.abs(position[1] - GROK_ORB_POS[1]) < 0.35;
}

export function nextPatrolId(world: WorldSnapshot, current: MuseId): MuseId {
  return mostActiveMuseId(world, current);
}

export function taskChipText(task: GrokTask | null): string | null {
  if (!task) {
    return null;
  }
  return `${taskKindLabel(task.kind)} · ${task.line}`;
}

export function taskHonestyMark(task: GrokTask | null): "REAL/xai" | "SIM" | null {
  if (!task) {
    return null;
  }
  return task.source === "xai" ? "REAL/xai" : "SIM";
}

export function labeledTaskLine(task: GrokTask): string {
  return task.source === "xai" ? `xai/REAL · ${task.line}` : `SIM · ${task.line}`;
}

function usableTaskLine(text: string): string | null {
  const caption = loftCaptionFromText(text);
  if (!caption || isPaidTicker(caption) || claimsExecutedFill(caption)) {
    return null;
  }
  if (/\b(grok bot|bot\/real)\b/i.test(caption)) {
    return null;
  }
  return caption;
}

export function makeSimTask(museId: MuseId, now: number): GrokTask {
  const kind = kindForMuse(museId);
  return {
    kind,
    line: SIM_TASK_LINE[kind],
    museId,
    source: "sim",
    honesty: "SIM",
    at: now,
    accepted: true,
  };
}

export function makeXaiTask(museId: MuseId, line: string, now: number): GrokTask | null {
  const caption = usableTaskLine(line);
  if (!caption) {
    return null;
  }
  return {
    kind: classifyTaskKind(caption, kindForMuse(museId)),
    line: caption,
    museId,
    source: "xai",
    honesty: "REAL",
    at: now,
    accepted: true,
  };
}

export function acceptTaskPacket(task: GrokTask): SpatialPacket {
  return {
    from: "grok",
    to: task.museId,
    label: task.line,
    t: task.at,
    kind: "NOTE",
  };
}

export function putTaskOnMuse(muse: MuseState, task: GrokTask, now: number): MuseState {
  return {
    ...muse,
    task,
    thought: labeledTaskLine(task),
    thoughtUntil: now + TASK_HOLD_MS,
    mind: {
      ...muse.mind,
      grok: task.line,
      nodes: {
        ...muse.mind.nodes,
        GROK: task.source === "xai" ? 0.55 : 0.72,
      },
    },
  };
}

function canReplacePacket(packet: WorldSnapshot["packet"]): boolean {
  if (!packet) {
    return true;
  }
  return packet.from === "grok" || packet.to === "grok";
}

export function applyGrokTask(
  world: WorldSnapshot,
  task: GrokTask,
  now = task.at,
  writeEvent = false,
): WorldSnapshot {
  const grok = grokOf(world);
  const muse = putTaskOnMuse(world.muses[task.museId], task, now);
  const events = writeEvent
    ? [
        makeGrokEvent({
          kind: task.source === "xai" ? "GROK_RESPONSE" : "GROK_REQUESTED",
          museId: task.museId,
          museName: muse.name,
          source: task.source,
          summary: `${taskKindLabel(task.kind)} · ${task.line}`,
          now,
        }),
        ...world.events,
      ].slice(0, 24)
    : world.events;
  return {
    ...world,
    grok: {
      ...grok,
      targetId: task.museId,
      task,
      nextAssignAt: now + ASSIGN_MIN_MS,
    },
    muses: {
      ...world.muses,
      [task.museId]: muse,
    },
    packet: canReplacePacket(world.packet) ? acceptTaskPacket(task) : world.packet,
    events,
  };
}

export function assignSimTask(
  world: WorldSnapshot,
  museId: MuseId,
  now: number,
  random: () => number,
): WorldSnapshot {
  const span = Math.floor(random() * ASSIGN_SPAN_MS);
  const next = applyGrokTask(world, makeSimTask(museId, now), now, true);
  return {
    ...next,
    grok: {
      ...next.grok,
      nextAssignAt: now + ASSIGN_MIN_MS + span,
    },
  };
}

export function assignWakeTask(
  world: WorldSnapshot,
  museId: MuseId,
  now: number,
  line: string | null,
  live: boolean,
): WorldSnapshot {
  const xai = live && line ? makeXaiTask(museId, line, now) : null;
  const task = xai ?? makeSimTask(museId, now);
  return applyGrokTask(world, task, now, false);
}

function lerpToward(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  speed: number,
): [number, number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const dist = Math.hypot(dx, dy, dz);
  if (dist <= speed) {
    return [to[0], to[1], to[2]];
  }
  const u = speed / dist;
  return [from[0] + dx * u, from[1] + dy * u, from[2] + dz * u];
}

export function stepGrokAgent(
  world: WorldSnapshot,
  now: number,
  random: () => number,
): GrokAgent {
  const grok = grokOf(world);
  const wakingId = world.grokWake.phase === "waking" ? world.grokWake.museId : null;
  let targetId = wakingId ?? grok.targetId;
  if (!wakingId && (grok.hoverUntil === 0 || now >= grok.hoverUntil)) {
    targetId = grok.hoverUntil === 0 ? mostActiveMuseId(world) : nextPatrolId(world, grok.targetId);
  }
  const muse = world.muses[targetId];
  const dest = shoulderOf(muse);
  const lookAt = museLookAt(muse);
  const arrived = Math.hypot(
    dest[0] - grok.position[0],
    dest[1] - grok.position[1],
    dest[2] - grok.position[2],
  ) < 0.16;
  let hoverUntil = grok.hoverUntil;
  const position = arrived ? dest : lerpToward(grok.position, dest, FLOAT_SPEED);
  if (arrived && hoverUntil < now) {
    hoverUntil = now + HOVER_MIN_MS + Math.floor(random() * HOVER_SPAN_MS);
  }
  return {
    ...grok,
    position,
    lookAt,
    targetId,
    hoverUntil,
  };
}

export function stepGrokWorld(
  world: WorldSnapshot,
  now: number,
  random: () => number,
): WorldSnapshot {
  const grok = stepGrokAgent(world, now, random);
  let next: WorldSnapshot = { ...world, grok };
  if (now >= grok.nextAssignAt) {
    next = assignSimTask(next, grok.targetId, now, random);
  }
  return next;
}

export function forceNextAssignment(world: WorldSnapshot, museId: MuseId, now: number): WorldSnapshot {
  const grok = grokOf(world);
  const assigned = assignSimTask(
    {
      ...world,
      grok: {
        ...grok,
        targetId: museId,
        hoverUntil: now + HOVER_MIN_MS,
        nextAssignAt: now,
      },
    },
    museId,
    now,
    () => 0.35,
  );
  return assigned;
}

export function grokLeftTheShelf(world: WorldSnapshot): boolean {
  return !parkedOnShelf(grokOf(world).position);
}
