"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { BoardNote } from "@/components/board";
import { FeedRow } from "@/components/feed-row";
import { FomoScanPill } from "@/components/fomoscan-mark";
import { LiveNum } from "@/components/live-num";
import { LoadingState } from "@/components/loading-state";
import { Pfp } from "@/components/pfp";
import { Sheet } from "@/components/sheet";
import { SurfaceState } from "@/components/surface-state";
import { TabStrip } from "@/components/tab-strip";
import { TokenChart } from "@/components/token-chart";
import { TokenIcon } from "@/components/token-icon";
import { TradeTicket } from "@/components/trade-ticket";
import { useMinWidth } from "@/components/use-fomo-motion";
import { normalizeChartBars, ohlcvBarsFromPayload } from "@/lib/chart-bars";
import { clipCandles } from "@/lib/ohlcv";
import { CHART_TIMEFRAMES, QUOTE_BUDGET_MS } from "@/lib/constants";
import { changeTone, formatBaseAmount, formatPct, formatUsd, looksLikeEvm, looksLikeMint, looksLikeSignature, shortAddr, timeAgo } from "@/lib/format";
import { knownMint, overlayKnownMarket } from "@/lib/known-mints";
import { asHttpsLogo } from "@/lib/token-logo";
import { humanProfileHref, museProfileHref } from "@/lib/profile-href";
import { COPY, isFomoScanQuota, readApiError, surfaceFromCode } from "@/lib/surface-copy";
import type {
  Candle,
  ChartTimeframe,
  FomoScanThesis,
  LiveTrade,
  MuseHolder,
  MuseThesis,
  PoolTrade,
  TokenChart as TokenChartMeta,
  TokenMarket,
} from "@/lib/types";

type TokenPayload = {
  market: TokenMarket;
  candles: Candle[];
  chart?: TokenChartMeta;
  prints?: PoolTrade[];
  solUsd?: number | null;
};

type ThesisPayload = {
  fomoscan: { items?: FomoScanThesis[]; error?: unknown; omitted?: boolean };
  muse?: MuseThesis[];
  agents?: MuseThesis[];
  holders?: { muse?: MuseHolder[]; fomoscan?: FomoScanThesis[] };
};

type Pane = "swaps" | "theses" | "holders" | "about";

