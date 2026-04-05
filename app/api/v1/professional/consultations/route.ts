import { NextRequest, NextResponse } from 'next/server'
import type { QueryFilters } from '@/lib/db-types'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert, update } from '@/lib/data-layer'
import { createClient } from '@/lib/supabase/server'
import { notifyAction } from '@/lib/action-notify'
import { sanitizeInput } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

function generateBookingReference(): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `CON-${dateStr}-${rand}`
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}

// GET - List consultations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const professionalId = searchParams.get('professional_id')
  const clientId = searchParams.get('client_id')
  const status = searchParams.get('status')

  try {
    const filters: QueryFilters = {}
    if (professionalId) filters.professional_id = professionalId
    if (clientId) filters.client_id = clientId
    if (status) filters.status = status

    const result = await query('consultations', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
    })

    return NextResponse.json({ data: result.data, _source: result._source })
  } catch {
    return NextResponse.json({ data: [], _source: 'sample' })
  }
}

// POST - Create consultation request
export async function POST(req: NextRequest) {
  let userId = 'anonymous'
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {
    // No auth — use anonymous in dev mode
  }

  try {
    const body = await req.json()
    const { professional_id, service_id, scheduled_at, preferred_date, scheduled_date, scheduled_time, content, listing_id } = body

    if (!professional_id) {
      return Errors.badRequest('전문가 ID는 필수입니다.')
    }
    if (!content || content.length < 5) {
      return Errors.badRequest('상담 내용은 5자 이상 입력해주세요.')
    }

    // Sanitize user-provided text
    const sanitizedContent = sanitizeInput(content)

    const bookingReference = generateBookingReference()

    // Determine scheduled_at from various input formats
    let resolvedScheduledAt = scheduled_at || preferred_date || null
    if (!resolvedScheduledAt && scheduled_date && scheduled_time) {
      resolvedScheduledAt = `${scheduled_date}T${scheduled_time}:00`
    }
    if (!resolvedScheduledAt) {
      resolvedScheduledAt = new Date().toISOString()
    }

    const result = await insert('consultations', {
      professional_id,
      client_id: userId,
      service_id: service_id || null,
      scheduled_at: resolvedScheduledAt,
      scheduled_date: scheduled_date || null,
      scheduled_time: scheduled_time || null,
      content: sanitizedContent,
      listing_id: listing_id || null,
      status: 'PENDING',
      booking_reference: bookingReference,
    })

    // Send notification to the professional
    await notifyAction('CONSULTATION', {
      targetUserId: professional_id,
      message: '새로운 상담 요청이 접수되었습니다',
    })

    return NextResponse.json({ data: { ...result.data, booking_reference: bookingReference }, _source: result._source }, { status: 201 })
  } catch {
    return Errors.internal('상담 요청 중 오류가 발생했습니다.')
  }
}

// PATCH - Update consultation status / add rating
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status: newStatus, rating, review } = body

    if (!id) {
      return Errors.badRequest('상담 ID가 필요합니다.')
    }

    // Validate status transition if status is being changed
    if (newStatus) {
      const existing = await query('consultations', { filters: { id } })
      const consultation = existing.data[0] as Record<string, unknown> | undefined
      if (consultation) {
        const currentStatus = consultation.status as string
        const allowed = VALID_TRANSITIONS[currentStatus] || []
        if (!allowed.includes(newStatus)) {
          return Errors.badRequest('상태를 ${currentStatus}에서 ${newStatus}로 변경할 수 없습니다.')
        }
      }
    }

    const updates: Record<string, unknown> = {}
    if (newStatus) updates.status = newStatus
    if (newStatus === 'COMPLETED') updates.completed_at = new Date().toISOString()

    // Allow rating and review only when completing or already completed
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return Errors.badRequest('별점은 1~5 사이여야 합니다.')
      }
      updates.rating = rating
    }
    if (review !== undefined) updates.review = review

    const result = await update('consultations', id, updates)
    return NextResponse.json({ data: result.data, _source: result._source })
  } catch {
    return Errors.internal('상담 업데이트 중 오류가 발생했습니다.')
  }
}
