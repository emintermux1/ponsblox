"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { FomoScanPill, MusePill } from "@/components/fomoscan-mark";
import { IconSearch } from "@/components/icons";
import { Pfp } from "@/components/pfp";
import { TokenIcon } from "@/components/token-icon";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/lib/constants";
import { changeTone, formatUsd, looksLikeEvm, looksLikeMint, looksLikeTokenRef } from "@/lib/format";
import { humanHref, museHref } from "@/lib/hrefs";
import { KNOWN_MINTS, LIQUID_MINT_ALIASES, knownTokenMarket } from "@/lib/known-mints";
import { resolvePinnedQuery } from "@/lib/pinned-tokens";
import { popoverSpring } from "@/lib/motion";
import type { SearchPayload, TokenMarket } from "@/lib/types";

const CLIENT_TTL_MS = 12_000;
const FETCH_MS = 2_000;
const clientHits = new Map<string, { at: number; data: SearchPayload }>();

function cacheKey(q: string): string {
  return q.trim().toLowerCase();
}

function readClient(q: string): SearchPayload | null {
  const hit = clientHits.get(cacheKey(q));
  if (!hit || Date.now() - hit.at > CLIENT_TTL_MS) return null;
  return hit.data;
}

function writeClient(q: string, data: SearchPayload) {
  clientHits.set(cacheKey(q), { at: Date.now(), data });
}

function stubMarket(row: TokenMarket): TokenMarket {
  return {
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: row.imageUrl,
    priceUsd: row.priceUsd,
    priceChange24h: row.priceChange24h,
    volume24h: row.volume24h,
    liquidityUsd: row.liquidityUsd,
    marketCap: row.marketCap,
    fdv: row.fdv,
    pairAddress: row.pairAddress,
    dexId: row.dexId,
    decimals: row.decimals,
    buys24h: row.buys24h,
    sells24h: row.sells24h,
    buyVolume24h: row.buyVolume24h,
    sellVolume24h: row.sellVolume24h,
    holderCount: row.holderCount,
  };
}

function localTokenHits(raw: string): TokenMarket[] {
  const needle = raw.replace(/^\$/, "").trim();
  if (needle.length < SEARCH_MIN_CHARS) return [];
  const lower = needle.toLowerCase();
  const out: TokenMarket[] = [];
  const seen = new Set<string>();
  const push = (row: TokenMarket | null) => {
    if (!row?.mint || seen.has(row.mint)) return;
    seen.add(row.mint);
    out.push(stubMarket(row));
  };

  const official = LIQUID_MINT_ALIASES[lower] ?? resolvePinnedQuery(needle);
  if (official) push(knownTokenMarket(official));
  if (looksLikeMint(needle) || looksLikeEvm(needle)) push(knownTokenMarket(needle));

  for (const known of Object.values(KNOWN_MINTS)) {
    if (known.symbol.toLowerCase().includes(lower) || known.name.toLowerCase().includes(lower)) {
      push(knownTokenMarket(known.mint));
    }
  }
  return out;
}

function mergeHits(q: string, local: TokenMarket[], remote: SearchPayload | null): SearchPayload {
  const tokens: TokenMarket[] = [];
  const seen = new Set<string>();
  for (const row of [...local, ...(remote?.tokens ?? []), remote?.token ?? null]) {
    if (!row?.mint || seen.has(row.mint)) continue;
    seen.add(row.mint);
    tokens.push(row);
  }
  return {
    q,
    tokens,
    agents: remote?.agents ?? [],
    fomo: remote?.fomo ?? remote?.trader ?? null,
    token: tokens[0] ?? null,
    trader: remote?.trader ?? remote?.fomo ?? null,
  };
}

function tokenHref(mint: string): string {
  return `/token/${mint}`;
}