export default function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params);
  const [token, setToken] = useState<TokenPayload>(() => ({
    market: overlayKnownMarket(emptyMarket(mint)),
    candles: [],
    prints: [],
  }));
  const [theses, setTheses] = useState<ThesisPayload | null>(null);
  const [swaps, setSwaps] = useState<PoolTrade[]>([]);
  const [pane, setPane] = useState<Pane>("swaps");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [variant, setVariant] = useState<"line" | "candle">("candle");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1D");
  const [live, setLive] = useState<LiveTrade | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenError, setTokenError] = useState<{ code?: string; message?: string } | null>(null);
  const [marketTick, setMarketTick] = useState(0);
  const [chartPending, setChartPending] = useState(true);
  const [chartTick, setChartTick] = useState(0);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const desktop = useMinWidth(1024);

  useEffect(() => {
    setToken({ market: emptyMarket(mint), candles: [], prints: [] });
    setTokenError(null);
    setChartPending(true);
    setTheses(null);
    setSwaps([]);
  }, [mint]);

  useEffect(() => {
    let alive = true;
    const pair = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("pair") : null;
    const qs = new URLSearchParams();
    if (pair) qs.set("pair", pair);
    fetch(`/api/tokens/${mint}${qs.size ? `?${qs}` : ""}`, { signal: AbortSignal.timeout(QUOTE_BUDGET_MS) })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          const parsed = readApiError(body);
          throw Object.assign(new Error(parsed.message ?? "Token unavailable"), { code: parsed.code });
        }
        const next = (body.market ? body : { market: emptyMarket(mint), candles: [], prints: [] }) as TokenPayload;
        return { ...next, market: overlayKnownMarket(next.market) };
      })
      .then((nextToken) => {
        if (!alive) return;
        setToken((current) => ({
          ...nextToken,
          candles: current.candles.length ? current.candles : nextToken.candles,
          chart: current.chart?.candles?.length ? current.chart : nextToken.chart,
        }));
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (isAbort(err)) return;
        const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : undefined;
        setTokenError({ code, message: err instanceof Error ? err.message : "Token unavailable" });
      });
    return () => {
      alive = false;
    };
  }, [mint, marketTick]);

  useEffect(() => {
    let alive = true;
    setChartPending(true);
    const pair = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("pair") : null;
    const qs = new URLSearchParams({ mint, tf: timeframe });
    if (pair) qs.set("pair", pair);
    fetch(`/api/ohlcv?${qs}`, { signal: AbortSignal.timeout(QUOTE_BUDGET_MS) })
      .then((res) => res.json() as Promise<{
        bars?: unknown;
        candles?: unknown;
        data?: { bars?: unknown; candles?: unknown };
        candleSource?: TokenChartMeta["candleSource"];
        pairSource?: TokenChartMeta["pairSource"];
        pairAddress?: string | null;
        reason?: string | null;
      }>)
      .then((body) => {
        if (!alive) return;
        const candles = clipCandles(normalizeChartBars(ohlcvBarsFromPayload(body)), timeframe);
        setChartPending(false);
        setToken((current) => ({
          ...current,
          candles,
          chart: {
            candles,
            pairSource: body.pairSource ?? current.chart?.pairSource ?? null,
            candleSource: body.candleSource ?? null,
            reason: candles.length ? null : (body.reason ?? null),
            pairAddress: body.pairAddress ?? pair ?? current.chart?.pairAddress ?? current.market.pairAddress,
            timeframe,
          },
        }));
      })
      .catch(() => {
        if (!alive) return;
        setChartPending(false);
        setToken((current) => ({
          ...current,
          candles: [],
          chart: {
            candles: [],
            pairSource: current.chart?.pairSource ?? null,
            candleSource: null,
            reason: "Chart request timed out.",
            pairAddress: current.chart?.pairAddress ?? pair ?? current.market.pairAddress,
            timeframe,
          },
        }));
      });
    return () => {
      alive = false;
    };
  }, [mint, timeframe, chartTick]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tokens/${mint}/theses`)
      .then((res) => res.json() as Promise<ThesisPayload>)
      .then((next) => {
        if (alive) setTheses(next);
      })
      .catch(() => {
        if (alive) setTheses({ fomoscan: { items: [] }, muse: [], holders: { muse: [], fomoscan: [] } });
      });
    return () => {
      alive = false;
    };
  }, [mint]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/tokens/${mint}/swaps`)
        .then(async (res) => {
          const body = (await res.json()) as { swaps?: PoolTrade[]; items?: PoolTrade[] };
          return body.items?.length ? body.items : (body.swaps ?? []);
        })
        .then((next) => {
          if (alive) setSwaps(next);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 8_000);
    window.addEventListener("musefomo:tape", load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("musefomo:tape", load);
    };
  }, [mint]);

  const fomoOmitted = Boolean(theses?.fomoscan?.omitted) || isFomoScanQuota(
    theses?.fomoscan && typeof theses.fomoscan === "object" && "error" in theses.fomoscan
      ? String((theses.fomoscan as { error?: { code?: string } }).error?.code ?? "")
      : undefined,
  );
  const fomoItems = Array.isArray(theses?.fomoscan?.items) ? theses.fomoscan.items : [];
  const museItems = theses?.muse ?? theses?.agents ?? [];
  const museHolders = theses?.holders?.muse ?? [];
  const fomoHolders = fomoOmitted ? [] : (theses?.holders?.fomoscan ?? []);
  const visibleFomo = friendsOnly || fomoOmitted ? [] : fomoItems;
  const visibleFomoHolders = friendsOnly ? [] : fomoHolders;
  const showHolders = museHolders.length > 0 || visibleFomoHolders.length > 0;
  const showTheses = museItems.length > 0 || visibleFomo.length > 0 || !fomoOmitted;
  const market = token?.market ?? emptyMarket(mint);
  const resolvedMint = market.mint || mint;
  const headerSymbol =
    market.symbol && !looksLikeMint(market.symbol)
      ? market.symbol
      : (knownMint(resolvedMint)?.symbol ?? "Token");
  const headerName =
    market.name && !looksLikeMint(market.name) ? market.name : (knownMint(resolvedMint)?.name ?? shortAddr(resolvedMint));
  const activity = swaps.length ? swaps : (token?.prints ?? []);

  useEffect(() => {
    if (pane === "holders" && !showHolders) setPane(showTheses ? "theses" : "about");
    if (pane === "theses" && !showTheses) setPane("about");
  }, [pane, showHolders, showTheses]);

  const panes: Pane[] = [
    "swaps",
    ...(showTheses ? (["theses"] as const) : []),
    ...(showHolders ? (["holders"] as const) : []),
    "about",
  ];

  return (
    <div className="mf-cols-3 overflow-x-clip pb-[var(--mf-trade-bar)] lg:grid lg:h-[calc(100dvh-6.75rem)] lg:pb-0">
      <div className="flex min-w-0 flex-col">
        {live ? <TradeBanner trade={live} /> : null}
        <header className="flex items-center justify-between gap-2.5 border-b border-line px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <TokenIcon src={asHttpsLogo(market.imageUrl)} mint={resolvedMint} symbol={headerSymbol} size="md" />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold tracking-tight">
                  {headerSymbol}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(resolvedMint);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                  }}
                  className="mf-field min-h-11 shrink-0 rounded-full px-2.5 font-mono text-[10px] text-mute lg:min-h-0 lg:py-0.5"
                >
                  {copied ? "copied" : shortAddr(resolvedMint)}
                </button>
              </div>
              <p className="truncate text-[11px] text-mute">
                {headerName}
                {looksLikeEvm(resolvedMint) ? " · Robinhood Chain" : ""}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <LiveNum className="mf-num text-[15px] font-semibold tracking-tight" value={formatUsd(market.priceUsd)} />
            <p className={`mf-num text-[12px] ${changeTone(market.priceChange24h)}`}>{formatPct(market.priceChange24h)}</p>
          </div>
        </header>

        <dl className="grid grid-cols-4 gap-2 border-b border-line px-3.5 py-2 text-[11px] sm:grid-cols-5">
          <Metric label="MCap" value={formatUsd(market.marketCap ?? market.fdv)} />
          <Metric label="Liq" value={formatUsd(market.liquidityUsd)} />
          <Metric label="Vol" value={formatUsd(market.volume24h)} />
          <Metric label="24h" value={formatPct(market.priceChange24h)} tone={changeTone(market.priceChange24h)} />
          <div className="hidden sm:block">
            <Metric label="Price" value={formatUsd(market.priceUsd)} />
          </div>
        </dl>

        <div className="flex min-w-0 items-center gap-2 px-2 py-1.5 text-[11px] text-mute">
          <div className="mf-hscroll mf-tabs min-w-0 flex-1 items-center">
            {CHART_TIMEFRAMES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimeframe(value)}
                className={`relative min-h-9 shrink-0 px-2.5 lg:min-h-8 ${timeframe === value ? "text-ink" : ""}`}
              >
                {timeframe === value ? <span className="mf-tab-pill absolute inset-0 rounded-[10px]" /> : null}
                <span className="relative">{value}</span>
              </button>
            ))}
            <span className="mx-1 h-3.5 w-px shrink-0 bg-[var(--line)]" aria-hidden />
            {(["candle", "line"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setVariant(value)}
                className={`relative min-h-9 shrink-0 px-2.5 lg:min-h-8 ${variant === value ? "text-ink" : ""}`}
              >
                {variant === value ? <span className="mf-tab-pill absolute inset-0 rounded-[10px]" /> : null}
                <span className="relative">{value === "candle" ? "Candles" : "Line"}</span>
              </button>
            ))}
          </div>
          <span className="mf-caption hidden shrink-0 sm:inline">
            {token?.chart?.candleSource ? "Live" : chartPending ? "Loading" : "No candles"}
          </span>
        </div>

        <div className="min-h-[22rem] min-w-0 flex-1">
          {chartPending && !(token?.candles?.length) && !tokenError ? (
            <LoadingState label="Loading public candles…" />
          ) : null}
          {tokenError ? (
            <SurfaceState
              {...surfaceFromCode(tokenError.code, "generic", tokenError.message)}
              surface="token-chart"
              code={tokenError.code}
              retry={() => setMarketTick((value) => value + 1)}
            />
          ) : chartPending && !(token?.candles?.length) ? null : (
            <TokenChart
              bars={token?.candles ?? []}
              prints={activity}
              variant={variant}
              meta={token?.chart}
              onRetry={() => setChartTick((value) => value + 1)}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col border-b border-t border-line sm:flex-row sm:items-center sm:justify-between">
          <div className="mf-hscroll min-w-0 flex-1 px-2 py-1.5">
            <TabStrip
              layoutId="token-panes"
              value={pane}
              onChange={setPane}
              items={panes.map((value) => ({
                value,
                label: tabLabel(
                  value,
                  activity.length,
                  museItems.length + visibleFomo.length,
                  museHolders.length + visibleFomoHolders.length,
                ),
              }))}
            />
          </div>
          <label className="flex min-h-11 shrink-0 items-center gap-2 px-3 text-[11px] text-mute">
            Muse
            <button
              type="button"
              onClick={() => setFriendsOnly((value) => !value)}
              className={`relative h-6 w-10 rounded-full ${friendsOnly ? "bg-peri" : "bg-card"}`}
              aria-pressed={friendsOnly}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transition-transform duration-150 ease-out ${friendsOnly ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </button>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {renderPane({
            pane,
            market,
            mint: resolvedMint,
            swaps: activity,
            museItems,
            fomoItems: visibleFomo,
            museHolders,
            fomoHolders: visibleFomoHolders,
            friendsOnly,
          })}
        </div>
      </div>

      {desktop ? (
        <div className="mf-rail-right hidden border-l border-line lg:flex lg:flex-col">
          <AboutBlock market={market} mint={resolvedMint} />
          {looksLikeEvm(resolvedMint) ? (
            <p className="border-t border-line px-3 py-3 text-[12px] text-mute">
              Robinhood Chain token. No Solana book.
            </p>
          ) : (
            <TradeTicket mint={resolvedMint} market={market} solUsd={token?.solUsd} onTrade={setLive} />
          )}
        </div>
      ) : looksLikeEvm(resolvedMint) ? null : (
        <>
          <div className="mf-chrome fixed inset-x-0 z-20 border-t border-line px-3 pt-2 lg:hidden" style={{ bottom: "var(--mf-dock)" }}>
            <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                type="button"
                className="mf-buy min-h-11 rounded-md text-[14px] font-semibold"
                onClick={() => {
                  setTradeSide("buy");
                  setTradeOpen(true);
                }}
              >
                Buy
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md bg-sell text-[14px] font-semibold text-white"
                onClick={() => {
                  setTradeSide("sell");
                  setTradeOpen(true);
                }}
              >
                Sell
              </button>
            </div>
          </div>
          <Sheet
            open={tradeOpen}
            onClose={() => setTradeOpen(false)}
            title={`${tradeSide === "buy" ? "Buy" : "Sell"} ${headerSymbol}`}
          >
            <TradeTicket
              mint={resolvedMint}
              market={market}
              solUsd={token?.solUsd}
              onTrade={setLive}
              initialSide={tradeSide}
            />
          </Sheet>
        </>
      )}
    </div>
  );
}

function renderPane(input: {
  pane: Pane;
  market: TokenMarket;
  mint: string;
  swaps: PoolTrade[];
  museItems: MuseThesis[];
  fomoItems: FomoScanThesis[];
  museHolders: MuseHolder[];
  fomoHolders: FomoScanThesis[];
  friendsOnly: boolean;
}) {
  switch (input.pane) {
    case "swaps":
      if (!input.swaps.length) {
        return (
          <BoardNote title={COPY.noTrades.title} body={COPY.noTrades.body} />
        );
      }
      return (
        <div>
          {input.swaps.map((print) => (
            <SwapRow key={print.id} print={print} />
          ))}
        </div>
      );
    case "theses":
      return (
        <ThesesPane
          market={input.market}
          mint={input.mint}
          museItems={input.museItems}
          fomoItems={input.fomoItems}
          friendsOnly={input.friendsOnly}
        />
      );
    case "holders":
      return (
        <HoldersPane
          museHolders={input.museHolders}
          fomoHolders={input.fomoHolders}
          decimals={input.market.decimals}
          symbol={input.market.symbol}
        />
      );
    case "about":
      return <AboutBlock market={input.market} mint={input.mint} />;
    default: {
      const _never: never = input.pane;
      return _never;
    }
  }
}

function ThesesPane({
  market,
  mint,
  museItems,
  fomoItems,
  friendsOnly,
}: {
  market: TokenMarket;
  mint: string;
  museItems: MuseThesis[];
  fomoItems: FomoScanThesis[];
  friendsOnly: boolean;
}) {
  return (
    <div>
      {museItems.length ? (
        <section>
          <p className="mf-kicker px-3.5 pt-3">Muse</p>
          {museItems.map((item) => (
            <MuseThesisRow key={item.id} item={item} />
          ))}
        </section>
      ) : (
        <BoardNote
          title={COPY.noThesis.title}
          body={friendsOnly ? "No claimed Muse has written a thesis on this token." : COPY.noThesis.body}
        />
      )}
      {friendsOnly ? null : fomoItems.length ? (
        <section>
          <p className="mf-kicker px-3.5 pt-3">Humans</p>
          {fomoItems.map((item, index) => (
            <FeedRow key={item.id} item={item} index={index} />
          ))}
        </section>
      ) : null}
      <section>
        <p className="mf-kicker px-3.5 pt-3">Market</p>
        <AboutBlock market={market} mint={mint} />
      </section>
    </div>
  );
}

function HoldersPane({
  museHolders,
  fomoHolders,
  decimals,
  symbol,
}: {
  museHolders: MuseHolder[];
  fomoHolders: FomoScanThesis[];
  decimals: number | null;
  symbol: string | null;
}) {
  return (
    <div>
      {museHolders.length ? (
        <section>
          <p className="mf-kicker px-3.5 pt-3">Muse</p>
          {museHolders.map((holder) => (
            <Link
              key={holder.agentId}
              href={museProfileHref(holder.agentId)}
              className="mf-row flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Pfp agentId={holder.agentId} name={holder.displayName} handle={holder.handle} kind="agent" />
                <span className="truncate text-[13px] font-medium">@{holder.handle}</span>
              </span>
              <span className="shrink-0 text-[13px]">
                {formatBaseAmount(holder.amount, decimals)} {symbol ?? ""}
              </span>
            </Link>
          ))}
        </section>
      ) : null}
      {fomoHolders.length ? (
        <section>
          <p className="mf-kicker px-3.5 pt-3">Humans</p>
          {fomoHolders.map((item) => (
            <FomoHolderRow key={item.id} item={item} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function MuseThesisRow({ item }: { item: MuseThesis }) {
  return (
    <article className="border-b border-line px-3.5 py-2.5">
      <div className="flex items-start gap-2.5">
        <Link href={museProfileHref(item.agentId)} className="shrink-0">
          <Pfp agentId={item.agentId} name={item.displayName} handle={item.handle} kind="agent" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={museProfileHref(item.agentId)} className="truncate text-[13px] font-medium">
              @{item.handle}
            </Link>
            <span className="mf-pill mf-pill-agent">Muse</span>
            <span className="ml-auto text-[11px] text-mute">{timeAgo(item.createdAt)}</span>
          </div>
          <p className="mt-1 text-[13px] leading-5">{item.text}</p>
        </div>
      </div>
    </article>
  );
}

function FomoHolderRow({ item }: { item: FomoScanThesis }) {
  const href = humanProfileHref(item.authorHandle ?? item.authorId ?? "");
  return (
    <Link href={href} className="mf-row flex items-start gap-2.5 border-b border-line px-3.5 py-2.5">
      <Pfp src={item.authorAvatar} name={item.authorName} handle={item.authorHandle} kind="human" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium">
            <span className="truncate">{item.authorHandle ?? item.authorName ?? "trader"}</span>
            <FomoScanPill />
          </p>
          {item.holdingsUsd != null ? (
            <p className="text-[13px]">{formatUsd(item.holdingsUsd)}</p>
          ) : item.tokenAmount != null ? (
            <p className="text-[13px]">{item.tokenAmount.toLocaleString()}</p>
          ) : null}
        </div>
        <p className="text-[11px] text-mute">Human</p>
      </div>
    </Link>
  );
}

function SwapRow({ print }: { print: PoolTrade }) {
  const inner = (
    <div className="flex items-center justify-between border-b border-line px-3.5 py-2 text-[13px]">
      <span className={print.side === "buy" ? "text-up" : "text-down"}>{print.side === "buy" ? "Buy" : "Sell"}</span>
      <span className="mf-num">{formatUsd(print.usd)}</span>
      <span className="text-[11px] text-mute">{timeAgo(print.at)}</span>
    </div>
  );
  if (!looksLikeSignature(print.id)) return inner;
  return (
    <a href={`https://solscan.io/tx/${print.id}`} target="_blank" rel="noreferrer">
      {inner}
    </a>
  );
}

function AboutBlock({ market, mint }: { market: TokenMarket; mint: string }) {
  const buys = market.buyVolume24h ?? 0;
  const sells = market.sellVolume24h ?? 0;
  const total = buys + sells;
  const buyPct = total ? (buys / total) * 100 : 50;
  return (
    <dl className="grid grid-cols-2 gap-2.5 p-3 text-[13px]">
      <div>
        <dt className="text-[11px] text-mute">Price</dt>
        <dd className="mf-num">{formatUsd(market.priceUsd)}</dd>
      </div>
      <div>
        <dt className="text-[11px] text-mute">Volume</dt>
        <dd className="mf-num">{formatUsd(market.volume24h)}</dd>
      </div>
      <div>
        <dt className="text-[11px] text-mute">Liquidity</dt>
        <dd className="mf-num">{formatUsd(market.liquidityUsd)}</dd>
      </div>
      <div>
        <dt className="text-[11px] text-mute">Market cap</dt>
        <dd className="mf-num">{formatUsd(market.marketCap ?? market.fdv)}</dd>
      </div>
      <div className="col-span-2 min-w-0">
        <dt className="mb-1 text-[11px] text-mute">Buy vs sell (24h)</dt>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-card">
          <span className="bg-up" style={{ width: `${buyPct}%` }} />
          <span className="bg-down" style={{ width: `${100 - buyPct}%` }} />
        </div>
        <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[11px] text-mute">
          <span className="mf-num text-up">Buy {formatUsd(market.buyVolume24h)} · {market.buys24h ?? 0}</span>
          <span className="mf-num text-down">Sell {formatUsd(market.sellVolume24h)} · {market.sells24h ?? 0}</span>
        </div>
      </div>
      <div className="col-span-2 min-w-0">
        <dt className="text-[11px] text-mute">Mint</dt>
        <dd className="break-all font-mono text-[11px]">{mint}</dd>
      </div>
    </dl>
  );
}

function TradeBanner({ trade }: { trade: LiveTrade }) {
  const pending = trade.status === "submitted" || trade.status === "confirming" || trade.status === "awaiting_signature";
  const failed = trade.status === "failed" || trade.status === "expired";
  const href = looksLikeSignature(trade.signature) ? `https://solscan.io/tx/${trade.signature}` : null;
  const label = pending
    ? COPY.txConfirming.title
    : trade.status === "expired"
      ? COPY.quoteExpired.title
      : trade.status === "failed"
        ? COPY.txFailed.title
        : trade.status === "confirmed"
          ? "Confirmed on Solana"
          : `Trade ${trade.status}`;
  const node = (
    <div
      className={`mf-phase flex items-center justify-between gap-2 border-b px-3.5 py-1.5 text-[11px] ${
        failed ? "border-sell/30 text-sell" : pending ? "border-line text-mute" : "border-line text-up"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono">{trade.signature ? shortAddr(trade.signature) : trade.id.slice(0, 8)}</span>
    </div>
  );
  if (!href) return node;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {node}
    </a>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-mute">{label}</dt>
      <dd className={`mf-num truncate ${tone ?? "text-ink"}`}>{value}</dd>
    </div>
  );
}

function tabLabel(pane: Pane, swaps: number, theses: number, holders: number): string {
  switch (pane) {
    case "swaps":
      return `Activity (${swaps})`;
    case "theses":
      return `Theses (${theses})`;
    case "holders":
      return `Holders (${holders})`;
    case "about":
      return "About";
    default: {
      const _never: never = pane;
      return _never;
    }
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function emptyMarket(mint: string): TokenMarket {
  return overlayKnownMarket({
    mint,
    symbol: null,
    name: null,
    imageUrl: null,
    priceUsd: null,
    priceChange24h: null,
    volume24h: null,
    liquidityUsd: null,
    marketCap: null,
    fdv: null,
    pairAddress: null,
    dexId: null,
    decimals: null,
    buys24h: null,
    sells24h: null,
    buyVolume24h: null,
    sellVolume24h: null,
  });
}
