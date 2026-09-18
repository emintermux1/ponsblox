import { parseAbi } from 'viem'

/** SOURCE: https://docs.ponsfamily.com/v2 */
export const FACTORY_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function launchFee() view returns (uint256)',
  'function launchEnabled() view returns (bool)',
  'function canLaunch(address account) view returns (bool)',
  'function maxCreatorTaxBps() view returns (uint256)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
  'function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)',
  'function getLaunchedToken(address token) view returns ((address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists))',
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])

export const TOKEN_LAUNCHED = parseAbi([
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])[0]

export const ROUTER_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function launchAndBuy(TokenParams params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)',
])
