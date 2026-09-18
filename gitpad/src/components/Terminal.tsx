export function Terminal({ lines }: { lines?: string[] }) {
  const shown = lines?.length
    ? lines
    : ['factory indexed on Robinhood 4663', 'no local tape yet']
  return (
    <div className="term">
      <div className="term__bar">
        <span /><span /><span />
        <em>gitpad — tape</em>
      </div>
      <pre>
        <code>
          {shown.map((l) => `> ${l}`).join('\n')}
          {'_'}
        </code>
      </pre>
    </div>
  )
}
