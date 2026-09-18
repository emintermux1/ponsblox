"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { Composition, weightSum } from "@/components/composition";
import { TokenLogo } from "@/components/token-logo";
import { TokenPicker } from "@/components/token-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateIndex, usePonsTokens } from "@/hooks";
import { slugFromSymbol } from "@/lib/indexpad/format";
import { validateCreateIndex } from "@/lib/indexpad/validate";
import { cn } from "@/lib/utils";
import type { PonsToken } from "@/types";
import { ReviewStats } from "./stats";
import { CreateSuccess } from "./success";
import {
  STEP_LABEL,
  WIZARD_STEPS,
  exampleDraftRows,
  isDraftRow,
  type CreatedView,
  type DraftComponent,
  type WizardStep,
} from "./types";

const DEFAULT_WEIGHTS = [40, 30, 20, 10];

function seedWeights(count: number): number[] {
  if (count <= 0) return [];
  if (count === DEFAULT_WEIGHTS.length) return [...DEFAULT_WEIGHTS];
  const even = Math.floor(10000 / count);
  const weights = Array.from({ length: count }, () => even);
  weights[weights.length - 1] = 10000 - even * (count - 1);
  return weights.map((bps) => bps / 100);
}

function toDraft(token: PonsToken, weightPct: number): DraftComponent {
  return {
    id: token.address.toLowerCase(),
    symbol: token.symbol.replace(/^\$/, "").toUpperCase(),
    name: token.name,
    logo: token.logo,
    priceQuote: token.priceQuote,
    tokenAddress: token.address,
    weightPct,
  };
}

