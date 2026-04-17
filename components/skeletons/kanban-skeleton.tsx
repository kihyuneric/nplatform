import { SkeletonPulse } from '@/components/ui/skeleton-pulse'
import { cn } from '@/lib/utils'

function KanbanCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <SkeletonPulse height={8} width={8} rounded="full" />
        <SkeletonPulse height={14} className="flex-1" />
      </div>
      <SkeletonPulse height={12} className="w-3/4" />
      <div className="flex justify-between items-center pt-1">
        <SkeletonPulse height={20} width={60} rounded="full" />
        <SkeletonPulse height={12} width={40} />
      </div>
    </div>
  )
}

function KanbanColumnSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex-1 min-w-[240px] space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <SkeletonPulse height={14} width={80} />
        <SkeletonPulse height={20} width={24} rounded="full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: cards }).map((_, i) => (
          <KanbanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function KanbanSkeleton({ columns = 5, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <KanbanColumnSkeleton key={i} cards={i === 0 ? 3 : i === 1 ? 2 : 1} />
      ))}
    </div>
  )
}
