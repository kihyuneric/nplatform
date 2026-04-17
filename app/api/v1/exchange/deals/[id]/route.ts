import type { UpdatePayload } from '@/lib/db-types'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { getById, update, insert } from "@/lib/data-layer"
import { notifyAction } from "@/lib/action-notify"
import { sendEmail, getUserEmail } from "@/lib/email/email-service"
import { dealStageEmail } from "@/lib/email/templates"
import { createClient } from "@/lib/supabase/server"

// ─── Constants ────────────────────────────────────────────

type DealStage = "INTEREST" | "NDA" | "DUE_DILIGENCE" | "NEGOTIATION" | "CONTRACT" | "SETTLEMENT" | "COMPLETED" | "CANCELLED"

const VALID_STAGES: DealStage[] = [
  "INTEREST", "NDA", "DUE_DILIGENCE", "NEGOTIATION",
  "CONTRACT", "SETTLEMENT", "COMPLETED", "CANCELLED",
]

const STAGE_ORDER: DealStage[] = [
  "INTEREST", "NDA", "DUE_DILIGENCE", "NEGOTIATION",
  "CONTRACT", "SETTLEMENT", "COMPLETED",
]

// Also accept sample-data stage names and map them
const STAGE_ALIASES: Record<string, string> = {
  'INQUIRY': 'INTEREST',
  'NDA_SIGNED': 'NDA',
  'PAYMENT': 'SETTLEMENT',
  'TRANSFER': 'SETTLEMENT',
}

// ─── GET /api/v1/exchange/deals/[id] ──────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, _source } = await getById('deals', id)

    if (!data) {
      return NextResponse.json(
        { error: { message: '거래를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, _source })
  } catch (err) {
    logger.error("[exchange/deals/[id]] GET error:", { error: err })
    return NextResponse.json(
      { error: { message: "딜 상세를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/v1/exchange/deals/[id] ────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Fetch current deal
    const { data: deal } = await getById('deals', id)

    if (!deal) {
      return NextResponse.json(
        { error: { message: '거래를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    const dealData = deal as Record<string, unknown>
    const requestedStage = body.stage || body.next_stage

    if (requestedStage) {
      // Validate the requested stage
      const normalizedStage = STAGE_ALIASES[requestedStage] || requestedStage
      if (!VALID_STAGES.includes(normalizedStage as DealStage)) {
        return NextResponse.json(
          { error: { message: `유효하지 않은 단계입니다: ${requestedStage}` } },
          { status: 400 }
        )
      }

      // Validate stage transition (must be sequential, or CANCELLED from any)
      if (normalizedStage !== 'CANCELLED') {
        const rawStage = (dealData.stage || dealData.current_stage) as string
        const currentStage = STAGE_ALIASES[rawStage] || rawStage
        const currentIndex = STAGE_ORDER.indexOf(currentStage as DealStage)
        const nextIndex = STAGE_ORDER.indexOf(normalizedStage as DealStage)

        if (currentIndex !== -1 && nextIndex !== -1 && nextIndex !== currentIndex + 1) {
          return NextResponse.json(
            {
              error: {
                message: `${currentStage}에서 ${normalizedStage}으로 전환할 수 없습니다. 다음 단계: ${STAGE_ORDER[currentIndex + 1] || '없음'}`,
              },
            },
            { status: 400 }
          )
        }
      }

      // Build update
      const changes: UpdatePayload = {
        stage: normalizedStage,
        current_stage: normalizedStage,
        updated_at: new Date().toISOString(),
      }

      if (normalizedStage === 'COMPLETED') {
        changes.status = 'COMPLETED'
        changes.completed_at = new Date().toISOString()
      }
      if (normalizedStage === 'CANCELLED') {
        changes.status = 'CANCELLED'
      }

      if (body.note) changes.notes = body.note

      const result = await update('deals', id, changes)

      // Create system message for stage transition
      try {
        const prevStage = dealData.stage || dealData.current_stage
        await insert('deal_messages', {
          deal_id: id,
          sender_id: 'system',
          message_type: 'SYSTEM',
          content: `딜이 ${prevStage} → ${normalizedStage} 단계로 전환되었습니다.`,
        })
      } catch {
        // message creation is best-effort
      }

      // Notify about stage change
      await notifyAction('DEAL_UPDATE', {
        dealId: id,
        message: `거래 단계가 ${normalizedStage}(으)로 변경되었습니다`,
      })

      // Send email notification to deal participants (best-effort)
      try {
        const supabase = await createClient()
        const dealTitle = (dealData.title as string) || (dealData.listing_title as string) || '거래'

        // Notify buyer + seller
        const participantIds = [
          dealData.buyer_id as string,
          dealData.seller_id as string,
        ].filter(Boolean)

        await Promise.allSettled(
          participantIds.map(async (uid) => {
            const { email, name } = await getUserEmail(supabase, uid)
            if (!email) return
            return sendEmail({
              to: email,
              ...dealStageEmail({ name, dealTitle, stage: normalizedStage, dealId: id }),
              tags: [{ name: 'type', value: 'deal_stage' }],
            })
          })
        )
      } catch (emailErr) {
        logger.warn('[deal PATCH] email notification failed:', { error: emailErr })
      }

      return NextResponse.json({ data: result.data, _source: result._source })
    }

    // General update (no stage change)
    const allowedFields = ['status', 'notes', 'current_offer_amount', 'final_price']
    const changes: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) changes[field] = body[field]
    }

    const result = await update('deals', id, changes)
    return NextResponse.json({ data: result.data, _source: result._source })
  } catch (err) {
    logger.error("[exchange/deals/[id]] PATCH error:", { error: err })
    return NextResponse.json(
      { error: { message: (err instanceof Error ? err.message : 'Unknown error') || "딜 수정 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
