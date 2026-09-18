import { createHmac, timingSafeEqual } from "node:crypto";

import { webhookDeliveryKey } from "@/lib/confirm-machine";
import { serverEnv } from "@/lib/env";

export const WEBHOOK_SIGNATURE_HEADERS = [
  "x-helius-signature",
  "x-webhook-signature",
  "webhook-signature",
] as const;

export type SignedWebhook =
  | { ok: true; rawBody: string }
  | { ok: false; status: number; code: string; message: string };

function decodeSignature(value: string): Buffer | null {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("sha256=") ? trimmed.slice("sha256=".length) : trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  try {
    const buf = Buffer.from(hex, "base64");
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

export function readWebhookSignature(headers: Headers): string | null {
  for (const name of WEBHOOK_SIGNATURE_HEADERS) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

export function signWebhookBody(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookHmac(secret: string, rawBody: string, signatureHeader: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = decodeSignature(signatureHeader);
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}

function headerWebhookSecret(headers: Headers): string | null {
  const dedicated = headers.get("x-helius-secret")?.trim();
  if (dedicated) return dedicated;
  const authorization = headers.get("authorization") ?? headers.get("Authorization");
  if (!authorization) return null;
  return authorization.replace(/^Bearer\s+/i, "").trim() || null;
}

function timingSafeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Funds-security owns signature verification + delivery idempotency.
 * Secret may live in a header only — `?secret=` is always rejected.
 * Unsigned bodies (no HMAC and no secret header) are rejected.
 */
export async function verifySignedWebhook(request: Request): Promise<SignedWebhook> {
  const url = new URL(request.url);
  if (url.searchParams.has("secret") || url.searchParams.has("token")) {
    return {
      ok: false,
      status: 401,
      code: "unsigned_webhook",
      message: "Webhook secrets in the query string are rejected.",
    };
  }
  const secret = serverEnv().heliusWebhookSecret;
  if (!secret) {
    return { ok: false, status: 503, code: "webhook_unconfigured", message: "HELIUS_WEBHOOK_SECRET is not set." };
  }
  const signature = readWebhookSignature(request.headers);
  const headerSecret = headerWebhookSecret(request.headers);
  if (!signature && !headerSecret) {
    return { ok: false, status: 401, code: "unsigned_webhook", message: "HMAC signature or webhook secret header required." };
  }
  const rawBody = await request.text();
  if (signature) {
    if (!verifyWebhookHmac(secret, rawBody, signature)) {
      return { ok: false, status: 401, code: "invalid_webhook_signature", message: "Webhook signature mismatch." };
    }
    return { ok: true, rawBody };
  }
  if (!headerSecret || !timingSafeEqualString(headerSecret, secret)) {
    return { ok: false, status: 401, code: "invalid_webhook_signature", message: "Webhook secret header mismatch." };
  }
  return { ok: true, rawBody };
}

export function deliveryKeyFromEvent(event: {
  signature: string;
  slot?: number | null;
  confirmationStatus?: string | null;
  transactionIndex?: number | null;
  executionId?: string | null;
}): string {
  return webhookDeliveryKey({
    signature: event.signature,
    slot: event.slot,
    confirmationStatus: event.confirmationStatus,
    executionId: event.executionId ?? (event.transactionIndex != null ? String(event.transactionIndex) : null),
  });
}
