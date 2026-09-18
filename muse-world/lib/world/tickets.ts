import { cleanTicker } from "@/lib/adapters/parse";
import { asTapeSource, type TapeSource, type TapeView } from "@/lib/world/tape";
import { assertNever } from "@/types/world";

export type TicketSide = "BUY" | "SELL";

export type SimTicket = {
  id: string;
  side: TicketSide;
  ticker: string | null;
  name: string | null;
  quoteUsd: number | null;
  quoteSource: TapeSource;
  label: "SIM";
  at: number;
  fills: readonly [];
};

export type TicketFlash = {
  side: TicketSide;
  at: number;
};

export type TicketBoard = {
  tickets: readonly SimTicket[];
  flash: TicketFlash | null;
  fills: readonly [];
};

export const TICKET_FLASH_MS = 720;
export const TICKET_LIMIT = 4;

export function quietTicketBoard(): TicketBoard {
  return { tickets: [], flash: null, fills: [] };
}

export function asTicketSide(value: unknown): TicketSide | null {
  switch (value) {
    case "BUY":
    case "SELL":
      return value;
    default:
      return null;
  }
}

export function ticketQuoteSource(tape: TapeView): TapeSource {
  if (tape.source === "sim" || tape.priceUsd == null || tape.priceUsd <= 0) {
    return "sim";
  }
  return asTapeSource(tape.source);
}

export function openSimTicket(
  board: TicketBoard,
  tape: TapeView,
  side: TicketSide,
  now: number,
): TicketBoard {
  if (tape.ticker && !cleanTicker(tape.ticker)) {
    return { ...board, fills: [] };
  }
  const ticker = cleanTicker(tape.ticker);
  const quoteSource = ticketQuoteSource(tape);
  const ticket: SimTicket = {
    id: `sim_${side.toLowerCase()}_${now}`,
    side,
    ticker,
    name: tape.name,
    quoteUsd: quoteSource === "sim" ? null : tape.priceUsd,
    quoteSource,
    label: "SIM",
    at: now,
    fills: [],
  };
  return {
    tickets: [ticket, ...board.tickets].slice(0, TICKET_LIMIT),
    flash: { side, at: now },
    fills: [],
  };
}

export function flashTicket(board: TicketBoard, side: TicketSide, now: number): TicketBoard {
  return { ...board, flash: { side, at: now }, fills: [] };
}

export function activeTicketFlash(board: TicketBoard, now: number): TicketFlash | null {
  if (!board.flash || now - board.flash.at > TICKET_FLASH_MS) {
    return null;
  }
  return board.flash;
}

export function ticketVerb(side: TicketSide): string {
  switch (side) {
    case "BUY":
      return "YES";
    case "SELL":
      return "NO";
    default:
      return assertNever(side);
  }
}
