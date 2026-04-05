'use client'

import { useState, useEffect } from 'react'
import { Clock, RefreshCw } from 'lucide-react'

function formatRelative(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

interface LastUpdatedProps {
  timestamp?: string | Date | null
  onRefresh?: () => void
  loading?: boolean
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md'
}

export function LastUpdated({
  timestamp,
  onRefresh,
  loading = false,
  className = '',
  showIcon = true,
  size = 'sm',
}: LastUpdatedProps) {
  const [relative, setRelative] = useState('')

  useEffect(() => {
    if (!timestamp) return

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    setRelative(formatRelative(date))

    // Update every minute
    const interval = setInterval(() => {
      setRelative(formatRelative(date))
    }, 60_000)

    return () => clearInterval(interval)
  }, [timestamp])

  if (!timestamp) return null

  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <span
      className={`inline-flex items-center gap-1 ${textSize} text-muted-foreground ${className}`}
    >
      {showIcon && <Clock className={iconSize} />}
      <span>최종 업데이트: {relative}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-1 rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          aria-label="새로고침"
        >
          <RefreshCw className={`${iconSize} ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </span>
  )
}
