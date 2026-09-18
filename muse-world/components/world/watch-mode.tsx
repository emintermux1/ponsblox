"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { activityLine, asCaption } from "@/components/watch/copy";
import { usePerf } from "@/components/world/perf-context";
import { wallSlotWorld } from "@/lib/world/layout";
import { projectLoft, watchFrame } from "@/lib/world/perf";
import type { MuseId, MuseState, PacketEndpoint, WorldSnapshot } from "@/types/world";
import { MUSE_IDS, assertNever } from "@/types/world";

function loftPoint(world: WorldSnapshot, endpoint: PacketEndpoint): { left: number; top: number } {
  switch (endpoint) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return projectLoft(world.muses[endpoint].position);
    case "wall":
      return projectLoft(wallSlotWorld(world.packet?.slot ?? 0));
    default:
      return assertNever(endpoint);
  }
}

function museAccent(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#d8b98c";
    case "trader":
      return "#2a2a28";
    case "chill":
      return "#4a7d55";
    case "builder":
      return "#c9b48a";
    default:
      return assertNever(id);
  }
}

function botAccent(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#e8a84e";
    case "trader":
      return "#7fd4e8";
    case "chill":
      return "#8fc79a";
    case "builder":
      return "#e6c579";
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
  const caption = asCaption(muse.thought);
  const seated =
    muse.activity === "CHILLING" ||
    muse.activity === "SMOKING" ||
    muse.activity === "IDLE";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="absolute z-20 -translate-x-1/2 -translate-y-full text-left"
      style={{ left: `${point.left}%`, top: `${point.top}%` }}
      animate={
        reducedMotion
          ? { left: `${point.left}%`, top: `${point.top}%` }
          : {
              left: `${point.left}%`,
              top: `${point.top}%`,
              y: seated ? 8 : [0, -2, 0],
            }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { y: { duration: 3.4, repeat: Infinity, ease: "easeInOut" }, duration: 0.85 }
      }
    >
      {caption ? (
        <span className="thought-caption mb-2 block text-center">{caption}</span>
      ) : null}
      <span className="relative mx-auto block h-[74px] w-10">
        <span className="absolute left-[2px] top-1 h-[18px] w-[9px] -rotate-[16deg] rounded-full bg-[#e3d3b8]" />
        <span className="absolute right-[2px] top-1 h-[18px] w-[9px] rotate-[16deg] rounded-full bg-[#e3d3b8]" />
        <span className="absolute left-1/2 top-0 h-[26px] w-[26px] -translate-x-1/2 rounded-full bg-[#f1e7d2] shadow-[0_0_12px_rgba(243,239,230,0.22)]" />
        <span className="absolute left-1/2 top-[10px] h-[4px] w-[4px] -translate-x-[7px] rounded-full bg-[#191411]" />
        <span className="absolute left-1/2 top-[10px] h-[4px] w-[4px] translate-x-[3px] rounded-full bg-[#191411]" />
        <span className="absolute left-1/2 top-[15px] h-[3px] w-[4px] -translate-x-[11px] rounded-full bg-[#e59a83]/80" />
        <span className="absolute left-1/2 top-[15px] h-[3px] w-[4px] translate-x-[7px] rounded-full bg-[#e59a83]/80" />
        <span className="absolute left-1/2 top-[22px] h-[30px] w-[26px] -translate-x-1/2 rounded-[12px] bg-[#ede2cc]" />
        <span
          className="absolute left-1/2 top-[33px] h-1.5 w-[26px] -translate-x-1/2 rounded-sm"
          style={{ background: museAccent(muse.id) }}
        />
        <span className="absolute bottom-1 left-1/2 h-[9px] w-[10px] -translate-x-[12px] rounded-full bg-[#e3d3b8]" />
        <span className="absolute bottom-1 left-1/2 h-[9px] w-[10px] translate-x-[2px] rounded-full bg-[#e3d3b8]" />
        <span className="absolute -right-2 top-[26px] h-[18px] w-[13px] rounded-[7px] bg-[#f6f5f1] shadow-[0_0_8px_rgba(246,245,241,0.3)]">
          <span className="absolute inset-x-[3px] top-[4px] h-[6px] rounded-full bg-[#0b0c10]" />
          <span
            className="absolute inset-x-[2px] bottom-[2px] h-[2px] rounded-full"
            style={{ background: botAccent(muse.id) }}
          />
        </span>
        {selected ? (
          <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-[#e6d3a8]/55" />
        ) : null}
      </span>
      <span className="mt-1 block text-center font-serif text-[9px] tracking-[0.2em] text-[#efe6d4]/70">
        {muse.name}
      </span>
      <span className="block text-center text-[8px] tracking-[0.18em] text-[#8d8370]">
        {activityLine(muse.activity)}
      </span>
    </motion.button>
  );
}

