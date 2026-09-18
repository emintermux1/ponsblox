import { looksLikeMint } from "@/lib/format";
import { getDexTokenImages } from "@/lib/market";
import { pickUserAvatar, proxiedImage } from "@/lib/media";
import { pickImageUrl } from "@/lib/pfp";
import { asHttpsLogo } from "@/lib/token-logo";
import type { FomoScanBoardEntry, FomoScanThesis } from "@/lib/types";

export async function collectThesisMedia(items: FomoScanThesis[] | null | undefined): Promise<{
  avatars: Map<string, string>;
  tokens: Map<string, string>;
}> {
  const rows = Array.isArray(items) ? items : [];
  const avatars = new Map<string, string>();
  for (const item of rows) {
    const url = pickUserAvatar(item);
    const handle = item.authorHandle?.replace(/^@/, "").toLowerCase();
    if (url && handle) avatars.set(handle, url);
    if (url && item.authorId) avatars.set(item.authorId, url);
  }
  const mints = [
    ...new Set(
      rows
        .map((item) => item.tokenAddress)
        .filter((mint): mint is string => Boolean(mint && looksLikeMint(mint))),
    ),
  ];
  const tokens = await getDexTokenImages(mints).catch(() => new Map<string, string>());
  return { avatars, tokens };
}

export function decorateTheses(
  items: FomoScanThesis[] | null | undefined,
  avatars: Map<string, string>,
  tokens: Map<string, string> = new Map(),
): FomoScanThesis[] {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    authorAvatar: proxiedImage(thesisAvatar(item, avatars)),
    tokenImage: asHttpsLogo(
      item.tokenAddress ? (tokens.get(item.tokenAddress) ?? item.tokenImage ?? null) : null,
    ),
  }));
}

export function thesisAvatar(item: FomoScanThesis, avatars: Map<string, string>): string | null {
  const handle = item.authorHandle?.replace(/^@/, "").toLowerCase();
  return (
    pickUserAvatar(item) ??
    (handle ? (avatars.get(handle) ?? null) : null) ??
    (item.authorId ? (avatars.get(item.authorId) ?? null) : null)
  );
}

export async function decorateHumanBoard(
  entries: FomoScanBoardEntry[] | null | undefined,
): Promise<FomoScanBoardEntry[]> {
  return (Array.isArray(entries) ? entries : []).map((entry) => ({
    ...entry,
    avatarUrl: proxiedImage(pickImageUrl(entry.avatarUrl, pickUserAvatar(entry))),
  }));
}

export async function decorateTokenBoard(
  entries: FomoScanBoardEntry[] | null | undefined,
): Promise<FomoScanBoardEntry[]> {
  const rows = Array.isArray(entries) ? entries : [];
  const mints = rows.map((entry) => entry.id).filter((id) => looksLikeMint(id));
  const images = await getDexTokenImages(mints).catch(() => new Map<string, string>());
  return rows.map((entry) => ({
    ...entry,
    avatarUrl: proxiedImage(pickImageUrl(entry.avatarUrl, images.get(entry.id) ?? null)),
  }));
}
