import { handleTradeSubmit } from "@/lib/api";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return handleTradeSubmit(request, id);
}
