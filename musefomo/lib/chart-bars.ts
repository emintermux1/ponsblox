import type { Candle } from "@/lib/types";

const UNIX_SEC_MIN = 1_000_000_000;
const UNIX_SEC_MAX = 4_000_000_000;
const UNIX_MS_MIN = UNIX_SEC_MIN * 1000;
const UNIX_MS_MAX = UNIX_SEC_MAX * 1000;

type BarRecord = Record<string, unknown>;

export function ohlcvBarsFromPayload(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const root = body as BarRecord;
  const nested = root.data && typeof root.data === "object" ? (root.data as BarRecord) : null;
  const chart = pickChart(root) ?? (nested ? pickChart(nested) : null);
  const raw =
    firstArray(root, ["bars", "candles"]) ??
    (nested ? firstArray(nested, ["bars", "candles"]) : null) ??
    (chart ? firstArray(chart, ["bars", "candles"]) : null);
  return raw ?? [];
}

export function normalizeChartBars(input: unknown): Candle[] {
  if (!Array.isArray(input) || input.length === 0) return [];
  const seen = new Map<number, Candle>();
  for (const row of input) {
    const candle = toCandle(row);
    if (!candle) continue;
    seen.set(candle.time, candle);
  }
  return [...seen.values()].sort((a, b) => a.time - b.time);
}

export function chartPricePrecision(bars: Candle[]): number {
  const mag = Math.min(
    ...bars.map((bar) => Math.abs(bar.close)).filter((value) => value > 0),
  );
  if (!Number.isFinite(mag)) return 4;
  if (mag >= 100) return 2;
  if (mag >= 1) return 4;
  if (mag >= 0.01) return 5;
  return 8;
}

export function formatChartPrice(price: number): string {
  if (!Number.isFinite(price)) return "";
  const abs = Math.abs(price);
  if (abs >= 1000) return price.toFixed(2);
  if (abs >= 1) return price.toFixed(4);
  if (abs >= 0.01) return price.toFixed(5);
  return price.toFixed(8);
}

export function formatChartTime(time: unknown): string {
  return formatChartTick(time);
}

/** Time-axis ticks only. Never a day-ago crumb like `22d` / `220d`. */
export function formatChartTick(time: unknown): string {
  const sec = asUnixSeconds(time);
  if (sec == null) return "";
  const date = new Date(sec * 1000);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function pickChart(row: BarRecord): BarRecord | null {
  return row.chart && typeof row.chart === "object" ? (row.chart as BarRecord) : null;
}

function firstArray(row: BarRecord, keys: string[]): unknown[] | null {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) return value;
  }
  return null;
}

function first(row: BarRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null) return row[key];
  }
  return undefined;
}

function toCandle(row: unknown): Candle | null {
  if (Array.isArray(row)) {
    if (row.length < 5) return null;
    return fromParts(row[0], row[1], row[2], row[3], row[4]);
  }
  if (!row || typeof row !== "object") return null;
  const rec = row as BarRecord;
  const timeRaw = first(rec, ["time", "t", "timestamp", "date", "unixTime", "unix_time", "time_open", "timeOpen"]);
  const openRaw = first(rec, ["open", "o"]);
  const highRaw = first(rec, ["high", "h"]);
  const lowRaw = first(rec, ["low", "l"]);
  const closeRaw = first(rec, ["close", "c", "value", "price"]);
  const straight = fromParts(timeRaw, openRaw, highRaw, lowRaw, closeRaw);
  if (straight) return straight;
  if (asUnixSeconds(timeRaw) != null) return null;
  return fromParts(closeRaw, timeRaw, timeRaw, timeRaw, timeRaw);
}

function fromParts(
  timeRaw: unknown,
  openRaw: unknown,
  highRaw: unknown,
  lowRaw: unknown,
  closeRaw: unknown,
): Candle | null {
  const time = asUnixSeconds(timeRaw);
  if (time == null) return null;
  const close = asPrice(closeRaw);
  const open = asPrice(openRaw);
  const high = asPrice(highRaw);
  const low = asPrice(lowRaw);
  const price = close ?? open ?? high ?? low;
  if (price == null) return null;
  const nextOpen = open ?? price;
  const nextClose = close ?? price;
  let nextHigh = high ?? Math.max(nextOpen, nextClose, low ?? price);
  let nextLow = low ?? Math.min(nextOpen, nextClose, high ?? price);
  if (nextHigh < nextLow) {
    const swap = nextHigh;
    nextHigh = nextLow;
    nextLow = swap;
  }
  return { time, open: nextOpen, high: nextHigh, low: nextLow, close: nextClose };
}

function asUnixSeconds(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "object") {
    const rec = raw as BarRecord;
    if (rec.year != null && rec.month != null && rec.day != null) {
      const year = Number(rec.year);
      const month = Number(rec.month);
      const day = Number(rec.day);
      if (![year, month, day].every(Number.isFinite)) return null;
      const ms = Date.UTC(year, month - 1, day);
      return Number.isFinite(ms) ? clampUnixSeconds(Math.floor(ms / 1000)) : null;
    }
    return null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+[smhd]$/i.test(trimmed)) return null;
    if (/^\d+(\.\d+)?$/.test(trimmed)) return asUnixSeconds(Number(trimmed));
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? clampUnixSeconds(Math.floor(ms / 1000)) : null;
  }
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null;
  if (raw >= UNIX_MS_MIN && raw <= UNIX_MS_MAX) return Math.floor(raw / 1000);
  return clampUnixSeconds(Math.floor(raw));
}

function clampUnixSeconds(value: number): number | null {
  if (value >= UNIX_SEC_MIN && value <= UNIX_SEC_MAX) return value;
  return null;
}

function asPrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || /[a-z]/i.test(trimmed) || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;
    return asPrice(Number(trimmed));
  }
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return null;
  if (raw >= UNIX_SEC_MIN && raw <= UNIX_MS_MAX) return null;
  if (raw > 1e8) return null;
  return raw;
}
