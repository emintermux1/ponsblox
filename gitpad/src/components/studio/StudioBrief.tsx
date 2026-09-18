export function StudioBrief({
  owner,
  repo,
  displayName,
  symbol,
  fees,
  liveWhen = 'TokenLaunched is in the Pons receipt — not before',
}: {
  owner: string
  repo: string
  displayName: string
  symbol: string
  fees: string
  liveWhen?: string
}) {
  return (
    <ul className="sbrief">
      <li>
        <span>Repository</span>
        <b>{owner && repo ? `${owner}/${repo}` : 'Choose a public GitHub repository'}</b>
      </li>
      <li>
        <span>Token</span>
        <b>{displayName ? `${displayName} $${symbol || 'TICKER'}` : 'Name + ticker — suffix locked'}</b>
      </li>
      <li>
        <span>Fees</span>
        <b>{fees}</b>
      </li>
      <li>
        <span>Live when</span>
        <b>{liveWhen}</b>
      </li>
    </ul>
  )
}
