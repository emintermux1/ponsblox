import { FACTORY, PONS_DOCS } from '../lib/chain.ts'

export function Docs() {
  return (
    <main className="paper paper--page docs">
      <p className="kicker">Docs</p>
      <h1>How GitPad launches</h1>
      <p>
        GitPad is a token launch surface for the Pons V2 factory on Robinhood Chain.
        Status copy is always <strong>Live on Pons</strong>.
      </p>
      <h2>The pair</h2>
      <p>
        A GitHub repository cannot be an on-chain <code>pairToken</code>.
        GitPad launches against native ETH (<code>pairToken</code> 0x0).
        The repository is the narrative pair: it is written into <code>socials.website</code> and the token description.
      </p>
      <h2>Factory</h2>
      <p className="mono">{FACTORY}</p>
      <p>
        Official Pons documentation lives at{' '}
        <a href={PONS_DOCS} target="_blank" rel="noreferrer">{PONS_DOCS}</a>.
      </p>
      <h2>By GitLab</h2>
      <p>Every token GitPad deploys is named <code>[Token Name] By GitLab</code>. That string is what Pons stores as <code>name</code>.</p>
      <h2>Rules</h2>
      <ul>
        <li>Repository lists and READMEs come from the GitHub API.</li>
        <li>Launches are <code>launchToken</code> or <code>launchAndBuy</code> signed in your wallet.</li>
        <li>IPFS pins go through Pinata when <code>PINATA_JWT</code> is set.</li>
        <li>GitPad contracts (registry, fee router, adapter) live in <code>gitpad/contracts</code>. They are used only after you deploy and set the VITE addresses.</li>
        <li>Pons creator tax bps are immutable after launch. The current recipient can call documented <code>transferCreatorFeeRecipient(token, newRecipient)</code>. Protocol takeovers are readable via <code>pendingCreatorFeeRecipient</code>.</li>
        <li>Holders and volume show when a market indexer key is set.</li>
        <li>Claim uses GitHub OAuth. It never transfers the token.</li>
        <li>Trend score uses GitHub velocity, recency, and activity.</li>
        <li>COLD / ACTIVE / HOT / BREAKOUT is a GitHub activity label.</li>
        <li>Share cards open an X intent after you review the text. GitPad never posts for you.</li>
        <li>Launch Studio is the only deploy path. A canonical token blocks a silent second canonical. Community launch is an explicit second action.</li>
      </ul>
    </main>
  )
}
