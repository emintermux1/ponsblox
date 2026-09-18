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
  ENTER_MIND,
  ENTRY_CAPTION,
  grokLine,
  isAwake,
  LEAVE_MIND,
  LIVE_STRIP,
  locationLabel,
  MIND_EYEBROW,
  roomNote,
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
      {settled ? (
        <div className="loft-chrome-in pointer-events-none absolute inset-0">
          <Wordmark signal={signal} mode={mode} />
          <Locations camera={world.camera} onPreset={onPreset} />
          <Roster world={world} selectedId={world.selected} onSelect={onSelect} />
          <LiveStrip world={world} />
          <AnimatePresence mode="wait">
            {introLine ? (
              <motion.p
                key={introLine}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-1/2 top-[15%] max-w-lg -translate-x-1/2 px-6 text-center font-serif text-[clamp(1.05rem,2.4vw,1.65rem)] italic tracking-[0.08em] text-loft-paper/80"
              >
                {introLine}
              </motion.p>
            ) : null}
          </AnimatePresence>
          {!world.mindOpen ? (
            <div className="pointer-events-auto absolute bottom-5 right-5 sm:hidden">
              <MindButton
                mindOpen={world.mindOpen}
                onEnter={enterMind}
                onLeave={onEnterMind}
              />
            </div>
          ) : null}
          {!world.mindOpen ? (
            <div className="hidden sm:block">
              <SelectedPane
                selected={selected}
                mindOpen={world.mindOpen}
                onEnter={enterMind}
                onLeave={onEnterMind}
              />
            </div>
          ) : null}
          <AnimatePresence>
            {world.mindOpen && selected ? (
              <MindPanel key="mind" muse={selected} onLeave={onEnterMind} />
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
      <AnimatePresence>
        {!settled ? (
          <motion.div
            key="veil"
            className="absolute inset-0 z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <EntryVeil
              mindOpen={world.mindOpen}
              onEnter={enterMind}
              onLeave={onEnterMind}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function useEntrySettled(reduceMotion: boolean): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), reduceMotion ? 0 : 3000);
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
      <p className="font-serif text-[clamp(2.9rem,8vw,6.4rem)] italic leading-none tracking-[-0.03em]">
        {WORDMARK}
      </p>
      <p className="mt-3 text-[10px] tracking-[0.34em] text-loft-brass/85">
        {WORLD_MARK}
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
      <p className="mt-1 text-[9px] tracking-[0.24em] text-loft-brass/90">
        {WORLD_MARK}
      </p>
      <p className="mt-4 flex items-center gap-2 text-[10px] tracking-[0.16em] text-loft-paper/72">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-loft-brass" />
        LIVE
        <span className="text-loft-paper/50">{modeLabel(mode)}</span>
      </p>
      <p className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.16em] text-loft-paper/72">
        <span className={signalDotClass(signal.mark)} />
        last signal · {signal.mark}
      </p>
      <p className="mt-1 font-serif text-[12px] italic leading-5 text-loft-paper/75">
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
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-paper/45";
    case "—":
      return "inline-block h-1.5 w-1.5 rounded-full bg-loft-paper/25";
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
    <nav className="pointer-events-auto absolute right-4 top-5 flex max-w-[11rem] flex-wrap justify-end gap-x-4 gap-y-1.5 text-[10px] text-loft-paper/65 md:right-7 md:top-6 md:max-w-none md:gap-5 md:text-[11px]">
      {ROOM_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onPreset(preset)}
          className={
            camera === preset
              ? "border-b border-loft-brass/70 pb-0.5 text-loft-brass"
              : "border-b border-transparent pb-0.5 transition-colors duration-300 hover:text-loft-paper"
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
      <p className="text-[9px] tracking-[0.22em] text-loft-brass/90">
        {awake.length === 0 ? "the room is still" : `awake · ${awake.length}`}
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
                className={`flex items-baseline gap-3 text-left transition-colors duration-300 ${
                  selectedId === id ? "text-loft-paper" : "text-loft-paper/70 hover:text-loft-paper"
                }`}
              >
                <span
                  className={`mt-[0.35em] inline-block h-1 w-1 rounded-full ${
                    present ? "bg-loft-brass" : "bg-loft-paper/30"
                  }`}
                />
                <span className="w-20 font-serif text-[14px] italic">
                  {muse.name}
                </span>
                <span className="text-[11px] text-loft-paper/60">
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

function LiveStrip({ world }: { world: WorldSnapshot }) {
  const latest = world.events[0];
  const note = roomNote(latest);
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-3 md:flex">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-loft-brass" />
      <span className="text-[9px] tracking-[0.26em] text-loft-brass/90">{LIVE_STRIP}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={latest?.id ?? "quiet"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[24rem] truncate font-serif text-[12px] italic text-loft-paper/78"
        >
          {note}
        </motion.span>
      </AnimatePresence>
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

function MindRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-16 shrink-0 text-[8px] tracking-[0.22em] text-loft-brass/75">
        {label}
      </dt>
      <dd className="font-serif text-[12px] italic leading-5 text-loft-paper/85">
        {value}
      </dd>
    </div>
  );
}

/** The mind mode surface — opens with the camera move, closes with LEAVE MIND. */
function MindPanel({ muse, onLeave }: { muse: MuseState; onLeave: () => void }) {
  const live = grokSignalLive(muse.mind);
  const grok = grokLine(muse.mind.grok);
  return (
    <div className="absolute inset-y-0 right-4 z-10 flex w-[17rem] items-center md:right-7">
      <motion.aside
        initial={{ opacity: 0, x: 26 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 26 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="loft-glass pointer-events-auto max-h-[78vh] w-full overflow-y-auto rounded-sm px-5 py-5"
      >
        <p className="text-[9px] tracking-[0.26em] text-loft-brass/90">{MIND_EYEBROW}</p>
        <p className="mt-2 font-serif text-[1.45rem] italic leading-none tracking-[-0.02em]">
          {muse.name}
        </p>
        <p className="mt-1.5 text-[9px] tracking-[0.24em] text-loft-paper/60">{muse.role}</p>
        <div className="mt-3">
          <MindConstellation nodes={muse.mind.nodes} />
        </div>
        <dl className="mt-3 space-y-2.5 border-t border-loft-brass/20 pt-4">
          <MindRow label="OBSERVED" value={muse.mind.observed} />
          <MindRow label="MEMORY" value={muse.mind.memory} />
          <MindRow label="GOAL" value={muse.mind.goal} />
          {muse.mind.watching ? (
            <MindRow label="EYES ON" value={`$${muse.mind.watching}`} />
          ) : null}
          {grok ? <MindRow label="GROK" value={grok} /> : null}
        </dl>
        <div className="mt-4 flex items-center justify-between border-t border-loft-brass/20 pt-3 text-[10px] tracking-[0.18em] text-loft-paper/65">
          <span>ACT {muse.mind.action}</span>
          <span className={live ? "text-loft-brass" : "text-loft-paper/40"}>
            GROK {live ? "LIVE" : "IDLE"}
          </span>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="loft-entry-cta mt-5 inline-flex w-full items-center justify-center rounded-full border border-loft-brass/50 bg-[rgba(16,12,9,0.5)] px-5 py-2.5 text-[11px] text-loft-brass transition-colors duration-300 hover:border-loft-brass hover:text-loft-paper"
        >
          {LEAVE_MIND}
        </button>
      </motion.aside>
    </div>
  );
}

function SelectedPane({
  selected,
  mindOpen,
  onEnter,
  onLeave,
}: {
  selected: MuseState | null;
  mindOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  if (!selected) {
    return (
      <div className="pointer-events-auto absolute bottom-5 right-5 w-[14.5rem] md:bottom-7 md:right-7">
        <p className="font-serif text-[13px] italic leading-6 text-loft-paper/70">
          {EMPTY_SELECTION}
        </p>
        <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-5 right-5 w-[15.5rem] text-right md:bottom-7 md:right-7">
      <p className="font-serif text-[1.35rem] italic leading-none tracking-[-0.02em]">
        {selected.name}
      </p>
      <p className="mt-2 text-[10px] tracking-[0.2em] text-loft-brass/90">
        {activityLine(selected.activity)}
      </p>
      <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
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
      className="loft-entry-cta pointer-events-auto mt-6 inline-flex items-center gap-2.5 rounded-full border border-loft-brass/50 bg-[rgba(16,12,9,0.55)] px-5 py-2.5 text-[11px] text-loft-brass backdrop-blur-sm transition-colors duration-300 hover:border-loft-brass hover:text-loft-paper"
    >
      <span className="inline-block h-1 w-1 rounded-full bg-loft-brass" />
      {mindOpen ? LEAVE_MIND : ENTER_MIND}
    </button>
  );
}
