import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[gitpad]', error.message, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="paper paper--page">
          <p className="kicker">Error</p>
          <h1>GitPad could not render this page.</h1>
          <p className="muted">Reload. Nothing was signed for you.</p>
          <button type="button" className="btn btn--lime" onClick={() => location.assign('/')}>Home</button>
        </main>
      )
    }
    return this.props.children
  }
}
