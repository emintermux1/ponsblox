import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Chrome } from './components/Chrome.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Home } from './pages/Home.tsx'

const Launch = lazy(() => import('./pages/Launch.tsx').then((m) => ({ default: m.Launch })))
const SnapPage = lazy(() => import('./pages/Snap.tsx').then((m) => ({ default: m.SnapPage })))
const Stories = lazy(() => import('./pages/Stories.tsx').then((m) => ({ default: m.Stories })))
const NotFound = lazy(() => import('./pages/NotFound.tsx').then((m) => ({ default: m.NotFound })))

function RouteFallback() {
  return <div className="empty" aria-busy="true">Loading…</div>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Chrome>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stories" element={<Stories mode="stories" />} />
            <Route path="/spotlight" element={<Stories mode="spotlight" />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/s/:ticker" element={<SnapPage />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </Chrome>
    </ErrorBoundary>
  )
}
