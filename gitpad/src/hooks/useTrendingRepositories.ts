import { useEffect, useState } from 'react'
import { fetchRepos, type ExploreSort, type RepoCard } from '../lib/api.ts'

export function useTrendingRepositories(sort: ExploreSort, q = '', page = 1, enabled = true) {
  const [repos, setRepos] = useState<RepoCard[]>([])
  const [busy, setBusy] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setBusy(false)
      setRepos([])
      return
    }
    let live = true
    setBusy(true)
    setError(null)
    if (page === 1) setRepos([])
    void fetchRepos(sort, q || undefined, page)
      .then((rows) => {
        if (!live) return
        setRepos((cur) => page === 1 ? rows : [...cur, ...rows])
        setDone(rows.length < 24)
      })
      .catch((e: Error) => { if (live) setError(e.message) })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [sort, q, page, enabled])

  return { repos, busy, error, done }
}
