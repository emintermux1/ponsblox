"use client";

import { useEffect, useState } from "react";
import {
  FIRST_PAINT_BUDGET,
  budgetFromSignals,
  readPerfSignals,
  type PerfBudget,
} from "@/lib/world/perf";

export function usePerfBudget(): {
  budget: PerfBudget;
  ready: boolean;
  markWebglLost: () => void;
} {
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(true);
  const [budget, setBudget] = useState<PerfBudget>(FIRST_PAINT_BUDGET);

  useEffect(() => {
    const apply = () => {
      setBudget(budgetFromSignals(readPerfSignals(), { webglLost: lost }));
      setReady(true);
    };
    apply();
    const media = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia(`(max-width: 767px)`),
    ];
    window.addEventListener("resize", apply);
    document.addEventListener("visibilitychange", apply);
    for (const query of media) {
      query.addEventListener("change", apply);
    }
    return () => {
      window.removeEventListener("resize", apply);
      document.removeEventListener("visibilitychange", apply);
      for (const query of media) {
        query.removeEventListener("change", apply);
      }
    };
  }, [lost]);

  return {
    budget,
    ready,
    markWebglLost: () => setLost(true),
  };
}
