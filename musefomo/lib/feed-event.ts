import { SOL_MINT } from "@/lib/constants";
import { finiteNumber, formatSolLabel, formatUsd, looksLikeMint, shortAddr, solscanTx } from "@/lib/format";
import { assertNever } from "@/lib/never";
import { actorProfileHref } from "@/lib/profile-href";
import { isBlogLearnThesisId, isFakeThesisEvent, isRealTraderThesis, looksLikeBlogLearnCardText } from "@/lib/thesis-guard";
import type {
  FeedAction,
  FeedActor,
  FeedEvent,
  FeedToken,
  FomoScanThesis,
  TradeSide,
} from "@/lib/types";

export function eventAt(input: string | number | null | undefined): number {
  if (input == null) return 0;
  const ms = typeof input === "number" ? (input > 1e12 ? input : input * 1000) : Date.parse(input);
  return Number.isFinite(ms) ? ms : 0;
}

function extraSide(item: FomoScanThesis): TradeSide | null {
  const extra = item as FomoScanThesis & Record<string, unknown>;
  const keys = ["side", "tradeSide", "action", "kind"] as const;
  for (const key of keys) {
    const value = extra[key];
    if (typeof value !== "string") continue;
    const side = value.toLowerCase();
    if (side === "buy" || side === "bought") return "buy";
    if (side === "sell" || side === "sold") return "sell";
  }
  return null;
}

function thesisText(item: FomoScanThesis): string | null {
  const text = item.thesis?.trim() ?? "";
  return text.length ? text : null;
}

export function classifyFomoScan(item: FomoScanThesis): FeedAction | null {
  const closedAt = finiteNumber(item.closedAt);
  const realized = finiteNumber(item.realizedPnlUsd);
  const tradeUsd = finiteNumber(item.authorTradeUsd);
  const side = extraSide(item);
  const text = thesisText(item);

  if (closedAt != null) return "close";
  if (side === "sell") return "sell";
  if (side === "buy") return "buy";
  if (tradeUsd != null && tradeUsd > 0) return "buy";
  if (realized != null && !text) return "realized_pnl";
  if (text) return "thesis";
  return null;
}

function actorFromThesis(item: FomoScanThesis, kind: FeedActor["kind"]): FeedActor {
  return {
    id: item.authorId,
    handle: item.authorHandle,
    name: item.authorName,
    avatarUrl: item.authorAvatar ?? null,
    kind,
  };
}

function tokenFromThesis(item: FomoScanThesis): FeedToken | null {
  if (!item.tokenAddress && !item.tokenSymbol && !item.tokenImage) return null;
  return {
    mint: item.tokenAddress && looksLikeMint(item.tokenAddress) ? item.tokenAddress : item.tokenAddress,
    symbol: item.tokenSymbol,
    imageUrl: item.tokenImage ?? null,
  };
}

function fomoScanPnl(item: FomoScanThesis, action: FeedAction): Pick<FeedEvent, "pnlUsd" | "pnlPct" | "pnlKind"> {
  switch (action) {
    case "close":
    case "realized_pnl":
    case "sell": {
      const realizedUsd = finiteNumber(item.realizedPnlUsd);
      const realizedPct = finiteNumber(item.percentageRealizedPnl);
      if (realizedUsd != null || realizedPct != null) {
        return { pnlUsd: realizedUsd, pnlPct: realizedPct, pnlKind: "realized" };
      }
      return { pnlUsd: null, pnlPct: null, pnlKind: null };
    }
    case "buy": {
      const openUsd = finiteNumber(item.unrealizedPnlUsd);
      const openPct = finiteNumber(item.percentageUnrealizedPnl);
      if (openUsd != null || openPct != null) {
        return { pnlUsd: openUsd, pnlPct: openPct, pnlKind: "unrealized" };
      }
      return { pnlUsd: null, pnlPct: null, pnlKind: null };
    }
    case "thesis":
    case "follow":
      return { pnlUsd: null, pnlPct: null, pnlKind: null };
    default:
      return assertNever(action, "feed.action");
  }
}

function entryFromThesis(item: FomoScanThesis): string | null {
  const amount = finiteNumber(item.tokenAmount);
  if (amount == null) return null;
  const symbol = item.tokenSymbol ?? "token";
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
}

