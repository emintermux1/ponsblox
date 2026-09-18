import { AgentError } from "@/lib/agent-errors";
import { consumeRateLimit } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";

const memory = new Map<string, { hits: number; resetAt: number }>();

export async function rateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    return await consumeRateLimit(bucket, limit, windowMs);
  } catch {
    const now = Date.now();
    const current = memory.get(bucket);
    if (!current || current.resetAt <= now) {
      memory.set(bucket, { hits: 1, resetAt: now + windowMs });
      return true;
    }
    current.hits += 1;
    return current.hits <= limit;
  }
}

export async function limitOr429(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const ip = clientIp(request);
  const ok = await rateLimit(`${scope}:${ip}`, limit, windowMs);
  if (ok) return null;
  return jsonError(429, AgentError.RATE_LIMITED, "Too many requests. Try again shortly.");
}

export async function limitBucketOr429(bucket: string, limit: number, windowMs: number) {
  const ok = await rateLimit(bucket, limit, windowMs);
  if (ok) return null;
  return jsonError(429, AgentError.RATE_LIMITED, "Too many requests. Try again shortly.");
}
