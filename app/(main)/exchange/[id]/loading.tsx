import { SkeletonPulse, KpiCardSkeleton } from '@/components/ui/skeleton-pulse'
import { ChartSkeleton } from '@/components/skeletons/chart-skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <SkeletonPulse height={16} width={160} />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <SkeletonPulse height={28} width={280} />
            <div className="flex gap-2">
              <SkeletonPulse height={24} width={60} rounded="full" />
              <SkeletonPulse height={24} width={80} rounded="full" />
              <SkeletonPulse height={24} width={50} rounded="full" />
            </div>
          </div>
          <SkeletonPulse height={40} width={120} rounded="md" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <ChartSkeleton />
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <SkeletonPulse height={18} width={140} />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <SkeletonPulse height={14} className="flex-1" />
                  <SkeletonPulse height={14} width={80} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <SkeletonPulse height={18} width={100} />
              <SkeletonPulse height={120} className="w-full" rounded="lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
