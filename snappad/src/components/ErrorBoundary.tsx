import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { err: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(e: Error): State {
    return { err: e.message || 'Something broke.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[snappad]', error, info.componentStack)
  }

  render() {
    if (this.state.err) {
      return (
        <main className="crash">
          <h1>Snap crashed</h1>
          <p>{this.state.err}</p>
          <button type="button" className="btn btn--yellow" onClick={() => location.reload()}>Reload</button>
        </main>
      )
    }
    return this.props.children
  }
}
