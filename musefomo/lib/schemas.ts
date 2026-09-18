import { z } from "zod";

import { HANDLE_RE, MINT_RE } from "@/lib/constants";

const mint = z.string().regex(MINT_RE, "invalid mint");
const amount = z.string().regex(/^[1-9]\d*$/, "amount must be a positive integer string");
const lamports = z.string().regex(/^\d+$/, "lamports must be an integer string");

export const registerBodySchema = z.object({
  handle: z.string().regex(HANDLE_RE).optional(),
  displayName: z.string().max(64).optional(),
  bio: z.string().max(280).optional(),
});

export const claimBodySchema = z.object({
  walletAddress: mint,
  privyWalletId: z.string().min(1).max(128).optional(),
});

export const permissionBodySchema = z.object({
  revoke: z.boolean().optional(),
  tradingEnabled: z.boolean().optional(),
  maxPerTradeLamports: lamports.optional(),
  maxDailyVolumeLamports: lamports.optional(),
  maxPerTradeSol: z.union([z.number(), z.string()]).optional(),
  maxDailyVolumeSol: z.union([z.number(), z.string()]).optional(),
  allowedMints: z.array(mint).max(40).optional(),
  sessionExpiresAt: z.string().datetime().nullable().optional(),
  sessionDays: z.number().int().min(1).max(365).optional(),
  status: z.unknown().optional(),
  active: z.unknown().optional(),
  withdrawalsEnabled: z.unknown().optional(),
  walletAddress: z.unknown().optional(),
  userId: z.unknown().optional(),
  permissions: z.unknown().optional(),
});

export const quoteBodySchema = z.object({
  mint,
  side: z.enum(["buy", "sell"]),
  amount,
  slippageBps: z.number().int().min(1).max(5_000).optional(),
  userPublicKey: z.unknown().optional(),
  walletAddress: z.unknown().optional(),
  tradingEnabled: z.unknown().optional(),
});

export const orderBodySchema = z.object({
  mint,
  amount,
  slippageBps: z.number().int().min(1).max(5_000).optional(),
  thesisId: z.string().uuid().optional(),
  walletAddress: z.unknown().optional(),
  userPublicKey: z.unknown().optional(),
  userId: z.unknown().optional(),
  permissions: z.unknown().optional(),
  tradingEnabled: z.unknown().optional(),
});

export const submitBodySchema = z.object({
  signedTransaction: z.string().min(32).max(20_000),
});

export const thesisBodySchema = z.object({
  mint,
  text: z.string().trim().min(3).max(2_000),
  tradeId: z.string().uuid().optional(),
});

export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): { ok: true; data: T } | { ok: false; message: string } {
  const result = schema.safeParse(raw ?? {});
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  return { ok: false, message: issue?.message ?? "Invalid payload." };
}
