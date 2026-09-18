"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { activityLine, asCaption } from "@/components/watch/copy";
import { usePerf } from "@/components/world/perf-context";
import { useTape } from "@/components/world/tape-context";
import { GROK_ORB_POS, SCREEN_POS, wallSlotWorld } from "@/lib/world/layout";
import { tapeHeadline } from "@/lib/world/tape";
import { projectLoft, watchFrame } from "@/lib/world/perf";
import type { MuseId, MuseState, PacketEndpoint, ScreenId, WorldSnapshot } from "@/types/world";
import { MIND_NODES, MUSE_IDS, SCREEN_IDS, assertNever } from "@/types/world";

function loftPoint(world: WorldSnapshot, endpoint: PacketEndpoint): { left: number; top: number } {
  switch (endpoint) {
    case "scroller":
    case "trader":
    case "chill":
    case "builder":
      return projectLoft(world.muses[endpoint].position);
    case "wall":
      return projectLoft(wallSlotWorld(world.packet?.slot ?? 0));
    case "grok":
      return projectLoft(GROK_ORB_POS);
    default:
      return assertNever(endpoint);
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
      <span className="relative mx-auto block h-[78px] w-12">
        {muse.id === "chill" ? (
          <span className="absolute bottom-1 left-1/2 h-7 w-10 -translate-x-1/2 rounded-sm bg-[#5c4a3e]" />
        ) : null}
        <span className="absolute left-1/2 top-2 h-[46px] w-10 -translate-x-1/2 rounded-[20px] bg-[#f6f1e8] shadow-[0_0_14px_rgba(246,241,232,0.22)]" />
        {muse.id === "trader" ? (
          <span className="absolute left-1/2 top-[22px] h-7 w-10 -translate-x-1/2 rounded-b-[16px] bg-[#1a1d24]" />
        ) : null}
        <span className="absolute left-[14px] top-[18px] h-[3px] w-[7px] rounded-full bg-[#1a1d33]" />
        <span className="absolute right-[14px] top-[18px] h-[3px] w-[7px] rounded-full bg-[#1a1d33]" />
        <span className="absolute left-[13px] top-[26px] h-1.5 w-1.5 rounded-full bg-[#f0b4ae]/80" />
        <span className="absolute right-[13px] top-[26px] h-1.5 w-1.5 rounded-full bg-[#f0b4ae]/80" />
        {muse.id === "scroller" ? (
          <span className="absolute left-1/2 top-1 h-3 w-9 -translate-x-1/2 rounded-full border border-[#14161c]" />
        ) : null}
        {muse.id === "trader" ? (
          <span className="absolute left-1/2 top-0.5 h-2.5 w-7 -translate-x-1/2 rounded-t-full bg-[#14161c]" />
        ) : null}
        {muse.id === "chill" ? (
          <span className="absolute left-1/2 top-[30px] h-1.5 w-8 -translate-x-1/2 rounded-full bg-[#3f7a4a]" />
        ) : null}
        {muse.id === "builder" ? (
          <span className="absolute bottom-3 right-0 h-3 w-4 rounded-[2px] bg-[#ead9c0]" />
        ) : null}
        {muse.id === "scroller" || muse.id === "trader" ? (
          <span className="absolute bottom-2 left-1/2 h-3 w-5 -translate-x-1/2 rounded-[2px] bg-[#3a3d42]" />
        ) : null}
        {selected ? (
          <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-[#e6d3a8]/55" />
        ) : null}
      </span>
      <span className="mt-1 block min-h-11 cursor-pointer text-center text-base font-medium tracking-wide text-[#efe6d4]">
        {muse.name}
      </span>
      <span className="block cursor-pointer text-center text-[8px] tracking-[0.18em] text-[#c9b48a]">
        {muse.role}
      </span>
      <span className="block cursor-pointer text-center text-sm tracking-normal text-[#cfc3aa]">
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
          <span className="h-3 w-5 bg-[#0e1216]" aria-hidden />
          <span className="h-3 w-5 bg-[#0e1216]" aria-hidden />
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

function WatchMind({ world }: { world: WorldSnapshot }) {
  if (!world.mindOpen || !world.selected) {
    return null;
  }
  const muse = world.muses[world.selected];
  return (
    <div className="pointer-events-none absolute inset-x-[10%] top-[14%] z-30 grid grid-cols-5 gap-3">
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

function WatchGrok({
  waking,
  honesty,
  onWake,
}: {
  waking: boolean;
  honesty: WorldSnapshot["grokWake"]["honesty"];
  onWake: () => void;
}) {
  const point = projectLoft(GROK_ORB_POS);
  return (
    <button
      type="button"
      onClick={onWake}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-center"
      style={{ left: `${point.left}%`, top: `${point.top}%` }}
      aria-label="GROK"
    >
      <span
        className="relative mx-auto block h-8 w-8 rounded-full bg-[#f5f5f2] shadow-[0_0_16px_rgba(245,245,242,0.28)]"
        style={{ transform: waking ? "scale(1.06)" : "scale(1)" }}
      >
        <span className="absolute left-[28%] top-[30%] h-[10px] w-[3px] rounded-full bg-[#141414]" />
        <span className="absolute right-[28%] top-[30%] h-[10px] w-[3px] rounded-full bg-[#141414]" />
      </span>
      <span className="mt-1 block text-[9px] tracking-[0.2em] text-[#f7f7f5]">GROK</span>
      <span className="block text-[8px] tracking-[0.16em] text-[#c9ae7a]">{honesty ?? "SIM"}</span>
    </button>
  );
}

function screenLabel(id: ScreenId): string {
  switch (id) {
    case "tape":
      return "Tape";
    case "notes":
      return "Notes";
    default:
      return assertNever(id);
  }
}

function WatchScreens({
  inspecting,
  onInspect,
}: {
  inspecting: ScreenId | null;
  onInspect: (id: ScreenId) => void;
}) {
  const tape = useTape();
  return (
    <>
      {SCREEN_IDS.map((id) => {
        const point = projectLoft(SCREEN_POS[id]);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onInspect(id)}
            className="absolute z-20 flex h-4 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden bg-[#0e1216] text-[5px] leading-none text-[#d7b56a]"
            style={{
              left: `${point.left}%`,
              top: `${point.top}%`,
              boxShadow: inspecting === id ? "0 0 10px rgba(74,106,130,0.7)" : undefined,
            }}
            aria-label={screenLabel(id)}
          >
            {tapeHeadline(tape)}
          </button>
        );
      })}
    </>
  );
}

export function WatchMode({
  world,
  onSelect,
  onInspect,
  onWakeGrok,
}: {
  world: WorldSnapshot;
  onSelect: (id: MuseId) => void;
  onInspect: (id: ScreenId) => void;
  onWakeGrok: () => void;
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
        <WatchScreens inspecting={world.inspecting} onInspect={onInspect} />
        <WatchGrok
          waking={world.grokWake.phase === "waking"}
          honesty={world.grokWake.honesty}
          onWake={onWakeGrok}
        />
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
