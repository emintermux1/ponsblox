"use client";

import Link from "next/link";

import { TokenIcon } from "@/components/token-icon";
import { useHeaderTape } from "@/components/use-header-tape";
import { changeTone, formatPct } from "@/lib/format";
import type { HeaderTapeItem } from "@/lib/header-tape";

function TapeCell({ item }: { item: HeaderTapeItem }) {
  if (item.kind !== "meme") return null;
  return (
    <>
      <TokenIcon src={item.logo} mint={item.mint} symbol={item.symbol} size="xs" />
      <span className="text-ink">{item.symbol}</span>
      <span className={changeTone(item.change24h)}>{formatPct(item.change24h)}</span>
    </>
  );
}

export function TokenTicker() {
  const payload = useHeaderTape();
  const items = (payload?.memes ?? []).filter((item) => item.kind === "meme");
  if (!items.length) return null;

  const loop = [...items, ...items];
  return (
    <div className="mf-ticker overflow-hidden border-t border-line">
      <div className="mf-marquee flex h-8 w-max flex-nowrap items-center gap-5 whitespace-nowrap py-0 pr-8">
        {loop.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={item.href || "/discover"}
            className="mf-lift flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-tight"
          >
            <TapeCell item={item} />
          </Link>
        ))}
      </div>
    </div>
  );
}
