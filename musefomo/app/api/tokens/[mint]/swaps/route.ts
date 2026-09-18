import { handleTokenSwaps } from "@/lib/api";

export async function GET(_request: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  return handleTokenSwaps(mint);
}
