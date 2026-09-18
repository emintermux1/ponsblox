import { looksLikeMint } from "@/lib/format";

const PLACEHOLDER_LABEL = /^(?:[-–—._•]+|n\/a|na|null|undefined|unknown|unnamed|none)$/i;

export function canonicalImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  const ipfs = trimmed.match(/^ipfs:\/\/(.+)/i);
  if (ipfs?.[1]) return `https://ipfs.io/ipfs/${ipfs[1].replace(/^ipfs\//i, "")}`;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return `https://${trimmed.slice("http://".length)}`;
  return null;
}

export function cleanTokenLabel(value: string | null | undefined, mint?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_LABEL.test(trimmed)) return null;
  if (looksLikeMint(trimmed)) return null;
  if (mint && mint.startsWith(trimmed) && trimmed.length <= 12) return null;
  return trimmed;
}

export function preferLabel(
  current: string | null | undefined,
  next: string | null | undefined,
  mint?: string | null,
): string | null {
  return cleanTokenLabel(current, mint) ?? cleanTokenLabel(next, mint);
}

export function tokenImageSrc(url: string | null | undefined): string | null {
  return canonicalImageUrl(url);
}
