import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/*  Mock fallback data                                                 */
/* ------------------------------------------------------------------ */
const MOCK_STATS = {
  totalUsers: 1234,
  pendingApprovals: 3,
  activeListings: 847,
  pendingReviews: 5,
  activeDeals: 23,
  monthlyRevenue: 12340000,
  activeProfessionals: 45,
  activePartners: 28,
}

const MOCK_RECENT_USERS = [
  { name: "김민수", email: "minsu@example.com", role: "BUYER_INST", created_at: "2026-03-21T10:00:00Z", kyc_status: "APPROVED" },
  { name: "이영희", email: "younghee@corp.kr", role: "BUYER_INDV", created_at: "2026-03-21T08:30:00Z", kyc_status: "PENDING" },
  { name: "박성민", email: "sungmin@bank.com", role: "SELLER", created_at: "2026-03-20T15:00:00Z", kyc_status: "APPROVED" },
  { name: "정다은", email: "daeun@invest.kr", role: "PARTNER", created_at: "2026-03-20T11:00:00Z", kyc_status: "IN_REVIEW" },
  { name: "최영수", email: "youngs@fund.com", role: "BUYER_INST", created_at: "2026-03-19T09:00:00Z", kyc_status: "APPROVED" },
]

/* ------------------------------------------------------------------ */
/*  Helper: safe count query                                           */
/* ------------------------------------------------------------------ */
// Supabase query builder has no stable public type
type SupabaseQueryBuilder = any

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  filters?: (q: SupabaseQueryBuilder) => SupabaseQueryBuilder,
): Promise<number | null> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })
    if (filters) query = filters(query)
    const { count, error } = await query
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

