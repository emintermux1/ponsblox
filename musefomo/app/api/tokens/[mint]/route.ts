import { handleToken } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET(
  request: Request,
  ctx: { params: Promise<{ mint: string }> },
) {
  const { mint } = await ctx.params;
  return handleToken(mint, request);
}
