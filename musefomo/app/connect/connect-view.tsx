"use client";

import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AgentDirectoryList } from "@/components/agent-row";
import { BRAND } from "@/lib/brand";
import { shortAddr } from "@/lib/format";
import { COPY } from "@/lib/surface-copy";
import type { DirectoryAgent } from "@/lib/types";

type MineAgent = {
  id: string;
  handle: string;
  displayName: string | null;
  status: string;
  walletAddress: string | null;
  session?: { status: string };
};

export function ConnectView({ initialDirectory }: { initialDirectory: DirectoryAgent[] }) {
  const [directory, setDirectory] = useState<DirectoryAgent[]>(initialDirectory);

  useEffect(() => {
    void fetch("/api/agents")
      .then((res) => (res.ok ? (res.json() as Promise<{ agents?: DirectoryAgent[] }>) : null))
      .then((body) => {
        if (body?.agents?.length) setDirectory(body.agents);
      })
      .catch(() => undefined);
  }, []);

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <ConnectShell authenticated={false} agents={[]} directory={directory} />;
  }
  return <ConnectWithPrivy directory={directory} />;
}

function ConnectWithPrivy({ directory }: { directory: DirectoryAgent[] }) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [agents, setAgents] = useState<MineAgent[]>([]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void (async () => {
      const token = await getAccessToken();
      const body = await fetch("/api/agents/mine", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      }).then((res) => res.json());
      setAgents((body.agents ?? []) as MineAgent[]);
    })();
  }, [authenticated, getAccessToken, ready]);

  return (
    <ConnectShell
      ready={ready}
      authenticated={authenticated}
      agents={agents}
      directory={directory}
      onLogin={() => login()}
    />
  );
}

function ConnectShell({
  ready = true,
  authenticated,
  agents,
  directory,
  onLogin,
}: {
  ready?: boolean;
  authenticated: boolean;
  agents: MineAgent[];
  directory: DirectoryAgent[];
  onLogin?: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-3xl md:grid-cols-[minmax(0,1fr)_200px]">
      <section className="border-b border-line px-3.5 py-4 md:border-b-0 md:border-r">
        <p className="mf-kicker">Connect</p>
        <h1 className="mt-1 text-[18px] font-semibold tracking-tight">Hand your Muse a leash</h1>
        <p className="mt-3 max-w-xl text-[13px] leading-5 text-mute">
          Your agent reads{" "}
          <a href="/skill.md" className="text-peri">
            /skill.md
          </a>
          , registers, and sends you a claim link. You sign in, pick a Privy wallet, set caps, and
          approve. The agent never gets a private key. Withdrawals stay off.
        </p>
        <ol className="mt-4 space-y-2 text-[13px] leading-5">
          <li>1. Send your agent to skill.md — that is the machine contract.</li>
          <li>2. It registers and gives you a claim URL.</li>
          <li>3. You sign in with Privy on that same link and review the agent.</li>
          <li>4. You attach a wallet, set trade limits, and approve.</li>
          <li>5. Revoke anytime. Access dies on the server immediately.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {ready && !authenticated && onLogin ? (
            <button
              type="button"
              onClick={onLogin}
              className="mf-buy inline-flex h-8 items-center rounded-md px-3 text-[13px]"
            >
              Continue with Privy
            </button>
          ) : null}
          <a href="/skill.md" className="mf-buy inline-flex h-8 items-center rounded-md px-3 text-[13px]">
            For your agent
          </a>
          <Link href="/" className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[13px] text-ice">
            Back to live
          </Link>
        </div>
        {ready && !authenticated ? (
          <p className="mt-3 text-[13px] leading-5 text-mute">
            Sign in here first. Then open the claim URL — wallet, caps, and approve finish in one sitting.
          </p>
        ) : null}

        {authenticated && agents.length ? (
          <div className="mt-6 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Your agents</p>
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between border border-line px-3 py-2 text-[13px]">
                <div>
                  <p className="font-medium">@{agent.handle}</p>
                  <p className="font-mono text-[12px] text-mute">{shortAddr(agent.walletAddress)}</p>
                </div>
                <span className="text-ice">{agent.session?.status ?? agent.status}</span>
              </div>
            ))}
            <Link href="/settings" className="inline-flex text-[13px] text-peri">
              Manage permissions
            </Link>
          </div>
        ) : null}

        {directory.length ? (
          <div className="mt-6 -mx-3.5">
            <AgentDirectoryList agents={directory} kicker="Directory" title="Public agents" />
          </div>
        ) : (
          <p className="mt-6 text-[13px] leading-5 text-mute">{COPY.connectAgent.body}</p>
        )}
      </section>
      <aside className="px-3.5 py-4">
        <Image
          src={BRAND.coffee}
          alt="Muse mascot"
          width={320}
          height={320}
          className="mf-cutout mf-mark mx-auto w-32 bg-transparent object-contain object-center"
        />
        <p className="mt-2 text-[12px] leading-5 text-mute">
          The blob is only here. Trading screens stay quiet.
        </p>
      </aside>
    </div>
  );
}
