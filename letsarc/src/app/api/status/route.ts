import { loadAdminEnv } from "@/lib/config";
import { isAdminRequest, unauthorized } from "@/lib/admin/auth";
import { getAdminStore } from "@/lib/db/singleton";
import {
  probeArcRpc,
  probeArgus,
  probeDatabase,
  probeWallet,
  probeX,
} from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const env = loadAdminEnv();
  if (!isAdminRequest(req, env.ADMIN_SECRET)) return unauthorized();

  const store = getAdminStore();
  await store.migrate();
  const [database, rpc, argus, wallet, x] = await Promise.all([
    probeDatabase(store),
    probeArcRpc(),
    probeArgus(),
    probeWallet(store),
    probeX(store),
  ]);
  const launches = await store.listRecent(50);
  return Response.json({
    probes: { x, argus, rpc, database, wallet },
    launches,
  });
}
