import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[robloxpad]', error.message, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="page">
          <p className="kicker">Error</p>
          <h1>RobloxPad could not render this page.</h1>
          <p className="muted">Reload. Nothing was signed for you.</p>
          <button type="button" className="btn btn--fire" onClick={() => location.assign('/')}>Home</button>
        </main>
      )
    }
    return this.props.children
  }
}
