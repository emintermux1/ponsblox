"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  MIND_LINKS,
  MIND_SHORT,
  grokSignalLive,
  projectMindNode,
} from "@/lib/world/mind-graph";
import type { RenderMode } from "@/lib/world/perf";
import { inspectCopy } from "@/lib/world/pick";
import type {
  CameraPreset,
  GrokHonesty,
  GrokWakeState,
  MuseId,
  MuseState,
  ScreenId,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MIND_NODES, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  EMPTY_SELECTION,
  ENTER_MIND,
  ENTRY_CAPTION,
  isAwake,
  LEAVE_MIND,
  locationLabel,
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
  onInspect,
  onEnterMind,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onInspect: (id: ScreenId | null) => void;
  onEnterMind: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const settled = useEntrySettled(reduceMotion === true) || entered;
  const street = useStreetSignal();
  const selected = world.selected ? world.muses[world.selected] : null;
  const signal = lastSignal(street, world.events);

  const enterMind = () => {
    setEntered(true);
    onEnterMind();
  };

  return (
    <div className="loft-chrome pointer-events-none absolute inset-0 z-40 text-loft-paper">
      {!settled ? (
        <EntryVeil mindOpen={world.mindOpen} onEnter={enterMind} onLeave={onEnterMind} />
      ) : (
        <div className="loft-chrome-in pointer-events-none absolute inset-0">
          <Wordmark signal={signal} mode={mode} />
          <Locations camera={world.camera} onPreset={onPreset} />
          <Roster world={world} selectedId={world.selected} onSelect={onSelect} />
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
          <div className="pointer-events-auto absolute bottom-5 right-5 sm:hidden">
            <MindButton
              mindOpen={world.mindOpen}
              onEnter={enterMind}
              onLeave={onEnterMind}
            />
          </div>
          <PickPane
            world={world}
            selected={selected}
            mindOpen={world.mindOpen}
            onEnter={enterMind}
            onLeave={onEnterMind}
            onInspect={onInspect}
          />
        </div>
      )}
    </div>
  );
}

function useEntrySettled(reduceMotion: boolean): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setSettled(true);
      return;
    }
    const id = window.setTimeout(() => setSettled(true), 3000);
    return () => window.clearTimeout(id);
  }, [reduceMotion]);

  return settled;
}

function EntryVeil({
  mindOpen,
  onEnter,
  onLeave,
}: {
  mindOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="loft-veil absolute inset-0 flex flex-col items-center justify-center">
      <p className="font-serif text-[clamp(3.4rem,9vw,7rem)] italic leading-none tracking-[-0.03em]">
        {WORDMARK}
      </p>
      <span className="loft-rule mt-5" />
      <p className="loft-entry-caption mt-6 text-[15px] text-loft-paper/88 md:text-[16px]">
        {ENTRY_CAPTION}
      </p>
      <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
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
  return (
    <div className="absolute left-5 top-5 max-w-[16rem] md:left-7 md:top-7">
      <p className="font-serif text-[1.65rem] italic leading-none tracking-[-0.03em] md:text-[1.85rem]">
        {WORDMARK}
      </p>
      <p className="mt-1 text-[9px] tracking-[0.18em] text-loft-brass/80">
        {WORLD_MARK}
      </p>
      <p className="mt-4 flex items-center gap-2 text-[10px] tracking-[0.16em] text-loft-paper/55">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-loft-brass" />
        LIVE
        <span className="text-loft-paper/35">{modeLabel(mode)}</span>
      </p>
      <p className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.16em] text-loft-paper/55">
        <span className={signalDotClass(signal.mark)} />
        last signal · {signal.mark}
      </p>
      <p className="mt-1 font-serif text-[12px] italic leading-5 text-loft-paper/62">
        {signal.line}
      </p>
    </div>
  );
}

function signalDotClass(mark: LastSignal["mark"]): string {
  switch (mark) {
    case "REAL":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-brass";
    case "SIM":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-paper/35";
    case "—":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-paper/18";
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
  onSelect,
}: {
  world: WorldSnapshot;
  selectedId: MuseId | null;
  onSelect: (id: MuseId | null) => void;
}) {
  const awake = MUSE_IDS.filter((id) => isAwake(world.muses[id].activity));

  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 md:bottom-7 md:left-7">
      <p className="text-[9px] tracking-[0.22em] text-loft-brass/75">
        {awake.length === 0 ? "the room is still" : "awake"}
      </p>
      <ul className="mt-3 space-y-1.5">
        {MUSE_IDS.map((id) => {
          const muse = world.muses[id];
          const present = isAwake(muse.activity);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className={`flex items-baseline gap-3 text-left ${
                  selectedId === id ? "text-loft-paper" : "text-loft-paper/58"
                }`}
              >
                <span
                  className={`mt-[0.35em] inline-block h-1 w-1 rounded-full ${
                    present ? "bg-loft-brass" : "bg-loft-paper/22"
                  }`}
                />
                <span className="w-20 font-serif text-[14px] italic">
                  {muse.name}
                </span>
                <span className="text-[11px] text-loft-paper/45">
                  {activityLine(muse.activity)}
                </span>
              </button>
            </li>
          );
        })}
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

