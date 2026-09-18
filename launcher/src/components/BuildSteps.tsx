import {
  BUILD_STEPS,
  phaseSpec,
  stepIndex,
  stepLabel,
  stepState,
  type BuildPhase,
  type BuildStepId,
  type StepState,
} from '../lib/buildPhase.ts'
import { RECEIPT_PENDING } from '../lib/receipt.ts'
import { chainLabel, explorerTx } from '../lib/chain.ts'
import type { CustomSkin } from '../lib/custom.ts'
import { bpsToPct } from '../lib/fee.ts'
import { kitById } from '../lib/kits.ts'
import type { PadBuild } from '../lib/write.ts'
import { PadPreview } from './PadPreview.tsx'

function Mark({ state }: { state: StepState }) {
  switch (state) {
    case 'done':
      return (
        <i className="step-mark done" aria-hidden>
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M2 6.5 4.8 9 10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </i>
      )
    case 'active':
      return <i className="step-mark active" aria-hidden />
    case 'failed':
      return <i className="step-mark failed" aria-hidden />
    case 'pending':
      return <i className="step-mark pending" aria-hidden />
    case 'todo':
      return <i className="step-mark" aria-hidden />
    default: {
      const _n: never = state
      return _n
    }
  }
}

/** What each step reveals once it is done or running. */
function Detail({ step, spec, custom }: { step: BuildStepId; spec: PadBuild | null; custom?: CustomSkin }) {
  if (!spec) return null
  switch (step) {
    case 'reading':
      return null
    case 'naming':
      return (
        <span className="step-detail">
          <strong>{spec.name}</strong> · ${spec.ticker} · {spec.slug}.launcher.family
        </span>
      )
    case 'template': {
      const kit = kitById(spec.kit)
      return (
        <span className="step-detail step-kit">
          <PadPreview kit={spec.kit} custom={custom} name={spec.name} compact />
          <span>{kit.name} · {kit.line}</span>
        </span>
      )
    }
    case 'fees':
      return (
        <span className="step-detail">
          Owner fee {bpsToPct(spec.ownerFeeBps)}% · Creator tax {bpsToPct(spec.creatorFeeBps)}%
        </span>
      )
    case 'wallet':
      return <span className="step-detail">Sign the create transaction on {chainLabel(spec.chain)}.</span>
    case 'confirming':
    case 'live':
      return null
    default: {
      const _n: never = step
      return _n
    }
  }
}

function TxLink({ chain, hash }: { chain: NonNullable<PadBuild['chain']>; hash: `0x${string}` }) {
  return (
    <span className="step-detail">
      <a href={explorerTx(chain, hash)} target="_blank" rel="noreferrer">Explorer</a>
      {' '}
      <code>{`${hash.slice(0, 10)}…${hash.slice(-6)}`}</code>
    </span>
  )
}

export function BuildSteps({
  phase,
  custom,
  onRetry,
}: {
  phase: BuildPhase
  custom?: CustomSkin
  onRetry?: () => void
}) {
  const spec = phaseSpec(phase)
  const error = phase.kind === 'failed' ? phase.error : null
  const failedAt = phase.kind === 'failed' ? phase.at : null
  const hash = phase.kind === 'confirming' || phase.kind === 'failed' || phase.kind === 'pending'
    ? phase.hash
    : undefined
  const soft = phase.kind === 'pending'
  return (
    <section className="steps enter" aria-live="polite" aria-busy={phase.kind === 'confirming' || phase.kind === 'wallet' || phase.kind === 'reading' || phase.kind === 'naming' || phase.kind === 'template' || phase.kind === 'fees'}>
      <ol>
        {BUILD_STEPS.map((step) => {
          const state = stepState(step, phase)
          const show = state === 'done' || state === 'active' || state === 'failed' || state === 'pending'
          const hidden = state === 'todo' && (failedAt ? stepIndex(step) > stepIndex(failedAt) : false)
          const showTx = Boolean(hash && spec && step === 'confirming' && (state === 'active' || state === 'failed' || state === 'pending'))
          return (
            <li key={step} className={`step ${state}${hidden ? ' faded' : ''}`}>
              <Mark state={state} />
              <div>
                <span className="step-label">{stepLabel(step, spec?.chain ?? null)}</span>
                {show && <Detail step={step} spec={spec} custom={custom} />}
                {showTx && hash && spec && <TxLink chain={spec.chain} hash={hash} />}
                {state === 'pending' && soft && hash && spec && (
                  <>
                    <p className="step-warn" role="status">{RECEIPT_PENDING}</p>
                    <div className="step-actions">
                      <a className="btn ghost small" href={explorerTx(spec.chain, hash)} target="_blank" rel="noreferrer">
                        Explorer
                      </a>
                      {onRetry && (
                        <button type="button" className="btn small" onClick={onRetry}>
                          Retry
                        </button>
                      )}
                    </div>
                  </>
                )}
                {state === 'failed' && error && (
                  <p className="step-err" role="alert">{error}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
