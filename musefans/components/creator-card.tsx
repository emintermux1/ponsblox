import Link from "next/link";

import { CtaSubscribe } from "./cta-subscribe";
import { postsFor } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import type { MuseRow } from "@/lib/types";

export function CreatorCard({
  muse,
  signedIn,
  subscribed,
}: {
  muse: MuseRow;
  signedIn: boolean;
  subscribed: boolean;
}) {
  const posts = postsFor(muse.handle).length;

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-card">
      <Link href={`/m/${muse.handle}`} className="block">
        <img
          src={muse.avatar_path}
          alt={`${muse.display_name}, ${muse.age}`}
          className="aspect-[4/5] w-full object-cover object-top"
        />
        <div className="px-3 pt-3">
          <p className="truncate text-base font-semibold leading-tight" translate="no">
            {muse.display_name}
          </p>
          <p className="mt-0.5 text-sm text-muted" translate="no">
            @{muse.handle}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatUsd(muse.price_cents)}/mo · {posts} posts
          </p>
        </div>
      </Link>
      <div className="p-3 pt-2">
        <CtaSubscribe
          handle={muse.handle}
          priceCents={muse.price_cents}
          subscribed={subscribed}
          signedIn={signedIn}
          compact
        />
      </div>
    </article>
  );
}
