import { Footer } from '../components/Footer.tsx'
import { Nav } from '../components/Nav.tsx'
import { OfficialCa } from '../components/OfficialCa.tsx'
import { XLink } from '../components/XLink.tsx'
import {
  ARC_BONDING_PAD,
  ARC_DOCS,
  ARC_FACTORY,
  ARC_FEE_ROUTER,
  ARC_REGISTRY,
  ARC_RPC,
  ARC_TESTNET_CHAIN_ID,
  LAUNCHER_FACTORY,
  LAUNCHER_FEE_ROUTER,
  LAUNCHER_REGISTRY,
  PONS_DOCS,
  PONS_FACTORY,
  PONS_LAUNCH_AND_BUY,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC,
  explorerAddress,
  type SupportedChain,
} from '../lib/chain.ts'
import { bpsToPct } from '../lib/fee.ts'
import type { KitId } from '../lib/kits.ts'
import { connectWallet } from '../lib/wallet.ts'
import { useWallet } from '../hooks/useWallet.ts'

const PONS_LAUNCHPAD = 'https://www.ponsfamily.com/launchpad'
const ARC_DOCS_HOME = 'https://docs.arc.io/'
const PUMP_CREATE = 'https://pump.fun/create'
const BAGS_LAUNCH = 'https://bags.fm/launch'
const LONG_CREATE = 'https://app.long.xyz/create'
const FLAP_CREATE = 'https://flap.sh/create'
const FOUR_CREATE = 'https://four.meme/en/create-token'
const BELIEVE = 'https://believe.app'

const DEFAULT_OWNER_BPS = 100
const DEFAULT_CREATOR_BPS = 50

type ContractRow = {
  name: string
  address: `0x${string}`
  chain: SupportedChain
}

const ROBINHOOD_CONTRACTS: ContractRow[] = [
  { name: 'Launcher factory', address: LAUNCHER_FACTORY, chain: 'robinhood' },
  { name: 'Launcher registry', address: LAUNCHER_REGISTRY, chain: 'robinhood' },
  { name: 'Fee router', address: LAUNCHER_FEE_ROUTER, chain: 'robinhood' },
  { name: 'Pons V2 factory', address: PONS_FACTORY, chain: 'robinhood' },
  { name: 'Pons launchAndBuy', address: PONS_LAUNCH_AND_BUY, chain: 'robinhood' },
]

const ARC_CONTRACTS: ContractRow[] = [
  { name: 'Launcher factory', address: ARC_FACTORY, chain: 'arc' },
  { name: 'Launcher registry', address: ARC_REGISTRY, chain: 'arc' },
  { name: 'Bonding pad', address: ARC_BONDING_PAD, chain: 'arc' },
  { name: 'Fee router', address: ARC_FEE_ROUTER, chain: 'arc' },
]

function kitSource(id: KitId): { name: string; href: string | null } {
  switch (id) {
    case 'pons':
      return { name: 'Pons create', href: PONS_LAUNCHPAD }
    case 'pumpfun':
      return { name: 'pump.fun create', href: PUMP_CREATE }
    case 'bags':
      return { name: 'bags.fm launch', href: BAGS_LAUNCH }
    case 'app':
      return { name: 'Believe', href: BELIEVE }
    case 'flap':
      return { name: 'flap.sh create', href: FLAP_CREATE }
    case 'four':
      return { name: 'four.meme create', href: FOUR_CREATE }
    case 'long':
      return { name: 'long.xyz create', href: LONG_CREATE }
    case 'custom':
      return { name: 'Custom colors on this site', href: null }
    default: {
      const _n: never = id
      return _n
    }
  }
}

function Ca({ row }: { row: ContractRow }) {
  return (
    <tr>
      <th scope="row">{row.name}</th>
      <td>
        <a href={explorerAddress(row.chain, row.address)} target="_blank" rel="noreferrer">
          {row.address}
        </a>
      </td>
    </tr>
  )
}

