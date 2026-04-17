import { PageSkeleton } from '@/components/ui/skeleton-pulse'
export default function Loading() {
  return (
    <div className="min-h-[60vh] max-w-7xl mx-auto">
      <PageSkeleton rows={3} />
    </div>
  )
}