function honestyDotClass(mark: GrokHonesty): string {
  switch (mark) {
    case "REAL":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-brass";
    case "SIM":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-paper/35";
    default:
      return assertNever(mark);
  }
}

function grokPhaseLine(wake: GrokWakeState): string {
  switch (wake.phase) {
    case "idle":
      return "";
    case "waking":
      return "waking";
    case "done":
      return wake.honesty ?? "";
    default:
      return assertNever(wake.phase);
  }
}

function GrokWakeCopy({ wake }: { wake: GrokWakeState }) {
  switch (wake.phase) {
    case "idle":
    case "waking":
      return null;
    case "done":
      return wake.summary ? (
        <p className="mt-2 font-serif text-[13px] italic leading-6 text-loft-paper/70">
          {wake.summary}
        </p>
      ) : null;
    default:
      return assertNever(wake.phase);
  }
}

function PickPane({
  world,
  selected,
  mindOpen,
  onEnter,
  onLeave,
  onInspect,
}: {
  world: WorldSnapshot;
  selected: MuseState | null;
  mindOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onInspect: (id: ScreenId | null) => void;
}) {
  if (world.inspecting) {
    const copy = inspectCopy(world, world.inspecting);
    return (
      <div className="pointer-events-auto absolute inset-x-5 bottom-20 text-right sm:inset-x-auto sm:bottom-7 sm:right-7 sm:w-[15.5rem]">
        <p className="font-serif text-[1.35rem] italic leading-none tracking-[-0.02em]">
          {copy.title}
        </p>
        {copy.lines.map((line) => (
          <p key={line} className="mt-2 font-serif text-[13px] italic leading-6 text-loft-paper/70">
            {line}
          </p>
        ))}
        <button
          type="button"
          onClick={() => onInspect(null)}
          className="mt-4 text-[10px] tracking-[0.18em] text-loft-brass/80 hover:text-loft-paper"
        >
          close
        </button>
      </div>
    );
  }

  if (world.camera === "GROK" || world.grokWake.phase === "waking") {
    const wake = world.grokWake;
    return (
      <div className="pointer-events-auto absolute inset-x-5 bottom-20 text-right sm:inset-x-auto sm:bottom-7 sm:right-7 sm:w-[15.5rem]">
        <p className="font-serif text-[1.35rem] italic leading-none tracking-[-0.02em]">
          Grok
        </p>
        <p className="mt-2 flex items-center justify-end gap-2 text-[10px] tracking-[0.2em] text-loft-paper/55">
          {wake.honesty ? <span className={honestyDotClass(wake.honesty)} /> : null}
          {grokPhaseLine(wake)}
        </p>
        <GrokWakeCopy wake={wake} />
        <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="pointer-events-auto absolute bottom-5 right-5 hidden w-[14.5rem] sm:block md:bottom-7 md:right-7">
        <p className="font-serif text-[13px] italic leading-6 text-loft-paper/62">
          {EMPTY_SELECTION}
        </p>
        <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute inset-x-5 bottom-20 text-right sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[15.5rem] md:bottom-7 md:right-7">
      <p className="font-serif text-[1.35rem] italic leading-none tracking-[-0.02em]">
        {selected.name}
      </p>
      <p className="mt-2 text-[10px] tracking-[0.2em] text-loft-brass/80">
        {activityLine(selected.activity)}
      </p>
      {mindOpen ? <MindStatus muse={selected} /> : null}
      <div className="hidden sm:block">
        <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
      </div>
    </div>
  );
}

function MindButton({
  mindOpen,
  onEnter,
  onLeave,
}: {
  mindOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={mindOpen ? onLeave : onEnter}
      className="loft-entry-cta pointer-events-auto mt-6 text-[11px] text-loft-brass transition-colors duration-300 hover:text-loft-paper"
    >
      {mindOpen ? LEAVE_MIND : ENTER_MIND}
    </button>
  );
}
