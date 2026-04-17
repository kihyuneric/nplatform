import { SkeletonPulse } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <SkeletonPulse height={28} width={200} />
        <SkeletonPulse height={14} width={300} />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonPulse height={18} width={160 + i * 10} />
              <SkeletonPulse height={14} className="w-full" />
              <SkeletonPulse height={14} className="w-5/6" />
              <SkeletonPulse height={14} className="w-4/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
