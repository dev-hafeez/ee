export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading dashboard view">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-7 w-48 rounded-lg bg-zinc-200" />
          <div className="mt-2 h-4 w-72 rounded bg-zinc-100" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-24 rounded-lg bg-zinc-100" />
          <div className="h-8 w-28 rounded-lg bg-zinc-200" />
          <div className="h-8 w-28 rounded-lg bg-zinc-200" />
        </div>
      </div>

      {/* 3-Column Card Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-zinc-200" />
              <div className="h-5 w-5 rounded bg-zinc-100" />
            </div>
            <div className="mt-4 h-8 w-28 rounded-lg bg-zinc-200" />
            <div className="mt-2 h-3 w-36 rounded bg-zinc-100" />
          </div>
        ))}
      </div>

      {/* Content Section Skeleton */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="h-4 w-40 rounded bg-zinc-200" />
          <div className="h-3 w-24 rounded bg-zinc-100" />
        </div>
        <div className="divide-y divide-zinc-100 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-4 w-12 rounded bg-zinc-100" />
                <div className="h-3.5 w-64 rounded bg-zinc-200" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-16 rounded bg-zinc-100" />
                <div className="h-3 w-20 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
