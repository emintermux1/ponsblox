import { handleTokenTheses } from "@/lib/api";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ mint: string }> },
) {
  const { mint } = await ctx.params;
  return handleTokenTheses(mint, request);
}