export function SearchBox() {
  const router = useRouter();
  const root = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<SearchPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);

  const local = useMemo(() => localTokenHits(q), [q]);
  const results = useMemo(() => mergeHits(q, local, remote), [local, q, remote]);
  const fomo = results.fomo ?? results.trader;
  const picks = useMemo(() => {
    const items: Array<{ key: string; href: string }> = results.tokens.map((token) => ({
      key: `t:${token.mint}`,
      href: tokenHref(token.mint),
    }));
    for (const agent of results.agents) {
      items.push({ key: `a:${agent.id}`, href: museHref(agent.id) });
    }
    if (fomo) items.push({ key: `h:${fomo.handle}`, href: humanHref(fomo.handle) });
    return items;
  }, [fomo, results.agents, results.tokens]);

  useEffect(() => {
    const value = q.trim();
    if (value.length < SEARCH_MIN_CHARS) {
      setRemote(null);
      setBusy(false);
      return;
    }
    const cached = readClient(value);
    if (cached) {
      setRemote(cached);
      setBusy(false);
    } else {
      setBusy(true);
    }
    const controller = new AbortController();
    const kill = window.setTimeout(() => controller.abort(), FETCH_MS);
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: SearchPayload | null) => {
          if (!body) return;
          writeClient(value, body);
          setRemote(body);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (!cached) setRemote(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, cached ? 0 : SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(kill);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    setCursor(0);
  }, [q, results.tokens.length, results.agents.length, fomo?.handle]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function goHref(href: string) {
    setOpen(false);
    router.push(href);
  }

  function go(event: React.FormEvent) {
    event.preventDefault();
    const value = q.trim();
    if (!value) return;
    const selected = picks[cursor] ?? picks[0];
    if (selected) {
      goHref(selected.href);
      return;
    }
    if (looksLikeTokenRef(value)) {
      goHref(tokenHref(value));
      return;
    }
    const pinned = resolvePinnedQuery(value);
    if (pinned) {
      goHref(tokenHref(pinned));
      return;
    }
    goHref(`/discover?q=${encodeURIComponent(value)}`);
  }

  function onBoxKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || picks.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((prev) => (prev + 1) % picks.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((prev) => (prev - 1 + picks.length) % picks.length);
      return;
    }
  }

  const show = open && q.trim().length >= SEARCH_MIN_CHARS;
  const empty = picks.length === 0;
  const row = "mf-row flex items-center gap-2 rounded-[12px] px-2.5 py-2";

  return (
    <form ref={root} onSubmit={go} className="relative min-w-0 flex-1">
      <span
        className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${
          busy ? "text-ice" : "text-mute"
        }`}
      >
        <IconSearch />
      </span>
      <input
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onBoxKey}
        role="combobox"
        aria-expanded={show}
        aria-autocomplete="list"
        aria-controls="mf-search-hits"
        placeholder="Token, mint, or @handle"
        className="mf-search h-8 w-full rounded-[12px] py-0 pl-8 pr-3 text-[13px] tracking-tight outline-none placeholder:text-mute"
      />
      <AnimatePresence>
        {show ? (
          <motion.div
            id="mf-search-hits"
            role="listbox"
            className="mf-sheet absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[16px] border border-line p-1.5"
            {...popoverSpring}
          >
            <div className="relative max-h-80 overflow-y-auto">
              {busy && empty ? (
                <p className="px-2.5 py-2 font-mono text-[11px] text-mute">Live markets…</p>
              ) : null}
              {!busy && empty ? (
                <p className="px-2.5 py-2 text-[12px] text-mute">No live matches</p>
              ) : null}
              {results.tokens.length ? (
                <section>
                  <p className="mf-kicker px-2.5 pt-1.5">Tokens</p>
                  {results.tokens.map((token, index) => {
                    const active = cursor === index;
                    const title = token.name ?? token.symbol ?? "Token";
                    const symbol = token.symbol && token.symbol !== title ? token.symbol : null;
                    return (
                      <Link
                        key={token.mint}
                        href={tokenHref(token.mint)}
                        role="option"
                        aria-selected={active}
                        onClick={() => setOpen(false)}
                        className={`${row} ${active ? "mf-glass-hit" : ""}`}
                      >
                        <TokenIcon src={token.imageUrl} mint={token.mint} symbol={token.symbol} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">{title}</span>
                          <span className="block truncate font-mono text-[10px] text-mute">
                            {symbol ?? token.mint.slice(0, 4)}
                          </span>
                        </span>
                        <span className="ml-auto text-right">
                          <span className="block font-mono text-[11px]">{formatUsd(token.priceUsd)}</span>
                          <span className={`block font-mono text-[10px] ${changeTone(token.priceChange24h)}`}>
                            {token.priceChange24h == null
                              ? ""
                              : `${token.priceChange24h > 0 ? "+" : ""}${token.priceChange24h.toFixed(1)}%`}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </section>
              ) : null}
              {results.agents.length ? (
                <section>
                  <p className="mf-kicker px-2.5 pt-1.5">Muse agents</p>
                  {results.agents.map((agent, index) => {
                    const active = cursor === results.tokens.length + index;
                    return (
                      <Link
                        key={agent.id}
                        href={museHref(agent.id)}
                        role="option"
                        aria-selected={active}
                        onClick={() => setOpen(false)}
                        className={`${row} ${active ? "mf-glass-hit" : ""}`}
                      >
                        <Pfp
                          agentId={agent.id}
                          name={agent.displayName}
                          handle={agent.handle}
                          mascot
                          size="sm"
                          kind="agent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">{agent.displayName ?? `@${agent.handle}`}</span>
                          <span className="block truncate font-mono text-[10px] text-mute">@{agent.handle}</span>
                        </span>
                        <MusePill />
                      </Link>
                    );
                  })}
                </section>
              ) : null}
              {fomo ? (
                <section>
                  <p className="mf-kicker px-2.5 pt-1.5">Humans</p>
                  <Link
                    href={humanHref(fomo.handle)}
                    role="option"
                    aria-selected={cursor === picks.length - 1}
                    onClick={() => setOpen(false)}
                    className={`${row} ${cursor === picks.length - 1 ? "mf-glass-hit" : ""}`}
                  >
                    <Pfp
                      src={fomo.profilePicture}
                      name={fomo.name}
                      handle={fomo.handle}
                      size="sm"
                      kind="human"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">{fomo.name ?? `@${fomo.handle}`}</span>
                      <span className="block truncate font-mono text-[10px] text-mute">@{fomo.handle}</span>
                    </span>
                    <FomoScanPill />
                  </Link>
                </section>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
