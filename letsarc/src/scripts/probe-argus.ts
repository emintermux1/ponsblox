import { createPublicClient, http } from "viem";
import {
  ARC_ADDRESSES,
  ARC_CHAIN_ID,
  ARC_RPC_URLS,
  ARGUS_CONSTANTS,
  LAUNCH_PORTAL,
} from "../lib/argus/addresses.js";
import { portalCommonAbi } from "../lib/argus/abi.js";
import { arcMainnet, assertPortalReady } from "../lib/argus/launch.js";
import { placeholderPng, uploadToArgus } from "../lib/media/upload.js";

async function main(): Promise<void> {
  const client = createPublicClient({
    chain: arcMainnet,
    transport: http(ARC_RPC_URLS[0], { timeout: 12_000 }),
  });
  const chainId = await client.getChainId();
  if (chainId !== ARC_CHAIN_ID) {
    throw new Error(`Unexpected chain ${chainId}`);
  }
  await assertPortalReady(client);
  const words = await client.readContract({
    address: LAUNCH_PORTAL,
    abi: portalCommonAbi,
    functionName: "LAUNCH_STRUCT_WORDS",
  });
  const approved = await client.readContract({
    address: LAUNCH_PORTAL,
    abi: portalCommonAbi,
    functionName: "quoteApproved",
    args: [ARC_ADDRESSES.usdc],
  });
  console.log(`rpc ${ARC_RPC_URLS[0]}`);
  console.log(`chain ${chainId}`);
  console.log(`portal ${LAUNCH_PORTAL}`);
  console.log(`LAUNCH_STRUCT_WORDS ${words} expected ${ARGUS_CONSTANTS.launchStructWords}`);
  console.log(`usdc approved ${approved}`);

  const pinning = await fetch("https://argus.world/api/upload");
  console.log(`upload GET ${pinning.status} ${await pinning.text()}`);

  try {
    const file = placeholderPng();
    const uri = await uploadToArgus({
      bytes: file.bytes,
      filename: file.filename,
      contentType: file.contentType,
      description: "letsarc probe",
    });
    console.log(`upload uri ${uri}`);
  } catch (err) {
    console.warn(
      `upload POST skipped: ${err instanceof Error ? err.message : err}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
