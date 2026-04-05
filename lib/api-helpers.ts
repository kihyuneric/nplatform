/**
 * API route helper utilities — wraps common patterns:
 * - Authenticated route handler (auto 401 if no user)
 * - Try/catch wrapper with standardized error shape
 * - Pagination query parsing
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, error as apiError } from '@/lib/api-response'
import type { User } from '@supabase/supabase-js'

// ─── Pagination params helper ────────────────────────────────

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

// ─── Auth guard ──────────────────────────────────────────────

type AuthedHandler = (req: NextRequest, user: User) => Promise<NextResponse>
type OptionalAuthHandler = (req: NextRequest, user: User | null) => Promise<NextResponse>

/**
 * Wraps a route handler that requires authentication.
 * Returns 401 automatically if user is not logged in.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return unauthorized()
      return await handler(req, user)
    } catch (e) {
      logger.error('[withAuth]', { error: e })
      return apiError('INTERNAL_ERROR', '서버 오류가 발생했습니다', 500)
    }
  }
}

/**
 * Wraps a route handler where auth is optional (user may be null).
 */
export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      return await handler(req, user ?? null)
    } catch (e) {
      logger.error('[withOptionalAuth]', { error: e })
      return apiError('INTERNAL_ERROR', '서버 오류가 발생했습니다', 500)
    }
  }
}

/**
 * Wraps any route handler with a standardized try/catch.
 * Converts unhandled exceptions to a 500 response.
 */
export function withErrorBoundary(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (e) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류'
      logger.error('[API Error]', { path: req.nextUrl.pathname, error: e })
      return apiError('INTERNAL_ERROR', message, 500)
    }
  }
}