function CitySilhouette() {
  const towers = [
    { left: "4%", h: "38%", w: "6%" },
    { left: "12%", h: "62%", w: "4%" },
    { left: "18%", h: "44%", w: "7%" },
    { left: "28%", h: "72%", w: "5%" },
    { left: "36%", h: "50%", w: "8%" },
    { left: "48%", h: "66%", w: "5%" },
    { left: "56%", h: "40%", w: "6%" },
    { left: "66%", h: "78%", w: "4%" },
    { left: "73%", h: "48%", w: "7%" },
    { left: "84%", h: "60%", w: "8%" },
  ];
  return (
    <div className="absolute inset-x-0 top-0 h-[42%] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#15202c] via-[#243646] to-[#3a2c20]" />
      {towers.map((tower) => (
        <div
          key={tower.left}
          className="absolute bottom-[16%] bg-[#12151c]"
          style={{ left: tower.left, height: tower.h, width: tower.w }}
        >
          <span className="absolute left-[30%] top-[28%] h-1 w-1 bg-[#c4b392]/25" />
          <span className="absolute left-[55%] top-[48%] h-1 w-1 bg-[#c4b392]/20" />
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#2a2118] to-transparent" />
    </div>
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
        className="absolute z-10 h-[11%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#3c332b] shadow-[0_10px_24px_#00000055]"
        style={{ left: `${couch.left}%`, top: `${couch.top}%` }}
      >
        <div className="absolute inset-x-2 top-1 h-2 bg-[#2f2923]" />
      </div>
      <div
        className="absolute z-10 h-[8%] w-[18%] -translate-x-1/2 -translate-y-1/2 bg-[#4a2c18] shadow-[0_8px_18px_#00000040]"
        style={{ left: `${desk.left}%`, top: `${desk.top}%` }}
      >
        <div className="absolute inset-x-3 -top-3 flex justify-between">
          <span className="h-3 w-5 bg-[#0e1216]" />
          <span className="h-3 w-5 bg-[#0e1216]" />
        </div>
      </div>
      <div
        className="absolute z-10 h-[26%] w-[5%] -translate-x-1/2 -translate-y-1/2 bg-[#1a1713]"
        style={{ left: `${wall.left}%`, top: `${wall.top}%` }}
      >
        <span className="absolute left-1 top-3 h-4 w-3 bg-[#e6d7bc]" />
        <span className="absolute left-1 top-9 h-4 w-3 bg-[#e6d7bc]/80" />
        <span className="absolute left-1 top-16 h-4 w-3 bg-[#e6d7bc]/70" />
      </div>
      <div
        className="absolute z-10 h-2.5 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f1b16]"
        style={{ left: `${table.left}%`, top: `${table.top}%` }}
      />
    </>
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
  const from = loftPoint(world, world.packet.from);
  const to = loftPoint(world, world.packet.to);
  const left = from.left + (to.left - from.left) * u;
  const top = from.top + (to.top - from.top) * u - Math.sin(u * Math.PI) * 8;
  return (
    <div
      className="absolute z-30 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#e8d2a0]"
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
    <div className="absolute inset-0 overflow-hidden bg-[#15202c]">
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
        <div className="absolute inset-x-[5%] top-[7%] z-10 h-[36%] border border-[#c8c5be]/40 bg-[#8a96a2]/10">
          <div className="absolute inset-y-0 left-1/4 w-px bg-[#c8c5be]/70" />
          <div className="absolute inset-y-0 left-2/4 w-px bg-[#c8c5be]/70" />
          <div className="absolute inset-y-0 left-3/4 w-px bg-[#c8c5be]/70" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#c8c5be]/40" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b from-[#8a8680] via-[#6a645c] to-[#4a3426]">
          <div className="absolute left-[9%] top-[8%] h-[46%] w-[40%] bg-[#5c4a3e]/55" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#15202c]/35 to-transparent" />
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
    </div>
  );
}
