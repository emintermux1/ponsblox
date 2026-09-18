import { createPublicClient, formatUnits, http } from "viem";
import { ARC_CHAIN_ID, ARC_RPC_URLS, LAUNCH_PORTAL } from "./argus/addresses.js";
import { assertPortalReady, arcMainnet } from "./argus/launch.js";
import type { Store } from "./db/store.js";

export type Probe = {
  ok: boolean;
  detail: string;
};

export async function probeDatabase(store: Store): Promise<Probe> {
  try {
    const ok = await store.ping();
    return { ok, detail: ok ? "connected" : "ping failed" };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function probeArcRpc(): Promise<Probe> {
  const client = createPublicClient({
    chain: arcMainnet,
    transport: http(ARC_RPC_URLS[0], { timeout: 8_000 }),
  });
  try {
    const chainId = await client.getChainId();
    if (chainId !== ARC_CHAIN_ID) {
      return { ok: false, detail: `chain ${chainId}` };
    }
    return { ok: true, detail: `chain ${chainId}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function probeArgus(): Promise<Probe> {
  const client = createPublicClient({
    chain: arcMainnet,
    transport: http(ARC_RPC_URLS[0], { timeout: 8_000 }),
  });
  try {
    await assertPortalReady(client);
    const upload = await fetch("https://argus.world/api/upload", {
      method: "GET",
    });
    const json = (await upload.json().catch(() => null)) as { pinning?: boolean } | null;
    if (upload.ok && json?.pinning) {
      return { ok: true, detail: `portal ${LAUNCH_PORTAL} + upload live` };
    }
    return { ok: true, detail: `portal ${LAUNCH_PORTAL} (upload GET ${upload.status})` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function probeWallet(
  store: Store,
): Promise<Probe & { address: string | null; balance: string | null }> {
  const address = await store.getMeta("launcher_address");
  if (!address) {
    return {
      ok: false,
      detail: "worker has not published launcher_address yet",
      address: null,
      balance: null,
    };
  }
  const client = createPublicClient({
    chain: arcMainnet,
    transport: http(ARC_RPC_URLS[0], { timeout: 8_000 }),
  });
  try {
    const wei = await client.getBalance({ address: address as `0x${string}` });
    return {
      ok: true,
      detail: "connected",
      address,
      balance: `${formatUnits(wei, 18)} USDC`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      address,
      balance: null,
    };
  }
}

export async function probeX(store: Store): Promise<Probe> {
  const heartbeat = await store.getMeta("worker_heartbeat_ms");
  const transport = (await store.getMeta("x_transport")) ?? "unknown";
  const lastError = await store.getMeta("x_last_error");
  if (!heartbeat) {
    return { ok: false, detail: "worker offline" };
  }
  const age = Date.now() - Number(heartbeat);
  if (Number.isNaN(age) || age > 20_000) {
    return { ok: false, detail: `worker stale (${age}ms) via ${transport}` };
  }
  if (lastError) {
    return { ok: false, detail: `${transport}: ${lastError}` };
  }
  return { ok: true, detail: `${transport} live` };
}
