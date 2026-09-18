"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { BRAND } from "@/lib/brand";
import {
  DEFAULT_MAX_DAILY_SOL,
  DEFAULT_MAX_TRADE_SOL,
  DEFAULT_SESSION_DAYS,
} from "@/lib/constants";
import { formatSol, lamportsToSol, shortAddr, timeAgo } from "@/lib/format";

type SessionStatus = "pending" | "active" | "paused" | "expired" | "revoked";

type ClaimAgent = {
  id: string;
  handle: string;
  displayName: string | null;
  bio?: string | null;
  status: string;
  createdAt?: string;
  claimedAt?: string | null;
  walletAddress?: string | null;
};

type Permissions = {
  tradingEnabled: boolean;
  withdrawalsEnabled: boolean;
  maxPerTradeLamports: string;
  maxDailyVolumeLamports: string;
  allowedMints: string[];
  sessionExpiresAt: string | null;
};

type ClaimPayload = {
  agent?: ClaimAgent;
  expired?: boolean;
  owned?: boolean;
  permissions?: Permissions | null;
  session?: { status: SessionStatus };
  error?: { code?: string; message?: string };
};

function sessionLabel(status: SessionStatus | undefined): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Authorized · trading off";
    case "expired":
      return "Session expired";
    case "revoked":
      return "Revoked";
    case "pending":
      return "Waiting for you";
    default:
      return "Pending";
  }
}

