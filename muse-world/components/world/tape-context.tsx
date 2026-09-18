"use client";

import { createContext, useContext, type ReactNode } from "react";
import { quietTape, type TapeView } from "@/lib/world/tape";

const TapeContext = createContext<TapeView>(quietTape());

export function TapeProvider({
  tape,
  children,
}: {
  tape: TapeView;
  children: ReactNode;
}) {
  return <TapeContext.Provider value={tape}>{children}</TapeContext.Provider>;
}

export function useTape(): TapeView {
  return useContext(TapeContext);
}
