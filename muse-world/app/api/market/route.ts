import { peekMarketPulse } from "@/lib/adapters/market";
import { quietMarketPulse, quietProviders } from "@/lib/adapters/parse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pulse = await peekMarketPulse();
    return Response.json({ ...pulse, fills: [] });
  } catch {
    return Response.json({
      ...quietMarketPulse(quietProviders()),
      fills: [],
    });
  }
}
