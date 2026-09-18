"use client";

import { useEffect, useState } from "react";
import { mostAwakeId } from "@/components/watch/copy";
import { tickSnapshot, type Pulse } from "@/lib/sim/tick";
import { quietScreenPulse, sanitizeScreenPulse, type ScreenPulse } from "@/lib/world/screen-texture";
import { INTRO_CLEAR_MS, INTRO_COPY_AT_MS, presetForMuse } from "@/lib/world/camera";
import { seedWorld } from "@/lib/world/defaults";
import { PERF_BUDGET } from "@/lib/world/perf";
import type { CameraPreset, MuseId, WorldEvent, WorldSnapshot } from "@/types/world";

const INTRO_COPY = [
  "MUSE WORLD",
  "They don't wait for prompts",
  "Watch them live.",
] as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useLivingWorld() {
  const [world, setWorld] = useState<WorldSnapshot>(seedWorld);
  const [introDone, setIntroDone] = useState(prefersReducedMotion);
  const [introLine, setIntroLine] = useState<string | null>(
    prefersReducedMotion() ? null : INTRO_COPY[0],
  );
  const [pulse, setPulse] = useState<Pulse>(() => ({
    kind: "QUIET",
    ...quietScreenPulse(),
  }));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setIntroLine(null);
      return;
    }
    const timers = [
      window.setTimeout(() => setIntroLine(INTRO_COPY[1]), INTRO_COPY_AT_MS[1]),
      window.setTimeout(() => setIntroLine(INTRO_COPY[2]), INTRO_COPY_AT_MS[2]),
      window.setTimeout(() => setIntroLine(null), INTRO_CLEAR_MS),
    ];
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
          if (!cancelled) {
            const tape = sanitizeScreenPulse(next);
            const kind =
              tape.source === "sim"
                ? "QUIET"
                : next.kind === "TREND_SPIKE" || next.kind === "VIRAL_POST"
                  ? next.kind
                  : "QUIET";
            setPulse({ kind, ...tape });
          }
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
      const selected = current.selected ?? mostAwakeId(current);
      const next = current.selected ? !current.mindOpen : true;
      return {
        ...current,
        selected,
        mindOpen: next,
        camera: next ? "MIND" : presetForMuse(selected),
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
    pulse: pulse as ScreenPulse,
  };
}
