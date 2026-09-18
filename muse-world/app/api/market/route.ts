import { peekMarketPulse } from "@/lib/adapters/market";

export const dynamic = "force-dynamic";

export async function GET() {
  const pulse = await peekMarketPulse();
  return Response.json(pulse);
}
