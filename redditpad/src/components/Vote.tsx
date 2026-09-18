import type { Vote as Dir } from '../lib/comments.ts'

export function Vote({
  score,
  vote,
  onVote,
}: {
  score: number
  vote: Dir
  onVote: (d: Dir) => void
}) {
  return (
    <div className="vote">
      <button
        type="button"
        className={vote === 1 ? 'on-up' : ''}
        aria-label="Upvote"
        onClick={() => onVote(1)}
      >
        ▲
      </button>
      <span>{score}</span>
      <button
        type="button"
        className={vote === -1 ? 'on-dn' : ''}
        aria-label="Downvote"
        onClick={() => onVote(-1)}
      >
        ▼
      </button>
    </div>
  )
}
