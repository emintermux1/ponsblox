import { serverEnv } from "@/lib/env";
import type { AdapterErr } from "@/types";

export function indexApiBase(): string {
  return serverEnv("INDEXPAD_API_BASE").replace(/\/$/, "");
}

export function indexApiConfigured(): boolean {
  return Boolean(indexApiBase());
}

export function notConfigured(message: string): AdapterErr {
  return { ok: false, code: "not_configured", message };
}

export async function indexApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = indexApiBase();
  if (!base) {
    throw new Error("INDEXPAD_API_BASE is not configured");
  }
  const key = serverEnv("INDEXPAD_API_KEY");
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (key) headers.set("Authorization", `Bearer ${key}`);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Index API ${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}
