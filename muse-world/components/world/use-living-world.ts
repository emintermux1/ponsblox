"use client";

import { useEffect, useRef, useState } from "react";
import { INTRO_COPY, WORDMARK, mostAwakeId } from "@/components/watch/copy";
import { tickSnapshot, type Pulse } from "@/lib/sim/tick";
import { INTRO_CLEAR_MS, INTRO_COPY_AT_MS, presetForMuse } from "@/lib/world/camera";
import { seedWorld } from "@/lib/world/defaults";
import { PERF_BUDGET } from "@/lib/world/perf";
import {
  applyGrokFocus,
  applyGrokWake,
  applyMuseSelect,
  applyScreenInspect,
  type WakePayload,
} from "@/lib/world/pick";
import { quietScreenPulse, sanitizeScreenPulse } from "@/lib/world/screen-texture";
import { quietTape, tapeFromPulse, type TapeView } from "@/lib/world/tape";
import { rememberPulseName } from "@/lib/world/wall-copy";
import type { CameraPreset, MuseId, ScreenId, WorldEvent, WorldSnapshot } from "@/types/world";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function introLines(): readonly [string, string, string] {
  if (!INTRO_COPY || INTRO_COPY.length < 3) {
    return [WORDMARK, WORDMARK, WORDMARK];
  }
  return [INTRO_COPY[0] ?? WORDMARK, INTRO_COPY[1] ?? WORDMARK, INTRO_COPY[2] ?? WORDMARK];
}

export function useLivingWorld() {
  const [world, setWorld] = useState<WorldSnapshot>(seedWorld);
  const [introDone, setIntroDone] = useState(prefersReducedMotion);
  const [introLine, setIntroLine] = useState<string | null>(
    prefersReducedMotion() ? null : introLines()[0],
  );
  const [pulse, setPulse] = useState<Pulse>(() => ({
    kind: "QUIET",
    ...quietScreenPulse(),
  }));
  const [tape, setTape] = useState<TapeView>(quietTape);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setIntroLine(null);
      return;
    }
    const lines = introLines();
    const at = INTRO_COPY_AT_MS ?? ([0, 3200, 7000] as const);
    const clearAt = INTRO_CLEAR_MS ?? 10_800;
    const timers = [
      window.setTimeout(() => setIntroLine(lines[1]), at[1]),
      window.setTimeout(() => setIntroLine(lines[2]), at[2]),
      window.setTimeout(() => setIntroLine(null), clearAt),
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
          const next = (await market.json()) as Pulse & { name?: string | null };
          if (!cancelled) {
            rememberPulseName(next.name ?? null);
            setPulse(next);
            setTape(tapeFromPulse(next));
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

  const wakingRef = useRef(false);

  const select = (id: MuseId | null) => {
    setWorld((current) => applyMuseSelect(current, id));
  };

  const inspect = (id: ScreenId | null) => {
    setWorld((current) => applyScreenInspect(current, id));
  };

  const setCamera = (camera: CameraPreset) => {
    setWorld((current) => ({
      ...current,
      camera,
      mindOpen: camera === "MIND",
      inspecting: camera === "TRADER" ? current.inspecting : null,
    }));
  };

  const toggleMind = () => {
    setWorld((current) => {
      const selected = current.selected ?? mostAwakeId(current);
      const next = current.selected ? !current.mindOpen : true;
      return {
        ...current,
        selected,
        inspecting: null,
        mindOpen: next,
        camera: next ? "MIND" : presetForMuse(selected),
      };
    });
  };

  const wakeGrok = () => {
    if (wakingRef.current) {
      return;
    }
    const subject = world.selected ?? mostAwakeId(world);
    const muse = world.muses[subject];
    wakingRef.current = true;
    setWorld((current) => applyGrokFocus(current, subject));
    void (async () => {
      try {
        const response = await fetch("/api/grok/wake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            museId: subject,
            goal: muse.mind.goal,
            observation: muse.mind.observed,
          }),
        });
        const payload = (response.ok ? await response.json() : null) as WakePayload | null;
        setWorld((current) => applyGrokWake(current, payload, subject));
      } catch {
        setWorld((current) => applyGrokWake(current, null, subject));
      } finally {
        wakingRef.current = false;
      }
    })();
  };

  return {
    world,
    tape,
    pulse: sanitizeScreenPulse(pulse),
    introDone,
    introLine,
    setIntroDone,
    select,
    inspect,
    wakeGrok,
    setCamera,
    toggleMind,
  };
}
