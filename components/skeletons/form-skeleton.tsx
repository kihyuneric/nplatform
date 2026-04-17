import { SkeletonPulse } from '@/components/ui/skeleton-pulse'
import { cn } from '@/lib/utils'

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <SkeletonPulse height={12} width={80} />
      <SkeletonPulse height={40} className="w-full" rounded="md" />
    </div>
  )
}

export function FormSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 space-y-5', className)}>
      <SkeletonPulse height={20} width={160} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <SkeletonPulse height={40} width={120} rounded="md" />
      </div>
    </div>
  )
}
