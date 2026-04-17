'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    setIsOffline(!navigator.onLine)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.
    </div>
  )
}
