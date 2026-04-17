import { SkeletonPulse } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
        <SkeletonPulse height={28} width={180} />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonPulse height={14} width={120} />
              <SkeletonPulse height={40} className="w-full" rounded="lg" />
            </div>
          ))}
        </div>
        <SkeletonPulse height={44} width={160} rounded="lg" />
      </div>
    </div>
  )
}
