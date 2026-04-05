import { logger } from '@/lib/logger'

// Server-side error collection
interface ErrorRecord {
  id: string
  timestamp: string
  message: string
  stack?: string
  page?: string
  api?: string
  userId?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'resolved' | 'ignored'
}

const errors: ErrorRecord[] = []

export function trackError(error: { message: string; stack?: string; page?: string; api?: string; userId?: string; severity?: string }) {
  errors.unshift({
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    page: error.page,
    api: error.api,
    userId: error.userId,
    severity: (error.severity as any) || 'medium',
    status: 'open',
  })
  // Keep last 500 errors
  if (errors.length > 500) errors.length = 500
}

export function getErrors(filters?: { status?: string; severity?: string }) {
  let result = [...errors]
  if (filters?.status) result = result.filter(e => e.status === filters.status)
  if (filters?.severity) result = result.filter(e => e.severity === filters.severity)
  return result
}

export function updateErrorStatus(id: string, status: 'open' | 'resolved' | 'ignored') {
  const err = errors.find(e => e.id === id)
  if (err) err.status = status
}

export function getErrorStats() {
  return {
    total: errors.length,
    open: errors.filter(e => e.status === 'open').length,
    resolved: errors.filter(e => e.status === 'resolved').length,
    critical: errors.filter(e => e.severity === 'critical' && e.status === 'open').length,
  }
}

// ─── Global unhandled rejection handler (server-side) ───────
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason))
    trackError({
      message: `Unhandled Promise Rejection: ${err.message}`,
      stack: err.stack,
      severity: 'high',
    })
    logger.error('[ErrorTracker] Unhandled Promise Rejection:', { error: err })
  })

  process.on('uncaughtException', (err: Error) => {
    trackError({
      message: `Uncaught Exception: ${err.message}`,
      stack: err.stack,
      severity: 'critical',
    })
    logger.error('[ErrorTracker] Uncaught Exception:', { error: err })
  })
}
