import { agentFromRequest } from "@/lib/agent-auth";
import { heliusRpcUrl } from "@/lib/helius";
import { jsonError } from "@/lib/http";
import { privyFromRequest } from "@/lib/privy";

export async function POST(request: Request) {
  const agent = await agentFromRequest(request);
  const human = agent ? null : await privyFromRequest(request);
  if (!agent && !human) {
    return jsonError(401, "unauthorized", "Agent credential or Privy session required.");
  }
  const body = await request.text();
  if (!body) return jsonError(400, "invalid_rpc", "JSON-RPC body required.");
  const response = await fetch(heliusRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
