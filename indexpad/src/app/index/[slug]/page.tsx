import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndexDesk } from "@/components/index-desk";
import { getIndexBySlug } from "@/lib/indexpad/get-indexes";
import { getIndexPerformanceMap } from "@/lib/indexpad/get-performance";
import { buildCompositionRows } from "@/lib/indexpad/view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const view = await getIndexBySlug(slug);
  if (!view) return { title: "Index not found" };
  return {
    title: `${view.index.name} ($${view.index.symbol})`,
    description:
      view.index.description ||
      `Public page for ${view.index.name}. Weights, performance, and composition.`,
  };
}

export default async function PublicIndexPage({ params }: PageProps) {
  const { slug } = await params;
  const view = await getIndexBySlug(slug);
  if (!view) notFound();

  const series = await getIndexPerformanceMap(view.index.id);
  const snapshot = series.ALL;
  const returns = snapshot.componentReturns;
  const hydrated = {
    ...view,
    valueQuote: view.valueQuote ?? snapshot.valueQuote,
    change24hBps: view.change24hBps ?? snapshot.change24hBps,
    change7dBps: view.change7dBps ?? snapshot.change7dBps,
    rows: buildCompositionRows(view.index.components, [], returns).map((row) => {
      const existing = view.rows.find((item) => item.symbol === row.symbol);
      return existing
        ? {
            ...existing,
            change24hBps: existing.change24hBps ?? row.change24hBps,
            contributionBps: existing.contributionBps ?? row.contributionBps,
          }
        : row;
    }),
  };

  return <IndexDesk view={hydrated} series={series} />;
}
