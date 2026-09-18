"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { emptyGrokChat, type GrokChatView } from "@/lib/world/screen-feed";
import { quietTape, type TapeView } from "@/lib/world/tape";

type LiveScreens = {
  tape: TapeView;
  grok: GrokChatView;
};

const LiveScreensContext = createContext<LiveScreens>({
  tape: quietTape(),
  grok: emptyGrokChat(),
});

export function TapeProvider({
  tape,
  grok,
  children,
}: {
  tape: TapeView;
  grok?: GrokChatView;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ tape, grok: grok ?? emptyGrokChat() }),
    [tape, grok],
  );
  return <LiveScreensContext.Provider value={value}>{children}</LiveScreensContext.Provider>;
}

export function useTape(): TapeView {
  return useContext(LiveScreensContext).tape;
}

export function useGrokPane(): GrokChatView {
  return useContext(LiveScreensContext).grok;
}
