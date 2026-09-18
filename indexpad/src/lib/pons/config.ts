import type { Address } from "viem";
import { ZERO } from "@/lib/chain";
import { optionalPublicEnv, publicEnv } from "@/lib/env";

function officialAddress(envName: string, published: Address): Address {
  const override = optionalPublicEnv(envName);
  return (override || published) as Address;
}

/** SOURCE: https://docs.ponsfamily.com/v2 — Deployed addresses, Robinhood Chain 4663. */
export const PONS_FACTORY = officialAddress(
  "NEXT_PUBLIC_PONS_FACTORY",
  "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
);

export const PONS_LAUNCH_AND_BUY = officialAddress(
  "NEXT_PUBLIC_PONS_LAUNCH_AND_BUY",
  "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948",
);

export const PONS_DOCS_URL = "https://docs.ponsfamily.com/v2";
export const PONS_TRUST_NOTE =
  "Pons: index the factory and the curves. There is no official Pons API in the trust path.";

export const LAUNCH_CONFIG_ID = BigInt(publicEnv("NEXT_PUBLIC_PONS_LAUNCH_CONFIG_ID", "0"));
export const LOGO_MAX_BYTES = 512;

const pairOverride = optionalPublicEnv("NEXT_PUBLIC_PONS_PAIR");
export const PAIR_TOKEN = (pairOverride || ZERO) as Address;
export const QUOTE_DECIMALS = 18;
