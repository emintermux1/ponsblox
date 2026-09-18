import type { AdapterResult, CreateIndexInput, PonsIndex } from "@/types";
import { slugFromSymbol } from "./format";
import { indexApiConfigured, indexApiFetch } from "./http";
import { readCreatedIndexes, rememberIndex } from "./store";
import { parseIndexList, parsePonsIndex, validateCreateIndex } from "./validate";
import type { PonsIndex as DeskIndex } from "@/types/pons";

export type CreateIndexSession = {
  creator?: string | null;
  logos?: Record<string, string>;
};

function toDeskIndex(
  index: PonsIndex,
  creator: string,
  slug: string,
  logos?: Record<string, string>,
): DeskIndex {
  return {
    id: index.id,
    slug,
    name: index.name,
    ticker: index.symbol,
    creator,
    createdAt: index.createdAt,
    assetCount: index.components.length,
    launchedCoinAddress: index.coinAddress,
    components: index.components.map((row) => ({
      ticker: row.symbol,
      weight: row.weightBps / 100,
      logoUrl: logos?.[row.symbol] || null,
    })),
  };
}

export async function getPonsIndexes(): Promise<AdapterResult<PonsIndex[]>> {
  if (!indexApiConfigured()) {
    return { ok: true, data: [] };
  }
  try {
    const body = await indexApiFetch<unknown>("/indexes");
    return { ok: true, data: parseIndexList(body) };
  } catch (error) {
    return {
      ok: false,
      code: "upstream",
      message: error instanceof Error ? error.message : "Index API read failed",
    };
  }
}

export async function createIndex(
  input: CreateIndexInput,
  session?: CreateIndexSession,
): Promise<AdapterResult<PonsIndex>> {
  const invalid = validateCreateIndex(input);
  if (invalid) return { ok: false, code: "invalid", message: invalid };

  const creator = session?.creator?.trim();
  if (!creator) {
    return {
      ok: false,
      code: "rejected",
      message: "Connect your wallet to create an index.",
    };
  }

  const symbol = input.symbol.trim().toUpperCase();
  const name = input.name.trim();

  if (indexApiConfigured()) {
    try {
      const body = await indexApiFetch<unknown>("/indexes", {
        method: "POST",
        body: JSON.stringify({
          name,
          symbol,
          description: input.description.trim(),
          components: input.components,
          creator,
        }),
      });
      const parsed = parsePonsIndex(body);
      if (!parsed) {
        return { ok: false, code: "upstream", message: "Index API returned an unrecognized payload" };
      }
      const slug = slugFromSymbol(parsed.symbol) || parsed.id;
      rememberIndex(toDeskIndex(parsed, creator, slug, session?.logos));
      return { ok: true, data: parsed };
    } catch (error) {
      return {
        ok: false,
        code: "upstream",
        message: error instanceof Error ? error.message : "Index create failed",
      };
    }
  }

  const baseSlug = slugFromSymbol(symbol) || "index";
  const taken = new Set(readCreatedIndexes(creator).map((row) => row.slug));
  let slug = baseSlug;
  if (taken.has(slug)) slug = `${baseSlug}-${Date.now().toString(36)}`;

  const created: PonsIndex = {
    id: slug,
    name,
    symbol,
    description: input.description.trim(),
    components: input.components,
    coinAddress: null,
    createdAt: Date.now(),
    status: "draft",
  };
  rememberIndex(toDeskIndex(created, creator, slug, session?.logos));
  return { ok: true, data: created };
}
