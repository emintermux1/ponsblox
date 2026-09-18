import { pickImageUrl } from "@/lib/pfp";
import { tokenImageSrc } from "@/lib/token-image";

export { tokenImageSrc };

export function proxiedImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  if (!/^https?:\/\//i.test(url)) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

export function pickUserAvatar(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const nested =
    row.author && typeof row.author === "object" ? (row.author as Record<string, unknown>) : null;
  return pickImageUrl(
    asUrl(row.profilePicture),
    asUrl(row.authorAvatar),
    asUrl(row.authorProfilePicture),
    asUrl(row.avatarUrl),
    asUrl(row.avatar),
    asUrl(row.pfp),
    asUrl(row.image),
    asUrl(row.photo),
    asUrl(row.picture),
    asUrl(row.twitterImage),
    twitterImage(row.twitter),
    nested ? pickUserAvatar(nested) : null,
  );
}

function asUrl(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function twitterImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^https?:\/\//i.test(value) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value)) return value;
  return null;
}
