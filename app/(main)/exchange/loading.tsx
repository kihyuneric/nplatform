import { SkeletonPulse, ListingCardSkeleton } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <SkeletonPulse height={32} width={200} />
          <SkeletonPulse height={16} width={360} />
        </div>

        {/* Search bar */}
        <SkeletonPulse height={44} className="w-full max-w-xl" rounded="lg" />

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonPulse key={i} height={32} width={80 + i * 10} rounded="full" />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
