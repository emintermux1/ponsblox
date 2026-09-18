import { handleTradeWait } from "@/lib/api";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return handleTradeWait(request, id);
}
