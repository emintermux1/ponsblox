import { AgentError, type AgentErrorCode } from "@/lib/agent-errors";
import { getDailyVolume, getPermissions } from "@/lib/db";
import { assertNever } from "@/lib/never";
import type { Agent, AgentPermissions, AgentSessionStatus } from "@/lib/types";

export type PermissionDenial = {
  code: AgentErrorCode;
  message: string;
};

export function agentSessionStatus(
  agent: Agent,
  permissions: AgentPermissions | null,
): AgentSessionStatus {
  switch (agent.status) {
    case "revoked":
      return "revoked";
    case "pending_claim":
      return "pending";
    case "claimed": {
      if (
        permissions?.sessionExpiresAt &&
        new Date(permissions.sessionExpiresAt).getTime() <= Date.now()
      ) {
        return "expired";
      }
      return permissions?.tradingEnabled ? "active" : "paused";
    }
    default:
      return assertNever(agent.status, "agent.status");
  }
}

export async function assertTradeAllowed(input: {
  agent: Agent;
  mint: string;
  amountLamports: bigint;
  /** When false, only session / allow-list gates run. Size caps need a real SOL notional. */
  enforceVolumeCaps?: boolean;
}): Promise<{ ok: true; permissions: AgentPermissions } | { ok: false; denial: PermissionDenial }> {
  if (input.agent.status === "pending_claim") {
    return {
      ok: false,
      denial: { code: AgentError.AGENT_NOT_CLAIMED, message: "Human must claim this agent before it can trade." },
    };
  }
  if (input.agent.status === "revoked") {
    return { ok: false, denial: { code: AgentError.AGENT_REVOKED, message: "This agent was revoked." } };
  }
  const permissions = await getPermissions(input.agent.id);
  if (!permissions) {
    return { ok: false, denial: { code: AgentError.TRADING_DISABLED, message: "Permissions are missing." } };
  }
  if (!permissions.tradingEnabled) {
    return {
      ok: false,
      denial: { code: AgentError.TRADING_DISABLED, message: "Trading is off for this agent." },
    };
  }
  if (permissions.sessionExpiresAt && new Date(permissions.sessionExpiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      denial: { code: AgentError.SESSION_EXPIRED, message: "The agent session expired. Human must renew it." },
    };
  }
  if (permissions.allowedMints.length > 0 && !permissions.allowedMints.includes(input.mint)) {
    return {
      ok: false,
      denial: { code: AgentError.ASSET_NOT_ALLOWED, message: "This mint is not on the allow list." },
    };
  }
  if (input.enforceVolumeCaps !== false) {
    const maxTrade = BigInt(permissions.maxPerTradeLamports);
    if (input.amountLamports > maxTrade) {
      return {
        ok: false,
        denial: { code: AgentError.MAX_PER_TRADE, message: "This order exceeds the per-trade cap." },
      };
    }
    const used = await getDailyVolume(input.agent.id);
    if (used + input.amountLamports > BigInt(permissions.maxDailyVolumeLamports)) {
      return {
        ok: false,
        denial: { code: AgentError.DAILY_LIMIT_REACHED, message: "This order exceeds the daily volume cap." },
      };
    }
  }
  return { ok: true, permissions };
}
