import { motion, useReducedMotion } from 'motion/react'
import { SourceLabel } from './SourceLabel.tsx'
import { MomentumBadge, signalFromRepo } from './MomentumBadge.tsx'
import type { RepoCard as Card } from '../lib/api.ts'
import { compact, LANG_COLOR, timeAgo } from '../lib/format.ts'
import { launchPath, onNavClick, repoPath } from '../lib/router.ts'

function statusLabel(status: Card['tokenStatus']) {
  switch (status) {
    case 'live': return 'Live on GitPad'
    case 'available': return 'Launch available'
    case 'none': return 'Not tokenized'
    default: {
      const _e: never = status
      return _e
    }
  }
}

export function RepoCard({ repo }: { repo: Card }) {
  const reduce = useReducedMotion()
  const langColor = repo.language ? LANG_COLOR[repo.language] || '#8a867a' : '#8a867a'
  return (
    <motion.article
      className="rcard"
      whileHover={reduce ? undefined : { y: -8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <a className="rcard__main" href={repoPath(repo.owner, repo.name)} onClick={onNavClick(repoPath(repo.owner, repo.name))}>
        <header className="rcard__top">
          <span className="rcard__rank">{String(repo.trendScore).padStart(2, '0')}</span>
          <img src={repo.avatarUrl} alt="" width={28} height={28} loading="lazy" />
          <div>
            <strong>{repo.name}</strong>
            <em>{repo.owner}</em>
          </div>
        </header>
        <p>{repo.description || 'No description on GitHub.'}</p>
        <p className="mono rcard__st">{statusLabel(repo.tokenStatus)}</p>
        <MomentumBadge signal={signalFromRepo(repo)} />
        {repo.fork && <p className="muted">Fork{repo.parentFullName ? ` of ${repo.parentFullName}` : ''} — not the origin.</p>}
        {repo.archived && <p className="err">Archived on GitHub.</p>}
        <dl>
          <div><dt>Quote</dt><dd>ETH</dd></div>
          <div><dt>Language</dt><dd>{repo.language ? <><i style={{ background: langColor }} />{repo.language}</> : '—'}</dd></div>
          <div><dt>Stars</dt><dd>{compact(repo.stars)}</dd></div>
          <div><dt>24h</dt><dd>{repo.stars24h == null ? '—' : `+${compact(repo.stars24h)}`}</dd></div>
          <div><dt>7d</dt><dd>{repo.stars7d == null ? '—' : `+${compact(repo.stars7d)}`}</dd></div>
          <div><dt>Forks</dt><dd>{compact(repo.forks)}</dd></div>
          <div><dt>Pushed</dt><dd>{timeAgo(repo.pushedAt)}</dd></div>
        </dl>
      </a>
      <footer className="rcard__act">
        <span className="mono" title="Trend score from star and fork velocity, recency, and activity.">
          Trend {repo.trendScore} <SourceLabel source="calculated" />
        </span>
        <a className="btn btn--lime btn--sm" href={launchPath(repo.owner, repo.name)} onClick={onNavClick(launchPath(repo.owner, repo.name))}>
          {repo.tokenStatus === 'live' ? 'View / Launch' : 'Launch Token'}
        </a>
      </footer>
    </motion.article>
  )
}
