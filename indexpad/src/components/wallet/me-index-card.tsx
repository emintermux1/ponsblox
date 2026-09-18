"use client";

import Link from "next/link";
import { BookmarkMinus, ExternalLink, Rocket, Settings } from "lucide-react";
import { TokenLogo } from "@/components/token-logo";
import { short } from "@/lib/chain";
import type { WalletIndexCard } from "@/types/pons";

type MeIndexCardProps = {
  index: WalletIndexCard;
  onUnsave?: (slug: string) => void;
};

export function MeIndexCard({ index, onUnsave }: MeIndexCardProps) {
  const slug = encodeURIComponent(index.slug);
  const ticker = index.ticker.startsWith("$") ? index.ticker : `$${index.ticker}`;

  return (
    <article className="group rounded-2xl border border-line bg-surface/80 p-4 transition-colors hover:border-accent/35 hover:bg-surface-2">
      <div className="flex items-start gap-3">
        <TokenLogo
          symbol={index.ticker}
          logo={index.logoUrl}
          size={48}
          className="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-xl text-[#f4efe4]">{index.name}</h3>
          <p className="mt-0.5 truncate font-mono text-[12px] text-muted">
            {ticker}
            {typeof index.assetCount === "number" ? (
              <span> · {index.assetCount} assets</span>
            ) : null}
            {index.launchedCoinAddress ? (
              <span> · {short(index.launchedCoinAddress, 4)}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/index/${slug}/manage`} className="ip-btn ip-btn-ink">
          <Settings className="h-3.5 w-3.5" aria-hidden />
          Manage
        </Link>
        <Link href={`/index/${slug}`} className="ip-btn ip-btn-ghost">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          View
        </Link>
        <Link href={`/index/${slug}/launch`} className="ip-btn ip-btn-accent">
          <Rocket className="h-3.5 w-3.5" aria-hidden />
          Launch Coin
        </Link>
        {onUnsave ? (
          <button
            type="button"
            className="ip-btn ip-btn-ghost"
            onClick={() => onUnsave(index.slug)}
          >
            <BookmarkMinus className="h-3.5 w-3.5" aria-hidden />
            Unsave
          </button>
        ) : null}
      </div>
    </article>
  );
}
