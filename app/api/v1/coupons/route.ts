import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"
import { query, insert } from "@/lib/data-layer"
import { type Coupon, type CouponType, generateCouponCode, validateCoupon } from "@/lib/coupon"
import { z } from "zod"

const couponCreateSchema = z.object({
  code: z.string().min(1, '쿠폰 코드는 필수입니다').optional(),
  prefix: z.string().optional(),
  type: z.enum(['FREE_PLAN', 'CREDITS', 'VIP', 'DISCOUNT', 'INVITATION', 'CREDIT', 'FREE_TRIAL'], {
    errorMap: () => ({ message: '유효하지 않은 쿠폰 타입입니다.' }),
  }),
  value: z.union([z.number(), z.record(z.unknown())]).transform((v) =>
    typeof v === 'number' ? { amount: v } : v
  ).default({ amount: 0 }),
  max_uses: z.number().nullable().optional(),
  maxUses: z.number().nullable().optional(),
  targetRoles: z.array(z.string()).default([]),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
})

export async function GET() {
  try {
    const result = await query('coupons', {
      orderBy: 'created_at',
      order: 'desc',
    })

    const enriched = result.data.map((raw) => {
      const c = raw as unknown as Coupon
      return { ...c, validation: validateCoupon(c) }
    })

    return NextResponse.json({
      data: enriched,
      summary: {
        total: result.data.length,
        active: result.data.filter((c) => (c as Record<string, unknown>).status === "ACTIVE").length,
        exhausted: result.data.filter((c) => (c as Record<string, unknown>).status === "EXHAUSTED").length,
        expired: result.data.filter((c) => (c as Record<string, unknown>).status === "EXPIRED").length,
      },
      _source: result._source,
    })
  } catch (e) {
    logger.error('[coupons] GET error:', { error: e })
    return NextResponse.json({ data: [], summary: { total: 0, active: 0, exhausted: 0, expired: 0 }, _source: 'sample' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = couponCreateSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: validated.error.flatten() } },
        { status: 400 }
      )
    }
    const v = validated.data

    const couponData = {
      code: v.code || generateCouponCode(v.prefix),
      type: v.type as CouponType,
      value: v.value,
      maxUses: v.maxUses ?? null,
      usedCount: 0,
      targetRoles: v.targetRoles,
      validFrom: v.validFrom || new Date().toISOString().slice(0, 10),
      validUntil: v.validUntil || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      status: "ACTIVE",
    }

    // Try to get user for created_by field
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        (couponData as Record<string, unknown>).created_by = user.id
      }
    } catch (err) {

      logger.warn("[route] silent catch", { error: err })

    }

    const result = await insert('coupons', couponData)

    return NextResponse.json({ data: result.data, _source: result._source }, { status: 201 })
  } catch {
    return Errors.badRequest('잘못된 요청입니다')
  }
}
