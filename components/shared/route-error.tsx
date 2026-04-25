'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <AlertTriangle className="w-12 h-12 text-stone-900 mb-4" />
      <h2 className="text-xl font-bold mb-2">문제가 발생했습니다</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error.message || '페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
      </p>
      <Button onClick={reset} variant="outline">다시 시도</Button>
    </div>
  )
}
