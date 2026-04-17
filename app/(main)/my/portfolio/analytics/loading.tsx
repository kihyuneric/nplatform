import DS from "@/lib/design-system"
import { SkeletonPulse } from "@/components/ui/skeleton-pulse"

export default function Loading() {
  return (
    <div className={DS.page.wrapper}>
      <div className={DS.page.container}>
        {/* Header */}
        <div className="mb-8">
          <SkeletonPulse variant="shimmer" className="h-5 w-24 rounded mb-4" />
          <SkeletonPulse variant="shimmer" className="h-8 w-56 rounded mb-2" />
          <SkeletonPulse variant="shimmer" className="h-4 w-80 rounded" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-5">
              <SkeletonPulse variant="shimmer" className="h-3 w-20 rounded mb-3" />
              <SkeletonPulse variant="shimmer" className="h-7 w-28 rounded mb-1" />
              <SkeletonPulse variant="shimmer" className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-5">
              <SkeletonPulse variant="shimmer" className="h-4 w-32 rounded mb-4" />
              <SkeletonPulse variant="shimmer" className="h-48 w-full rounded" />
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <SkeletonPulse variant="shimmer" className="h-4 w-24 rounded" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
              <SkeletonPulse variant="shimmer" className="h-4 flex-1 rounded" />
              <SkeletonPulse variant="shimmer" className="h-4 w-16 rounded" />
              <SkeletonPulse variant="shimmer" className="h-4 w-20 rounded" />
              <SkeletonPulse variant="shimmer" className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
