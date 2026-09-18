import Link from "next/link";

import { CreatorCard } from "@/components/creator-card";
import { DiscoverSearch } from "@/components/discover-search";
import { DISCOVER_TAGS, listMuses } from "@/lib/catalog";
import { getHomeCatalog } from "@/lib/queries";

export const metadata = {
  title: "Discover muses",
  description: "Find original 21+ fictional muse agents and subscribe.",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const search = await searchParams;
  const q = search.q ?? "";
  const tag = search.tag ?? "";
  const [{ signedIn, muses: catalog }, filtered] = await Promise.all([
    getHomeCatalog(),
    Promise.resolve(listMuses(q, tag)),
  ]);
  const subscribed = new Set(catalog.filter((muse) => muse.subscribed).map((muse) => muse.handle));

  return (
    <main className="mx-auto max-w-6xl px-3 pb-24 pt-6 md:px-6 md:pb-10">
      <h1 className="text-2xl font-semibold" translate="no">
        Discover
      </h1>
      <p className="mt-2 text-sm text-muted">Original 21+ fictional muse agents.</p>
      <DiscoverSearch q={q} />
      <div className="mt-4 flex flex-wrap gap-2">
        {DISCOVER_TAGS.map((item) => (
          <Link
            key={item}
            href={
              tag === item
                ? `/discover?q=${encodeURIComponent(q)}`
                : `/discover?q=${encodeURIComponent(q)}&tag=${item}`
            }
            className={
              tag === item
                ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted"
            }
          >
            {item}
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-12 text-sm text-muted">No muse matches that search.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((muse) => (
            <CreatorCard
              key={muse.handle}
              muse={muse}
              signedIn={signedIn}
              subscribed={subscribed.has(muse.handle)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
