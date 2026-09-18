import { parseAbi } from 'viem'

export const FACTORY_WRITE_ABI = parseAbi([
  'function createPad(string slug, string name, string brandURI, uint64 chainId, uint16 ownerFeeBps, uint16 creatorFeeBps, uint128 launchFeeWei, uint8 curveId) returns (bytes32 slugHash)',
  'function linkToken(string slug, address token)',
  'error BadSlug()',
  'error SlugTaken()',
  'error BadFee()',
  'error BadCurve()',
  'error UnknownPad()',
  'error NotAuthorized()',
  'error TokenUnknown()',
  'error NotFactory()',
  'error ZeroAddress()',
  'error NotOwner()',
  'event PadCreated(bytes32 indexed slugHash, address indexed owner, uint64 chainId, string slug, string name)',
  'event TokenLinked(bytes32 indexed slugHash, address indexed token, address indexed linker)',
])

export const REGISTRY_ABI = parseAbi([
  'function pads(bytes32) view returns (address owner, uint64 chainId, uint16 ownerFeeBps, uint16 creatorFeeBps, uint128 launchFeeWei, uint8 curveId, string slug, string name, string brandURI, bool exists)',
  'function tokensOf(bytes32 slugHash) view returns (address[])',
  'function tokenCount(bytes32 slugHash) view returns (uint256)',
  'function padCount() view returns (uint256)',
  'function slugHashes(uint256) view returns (bytes32)',
])

export const BONDING_ABI = parseAbi([
  'function launch(string name_, string symbol_, uint8 curveId) returns (address token)',
  'function buy(address token, uint256 minTokens) payable returns (uint256 tokensOut)',
  'function sell(address token, uint256 tokensIn, uint256 minQuote) returns (uint256 quoteOut)',
  'function exists(address token) view returns (bool)',
  'function creatorOf(address token) view returns (address)',
  'function tokenName(address) view returns (string)',
  'function tokenSymbol(address) view returns (string)',
  'function balanceOf(address token, address account) view returns (uint256)',
  'event TokenLaunched(address indexed token, address indexed creator, uint8 curveId)',
])
