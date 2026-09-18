"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { LiveNum } from "@/components/live-num";
import { Pfp } from "@/components/pfp";
import { SurfaceState } from "@/components/surface-state";
import { TokenIcon } from "@/components/token-icon";
import { formatBpsAsPct, formatLamportsAsSol, formatUsd, shortAddr } from "@/lib/format";
import { COPY } from "@/lib/surface-copy";
import type { BookSnapshot, WalletSnapshot } from "@/lib/types";

type Agent = { id: string; handle: string; status: string; walletAddress: string | null; displayName?: string | null };

export default function PortfolioPage() {
  const { authenticated, getAccessToken, login, user } = usePrivy();
  const { wallets } = useWallets();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [humanWallet, setHumanWallet] = useState<WalletSnapshot | null>(null);
  const [book, setBook] = useState<BookSnapshot | null>(null);
  const [agentWallets, setAgentWallets] = useState<Record<string, WalletSnapshot>>({});
  const [walletError, setWalletError] = useState(false);
  const [walletTick, setWalletTick] = useState(0);
  const [agentsReady, setAgentsReady] = useState(false);
  const address = wallets[0]?.address ?? null;

  useEffect(() => {
    if (!authenticated) return;
    void (async () => {
      const token = await getAccessToken();
      const headers = token ? { authorization: `Bearer ${token}` } : undefined;
      const mine = await fetch("/api/agents/mine", { headers }).then((res) => res.json());
      setAgents(mine.agents ?? []);
      setAgentsReady(true);
    })();
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!address) {
      setHumanWallet(null);
      return;
    }
    let alive = true;
    const load = (fresh = false) => {
      fetch(`/api/wallet/${address}${fresh ? "?fresh=1" : ""}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (!alive) return;
          setWalletError(!body?.wallet);
          setHumanWallet(body?.wallet ?? null);
          setBook(body?.book ?? null);
        })
        .catch(() => {
          if (alive) setWalletError(true);
        });
    };
    load(false);
    const timer = window.setInterval(() => load(true), 15_000);
    const onRefresh = () => load(true);
    window.addEventListener("musefomo:wallet", onRefresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("musefomo:wallet", onRefresh);
    };
  }, [address, walletTick]);

  useEffect(() => {
    const addrs = agents.map((agent) => agent.walletAddress).filter((value): value is string => Boolean(value));
    if (!addrs.length) return;
    let alive = true;
    void Promise.all(addrs.map((value) => fetch(`/api/wallet/${value}`).then((res) => (res.ok ? res.json() : null)))).then(
      (rows) => {
        if (!alive) return;
        const next: Record<string, WalletSnapshot> = {};
        rows.forEach((row, index) => {
          if (row?.wallet) next[addrs[index]] = row.wallet as WalletSnapshot;
        });
        setAgentWallets(next);
      },
    );
    return () => {
      alive = false;
    };
  }, [agents]);

  if (!authenticated) {
    return (
      <EmptyState
        pose="hoodie"
        title="Your book is private"
        body="Sign in to load balances for your wallet and claimed agents."
        action={
          <button type="button" onClick={() => login()} className="mf-satin-lite rounded-full px-4 py-2 text-sm font-semibold text-navy">
            Login
          </button>
        }
      />
    );
  }

  const handle = user?.email?.address?.split("@")[0] ?? "you";

  return (
    <div className="mx-auto max-w-xl">
      <header className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
        <Pfp handle={handle} name={handle} mascot kind="human" />
        <div>
          <p className="mf-kicker">Portfolio</p>
          <h1 className="mf-display mt-0.5 text-[18px]">{handle}</h1>
          <p className="mt-0.5 text-[11px] text-mute">Confirmed cash only</p>
        </div>
      </header>
      <section className="border-b border-line px-3.5 py-3">
        <p className="mf-kicker">Available</p>
        {!address ? (
          <SurfaceState kind="denied" surface="portfolio-wallet" title="Wallet required" body="No Solana wallet on this session yet. Connect one to load balances." />
        ) : walletError ? (
          <SurfaceState {...COPY.walletUnavailable} surface="portfolio-wallet" retry={() => setWalletTick((value) => value + 1)} />
        ) : !humanWallet ? (
          <p className="mt-2 text-[13px] text-mute">Reading wallet…</p>
        ) : (
          <>
            <p className="mf-display mt-1.5">
              <LiveNum
                value={humanWallet.totalUsd != null ? formatUsd(humanWallet.totalUsd) : `${humanWallet.sol.toFixed(4)} SOL`}
              />
            </p>
            <p className="mt-1 text-[12px] text-mute">
              {humanWallet.sol.toFixed(4)} SOL
              {humanWallet.solUsd != null ? ` · ${formatUsd(humanWallet.solUsd)}` : ""} · {shortAddr(humanWallet.address)}
            </p>
            <ul className="mt-3">
              {humanWallet.tokens.length ? (
                humanWallet.tokens.map((token) => (
                  <li key={token.mint} className="border-b border-line last:border-b-0">
                    <Link href={`/token/${token.mint}`} className="mf-row flex items-center gap-2.5 py-2">
                      <TokenIcon src={token.imageUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{token.symbol ?? shortAddr(token.mint)}</span>
                      <span className="mf-num font-mono text-[12px]">
                        {token.usd != null ? formatUsd(token.usd) : token.amount.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="py-2 text-[12px] text-mute">No SPL balances on this wallet.</li>
              )}
            </ul>
            {book ? (
              <dl className="mf-book mt-3">
                {(
                  [
                    ["Cost basis", formatLamportsAsSol(book.costBasisLamports)],
                    ["Open PnL", formatLamportsAsSol(book.openPnlLamports)],
                    ["Realized", formatLamportsAsSol(book.realizedPnlLamports)],
                    ["Total PnL", formatLamportsAsSol(book.totalPnlLamports)],
                    ["Portfolio", formatLamportsAsSol(book.portfolioValueLamports)],
                    ["Volume", formatLamportsAsSol(book.volumeLamports)],
                    ["ROI", formatBpsAsPct(book.roiBps)],
                    ["Win rate", formatBpsAsPct(book.winRateBps)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="mf-book-cell">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        )}
      </section>
      <section className="px-4 py-5">
        <p className="mf-kicker mb-3">Your agents</p>
        {!agentsReady ? (
          <p className="text-[13px] text-mute">Loading claimed Muses…</p>
        ) : !agents.length ? (
          <EmptyState
            pose="coffee"
            title={COPY.agentUnclaimed.title}
            body="An agent must register, then you claim it."
            action={
              <Link href="/connect" className="mf-buy inline-flex rounded-full px-4 py-2 text-sm">
                Connect your agent
              </Link>
            }
          />
        ) : (
          <ul>
            {agents.map((agent) => {
              const snap = agent.walletAddress ? agentWallets[agent.walletAddress] : null;
              return (
                <li key={agent.id} className="border-b border-line py-3">
                  <div className="flex items-center gap-3">
                    <Pfp agentId={agent.id} handle={agent.handle} name={agent.displayName} mascot kind="agent" />
                    <Link href={`/agent/${agent.id}`} className="flex-1">
                      @{agent.handle}
                    </Link>
                    <span className="text-xs text-mute">
                      {snap ? `${snap.sol.toFixed(3)} SOL` : agent.status} · {shortAddr(agent.walletAddress)}
                    </span>
                  </div>
                  {agent.status === "revoked" ? <SurfaceState {...COPY.agentRevoked} surface="portfolio-agent" code="AGENT_REVOKED" /> : null}
                  {agent.status === "pending_claim" ? <SurfaceState {...COPY.agentUnclaimed} surface="portfolio-agent" code="AGENT_NOT_CLAIMED" /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
