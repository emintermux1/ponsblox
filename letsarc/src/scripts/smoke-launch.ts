import { config as loadDotenv } from "dotenv";
import { parseLaunchCommand } from "../lib/parse/tweet.js";
import {
  assertPortalReady,
  createArcClients,
  getNativeBalance,
  launchOnArgus,
} from "../lib/argus/launch.js";
import { resolveImageUri } from "../lib/media/upload.js";

loadDotenv();

async function main(): Promise<void> {
  if (process.env.CONFIRM_SMOKE !== "1") {
    console.error("Refusing: set CONFIRM_SMOKE=1 to send a real Argus launch.");
    process.exit(1);
  }
  const key = process.env.LAUNCHER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    console.error("Set LAUNCHER_PRIVATE_KEY");
    process.exit(1);
  }
  const parsed = parseLaunchCommand(
    process.env.SMOKE_TEXT ?? "@letslauncharc $ARCTEST Arc Test",
  );
  if (!parsed) {
    console.error("SMOKE_TEXT did not parse");
    process.exit(1);
  }

  const clients = createArcClients({
    privateKey: key as `0x${string}`,
    rpcUrl: process.env.ARC_RPC_URL,
  });
  await assertPortalReady(clients.publicClient);
  const balance = await getNativeBalance(
    clients.publicClient,
    clients.account.address,
  );
  console.log(`launcher ${clients.account.address} balance_wei=${balance}`);

  const imageUri = await resolveImageUri({
    sourceMedia: null,
    description: "Let’s Arc smoke launch",
    pinataJwt: process.env.PINATA_JWT,
  });

  const result = await launchOnArgus({
    publicClient: clients.publicClient,
    walletClient: clients.walletClient,
    account: clients.account,
    input: {
      name: parsed.name,
      symbol: parsed.ticker,
      imageUri,
      description: "Let’s Arc smoke launch",
      twitter: "https://x.com/letslauncharc",
      website: "https://argus.world",
    },
    onStage: (stage) => {
      console.log(`[smoke] ${stage}`);
    },
    onSubmitted: (hash) => {
      console.log(`[smoke] submitted ${hash}`);
    },
  });
  console.log(`[smoke] token ${result.token}`);
  console.log(`[smoke] ${result.argusUrl}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
