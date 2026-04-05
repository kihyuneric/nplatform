import { NextRequest, NextResponse } from 'next/server'
import type { QueryFilters } from '@/lib/db-types'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert, update } from '@/lib/data-layer'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List services for a professional
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const professionalId = searchParams.get('professional_id')

  try {
    const filters: QueryFilters = { is_active: true }
    if (professionalId) {
      filters.professional_id = professionalId
    }

    const result = await query('professional_services', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
    })

    return NextResponse.json({ data: result.data, _source: result._source })
  } catch {
    return NextResponse.json({ data: [], _source: 'sample' })
  }
}

// POST - Create new service
export async function POST(req: NextRequest) {
  let userId = 'anonymous'
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {
    // No auth — use anonymous in dev mode
  }

  const body = await req.json()
  const { professional_id, name, description, price_type, price, duration_minutes, free_initial } = body

  if (!name) {
    return Errors.badRequest('서비스명은 필수입니다.')
  }

  try {
    const result = await insert('professional_services', {
      professional_id: professional_id || userId,
      name,
      description,
      price_type: price_type || 'PER_CASE',
      price: price || 0,
      duration_minutes,
      free_initial: free_initial || false,
      approval_status: 'APPROVED',
      is_active: true,
    })

    return NextResponse.json({ data: result.data, _source: result._source }, { status: 201 })
  } catch {
    return NextResponse.json(
      { data: { id: `svc-new-${Date.now()}`, ...body, approval_status: 'APPROVED', is_active: true }, _source: 'sample' },
      { status: 201 }
    )
  }
}

// PATCH - Update service
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return Errors.badRequest('서비스 ID가 필요합니다.')
  }

  try {
    const result = await update('professional_services', id, updates)
    return NextResponse.json({ data: result.data, _source: result._source })
  } catch {
    return NextResponse.json({ data: { id, ...updates }, _source: 'sample' })
  }
}
