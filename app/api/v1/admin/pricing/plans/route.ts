import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { sanitizeInput } from '@/lib/sanitize'

// ─── Mock Plans ─────────────────────────────────────────────
const PLANS = [
  {
    id: 'plan_free',
    name: 'FREE',
    display_name: '무료',
    description: '기본 기능 체험',
    monthly_price: 0,
    annual_price: 0,
    credits_per_month: 10,
    features: [
      '매물 검색 (일 5회)',
      '기본 시장 통계',
      '뉴스 피드',
      '커뮤니티 열람',
    ],
    limits: {
      daily_searches: 5,
      ai_analysis: 0,
      deal_rooms: 0,
      exports: 0,
    },
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'plan_pro',
    name: 'PRO',
    display_name: '프로',
    description: '전문 투자자를 위한 플랜',
    monthly_price: 99000,
    annual_price: 990000,
    credits_per_month: 200,
    features: [
      '무제한 매물 검색',
      'AI NPL 분석',
      '딜룸 참여',
      '실사 보고서',
      '엑셀 내보내기',
      '이메일 알림',
      '전문가 커뮤니티',
    ],
    limits: {
      daily_searches: -1,
      ai_analysis: 50,
      deal_rooms: 10,
      exports: 100,
    },
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'plan_enterprise',
    name: 'ENTERPRISE',
    display_name: '엔터프라이즈',
    description: '기관 투자자 및 대형 자산관리사',
    monthly_price: 490000,
    annual_price: 4900000,
    credits_per_month: 1000,
    features: [
      'PRO 플랜 모든 기능',
      '무제한 AI 분석',
      '무제한 딜룸',
      '전담 매니저',
      'API 액세스',
      '화이트라벨 보고서',
      '우선 매물 매칭',
      '대량 데이터 내보내기',
    ],
    limits: {
      daily_searches: -1,
      ai_analysis: -1,
      deal_rooms: -1,
      exports: -1,
    },
    is_active: true,
    sort_order: 3,
  },
]

// ─── GET: List all subscription plans ───────────────────────
export async function GET() {
  return NextResponse.json({ plans: PLANS })
}

// ─── POST: Create new plan ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.display_name) {
      return Errors.badRequest('name and display_name are required')
    }

    if (body.name) body.name = sanitizeInput(body.name)
    if (body.display_name) body.display_name = sanitizeInput(body.display_name)
    if (body.description) body.description = sanitizeInput(body.description)

    const newPlan = {
      id: `plan_${body.name.toLowerCase()}`,
      name: body.name,
      display_name: body.display_name,
      description: body.description || '',
      monthly_price: body.monthly_price || 0,
      annual_price: body.annual_price || 0,
      credits_per_month: body.credits_per_month || 0,
      features: body.features || [],
      limits: body.limits || {},
      is_active: true,
      sort_order: PLANS.length + 1,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, plan: newPlan }, { status: 201 })
  } catch {
    return Errors.internal('Internal server error')
  }
}

// ─── PATCH: Update plan ─────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.plan_id) {
      return Errors.badRequest('plan_id is required')
    }

    const existing = PLANS.find((p) => p.id === body.plan_id)
    if (!existing) {
      return Errors.notFound('Plan not found: ${body.plan_id}')
    }

    // Sanitize string fields
    if (body.display_name) body.display_name = sanitizeInput(body.display_name)
    if (body.description) body.description = sanitizeInput(body.description)

    // Mock: return updated plan
    const updated = {
      ...existing,
      ...(body.monthly_price !== undefined && { monthly_price: body.monthly_price }),
      ...(body.annual_price !== undefined && { annual_price: body.annual_price }),
      ...(body.credits_per_month !== undefined && { credits_per_month: body.credits_per_month }),
      ...(body.features !== undefined && { features: body.features }),
      ...(body.display_name !== undefined && { display_name: body.display_name }),
      ...(body.description !== undefined && { description: body.description }),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, plan: updated })
  } catch {
    return Errors.internal('Internal server error')
  }
}
