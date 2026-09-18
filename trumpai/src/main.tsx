import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Eagle from './Eagle.tsx'
import Home from './Home.tsx'
import Launch from './Launch.tsx'
import './launch.css'
import './home.css'
import { parseSitePath, type SitePath } from './route.ts'

function Root() {
  const [path, setPath] = useState<SitePath>(() => parseSitePath(window.location.pathname))

  useEffect(() => {
    function onPop() {
      setPath(parseSitePath(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  switch (path) {
    case 'home':
      return <Home />
    case 't1':
      return <Launch />
    case 'eagle47':
      return <Eagle />
    default: {
      const _never: never = path
      return _never
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
