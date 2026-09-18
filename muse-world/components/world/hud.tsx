"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CameraPreset, MuseId, WorldSnapshot } from "@/types/world";

const PRESETS: CameraPreset[] = ["ROOM", "LOUNGE", "TRADER", "BUILDER", "SCROLLER"];

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] as const },
};

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
  const latest = selected ? null : (world.events[0] ?? null);
  const showChrome = !introLine;

  return (
    <div className="pointer-events-none absolute inset-0 text-[#efe6d4]">
      <div className="absolute left-6 top-6">
        <p className="font-serif text-[11px] tracking-[0.42em]">MUSE WORLD</p>
        <p className="mt-2 flex items-center gap-2 text-[10px] tracking-[0.32em] text-[#c8b892]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c8b892]" />
          LIVE
        </p>
      </div>

      <AnimatePresence>
        {showChrome ? (
          <motion.div
            key="presets"
            {...fade}
            className="pointer-events-auto absolute right-6 top-6 flex gap-4 text-[9px] tracking-[0.28em] text-[#5c564c]"
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
            className="absolute left-1/2 top-[18%] -translate-x-1/2 text-center font-serif text-3xl tracking-[0.1em] md:text-5xl"
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
            className="absolute bottom-6 left-6 max-w-xs text-[10px] tracking-[0.08em] text-[#8d8370]"
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
            <div className="mt-3 flex items-center justify-center gap-5 text-[10px] tracking-[0.28em] text-[#b7a47a]">
              <button type="button" onClick={() => onSelect(null)}>
                ROOM
              </button>
              <button type="button" onClick={onEnterMind}>
                {world.mindOpen ? "LEAVE" : "MIND"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
