import { existsSync, readFileSync, appendFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  http,
  parseAbi,
  parseEventLogs,
  parseUnits,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv(resolve(root, '.env'))

const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e'
const ROUTER = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948'
const MRVL = '0x62fd0668e10D8B72339BE2DCF7643001688ff13B'
const LAUNCH_CONFIG_ID = 0n

const FACTORY_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function approvedPairTokens(address pairToken) view returns (bool)',
  'function pairTokenEconomics(address pairToken) view returns (uint256 phantomQuote, uint256 graduationThreshold, uint8 decimals)',
  'function launchFee() view returns (uint256)',
  'function launchEnabled() view returns (bool)',
  'function canLaunch(address account) view returns (bool)',
  'function maxCreatorTaxBps() view returns (uint256)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
  'function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)',
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
])

const ROUTER_ABI = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
  'function launchAndBuy(TokenParams params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)',
])

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

const rhc = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RHC_RPC || 'https://rpc.mainnet.chain.robinhood.com'] } },
})

const publicClient = createPublicClient({
  chain: rhc,
  transport: http(rhc.rpcUrls.default.http[0]),
})

function ensureWallet() {
  const envPath = resolve(root, '.env')
  if ((process.env.LAUNCH_PRIVATE_KEY || '').startsWith('0x')) {
    const account = privateKeyToAccount(process.env.LAUNCH_PRIVATE_KEY)
    if (!process.env.LAUNCH_ADDRESS) {
      appendFileSync(envPath, `LAUNCH_ADDRESS=${account.address}\n`)
      process.env.LAUNCH_ADDRESS = account.address
    }
    return { account, created: false }
  }
  const key = generatePrivateKey()
  const account = privateKeyToAccount(key)
  const block = [
    '',
    `LAUNCH_PRIVATE_KEY=${key}`,
    `LAUNCH_ADDRESS=${account.address}`,
    `PONS_PAIR=${MRVL}`,
    'TOKEN_NAME=Spooder-Man',
    'TOKEN_SYMBOL=SPOODERMAN',
    'TOKEN_TWITTER=',
    'TOKEN_DESCRIPTION=',
    'TOKEN_LOGO=',
    'TOKEN_CREATOR_TAX_BPS=100',
    'TOKEN_BUYBACK=false',
    'TOKEN_QUOTE_IN=',
  ]
  appendFileSync(envPath, `${block.join('\n')}\n`)
  process.env.LAUNCH_PRIVATE_KEY = key
  process.env.LAUNCH_ADDRESS = account.address
  return { account, created: true }
}

function randomSalt() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return `0x${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function twitterReady(value) {
  const v = (value || '').trim()
  if (!v) return false
  return /^https:\/\/(x|twitter)\.com\//i.test(v) || /^@?[A-Za-z0-9_]{1,15}$/.test(v)
}

function normalizeTwitter(value) {
  const v = value.trim()
  if (/^https:\/\//i.test(v)) return v
  const handle = v.replace(/^@/, '')
  return `https://x.com/${handle}`
}

async function readPairStatus() {
  const pair = (process.env.PONS_PAIR || MRVL)
  const [name, symbol, decimals, approved, economics, fee, enabled, maxTax, preview] = await Promise.all([
    publicClient.readContract({ address: pair, abi: ERC20_ABI, functionName: 'name' }),
    publicClient.readContract({ address: pair, abi: ERC20_ABI, functionName: 'symbol' }),
    publicClient.readContract({ address: pair, abi: ERC20_ABI, functionName: 'decimals' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'approvedPairTokens', args: [pair] }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'pairTokenEconomics', args: [pair] }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchFee' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchEnabled' }),
    publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'maxCreatorTaxBps' }),
    publicClient.readContract({
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: 'previewLaunchEconomics',
      args: [LAUNCH_CONFIG_ID, pair],
    }),
  ])
  const [phantomQuote, graduationThreshold, econDecimals] = economics
  return {
    pair,
    name,
    symbol,
    decimals: Number(decimals),
    approved,
    launchEnabled: enabled,
    launchFee: fee,
    launchFeeEth: formatUnits(fee, 18),
    phantomQuote: phantomQuote.toString(),
    graduationThreshold: graduationThreshold.toString(),
    graduationHuman: formatUnits(graduationThreshold, Number(econDecimals)),
    maxCreatorTaxBps: Number(maxTax),
    preview,
  }
}

