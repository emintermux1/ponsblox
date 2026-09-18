import { config as loadDotenv } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

loadDotenv();

const key = process.env.LAUNCHER_PRIVATE_KEY;
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
  console.error("Set LAUNCHER_PRIVATE_KEY=0x + 64 hex in .env");
  process.exit(1);
}

const account = privateKeyToAccount(key as Hex);
console.log(account.address);
