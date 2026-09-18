import { SOL_DECIMALS } from "@/lib/constants";
import { formatBpsAsPct, formatLamportsAsSol, MISSING_METRIC } from "@/lib/money";

export { formatBpsAsPct, formatLamportsAsSol, MISSING_METRIC };

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * 10 ** SOL_DECIMALS));
}

export function usdToSolLamports(usd: number, solUsd: number): bigint {
  if (!Number.isFinite(usd) || !Number.isFinite(solUsd) || solUsd <= 0) return 0n;
  return solToLamports(usd / solUsd);
}

export function uiAmountToBase(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return 0n;
  return BigInt(Math.round(amount * 10 ** decimals));
}

export function lamportsToSol(lamports: string | bigint): number {
  return Number(lamports) / 10 ** SOL_DECIMALS;
}

export function parseSolInput(value: string): number | null {
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function formatSol(lamports: string | bigint | null | undefined): string {
  if (lamports === null || lamports === undefined) return "—";
  const sol = lamportsToSol(lamports);
  if (!Number.isFinite(sol)) return "—";
  if (sol === 0) return "0 SOL";
  if (sol >= 10) return `${sol.toFixed(2)} SOL`;
  return `${sol.toFixed(sol >= 1 ? 2 : 3)} SOL`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(5)}`;
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function changeTone(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "text-mute";
  return value > 0 ? "text-up" : "text-down";
}

export function timeAgo(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  const ms = typeof input === "number" ? (input > 1e12 ? input : input * 1000) : Date.parse(input);
  if (!Number.isFinite(ms)) return "";
  const delta = Math.max(0, Date.now() - ms);
  const min = Math.floor(delta / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function shortAddr(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function looksLikeMint(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function looksLikeEvm(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function looksLikeTokenRef(value: string): boolean {
  return looksLikeMint(value) || looksLikeEvm(value);
}

export function finiteNumber(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

export function formatSolLabel(lamports: string | number | null | undefined): string | null {
  if (lamports == null || lamports === "") return null;
  const n = typeof lamports === "number" ? lamports : Number(lamports);
  if (!Number.isFinite(n) || n === 0) return null;
  const formatted = formatSol(n.toFixed(0));
  return formatted === "—" || formatted === "0 SOL" ? null : formatted;
}

export function solscanTx(signature: string | null | undefined): string | null {
  if (!looksLikeSignature(signature)) return null;
  return `https://solscan.io/tx/${signature}`;
}

export function looksLikeSignature(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value);
}

export function formatBaseAmount(amount: string | null | undefined, decimals: number | null | undefined): string {
  if (!amount) return "—";
  if (decimals == null || decimals < 0) {
    return amount.length > 12 ? `${amount.slice(0, 6)}…` : amount;
  }
  const value = Number(amount) / 10 ** decimals;
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (Math.abs(value) >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}

export function parseImpactPct(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const STAT_PLACEHOLDER = "--";

export function formatJoined(input: string | null | undefined): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatHold(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return STAT_PLACEHOLDER;
  const min = Math.round(ms / 60_000);
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

export function formatStatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return STAT_PLACEHOLDER;
  return formatUsd(value);
}

export function formatStatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return STAT_PLACEHOLDER;
  return formatPct(value);
}
