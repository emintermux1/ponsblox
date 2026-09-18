export function LoadingState({ label }: { label: string }) {
  return (
    <div className="mf-loading px-4 py-4" data-kind="loading">
      <p className="mf-kicker">Live</p>
      <p className="mt-1.5 font-mono text-[11px] text-mute">{label}</p>
      <div className="mf-skel mt-3 h-px w-full rounded-none" />
    </div>
  );
}
