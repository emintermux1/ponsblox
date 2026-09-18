import { NextResponse } from "next/server";

import type { ApiErrorBody } from "@/lib/types";

export function jsonOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: init?.headers });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export async function readJson<T>(request: Request): Promise<T | null> {
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

export function idempotencyKey(request: Request): string | null {
  const value = request.headers.get("idempotency-key")?.trim() || null;
  if (!value || value.length < 8 || value.length > 128) return null;
  return value;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

export function requireIdempotency(request: Request) {
  const key = idempotencyKey(request);
  if (key) return { ok: true as const, key };
  return {
    ok: false as const,
    response: jsonError(400, "IDEMPOTENCY_REQUIRED", "Idempotency-Key header is required."),
  };
}
