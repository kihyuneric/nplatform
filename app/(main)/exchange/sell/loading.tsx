import { FormSkeleton } from '@/components/skeletons/form-skeleton'
import { SkeletonPulse } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
        <SkeletonPulse height={16} width={140} />
        <SkeletonPulse height={28} width={240} />
        <SkeletonPulse height={14} width={320} />
        <FormSkeleton fields={8} />
      </div>
    </div>
  )
}
