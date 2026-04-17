import { PageSkeleton } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-[60vh] max-w-lg mx-auto px-6">
      <PageSkeleton rows={3} />
    </div>
  )
}
