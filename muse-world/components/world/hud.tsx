"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  MIND_LINKS,
  MIND_SHORT,
  grokSignalLive,
  projectMindNode,
} from "@/lib/world/mind-graph";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, MuseState, WorldSnapshot } from "@/types/world";
import { MIND_NODES, assertNever } from "@/types/world";

const PRESETS: CameraPreset[] = ["ROOM", "LOUNGE", "TRADER", "BUILDER", "SCROLLER"];

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] as const },
};

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
      <div className="mt-2 flex items-center justify-center gap-5 text-[10px] tracking-[0.18em] text-[#cfc4ad]">
        <p>ACT {muse.mind.action}</p>
        <p className={live ? "text-[#d7b56a]" : "text-[#8d8370]"}>
          GROK {live ? "LIVE" : "IDLE"}
        </p>
      </div>
    </div>
  );
}

export function WorldHud({
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
  const selected = world.selected ? world.muses[world.selected] : null;
  const latest = selected ? null : (world.events[0] ?? null);
  const showChrome = !introLine;

  return (
    <div className="pointer-events-none absolute inset-0 text-[#efe6d4]">
      <div className="pointer-events-auto absolute left-4 top-5 sm:left-6 sm:top-6">
        <p className="font-serif text-[11px] tracking-[0.42em]">MUSE WORLD</p>
        <p className="mt-2 flex items-center gap-2 text-[10px] tracking-[0.32em] text-[#c8b892]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c8b892]" />
          LIVE
          <span className="text-[#8d8370]">{modeLabel(mode)}</span>
        </p>
      </div>

      <AnimatePresence>
        {showChrome ? (
          <motion.div
            key="presets"
            {...fade}
            className="pointer-events-auto absolute right-4 top-5 flex max-w-[58vw] flex-wrap justify-end gap-x-3 gap-y-1 text-[9px] tracking-[0.28em] text-[#5c564c] sm:right-6 sm:top-6 sm:gap-4"
          >
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onPreset(preset)}
                className={
                  world.camera === preset ? "text-[#efe6d4]" : "hover:text-[#b7a47a]"
                }
              >
                {preset}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {introLine ? (
          <motion.p
            key={introLine}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-[18%] -translate-x-1/2 px-6 text-center font-serif text-3xl tracking-[0.1em] md:text-5xl"
          >
            {introLine}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showChrome && latest ? (
          <motion.p
            key={latest.id}
            {...fade}
            className="absolute bottom-6 left-4 max-w-xs text-[10px] tracking-[0.08em] text-[#8d8370] sm:left-6"
          >
            {latest.text}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showChrome && selected ? (
          <motion.div
            key={selected.id}
            {...fade}
            className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
          >
            <p className="font-serif text-lg tracking-[0.22em]">{selected.name}</p>
            <p className="mt-1 text-[10px] tracking-[0.28em] text-[#8d8370]">
              {selected.activity}
            </p>
            {world.mindOpen ? <MindStatus muse={selected} /> : null}
            <div className="mt-3 flex items-center justify-center gap-5 text-[10px] tracking-[0.28em] text-[#b7a47a]">
              <button type="button" onClick={() => onSelect(null)}>
                ROOM
              </button>
              <button type="button" onClick={onEnterMind}>
                {world.mindOpen ? "LEAVE MIND" : "ENTER MIND"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
