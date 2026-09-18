import Link from "next/link";
import { IndexCard } from "@/components/index-card";
import { Badge } from "@/components/ui/badge";
import { RouteEmpty } from "@/components/route-shell";
import {
  EXAMPLE_INDEX_BLURB,
  EXAMPLE_INDEX_COMPOSITION_COPY,
  EXAMPLE_INDEX_LABEL,
} from "@/lib/indexpad/copy";
import type { ExploreIndex } from "@/lib/indexpad/explore-types";

const STEPS = [
  {
    n: "01",
    title: "Compose",
    body: "Pick tokens from the Pons ecosystem — the universe is on-chain, not invented here.",
  },
  {
    n: "02",
    title: "Weight",
    body: "Set the basket like an ETF. The desk keeps the book; you keep the thesis.",
  },
  {
    n: "03",
    title: "Launch",
    body: "Spin a coin around the index on Robinhood Chain. The basket becomes a market.",
  },
] as const;

export function HomeDesk({ indexes }: { indexes: ExploreIndex[] }) {
  return (
    <div className="relative bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-6"
            >
              <p className="font-mono text-[11px] tracking-[0.2em] text-accent">{step.n}</p>
              <h2 className="mt-2 font-serif text-2xl text-[#f3efe4]">{step.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/48">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge>Example</Badge>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-[#f4f0e6]">
                $PINT on the blotter
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/48">
                {EXAMPLE_INDEX_BLURB}
              </p>
            </div>
            <Link href="/index/pint" className="ip-btn ip-btn-ink">
              Open example
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="relative min-h-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-ticker.jpg"
                alt=""
                className="absolute inset-0 size-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0a] via-[#0b0b0a]/80 to-[#0b0b0a]/40" />
              <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                    {EXAMPLE_INDEX_LABEL} · $PINT
                  </p>
                  <p className="mt-2 font-serif text-2xl text-[#f3efe4]">
                    Pons Intelligence Index
                  </p>
                  <p className="mt-3 font-mono text-[13px] text-white/70">
                    {EXAMPLE_INDEX_COMPOSITION_COPY}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/create" className="ip-btn ip-btn-accent">
                    Build yours
                  </Link>
                  <Link href="/launch?index=pint" className="ip-btn ip-btn-ghost">
                    Launch coin
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                Live book
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#f4f0e6]">Indexes</h2>
            </div>
            <Link href="/explore" className="text-[13px] text-white/45 hover:text-accent">
              Explore all
            </Link>
          </div>

          {indexes.length === 0 ? (
            <div className="mt-6">
              <RouteEmpty
                kicker="Awaiting catalog"
                title="No live indexes on the tape"
                body="When adapters return real rows they appear here. Until then the $PINT blotter above is labeled Example only."
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {indexes.slice(0, 6).map((index) => (
                <IndexCard key={index.id} index={index} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
