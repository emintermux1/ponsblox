export function RowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden>
      <div className="mf-board-head mf-board-market">
        <span className="mf-skel h-2 w-3 rounded" />
        <span className="mf-skel h-2 w-10 rounded" />
        <span className="mf-skel ml-auto h-2 w-6 rounded" />
        <span className="mf-skel ml-auto h-2 w-6 rounded" />
        <span className="mf-board-last mf-skel ml-auto h-2 w-8 rounded" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="mf-board-row mf-board-market">
          <span className="mf-skel h-2.5 w-3 rounded" />
          <span className="flex items-center gap-2">
            <span className="mf-skel h-6 w-6 shrink-0 rounded-full" />
            <span className="mf-skel h-2.5 w-20 rounded" />
          </span>
          <span className="mf-skel ml-auto h-2.5 w-10 rounded" />
          <span className="mf-skel ml-auto h-2.5 w-10 rounded" />
          <span className="mf-board-last mf-skel ml-auto h-2.5 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}
