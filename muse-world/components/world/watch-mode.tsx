"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { MuseId, MuseState, WorldSnapshot } from "@/types/world";
import { MIND_NODES, MUSE_IDS, assertNever } from "@/types/world";
import { projectLoft, watchFrame } from "@/lib/world/perf";
import { usePerf } from "@/components/world/perf-context";

function museAccent(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#d8c6a6";
    case "trader":
      return "#2a2a28";
    case "chill":
      return "#3f7a4a";
    case "builder":
      return "#c9b48a";
    default:
      return assertNever(id);
  }
}

function MuseFigure({
  muse,
  selected,
  onSelect,
}: {
  muse: MuseState;
  selected: boolean;
  onSelect: () => void;
}) {
  const { reducedMotion } = usePerf();
  const point = projectLoft(muse.position);
  const seated =
    muse.activity === "CHILLING" ||
    muse.activity === "SMOKING" ||
    muse.activity === "IDLE";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="absolute -translate-x-1/2 -translate-y-full text-left"
      style={{ left: `${point.left}%`, top: `${point.top}%` }}
      animate={
        reducedMotion
          ? { left: `${point.left}%`, top: `${point.top}%` }
          : {
              left: `${point.left}%`,
              top: `${point.top}%`,
              y: seated ? 10 : [0, -3, 0],
            }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { y: { duration: 2.8, repeat: Infinity, ease: "easeInOut" }, duration: 0.9 }
      }
    >
      <span className="mb-1 block text-center font-serif text-[9px] tracking-[0.22em] text-[#efe6d4]/70">
        {muse.name}
      </span>
      {muse.thought ? (
        <span className="mb-2 block whitespace-nowrap text-center font-serif text-[11px] tracking-[0.12em] text-[#efe6d4]/85">
          {muse.thought}
        </span>
      ) : null}
      <span className="relative mx-auto block h-16 w-7">
        <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#f3efe6]" />
        <span
          className="absolute left-1/2 top-3.5 h-8 w-5 -translate-x-1/2 rounded-t-md"
          style={{ background: "#eee8dc" }}
        />
        <span
          className="absolute left-1/2 top-[18px] h-1.5 w-5 -translate-x-1/2"
          style={{ background: museAccent(muse.id) }}
        />
        {selected ? (
          <span className="absolute -bottom-1 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full bg-[#e6d3a8]/50" />
        ) : null}
      </span>
      <span className="mt-1 block text-center text-[8px] tracking-[0.2em] text-[#8d8370]">
        {muse.activity}
      </span>
    </motion.button>
  );
}

function Furniture() {
  const couch = projectLoft([-4.15, 0, 1.35]);
  const desk = projectLoft([3.4, 0, -0.85]);
  const wall = projectLoft([7.55, 0, 2.6]);
  const table = projectLoft([-2.7, 0, 2.2]);

  return (
    <>
      <div
        className="absolute h-[9%] w-[18%] -translate-x-1/2 -translate-y-1/2 bg-[#3c332b]"
        style={{ left: `${couch.left}%`, top: `${couch.top}%` }}
      />
      <div
        className="absolute h-[7%] w-[16%] -translate-x-1/2 -translate-y-1/2 bg-[#c4b7a2]/80"
        style={{ left: `${desk.left}%`, top: `${desk.top}%` }}
      />
      <div
        className="absolute h-[22%] w-[4%] -translate-x-1/2 -translate-y-1/2 bg-[#1a1713]"
        style={{ left: `${wall.left}%`, top: `${wall.top}%` }}
      />
      <div
        className="absolute h-2 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f1b16]"
        style={{ left: `${table.left}%`, top: `${table.top}%` }}
      />
    </>
  );
}

