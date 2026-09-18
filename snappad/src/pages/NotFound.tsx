import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/title.ts'

export function NotFound() {
  usePageTitle('Snap not found — SnapPad')
  return (
    <main className="crash">
      <h1>This Snap expired.</h1>
      <p>The story is gone. Find another market.</p>
      <Link className="btn btn--yellow" to="/">Back to chat</Link>
    </main>
  )
}
