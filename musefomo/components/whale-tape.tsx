"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TokenIcon } from "@/components/token-icon";
import { useHeaderTape } from "@/components/use-header-tape";
import { TAPE_BUDGET_MS } from "@/lib/constants";
import { changeTone, formatPct, formatUsd } from "@/lib/format";
import type { HeaderTapeItem, HeaderTapePayload } from "@/lib/header-tape";
import { assertNever } from "@/lib/never";

function tapeHref(item: HeaderTapeItem): string {
  return item.href || "/discover";
}

function TapeCell({ item }: { item: HeaderTapeItem }) {
  switch (item.kind) {
    case "meme":
      return (
        <>
          <TokenIcon src={item.logo} mint={item.mint} symbol={item.symbol} size="xs" />
          <span className="text-ink">{item.symbol}</span>
          <span className="text-mute">{formatUsd(item.priceUsd)}</span>
          <span className={changeTone(item.change24h)}>{formatPct(item.change24h)}</span>
        </>
      );
    case "print":
      return (
        <>
          <TokenIcon src={item.logo} mint={item.mint} symbol={item.symbol} size="xs" />
          <span className={item.side === "sell" ? "text-sell" : "text-buy"}>
            {item.side === "sell" ? "SELL" : "BUY"}
          </span>
          <span className="font-semibold">{formatUsd(item.usd)}</span>
          <span className="text-mute">{item.symbol ?? "meme"}</span>
          {item.handle ? <span className="text-mute">@{item.handle}</span> : null}
        </>
      );
    case "thesis":
      return (
        <>
          <TokenIcon src={item.logo} mint={item.mint} symbol={item.symbol} size="xs" />
          {item.handle ? <span className="text-ink">@{item.handle}</span> : null}
          {item.symbol ? <span className="text-ice">${item.symbol}</span> : null}
          {item.snippet ? <span className="max-w-[14rem] truncate text-mute">{item.snippet}</span> : null}
        </>
      );
    default:
      return assertNever(item.kind, "tape.kind");
  }
}

function TapeStrip({ items, fast }: { items: HeaderTapeItem[]; fast?: boolean }) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="mf-ticker overflow-hidden border-t border-line">
      <div className={`flex w-max items-center gap-5 py-1.5 pr-8 ${fast ? "mf-marquee-fast" : "mf-marquee"}`}>
        {loop.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={tapeHref(item)}
            className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] tracking-tight"
          >
            <TapeCell item={item} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeaderWhaleTape() {
  const header = useHeaderTape();
  return <TapeStrip items={header?.items ?? []} />;
}

function MintWhaleTape({ mint }: { mint: string }) {
  const [items, setItems] = useState<HeaderTapeItem[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/tape?mint=${encodeURIComponent(mint)}`, { signal: AbortSignal.timeout(TAPE_BUDGET_MS) })
        .then((res) => (res.ok ? (res.json() as Promise<HeaderTapePayload>) : null))
        .then((body) => {
          if (!alive || !body?.items?.length) return;
          setItems(body.items);
        })
        .catch(() => undefined);
    };
    const usedIdle = typeof requestIdleCallback === "function";
    const idle = usedIdle ? requestIdleCallback(load, { timeout: 400 }) : window.setTimeout(load, 0);
    const timer = window.setInterval(load, 6_000);
    const onRefresh = () => load();
    window.addEventListener("musefomo:tape", onRefresh);
    return () => {
      alive = false;
      if (usedIdle) cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.clearInterval(timer);
      window.removeEventListener("musefomo:tape", onRefresh);
    };
  }, [mint]);

  return <TapeStrip items={items} fast />;
}

export function WhaleTape({ mint }: { mint?: string }) {
  if (mint) return <MintWhaleTape mint={mint} />;
  return <HeaderWhaleTape />;
}

export function SwapTape({ mint }: { mint: string }) {
  return <WhaleTape mint={mint} />;
}
