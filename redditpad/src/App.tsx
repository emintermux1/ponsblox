import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Footer } from './components/Footer.tsx'
import { Nav } from './components/Nav.tsx'
import { Explore } from './pages/Explore.tsx'
import { Graduated } from './pages/Graduated.tsx'
import { Home } from './pages/Home.tsx'
import { Launch } from './pages/Launch.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { TokenPage } from './pages/Token.tsx'
import { Trending } from './pages/Trending.tsx'

export default function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <a className="skip" href="#main">Skip to content</a>
        <Nav />
        <div id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/graduated" element={<Graduated />} />
            <Route path="/p/:ticker" element={<TokenPage />} />
            <Route path="/token/:id" element={<TokenPage />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}
