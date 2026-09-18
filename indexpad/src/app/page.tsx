import { HomeDesk } from "@/components/home-desk";
import { HomeHero } from "@/components/home-hero";
import type { ExploreIndex } from "@/lib/indexpad/explore-types";
import { slugFromSymbol } from "@/lib/indexpad/format";
import { getPonsIndexes } from "@/lib/indexpad/indexes";
import type { PonsIndex } from "@/types";

export const dynamic = "force-dynamic";

function toCard(index: PonsIndex): ExploreIndex {
  return {
    id: index.id,
    slug: slugFromSymbol(index.symbol) || index.id,
    name: index.name,
    ticker: index.symbol,
    logoUrl: "",
    creator: "",
    createdAt: index.createdAt,
    change24hBps: null,
    change7dBps: null,
    marketCapQuote: null,
    assetCount: index.components.length,
    topComponents: index.components.slice(0, 3).map((row) => ({
      symbol: row.symbol,
      logo: "",
    })),
    sparkline: null,
    volume24h: null,
    tradeCount: null,
    launchCount: null,
  };
}

export default async function HomePage() {
  let indexes: ExploreIndex[] = [];
  try {
    const result = await getPonsIndexes();
    if (result.ok) indexes = result.data.map(toCard);
  } catch {
    indexes = [];
  }

  return (
    <main>
      <HomeHero />
      <HomeDesk indexes={indexes} />
    </main>
  );
}
