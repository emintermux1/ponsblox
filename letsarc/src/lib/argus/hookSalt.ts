import {
  encodeAbiParameters,
  getContractAddress,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { ARGUS_CONSTANTS } from "./addresses.js";

const MAX_ATTEMPTS = 400_000;

/**
 * Mines a Uniswap v4 hook salt the same way the Argus create form does:
 * CREATE2(from=portal, salt=keccak256(abi.encode(creator, hookSalt)), bytecodeHash).
 * Valid when (hook & hookFlagMask) === hookFlags.
 */
export function mineHookSalt(args: {
  portal: Address;
  creator: Address;
  initCodeHash: Hex;
}): { hookSalt: Hex; hook: Address; attempts: number } {
  const seedBytes = crypto.getRandomValues(new Uint8Array(24));
  let seed = BigInt(toHex(seedBytes));

  for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
    const hookSalt = toHex(seed + BigInt(i), { size: 32 });
    const create2Salt = keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "bytes32" }],
        [args.creator, hookSalt],
      ),
    );
    const hook = getContractAddress({
      opcode: "CREATE2",
      from: args.portal,
      salt: create2Salt,
      bytecodeHash: args.initCodeHash,
    });
    if (
      (BigInt(hook) & ARGUS_CONSTANTS.hookFlagMask) ===
      ARGUS_CONSTANTS.hookFlags
    ) {
      return { hookSalt, hook, attempts: i };
    }
  }

  throw new Error("Could not mine a valid Argus hook salt");
}
