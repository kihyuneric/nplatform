import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert } from '@/lib/data-layer'

// ─── GET: Return top 10 most searched terms ─────────────
export async function GET() {
  try {
    const { data: logs } = await query('search_logs', {
      orderBy: 'created_at',
      order: 'desc',
      limit: 1000,
    })

    // Aggregate by term and count occurrences
    const counts: Record<string, number> = {}
    for (const log of logs) {
      const term = String(log.term ?? '').trim().toLowerCase()
      if (!term) continue
      counts[term] = (counts[term] || 0) + 1
    }

    // Sort by count descending and take top 10
    const popular = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }))

    return NextResponse.json({ data: popular })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

// ─── POST: Save a search term ───────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const term = (body.term || '').trim()

    if (!term) {
      return Errors.badRequest('Search term is required')
    }

    const { data } = await insert('search_logs', {
      term,
      user_id: body.user_id || 'anonymous',
    })

    return NextResponse.json({ data })
  } catch {
    return Errors.internal('Internal server error')
  }
}
