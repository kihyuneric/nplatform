import { SkeletonPulse } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <SkeletonPulse height={28} width={140} />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <SkeletonPulse height={20} width={60} rounded="full" />
              <div className="flex-1 space-y-1.5">
                <SkeletonPulse height={16} className="w-3/4" />
                <SkeletonPulse height={12} className="w-1/3" />
              </div>
              <SkeletonPulse height={12} width={80} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
