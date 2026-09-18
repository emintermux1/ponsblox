"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TokenLogo } from "@/components/token-logo";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DraftComponent } from "@/components/index-builder/types";
import type { PonsToken } from "@/types";

export function TokenPicker({
  tokens,
  selected,
  loading,
  error,
  onRetry,
  onToggle,
  onAddDraft,
  onUseExample,
}: {
  tokens: PonsToken[];
  selected: DraftComponent[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onToggle: (token: PonsToken) => void;
  onAddDraft?: (symbol: string) => void;
  onUseExample?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [draftTicker, setDraftTicker] = useState("");
  const selectedIds = useMemo(
    () => new Set(selected.map((row) => row.id)),
    [selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((token) => {
      return (
        token.symbol.toLowerCase().includes(q) ||
        token.name.toLowerCase().includes(q) ||
        token.address.toLowerCase().includes(q)
      );
    });
  }, [query, tokens]);

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Universe</p>
          <h2 className="font-serif text-xl text-ivory">Select coins</h2>
        </div>
        <p className="font-mono text-xs text-muted">{selected.length} in basket</p>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ticker or name"
          className="pl-9"
          aria-label="Search tokens"
        />
      </div>

      {error ? (
        <div className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-ivory">
          <p>{error}</p>
          {onRetry ? (
            <button type="button" className="mt-2 text-brass underline" onClick={onRetry}>
              Retry catalog
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-sm border border-line bg-surface-2" />
          ))}
        </div>
      ) : null}

      {!loading && tokens.length === 0 ? (
        <div className="rounded-sm border border-dashed border-line px-4 py-6">
          <p className="text-sm text-ivory">Factory catalog is empty. File a local draft basket.</p>
          <p className="mt-1 text-xs text-muted">
            Example strip: $AAA 40% · $BBB 30% · $CCC 20% · $DDD 10%. Not a live index listing.
          </p>
          {onUseExample ? (
            <button
              type="button"
              className="mt-3 text-sm text-brass underline"
              onClick={onUseExample}
            >
              Use example basket
            </button>
          ) : null}
        </div>
      ) : null}

      {onAddDraft ? (
        <div className="mt-3 flex gap-2">
          <Input
            value={draftTicker}
            onChange={(event) => setDraftTicker(event.target.value)}
            placeholder="Draft ticker"
            aria-label="Draft ticker"
          />
          <button
            type="button"
            className="h-10 shrink-0 rounded-sm border border-line px-3 text-sm text-ivory"
            onClick={() => {
              const symbol = draftTicker.replace(/^\$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
              if (symbol.length < 2 || symbol.length > 11) return;
              onAddDraft(symbol);
              setDraftTicker("");
            }}
          >
            Add
          </button>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          {filtered.map((token) => {
            const active = selectedIds.has(token.address.toLowerCase());
            return (
              <li key={token.address}>
                <button
                  type="button"
                  onClick={() => onToggle(token)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-brass/50 bg-brass/10"
                      : "border-line bg-surface hover:border-ivory/20 hover:bg-surface-2",
                  )}
                >
                  <TokenLogo symbol={token.symbol} logo={token.logo} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm text-ivory">
                      ${token.symbol}
                    </span>
                    <span className="block truncate text-xs text-muted">{token.name}</span>
                  </span>
                  {token.priceQuote ? (
                    <span className="font-mono text-xs text-muted">{token.priceQuote}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && tokens.length > 0 && filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No tokens match that search.</p>
      ) : null}
    </section>
  );
}