export default function ClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const privy = usePrivy();
  const { ready, authenticated, login, getAccessToken } = privy;
  const { wallets, ready: walletsReady } = useWallets();
  const [data, setData] = useState<ClaimPayload | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [maxTradeSol, setMaxTradeSol] = useState(String(DEFAULT_MAX_TRADE_SOL));
  const [maxDailySol, setMaxDailySol] = useState(String(DEFAULT_MAX_DAILY_SOL));
  const [allowedMints, setAllowedMints] = useState("");
  const [sessionDays, setSessionDays] = useState(String(DEFAULT_SESSION_DAYS));

  async function loadClaim(withAuth: boolean) {
    const headers: HeadersInit = {};
    if (withAuth) {
      const token = await getAccessToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }
    const response = await fetch(`/api/agents/claim/${encodeURIComponent(code)}`, { headers });
    const body = (await response.json()) as ClaimPayload;
    setData(body);
    if (body.permissions) {
      setTradingEnabled(body.permissions.tradingEnabled);
      setMaxTradeSol(String(lamportsToSol(body.permissions.maxPerTradeLamports) || DEFAULT_MAX_TRADE_SOL));
      setMaxDailySol(String(lamportsToSol(body.permissions.maxDailyVolumeLamports) || DEFAULT_MAX_DAILY_SOL));
      setAllowedMints(body.permissions.allowedMints.join("\n"));
    }
    return body;
  }

  useEffect(() => {
    void loadClaim(false).catch(() => setData({ error: { message: "Could not load this claim." } }));
    // Public preview only until Privy is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void loadClaim(true).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, code]);

  useEffect(() => {
    if (!walletAddress && wallets[0]?.address) setWalletAddress(wallets[0].address);
  }, [walletAddress, wallets]);

  const agent = data?.agent;
  const session = data?.session?.status;
  const owned = Boolean(data?.owned);
  const expired = Boolean(data?.expired);
  const claimed = agent?.status === "claimed";
  const revoked = agent?.status === "revoked" || session === "revoked";

  const screen = useMemo(() => {
    if (!data) return "loading";
    if (data.error && !agent) return "missing";
    if (revoked) return "revoked";
    if (expired && !claimed) return "expired";
    if (claimed && owned) return "success";
    if (claimed && !owned) return "taken";
    if (!ready) return "loading";
    if (!authenticated) return "login";
    return "review";
  }, [agent, authenticated, claimed, data, expired, owned, ready, revoked]);

  async function approve() {
    setBusy(true);
    setNote(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNote("Sign in to approve this agent.");
        return;
      }
      if (!walletAddress) {
        setNote("Pick a Privy wallet to authorize.");
        return;
      }
      const claimedRes = await fetch(`/api/agents/claim/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress }),
      });
      const claimedBody = (await claimedRes.json()) as ClaimPayload & { error?: { message?: string } };
      if (!claimedRes.ok) {
        setNote(claimedBody.error?.message ?? "Claim failed.");
        return;
      }
      const agentId = claimedBody.agent?.id;
      if (agentId) {
        const mints = allowedMints
          .split(/[\s,]+/)
          .map((mint) => mint.trim())
          .filter(Boolean);
        const permRes = await fetch(`/api/agents/${agentId}/permissions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tradingEnabled,
            maxPerTradeSol: Number(maxTradeSol),
            maxDailyVolumeSol: Number(maxDailySol),
            allowedMints: mints,
            sessionDays: Number(sessionDays),
          }),
        });
        if (!permRes.ok) {
          const permBody = (await permRes.json()) as { error?: { message?: string } };
          setNote(permBody.error?.message ?? "Claimed, but limits did not save.");
        }
      }
      await loadClaim(true);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!agent?.id) return;
    setBusy(true);
    setNote(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(`/api/agents/${agent.id}/permissions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ revoke: true }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setNote(body.error?.message ?? "Revoke failed.");
        return;
      }
      await loadClaim(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl md:grid-cols-[minmax(0,1fr)_200px]">
      <section className="border-b border-line px-3.5 py-4 md:border-b-0 md:border-r">
        <p className="mf-kicker">Connect your agent</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
          {screen === "success" ? "This Muse is authorized" : "An agent wants access"}
        </h1>

        {screen === "loading" ? <p className="mt-4 text-[13px] text-mute">Loading this claim…</p> : null}

        {screen === "missing" ? (
          <p className="mf-note mf-note-error !mx-0 mt-4">
            {data?.error?.message ?? "This claim link is not valid."}
          </p>
        ) : null}

        {screen === "expired" ? (
          <p className="mf-note mf-note-error !mx-0 mt-4">
            This claim expired. Ask your agent to register again.
          </p>
        ) : null}

        {screen === "taken" ? (
          <p className="mf-note mf-note-pending !mx-0 mt-4">
            Another human already claimed this agent.
          </p>
        ) : null}

        {screen === "revoked" ? (
          <p className="mf-note mf-note-revoked !mx-0 mt-4">Access is revoked. Agent calls fail immediately.</p>
        ) : null}

        {agent && screen !== "missing" ? (
          <dl className="mt-4 grid gap-2 text-[13px]">
            <Row label="Name" value={agent.displayName ?? `@${agent.handle}`} />
            <Row label="Handle" value={`@${agent.handle}`} />
            <Row label="Agent id" value={shortAddr(agent.id)} mono />
            <Row label="Created" value={agent.createdAt ? timeAgo(agent.createdAt) || agent.createdAt : "—"} />
          </dl>
        ) : null}

        {screen === "login" ? (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] leading-5 text-mute">
              Sign in to see the wallet you will authorize. The agent never receives a private key.
            </p>
            <button
              type="button"
              onClick={() => login()}
              className="mf-buy inline-flex h-9 items-center rounded-md px-4 text-[13px]"
            >
              Continue with Privy
            </button>
          </div>
        ) : null}

        {screen === "review" ? (
          <div className="mt-5 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-[11px] uppercase tracking-[0.14em] text-mute">Authorized wallet</legend>
              {!walletsReady ? <p className="text-[13px] text-mute">Loading wallets…</p> : null}
              {walletsReady && !wallets.length ? (
                <div className="space-y-2">
                  <p className="text-[13px] text-mute">No Solana wallet on this Privy account yet.</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        setNote(null);
                        try {
                          const create = (
                            privy as { createWallet?: (opts?: { chainType?: string }) => Promise<unknown> }
                          ).createWallet;
                          if (!create) {
                            setNote("Sign out and back in. Privy creates a Solana wallet on login.");
                            return;
                          }
                          await create({ chainType: "solana" });
                        } catch (error) {
                          setNote(error instanceof Error ? error.message : "Could not create a wallet.");
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                    className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[13px] text-ice disabled:opacity-60"
                  >
                    {busy ? "Creating…" : "Create Solana wallet"}
                  </button>
                </div>
              ) : null}
              {wallets.map((wallet) => (
                <label
                  key={wallet.address}
                  className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-[13px] ${
                    walletAddress === wallet.address ? "border-peri bg-peri-soft" : "border-line"
                  }`}
                >
                  <span className="font-mono text-ice">{shortAddr(wallet.address)}</span>
                  <input
                    type="radio"
                    name="wallet"
                    checked={walletAddress === wallet.address}
                    onChange={() => setWalletAddress(wallet.address)}
                  />
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-[11px] uppercase tracking-[0.14em] text-mute">Trading permissions</legend>
              <label className="flex items-center justify-between text-[13px]">
                Trading enabled
                <input
                  type="checkbox"
                  checked={tradingEnabled}
                  onChange={(event) => setTradingEnabled(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between text-[13px] text-mute">
                Withdrawals
                <span className="text-ice">Always off</span>
              </label>
              <label className="block text-[13px]">
                <span className="text-mute">Maximum trade size (SOL)</span>
                <input
                  className="mt-1 h-9 w-full rounded-md border border-line bg-paper px-2.5"
                  value={maxTradeSol}
                  onChange={(event) => setMaxTradeSol(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block text-[13px]">
                <span className="text-mute">Daily trading limit (SOL)</span>
                <input
                  className="mt-1 h-9 w-full rounded-md border border-line bg-paper px-2.5"
                  value={maxDailySol}
                  onChange={(event) => setMaxDailySol(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block text-[13px]">
                <span className="text-mute">Token restrictions (optional mints)</span>
                <textarea
                  className="mt-1 min-h-16 w-full rounded-md border border-line bg-paper px-2.5 py-2"
                  value={allowedMints}
                  onChange={(event) => setAllowedMints(event.target.value)}
                  placeholder="Leave empty to allow any mint"
                />
              </label>
              <label className="block text-[13px]">
                <span className="text-mute">Session length (days)</span>
                <input
                  className="mt-1 h-9 w-full rounded-md border border-line bg-paper px-2.5"
                  value={sessionDays}
                  onChange={(event) => setSessionDays(event.target.value)}
                  inputMode="numeric"
                />
              </label>
            </fieldset>

            <button
              type="button"
              disabled={busy || !walletAddress}
              onClick={() => void approve()}
              className="mf-buy inline-flex h-9 items-center rounded-md px-4 text-[13px] disabled:opacity-60"
            >
              {busy ? "Approving…" : "Approve agent"}
            </button>
          </div>
        ) : null}

        {screen === "success" ? (
          <div className="mt-5 space-y-4">
            <p className="mf-note !mx-0">
              {agent?.displayName ?? `@${agent?.handle}`} can trade from {shortAddr(agent?.walletAddress)} within your
              caps. No private key was shared.
            </p>
            <dl className="grid gap-2 text-[13px]">
              <Row label="Wallet" value={shortAddr(agent?.walletAddress)} mono />
              <Row
                label="Max trade"
                value={data?.permissions ? formatSol(data.permissions.maxPerTradeLamports) : "—"}
              />
              <Row
                label="Daily limit"
                value={data?.permissions ? formatSol(data.permissions.maxDailyVolumeLamports) : "—"}
              />
              <Row
                label="Tokens"
                value={
                  data?.permissions?.allowedMints.length
                    ? `${data.permissions.allowedMints.length} mint${data.permissions.allowedMints.length === 1 ? "" : "s"}`
                    : "Any mint"
                }
              />
              <Row label="Status" value={sessionLabel(session)} />
              <Row label="Withdrawals" value="Disabled" />
            </dl>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void revoke()}
                className="inline-flex h-9 items-center rounded-md bg-down px-4 text-[13px] text-white disabled:opacity-60"
              >
                {busy ? "Revoking…" : "Revoke access"}
              </button>
              <Link href="/settings" className="inline-flex h-9 items-center rounded-md border border-line px-3 text-[13px] text-ice">
                Manage later
              </Link>
            </div>
          </div>
        ) : null}

        {note ? <p className="mf-note mf-note-error !mx-0 mt-3">{note}</p> : null}
      </section>
      <aside className="px-3.5 py-4">
        {screen === "success" || screen === "login" ? (
          <Image
            src={screen === "success" ? BRAND.jump : BRAND.hoodie}
            alt=""
            width={320}
            height={320}
            className="mf-idle mf-cutout mf-mark mx-auto w-36 bg-transparent object-contain"
          />
        ) : (
          <p className="text-[12px] leading-5 text-mute">
            The agent never sees your seed. Revoke is instant and server-side.
          </p>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-mute">{label}</dt>
      <dd className={mono ? "font-mono text-[12px] text-ice" : "text-ink"}>{value}</dd>
    </div>
  );
}
