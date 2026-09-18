import { loadAdminEnv } from "@/lib/config";
import { adminCookieHeader, unauthorized } from "@/lib/admin/auth";
import { safeEqual } from "@/lib/x/webhook";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const env = loadAdminEnv();
  const body = (await req.json().catch(() => null)) as { secret?: string } | null;
  const secret = body?.secret ?? "";
  if (!secret || !safeEqual(secret, env.ADMIN_SECRET)) {
    return unauthorized();
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": adminCookieHeader(env.ADMIN_SECRET),
    },
  });
}
