import { SOL_DECIMALS } from "@/lib/constants";

/** USD / SOL mark strings are stored at this many fractional digits. */
export const PRICE_SCALE = 12;

export const MISSING_METRIC = "--";

export function parseInteger(value: string | bigint | null | undefined): bigint | null {
  if (typeof value === "bigint") return value;
  if (value == null) return null;
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return BigInt(trimmed);
}

export function requireInteger(value: string | bigint, label: string): bigint {
  const parsed = parseInteger(value);
  if (parsed == null) throw new Error(`invalid integer ${label}`);
  return parsed;
}

/** Parse a decimal string into a scaled integer. Extra digits are truncated, never floated. */
export function parseDecimal(value: string | null | undefined, scale: number): bigint | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!Number.isInteger(scale) || scale < 0 || scale > 38) return null;
  const neg = trimmed.startsWith("-");
  const raw = neg ? trimmed.slice(1) : trimmed;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const [wholePart, fracPart = ""] = raw.split(".");
  const frac = fracPart.length > scale ? fracPart.slice(0, scale) : fracPart.padEnd(scale, "0");
  const n = BigInt(wholePart) * 10n ** BigInt(scale) + BigInt(frac || "0");
  return neg ? -n : n;
}

export function pow10(decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 38) {
    throw new Error("invalid decimals");
  }
  return 10n ** BigInt(decimals);
}

export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("division by zero");
  return (a * b) / denominator;
}

export function ratioFloor(numerator: bigint, denominator: bigint): bigint | null {
  if (denominator <= 0n) return null;
  return numerator / denominator;
}

export function formatLamportsAsSol(lamports: string | bigint | null | undefined): string {
  const n = parseInteger(lamports ?? null);
  if (n == null) return MISSING_METRIC;
  return `${formatScaled(n, SOL_DECIMALS)} SOL`;
}

export function formatBpsAsPct(bps: string | bigint | null | undefined): string {
  const n = parseInteger(bps ?? null);
  if (n == null) return MISSING_METRIC;
  return `${formatScaled(n, 2)}%`;
}

export function formatScaled(value: bigint, scale: number): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const base = pow10(scale);
  const whole = abs / base;
  const frac = abs % base;
  const fracText = frac === 0n ? "" : `.${frac.toString().padStart(scale, "0").replace(/0+$/, "")}`;
  return `${neg ? "-" : ""}${whole.toString()}${fracText}`;
}

export function isUsableDecimals(decimals: number | null | undefined): decimals is number {
  return typeof decimals === "number" && Number.isInteger(decimals) && decimals >= 0 && decimals <= 18;
}
