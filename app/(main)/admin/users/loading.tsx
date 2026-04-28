import { SkeletonPulse, KpiCardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <SkeletonPulse height={28} width={180} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="rounded-none border bg-card">
          <div className="flex items-center gap-4 px-4 py-3 border-b bg-[var(--color-surface-sunken)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonPulse key={i} height={12} className="flex-1" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
        </div>
      </div>
    </div>
  )
}
