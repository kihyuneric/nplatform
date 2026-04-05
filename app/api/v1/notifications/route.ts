import { Errors, fromUnknown } from '@/lib/api-error'
import type { QueryFilters } from '@/lib/db-types'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { query, update } from '@/lib/data-layer'

// ─── GET: List notifications for user ───────────────────────
export async function GET() {
  try {
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // No auth — continue without user filter
    }

    const filters: QueryFilters = {}
    if (userId) {
      filters.user_id = userId
    }

    const result = await query('notifications', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
      limit: 50,
    })

    let data = result.data

    // If Supabase returned 0 results, fall through to sample data
    if (data.length === 0 && result._source === 'supabase') {
      const sampleResult = await query('notifications', {
        orderBy: 'created_at',
        order: 'desc',
        limit: 50,
      })
      // If sample also empty, that's fine — but if sample has data, use it
      if (sampleResult.data.length > 0) {
        data = sampleResult.data
      }
    }

    // If still empty (no auth, no sample loaded yet), return all sample notifications without filter
    if (data.length === 0) {
      const allResult = await query('notifications', {
        orderBy: 'created_at',
        order: 'desc',
        limit: 50,
      })
      data = allResult.data
    }

    const unreadCount = data.filter((n) => !n.read && !n.is_read).length
    return NextResponse.json({
      data,
      unread_count: unreadCount,
      _source: result._source,
    })
  } catch (e) {
    logger.error('[notifications] GET error:', { error: e })
    return NextResponse.json({ data: [], unread_count: 0, _source: 'error' })
  }
}

// ─── PATCH: Mark notification(s) as read ────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, all } = body

    if (all) {
      // For "mark all as read" — query all unread and update each
      // In Supabase mode, data-layer handles it; in sample mode we iterate
      const result = await query('notifications', {
        filters: { read: false },
        limit: 100,
      })

      for (const notification of result.data) {
        await update('notifications', (notification as Record<string, unknown>).id as string, { read: true })
      }

      return NextResponse.json({ success: true, _source: result._source })
    }

    if (id) {
      const result = await update('notifications', id, { read: true })
      return NextResponse.json({ data: result.data, _source: result._source })
    }

    return NextResponse.json({ success: true, _source: 'sample' })
  } catch {
    return Errors.internal('Internal server error')
  }
}
