export function slugFromSymbol(symbol: string): string {
  return symbol.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function truncateAddress(value: string, size = 4): string {
  const v = value.trim();
  if (!v) return "—";
  if (!v.startsWith("0x") || v.length < size * 2 + 4) return v;
  return `${v.slice(0, size + 2)}…${v.slice(-size)}`;
}

export function formatQuote(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: abs >= 1 && abs < 1000 ? 2 : 0,
  });
}

export function formatUsdLike(value: string | number | null | undefined): string {
  const formatted = formatQuote(value);
  if (formatted === "—") return formatted;
  return formatted;
}

export function formatWeight(weightBps: number): string {
  const pct = weightBps / 100;
  const digits = Number.isInteger(pct) ? 0 : 1;
  return `${pct.toFixed(digits)}%`;
}

export function formatBpsChange(changeBps: number | null | undefined): string {
  if (changeBps === null || changeBps === undefined || !Number.isFinite(changeBps)) {
    return "—";
  }
  const pct = changeBps / 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function changeTone(
  changeBps: number | null | undefined,
): "up" | "down" | "flat" {
  if (changeBps === null || changeBps === undefined || changeBps === 0) return "flat";
  return changeBps > 0 ? "up" : "down";
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US");
}

export function formatInt(value: number | null | undefined): string {
  return formatCount(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

export function tickerLabel(ticker: string): string {
  const t = ticker.trim();
  if (!t) return "—";
  return t.startsWith("$") ? t : `$${t}`;
}

export function shortAddress(value?: string | null, size = 4): string {
  if (!value) return "—";
  return truncateAddress(value, size);
}