async function stageLogo() {
  const candidates = [
    resolve(
      root,
      '..',
      '.cursor',
      'projects',
      'c-Users-emin-ponsblox',
      'assets',
      'c__Users_emin_AppData_Roaming_Cursor_User_workspaceStorage_0fa246a3145cf23de2649aaf49a01ac1_images_photo_2026-09-06_11-55-13-5c90e11a-7b01-4255-ac7c-783a2def68f6.jpg',
    ),
    resolve(
      'C:/Users/emin/.cursor/projects/c-Users-emin-ponsblox/assets/c__Users_emin_AppData_Roaming_Cursor_User_workspaceStorage_0fa246a3145cf23de2649aaf49a01ac1_images_photo_2026-09-06_11-55-13-5c90e11a-7b01-4255-ac7c-783a2def68f6.jpg',
    ),
  ]
  const dest = resolve(root, 'launch', 'spooderman.jpg')
  mkdirSync(resolve(root, 'launch'), { recursive: true })
  for (const file of candidates) {
    if (existsSync(file)) {
      copyFileSync(file, dest)
      return dest
    }
  }
  if (existsSync(dest)) return dest
  return null
}

async function deploy(account, status) {
  const twitter = process.env.TOKEN_TWITTER || ''
  if (!twitterReady(twitter)) {
    throw new Error('Set TOKEN_TWITTER to the X link before deploy')
  }
  const name = (process.env.TOKEN_NAME || 'Spooder-Man').trim()
  const symbol = (process.env.TOKEN_SYMBOL || 'SPOODERMAN').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,11}$/.test(symbol)) {
    throw new Error('Symbol must be 2–11 letters or digits')
  }
  if (!status.approved) throw new Error(`${status.symbol} is not an approved Pons pair`)
  if (!status.launchEnabled) throw new Error('Pons launches are disabled')

  const can = await publicClient.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'canLaunch',
    args: [account.address],
  })
  if (!can) throw new Error('This wallet is not allowed to launch on Pons right now')

  const x = normalizeTwitter(twitter)
  const description = (process.env.TOKEN_DESCRIPTION || '').trim() || x
  const logo = (process.env.TOKEN_LOGO || '').trim()
  const quoteInRaw = (process.env.TOKEN_QUOTE_IN || '').trim()
  const quoteIn = quoteInRaw ? parseUnits(quoteInRaw, status.decimals) : 0n
  const tax = Number(process.env.TOKEN_CREATOR_TAX_BPS || 100)
  if (tax < 0 || tax > status.maxCreatorTaxBps) {
    throw new Error(`Creator tax must be 0–${status.maxCreatorTaxBps}`)
  }

  const ethBal = await publicClient.getBalance({ address: account.address })
  const mrvlBal = await publicClient.readContract({
    address: status.pair,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })
  if (ethBal < status.launchFee) {
    throw new Error(`Need ${status.launchFeeEth} ETH launch fee plus gas`)
  }
  if (mrvlBal < quoteIn) {
    throw new Error(`Need ${quoteInRaw} ${status.symbol} for the first buy`)
  }

  const wallet = createWalletClient({
    account,
    chain: rhc,
    transport: http(rhc.rpcUrls.default.http[0]),
  })

  if (quoteIn > 0n) {
    const allowance = await publicClient.readContract({
      address: status.pair,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, ROUTER],
    })
    if (allowance < quoteIn) {
      const approveHash = await wallet.writeContract({
        address: status.pair,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ROUTER, quoteIn],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })
    }
  }

  const params = {
    name,
    symbol,
    logo,
    description,
    socials: {
      twitter: x,
      telegram: '',
      discord: '',
      website: (process.env.TOKEN_WEBSITE || x).trim(),
      farcaster: '',
    },
    creatorFeeRecipient: account.address,
    creatorTaxBps: tax,
    buybackEnabled: process.env.TOKEN_BUYBACK === 'true',
    expectedEconomics: status.preview,
    salt: randomSalt(),
  }

  const hash = quoteIn > 0n
    ? await wallet.writeContract({
        address: ROUTER,
        abi: ROUTER_ABI,
        functionName: 'launchAndBuy',
        args: [params, LAUNCH_CONFIG_ID, status.pair, quoteIn, 0n, account.address, []],
        value: status.launchFee,
      })
    : await wallet.writeContract({
        address: FACTORY,
        abi: FACTORY_ABI,
        functionName: 'launchToken',
        args: [params, LAUNCH_CONFIG_ID, status.pair],
        value: status.launchFee,
      })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const logs = parseEventLogs({
    abi: FACTORY_ABI,
    eventName: 'TokenLaunched',
    logs: receipt.logs,
  })
  const launched = logs[0]
  return {
    tx: hash,
    token: launched?.args?.token,
    curve: launched?.args?.curve,
    pair: launched?.args?.pairToken,
  }
}

