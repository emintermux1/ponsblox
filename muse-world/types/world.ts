export type MuseId = "scroller" | "trader" | "chill" | "builder";

export type MuseActivity =
  | "IDLE"
  | "WALKING"
  | "SCROLLING"
  | "THINKING"
  | "RESEARCHING"
  | "TALKING"
  | "WATCHING"
  | "TRADING"
  | "CHILLING"
  | "SMOKING"
  | "REACTING";

export type MindNodeId =
  | "ATTENTION"
  | "MEMORY"
  | "CURIOSITY"
  | "FOMO"
  | "RISK"
  | "CONVICTION"
  | "BOREDOM"
  | "SOCIAL"
  | "GROK"
  | "ACTION";

export type WorldEventKind =
  | "TREND_SPIKE"
  | "NEW_DISCOVERY"
  | "GROK_REQUESTED"
  | "GROK_RESPONSE"
  | "POSITION_OPENED"
  | "POSITION_CLOSED"
  | "THESIS_CREATED"
  | "VIRAL_POST"
  | "BOREDOM"
  | "SOCIAL_REACTION";

export type GrokSource = "bot" | "xai" | "sim";

export type CameraPreset =
  | "ROOM"
  | "LOUNGE"
  | "TRADER"
  | "BUILDER"
  | "SCROLLER"
  | "MIND";

export type ActionLabel = "WATCH" | "PASS" | "BUY" | "HOLD" | "IDLE";

export type MindNodeState = {
  id: MindNodeId;
  value: number;
};

export type MuseMind = {
  nodes: Record<MindNodeId, number>;
  observed: string;
  memory: string;
  goal: string;
  grok: string;
  action: ActionLabel;
  watching: string | null;
};

export type MuseState = {
  id: MuseId;
  name: string;
  role: string;
  activity: MuseActivity;
  thought: string | null;
  thoughtUntil: number;
  position: [number, number, number];
  facing: number;
  mind: MuseMind;
};

export type WorldEvent = {
  id: string;
  kind: WorldEventKind;
  museId: MuseId | null;
  text: string;
  at: number;
  source: GrokSource | "world";
};

export type WorldSnapshot = {
  live: boolean;
  startedAt: number;
  selected: MuseId | null;
  mindOpen: boolean;
  camera: CameraPreset;
  muses: Record<MuseId, MuseState>;
  events: WorldEvent[];
  packet: SpatialPacket | null;
};

export type SpatialPacket = {
  from: MuseId;
  to: MuseId;
  label: string;
  t: number;
};

export const MIND_NODES: MindNodeId[] = [
  "ATTENTION",
  "MEMORY",
  "CURIOSITY",
  "FOMO",
  "RISK",
  "CONVICTION",
  "BOREDOM",
  "SOCIAL",
  "GROK",
  "ACTION",
];

export const MUSE_IDS: MuseId[] = [
  "scroller",
  "trader",
  "chill",
  "builder",
];

export function assertNever(value: never): never {
  throw new Error(`unhandled: ${String(value)}`);
}
