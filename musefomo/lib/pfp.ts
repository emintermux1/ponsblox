export function monogram(name?: string | null, handle?: string | null): string {
  const named = lettersFromWords(name);
  if (named) return named;
  const fromHandle = lettersFromHandle(handle);
  if (fromHandle) return fromHandle;
  return "MF";
}

function firstAlpha(value: string): string | null {
  const match = value.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : null;
}

function lastAlpha(value: string): string | null {
  const matches = value.match(/[A-Za-z0-9]/g);
  if (!matches?.length) return null;
  return matches[matches.length - 1].toUpperCase();
}

function lettersFromWords(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[\s._-]+/).filter((part) => /[A-Za-z0-9]/.test(part));
  if (parts.length >= 2) {
    const first = firstAlpha(parts[0]);
    const last = firstAlpha(parts[parts.length - 1]);
    if (first && last) return `${first}${last}`;
  }
  const first = firstAlpha(trimmed);
  const last = lastAlpha(trimmed);
  if (first && last && first !== last) return `${first}${last}`;
  return first;
}

function lettersFromHandle(value?: string | null): string | null {
  const handle = value?.replace(/^@/, "").trim();
  if (!handle) return null;
  return lettersFromWords(handle);
}

export function pickImageUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  }
  return null;
}
