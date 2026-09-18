"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MIND_LINKS,
  MIND_SHORT,
  grokSignalLive,
  projectMindNode,
} from "@/lib/world/mind-graph";
import type { CameraPreset, MuseState, WorldSnapshot } from "@/types/world";
import { MIND_NODES } from "@/types/world";

const PRESETS: CameraPreset[] = [
  "ROOM",
  "LOUNGE",
  "TRADER",
  "BUILDER",
  "SCROLLER",
];

function MindConstellation({ nodes }: { nodes: MuseState["mind"]["nodes"] }) {
  const width = 220;
  const height = 158;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" aria-hidden>
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

function GlanceReadout({ muse }: { muse: MuseState }) {
  return (
    <>
      <p className="mt-3 text-[10px] tracking-[0.2em] text-[#8d8370]">STATE</p>
      <p className="text-sm">{muse.activity}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] tabular-nums">
        <p>ATT {Math.round(muse.mind.nodes.ATTENTION * 100)}</p>
        <p>RISK {Math.round(muse.mind.nodes.RISK * 100)}</p>
        <p>CNV {Math.round(muse.mind.nodes.CONVICTION * 100)}</p>
      </div>
      {muse.mind.watching ? (
        <p className="mt-2 text-[11px] text-[#d8c7a0]">WATCHING ${muse.mind.watching}</p>
      ) : null}
      {muse.thought ? (
        <p className="mt-2 font-serif text-[12px] tracking-[0.14em] text-[#efe6d4]/55">{muse.thought}</p>
      ) : null}
    </>
  );
}

function MindReadout({ muse }: { muse: MuseState }) {
  const live = grokSignalLive(muse.mind);
  return (
    <div data-mind-panel="constellation">
      <p className="mt-3 text-[10px] tracking-[0.28em] text-[#8d8370]">CONSTELLATION</p>
      <MindConstellation nodes={muse.mind.nodes} />
      <div className="mt-1 grid grid-cols-5 gap-x-1 gap-y-1 text-[9px] tabular-nums tracking-[0.06em] text-[#cfc4ad]">
        {MIND_NODES.map((id) => (
          <p key={id} className={id === "GROK" ? "text-[#d7b56a]" : undefined}>
            {MIND_SHORT[id]} {Math.round(muse.mind.nodes[id] * 100)}
          </p>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tracking-[0.18em] text-[#cfc4ad]">
        <p>ACT {muse.mind.action}</p>
        <p className={live ? "text-[#d7b56a]" : "text-[#8d8370]"}>GROK {live ? "LIVE" : "IDLE"}</p>
      </div>
      {muse.mind.watching ? (
        <p className="mt-2 text-[11px] text-[#d8c7a0]">WATCHING ${muse.mind.watching}</p>
      ) : null}
      {muse.thought ? (
        <p className="mt-2 font-serif text-[12px] tracking-[0.14em] text-[#efe6d4]/55">{muse.thought}</p>
      ) : null}
    </div>
  );
}

function SelectedCard({
  muse,
  mindOpen,
  onEnterMind,
}: {
  muse: MuseState;
  mindOpen: boolean;
  onEnterMind: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-6 right-6 w-64 border border-[#3a342b]/70 bg-[#0d0c0a]/50 p-4 backdrop-blur-[2px]">
      <p className="font-serif text-lg tracking-[0.16em]">{muse.name}</p>
      <p className="text-[10px] tracking-[0.28em] text-[#b7a47a]">{muse.role}</p>
      {mindOpen ? <MindReadout muse={muse} /> : <GlanceReadout muse={muse} />}
      <button type="button" onClick={onEnterMind} className="mt-4 text-[10px] tracking-[0.28em]">
        {mindOpen ? "LEAVE MIND" : "ENTER MIND"}
      </button>
    </div>
  );
}

export function WorldHud({
  world,
  introLine,
  onPreset,
  onEnterMind,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  onPreset: (preset: CameraPreset) => void;
  onEnterMind: () => void;
}) {
  const selected = world.selected ? world.muses[world.selected] : null;

  return (
    <div className="pointer-events-none absolute inset-0 text-[#efe6d4]">
      <div className="pointer-events-auto absolute left-6 top-6">
        <p className="font-serif text-[11px] tracking-[0.42em]">MUSE WORLD</p>
        <p className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.28em] text-[#c8b892]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c8b892]" />
          LIVE
        </p>
      </div>
      <div className="pointer-events-auto absolute right-6 top-6 flex gap-4 text-[10px] tracking-[0.24em]">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onPreset(preset)}
            className={
              world.camera === preset ? "text-[#efe6d4]" : "text-[#8d8370] hover:text-[#efe6d4]"
            }
          >
            {preset}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {introLine ? (
          <motion.p
            key={introLine}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-[18%] -translate-x-1/2 font-serif text-3xl tracking-[0.18em] md:text-5xl"
          >
            {introLine}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <div className="pointer-events-auto absolute bottom-6 left-6 max-w-sm text-[11px] leading-5 tracking-[0.04em] text-[#cfc4ad]">
        {world.events.slice(0, 3).map((event) => (
          <p key={event.id}>{event.text}</p>
        ))}
      </div>
      {selected ? (
        <SelectedCard muse={selected} mindOpen={world.mindOpen} onEnterMind={onEnterMind} />
      ) : null}
    </div>
  );
}
