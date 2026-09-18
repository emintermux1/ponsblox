"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { SurfaceState } from "@/components/surface-state";
import { TokenIcon } from "@/components/token-icon";
import { useFomoMotion } from "@/components/use-fomo-motion";
import { PUBLIC_GET_MS, QUICK_BUY_USD, QUOTE_BUDGET_MS, QUOTE_TTL_MS, SOL_DECIMALS, SOL_MINT } from "@/lib/constants";
import { formatBaseAmount, formatUsd, looksLikeMint, parseImpactPct, uiAmountToBase, usdToSolLamports } from "@/lib/format";
import { dexLogo, knownMint } from "@/lib/known-mints";
import { asHttpsLogo } from "@/lib/token-logo";
import { COPY, publicCopy, readApiError, surfaceFromCode } from "@/lib/surface-copy";
import type { LiveTrade, TokenMarket, TradeStatus, WalletFill, WalletSnapshot } from "@/lib/types";

type TicketIdentity = { symbol: string; name: string | null; imageUrl: string | null };

type Side = "buy" | "sell";
type PosTab = "open" | "closed";
type Phase = "idle" | "quoting" | "quoted" | "expired" | "signing" | "pending" | "confirmed" | "failed";

type QuoteView = {
  inAmount: string;
  outAmount: string;
  minOutAmount: string;
  priceImpactPct: string;
  lastValidBlockHeight: number | null;
  quotedAt: number;
};

