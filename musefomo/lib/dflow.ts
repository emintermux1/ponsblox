import { DEFAULT_SLIPPAGE_BPS, QUOTE_BUDGET_MS, QUOTE_TTL_MS } from "@/lib/constants";
import { raceTimeout } from "@/lib/fast-fetch";

export type DflowOrder = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  minOutAmount: string;
  slippageBps: number;
  priceImpactPct: string;
  contextSlot: number;
  lastValidBlockHeight?: number;
  transaction?: string;
  transactionVersion?: string;
  prioritizationFeeLamports?: number;
};

export type DflowResult =
  | { ok: true; order: DflowOrder }
  | { ok: false; status: number; message: string; body: unknown };

const quoteMemo = new Map<string, { at: number; result: Extract<DflowResult, { ok: true }> }>();
const quoteInflight = new Map<string, Promise<DflowResult>>();
const QUOTE_MEMO_MS = 2_000;

function memoKey(input: {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey?: string;
  slippageBps: number;
}): string {
  return [
    input.inputMint,
    input.outputMint,
    input.amount,
    input.userPublicKey ?? "",
    String(input.slippageBps),
  ].join(":");
}

function dflowKey(): string | null {
  return process.env.DFLOW_API_KEY?.trim() || null;
}

const timedOut: DflowResult = { ok: false, status: 504, message: "Quote timed out", body: null };
const unavailable: DflowResult = { ok: false, status: 503, message: "Quote unavailable", body: null };

function lastGood(key: string): Extract<DflowResult, { ok: true }> | null {
  const memo = quoteMemo.get(key);
  if (!memo) return null;
  if (Date.now() - memo.at > QUOTE_TTL_MS) {
    quoteMemo.delete(key);
    return null;
  }
  return memo.result;
}

function refreshQuote(
  key: string,
  params: URLSearchParams,
  apiKey: string,
  slippageBps: number,
): Promise<DflowResult> {
  const pending = quoteInflight.get(key);
  if (pending) return pending;
  const work = raceTimeout(orderOnce(params, apiKey, slippageBps), lastGood(key) ?? timedOut, QUOTE_BUDGET_MS)
    .then((result) => {
      if (result.ok) quoteMemo.set(key, { at: Date.now(), result });
      return result;
    })
    .finally(() => {
      if (quoteInflight.get(key) === work) quoteInflight.delete(key);
    });
  quoteInflight.set(key, work);
  return work;
}

export async function dflowOrder(input: {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey?: string;
  slippageBps?: number;
}): Promise<DflowResult> {
  const slippageBps = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const key = memoKey({ ...input, slippageBps });
  const cached = lastGood(key);
  const params = new URLSearchParams({
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    amount: input.amount,
    slippageBps: String(slippageBps),
  });
  if (input.userPublicKey) params.set("userPublicKey", input.userPublicKey);

  const apiKey = dflowKey();
  if (cached) {
    const age = Date.now() - (quoteMemo.get(key)?.at ?? 0);
    if (apiKey && age >= QUOTE_MEMO_MS) void refreshQuote(key, params, apiKey, slippageBps);
    return cached;
  }
  if (!apiKey) return unavailable;
  return refreshQuote(key, params, apiKey, slippageBps);
}

async function orderOnce(
  params: URLSearchParams,
  apiKey: string,
  slippageBps: number,
): Promise<DflowResult> {
  let response: Response;
  try {
    response = await fetch(`https://quote-api.dflow.net/order?${params.toString()}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(QUOTE_BUDGET_MS),
    });
  } catch {
    return timedOut;
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") {
    return {
      ok: false,
      status: response.status,
      message: "dflow order failed",
      body,
    };
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.inputMint !== "string" || typeof raw.outAmount !== "string") {
    return { ok: false, status: response.status, message: "dflow order shape unexpected", body };
  }
  return {
    ok: true,
    order: {
      inputMint: raw.inputMint,
      outputMint: String(raw.outputMint),
      inAmount: String(raw.inAmount),
      outAmount: raw.outAmount,
      otherAmountThreshold: String(raw.otherAmountThreshold ?? raw.minOutAmount ?? ""),
      minOutAmount: String(raw.minOutAmount ?? raw.otherAmountThreshold ?? ""),
      slippageBps: Number(raw.slippageBps ?? slippageBps),
      priceImpactPct: String(raw.priceImpactPct ?? "0"),
      contextSlot: Number(raw.contextSlot ?? 0),
      lastValidBlockHeight:
        typeof raw.lastValidBlockHeight === "number" ? raw.lastValidBlockHeight : undefined,
      transaction: typeof raw.transaction === "string" ? raw.transaction : undefined,
      transactionVersion:
        typeof raw.transactionVersion === "string" ? raw.transactionVersion : undefined,
      prioritizationFeeLamports:
        typeof raw.prioritizationFeeLamports === "number"
          ? raw.prioritizationFeeLamports
          : undefined,
    },
  };
}
