import { SkeletonPulse } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <SkeletonPulse height={28} width={160} />
        <SkeletonPulse height={44} className="w-full" rounded="lg" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <SkeletonPulse height={16} width={200 + i * 20} />
                <SkeletonPulse height={16} width={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
