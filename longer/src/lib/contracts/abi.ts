import { parseAbi } from 'viem'

/**
 * Documented Pons V2 ABIs only.
 * SOURCE: https://docs.ponsfamily.com/v2
 */
export const FACTORY_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'struct LaunchConfig { uint256 supply; uint256 curveFeeBps; uint256 phantomQuote; uint256 graduationThreshold; uint24 poolFee; int24 tickSpacing; bool enabled; }',
  'function approvedPairTokens(address pairToken) view returns (bool)',
  'function pairTokenEconomics(address pairToken) view returns (uint256 phantomQuote, uint256 graduationThreshold, uint8 decimals)',
  'function launchFee() view returns (uint256)',
  'function launchEnabled() view returns (bool)',
  'function canLaunch(address account) view returns (bool)',
  'function maxCreatorTaxBps() view returns (uint256)',
  'function launchConfigCount() view returns (uint256)',
  'function getLaunchConfig(uint256 id) view returns (LaunchConfig)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
  'function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)',
  'function getLaunchedToken(address token) view returns ((address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists))',
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])

export const ROUTER_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function launchAndBuy(TokenParams params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)',
])

export const CURVE_ABI = parseAbi([
  'function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)',
  'function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) returns (uint256 quoteOut)',
  'function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)',
  'function graduated() view returns (bool)',
  'function sellableTokens() view returns (uint256)',
  'function readyToGraduate() view returns (bool)',
  'function pairToken() view returns (address)',
])

export const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function logo() view returns (string)',
  'function description() view returns (string)',
  'function website() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

export const TOKEN_INFO_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, Socials tokenSocials)',
])

export const TOKEN_LAUNCHED = parseAbi([
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])[0]
