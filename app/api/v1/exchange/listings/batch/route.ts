/**
 * POST /api/v1/exchange/listings/batch
 *
 * 1~5건 NPL 매물 일괄 등록 (OCR 기반 사용자 검증 후 제출).
 *
 * Body: { listings: Array<ListingPostInput> }  (최소 1건, 최대 5건)
 *
 * - 각 항목은 /api/v1/exchange/listings POST 스키마와 호환 (Zod로 검증)
 * - 부분 실패 허용: 항목별 성공/실패 결과를 반환
 * - 각 매물은 status='PENDING_REVIEW' 로 저장 (관리자 승인 후 노출)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"
import { insert } from "@/lib/data-layer"
import { sanitizeInput } from "@/lib/sanitize"
import { notifyAction } from "@/lib/action-notify"
import { error as apiError, validationError } from "@/lib/api-response"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const COLLATERAL_TYPES = ['아파트','오피스텔','다세대','단독주택','상가','오피스','토지','공장','호텔','기타'] as const
const RISK_GRADES      = ['AAA','AA','A','BBB','BB','B','CCC','CC','C','D'] as const
const VISIBILITIES     = ['PUBLIC','INTERNAL','TARGETED','VIP'] as const

const listingItemSchema = z.object({
  collateral_type:   z.enum(COLLATERAL_TYPES),
  principal_amount:  z.number({ invalid_type_error: '채권원금은 숫자여야 합니다' }).min(1_000_000, '채권원금은 100만원 이상이어야 합니다'),
  title:             z.string().max(200).optional(),
  description:       z.string().max(5000).optional(),
  location:          z.string().max(100).optional(),
  location_detail:   z.string().max(200).optional(),
  address:           z.string().max(300).optional(),
  institution_name:  z.string().max(100).optional(),
  listing_type:      z.enum(['NPL','REO','UPL']).default('NPL'),
  risk_grade:        z.enum(RISK_GRADES).default('B'),
  visibility:        z.enum(VISIBILITIES).default('PUBLIC'),
  appraisal_value:   z.number().min(0).optional(),
  appraised_value:   z.number().min(0).optional(),
  area:              z.number().min(0).optional(),
  deadline:          z.string().optional().nullable(),
  asking_price_min:  z.number().min(0).optional(),
  asking_price_max:  z.number().min(0).optional(),
  ai_estimate_low:   z.number().min(0).optional(),
  ai_estimate_high:  z.number().min(0).optional(),
  source:            z.literal('ocr-batch').optional(),
}).refine(
  d => !d.asking_price_min || !d.asking_price_max || d.asking_price_min <= d.asking_price_max,
  { message: '최소 희망가는 최대 희망가를 초과할 수 없습니다', path: ['asking_price_min'] }
)

const batchSchema = z.object({
  listings: z.array(listingItemSchema).min(1, '최소 1건을 등록해야 합니다').max(5, '한 번에 최대 5건까지 등록 가능합니다'),
})

type ListingItem = z.infer<typeof listingItemSchema>

interface BatchResultRow {
  index: number
  success: boolean
  listing_number?: string
  id?: string
  error?: string
}

function buildRow(body: ListingItem, userId: string): { row: Record<string, unknown>; listing_number: string } {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = String(Math.floor(1000 + Math.random() * 9000))
  const listing_number = `NPL-${ym}-${rand}`

  const addr = body.address ?? `${body.location ?? ''} ${body.location_detail ?? ''}`.trim()
  const appraised = body.appraisal_value ?? body.appraised_value ?? 0

  return {
    listing_number,
    row: {
      seller_id: userId,
      title: sanitizeInput(body.title ?? `${body.location ?? ''} ${body.collateral_type} 채권`),
      description: sanitizeInput(body.description ?? ''),
      collateral_type: body.collateral_type,
      sido: body.location ?? addr.split(' ')[0] ?? null,
      address: addr,
      claim_amount: body.principal_amount,
      appraised_value: appraised,
      discount_rate: appraised && body.asking_price_min
        ? Math.round((1 - body.asking_price_min / appraised) * 100)
        : 0,
      ai_grade: body.risk_grade ?? 'B',
      listing_type: 'NPL',
      status: 'PENDING_REVIEW',
      visibility: body.visibility ?? 'PUBLIC',
      deadline: body.deadline ?? null,
      area_sqm: body.area ?? 0,
      view_count: 0,
      interest_count: 0,
      ai_estimate_low: body.ai_estimate_low ?? 0,
      ai_estimate_high: body.ai_estimate_high ?? 0,
      source: body.source ?? 'ocr-batch',
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    let userId = 'anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // sample mode
    }

    const rawBody: unknown = await request.json()
    const parsed = batchSchema.safeParse(rawBody)
    if (!parsed.success) {
      const first = parsed.error.errors[0]
      return validationError({ field: first.path.join('.'), message: first.message })
    }

    const { listings } = parsed.data
    const results: BatchResultRow[] = []

    for (let i = 0; i < listings.length; i++) {
      const item = listings[i]
      try {
        const { row, listing_number } = buildRow(item, userId)
        const result = await insert('npl_listings', row)

        // Fallback to deal_listings for legacy compatibility (sample mode)
        let finalResult = result
        if (result._source === 'sample') {
          const legacyRow = {
            ...row,
            institution: item.institution_name ?? '',
            listing_number,
            principal_amount: row.claim_amount,
            risk_grade: row.ai_grade,
            collateral_region: row.sido,
            asking_price_min: item.asking_price_min ?? 0,
            asking_price_max: item.asking_price_max ?? 0,
          }
          finalResult = await insert('deal_listings', legacyRow)
        }

        const resultData = finalResult.data as Record<string, unknown> | null
        results.push({
          index: i,
          success: true,
          listing_number,
          id: resultData?.id as string | undefined,
        })
      } catch (itemErr) {
        logger.error(`[listings/batch] item ${i} failed:`, { error: itemErr })
        results.push({
          index: i,
          success: false,
          error: itemErr instanceof Error ? itemErr.message : '등록 실패',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount    = results.length - successCount

    if (successCount > 0) {
      await notifyAction('NEW_LISTING', {
        message: `OCR 기반 ${successCount}건의 매물이 등록되었습니다`,
        targetUserId: 'admin',
      })
    }

    return NextResponse.json(
      {
        success: successCount,
        failed:  failCount,
        total:   results.length,
        results,
        message: `${successCount}건 등록 성공, ${failCount}건 실패`,
      },
      { status: failCount === 0 ? 201 : 207 /* Multi-Status */ }
    )
  } catch (err) {
    logger.error("[exchange/listings/batch] POST error:", { error: err })
    return apiError('INTERNAL_ERROR', '매물 일괄 등록 중 오류가 발생했습니다', 500)
  }
}
