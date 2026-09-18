import { dbHealth } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET() {
  const db = await dbHealth();
  return jsonOk({
    ok: db,
    app: "musefomo",
    layers: {
      privy: Boolean(process.env.PRIVY_APP_ID),
      dflow: Boolean(process.env.DFLOW_API_KEY),
      helius: Boolean(process.env.HELIUS_API_KEY),
      fomoscan: Boolean(process.env.FOMOSCAN_API_KEY),
      birdeye: Boolean(process.env.BIRDEYE_API_KEY),
      solscan: Boolean(process.env.SOLSCAN_API_KEY),
      gmgn: Boolean(process.env.GMGN_API_KEY),
      pump: true,
      database: db,
      sessionSigner: Boolean(process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY),
      webhook: Boolean(process.env.HELIUS_WEBHOOK_SECRET),
      nextPublicPrivy: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    },
  });
}
