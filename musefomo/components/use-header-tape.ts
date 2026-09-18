"use client";

import { useEffect, useState } from "react";

import { TAPE_BUDGET_MS, TAPE_CACHE_MS } from "@/lib/constants";
import type { HeaderTapePayload } from "@/lib/header-tape";

let cached: { at: number; data: HeaderTapePayload } | null = null;
let inflight: Promise<HeaderTapePayload | null> | null = null;

function fetchHeaderTape(): Promise<HeaderTapePayload | null> {
  if (cached && Date.now() - cached.at < TAPE_CACHE_MS) return Promise.resolve(cached.data);
  if (inflight) return inflight;
  inflight = fetch("/api/tape", { signal: AbortSignal.timeout(TAPE_BUDGET_MS) })
    .then((res) => (res.ok ? (res.json() as Promise<HeaderTapePayload>) : null))
    .then((body) => {
      if (body && (body.items.length || body.memes.length || body.theses.length || body.prints.length)) {
        cached = { at: Date.now(), data: body };
      }
      return body;
    })
    .catch(() => cached?.data ?? null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useHeaderTape() {
  const [payload, setPayload] = useState<HeaderTapePayload | null>(cached?.data ?? null);

  useEffect(() => {
    let alive = true;
    let idleId: number | undefined;
    let usedIdle = false;

    const start = () => {
      void fetchHeaderTape().then((body) => {
        if (alive && body) setPayload(body);
      });
    };

    if (typeof requestIdleCallback === "function") {
      usedIdle = true;
      idleId = requestIdleCallback(start, { timeout: 400 });
    } else {
      idleId = window.setTimeout(start, 0);
    }
    const timer = window.setInterval(start, 12_000);
    return () => {
      alive = false;
      if (idleId != null) {
        if (usedIdle) cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
      window.clearInterval(timer);
    };
  }, []);

  return payload;
}
