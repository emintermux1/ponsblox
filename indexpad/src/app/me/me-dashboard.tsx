"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Layers, Rocket } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectCta, DashboardSection } from "@/components/wallet";
import {
  useCreatedIndexes,
  useLaunchedCoins,
  useSavedIndexes,
} from "@/hooks/use-me-dashboard";
import { useHydrated } from "@/hooks/use-hydrated";
import { addressUrl, robinhood, short } from "@/lib/chain";
import { toggleSavedIndex } from "@/lib/indexpad/store";

function MeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-10 w-64 animate-pulse rounded bg-surface-2" />
      <div className="mt-10 space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}

function ConnectedDashboard({ address }: { address: string }) {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const created = useCreatedIndexes(address);
  const launched = useLaunchedCoins(address);
  const saved = useSavedIndexes(address);
  const onRobinhood = chainId === robinhood.id;

  function unsave(slug: string) {
    toggleSavedIndex(address, slug);
    void queryClient.invalidateQueries({ queryKey: ["me", "saved", address] });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Connected wallet
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-[#f4efe4]">
            Your desk
          </h1>
          <a
            href={addressUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-mono text-sm text-muted hover:text-accent"
          >
            {short(address, 6)}
          </a>
        </div>
      </header>

      {!onRobinhood ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-accent/25 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Switch to Robinhood Chain ({robinhood.id}) to manage launches from this desk.
          </p>
          <button
            type="button"
            className="ip-btn ip-btn-accent"
            disabled={isPending}
            onClick={() => switchChain({ chainId: robinhood.id })}
          >
            {isPending ? "Switching…" : "Switch to Robinhood"}
          </button>
        </div>
      ) : null}

      <div className="mt-10 space-y-12">
        <DashboardSection
          title="Created Indexes"
          description="Indexes this wallet published. Live rows only."
          empty="You have not created an index with this wallet."
          emptyHref="/create"
          emptyLabel="Create an index"
          items={created.data}
          isLoading={created.isLoading}
          isError={created.isError}
          onRetry={() => void created.refetch()}
          icon={<Layers className="h-5 w-5" />}
        />
        <DashboardSection
          title="Launched Coins"
          description="Index coins launched from this wallet."
          empty="No index coin has been launched from this wallet."
          emptyHref="/launch"
          emptyLabel="Launch a coin"
          items={launched.data}
          isLoading={launched.isLoading}
          isError={launched.isError}
          onRetry={() => void launched.refetch()}
          icon={<Rocket className="h-5 w-5" />}
        />
        <DashboardSection
          title="Saved Indexes"
          description="Indexes you bookmarked in this browser for this wallet."
          empty="You have not saved any indexes yet."
          emptyHref="/explore"
          emptyLabel="Explore indexes"
          items={saved.data}
          isLoading={saved.isLoading}
          isError={saved.isError}
          onRetry={() => void saved.refetch()}
          onUnsave={unsave}
          icon={<Bookmark className="h-5 w-5" />}
        />
      </div>
    </main>
  );
}

export function MeDashboard() {
  const hydrated = useHydrated();
  const { address, isReconnecting } = useAccount();

  if (!hydrated || isReconnecting) {
    return <MeSkeleton />;
  }

  if (!address) {
    return <ConnectCta />;
  }

  return <ConnectedDashboard address={address} />;
}
