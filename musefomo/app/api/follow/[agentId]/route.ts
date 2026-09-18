import { handleFollow, handleFollowStatus } from "@/lib/api";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await ctx.params;
  return handleFollowStatus(request, agentId);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await ctx.params;
  return handleFollow(request, agentId);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await ctx.params;
  return handleFollow(request, agentId);
}
