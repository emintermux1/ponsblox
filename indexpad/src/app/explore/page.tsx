import type { Metadata } from "next";
import Link from "next/link";
import { IndexCard } from "@/components/index-card";
import { getExploreIndexes } from "@/lib/indexpad/explore";
import { EXPLORE_TABS, parseExploreSort } from "@/lib/indexpad/explore-types";
import { ExploreEmpty } from "./empty";
import { ExploreTabs } from "./tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore indexes — Indexpad",
  description: "Discover live Pons indexes. No invented leaderboard.",
};

type ExplorePageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const sort = parseExploreSort(params.tab);
  const indexes = await getExploreIndexes(sort);

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-background font-sans text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.55'/></svg>\")",
        }}
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
              Discovery
            </p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#f4efe4] sm:text-4xl">
              Explore indexes
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Live baskets from the Pons ecosystem. This board reads{" "}
              <code className="font-mono text-[12px] text-foreground/80">getPonsIndexes()</code>
              {" "}and stays empty until a real catalog answers.
            </p>
          </div>
          <Link href="/create" className="ip-btn ip-btn-accent ip-btn-lg">
            Create index
          </Link>
        </header>

        <ExploreTabs active={sort} tabs={EXPLORE_TABS} />

        {indexes.length === 0 ? (
          <ExploreEmpty />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {indexes.map((index) => (
              <IndexCard key={index.id} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
