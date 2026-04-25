'use client'

import { Loader2, AlertCircle, FileX, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'

// Loading state
export function PageLoading({ message }: { message?: string }) {
  const defaultMsg = t('pageState.loading') || '로딩 중...'
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 animate-spin text-[#1B3A5C] mb-3" />
      <p className="text-sm text-muted-foreground">{message || defaultMsg}</p>
    </div>
  )
}

// Error state with retry
export function PageError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const defaultMsg = t('pageState.errorDescription') || '데이터를 불러오는데 실패했습니다'
  const errorTitle = t('pageState.errorTitle') || '오류가 발생했습니다'
  const retryLabel = t('pageState.retry') || '다시 시도'
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4" role="alert">
      <AlertCircle className="w-12 h-12 text-stone-900 mb-4" />
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{errorTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">{message || defaultMsg}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />{retryLabel}
        </Button>
      )}
    </div>
  )
}

// Empty state
export function PageEmpty({
  icon: Icon = FileX,
  title,
  description,
  action,
}: {
  icon?: any
  title?: string
  description?: string
  action?: { label: string; href: string }
}) {
  const defaultTitle = t('pageState.empty') || '데이터가 없습니다'
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface-overlay)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title || defaultTitle}</h3>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>}
      {action && (
        <a href={action.href} className="mt-4 inline-flex items-center px-4 py-2 bg-[#1B3A5C] text-white rounded-lg hover:bg-[#2E75B6] transition text-sm">
          {action.label}
        </a>
      )}
    </div>
  )
}

// Inline loading for smaller sections
export function InlineLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-[#1B3A5C]" />
    </div>
  )
}
