"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FIRST_PAINT_BUDGET, type PerfBudget } from "@/lib/world/perf";

const PerfContext = createContext<PerfBudget>(FIRST_PAINT_BUDGET);

export function PerfProvider({
  value,
  children,
}: {
  value: PerfBudget;
  children: ReactNode;
}) {
  return <PerfContext.Provider value={value}>{children}</PerfContext.Provider>;
}

export function usePerf(): PerfBudget {
  return useContext(PerfContext);
}
