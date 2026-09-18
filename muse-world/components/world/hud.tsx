"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CameraPreset, MuseId, WorldSnapshot } from "@/types/world";
import { presetForMuse } from "@/lib/world/camera";

const PRESETS: CameraPreset[] = [
  "ROOM",
  "LOUNGE",
  "TRADER",
  "BUILDER",
  "SCROLLER",
];

export function WorldHud({
  world,
  introLine,
  onPreset,
  onSelect,
  onEnterMind,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
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
        <div className="pointer-events-auto absolute bottom-6 right-6 w-56 border border-[#3a342b]/70 bg-[#0d0c0a]/45 p-4 backdrop-blur-[2px]">
          <p className="font-serif text-lg tracking-[0.16em]">{selected.name}</p>
          <p className="text-[10px] tracking-[0.28em] text-[#b7a47a]">{selected.role}</p>
          <p className="mt-3 text-[10px] tracking-[0.2em] text-[#8d8370]">STATE</p>
          <p className="text-sm">{selected.activity}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] tabular-nums">
            <p>ATT {Math.round(selected.mind.nodes.ATTENTION * 100)}</p>
            <p>RISK {Math.round(selected.mind.nodes.RISK * 100)}</p>
            <p>CNV {Math.round(selected.mind.nodes.CONVICTION * 100)}</p>
          </div>
          {selected.mind.watching ? (
            <p className="mt-2 text-[11px] text-[#d8c7a0]">WATCHING ${selected.mind.watching}</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onSelect(selected.id);
              onPreset(world.mindOpen ? presetForMuse(selected.id) : "MIND");
              onEnterMind();
            }}
            className="mt-4 text-[10px] tracking-[0.28em]"
          >
            {world.mindOpen ? "LEAVE MIND" : "ENTER MIND"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
