/**
 * Broadcasts Launcher contracts. Prints addresses. Does not invent them.
 *
 *   CHAIN=robinhood node scripts/deploy.mjs
 *   CHAIN=arc node scripts/deploy.mjs
 *
 * Needs PRIVATE_KEY or LAUNCHER_ADMIN_KEY. Dry-run without a key.
 */
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PONS = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e'
const RH_RPC = process.env.VITE_ROBINHOOD_RPC || 'https://rpc.mainnet.chain.robinhood.com'
const ARC_RPC = process.env.VITE_ARC_RPC || 'https://rpc.testnet.arc.io'
const chainName = (process.env.CHAIN || 'robinhood').toLowerCase()
const key = (process.env.LAUNCHER_ADMIN_KEY || process.env.PRIVATE_KEY || '').trim()

function artifact(name) {
  const p = resolve(process.cwd(), 'contracts/artifacts-hh/contracts', `${name}.sol`, `${name}.json`)
  return JSON.parse(readFileSync(p, 'utf8'))
}

function die(msg) {
  console.error(msg)
  process.exit(1)
}

if (chainName !== 'robinhood' && chainName !== 'arc') die('CHAIN must be robinhood or arc')
if (!key) {
  console.log('No PRIVATE_KEY / LAUNCHER_ADMIN_KEY. Not broadcasting. Compile first, then rerun with a key.')
  console.log(chainName === 'arc'
    ? 'Arc testnet: Pons unset, WITH_BONDING=true'
    : `Robinhood: Pons ${PONS}, bonding unset`)
  process.exit(0)
}

const account = privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`)
const rpc = chainName === 'arc' ? ARC_RPC : RH_RPC
const client = createWalletClient({
  account,
  transport: http(rpc, { timeout: 30_000 }),
}).extend(publicActions)

const registryArt = artifact('LauncherRegistry')
const factoryArt = artifact('LauncherPadFactory')
const routerArt = artifact('LauncherFeeRouter')
const bondingArt = artifact('ArcBondingPad')

async function deploy(abi, bytecode, args) {
  const hash = await client.deployContract({ abi, bytecode, args, account })
  const rec = await client.waitForTransactionReceipt({ hash })
  if (rec.status !== 'success' || !rec.contractAddress) die(`Deploy failed: ${hash}`)
  return { address: rec.contractAddress, block: rec.blockNumber }
}

const pons = chainName === 'robinhood' ? PONS : '0x0000000000000000000000000000000000000000'
const registryRec = await deploy(registryArt.abi, registryArt.bytecode, [account.address])
const registry = registryRec.address
const bondingRec = chainName === 'arc'
  ? await deploy(bondingArt.abi, bondingArt.bytecode, [])
  : null
const bonding = bondingRec?.address ?? '0x0000000000000000000000000000000000000000'
const factoryRec = await deploy(factoryArt.abi, factoryArt.bytecode, [account.address, registry, pons, bonding])
const factory = factoryRec.address
const setHash = await client.writeContract({
  account,
  address: registry,
  abi: registryArt.abi,
  functionName: 'setFactory',
  args: [factory],
})
await client.waitForTransactionReceipt({ hash: setHash })
const routerRec = await deploy(routerArt.abi, routerArt.bytecode, [account.address])
const router = routerRec.address

console.log('LAUNCHER_REGISTRY', registry)
console.log('LAUNCHER_FACTORY', factory)
console.log('LAUNCHER_FEE_ROUTER', router)
if (chainName === 'arc') console.log('ARC_BONDING_PAD', bonding)
console.log('FROM_BLOCK', registryRec.block.toString())
console.log('admin', account.address)
console.log('chain', chainName)
