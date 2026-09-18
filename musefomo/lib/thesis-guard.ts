import type { FeedEvent, FomoScanThesis } from "@/lib/types";

const BLOG_LEARN_ID = /family:learn:|family:quote:|blog\/learn/i;
const DAY_MS = 86_400_000;
/** Hard drop — 238-day harvest stamps must never reach the home feed. */
export const THESIS_MAX_AGE_MS = 7 * DAY_MS;
/** Home feed prefers the last two days. If none, empty — do not fall back to week-old cards. */
export const THESIS_PREFER_AGE_MS = 2 * DAY_MS;

export function isBlogLearnThesisId(id: string | null | undefined): boolean {
  return Boolean(id && BLOG_LEARN_ID.test(id));
}

/** Scraped /blog/learn cards: concatenated slugs or educational OG blurbs, not trader thesis bodies. */
export function looksLikeBlogLearnCardText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.some((word) => /[A-Za-z]{18,}/.test(word.replace(/[^A-Za-z]/g, "")))) return true;
  if (trimmed.length > 24 && words.length <= 2) return true;
  if (/^Learn (how|when|what|why|valuable)\b/i.test(trimmed)) return true;
  return false;
}

export function thesisTimestampMs(item: FomoScanThesis): number | null {
  const raw = item.fomoCreatedAt ?? item.updatedAt ?? item.closedAt;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  return raw < 1e12 ? raw * 1000 : raw;
}

function ageMs(at: number, now: number): number {
  return now - at;
}

/** True when the stamp is known and not older than 7 days. */
export function isFreshThesis(item: FomoScanThesis, now = Date.now()): boolean {
  const at = thesisTimestampMs(item);
  if (at == null) return false;
  const age = ageMs(at, now);
  return age >= 0 && age <= THESIS_MAX_AGE_MS;
}

/** True when the stamp is within the last 48 hours. */
export function isPreferredThesis(item: FomoScanThesis, now = Date.now()): boolean {
  const at = thesisTimestampMs(item);
  if (at == null) return false;
  const age = ageMs(at, now);
  return age >= 0 && age <= THESIS_PREFER_AGE_MS;
}

export function isFreshFeedAt(at: number, now = Date.now()): boolean {
  if (!Number.isFinite(at) || at <= 0) return false;
  const age = ageMs(at, now);
  return age >= 0 && age <= THESIS_MAX_AGE_MS;
}

export function isPreferredFeedAt(at: number, now = Date.now()): boolean {
  if (!Number.isFinite(at) || at <= 0) return false;
  const age = ageMs(at, now);
  return age >= 0 && age <= THESIS_PREFER_AGE_MS;
}

/** Real trader bodies from the last 48h. Empty if none — never year-old leftovers. */
export function pickHomeTheses(items: FomoScanThesis[], now = Date.now()): FomoScanThesis[] {
  return items.filter((item) => isRealTraderThesis(item) && isPreferredThesis(item, now));
}

export function pickHomeEvents(events: FeedEvent[], now = Date.now()): FeedEvent[] {
  return events.filter((event) => !isFakeThesisEvent(event) && isPreferredFeedAt(event.at, now));
}

export function isRealTraderThesis(item: FomoScanThesis | null | undefined): item is FomoScanThesis {
  if (!item?.id) return false;
  if (!item.authorHandle && !item.authorName && !item.authorId) return false;
  const text = (item.thesis ?? "").trim();
  if (text.length < 8) return false;
  if (isBlogLearnThesisId(item.id)) return false;
  if (looksLikeBlogLearnCardText(text)) return false;
  return true;
}

export function isFakeThesisEvent(event: FeedEvent): boolean {
  if (isBlogLearnThesisId(event.id)) return true;
  const text = (event.thesis ?? "").trim();
  if (!text) return false;
  return looksLikeBlogLearnCardText(text);
}
