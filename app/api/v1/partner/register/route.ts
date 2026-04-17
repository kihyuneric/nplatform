import { Errors } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

// ─── GET /api/v1/partner/register — Check registration status ─
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 })

    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, status, company_name, notes, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    if (!partner) {
      return NextResponse.json({ data: { registered: false } })
    }

    // Parse partnerType from notes JSON if stored there
    let partnerType: string | null = null
    try {
      if (partner.notes) {
        const parsed = JSON.parse(partner.notes)
        partnerType = parsed.partnerType ?? null
      }
    } catch {
      // notes is plain text — not JSON
    }

    return NextResponse.json({
      data: {
        registered: true,
        status: partner.status,
        partnerId: partner.id,
        partnerType,
        companyName: partner.company_name,
        registeredAt: partner.created_at,
      },
    })
  } catch (err) {
    logger.error('[partner/register] GET Error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '등록 상태 조회 실패' } },
      { status: 500 },
    )
  }
}

// ─── POST /api/v1/partner/register ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 })

    const body = await req.json()

    // Required field validation
    const required: { key: string; label: string }[] = [
      { key: 'partnerType', label: '파트너 유형' },
      { key: 'companyName', label: '회사명' },
      { key: 'ceoName', label: '대표자' },
      { key: 'bizNumber', label: '사업자번호' },
      { key: 'phone', label: '연락처' },
    ]

    for (const field of required) {
      if (!body[field.key]) {
        return Errors.badRequest(`${field.label}은(는) 필수 입력 항목입니다.`)
      }
    }

    if (!['AMC', 'LENDER', 'REALTOR'].includes(body.partnerType)) {
      return Errors.badRequest('유효하지 않은 파트너 유형입니다.')
    }

    if (
      !body.collateralTypes ||
      !Array.isArray(body.collateralTypes) ||
      body.collateralTypes.length === 0
    ) {
      return Errors.badRequest('담보 유형을 하나 이상 선택해주세요.')
    }

    if (
      !body.regions ||
      !Array.isArray(body.regions) ||
      body.regions.length === 0
    ) {
      return Errors.badRequest('활동 지역을 하나 이상 선택해주세요.')
    }

    if (!body.agreeTerms || !body.agreePrivacy) {
      return Errors.badRequest('필수 약관에 동의해주세요.')
    }

    // Check for duplicate registration
    const { data: existing } = await supabase
      .from('partners')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'ALREADY_REGISTERED', message: '이미 파트너 신청이 접수되어 있습니다.' } },
        { status: 409 },
      )
    }

    // Store extended fields (partnerType, collateralTypes, regions, expertise) in notes as JSON
    const notesData = JSON.stringify({
      partnerType: body.partnerType,
      collateralTypes: body.collateralTypes,
      regions: body.regions,
      expertise: body.expertise || null,
    })

    // Use service role to bypass RLS on insert (partner registers themselves)
    let adminClient: ReturnType<typeof getSupabaseAdmin> | null = null
    try {
      adminClient = getSupabaseAdmin()
    } catch {
      // Service role not configured — fall back to user client
    }

    const client = adminClient ?? supabase

    const { data: partner, error: insertError } = await client
      .from('partners')
      .insert({
        user_id: user.id,
        company_name: body.companyName,
        contact_name: body.ceoName,
        phone: body.phone,
        email: body.email || null,
        business_number: body.bizNumber,
        status: 'PENDING',
        notes: notesData,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json(
      {
        id: partner.id,
        partnerType: body.partnerType,
        companyName: partner.company_name,
        ceoName: partner.contact_name,
        bizNumber: partner.business_number,
        phone: partner.phone,
        email: partner.email,
        address: body.address || null,
        collateralTypes: body.collateralTypes,
        regions: body.regions,
        expertise: body.expertise || null,
        status: 'PENDING_REVIEW',
        createdAt: partner.created_at,
      },
      { status: 201 },
    )
  } catch (err) {
    logger.error('[partner/register] POST Error:', { error: err })
    return Errors.internal('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  }
}
