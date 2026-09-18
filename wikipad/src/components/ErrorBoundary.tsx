import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RpcNotice } from './RpcNotice.tsx'
import { isRpcBusyMessage, sanitizeUserError } from '../lib/safeError.ts'

type Props = { children: ReactNode }
type State = { message: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: Error): State {
    return { message: sanitizeUserError(error) }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[wikipad]', sanitizeUserError(error))
  }

  render() {
    const { message } = this.state
    if (!message) return this.props.children
    return (
      <main className="article">
        <h1 className="firstHeading">WikiPad</h1>
        {isRpcBusyMessage(message)
          ? <RpcNotice onRetry={() => window.location.reload()} />
          : (
            <p>
              {message}{' '}
              <button type="button" className="linkish" onClick={() => window.location.reload()}>Retry</button>
            </p>
          )}
      </main>
    )
  }
}
