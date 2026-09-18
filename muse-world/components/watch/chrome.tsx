"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  MIND_LINKS,
  MIND_SHORT,
  grokSignalLive,
  projectMindNode,
} from "@/lib/world/mind-graph";
import { GROK_NAME } from "@/lib/world/cast";
import type { RenderMode } from "@/lib/world/perf";
import type {
  CameraPreset,
  MuseId,
  MuseState,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MIND_NODES, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  EMPTY_SELECTION,
  grokHonestyMark,
  hudMark,
  LEAVE_MIND,
  locationLabel,
  MIND_HINT,
  ROOM_PRESETS,
  WORDMARK,
  WORLD_MARK,
} from "@/components/watch/copy";
import { lastSignal, useStreetSignal, type LastSignal } from "@/components/watch/signal";

export function SpectatorChrome({
  world,
  introLine,
  mode,
  onPreset,
  onSelect,
  onEnterMind,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onEnterMind: () => void;
}) {
  const street = useStreetSignal();
  const selected = world.selected ? world.muses[world.selected] : null;
  const signal = lastSignal(street, world.events);
  const grokMark = grokHonestyMark(world.events);

  return (
    <div className="loft-chrome pointer-events-none absolute inset-0 z-40 text-loft-paper">
      <div className="loft-chrome-in pointer-events-none absolute inset-0">
        <Wordmark signal={signal} mode={mode} />
        <Locations camera={world.camera} onPreset={onPreset} />
        <Roster
          world={world}
          selectedId={world.selected}
          grokMark={grokMark}
          onSelect={onSelect}
          onGrok={() => onPreset("TRADER")}
        />
        <AnimatePresence mode="wait">
          {introLine ? (
            <motion.p
              key={introLine}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-[15%] max-w-lg -translate-x-1/2 px-6 text-center font-serif text-[clamp(1.05rem,2.4vw,1.65rem)] italic tracking-[0.08em] text-loft-paper/78"
            >
              {introLine}
            </motion.p>
          ) : null}
        </AnimatePresence>
        {selected ? (
          <SelectedPane
            selected={selected}
            mindOpen={world.mindOpen}
            onToggle={onEnterMind}
          />
        ) : (
          <p className="absolute bottom-5 right-5 font-serif text-[13px] italic text-loft-paper/45 md:bottom-7 md:right-7">
            {EMPTY_SELECTION}
          </p>
        )}
      </div>
    </div>
  );
}

function modeLabel(mode: RenderMode): string {
  switch (mode) {
    case "webgl":
      return "LOFT";
    case "watch":
      return "WATCH";
    default:
      return assertNever(mode);
  }
}

function Wordmark({ signal, mode }: { signal: LastSignal; mode: RenderMode }) {
  const mark = hudMark(signal.mark);
  return (
    <div className="absolute left-5 top-5 max-w-[16rem] md:left-7 md:top-7">
      <p className="font-serif text-[1.65rem] italic leading-none tracking-[-0.03em] md:text-[1.85rem]">
        {WORDMARK}
      </p>
      <p className="mt-1 text-[9px] tracking-[0.18em] text-loft-brass/80">
        {WORLD_MARK}
      </p>
      <p className="mt-4 flex items-center gap-2 text-[10px] tracking-[0.16em] text-loft-paper/55">
        <span className={signalDotClass(mark)} />
        {mark}
        <span className="text-loft-paper/35">{modeLabel(mode)}</span>
      </p>
    </div>
  );
}

function signalDotClass(mark: "REAL" | "SIM"): string {
  switch (mark) {
    case "REAL":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-brass";
    case "SIM":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-paper/35";
    default:
      return assertNever(mark);
  }
}

function Locations({
  camera,
  onPreset,
}: {
  camera: CameraPreset;
  onPreset: (preset: CameraPreset) => void;
}) {
  return (
    <nav className="pointer-events-auto absolute right-5 top-6 hidden gap-5 text-[11px] text-loft-paper/40 md:flex md:right-7">
      {ROOM_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onPreset(preset)}
          className={
            camera === preset
              ? "text-loft-paper"
              : "transition-colors duration-300 hover:text-loft-paper/80"
          }
        >
          {locationLabel(preset)}
        </button>
      ))}
    </nav>
  );
}