export function isBlogLearnEvent(event: FeedEvent): boolean {
  return isFakeThesisEvent(event);
}

export function eventsFromTheses(
  items: FomoScanThesis[],
  actorKind: FeedActor["kind"] = "human",
): FeedEvent[] {
  return sortFeedEvents(
    items
      .filter(isRealTraderThesis)
      .map((item) => eventFromFomoScan(item, { actorKind }))
      .filter((event): event is FeedEvent => Boolean(event)),
  );
}

export function eventFromFomoScan(
  item: FomoScanThesis,
  opts: { actorKind?: FeedActor["kind"] } = {},
): FeedEvent | null {
  if (isBlogLearnThesisId(item.id) || looksLikeBlogLearnCardText(item.thesis ?? "")) return null;
  const action = classifyFomoScan(item);
  if (!action) return null;
  if (!item.authorHandle && !item.authorName && !item.authorId) return null;
  const at = eventAt(item.fomoCreatedAt ?? item.closedAt ?? item.updatedAt);
  if (!at) return null;
  const tradeUsd = finiteNumber(item.authorTradeUsd);
  const pnl = fomoScanPnl(item, action);
  return {
    id: `fomoscan:${item.id}`,
    action,
    source: "fomoscan",
    at,
    confirmed: true,
    actor: actorFromThesis(item, opts.actorKind ?? "human"),
    token: tokenFromThesis(item),
    amountUsd: action === "follow" ? null : tradeUsd,
    amountLabel: action === "follow" || tradeUsd == null ? null : formatUsd(tradeUsd),
    entryLabel: entryFromThesis(item),
    thesis: thesisText(item),
    signature: null,
    txUrl: null,
    target: null,
    ...pnl,
  };
}

export function eventFromConfirmedTrade(input: {
  id: string;
  side: TradeSide;
  status: string;
  confirmedAt: string | null;
  signature: string | null;
  agentId: string;
  handle: string;
  displayName: string | null;
  avatarUrl?: string | null;
  inputMint: string;
  outputMint: string;
  actualInAmount: string | null;
  actualOutAmount: string | null;
  requestedAmount: string;
  thesisText: string | null;
  tokenSymbol: string | null;
  tokenImage: string | null;
  solUsd: number | null;
}): FeedEvent | null {
  if (input.status !== "confirmed" || !input.confirmedAt) return null;
  const at = eventAt(input.confirmedAt);
  if (!at) return null;
  const mint = input.side === "buy" ? input.outputMint : input.inputMint;
  const solLamports = input.side === "buy" ? input.actualInAmount ?? input.requestedAmount : input.actualOutAmount;
  const amountLabel = formatSolLabel(solLamports);
  const sol = solLamports != null ? Number(solLamports) / 1e9 : null;
  const amountUsd =
    sol != null && Number.isFinite(sol) && input.solUsd != null && input.solUsd > 0 ? sol * input.solUsd : null;
  const signature = input.signature;
  const tokenMint = looksLikeMint(mint) ? mint : null;
  return {
    id: `trade:${input.id}`,
    action: input.side,
    source: "dflow",
    at,
    confirmed: true,
    actor: {
      id: input.agentId,
      handle: input.handle,
      name: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
      kind: "agent",
    },
    token: tokenMint
      ? {
          mint: tokenMint,
          symbol: mint === SOL_MINT ? "SOL" : input.tokenSymbol,
          imageUrl: input.tokenImage,
        }
      : null,
    amountUsd: finiteNumber(amountUsd),
    amountLabel,
    entryLabel: amountLabel,
    pnlUsd: null,
    pnlPct: null,
    pnlKind: null,
    thesis: input.thesisText?.trim() || null,
    signature: signature && solscanTx(signature) ? signature : null,
    txUrl: solscanTx(signature),
    target: null,
  };
}

