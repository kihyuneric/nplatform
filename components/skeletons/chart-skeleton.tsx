import { SkeletonPulse } from '@/components/ui/skeleton-pulse'
import { cn } from '@/lib/utils'

export function ChartSkeleton({ className, aspectRatio = '16/9' }: { className?: string; aspectRatio?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <SkeletonPulse height={16} width={120} />
        <div className="flex gap-2">
          <SkeletonPulse height={24} width={60} rounded="full" />
          <SkeletonPulse height={24} width={60} rounded="full" />
        </div>
      </div>
      <SkeletonPulse className="w-full" style={{ aspectRatio }} rounded="lg" />
    </div>
  )
}

export function ChartSkeletonCompact({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      <SkeletonPulse height={14} width={100} className="mb-3" />
      <SkeletonPulse className="w-full h-48" rounded="lg" />
    </div>
  )
}
