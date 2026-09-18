import { peekMarketPulse } from "@/lib/adapters/market";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pulse = await peekMarketPulse();
    return Response.json({ ...pulse, fills: [] });
  } catch {
    return Response.json({
      kind: "QUIET",
      ticker: null,
      name: null,
      changePct: null,
      mint: null,
      source: "sim",
      providers: {
        gecko: "error",
        birdeye: "skip",
        helius: "skip",
        gmgn: "skip",
      },
      fills: [],
    });
  }
}