function tickerValue(raw: string): string {
  return raw.replace(/^\$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

export function IndexBuilder({
  initialTokens = [],
  initialError = null,
}: {
  initialTokens?: PonsToken[];
  initialError?: string | null;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const catalog = usePonsTokens();
  const create = useCreateIndex();
  const tokens = catalog.data?.ok ? catalog.data.data : initialTokens;
  const catalogError =
    catalog.data && !catalog.data.ok
      ? catalog.data.message
      : catalog.error
        ? catalog.error.message
        : initialError;
  const catalogLoading = catalog.isLoading && tokens.length === 0;
  const [name, setName] = useState("Pons Intelligence Index");
  const [ticker, setTicker] = useState("PINT");
  const [rows, setRows] = useState<DraftComponent[]>(() => {
    const seed = initialTokens.slice(0, 4);
    const weights = seedWeights(seed.length);
    return seed.map((token, i) => toDraft(token, weights[i] ?? 0));
  });
  const [step, setStep] = useState<WizardStep>("tokens");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; ticker?: string; weights?: string }>(
    {},
  );
  const [created, setCreated] = useState<CreatedView | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  useEffect(() => {
    const result = catalog.data;
    if (!result) return;
    if (result.ok && result.data.length > 0) {
      setRows((current) => {
        if (current.length > 0 && !current.every(isDraftRow)) return current;
        const seed = result.data.slice(0, 4);
        const weights = seedWeights(seed.length);
        return seed.map((token, i) => toDraft(token, weights[i] ?? 0));
      });
      return;
    }
    if (result.ok && result.data.length === 0) {
      setRows((current) => (current.length > 0 ? current : exampleDraftRows()));
    }
  }, [catalog.data]);

  const sum = weightSum(rows);
  const previewSlug = slugFromSymbol(ticker) || "pint";

  const input = useMemo(
    () => ({
      name: name.trim(),
      symbol: tickerValue(ticker),
      description: `${name.trim()} weighted basket`,
      components: (() => {
        const bps = rows.map((row) => Math.max(0, Math.round(row.weightPct * 100)));
        if (bps.length > 0) {
          const total = bps.reduce((acc, n) => acc + n, 0);
          bps[bps.length - 1] = (bps[bps.length - 1] ?? 0) + (10_000 - total);
        }
        return rows.map((row, i) => ({
          symbol: row.symbol,
          weightBps: bps[i] ?? 0,
          tokenAddress: row.tokenAddress,
        }));
      })(),
    }),
    [name, rows, ticker],
  );

  function validateLocal(): boolean {
    const next: typeof fieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!/^[A-Za-z0-9]{2,11}$/.test(tickerValue(ticker))) {
      next.ticker = "Ticker must be 2–11 letters or digits";
    }
    if (rows.length < 1) next.weights = "Add at least one token";
    else if (Math.abs(sum - 100) >= 0.05) next.weights = "Weights must sum to 100%";
    setFieldErrors(next);
    const adapter = validateCreateIndex(input);
    if (Object.keys(next).length || adapter) {
      setFormError(adapter ?? Object.values(next)[0] ?? "Check the form");
      return false;
    }
    setFormError(null);
    return true;
  }

  function toggleToken(token: PonsToken) {
    setRows((current) => {
      const id = token.address.toLowerCase();
      if (current.some((row) => row.id === id)) {
        const next = current.filter((row) => row.id !== id);
        return next;
      }
      const next = [...current, toDraft(token, 0)];
      const weights = seedWeights(next.length);
      return next.map((row, i) => ({ ...row, weightPct: weights[i] ?? 0 }));
    });
  }

  function setWeight(id: string, weightPct: number) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, weightPct: Math.max(0, weightPct) } : row)),
    );
  }

  function balance() {
    setRows((current) => {
      const weights = seedWeights(current.length);
      return current.map((row, i) => ({ ...row, weightPct: weights[i] ?? 0 }));
    });
  }

  function addDraft(symbol: string) {
    setRows((current) => {
      const id = `draft-${symbol.toLowerCase()}`;
      if (current.some((row) => row.symbol === symbol || row.id === id)) return current;
      const next: DraftComponent[] = [
        ...current,
        {
          id,
          symbol,
          name: symbol,
          logo: "",
          priceQuote: null,
          tokenAddress: null,
          weightPct: 0,
        },
      ];
      const weights = seedWeights(next.length);
      return next.map((row, i) => ({ ...row, weightPct: weights[i] ?? 0 }));
    });
  }

  async function onCreate() {
    if (!validateLocal()) return;
    if (!isConnected || !address) {
      setNeedsConnect(true);
      setFormError("Connect your wallet to create an index.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const result = await create.mutateAsync({
        ...input,
        creator: address,
        logos: Object.fromEntries(rows.map((row) => [row.symbol, row.logo])),
      });
      if (!result.ok) {
        if (result.code === "rejected") setNeedsConnect(true);
        setFormError(result.message);
        return;
      }
      setCreated({
        name: result.data.name,
        symbol: result.data.symbol,
        slug: slugFromSymbol(result.data.symbol) || result.data.id,
        components: rows,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Index create failed");
    } finally {
      setBusy(false);
    }
  }

  function connectWallet() {
    const connector = connectors[0];
    if (connector) connect({ connector });
  }

  function go(next: WizardStep) {
    setStep(next);
  }

  function back() {
    const i = WIZARD_STEPS.indexOf(step);
    if (i <= 0) return;
    const prev = WIZARD_STEPS[i - 1];
    if (prev) setStep(prev);
  }

  function next() {
    if (step === "tokens" && rows.length < 1) {
      setFormError("Add at least one token");
      return;
    }
    if (step === "composition" && Math.abs(sum - 100) >= 0.05) {
      setFormError("Weights must sum to 100%");
      return;
    }
    if (step === "details" && !validateLocal()) return;
    const i = WIZARD_STEPS.indexOf(step);
    const upcoming = WIZARD_STEPS[i + 1];
    if (upcoming) {
      setFormError(null);
      setStep(upcoming);
    }
  }

  if (created) {
    return <CreateSuccess created={created} />;
  }

  const details = (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Listing</p>
        <h2 className="font-serif text-xl text-ivory">Index details</h2>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="index-name">Name</Label>
        <Input
          id="index-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? <p className="text-xs text-danger">{fieldErrors.name}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="index-ticker">Ticker</Label>
        <Input
          id="index-ticker"
          value={ticker ? `$${ticker}` : ""}
          onChange={(event) => setTicker(tickerValue(event.target.value))}
          aria-invalid={Boolean(fieldErrors.ticker)}
        />
        {fieldErrors.ticker ? <p className="text-xs text-danger">{fieldErrors.ticker}</p> : null}
      </div>
    </section>
  );

  const review = (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Term sheet</p>
        <h2 className="font-serif text-xl text-ivory">
          {name || "Untitled"}{" "}
          <span className="font-mono text-brass">${ticker || "—"}</span>
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          {rows.map((row) => `$${row.symbol} ${row.weightPct}%`).join(" · ") ||
            "$AAA 40% · $BBB 30% · $CCC 20% · $DDD 10%"}
        </p>
      </div>
      <div className="flex items-center gap-2 md:hidden">
        {rows.map((row) => (
          <TokenLogo
            key={row.id}
            symbol={row.symbol}
            logo={row.logo}
            layoutId={`logo-${row.id}`}
            size={36}
          />
        ))}
      </div>
      <ReviewStats rows={rows} wallet={address ?? null} />
      {needsConnect && !isConnected ? (
        <div className="rounded-sm border border-brass/40 bg-brass/10 px-4 py-3">
          <p className="text-sm text-ivory">Connect a wallet to file this index. No silent success.</p>
          <Button className="mt-3" variant="brass" disabled={connecting} onClick={connectWallet}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </Button>
        </div>
      ) : null}
      {formError ? <p className="text-sm text-danger">{formError}</p> : null}
    </section>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-28 pt-6 md:pb-10">
      <header className="mb-6 flex items-end justify-between border-b border-line pb-4">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-brass">INDEXPAD · CREATE</p>
          <h1 className="mt-1 font-serif text-3xl text-ivory">New index listing</h1>
        </div>
        <p className="hidden font-mono text-xs text-muted md:block">/{previewSlug}</p>
      </header>

      <nav className="mb-5 flex gap-2 md:hidden" aria-label="Create steps">
        {WIZARD_STEPS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => go(item)}
            className={cn(
              "flex-1 border-b py-2 text-[10px] uppercase tracking-[0.14em]",
              step === item ? "border-brass text-brass" : "border-line text-muted",
            )}
          >
            {STEP_LABEL[item]}
          </button>
        ))}
      </nav>

      <div className="hidden min-h-0 flex-1 gap-6 md:grid md:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-8">
          <TokenPicker
            tokens={tokens}
            selected={rows}
            loading={catalogLoading}
            error={catalogError}
            onRetry={() => void catalog.refetch()}
            onToggle={toggleToken}
            onAddDraft={addDraft}
            onUseExample={() => setRows(exampleDraftRows())}
          />
          <Composition rows={rows} onWeight={setWeight} onRemove={(id) => setRows((r) => r.filter((row) => row.id !== id))} onBalance={balance} />
        </div>
        <div className="flex flex-col gap-8">
          {details}
          {review}
          <div className="mt-auto flex gap-3">
            <Link
              href="/"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-sm border border-line text-sm text-ivory hover:bg-surface-2"
            >
              Back
            </Link>
            <Button className="h-12 flex-[1.4]" variant="brass" disabled={busy} onClick={() => void onCreate()}>
              {busy ? "Creating…" : "Create Index"}
            </Button>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {step === "tokens" ? (
              <TokenPicker
                tokens={tokens}
                selected={rows}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => void catalog.refetch()}
                onToggle={toggleToken}
                onAddDraft={addDraft}
                onUseExample={() => setRows(exampleDraftRows())}
              />
            ) : null}
            {step === "composition" ? (
              <Composition
                rows={rows}
                onWeight={setWeight}
                onRemove={(id) => setRows((r) => r.filter((row) => row.id !== id))}
                onBalance={balance}
              />
            ) : null}
            {step === "details" ? details : null}
            {step === "review" ? review : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-desk/95 px-4 py-3 backdrop-blur-md md:hidden">
        {formError && step !== "review" ? (
          <p className="mx-auto mb-2 max-w-6xl text-xs text-danger">{formError}</p>
        ) : null}
        <div className="mx-auto flex max-w-6xl gap-3">
          {step === "tokens" ? (
            <Link
              href="/"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-sm border border-line text-sm text-ivory"
            >
              Back
            </Link>
          ) : (
            <Button className="h-12 flex-1" variant="outline" onClick={back}>
              Back
            </Button>
          )}
          {step === "review" ? (
            <Button className="h-12 flex-[1.4]" variant="brass" disabled={busy} onClick={() => void onCreate()}>
              {busy ? "Creating…" : "Create Index"}
            </Button>
          ) : (
            <Button className="h-12 flex-[1.4]" variant="brass" onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
