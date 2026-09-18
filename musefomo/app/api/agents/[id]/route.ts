import { handleAgentProfile } from "@/lib/api";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return handleAgentProfile(id);
}
