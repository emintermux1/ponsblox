"use client";

import { useEffect, useState } from "react";
import { tickSnapshot, type Pulse } from "@/lib/sim/tick";
import { seedWorld } from "@/lib/world/defaults";
import type { CameraPreset, MuseId, WorldEvent, WorldSnapshot } from "@/types/world";
import { presetForMuse } from "@/lib/world/camera";

export function useLivingWorld() {
  const [world, setWorld] = useState<WorldSnapshot>(seedWorld);
  const [introDone, setIntroDone] = useState(false);
  const [pulse, setPulse] = useState<Pulse>({ kind: "QUIET", ticker: null });

  useEffect(() => {
    const id = window.setInterval(() => {
      setWorld((current) => tickSnapshot(current, pulse));
    }, 900);
    return () => window.clearInterval(id);
  }, [pulse]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
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
    void pull();
    const id = window.setInterval(() => void pull(), 14000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
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
    setIntroDone,
    select,
    setCamera,
    toggleMind,
  };
}
