/**
 * Skeleton placeholder used while data is loading.
 */
export function SkeletonLine({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-panel-sunken ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-hairline bg-panel p-5 shadow-card ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <SkeletonLine className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3.5 w-1/3" />
          <SkeletonLine className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-hairline bg-panel shadow-card"
      aria-hidden="true"
    >
      <div className="border-b border-hairline bg-panel-muted px-5 py-3.5">
        <SkeletonLine className="h-3 w-32" />
      </div>
      <div className="divide-y divide-hairline">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <SkeletonLine
                key={columnIndex}
                className={`h-3 ${columnIndex === 0 ? 'w-1/4' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-hairline bg-panel p-5 shadow-card"
          aria-hidden="true"
        >
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="mt-3 h-7 w-16" />
          <SkeletonLine className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export default SkeletonCard;
