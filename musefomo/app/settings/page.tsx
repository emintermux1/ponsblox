"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { SurfaceState } from "@/components/surface-state";
import { COPY } from "@/lib/surface-copy";

type Agent = { id: string; handle: string; status: string };
type Permissions = {
  tradingEnabled: boolean;
  withdrawalsEnabled: boolean;
  maxPerTradeLamports: string;
  maxDailyVolumeLamports: string;
  allowedMints: string[];
  sessionExpiresAt: string | null;
};

export default function SettingsPage() {
  const { authenticated, getAccessToken, login } = usePrivy();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [agentsReady, setAgentsReady] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    void (async () => {
      const token = await getAccessToken();
      const mine = await fetch("/api/agents/mine", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      }).then((res) => res.json());
      const list = (mine.agents ?? []) as Agent[];
      setAgents(list);
      setSelected(list[0]?.id ?? null);
      setAgentsReady(true);
    })();
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!selected || !authenticated) return;
    void (async () => {
      const token = await getAccessToken();
      const body = await fetch(`/api/agents/${selected}/permissions`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      }).then((res) => res.json());
      setPermissions(body.permissions ?? null);
    })();
  }, [authenticated, getAccessToken, selected]);

  async function save(patch: Partial<Permissions> & { revoke?: boolean }) {
    if (!selected) return;
    const token = await getAccessToken();
    const response = await fetch(`/api/agents/${selected}/permissions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(patch),
    });
    const body = await response.json();
    if (!response.ok) {
      setNote(body.error?.message ?? "Save failed");
      return;
    }
    setPermissions(body.permissions ?? null);
    setRevoked(Boolean(patch.revoke));
    setNote(patch.revoke ? COPY.agentRevoked.title : "Saved.");
  }

  if (!authenticated) {
    return (
      <EmptyState
        pose="hoodie"
        title="Permissions need a human"
        body="Sign in to enable trading, set caps, or revoke an agent instantly."
        action={
          <button type="button" onClick={() => login()} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            Connect
          </button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3.5 py-3">
      <header className="border-b border-line pb-3">
        <p className="mf-kicker">Settings</p>
        <h1 className="text-[18px] font-semibold tracking-tight">Agent permissions</h1>
      </header>
      {!agentsReady ? (
        <p className="text-sm text-mute">Loading claimed Muses…</p>
      ) : !agents.length ? (
        <EmptyState
          pose="laptop"
          title={COPY.agentUnclaimed.title}
          body="Claim an agent first."
          action={
            <Link href="/connect" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Connect your agent
            </Link>
          }
        />
      ) : (
        <section className="space-y-3 pt-3">
          <label className="block text-[13px]">
            <span className="text-mute">Agent</span>
            <select
              className="mt-1 h-11 w-full rounded-md border border-line bg-paper px-2.5"
              value={selected ?? ""}
              onChange={(event) => setSelected(event.target.value)}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  @{agent.handle} · {agent.status}
                </option>
              ))}
            </select>
          </label>
          {permissions ? (
            <>
              <label className="flex items-center justify-between text-sm">
                Trading
                <input
                  type="checkbox"
                  checked={permissions.tradingEnabled}
                  onChange={(event) => void save({ tradingEnabled: event.target.checked })}
                />
              </label>
              <p className="text-xs text-mute">Withdrawals stay disabled for agents.</p>
              <label className="block text-sm">
                Max per trade (lamports)
                <input
                  className="mf-num mt-1 h-11 w-full rounded-md border border-line bg-paper px-2.5"
                  defaultValue={permissions.maxPerTradeLamports}
                  onBlur={(event) => void save({ maxPerTradeLamports: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                Max daily volume (lamports)
                <input
                  className="mf-num mt-1 h-11 w-full rounded-md border border-line bg-paper px-2.5"
                  defaultValue={permissions.maxDailyVolumeLamports}
                  onBlur={(event) => void save({ maxDailyVolumeLamports: event.target.value })}
                />
              </label>
              <button
                type="button"
                onClick={() => void save({ revoke: true })}
                className="rounded-full bg-down px-4 py-2 text-sm text-white"
              >
                Revoke instantly
              </button>
            </>
          ) : null}
          {note ? <p className="mf-note !mx-0">{note}</p> : null}
        </section>
      )}
    </div>
  );
}
