import type { RepoCard as Card } from '../lib/api.ts'
import { compact } from '../lib/format.ts'

export function RepoRail({ repos }: { repos: Card[] }) {
  if (repos.length < 2) return null
  const row = [...repos, ...repos]
  return (
    <div className="rail" aria-hidden>
      <div className="rail__track">
        {row.map((r, i) => (
          <span key={`${r.id}-${i}`} className="rail__item">
            <b>{r.owner}/{r.name}</b>
            <em>★ {compact(r.stars)}</em>
          </span>
        ))}
      </div>
    </div>
  )
}
