import { getIndexPerformance } from "@/lib/indexpad/performance";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await getIndexPerformance(id);
  const status =
    result.ok ? 200 : result.code === "not_configured" ? 503 : result.code === "invalid" ? 400 : 502;
  return Response.json(result, { status });
}
