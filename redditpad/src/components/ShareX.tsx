import { sharePairIntent } from '../lib/social.ts'

export function ShareX({ name, ticker }: { name: string; ticker: string }) {
  return (
    <a
      className="btn btn--ghost btn--sm"
      href={sharePairIntent(name, ticker)}
      target="_blank"
      rel="noreferrer"
    >
      Share on X
    </a>
  )
}