export function Docs() {
  const wallet = useWallet()
  const kits: KitId[] = ['pons', 'pumpfun', 'bags', 'app', 'flap', 'four', 'long', 'custom']
  return (
    <div className="shell product">
      <Nav account={wallet.account} onConnect={() => void connectWallet()} />
      <article className="docs">
        <h1 className="page-title">Docs</h1>
        <p className="docs-lead">
          LAUNCHER hosts a pad per slug. You create the pad in <a href="/">Studio</a>. Anyone
          then opens <code>{'{slug}'}.launcher.family</code> or <code>/p/{'{slug}'}</code> and
          launches a coin on <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">Robinhood Chain</a> (4663)
          or <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">Arc testnet</a> ({ARC_TESTNET_CHAIN_ID}).
          Templates copy another pad’s create screen. They do not run Solana, BNB, or those other chains.
        </p>

        <section>
          <h2>How it works</h2>
          <ol>
            <li>Studio names the pad, picks Robinhood or Arc, and calls <code>createPad</code> on our factory.</li>
            <li>The tenant form uploads an image to Pinata, then the wallet launches the coin.</li>
            <li>On Robinhood the wallet calls Pons, then our <code>linkToken</code>. On Arc it calls the bonding pad, then <code>linkToken</code>.</li>
            <li>Linked coins show under On this pad, with explorer links and, on Arc, buy/sell in USDC.</li>
          </ol>
          <p>
            Source for the Pons launch path: <a href={PONS_DOCS} target="_blank" rel="noreferrer">Pons V2 docs</a>.
            Source for Arc RPC: <a href={ARC_DOCS} target="_blank" rel="noreferrer">Arc RPC endpoints</a>.
          </p>
        </section>

        <section>
          <h2>Robinhood</h2>
          <p>
            Chain id {ROBINHOOD_CHAIN_ID}. Quote asset is ETH. The wallet must pass Pons
            {' '}<code>canLaunch</code> — that check is per wallet, not per pad
            (<a href={PONS_DOCS} target="_blank" rel="noreferrer">Pons V2</a>).
          </p>
          <p>
            Launch calls Pons <code>launchToken</code>, or <code>launchAndBuy</code> when the
            initial ETH buy is above zero. After the receipt, the same wallet calls our
            {' '}<code>linkToken</code> so the coin appears on this pad. Trade after that is on
            {' '}<a href={PONS_LAUNCHPAD} target="_blank" rel="noreferrer">Pons launchpad</a>.
          </p>
          <p>
            RPC: <code>{ROBINHOOD_RPC}</code>. Explorer:{' '}
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">robinhoodchain.blockscout.com</a>.
          </p>
          <table>
            <caption>Robinhood contracts</caption>
            <tbody>
              {ROBINHOOD_CONTRACTS.map((row) => <Ca key={row.address} row={row} />)}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Arc testnet</h2>
          <p>
            Chain id {ARC_TESTNET_CHAIN_ID}. Quote asset is native USDC (18 decimals). There is
            no Pons on Arc. Launch calls <code>launch</code> on our bonding pad, optional
            {' '}<code>buy</code> / <code>sell</code> with USDC, then <code>linkToken</code>.
          </p>
          <p>
            Official testnet RPC: <code>{ARC_RPC}</code>, listed in{' '}
            <a href={ARC_DOCS} target="_blank" rel="noreferrer">Arc RPC docs</a>.
            Arc mainnet RPC is unpublished; see <a href={ARC_DOCS_HOME} target="_blank" rel="noreferrer">docs.arc.io</a>.
            Explorer: <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">testnet.arcscan.app</a>.
          </p>
          <table>
            <caption>Arc testnet contracts</caption>
            <tbody>
              {ARC_CONTRACTS.map((row) => <Ca key={row.address} row={row} />)}
            </tbody>
          </table>
        </section>

        <section>
          <h2>LAUNCHER token</h2>
          <OfficialCa kind="docs" />
        </section>

        <section>
          <h2>Fees</h2>
          <p>
            Fees are percentages, stored on-chain as basis points. Studio defaults are owner fee{' '}
            {bpsToPct(DEFAULT_OWNER_BPS)}% and creator tax {bpsToPct(DEFAULT_CREATOR_BPS)}%. Those
            values are written in <code>createPad</code> and do not change for that pad.
          </p>
        </section>

        <section>
          <h2>Kits</h2>
          <p>
            A kit copies the look of another create flow. Coins still launch on Robinhood + ETH or
            Arc testnet + USDC. They do not launch on the chain those sites use.
          </p>
          <ul className="docs-kits">
            {kits.map((id) => {
              const src = kitSource(id)
              return (
                <li key={id}>
                  <strong>{id === 'app' ? 'APP' : id.toUpperCase()}</strong>
                  {src.href ? (
                    <>
                      {' — copies '}
                      <a href={src.href} target="_blank" rel="noreferrer">{src.name}</a>
                    </>
                  ) : (
                    <> — {src.name}</>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2>Contracts</h2>
          <p>
            Addresses above are the live factories, registry, fee routers, Pons V2, and Arc bonding
            pad. Click any address for the explorer page. Contracts are internally reviewed. That is
            not an independent audit.
          </p>
          <p>
            Pons interface: <a href={PONS_DOCS} target="_blank" rel="noreferrer">docs.ponsfamily.com/v2</a>.
            Arc RPC: <a href={ARC_DOCS} target="_blank" rel="noreferrer">docs.arc.io RPC endpoints</a>.
          </p>
          <p>
            Follow <XLink /> on X.
          </p>
        </section>
      </article>
      <Footer />
    </div>
  )
}