function CitySilhouette() {
  return (
    <div className="absolute inset-x-0 top-0 h-[38%] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#141820] via-[#1a1820] to-transparent" />
      {[
        { left: "6%", h: "42%", w: "7%" },
        { left: "16%", h: "58%", w: "5%" },
        { left: "24%", h: "36%", w: "8%" },
        { left: "36%", h: "64%", w: "6%" },
        { left: "48%", h: "48%", w: "9%" },
        { left: "62%", h: "70%", w: "5%" },
        { left: "72%", h: "40%", w: "7%" },
        { left: "84%", h: "55%", w: "8%" },
      ].map((tower) => (
        <div
          key={tower.left}
          className="absolute bottom-[18%] bg-[#151820]"
          style={{ left: tower.left, height: tower.h, width: tower.w }}
        />
      ))}
    </div>
  );
}

function WatchMind({ world }: { world: WorldSnapshot }) {
  if (!world.mindOpen || !world.selected) {
    return null;
  }
  const muse = world.muses[world.selected];
  return (
    <div className="pointer-events-none absolute inset-x-[12%] top-[16%] z-10 grid grid-cols-5 gap-3">
      {MIND_NODES.map((id) => (
        <div key={id} className="text-center">
          <span
            className="mx-auto block rounded-full bg-[#f0e6d2]"
            style={{
              width: 6 + muse.mind.nodes[id] * 10,
              height: 6 + muse.mind.nodes[id] * 10,
              opacity: 0.45 + muse.mind.nodes[id] * 0.45,
            }}
          />
          <span className="mt-1 block text-[8px] tracking-[0.18em] text-[#8d8370]">{id}</span>
        </div>
      ))}
    </div>
  );
}

function WatchPacket({ world, now }: { world: WorldSnapshot; now: number }) {
  if (!world.packet) {
    return null;
  }
  const u = Math.min(1, (now - world.packet.t) / 2200);
  if (u >= 1) {
    return null;
  }
  const from = projectLoft(world.muses[world.packet.from].position);
  const to = projectLoft(world.muses[world.packet.to].position);
  const left = from.left + (to.left - from.left) * u;
  const top = from.top + (to.top - from.top) * u - Math.sin(u * Math.PI) * 8;
  return (
    <div
      className="absolute z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#e8d2a0]"
      style={{ left: `${left}%`, top: `${top}%` }}
    />
  );
}

export function WatchMode({
  world,
  onSelect,
}: {
  world: WorldSnapshot;
  onSelect: (id: MuseId) => void;
}) {
  const { reducedMotion, hidden } = usePerf();
  const frame = watchFrame(world.camera);
  const selected = world.selected;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!world.packet || reducedMotion || hidden) {
      return;
    }
    let frameId = 0;
    const loop = () => {
      setNow(Date.now());
      frameId = window.requestAnimationFrame(loop);
    };
    frameId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frameId);
  }, [world.packet, reducedMotion, hidden]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0c10]">
      <CitySilhouette />
      <motion.div
        className="absolute inset-0 origin-center"
        animate={
          reducedMotion
            ? { x: 0, y: 0, scale: 1 }
            : { x: `${frame.x}%`, y: `${frame.y}%`, scale: frame.scale }
        }
        transition={{ duration: reducedMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-x-[6%] top-[8%] h-[34%] border-x border-[#2a241c]/80 bg-[#8aa0b4]/10">
          <div className="absolute inset-y-0 left-1/4 w-px bg-[#2a241c]/70" />
          <div className="absolute inset-y-0 left-2/4 w-px bg-[#2a241c]/70" />
          <div className="absolute inset-y-0 left-3/4 w-px bg-[#2a241c]/70" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-[#5a554c] via-[#6d675e] to-[#3d3832]">
          <div className="absolute left-[8%] top-[8%] h-[42%] w-[38%] bg-[#8b5a3c]/55" />
        </div>
        <Furniture />
        {MUSE_IDS.map((id) => (
          <MuseFigure
            key={id}
            muse={world.muses[id]}
            selected={selected === id}
            onSelect={() => onSelect(id)}
          />
        ))}
        <WatchPacket world={world} now={now} />
      </motion.div>
      <WatchMind world={world} />
    </div>
  );
}
