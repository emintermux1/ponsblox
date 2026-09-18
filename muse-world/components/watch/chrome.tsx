"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { presetForMuse } from "@/lib/world/camera";
import type {
  CameraPreset,
  MuseId,
  MuseState,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  EMPTY_SELECTION,
  ENTER_MIND,
  ENTRY_CAPTION,
  grokLine,
  isAwake,
  latestCaption,
  LEAVE_MIND,
  locationLabel,
  mostAwakeId,
  ROOM_PRESETS,
  roomNote,
  watchingLine,
  WORDMARK,
  WORLD_MARK,
} from "@/components/watch/copy";
import {
  lastSignal,
  streetTicker,
  useStreetSignal,
  type LastSignal,
  type StreetSignal,
} from "@/components/watch/signal";

export function SpectatorChrome({
  world,
  onPreset,
  onSelect,
}: {
  world: WorldSnapshot;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const settled = useEntrySettled(reduceMotion === true) || entered;
  const street = useStreetSignal();
  const selected = world.selected ? world.muses[world.selected] : null;
  const signal = lastSignal(street, world.events);
  const caption = latestCaption(world);
  const note = roomNote(world.events[0]);

  const enterMind = () => {
    const id = world.selected ?? mostAwakeId(world);
    setEntered(true);
    onSelect(id);
    onPreset("MIND");
  };

  const leaveMind = () => {
    if (!world.selected) {
      onPreset("ROOM");
      return;
    }
    onPreset(presetForMuse(world.selected));
  };

  return (
    <div className="loft-chrome pointer-events-none absolute inset-0 z-40 text-loft-paper">
      <AnimatePresence>
        {!settled ? (
          <EntryVeil
            key="veil"
            mindOpen={world.mindOpen}
            onEnter={enterMind}
            onLeave={leaveMind}
          />
        ) : null}
      </AnimatePresence>

      {settled ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: "easeOut" }}
        >
          <Wordmark signal={signal} />
          <Locations camera={world.camera} onPreset={onPreset} />
          <Roster world={world} selectedId={world.selected} onSelect={onSelect} />
          <div className="pointer-events-auto absolute bottom-5 right-5 sm:hidden">
            <MindButton
              mindOpen={world.mindOpen}
              onEnter={enterMind}
              onLeave={leaveMind}
            />
          </div>
          <div className="hidden sm:block">
            <SelectedPane
              selected={selected}
              mindOpen={world.mindOpen}
              street={street}
              onEnter={enterMind}
              onLeave={leaveMind}
            />
          </div>
          <p className="absolute bottom-[7.5rem] left-1/2 hidden max-w-md -translate-x-1/2 text-center font-serif text-[13px] italic leading-6 text-loft-paper/70 md:block">
            {note}
          </p>
          <AnimatePresence>
            {caption ? (
              <motion.p
                key={caption}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="thought-caption absolute bottom-8 left-1/2 hidden -translate-x-1/2 md:block"
              >
                {caption}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </div>
  );
}

function useEntrySettled(reduceMotion: boolean): boolean {
  const [settled, setSettled] = useState(reduceMotion);

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
    <motion.div
      className="loft-veil absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <p className="font-serif text-[clamp(3.4rem,9vw,7rem)] italic leading-none tracking-[-0.03em]">
        {WORDMARK}
      </p>
      <span className="loft-rule mt-5" />
      <p className="mt-5 font-serif text-[15px] italic text-loft-paper/72 md:text-[17px]">
        {ENTRY_CAPTION}
      </p>
      <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
    </motion.div>
  );
}

function Wordmark({ signal }: { signal: LastSignal }) {
  return (
    <div className="absolute left-5 top-5 max-w-[16rem] md:left-7 md:top-7">
      <p className="font-serif text-[1.65rem] italic leading-none tracking-[-0.03em] md:text-[1.85rem]">
        {WORDMARK}
      </p>
      <p className="mt-1 text-[9px] tracking-[0.28em] text-loft-brass/80">
        {WORLD_MARK}
      </p>
      <p className="mt-4 flex items-center gap-2 text-[10px] tracking-[0.16em] text-loft-paper/55">
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
  onSelect: (id: MuseId) => void;
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

function SelectedPane({
  selected,
  mindOpen,
  street,
  onEnter,
  onLeave,
}: {
  selected: MuseState | null;
  mindOpen: boolean;
  street: StreetSignal;
  onEnter: () => void;
  onLeave: () => void;
}) {
  if (!selected) {
    return (
      <div className="pointer-events-auto absolute bottom-5 right-5 w-[14.5rem] md:bottom-7 md:right-7">
        <p className="font-serif text-[13px] italic leading-6 text-loft-paper/62">
          {EMPTY_SELECTION}
        </p>
        <MindButton mindOpen={mindOpen} onEnter={onEnter} onLeave={onLeave} />
      </div>
    );
  }

  const held = watchingLine(selected.mind.watching, streetTicker(street));
  const tool = grokLine(selected.mind.grok);

  return (
    <div className="loft-glass pointer-events-auto absolute bottom-5 right-5 w-[15.5rem] p-4 md:bottom-7 md:right-7">
      <p className="font-serif text-[1.35rem] italic leading-none tracking-[-0.02em]">
        {selected.name}
      </p>
      <p className="mt-2 text-[10px] tracking-[0.2em] text-loft-brass/80">
        {selected.role}
      </p>
      <p className="mt-3 font-serif text-[14px] italic text-loft-paper/78">
        {activityLine(selected.activity)}
      </p>
      {held ? (
        <p className="mt-2 text-[12px] leading-5 text-loft-paper/52">{held}</p>
      ) : null}
      {tool ? (
        <p className="mt-2 font-serif text-[12px] italic leading-5 text-loft-paper/48">
          tool note — {tool}
        </p>
      ) : null}
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
      className="pointer-events-auto mt-5 text-[10px] tracking-[0.32em] text-loft-brass transition-colors duration-300 hover:text-loft-paper"
    >
      {mindOpen ? LEAVE_MIND : ENTER_MIND}
    </button>
  );
}
