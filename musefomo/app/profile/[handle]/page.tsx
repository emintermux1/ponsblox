import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FomoScanProfile } from "@/components/fomoscan-profile";
import { lookupLocalAgent } from "@/lib/agent-profile";
import { raceTimeout } from "@/lib/fast-fetch";
import { userFromBoardEntry } from "@/lib/human-map";
import { humanShareMeta, loadHumanProfile } from "@/lib/human-profile";
import { museProfileHref, stripHandle } from "@/lib/profile-href";
import { getLeaderboardPeople } from "@/lib/services/people";
import type { FomoScanUser } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const slug = stripHandle(handle);
  const agent = await raceTimeout(lookupLocalAgent(slug), null, 400);
  if (agent) {
    return { title: `${agent.displayName ?? agent.handle} · Muse`, robots: { index: false } };
  }
  const data = await loadHumanProfile(slug);
  if (data) return humanShareMeta(data);
  const cached = await cachedTrader(slug);
  if (cached) return { title: `${cached.name ?? cached.handle} · Muse`, robots: { index: false } };
  return { title: "No trader · Muse", robots: { index: false } };
}

export default async function HumanProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const slug = stripHandle(handle);
  const agent = await raceTimeout(lookupLocalAgent(slug), null, 400);
  if (agent) redirect(museProfileHref(agent.id));
  const data = await loadHumanProfile(slug);
  if (data) {
    return (
      <FomoScanProfile
        trader={data.trader}
        items={data.theses}
        pnl={data.pnl}
        stats={data.stats}
        equity={data.equity}
        positions={data.positions}
        swaps={data.swaps}
      />
    );
  }
  const cached = await cachedTrader(slug);
  if (!cached) notFound();
  return <FomoScanProfile trader={cached} items={[]} pnl={null} />;
}

async function cachedTrader(slug: string): Promise<FomoScanUser | null> {
  const people = await getLeaderboardPeople().catch(() => []);
  const hit = people.find((row) => row.handle.replace(/^@/, "").toLowerCase() === slug.toLowerCase());
  if (!hit) return null;
  return userFromBoardEntry({
    rank: 0,
    id: hit.id || hit.handle,
    handle: hit.handle,
    label: hit.displayName,
    avatarUrl: null,
    pnl: null,
    volume: null,
    followers: null,
    numTrades: null,
    memberCount: null,
    marketCap: null,
    price: null,
    liquidity: null,
  });
}