export function TradeTicket({
  mint,
  market,
  fat = false,
  solUsd: solUsdHint = null,
  onTrade,
  initialSide,
}: {
  mint: string;
  market: TokenMarket;
  fat?: boolean;
  /** DexScreener SOL mark from the token payload. Helius wallet still owns available cash. */
  solUsd?: number | null;
  onTrade?: (trade: LiveTrade | null) => void;
  initialSide?: Side;
}) {
  const { authenticated, getAccessToken, login } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const motionPrefs = useFomoMotion();
  const [side, setSide] = useState<Side>(initialSide ?? "buy");
  const [usdAmount, setUsdAmount] = useState(5);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [fills, setFills] = useState<WalletFill[]>([]);
  const [posTab, setPosTab] = useState<PosTab>("open");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const [live, setLive] = useState<LiveTrade | null>(null);
  const [now, setNow] = useState(Date.now());
  const [identity, setIdentity] = useState<TicketIdentity | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(solUsdHint);
  const [claimedWallet, setClaimedWallet] = useState<string | null>(null);

  useEffect(() => {
    if (initialSide) setSide(initialSide);
  }, [initialSide]);

  useEffect(() => {
    if (solUsdHint != null && solUsdHint > 0) setSolUsd(solUsdHint);
  }, [solUsdHint]);

  useEffect(() => {
    if (solUsd != null && solUsd > 0) return;
    let alive = true;
    fetch(`/api/tokens/${SOL_MINT}`, { signal: AbortSignal.timeout(2_000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { solUsd?: number | null; market?: { priceUsd?: number | null } } | null) => {
        if (!alive) return;
        const px = body?.solUsd ?? body?.market?.priceUsd;
        if (typeof px === "number" && px > 0) setSolUsd(px);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [solUsd]);

  useEffect(() => {
    let alive = true;
    const known = knownMint(mint);
    if (known) {
      setIdentity({ symbol: known.symbol, name: known.name, imageUrl: known.imageUrl });
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), PUBLIC_GET_MS);
    void (async () => {
      const next = await resolveTicketIdentity(mint, market, ac.signal);
      if (!alive || !next) return;
      setIdentity(next);
    })();
    return () => {
      alive = false;
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [mint, market.symbol, market.name, market.imageUrl]);

  const sessionWallet = claimedWallet
    ? wallets.find((item) => item.address === claimedWallet) ?? null
    : wallets[0] ?? null;
  const address = sessionWallet?.address ?? null;

  function loadWallet(fresh = false) {
    if (!address) {
      setWallet(null);
      setFills([]);
      return;
    }
    const query = new URLSearchParams();
    if (fresh) query.set("fresh", "1");
    if (mint) query.set("mint", mint);
    return fetch(`/api/wallet/${address}?${query.toString()}`, {
      signal: AbortSignal.timeout(PUBLIC_GET_MS),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        setWallet(body?.wallet ?? null);
        setFills(Array.isArray(body?.fills) ? body.fills.filter((fill: WalletFill) => fill.signature) : []);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    if (!authenticated) {
      setClaimedWallet(null);
      return;
    }
    let alive = true;
    void (async () => {
      const token = await getAccessToken();
      const mine = await fetch("/api/agents/mine", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
      if (!alive) return;
      const agents = (mine?.agents ?? []) as Array<{ status?: string; walletAddress?: string | null }>;
      const claimed = agents.find((item) => item.status === "claimed" && item.walletAddress);
      setClaimedWallet(claimed?.walletAddress ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    const pending = readPendingTrade();
    if (!pending || pending.mint !== mint || !authenticated) return;
    let alive = true;
    setPhase("pending");
    void (async () => {
      const token = await getAccessToken();
      const settled = await waitForFill(pending.id, token);
      if (!alive) return;
      if (settled?.status === "confirmed") {
        forgetPendingTrade();
        setPhase("confirmed");
        pushTrade(toLive(settled));
        setNote("Confirmed on Solana.");
        await loadWallet(true);
        window.dispatchEvent(new Event("musefomo:tape"));
        window.dispatchEvent(new Event("musefomo:wallet"));
        return;
      }
      if (settled?.status === "failed" || settled?.status === "expired") {
        forgetPendingTrade();
        setPhase(settled.status === "expired" ? "expired" : "failed");
        pushTrade(toLive(settled));
      }
    })();
    return () => {
      alive = false;
    };
  }, [authenticated, getAccessToken, mint]);

  useEffect(() => {
    if (!address) {
      setWallet(null);
      setFills([]);
      return;
    }
    let alive = true;
    void loadWallet(false)?.then(() => {
      if (!alive) return;
    });
    const timer = window.setInterval(() => {
      void loadWallet(false);
    }, 12_000);
    const onRefresh = () => {
      void loadWallet(true);
    };
    window.addEventListener("musefomo:wallet", onRefresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("musefomo:wallet", onRefresh);
    };
  }, [address, mint]);

  const ticket = ticketIdentity(mint, market, identity);
  const tokenHeld = wallet?.tokens.find((token) => token.mint === mint && token.amount > 0);
  const cashUsd = wallet
    ? wallet.solUsd ?? (solUsd != null ? wallet.sol * solUsd : null)
    : null;
  const tokenUsd = tokenHeld?.usd ?? (tokenHeld && market.priceUsd != null ? tokenHeld.amount * market.priceUsd : null);
  const availableUsd = side === "buy" ? cashUsd : tokenUsd;
  const shortCash =
    authenticated &&
    address &&
    wallet != null &&
    availableUsd != null &&
    usdAmount > availableUsd + 0.0001;
  const closed = fills.filter((fill) => fill.mint === mint && fill.side === "sell");
  const open = tokenHeld && tokenHeld.amount > 0 ? tokenHeld : null;
  const decimals = tokenHeld?.decimals ?? market.decimals;
  const quoteAge = quote ? now - quote.quotedAt : 0;
  const quoteLeft = quote ? Math.max(0, QUOTE_TTL_MS - quoteAge) : 0;
  const impact = parseImpactPct(quote?.priceImpactPct);
  const materialImpact = impact != null && Math.abs(impact) >= 1;
  const busy = phase === "quoting" || phase === "signing";
  const estimateOut =
    side === "buy" && market.priceUsd != null && market.priceUsd > 0 && usdAmount > 0
      ? `${(usdAmount / market.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${ticket.symbol}`
      : null;
  const submitLocked = authenticated
    ? busy || phase === "pending" || phase === "expired" || !quote || shortCash || usdAmount <= 0
    : usdAmount <= 0;

  function sizeAmount(): string | null {
    const mark =
      wallet && wallet.sol > 0 && wallet.solUsd != null
        ? wallet.solUsd / wallet.sol
        : solUsd;
    if (side === "buy") {
      if (mark == null) return null;
      const lamports = usdToSolLamports(usdAmount, mark);
      return lamports > 0n ? lamports.toString() : null;
    }
    if (!tokenHeld || tokenHeld.amount <= 0) return null;
    const value = tokenUsd;
    const fraction = value && value > 0 ? Math.min(1, usdAmount / value) : 1;
    if (fraction >= 1 && tokenHeld.rawAmount) return tokenHeld.rawAmount;
    if (tokenHeld.decimals > 0) {
      const base = uiAmountToBase(tokenHeld.amount * fraction, tokenHeld.decimals);
      return base > 0n ? base.toString() : null;
    }
    return null;
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (quote && quoteLeft <= 0 && (phase === "quoted" || phase === "quoting")) {
      setPhase("expired");
    }
  }, [quote, quoteLeft, phase]);

  useEffect(() => {
    const amount = sizeAmount();
    if (phase === "signing" || phase === "pending") return;
    if (!amount || usdAmount <= 0) {
      setQuote(null);
      if (phase === "quoting" || phase === "quoted" || phase === "expired") setPhase("idle");
      return;
    }
    if (side === "sell" && !tokenHeld) {
      setQuote(null);
      setPhase("idle");
      return;
    }
    let alive = true;
    let failTimer = 0;
    const ac = new AbortController();
    setPhase("quoting");
    const failAt = (message: string) => {
      if (!alive) return;
      alive = false;
      window.clearTimeout(failTimer);
      ac.abort();
      setQuote((prev) => {
        if (prev) {
          setPhase("quoted");
          setNote(message);
          return prev;
        }
        setPhase("idle");
        setNote(message);
        return null;
      });
    };
    failTimer = window.setTimeout(() => failAt("Quote timed out."), QUOTE_BUDGET_MS);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/trades/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mint, side, amount }),
            signal: ac.signal,
          });
          const body = (await res.json()) as {
            error?: { message?: string };
            quote?: {
              inAmount: string;
              outAmount: string;
              minOutAmount: string;
              priceImpactPct: string;
              lastValidBlockHeight: number | null;
            };
          };
          if (!alive) return;
          window.clearTimeout(failTimer);
          if (!res.ok || !body.quote) {
            const parsed = readApiError(body);
            setQuote(null);
            setPhase(parsed.code === "QUOTE_EXPIRED" || parsed.code === "expired" ? "expired" : "idle");
            setNote(
              parsed.message?.toLowerCase().includes("timed out")
                ? "Quote timed out."
                : surfaceFromCode(parsed.code, "trade", parsed.message ?? "Quote failed.").title,
            );
            return;
          }
          setQuote({ ...body.quote, quotedAt: Date.now() });
          setNote(null);
          setPhase("quoted");
        } catch {
          if (ac.signal.aborted) return;
          failAt("Quote failed.");
        }
      })();
    }, 180);
    return () => {
      alive = false;
      ac.abort();
      window.clearTimeout(timer);
      window.clearTimeout(failTimer);
    };
  }, [mint, side, usdAmount, address, tokenHeld?.rawAmount, wallet?.solUsd, solUsd, quoteNonce]);

  function pushTrade(next: LiveTrade | null) {
    setLive(next);
    onTrade?.(next);
  }

  async function submit() {
    setNote(null);
    if (!authenticated) {
      login();
      return;
    }
    if (phase === "expired" || !quote || quoteLeft <= 0) {
      setPhase("expired");
      setNote(COPY.quoteExpired.title);
      return;
    }
    if (claimedWallet && !sessionWallet) {
      setNote("Connect the wallet that claimed this agent.");
      return;
    }
    if (!sessionWallet) {
      setNote("No Solana wallet on this Privy session yet.");
      return;
    }
    if (shortCash) {
      setNote(side === "buy" ? COPY.insufficientSol.title : COPY.sellExceeds.title);
      return;
    }
    if (side === "buy" && (cashUsd == null || cashUsd <= 0)) {
      setNote(COPY.insufficientSol.title);
      return;
    }
    const amount = sizeAmount();
    if (!amount || amount === "0") {
      setNote(side === "sell" ? COPY.sellExceeds.title : "Amount is zero.");
      return;
    }
    setPhase("signing");
    try {
      const token = await getAccessToken();
      const orderKey = crypto.randomUUID();
      const opened = await fetch(`/api/human/trades/${side}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": orderKey,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mint, amount }),
      });
      const payload = (await opened.json()) as {
        error?: { message?: string };
        transaction?: string | null;
        trade?: { id: string; status: TradeStatus; signature?: string | null; failReason?: string | null };
      };
      if (!opened.ok) {
        const parsed = readApiError(payload);
        setPhase(parsed.code === "QUOTE_EXPIRED" || parsed.code === "expired" ? "expired" : "failed");
        setNote(surfaceFromCode(parsed.code, "trade", parsed.message).title);
        pushTrade(payload.trade ? toLive(payload.trade) : null);
        return;
      }
      if (!payload.transaction || !payload.trade) {
        setPhase("failed");
        setNote("No signable transaction. Nothing was submitted.");
        return;
      }
      const signed = await signTransaction({
        wallet: sessionWallet,
        transaction: bytesFromBase64(payload.transaction),
        chain: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      });
      const submitted = await fetch(`/api/trades/${payload.trade.id}/submit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${orderKey}:submit`,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ signedTransaction: bytesToBase64(signed.signedTransaction) }),
      });
      const result = (await submitted.json()) as {
        error?: { message?: string };
        trade?: { id: string; status: TradeStatus; signature?: string | null; failReason?: string | null };
      };
      if (!submitted.ok || !result.trade) {
        const parsed = readApiError(result);
        setPhase(parsed.code === "QUOTE_EXPIRED" || parsed.code === "expired" ? "expired" : "failed");
        setNote(surfaceFromCode(parsed.code, "trade", parsed.message).title);
        pushTrade(result.trade ? toLive(result.trade) : null);
        return;
      }
      setPhase("pending");
      pushTrade(toLive(result.trade));
      setNote(COPY.txConfirming.title);
      rememberPendingTrade(result.trade.id, mint);
      const settled = await waitForFill(result.trade.id, token);
      if (settled?.status === "confirmed") {
        forgetPendingTrade();
        setPhase("confirmed");
        pushTrade(toLive(settled));
        setNote("Confirmed on Solana.");
        await loadWallet(true);
        window.dispatchEvent(new Event("musefomo:tape"));
        window.dispatchEvent(new Event("musefomo:wallet"));
        return;
      }
      if (settled?.status === "failed" || settled?.status === "expired") {
        forgetPendingTrade();
        setPhase(settled.status === "expired" ? "expired" : "failed");
        pushTrade(toLive(settled));
        setNote(settled.status === "expired" ? COPY.quoteExpired.title : COPY.txFailed.title);
        return;
      }
      setNote(COPY.txConfirming.title);
    } catch (error) {
      setPhase("failed");
      setNote(error instanceof Error ? publicCopy(error.message, COPY.txFailed.title) : COPY.txFailed.title);
    }
  }

  const expectedOut = quote
    ? side === "buy"
      ? `${formatBaseAmount(quote.outAmount, decimals)} ${ticket.symbol}`
      : `${formatBaseAmount(quote.outAmount, SOL_DECIMALS)} SOL`
    : null;

  return (
    <aside className={fat ? "p-2.5 text-ink" : "border-t border-line p-3 text-ink"}>
      <div className="relative mb-2.5 flex items-center gap-2">
        <TokenIcon src={asHttpsLogo(ticket.imageUrl)} mint={mint} symbol={ticket.symbol} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{ticket.symbol}</p>
          {ticket.name ? <p className="truncate text-[11px] text-mute">{ticket.name}</p> : null}
        </div>
      </div>
      <div className="mf-tabs relative mb-2.5 flex text-[13px]">
        {(["buy", "sell"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setSide(value);
              setLive(null);
              onTrade?.(null);
            }}
            className={`relative z-10 min-h-11 flex-1 rounded-md capitalize lg:min-h-8 ${
              side === value ? "text-white" : "text-mute"
            }`}
          >
            {side === value ? (
              motionPrefs.reduced ? (
                <span className={`absolute inset-0 rounded-md ${value === "buy" ? "bg-buy" : "bg-sell"}`} />
              ) : (
                <motion.span
                  layoutId="trade-side"
                  className={`absolute inset-0 rounded-md ${value === "buy" ? "bg-buy" : "bg-sell"}`}
                  transition={motionPrefs.transition("fast")}
                />
              )
            ) : null}
            <span className="relative">{value}</span>
          </button>
        ))}
      </div>
      <label className="relative mb-2.5 block">
        <span className="sr-only">USD amount</span>
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xl font-semibold text-mute">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          value={Number.isFinite(usdAmount) ? usdAmount : 0}
          onChange={(event) => setUsdAmount(Number(event.target.value) || 0)}
          className="mf-field mf-num h-11 w-full rounded-[12px] py-2 pl-7 pr-2.5 text-xl font-semibold tracking-tight lg:h-auto"
        />
      </label>
      <div className="relative mb-2.5 grid grid-cols-4 gap-1.5">
        {QUICK_BUY_USD.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setUsdAmount(value)}
            className={`relative min-h-11 rounded-[10px] border text-[12px] lg:min-h-8 ${
              usdAmount === value ? "border-transparent text-ink" : "border-line text-mute"
            }`}
          >
            {usdAmount === value ? (
              motionPrefs.reduced ? (
                <span className="mf-glass-hit absolute inset-0 rounded-[10px]" />
              ) : (
                <motion.span
                  layoutId="quick-buy"
                  className="mf-glass-hit absolute inset-0 rounded-[10px]"
                  transition={motionPrefs.transition("fast")}
                />
              )
            ) : null}
            <span className="relative mf-num">${value}</span>
          </button>
        ))}
      </div>
      <p className="relative mb-1 text-[11px] text-mute">
        {!authenticated
          ? "Sign in to see cash."
          : !address
            ? "No Solana wallet on this session."
            : wallet
              ? side === "buy"
                ? <span className="mf-num">{formatUsd(cashUsd)} available</span>
                : <span className="mf-num">{formatUsd(tokenUsd)} available</span>
              : "Reading wallet…"}
      </p>
      {shortCash ? (
        <SurfaceState
          {...(side === "buy" ? COPY.insufficientSol : COPY.sellExceeds)}
          surface="ticket-cash"
          code={side === "buy" ? "INSUFFICIENT_BALANCE" : "SELL_EXCEEDS"}
        />
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={phase} {...motionPrefs.tab}>
          <QuoteStrip
            phase={phase}
            expectedOut={expectedOut}
            estimateOut={estimateOut}
            impact={impact}
            materialImpact={materialImpact}
            quoteLeft={quoteLeft}
            live={live}
          />
        </motion.div>
      </AnimatePresence>
      <button
        type="button"
        disabled={submitLocked && phase !== "expired"}
        onClick={() => {
          if (phase === "expired") return;
          void submit();
        }}
        className={`relative mt-2 min-h-11 w-full rounded-[12px] text-[14px] font-semibold disabled:opacity-60 lg:h-10 ${
          side === "sell" ? "mf-sell" : "mf-buy"
        }`}
      >
          {!authenticated ? `Sign in to ${side} ${ticket.symbol}` : ctaLabel(phase, side, ticket.symbol)}
      </button>
      {phase === "expired" ? (
        <button
          type="button"
          onClick={() => setQuoteNonce((value) => value + 1)}
          className="mf-field relative mt-1.5 min-h-11 w-full rounded-[12px] text-[12px] text-ink lg:h-8 lg:min-h-8"
        >
          Requote
        </button>
      ) : null}
      {note ? (
        <SurfaceState
          kind={phase === "failed" ? "failed" : phase === "pending" ? "pending" : phase === "expired" ? "failed" : "partial"}
          surface="ticket-note"
          title={note}
          body={
            phase === "expired"
              ? COPY.quoteExpired.body
              : phase === "pending"
                ? COPY.txConfirming.body
                : phase === "failed"
                  ? COPY.txFailed.body
                  : "Live quote. Submit is a separate confirm."
          }
        />
      ) : null}

      <div className="relative mt-3 border-t border-line pt-2.5">
        <p className="mf-kicker mb-1.5">Your positions</p>
        <div className="mb-2 flex gap-3 text-[13px]">
          {(["open", "closed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPosTab(value)}
              className={`capitalize ${posTab === value ? "text-ink" : "text-mute"}`}
            >
              {value}
            </button>
          ))}
        </div>
        {posTab === "open" ? (
          open ? (
            <p className="mf-num text-[13px]">
              {open.amount.toLocaleString()} {displayTicker(open.symbol) ?? ticket.symbol} · {formatUsd(open.usd)}
            </p>
          ) : (
            <p className="text-[13px] text-mute">{COPY.noTrades.title}</p>
          )
        ) : closed.length ? (
          <ul className="space-y-1.5 text-[13px]">
            {closed.map((fill) => (
              <li key={fill.id} className="text-mute">
                Sold {fill.signature ? fill.signature.slice(0, 8) : fill.id.slice(0, 8)}
                {fill.confirmedAt ? " · confirmed" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-mute">{COPY.noTrades.title}</p>
        )}
      </div>
    </aside>
  );
}

function displayTicker(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (looksLikeMint(trimmed)) return null;
  if (trimmed.length > 16) return null;
  return trimmed;
}

function displayName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (looksLikeMint(trimmed)) return null;
  return trimmed.length > 40 ? `${trimmed.slice(0, 39)}…` : trimmed;
}

function ticketIdentity(mint: string, market: TokenMarket, overlay: TicketIdentity | null): TicketIdentity {
  const known = knownMint(mint);
  const symbol =
    displayTicker(overlay?.symbol) ??
    displayTicker(market.symbol) ??
    known?.symbol ??
    displayTicker(overlay?.name) ??
    displayTicker(market.name) ??
    "Token";
  const name = displayName(overlay?.name) ?? displayName(market.name) ?? known?.name ?? null;
  const imageUrl =
    asHttpsLogo(overlay?.imageUrl) ?? asHttpsLogo(market.imageUrl) ?? known?.imageUrl ?? dexLogo(mint);
  return { symbol, name, imageUrl };
}

async function resolveTicketIdentity(
  mint: string,
  market: TokenMarket,
  signal: AbortSignal,
): Promise<TicketIdentity | null> {
  const fromMarket = ticketIdentity(mint, market, null);
  const needLive = !displayTicker(market.symbol) || !market.imageUrl;
  if (!needLive && fromMarket.symbol !== "Token") return fromMarket;
  try {
    const [api, dex] = await Promise.all([
      fetch(`/api/tokens/${encodeURIComponent(mint)}`, { signal, cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`, {
        signal,
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]);
    const apiMarket = (api as { market?: TokenMarket } | null)?.market;
    const pair = firstDexPair(dex, mint);
    const symbol =
      displayTicker(apiMarket?.symbol) ??
      displayTicker(pair?.symbol) ??
      displayTicker(market.symbol);
    const name = displayName(apiMarket?.name) ?? displayName(pair?.name) ?? displayName(market.name);
    const imageUrl =
      asHttpsLogo(apiMarket?.imageUrl) ?? asHttpsLogo(pair?.imageUrl) ?? asHttpsLogo(market.imageUrl) ?? dexLogo(mint);
    if (!symbol && !imageUrl) return fromMarket;
    return {
      symbol: symbol ?? fromMarket.symbol,
      name: name ?? fromMarket.name,
      imageUrl,
    };
  } catch {
    return fromMarket;
  }
}

function firstDexPair(
  body: unknown,
  mint: string,
): { symbol: string | null; name: string | null; imageUrl: string | null } | null {
  if (!body || typeof body !== "object") return null;
  const pairs = (body as { pairs?: unknown }).pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  const rows = pairs.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  const match =
    rows.find((row) => {
      const base = row.baseToken;
      return Boolean(base && typeof base === "object" && (base as { address?: string }).address === mint);
    }) ?? rows[0];
  if (!match) return null;
  const base = match.baseToken && typeof match.baseToken === "object" ? (match.baseToken as Record<string, unknown>) : null;
  const info = match.info && typeof match.info === "object" ? (match.info as Record<string, unknown>) : null;
  return {
    symbol: typeof base?.symbol === "string" ? base.symbol : null,
    name: typeof base?.name === "string" ? base.name : null,
    imageUrl: typeof info?.imageUrl === "string" ? info.imageUrl : null,
  };
}

function QuoteStrip({
  phase,
  expectedOut,
  estimateOut,
  impact,
  materialImpact,
  quoteLeft,
  live,
}: {
  phase: Phase;
  expectedOut: string | null;
  estimateOut: string | null;
  impact: number | null;
  materialImpact: boolean;
  quoteLeft: number;
  live: LiveTrade | null;
}) {
  if (phase === "pending" && live) {
    return (
      <div className="mf-phase rounded-md border border-line bg-peri-soft px-2.5 py-2 text-[12px]" data-kind="pending">
        <p className="font-medium text-ink">{COPY.txConfirming.title}</p>
        <p className="text-mute">{live.signature ? `${live.signature.slice(0, 8)}…` : live.status}</p>
      </div>
    );
  }
  if (phase === "confirmed" && live) {
    return (
      <div className="mf-phase rounded-md border border-line px-2.5 py-2 text-[12px] text-up" data-kind="success">
        Confirmed {live.signature ? live.signature.slice(0, 8) : live.id.slice(0, 8)}…
      </div>
    );
  }
  if (phase === "quoting") {
    return <p className="text-[11px] text-mute">{estimateOut ? `Est. ${estimateOut}` : "Quoting…"}</p>;
  }
  if (phase === "expired") {
    return <p className="text-[11px] text-sell">{COPY.quoteExpired.title}. Submit is disabled until requote.</p>;
  }
  if (!expectedOut) {
    return (
      <p className="text-[11px] text-mute">
        {estimateOut ? `Est. ${estimateOut}` : "Pick an amount for a live quote."}
      </p>
    );
  }
  return (
    <div className="space-y-0.5 text-[12px]">
      <p className="text-ink">Expect {expectedOut}</p>
      <p className={materialImpact ? "text-sell" : "text-mute"}>
        Impact {impact == null ? "—" : `${impact.toFixed(2)}%`}
        {materialImpact ? " · material" : ""}
        {quoteLeft > 0 ? ` · ${Math.ceil(quoteLeft / 1000)}s` : ""}
      </p>
    </div>
  );
}

function ctaLabel(phase: Phase, side: Side, symbol: string | null): string {
  switch (phase) {
    case "quoting":
      return "Quoting…";
    case "signing":
      return "Sign in wallet…";
    case "pending":
      return COPY.txConfirming.title;
    case "expired":
      return COPY.quoteExpired.title;
    case "failed":
      return `${side === "buy" ? "Buy" : "Sell"} ${symbol ?? "token"}`;
    case "idle":
    case "quoted":
    case "confirmed":
      return `${side === "buy" ? "Buy" : "Sell"} ${symbol ?? "token"}`;
    default: {
      const _never: never = phase;
      return _never;
    }
  }
}

function toLive(trade: {
  id: string;
  status: TradeStatus;
  signature?: string | null;
  failReason?: string | null;
}): LiveTrade {
  return {
    id: trade.id,
    status: trade.status,
    signature: trade.signature ?? null,
    failReason: trade.failReason ?? null,
  };
}

const PENDING_TRADE_KEY = "musefomo:pending-trade";

function rememberPendingTrade(id: string, mint: string) {
  sessionStorage.setItem(PENDING_TRADE_KEY, JSON.stringify({ id, mint }));
}

function forgetPendingTrade() {
  sessionStorage.removeItem(PENDING_TRADE_KEY);
}

function readPendingTrade(): { id: string; mint: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TRADE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; mint?: string };
    if (!parsed.id || !parsed.mint) return null;
    return { id: parsed.id, mint: parsed.mint };
  } catch {
    return null;
  }
}

async function waitForFill(
  id: string,
  token: string | null,
): Promise<{ id: string; status: TradeStatus; signature?: string | null; failReason?: string | null } | null> {
  for (let i = 0; i < 8; i += 1) {
    const res = await fetch(`/api/trades/${id}/wait?timeoutMs=12000`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    const body = (await res.json()) as {
      trade?: { id: string; status?: TradeStatus; signature?: string | null; failReason?: string | null };
    };
    const status = body.trade?.status;
    if (status === "confirmed" || status === "failed" || status === "expired") {
      return body.trade ? { ...body.trade, status } : null;
    }
  }
  return null;
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
