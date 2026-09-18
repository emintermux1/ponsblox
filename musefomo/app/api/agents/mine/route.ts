import { handleHumanAgents } from "@/lib/api";

export async function GET(request: Request) {
  return handleHumanAgents(request);
}
