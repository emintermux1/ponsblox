"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { isAddress, type Address } from "viem";
import { useAccount, useConnect, useSwitchChain, useWalletClient } from "wagmi";
import { BackedBy } from "@/components/launch/backed-by";
import { LaunchSuccess } from "@/components/launch/launch-success";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { useBackedIndex } from "@/hooks/use-backed-index";
import { useFactoryStatus } from "@/hooks/use-factory-status";
import { robinhood } from "@/lib/chain";
import { checkLogo, validateLaunchDraft } from "@/lib/pons/factory";
import { launchIndexCoin } from "@/lib/pons/launch";
import { cn } from "@/lib/utils";
import type { IndexLaunch, LaunchIndexCoinInput } from "@/types";

type Props = {
  indexKey: string | null;
};

function fieldError(input: LaunchIndexCoinInput, maxTax: number): string | null {
  const base = validateLaunchDraft(input);
  if (base) return base;
  if (!input.description.trim()) return "Description is required";
  if (!input.logo.trim()) return "Image is required";
  const logoErr = checkLogo(input.logo);
  if (logoErr) return logoErr;
  if (input.creatorTaxBps !== undefined && (input.creatorTaxBps < 0 || input.creatorTaxBps > maxTax)) {
    return `Creator tax must be 0–${maxTax / 100}%`;
  }
  return null;
}

async function uploadImage(file: File): Promise<string> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/ipfs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      data,
    }),
  });
  const body = (await res.json()) as { gateway?: string; error?: string };
  if (!res.ok || !body.gateway) {
    throw new Error(body.error || "Image upload is not configured. Paste an https:// or ipfs:// link.");
  }
  return body.gateway;
}

