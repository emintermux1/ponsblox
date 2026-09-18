import { handleClaimGet, handleClaimPost } from "@/lib/api";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  return handleClaimGet(request, code);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  return handleClaimPost(request, code);
}