function Roster({
  world,
  selectedId,
  grokMark,
  onSelect,
  onGrok,
}: {
  world: WorldSnapshot;
  selectedId: MuseId | null;
  grokMark: "REAL" | "SIM";
  onSelect: (id: MuseId | null) => void;
  onGrok: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 md:bottom-7 md:left-7">
      <ul className="space-y-1.5">
        {MUSE_IDS.map((id) => {
          const muse = world.muses[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className={`flex items-baseline gap-3 text-left ${
                  selectedId === id ? "text-loft-paper" : "text-loft-paper/58"
                }`}
              >
                <span className="w-16 font-serif text-[14px] italic">{muse.name}</span>
                <span className="text-[11px] text-loft-paper/45">
                  {activityLine(muse.activity)}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onGrok}
            className="flex items-baseline gap-3 text-left text-loft-paper/58"
          >
            <span className="w-16 font-serif text-[14px] italic">{GROK_NAME}</span>
            <span className="text-[11px] text-loft-paper/45">{grokMark}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

function MindConstellation({ nodes }: { nodes: MuseState["mind"]["nodes"] }) {
  const width = 220;
  const height = 158;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-28 w-44" aria-hidden>
      {MIND_LINKS.map(([a, b]) => {
        const from = projectMindNode(a, width, height);
        const to = projectMindNode(b, width, height);
        const strength = (nodes[a] + nodes[b]) * 0.5;
        return (
          <line
            key={`${a}-${b}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#d8c9a4"
            strokeWidth={0.7}
            opacity={0.12 + strength * 0.4}
          />
        );
      })}
      {MIND_NODES.map((id) => {
        const point = projectMindNode(id, width, height);
        const value = nodes[id];
        const grok = id === "GROK";
        const labelLeft = point.x > width * 0.72;
        return (
          <g key={id}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              fill={grok ? "#d7b56a" : "#f0e6d2"}
              initial={{ r: 2.2 + value * 3.2, opacity: 0.4 + value * 0.35 }}
              animate={{
                r: [2.2 + value * 3.2, 3 + value * 4.4, 2.2 + value * 3.2],
                opacity: [0.34 + value * 0.24, 0.58 + value * 0.34, 0.34 + value * 0.24],
              }}
              transition={{
                duration: Math.max(0.7, 1.85 - value * 0.85),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {id === "GROK" || id === "ACTION" ? (
              <text
                x={labelLeft ? point.x - 6 : point.x + 6}
                y={point.y + 3}
                textAnchor={labelLeft ? "end" : "start"}
                fill={grok ? "#d7b56a" : "#cfc4ad"}
                fontSize="7"
                letterSpacing="0.14em"
                opacity={0.7}
              >
                {MIND_SHORT[id]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function MindStatus({ muse }: { muse: MuseState }) {
  const live = grokSignalLive(muse.mind);
  return (
    <div data-mind-panel="constellation" className="mt-3">
      <MindConstellation nodes={muse.mind.nodes} />
      <div className="mt-2 flex items-center justify-center gap-5 text-[10px] tracking-[0.18em] text-loft-paper/55">
        <p>ACT {muse.mind.action}</p>
        <p className={live ? "text-loft-brass" : "text-loft-paper/35"}>
          GROK {live ? "LIVE" : "IDLE"}
        </p>
      </div>
    </div>
  );
}

function SelectedPane({
  selected,
  mindOpen,
  onToggle,
}: {
  selected: MuseState;
  mindOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-5 right-5 w-[15.5rem] text-right md:bottom-7 md:right-7">
      <p className="font-serif text-[1.35rem] italic leading-none tracking-[-0.02em]">
        {selected.name}
      </p>
      <p className="mt-2 text-[10px] tracking-[0.2em] text-loft-brass/80">
        {activityLine(selected.activity)}
      </p>
      {mindOpen ? <MindStatus muse={selected} /> : null}
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 text-[10px] tracking-[0.2em] text-loft-paper/35 transition-colors duration-300 hover:text-loft-brass"
      >
        {mindOpen ? LEAVE_MIND : MIND_HINT}
      </button>
    </div>
  );
}
