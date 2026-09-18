"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { robinhood, short } from "@/lib/chain";

type ConnectWalletProps = {
  size?: "sm" | "lg";
  className?: string;
};

export function ConnectWallet({ size = "sm", className = "" }: ConnectWalletProps) {
  const { address, chainId, isConnecting } = useAccount();
  const { connectors, connect, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const onRightChain = chainId === robinhood.id;
  const unique = connectors.filter(
    (c, i, all) => all.findIndex((x) => x.id === c.id) === i,
  );
  const busy = isConnecting || isPending;
  const large = size === "lg";

  useEffect(() => {
    if (address) setOpen(false);
  }, [address]);

  if (address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!onRightChain && (
          <button
            type="button"
            className="ip-btn ip-btn-ghost"
            onClick={() => switchChain({ chainId: robinhood.id })}
          >
            Switch to Robinhood
          </button>
        )}
        <button
          type="button"
          className="ip-btn ip-btn-ink"
          onClick={() => disconnect()}
          title="Disconnect"
        >
          {short(address)}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className={large ? "ip-btn ip-btn-accent ip-btn-lg" : "ip-btn ip-btn-accent"}
        disabled={busy}
        onClick={() => {
          if (unique.length <= 1) {
            const connector = unique[0];
            if (connector) connect({ connector });
            return;
          }
          setOpen((v) => !v);
        }}
      >
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[220px] rounded-xl border border-line bg-surface p-1 shadow-lg">
          {unique.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">
              No wallet detected. Install one, then refresh.
            </p>
          )}
          {unique.map((c) => (
            <button
              key={c.uid}
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2"
              onClick={() => connect({ connector: c })}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="absolute right-0 top-full mt-2 max-w-xs text-right text-xs text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}
