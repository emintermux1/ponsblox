import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { MuseAgentProfile } from "@/components/muse-agent-profile";
import { agentShareMeta, loadAgentPage, looksLikeAgentId } from "@/lib/agent-profile";
import { humanProfileHref } from "@/lib/profile-href";
import { assertNever } from "@/lib/never";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    return agentShareMeta(await loadAgentPage(id));
  } catch {
    return { title: "No Muse agent · MUSE FOMO", robots: { index: false } };
  }
}

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadAgentPage(id);

  switch (data.kind) {
    case "agent":
      return <MuseAgentProfile data={data} />;
    case "fomoscan":
      redirect(humanProfileHref(data.trader.handle));
    case "unavailable":
      if (looksLikeAgentId(id)) notFound();
      redirect(humanProfileHref(id));
    case "token":
      return (
        <EmptyState
          pose="laptop"
          title={data.market.symbol ?? "Token"}
          body="That path was a mint, not a Muse agent."
          action={
            <Link href={`/token/${data.market.mint}`} className="mf-buy inline-flex rounded-full px-4 py-2 text-sm">
              Open market
            </Link>
          }
        />
      );
    default:
      return assertNever(data);
  }
}