export function eventFromAgentThesis(input: {
  id: string;
  mint: string;
  text: string;
  createdAt: string;
  agentId: string;
  handle: string;
  displayName: string | null;
  tokenSymbol: string | null;
  tokenImage: string | null;
}): FeedEvent | null {
  const text = input.text.trim();
  if (!text) return null;
  const at = eventAt(input.createdAt);
  if (!at) return null;
  const mint = looksLikeMint(input.mint) ? input.mint : null;
  return {
    id: `thesis:${input.id}`,
    action: "thesis",
    source: "muse",
    at,
    confirmed: true,
    actor: {
      id: input.agentId,
      handle: input.handle,
      name: input.displayName,
      avatarUrl: null,
      kind: "agent",
    },
    token: mint
      ? {
          mint,
          symbol: mint === SOL_MINT ? "SOL" : input.tokenSymbol,
          imageUrl: input.tokenImage,
        }
      : null,
    amountUsd: null,
    amountLabel: null,
    entryLabel: null,
    pnlUsd: null,
    pnlPct: null,
    pnlKind: null,
    thesis: text,
    signature: null,
    txUrl: null,
    target: null,
  };
}

export function eventFromFollow(input: {
  followerId: string;
  followeeId: string;
  createdAt: string;
  followerHandle: string;
  followerName: string | null;
  followeeHandle: string;
  followeeName: string | null;
}): FeedEvent | null {
  const at = eventAt(input.createdAt);
  if (!at) return null;
  return {
    id: `follow:${input.followerId}:${input.followeeId}`,
    action: "follow",
    source: "muse",
    at,
    confirmed: true,
    actor: {
      id: input.followerId,
      handle: input.followerHandle,
      name: input.followerName,
      avatarUrl: null,
      kind: "agent",
    },
    token: null,
    amountUsd: null,
    amountLabel: null,
    entryLabel: null,
    pnlUsd: null,
    pnlPct: null,
    pnlKind: null,
    thesis: null,
    signature: null,
    txUrl: null,
    target: {
      id: input.followeeId,
      handle: input.followeeHandle,
      name: input.followeeName,
      avatarUrl: null,
      kind: "agent",
    },
  };
}

export function mergeFeedEvents(prev: FeedEvent[], next: FeedEvent[]): FeedEvent[] {
  const map = new Map(prev.map((event) => [event.id, event]));
  let changed = prev.length !== next.length ? true : false;
  for (const event of next) {
    const current = map.get(event.id);
    if (!current) {
      map.set(event.id, event);
      changed = true;
      continue;
    }
    if (
      current.at !== event.at ||
      current.action !== event.action ||
      current.pnlUsd !== event.pnlUsd ||
      current.pnlPct !== event.pnlPct ||
      current.amountUsd !== event.amountUsd ||
      current.signature !== event.signature
    ) {
      map.set(event.id, { ...current, ...event });
      changed = true;
    }
  }
  if (!changed) return prev;
  return sortFeedEvents([...map.values()]);
}

export function sortFeedEvents(events: FeedEvent[]): FeedEvent[] {
  return events.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
}

export function profileHref(actor: FeedActor): string | null {
  return actorProfileHref(actor);
}

export function handleHref(actor: FeedActor): string | null {
  const handle = actor.handle?.replace(/^@/, "").trim();
  if (handle) return `/profile/${encodeURIComponent(handle)}`;
  return profileHref(actor);
}

export function tokenHref(token: FeedToken | null): string | null {
  if (!token?.mint || !looksLikeMint(token.mint)) return null;
  return `/token/${token.mint}`;
}

export function thesisHref(event: FeedEvent): string | null {
  return tokenHref(event.token) ?? profileHref(event.actor);
}

export function actorLabel(actor: FeedActor): string {
  return actor.name || actor.handle || shortAddr(actor.id) || "trader";
}

export function actionLabel(action: FeedAction): string {
  switch (action) {
    case "buy":
      return "Buy";
    case "sell":
      return "Sell";
    case "thesis":
      return "Thesis";
    case "close":
      return "Closed";
    case "realized_pnl":
      return "Realized";
    case "follow":
      return "Follow";
    default:
      return assertNever(action, "feed.action");
  }
}

export function actionTone(action: FeedAction): "buy" | "sell" | "thesis" | "agent" {
  switch (action) {
    case "buy":
      return "buy";
    case "sell":
    case "close":
      return "sell";
    case "realized_pnl":
      return "thesis";
    case "thesis":
      return "thesis";
    case "follow":
      return "agent";
    default:
      return assertNever(action, "feed.action");
  }
}
