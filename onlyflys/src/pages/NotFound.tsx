import { AppLink } from '../components/AppLink.tsx'

export function NotFound() {
  return (
    <div className="col empty-page">
      <h1>Lost in the bin</h1>
      <p className="muted">That fly already left the grate.</p>
      <AppLink href="/" className="btn btn-blue">
        Back to the hive
      </AppLink>
    </div>
  )
}
