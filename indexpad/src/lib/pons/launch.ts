import { isAddress, type Address, type WalletClient } from "viem";
import type { AdapterCode, AdapterResult, IndexLaunch, LaunchIndexCoinInput } from "@/types";
import { persistConfirmedLaunch } from "@/lib/indexpad/launch-store";
import { buildLaunchCall, readCanLaunch, sendLaunch, validateLaunchDraft } from "./factory";

export class LaunchAdapterError extends Error {
  readonly code: AdapterCode;

  constructor(code: AdapterCode, message: string) {
    super(message);
    this.name = "LaunchAdapterError";
    this.code = code;
  }
}

function fail(code: AdapterCode, message: string): AdapterResult<IndexLaunch> {
  return { ok: false, code, message };
}

export async function launchIndexCoin(
  wallet: WalletClient | null | undefined,
  account: Address | null | undefined,
  input: LaunchIndexCoinInput,
): Promise<AdapterResult<IndexLaunch>> {
  if (!wallet || !account || !isAddress(account)) {
    return fail("rejected", "Connect a wallet to launch this index coin.");
  }

  const draftError = validateLaunchDraft(input);
  if (draftError) return fail("invalid", draftError);
  if (!input.description.trim()) return fail("invalid", "Description is required");
  if (!input.logo.trim()) return fail("invalid", "Image is required — use an https:// or ipfs:// link");

  const base: IndexLaunch = {
    indexId: input.indexId ?? null,
    name: input.name.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    logo: input.logo.trim(),
    description: input.description.trim(),
    quoteIn: input.quoteIn.trim(),
    recipient: input.recipient,
    txHash: null,
    tokenAddress: null,
    curveAddress: null,
    status: "prepared",
    error: null,
  };

  try {
    const allowed = await readCanLaunch(account);
    if (!allowed) {
      return fail("rejected", "This wallet cannot launch on Pons yet.");
    }

    const call = await buildLaunchCall(input);
    const receipt = await sendLaunch(wallet, account, call);
    if (!receipt.token || !isAddress(receipt.token)) {
      return fail("upstream", "Pons mined without a TokenLaunched address. No token address is shown.");
    }

    const confirmed: IndexLaunch = {
      ...base,
      txHash: receipt.hash,
      tokenAddress: receipt.token,
      curveAddress: receipt.curve,
      status: "confirmed",
    };

    persistConfirmedLaunch(account, confirmed, input.indexId ?? null);
    return { ok: true, data: confirmed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Launch failed";
    if (/User rejected|denied|4001|Wallet rejected/i.test(message)) {
      return fail("rejected", "Wallet rejected the launch.");
    }
    if (/not configured|INDEXPAD_API|PINATA/i.test(message)) {
      return fail("not_configured", message);
    }
    return fail("upstream", message);
  }
}