export function LaunchCoinFlow({ indexKey }: Props) {
  const backed = useBackedIndex(indexKey);
  const factory = useFactoryStatus();
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { switchChain } = useSwitchChain();
  const { data: wallet } = useWalletClient();
  const onRightChain = chainId === robinhood.id;

  const index = backed.data ?? null;
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [quoteIn, setQuoteIn] = useState("");
  const [taxBps, setTaxBps] = useState(100);
  const [buyback, setBuyback] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<IndexLaunch | null>(null);

  useEffect(() => {
    if (!index) return;
    setName((cur) => cur || index.name);
    setSymbol((cur) => cur || index.ticker);
    setDescription((cur) => cur || index.description || `Index market for ${index.name} ($${index.ticker}).`);
    if (typeof window !== "undefined") {
      setWebsite((cur) => cur || `${window.location.origin}/index/${index.slug}`);
    }
  }, [index]);

  useEffect(() => {
    if (address) setRecipient((cur) => cur || address);
  }, [address]);

  const maxTax = factory.data?.maxCreatorTaxBps ?? 1000;
  const draft: LaunchIndexCoinInput = useMemo(
    () => ({
      indexId: index?.id,
      name,
      symbol: symbol.replace(/^\$/, ""),
      logo,
      description,
      quoteIn,
      recipient: (recipient || address || "") as Address,
      website,
      twitter,
      telegram,
      creatorTaxBps: taxBps,
      buybackEnabled: buyback,
    }),
    [index?.id, name, symbol, logo, description, quoteIn, recipient, address, website, twitter, telegram, taxBps, buyback],
  );

  const invalid = fieldError(draft, maxTax);

  function reset() {
    setDone(null);
    setErr(null);
  }

  async function onImage(file: File | null) {
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setLogo(url);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onLaunch() {
    setErr(null);
    if (!isConnected) {
      const connector = connectors[0];
      if (connector) connect({ connector });
      return;
    }
    if (!onRightChain) {
      switchChain({ chainId: robinhood.id });
      return;
    }
    if (invalid) {
      setErr(invalid);
      return;
    }
    if (!wallet || !address) {
      setErr("Connect a wallet to launch this index coin.");
      return;
    }
    if (!isAddress(draft.recipient)) {
      setErr("Creator fee recipient must be a valid address.");
      return;
    }
    setBusy(true);
    try {
      const result = await launchIndexCoin(wallet, address, draft);
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      if (!result.data.tokenAddress) {
        setErr("Launch confirmed without a token address. Nothing invented.");
        return;
      }
      setDone(result.data);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  const cta = (() => {
    if (busy) return "Launching…";
    if (!isConnected) return connecting ? "Connecting…" : "Connect wallet";
    if (!onRightChain) return "Switch to Robinhood Chain";
    if (factory.data && !factory.data.launchEnabled) return "Pons launches are paused";
    if (invalid) return "Launch Coin";
    const fee = factory.data?.launchFeeEth;
    return fee ? `Launch Coin · ${Number(fee).toString()} ETH` : "Launch Coin";
  })();

  const ctaDisabled =
    busy ||
    uploading ||
    (isConnected && onRightChain && (Boolean(invalid) || factory.data?.launchEnabled === false));

  if (!indexKey) {
    return (
      <EmptyFrame
        title="Pick an index first"
        body="Launch needs to know which index backs the coin. Open an index, then tap Launch Coin."
        href="/explore"
        label="Explore indexes"
      />
    );
  }

  if (backed.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#c8c2b0]">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading the backing index…
      </div>
    );
  }

  if (backed.isError) {
    return (
      <EmptyFrame
        title="Could not load this index"
        body={backed.error instanceof Error ? backed.error.message : "The index adapter failed."}
        href="/explore"
        label="Back to explore"
      />
    );
  }

  if (!index) {
    return (
      <EmptyFrame
        title="Index not found"
        body={`No created index matches “${indexKey}”. Create one, then launch a coin against it.`}
        href="/create"
        label="Create index"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 lg:pb-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/index/${index.slug}`}
          className="inline-flex items-center gap-2 text-sm text-[#c8c2b0] hover:text-[#f6f2e8]"
        >
          <ArrowLeft className="size-4" />
          Back to {index.name}
        </Link>
        <ConnectWallet />
      </div>

      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d8ff4a]">Launch coin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f7f3e8] sm:text-4xl">
          Launch a market for this index
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#c8c2b0]">
          Pons TokenParams only — name, ticker, image, description, socials, creator tax, buyback, and an optional first buy.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {done?.tokenAddress ? (
          <LaunchSuccess launch={done} indexSlug={index.slug} onReset={reset} />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
          >
            <form
              className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void onLaunch();
              }}
            >
              <Field label="Coin name" error={!name.trim() ? "Required" : null}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={index.name}
                  className="ip-input"
                  required
                />
              </Field>
              <Field label="Ticker" error={!/^[A-Za-z0-9]{2,11}$/.test(symbol.replace(/^\$/, "")) ? "2–11 letters or digits" : null}>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder={index.ticker}
                  className="ip-input uppercase"
                  required
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="ip-input min-h-28"
                  required
                />
              </Field>
              <Field label="Image" error={logo ? checkLogo(logo) : "https:// or ipfs:// required"}>
                <input
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https:// or ipfs://"
                  className="ip-input"
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-[#c8c2b0]">
                  <ImagePlus className="size-4" />
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => void onImage(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Field>

              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                className="text-sm text-[#d8ff4a] underline-offset-4 hover:underline"
              >
                {advanced ? "Hide" : "Show"} Pons parameters
              </button>

              {advanced ? (
                <div className="space-y-4 rounded-xl border border-white/8 bg-black/20 p-4">
                  <Field label="Website">
                    <input value={website} onChange={(e) => setWebsite(e.target.value)} className="ip-input" />
                  </Field>
                  <Field label="Twitter / X">
                    <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="ip-input" placeholder="https://x.com/…" />
                  </Field>
                  <Field label="Telegram">
                    <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className="ip-input" />
                  </Field>
                  <Field label={`Creator tax (max ${maxTax / 100}%)`}>
                    <input
                      type="number"
                      min={0}
                      max={maxTax}
                      value={taxBps}
                      onChange={(e) => setTaxBps(Number(e.target.value))}
                      className="ip-input"
                    />
                    <p className="mt-1 text-xs text-[#c8c2b0]/70">{(taxBps / 100).toFixed(2)}% · sent as creatorTaxBps</p>
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-[#e8e2d2]">
                    <input type="checkbox" checked={buyback} onChange={(e) => setBuyback(e.target.checked)} />
                    Buyback enabled
                  </label>
                  <Field label="First buy (ETH, optional)">
                    <input value={quoteIn} onChange={(e) => setQuoteIn(e.target.value)} className="ip-input" placeholder="0" />
                  </Field>
                  <Field label="Creator fee recipient">
                    <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="ip-input font-mono text-sm" />
                  </Field>
                </div>
              ) : null}

              {err ? (
                <p className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {err}
                </p>
              ) : null}

              {factory.isError ? (
                <p className="text-sm text-amber-200">
                  Factory status unread: {factory.error instanceof Error ? factory.error.message : "RPC error"}. Launch will still try the chain call.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={ctaDisabled}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
                  ctaDisabled
                    ? "cursor-not-allowed bg-white/8 text-[#c8c2b0]"
                    : "bg-[#d8ff4a] text-[#11120c] hover:bg-[#e4ff78]",
                )}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {cta}
              </button>
            </form>

            <BackedBy index={index} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[#c8c2b0]/80">
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

function EmptyFrame({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-[#f6f2e8]">{title}</h1>
      <p className="mt-2 text-sm text-[#c8c2b0]">{body}</p>
      <Link
        href={href}
        className="mt-6 rounded-xl bg-[#d8ff4a] px-4 py-2.5 text-sm font-semibold text-[#11120c]"
      >
        {label}
      </Link>
    </div>
  );
}
