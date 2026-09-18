export function FeedSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading confirmed events">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="mf-feed-row flex items-start gap-2.5 border-b border-line">
          <span className="mf-skel h-7 w-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="mf-skel h-2.5 w-24 rounded-full" />
              <span className="mf-skel h-2.5 w-10 rounded-full" />
              <span className="mf-skel ml-auto h-2 w-8 rounded-full" />
            </div>
            <span className="mf-skel block h-2.5 w-40 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
