"use client";

import { useEffect, useState } from "react";
import { tickSnapshot, type Pulse } from "@/lib/sim/tick";
import { seedWorld } from "@/lib/world/defaults";
import { PERF_BUDGET } from "@/lib/world/perf";
import type { CameraPreset, MuseId, WorldEvent, WorldSnapshot } from "@/types/world";
import { presetForMuse } from "@/lib/world/camera";

export function useLivingWorld() {
  const [world, setWorld] = useState<WorldSnapshot>(seedWorld);
  const [introDone, setIntroDone] = useState(false);
  const [introLine, setIntroLine] = useState<string | null>("MUSE WORLD");
  const [pulse, setPulse] = useState<Pulse>({ kind: "QUIET", ticker: null });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroLine(null);
      setIntroDone(true);
      return;
    }
    const lines = [
      { at: 0, text: "MUSE WORLD" },
      { at: 3200, text: "They don’t wait for prompts." },
      { at: 7000, text: "Watch them live." },
      { at: 10800, text: null },
    ];
    const timers = lines.map((line) =>
      window.setTimeout(() => setIntroLine(line.text), line.at),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWorld((current) => tickSnapshot(current, pulse));
    }, PERF_BUDGET.tickMs);
    return () => window.clearInterval(id);
  }, [pulse]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (document.hidden) {
        return;
      }
      try {
        const market = await fetch("/api/market", { cache: "no-store" });
        if (market.ok) {
          const next = (await market.json()) as Pulse;
          if (!cancelled) setPulse(next);
        }
      } catch {
        /* fail-open local sim */
      }
      try {
        const events = await fetch("/api/events", { cache: "no-store" });
        if (!events.ok) return;
        const remote = (await events.json()) as WorldSnapshot;
        if (cancelled || remote.events.length === 0) return;
        setWorld((current) => {
          const seen = new Set(current.events.map((event) => event.id));
          const extra: WorldEvent[] = remote.events.filter((event) => !seen.has(event.id));
          if (extra.length === 0) return current;
          return { ...current, events: [...extra, ...current.events].slice(0, 24) };
        });
      } catch {
        /* local world still lives */
      }
    };
    const onVis = () => {
      if (!document.hidden) {
        void pull();
      }
    };
    void pull();
    const id = window.setInterval(() => void pull(), 14000);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const select = (id: MuseId | null) => {
    setWorld((current) => ({
      ...current,
      selected: id,
      mindOpen: id ? current.mindOpen : false,
      camera: id ? presetForMuse(id) : "ROOM",
    }));
  };

  const setCamera = (camera: CameraPreset) => {
    setWorld((current) => ({ ...current, camera, mindOpen: camera === "MIND" }));
  };

  const toggleMind = () => {
    setWorld((current) => {
      if (!current.selected) return current;
      const next = !current.mindOpen;
      return {
        ...current,
        mindOpen: next,
        camera: next ? "MIND" : presetForMuse(current.selected),
      };
    });
  };

  return {
    world,
    introDone,
    introLine,
    setIntroDone,
    select,
    setCamera,
    toggleMind,
  };
}
