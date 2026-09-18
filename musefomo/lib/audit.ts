import { insertAuditEvent } from "@/lib/db";
import { clientIp } from "@/lib/http";
import { safeLog } from "@/lib/log";

export type AuditAction =
  | "claim"
  | "revoke"
  | "permission_change"
  | "trade_request"
  | "trade_execution"
  | "wallet_change";

export async function audit(input: {
  request?: Request;
  action: AuditAction;
  actorType: "agent" | "human" | "webhook" | "system";
  actorId?: string | null;
  agentId?: string | null;
  tradeId?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await insertAuditEvent({
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      agentId: input.agentId ?? null,
      tradeId: input.tradeId ?? null,
      ip: input.request ? clientIp(input.request) : null,
      meta: input.meta ?? {},
    });
  } catch (error) {
    safeLog("error", "audit write failed", {
      action: input.action,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}