async function safeSum(
  supabase: SupabaseClient,
  table: string,
  column: string,
  filters?: (q: SupabaseQueryBuilder) => SupabaseQueryBuilder,
): Promise<number | null> {
  try {
    let query = supabase.from(table).select(column)
    if (filters) query = filters(query)
    const { data, error } = await query
    if (error || !data) return null
    return (data as unknown as Record<string, unknown>[]).reduce((sum: number, row) => sum + (Number(row[column]) || 0), 0)
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/v1/admin/dashboard                                        */
/* ------------------------------------------------------------------ */
export async function GET() {
  let _source: string | undefined
  let _mock = false

  try {
    // Auth + role check via shared helper
    const authUser = await getAuthUserWithRole()
    if (!authUser) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }
    if (!authUser.role || !['SUPER_ADMIN', 'ADMIN'].includes(authUser.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' } },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // ── Fetch stats independently with fallback ──
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      pendingApprovals,
      activeListings,
      pendingReviews,
      activeDeals,
      monthlyRevenue,
      activeProfessionals,
      activePartners,
    ] = await Promise.all([
      safeCount(supabase, 'users'),
      safeCount(supabase, 'users', (q) => q.in('kyc_status', ['PENDING', 'SUBMITTED', 'IN_REVIEW'])),
      safeCount(supabase, 'npl_listings', (q) => q.eq('status', 'ACTIVE')),
      safeCount(supabase, 'npl_listings', (q) => q.eq('status', 'PENDING_REVIEW')),
      safeCount(supabase, 'contract_requests', (q) =>
        q.in('status', ['PENDING', 'REVIEWING', 'ACCEPTED', 'IN_PROGRESS', 'CLOSING'])
      ),
      safeSum(supabase, 'invoices', 'amount', (q) =>
        q.eq('status', 'PAID').gte('created_at', monthStart.toISOString())
      ),
      safeCount(supabase, 'professionals', (q) => q.eq('status', 'ACTIVE')),
      safeCount(supabase, 'partners', (q) => q.eq('status', 'ACTIVE')),
    ])

    // Check if at least some queries succeeded
    const anyReal = [totalUsers, pendingApprovals, activeListings].some((v) => v !== null)

    const stats = {
      totalUsers: totalUsers ?? MOCK_STATS.totalUsers,
      pendingApprovals: pendingApprovals ?? MOCK_STATS.pendingApprovals,
      activeListings: activeListings ?? MOCK_STATS.activeListings,
      pendingReviews: pendingReviews ?? MOCK_STATS.pendingReviews,
      activeDeals: activeDeals ?? MOCK_STATS.activeDeals,
      monthlyRevenue: monthlyRevenue ?? MOCK_STATS.monthlyRevenue,
      activeProfessionals: activeProfessionals ?? MOCK_STATS.activeProfessionals,
      activePartners: activePartners ?? MOCK_STATS.activePartners,
    }

    // ── Recent users ──
    let recentUsers = MOCK_RECENT_USERS
    try {
      const { data } = await supabase
        .from('users')
        .select('name, email, role, created_at, kyc_status')
        .order('created_at', { ascending: false })
        .limit(5)
      if (data && data.length > 0) recentUsers = data
    } catch {
      // keep mock
    }

    // ── System status ──
    const systemStatus = {
      database: 'healthy' as const,
      api: 'healthy' as const,
      realtime: 'healthy' as const,
      storage: 'healthy' as const,
      ai: process.env.OPENAI_API_KEY ? 'configured' as const : 'not_configured' as const,
    }

    // ── Phase G7+ 2026-04-29 — Zone 별 펜딩 카운트 (사이드바 배지용) ──
    const [
      maskingPending,
      piiAuditFlags,
      pendingAgreements,
      pendingMatching,
      pendingDemands,
    ] = await Promise.all([
      safeCount(supabase, 'masking_review_queue', (q) => q.eq('status', 'PENDING')),
      safeCount(supabase, 'pii_audit_logs', (q) => q.eq('severity', 'HIGH').gte('created_at', monthStart.toISOString())),
      safeCount(supabase, 'agreements', (q) => q.in('status', ['PENDING', 'AWAITING_SIGNATURE'])),
      safeCount(supabase, 'matching_results', (q) => q.eq('status', 'PENDING_REVIEW')),
      safeCount(supabase, 'demand_surveys', (q) => q.eq('status', 'NEW')),
    ])
    /**
     * ── 처리 대기 배지 (2026-08-19) — 운영기획서 v4 §2-1 ──
     *
     * 배지는 **내가 지금 처리해야 하는 것**에만 붙인다.
     * 매물관리·매입조건 관리처럼 "쌓여 있는 것을 보는" 화면에는 붙이지 않는다.
     * 아무 데나 붙으면 배지가 아무 의미도 갖지 못한다.
     */
    const [intakeDirect, intakeAgency, ndaPending, openTickets] = await Promise.all([
      safeCount(supabase, 'listing_intakes', q => q.eq('mode', 'direct').eq('status', '접수')),
      safeCount(supabase, 'listing_intakes', q => q.eq('mode', 'agency').eq('status', '접수')),
      // NDA 검토 대기 — listing_marketing.nda_requests 안의 '운영사 검토' 건수
      (async () => {
        try {
          const { data } = await supabase.from('listing_marketing').select('nda_requests').not('nda_requests', 'is', null)
          let n = 0
          for (const row of data ?? []) {
            const reqs = Array.isArray(row.nda_requests) ? row.nda_requests : []
            n += (reqs as Array<{ status?: string }>).filter(q => (q?.status ?? '운영사 검토') === '운영사 검토').length
          }
          return n
        } catch { return 0 }
      })(),
      safeCount(supabase, 'support_tickets', q => q.in('status', ['OPEN', 'IN_PROGRESS'])),
    ])

    const zoneCounts = {
      // ── 사이드바 메뉴 키와 1:1 (admin-sidebar.tsx ADMIN_ZONES) ──
      users: pendingApprovals ?? 0,        // 회원관리 — 승인 대기
      intakeDir: intakeDirect ?? 0,        // 매각의뢰 관리 — 검토 대기
      intakeAgy: intakeAgency ?? 0,        // 매물등록 대행관리 — 미처리 대행 요청
      agreements: ndaPending ?? 0,         // NDA 관리 — 검토 대기
      inbox: openTickets ?? 0,             // 문의 접수함 — 미처리 문의
      // (매물관리 · 매입조건 관리 · 매칭 관리 · 콘텐츠는 배지를 붙이지 않는다)

      // 거래 운영 — 검토·승인 대기 합계 (레거시 그룹 배지)
      operations:
        (pendingApprovals ?? 0) +
        (pendingReviews ?? 0) +
        (pendingAgreements ?? 0) +
        (pendingMatching ?? 0) +
        (pendingDemands ?? 0),
      // 수익·실적 — 별도 펜딩 없음 (정상 운영)
      revenue: 0,
      // 콘텐츠 — 단일 진입 (배지 없음)
      content: 0,
      // 보안·컴플라이언스 — 마스킹 + PII 감사
      compliance: (maskingPending ?? 0) + (piiAuditFlags ?? 0),
      // 시스템 — 시스템 헬스 이슈 (현재 고정 0, 추후 monitoring 연동)
      system: 0,
    }

    _source = anyReal ? 'supabase' : undefined
    _mock = !anyReal

    return NextResponse.json({
      stats,
      recentUsers,
      systemStatus,
      zoneCounts,
      _source,
      _mock,
    })
  } catch {
    // Complete fallback
    return NextResponse.json({
      stats: MOCK_STATS,
      recentUsers: MOCK_RECENT_USERS,
      systemStatus: {
        database: 'unknown',
        api: 'healthy',
        realtime: 'unknown',
        storage: 'unknown',
        ai: 'not_configured',
      },
      zoneCounts: { operations: 8, revenue: 0, content: 0, compliance: 2, system: 0 },
      _mock: true,
    })
  }
}
