import { createRemoteJWKSet, jwtVerify } from "jose";
import { PrivyClient } from "@privy-io/node";

import { bearerToken } from "@/lib/http";
import { serverEnv } from "@/lib/env";

let privy: PrivyClient | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function client(): PrivyClient {
  if (privy) return privy;
  const env = serverEnv();
  privy = new PrivyClient({
    appId: env.privyAppId,
    appSecret: env.privyAppSecret,
  });
  return privy;
}

export type PrivyIdentity = {
  userId: string;
  email: string | null;
};

async function verifyViaSdk(token: string): Promise<PrivyIdentity | null> {
  try {
    const utils = client().utils();
    const auth = utils.auth();
    if (typeof auth.verifyAccessToken === "function") {
      const claims = await auth.verifyAccessToken(token);
      const record = claims as { user_id?: string; userId?: string };
      const userId = record.user_id ?? record.userId;
      if (!userId) return null;
      return { userId, email: null };
    }
    if (typeof auth.verifyAuthToken === "function") {
      const claims = await auth.verifyAuthToken(token);
      const record = claims as { user_id?: string; userId?: string };
      const userId = record.user_id ?? record.userId;
      if (!userId) return null;
      return { userId, email: null };
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyViaJwks(token: string): Promise<PrivyIdentity | null> {
  try {
    const env = serverEnv();
    if (!jwks) jwks = createRemoteJWKSet(new URL(env.privyJwksUrl));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: "privy.io",
      audience: env.privyAppId,
    });
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) return null;
    return { userId, email: null };
  } catch {
    return null;
  }
}

export async function verifyPrivyToken(token: string): Promise<PrivyIdentity | null> {
  return (await verifyViaSdk(token)) ?? verifyViaJwks(token);
}

export async function privyFromRequest(request: Request): Promise<PrivyIdentity | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyPrivyToken(token);
}

export type OwnedSolanaWallet = {
  address: string;
  id: string | null;
};

function isSolanaWallet(account: {
  type?: string;
  chain_type?: string;
  address?: string;
}): account is { type: "wallet"; chain_type: "solana"; address: string; id?: string | null } {
  return account.type === "wallet" && account.chain_type === "solana" && typeof account.address === "string";
}

export async function resolveOwnedSolanaWallet(
  userId: string,
  requestedAddress?: string,
): Promise<OwnedSolanaWallet | null> {
  try {
    const user = await client().users()._get(userId);
    const wallets = user.linked_accounts.filter((account) =>
      isSolanaWallet(account as { type?: string; chain_type?: string; address?: string }),
    ) as Array<{ type: "wallet"; chain_type: "solana"; address: string; id?: string | null }>;
    if (!wallets.length) return null;
    if (requestedAddress) {
      const match = wallets.find((wallet) => wallet.address === requestedAddress);
      if (!match) return null;
      return {
        address: match.address,
        id: "id" in match && typeof match.id === "string" ? match.id : null,
      };
    }
    const match =
      wallets.find((wallet) => "wallet_client" in wallet && wallet.wallet_client === "privy") ?? wallets[0];
    if (!match) return null;
    return {
      address: match.address,
      id: "id" in match && typeof match.id === "string" ? match.id : null,
    };
  } catch {
    return null;
  }
}

export function hasSessionSignerKey(): boolean {
  return Boolean(serverEnv().privyAuthorizationPrivateKey);
}
