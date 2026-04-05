import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { insert } from '@/lib/data-layer'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reportSchema = z.object({
  target_id: z.string().min(1),
  target_type: z.enum(['post', 'comment']),
  reason: z.enum(['SPAM', 'INAPPROPRIATE', 'MISINFORMATION', 'ADVERTISEMENT', 'OTHER']),
  details: z.string().max(500).optional(),
})

export const dynamic = 'force-dynamic'

// POST /api/v1/community/report - Submit a report
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  try {
    const body = await req.json()
    const validated = reportSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: validated.error.flatten() } },
        { status: 400 }
      )
    }

    const { target_id, target_type, reason, details } = validated.data

    const result = await insert('community_reports', {
      reporter_id: userId,
      target_id,
      target_type,
      reason,
      details: details || null,
      status: 'PENDING',
    })

    return NextResponse.json({
      success: true,
      report: result.data,
      _source: result._source,
    }, { status: 201 })
  } catch {
    return Errors.badRequest('신고 접수에 실패했습니다.')
  }
}