const deployNow = process.argv.includes('--deploy')
const { account, created } = ensureWallet()
const status = await readPairStatus()
const logoFile = await stageLogo()

const ethBal = await publicClient.getBalance({ address: account.address })
const mrvlBal = await publicClient.readContract({
  address: status.pair,
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [account.address],
})
const allowed = await publicClient.readContract({
  address: FACTORY,
  abi: FACTORY_ABI,
  functionName: 'canLaunch',
  args: [account.address],
})

mkdirSync(resolve(root, 'launch'), { recursive: true })
writeFileSync(
  resolve(root, 'launch', 'spooderman.json'),
  `${JSON.stringify({
    name: process.env.TOKEN_NAME || 'Spooder-Man',
    symbol: (process.env.TOKEN_SYMBOL || 'SPOODERMAN').toUpperCase(),
    pair: {
      symbol: status.symbol,
      name: status.name,
      address: status.pair,
      approved: status.approved,
      graduation: `${status.graduationHuman} ${status.symbol}`,
    },
    twitter: process.env.TOKEN_TWITTER || '',
    description: process.env.TOKEN_DESCRIPTION || '',
    logo: process.env.TOKEN_LOGO || '',
    logoFile,
    creatorTaxBps: Number(process.env.TOKEN_CREATOR_TAX_BPS || 100),
    buybackEnabled: process.env.TOKEN_BUYBACK === 'true',
    quoteIn: process.env.TOKEN_QUOTE_IN || '',
    creatorFeeRecipient: account.address,
    launchFeeEth: status.launchFeeEth,
    deployWhen: 'Set TOKEN_TWITTER, then npm run launch:deploy',
  }, null, 2)}\n`,
)

if (created) console.log('wallet: created')
else console.log('wallet: reused')
console.log(`address: ${account.address}`)
console.log(`pair: ${status.symbol} ${status.pair}`)
console.log(`pairApproved: ${status.approved}`)
console.log(`launchesOpen: ${status.launchEnabled}`)
console.log(`canLaunch: ${allowed}`)
console.log(`launchFee: ${status.launchFeeEth} ETH`)
console.log(`graduation: ${status.graduationHuman} ${status.symbol}`)
console.log(`eth: ${formatUnits(ethBal, 18)}`)
console.log(`${status.symbol}: ${formatUnits(mrvlBal, status.decimals)}`)
console.log(`twitter: ${(process.env.TOKEN_TWITTER || '').trim() || '(waiting)'}`)
console.log(`logoFile: ${logoFile || '(missing)'}`)

if (!deployNow) {
  console.log('status: armed, not deployed')
  process.exit(0)
}

const result = await deploy(account, status)
console.log(`deployed token: ${result.token}`)
console.log(`curve: ${result.curve}`)
console.log(`tx: ${result.tx}`)
console.log(`https://robinhoodchain.blockscout.com/tx/${result.tx}`)
console.log(`https://gmgn.ai/robinhood/token/${result.token}`)
