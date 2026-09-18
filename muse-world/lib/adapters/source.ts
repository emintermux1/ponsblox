import { tickerFromName } from "@/lib/adapters/parse";
import type { GrokSource, MuseId, WorldEvent, WorldEventKind } from "@/types/world";
import { assertNever } from "@/types/world";

export type HonestySource = "real" | "sim";

export type MarketOrigin = "gecko" | "birdeye" | "gmgn" | "helius" | "sim";

export type MarketPulse = {
  kind: WorldEventKind | "QUIET";
  ticker: string | null;
  name?: string | null;
  changePct?: number | null;
  source: MarketOrigin;
};

export type GrokAsk = {
  museId: MuseId;
  goal: string;
  observation: string;
};

export type GrokReply = {
  source: GrokSource;
  summary: string;
  bias: "buy" | "pass" | "watch";
};

export type PacketLabel = WorldEvent["source"] | MarketOrigin;

export const SIM_GROK_SUMMARY = "no Grok key — SIM context only";

export function assertSource(source: "real" | "sim"): "real" | "sim" {
  switch (source) {
    case "real":
    case "sim":
      return source;
    default:
      return assertNever(source);
  }
}

export function honestyFromLabel(source: PacketLabel): HonestySource {
  switch (source) {
    case "bot":
    case "xai":
    case "gecko":
    case "birdeye":
    case "gmgn":
    case "helius":
      return assertSource("real");
    case "sim":
    case "world":
      return assertSource("sim");
    default:
      return assertNever(source);
  }
}

/** SIM packets/events must stay SIM. Never upgrade them to a live Grok or tape label. */
export function assertSimNotReal(from: HonestySource, labeled: PacketLabel): HonestySource {
  const honesty = honestyFromLabel(labeled);
  if (from === "sim" && honesty === "real") {
    throw new Error("SIM packet cannot be marked REAL");
  }
  return honesty;
}

export function simMarketPulse(): MarketPulse {
  assertSource("sim");
  return { kind: "QUIET", ticker: null, source: "sim" };
}

type GeckoPool = {
  attributes?: {
    name?: string;
    volume_usd?: { h1?: string };
  };
};

type MarketFetchOutcome =
  | { status: "ok"; body: unknown }
  | { status: "http-error" }
  | { status: "network-error" };

export function marketPulseFromFetch(outcome: MarketFetchOutcome): MarketPulse {
  switch (outcome.status) {
    case "http-error":
    case "network-error":
      return simMarketPulse();
    case "ok": {
      const body = outcome.body as { data?: GeckoPool[] };
      const row = (body.data ?? []).find((item) => tickerFromName(item.attributes?.name));
      if (!row) {
        return simMarketPulse();
      }
      const ticker = tickerFromName(row.attributes?.name);
      const volume = Number(row.attributes?.volume_usd?.h1 ?? 0);
      assertSource("real");
      return {
        kind: volume > 40_000 ? "TREND_SPIKE" : "VIRAL_POST",
        ticker,
        source: "gecko",
      };
    }
    default:
      return assertNever(outcome);
  }
}

export function isGrokWebhookConfigured(
  url: string | undefined = process.env.GROK_BOT_WEBHOOK_URL,
  key: string | undefined = process.env.GROK_BOT_WEBHOOK_KEY,
): boolean {
  return Boolean(url && key);
}

export function simGrokReply(): GrokReply {
  assertSource("sim");
  return {
    source: "sim",
    summary: SIM_GROK_SUMMARY,
    bias: "watch",
  };
}

export function grokReplyAfterWake(input: {
  webhookConfigured: boolean;
  woken: boolean;
  xai: GrokReply | null;
}): GrokReply {
  if (input.xai && honestyFromLabel(input.xai.source) === "real") {
    assertSource("real");
    return input.xai;
  }
  if (input.webhookConfigured && input.woken) {
    assertSource("real");
    return {
      source: "bot",
      summary: "Grok Bot woken — waiting on ingest",
      bias: "watch",
    };
  }
  return simGrokReply();
}

export function grokIngestEventSource(): "bot" {
  assertSource("real");
  return "bot";
}

export function authorizeMuseIngest(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !header) {
    return false;
  }
  return header === secret || header === `Bearer ${secret}`;
}
