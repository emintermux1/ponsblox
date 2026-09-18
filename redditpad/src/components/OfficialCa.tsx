import {
  REDDITPAD_TOKEN,
  REDDITPAD_TOKEN_EXPLORER,
  REDDITPAD_TOKEN_SHORT,
} from '../config.ts'
import { CopyButton } from './CopyButton.tsx'

type OfficialCaVariant = 'chip' | 'full' | 'about'

export function OfficialCa({ variant }: { variant: OfficialCaVariant }) {
  const copy = <CopyButton value={REDDITPAD_TOKEN} label="Copy" />
  const explorer = (
    <a href={REDDITPAD_TOKEN_EXPLORER} target="_blank" rel="noreferrer" title={REDDITPAD_TOKEN}>
      Explorer
    </a>
  )

  switch (variant) {
    case 'chip':
      return (
        <div className="ca-chip" aria-label="RedditPad token contract">
          <span className="ca-chip__label">CA</span>
          <a href={REDDITPAD_TOKEN_EXPLORER} target="_blank" rel="noreferrer" title={REDDITPAD_TOKEN}>
            {REDDITPAD_TOKEN_SHORT}
          </a>
          {copy}
        </div>
      )
    case 'full':
      return (
        <div className="ca-full">
          <span>RedditPad token</span>
          <code className="mono" title={REDDITPAD_TOKEN}>{REDDITPAD_TOKEN}</code>
          {copy}
          {explorer}
          <p className="ca-full__note">
            This is the RedditPad token contract. It is not Reddit Inc equity or an official Reddit stock token.
          </p>
        </div>
      )
    case 'about':
      return (
        <div className="ca-about">
          <p>
            RedditPad token — the pad&apos;s own contract on Robinhood Chain 4663.
            Not Reddit Inc equity and not an official Reddit stock token.
          </p>
          <code className="mono" title={REDDITPAD_TOKEN}>{REDDITPAD_TOKEN}</code>
          {copy}
          {explorer}
        </div>
      )
    default: {
      const _e: never = variant
      return _e
    }
  }
}
