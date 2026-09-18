import { getPonsTokens } from "@/lib/pons/tokens";

export async function GET() {
  const result = await getPonsTokens();
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
