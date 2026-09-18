import { parseAbi } from "viem";

/** Extracted from live Argus bundle 02h_rnuho6zqe.js (2026-09-16). */
export const portalCommonAbi = parseAbi([
  "function tokenCount() view returns (uint256)",
  "function getTokens(uint256 offset, uint256 limit) view returns (address[])",
  "function LAUNCH_STRUCT_WORDS() view returns (uint8)",
  "function registry() view returns (address)",
  "function quoteApproved(address quote) view returns (bool)",
  "function tokenImpl() view returns (address)",
  "function treasuryBps() view returns (uint16)",
  "function predictSplitter(address creator, bytes32 salt) view returns (address)",
  "function hookInitCodeHash(address splitter, uint16 buyTaxBps, uint16 sellTaxBps, address quote) view returns (bytes32)",
  "function predictHook(address creator, bytes32 salt, bytes32 hookSalt, uint16 buyTaxBps, uint16 sellTaxBps, address quote) view returns (address hook, uint160 mask, bool valid)",
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, bytes32 poolId, string imageURI, string website, string twitter, string telegram)",
]);

export const portal7LaunchAbi = parseAbi([
  "struct TokenMeta { string imageURI; string website; string twitter; string telegram; string description; }",
  "struct LaunchParams7 { string name; string symbol; uint256 totalSupply; uint256 startFdvUsdc6; uint256 bondFdvUsdc6; uint16 buyTaxBps; uint16 sellTaxBps; uint16 creatorBps; uint16 burnBps; uint16 dividendBps; uint16 liquidityBps; uint256 devBuyQuote; address quoteAsset; uint8 expectConvert; }",
  "function launch(LaunchParams7 p, TokenMeta meta, bytes32 salt, bytes32 hookSalt) returns (address token)",
]);

export const quoteRouteRegistryAbi = parseAbi([
  "function payoutAssetFor(address quote) view returns (address)",
]);

export const erc20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
]);
