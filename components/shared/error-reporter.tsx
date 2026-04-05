'use client'

import { useEffect } from 'react'

/**
 * Client-side error reporter.
 * Sets up window.onerror and window.onunhandledrejection
 * to POST errors to /api/v1/admin/errors (production only).
 */
export function ErrorReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    const reportError = (payload: {
      message: string
      stack?: string
      page: string
      severity: string
    }) => {
      try {
        fetch('/api/v1/admin/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {
          // Silently fail — don't cause more errors
        })
      } catch {
        // Silently fail
      }
    }

    const handleError = (event: ErrorEvent) => {
      reportError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        page: window.location.pathname,
        severity: 'high',
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason))
      reportError({
        message: `Unhandled Rejection: ${err.message}`,
        stack: err.stack,
        page: window.location.pathname,
        severity: 'high',
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
