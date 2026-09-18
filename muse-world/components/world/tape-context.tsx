"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { quietTape, type TapeView } from "@/lib/world/tape";
import {
  activeTicketFlash,
  flashTicket,
  openSimTicket,
  quietTicketBoard,
  type TicketBoard,
  type TicketFlash,
  type TicketSide,
  type SimTicket,
} from "@/lib/world/tickets";

const TapeContext = createContext<TapeView>(quietTape());

type TicketApi = {
  tickets: readonly SimTicket[];
  flash: TicketFlash | null;
  submit: (side: TicketSide) => void;
};

const TicketContext = createContext<TicketApi>({
  tickets: [],
  flash: null,
  submit: () => undefined,
});

export function TapeProvider({
  tape,
  children,
}: {
  tape: TapeView;
  children: ReactNode;
}) {
  return <TapeContext.Provider value={tape}>{children}</TapeContext.Provider>;
}

export function TicketProvider({ children }: { children: ReactNode }) {
  const tape = useTape();
  const [board, setBoard] = useState<TicketBoard>(quietTicketBoard);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let timer = 0;
    const pulse = () => {
      const at = Date.now();
      setNow(at);
      setBoard((current) => {
        const cycle = Math.floor(at / 5200) % 2;
        const side: TicketSide = cycle === 0 ? "BUY" : "SELL";
        if (current.flash && at - current.flash.at < 4800) {
          return current;
        }
        return flashTicket(current, side, at);
      });
      timer = window.setTimeout(pulse, 5200);
    };
    timer = window.setTimeout(pulse, 2600);
    return () => window.clearTimeout(timer);
  }, []);

  const value = useMemo<TicketApi>(
    () => ({
      tickets: board.tickets,
      flash: activeTicketFlash(board, now || Date.now()),
      submit: (side) => {
        setBoard((current) => openSimTicket(current, tape, side, Date.now()));
        setNow(Date.now());
      },
    }),
    [board, now, tape],
  );

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
}

export function useTape(): TapeView {
  return useContext(TapeContext);
}

export function useTickets(): TicketApi {
  return useContext(TicketContext);
}
