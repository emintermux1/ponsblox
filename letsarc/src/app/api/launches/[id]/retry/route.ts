import { loadAdminEnv } from "@/lib/config";
import { isAdminRequest, unauthorized } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/db/singleton";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const env = loadAdminEnv();
  if (!isAdminRequest(req, env.ADMIN_SECRET)) return unauthorized();
  const { id } = await context.params;
  const store = getAdminStore();
  try {
    const row = await store.requestRetry(id);
    return Response.json({ ok: true, launch: row });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 409 },
    );
  }
}
