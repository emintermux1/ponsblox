export function PairBadge({ ticker }: { ticker: string }) {
  return (
    <span className="pair">
      <b>${ticker}</b>
      <span>/</span>
      <em>$RDDT</em>
    </span>
  )
}
