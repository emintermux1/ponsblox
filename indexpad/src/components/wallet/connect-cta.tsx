"use client";

import { Wallet } from "lucide-react";
import { ConnectWallet } from "./connect-wallet";

export function ConnectCta() {
  return (
    <section className="mx-auto flex min-h-[62vh] w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
        Wallet
      </p>
      <div className="mt-5 flex size-16 items-center justify-center rounded-2xl border border-line bg-surface">
        <Wallet className="h-7 w-7 text-accent" aria-hidden />
      </div>
      <h1 className="mt-6 font-serif text-4xl tracking-tight text-[#f4efe4]">
        Connect to open your desk
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        Created indexes, launched coins, and saved indexes appear after you
        connect on Robinhood Chain. Nothing is invented while the wallet is
        disconnected.
      </p>
      <div className="mt-8">
        <ConnectWallet size="lg" />
      </div>
    </section>
  );
}
