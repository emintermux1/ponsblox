import { sameWallet } from "@/lib/chain";
import {
  readAllCreatedIndexes,
  readCreatedIndexes,
  readLocalLaunches,
  readSavedSlugs,
  uniqueIndexes,
  uniqueLaunches,
} from "@/lib/indexpad/store";
import { asPonsIndex, getIndexLaunches } from "@/lib/pons";
import type { IndexLaunch, PonsIndex, WalletIndexCard } from "@/types/pons";

function toCard(index: PonsIndex): WalletIndexCard {
  return {
    id: index.id || index.slug,
    slug: index.slug,
    name: index.name,
    ticker: index.ticker,
    creator: index.creator,
    logoUrl: index.logoUrl,
    assetCount: index.assetCount ?? index.components?.length ?? undefined,
    launchedCoinAddress: index.launchedCoinAddress,
  };
}

function launchToCard(launch: IndexLaunch): WalletIndexCard {
  return {
    id: launch.indexId || launch.indexSlug || launch.tokenAddress,
    slug: launch.indexSlug || launch.indexId,
    name: launch.name,
    ticker: launch.ticker,
    creator: launch.launcher,
    logoUrl: launch.logoUrl,
    launchedCoinAddress: launch.tokenAddress,
  };
}

async function loadCatalog(): Promise<PonsIndex[]> {
  const res = await fetch("/api/indexes", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Index catalog unavailable (${res.status})`);
  }
  const json: unknown = await res.json();
  const record =
    json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  const rows = Array.isArray(json)
    ? json
    : Array.isArray(record?.data)
      ? record.data
      : Array.isArray(record?.indexes)
        ? record.indexes
        : [];
  return rows
    .map((row) => asPonsIndex(row))
    .filter((row): row is PonsIndex => row !== null);
}

function localCreated(wallet: string): PonsIndex[] {
  return uniqueIndexes([
    ...readCreatedIndexes(wallet),
    ...readAllCreatedIndexes().filter((index) => sameWallet(index.creator, wallet)),
  ]);
}

export async function getCreatedIndexes(wallet: string): Promise<WalletIndexCard[]> {
  const remote = await loadCatalog();
  const mine = remote.filter((index) => sameWallet(index.creator, wallet));
  return uniqueIndexes([...mine, ...localCreated(wallet)]).map(toCard);
}

export async function getLaunchedCoins(wallet: string): Promise<WalletIndexCard[]> {
  const [catalog, remoteLaunches] = await Promise.all([
    loadCatalog(),
    getIndexLaunches(),
  ]);
  const fromRemote = remoteLaunches.filter((launch) =>
    sameWallet(launch.launcher, wallet),
  );
  const fromCatalog = catalog
    .filter(
      (index) =>
        Boolean(index.launchedCoinAddress) && sameWallet(index.creator, wallet),
    )
    .map(
      (index): IndexLaunch => ({
        id: index.launchedCoinAddress || index.id,
        indexId: index.id,
        indexSlug: index.slug,
        name: index.name,
        ticker: index.ticker,
        tokenAddress: index.launchedCoinAddress as string,
        launcher: index.creator,
        createdAt:
          index.launchedAt != null
            ? String(index.launchedAt)
            : new Date().toISOString(),
        logoUrl: index.logoUrl,
      }),
    );
  const local = readLocalLaunches(wallet).filter((launch) =>
    sameWallet(launch.launcher, wallet),
  );
  return uniqueLaunches([...local, ...fromRemote, ...fromCatalog]).map(launchToCard);
}

export async function getSavedIndexes(wallet: string): Promise<WalletIndexCard[]> {
  const slugs = readSavedSlugs(wallet);
  if (slugs.length === 0) return [];
  const catalog = uniqueIndexes([...(await loadCatalog()), ...localCreated(wallet)]);
  const bySlug = new Map(
    catalog.flatMap((index) => [
      [index.slug.toLowerCase(), index],
      [index.id.toLowerCase(), index],
      [index.ticker.replace(/^\$/, "").toLowerCase(), index],
    ] as [string, PonsIndex][]),
  );
  return slugs.map((slug) => {
    const found = bySlug.get(slug.toLowerCase());
    if (found) return toCard(found);
    return {
      id: slug,
      slug,
      name: slug,
      ticker: slug.replace(/^\$/, "").toUpperCase(),
    };
  });
}
