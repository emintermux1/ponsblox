"use client";

import { useEffect, useState } from "react";
import type { WorldEvent } from "@/types/world";
import { assertNever } from "@/types/world";
import { roomNote } from "@/components/watch/copy";

export type StreetSignal =
  | { status: "idle" }
  | { status: "listening" }
  | { status: "unreachable"; at: number }
  | { status: "sim"; at: number }
  | { status: "gecko"; at: number; ticker: string | null };

export type SignalMark = "REAL" | "SIM" | "—";

export type LastSignal = {
  mark: SignalMark;
  line: string;
};

type MarketBody = {
  ticker?: unknown;
  source?: unknown;
};

export function useStreetSignal(): StreetSignal {
  const [signal, setSignal] = useState<StreetSignal>({ status: "listening" });

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setSignal({ status: "unreachable", at: Date.now() });
          }
          return;
        }
        const body = (await response.json()) as MarketBody;
        if (cancelled) {
          return;
        }
        if (
          body.source === "gecko" ||
          body.source === "birdeye" ||
          body.source === "gmgn" ||
          body.source === "helius"
        ) {
          setSignal({
            status: "gecko",
            at: Date.now(),
            ticker: typeof body.ticker === "string" ? body.ticker : null,
          });
          return;
        }
        setSignal({ status: "sim", at: Date.now() });
      } catch {
        if (!cancelled) {
          setSignal({ status: "unreachable", at: Date.now() });
        }
      }
    };

    void pull();
    const id = window.setInterval(() => void pull(), 14_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return signal;
}

export function streetTicker(signal: StreetSignal): string | null {
  switch (signal.status) {
    case "gecko":
      return signal.ticker;
    case "idle":
    case "listening":
    case "unreachable":
    case "sim":
      return null;
    default:
      return assertNever(signal);
  }
}

function streetStamp(signal: StreetSignal): number {
  switch (signal.status) {
    case "idle":
    case "listening":
      return 0;
    case "unreachable":
    case "sim":
    case "gecko":
      return signal.at;
    default:
      return assertNever(signal);
  }
}

function streetHonesty(signal: StreetSignal): LastSignal {
  switch (signal.status) {
    case "idle":
      return { mark: "—", line: "no street reading yet" };
    case "listening":
      return { mark: "—", line: "listening for the street" };
    case "unreachable":
      return { mark: "SIM", line: "the street is unreachable — the room continues" };
    case "sim":
      return { mark: "SIM", line: "gecko did not answer" };
    case "gecko":
      return {
        mark: "REAL",
        line: "outside — live tape",
      };
    default:
      return assertNever(signal);
  }
}

function grokHonesty(event: WorldEvent): LastSignal {
  switch (event.source) {
    case "bot":
    case "xai":
      return { mark: "REAL", line: roomNote(event) };
    case "sim":
    case "world":
      return { mark: "SIM", line: roomNote(event) };
    default:
      return assertNever(event.source);
  }
}

export function lastSignal(
  street: StreetSignal,
  events: WorldEvent[],
): LastSignal {
  const grok = events.find((event) => {
    switch (event.kind) {
      case "GROK_REQUESTED":
      case "GROK_RESPONSE":
        return true;
      case "TREND_SPIKE":
      case "NEW_DISCOVERY":
      case "POSITION_OPENED":
      case "POSITION_CLOSED":
      case "THESIS_CREATED":
      case "VIRAL_POST":
      case "BOREDOM":
      case "SOCIAL_REACTION":
        return false;
      default:
        return assertNever(event.kind);
    }
  });

  const streetAt = streetStamp(street);
  const grokAt = grok?.at ?? 0;
  if (grok && grokAt > streetAt) {
    return grokHonesty(grok);
  }
  if (streetAt > 0 || street.status === "listening") {
    return streetHonesty(street);
  }
  if (grok) {
    return grokHonesty(grok);
  }
  return { mark: "—", line: "no signal yet" };
}
