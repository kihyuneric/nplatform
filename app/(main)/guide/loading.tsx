import { PageSkeleton } from '@/components/ui/skeleton-pulse'

export default function Loading() {
  return (
    <div className="min-h-[60vh] max-w-5xl mx-auto px-6">
      <PageSkeleton rows={4} />
    </div>
  )
}
