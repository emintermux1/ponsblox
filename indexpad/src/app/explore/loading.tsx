export default function ExploreLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-2" />
        <div className="mt-3 h-10 w-64 animate-pulse rounded bg-surface-2" />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-line bg-surface"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
