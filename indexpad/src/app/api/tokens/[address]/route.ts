import { getPonsToken } from "@/lib/pons/tokens";

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;
  const result = await getPonsToken(address);
  const status = result.ok ? 200 : result.code === "not_found" ? 404 : result.code === "invalid" ? 400 : 502;
  return Response.json(result, { status });
}
