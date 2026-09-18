export default function PublicIndexLoading() {
  return (
    <div className="bg-background px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="size-16 animate-pulse rounded-2xl bg-surface-2" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-8 w-64 max-w-full animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
        <div className="h-[340px] animate-pulse rounded-2xl bg-surface" />
        <div className="h-[280px] animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
