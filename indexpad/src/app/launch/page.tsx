"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectWallet } from "@/components/wallet";
import { useLaunchIndexCoin } from "@/hooks";
import { PONS_DOCS_URL } from "@/lib/pons";
import { slugFromSymbol } from "@/lib/indexpad/format";
import { writeLocalLaunch } from "@/lib/indexpad/store";

function LaunchForm() {
  const params = useSearchParams();
  const preset = params.get("index") ?? "";
  const { address } = useAccount();
  const launch = useLaunchIndexCoin();
  const [name, setName] = useState("Pons Intelligence Index");
  const [symbol, setSymbol] = useState(preset ? preset.toUpperCase() : "PINT");
  const [logo, setLogo] = useState("");
  const [quoteIn, setQuoteIn] = useState("0");
  const [note, setNote] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  const ready = useMemo(
    () => Boolean(address && name.trim() && /^[A-Za-z0-9]{2,11}$/.test(symbol.trim())),
    [address, name, symbol],
  );

  async function submit() {
    setNote(null);
    setTx(null);
    if (!address) {
      setNote("Connect a wallet on Robinhood Chain first.");
      return;
    }
    const result = await launch.mutateAsync({
      indexId: preset || slugFromSymbol(symbol),
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      logo: logo.trim(),
      description: "",
      quoteIn: quoteIn.trim() || "0",
      recipient: address,
    });
    if (!result.ok) {
      setNote(result.message);
      return;
    }
    setTx(result.data.txHash);
    writeLocalLaunch(address, {
      id: result.data.tokenAddress || result.data.txHash || symbol,
      indexId: preset || slugFromSymbol(symbol),
      indexSlug: slugFromSymbol(symbol),
      name,
      ticker: symbol.toUpperCase(),
      tokenAddress: result.data.tokenAddress || "",
      launcher: address,
      createdAt: Date.now(),
      txHash: result.data.txHash,
      curveAddress: result.data.curveAddress,
    });
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Launch coin</p>
      <h1 className="mt-2 font-serif text-4xl text-[#f4efe4]">Put the index on Pons</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This submits a real factory launch when your wallet is on Robinhood Chain.
        It does not invent a coin. Docs:{" "}
        <a className="text-accent underline" href={PONS_DOCS_URL} target="_blank" rel="noreferrer">
          ponsfamily.com/v2
        </a>
      </p>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface/80 p-5">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} aria-label="Ticker" />
        <Input
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https logo (Pons requires a public URL)"
          aria-label="Logo URL"
        />
        <Input
          value={quoteIn}
          onChange={(e) => setQuoteIn(e.target.value)}
          placeholder="Initial buy (ETH)"
          aria-label="Initial buy"
        />
        <div className="flex flex-wrap items-center gap-3">
          <ConnectWallet />
          <Button disabled={!ready || launch.isPending} onClick={() => void submit()}>
            {launch.isPending ? "Submitting…" : "Launch Coin"}
          </Button>
        </div>
        {note ? <p className="text-sm text-danger">{note}</p> : null}
        {tx ? (
          <p className="break-all font-mono text-xs text-accent">Submitted {tx}</p>
        ) : null}
      </div>
    </main>
  );
}

export default function LaunchPage() {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-sm text-muted">Loading launch desk…</p>}>
      <LaunchForm />
    </Suspense>
  );
}
