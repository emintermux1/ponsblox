import { HomeFeedShell } from "@/components/home-feed-shell";
import { eventsFromTheses, isBlogLearnEvent } from "@/lib/feed-event";
import { peekHomePaint, seedHomeMemes } from "@/lib/home-paint";
import { scheduleTrendRefresh } from "@/lib/home-refresh";
import { pickHomeEvents } from "@/lib/thesis-guard";
import type { DiscoverTokenRow, FeedEvent, FeedTab } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

const TABS: FeedTab[] = ["for-you", "following", "thesis"];

function parseTab(value: string | string[] | undefined): FeedTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return TABS.find((tab) => tab === raw) ?? "for-you";
}

function safeMemes(): DiscoverTokenRow[] {
  try {
    const tokens = peekHomePaint("for-you").tokens;
    return tokens.length ? tokens.slice(0, 24).map((row, index) => ({ ...row, rank: index + 1 })) : seedHomeMemes();
  } catch {
    return seedHomeMemes();
  }
}

function safeSocial(tab: FeedTab): FeedEvent[] {
  if (tab === "following") return [];
  try {
    return pickHomeEvents(
      eventsFromTheses(peekHomePaint(tab).theses).filter((event) => !isBlogLearnEvent(event)),
    );
  } catch {
    return [];
  }
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ tab?: string | string[] }> }) {
  let tab: FeedTab = "for-you";
  try {
    tab = parseTab((await searchParams)?.tab);
  } catch {
    tab = "for-you";
  }
  scheduleTrendRefresh();
  return <HomeFeedShell tab={tab} tokens={safeMemes()} thesisRows={safeSocial(tab)} paint="cache" />;
}
