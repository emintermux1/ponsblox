import { safeEqual } from "../x/webhook.js";

export const ADMIN_COOKIE = "letsarc_admin";

export function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function isAdminRequest(req: Request, secret: string): boolean {
  const header = req.headers.get("x-admin-secret") ?? "";
  if (header && safeEqual(header, secret)) return true;
  const fromCookie = cookieValue(req.headers.get("cookie"), ADMIN_COOKIE);
  return Boolean(fromCookie && safeEqual(fromCookie, secret));
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function adminCookieHeader(secret: string): string {
  return `${ADMIN_COOKIE}=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}
