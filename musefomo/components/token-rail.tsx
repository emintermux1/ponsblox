import Link from "next/link";

import { TokenIcon } from "@/components/token-icon";
import { changeTone, formatPct, formatUsd } from "@/lib/format";
import { dexLogo } from "@/lib/known-mints";
import { asHttpsLogo } from "@/lib/token-logo";
import type { DiscoverTokenRow } from "@/lib/types";

export function TokenRail({ rows }: { rows: DiscoverTokenRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="mf-hscroll items-center gap-2 border-b border-line px-3 py-2" data-token-rail="1">
      {rows.slice(0, 16).map((row) => (
        <TokenChip key={row.mint} row={row} />
      ))}
    </div>
  );
}

export function TokenChip({ row }: { row: DiscoverTokenRow }) {
  const symbol = (row.symbol ?? row.name ?? row.mint.slice(0, 4)).replace(/^\$/, "");
  const logo = asHttpsLogo(row.imageUrl) ?? dexLogo(row.mint);
  return (
    <Link
      href={`/token/${row.mint}`}
      data-meme-row={symbol}
      className="mf-row flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-1"
    >
      <TokenIcon src={logo} mint={row.mint} symbol={symbol} size="xs" />
      <span className="text-[12px] font-medium">${symbol}</span>
      <span className={`font-mono text-[10px] ${changeTone(row.priceChange24h)}`}>{formatPct(row.priceChange24h)}</span>
    </Link>
  );
}

export function TokenRailItem({ row }: { row: DiscoverTokenRow }) {
  const symbol = (row.symbol ?? row.name ?? row.mint.slice(0, 6)).replace(/^\$/, "");
  const logo = asHttpsLogo(row.imageUrl) ?? dexLogo(row.mint);
  return (
    <Link href={`/token/${row.mint}`} data-meme-row={symbol} className="mf-row flex items-center gap-2.5 px-4 py-2">
      <TokenIcon src={logo} mint={row.mint} symbol={symbol} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">${symbol}</span>
      <span className={`mf-num shrink-0 ${changeTone(row.priceChange24h)}`}>{formatPct(row.priceChange24h)}</span>
      <span className="mf-num hidden shrink-0 text-mute sm:inline">{formatUsd(row.priceUsd)}</span>
    </Link>
  );
}
