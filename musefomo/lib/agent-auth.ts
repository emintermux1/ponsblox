import { createHash, randomBytes } from "node:crypto";

import { findAgentByCredentialHash } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { bearerToken } from "@/lib/http";
import type { Agent } from "@/lib/types";

export function hashCredential(token: string): string {
  return createHash("sha256")
    .update(`${serverEnv().credentialPepper}:${token}`)
    .digest("hex");
}

export function hashClaimCode(code: string): string {
  return createHash("sha256")
    .update(`${serverEnv().credentialPepper}:claim:${code}`)
    .digest("hex");
}

export function mintCredential(agentId: string): { token: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const token = `mf_live_${agentId.replace(/-/g, "").slice(0, 12)}_${secret}`;
  return { token, hash: hashCredential(token) };
}

export function mintClaimCode(): string {
  let code = "";
  while (code.length < 22) {
    code += randomBytes(16).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
  }
  return code.slice(0, 22);
}

export function mintHandle(): string {
  return `muse_${randomBytes(3).toString("hex")}`;
}

export async function agentFromRequest(request: Request): Promise<Agent | null> {
  const token = bearerToken(request);
  if (!token || !token.startsWith("mf_live_")) return null;
  const agent = await findAgentByCredentialHash(hashCredential(token));
  if (!agent || agent.status === "revoked") return null;
  return agent;
}
