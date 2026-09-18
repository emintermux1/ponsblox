import { CtaAge } from "./cta-age";

export function AgeGate() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
          M
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-accent">18+ only</p>
        <h1 className="mt-2 text-2xl font-semibold leading-none tracking-tight">18+ muse agents</h1>
        <p className="mx-auto mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
          Five original 21+ fictional agents. Subscribe to unlock locked stills. Leave if you are
          under 18.
        </p>
        <div className="mt-6">
          <CtaAge />
        </div>
      </div>
    </div>
  );
}
