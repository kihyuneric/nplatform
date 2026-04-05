import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"

// ─── Mock Data ────────────────────────────────────────────

const MOCK_INSTITUTIONS = [
  {
    id: "inst-001",
    tenant_id: "tenant-kdb",
    name: "한국산업은행 자산관리부",
    type: "은행",
    description: "국내 최대 정책금융기관의 NPL 전문 자산관리 부서",
    logo_url: "/images/institutions/kdb.png",
    trust_grade: "AAA",
    is_featured: true,
    total_deals: 128,
    active_listings: 15,
    success_rate: 0.92,
    avg_deal_period_days: 45,
    total_volume: 850000000000,
    region: "서울",
    contact_email: "npl@kdb.co.kr",
    website: "https://www.kdb.co.kr",
    verified_at: "2025-01-15T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "inst-002",
    tenant_id: "tenant-shinhan",
    name: "신한자산관리",
    type: "자산관리회사",
    description: "신한금융그룹 계열 전문 NPL 관리 및 투자 회사",
    logo_url: "/images/institutions/shinhan-amc.png",
    trust_grade: "AA+",
    is_featured: true,
    total_deals: 95,
    active_listings: 12,
    success_rate: 0.89,
    avg_deal_period_days: 38,
    total_volume: 620000000000,
    region: "서울",
    contact_email: "deal@shinhan-amc.co.kr",
    website: "https://www.shinhan-amc.co.kr",
    verified_at: "2025-02-01T00:00:00Z",
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "inst-003",
    tenant_id: "tenant-woori",
    name: "우리자산신탁",
    type: "신탁사",
    description: "우리금융그룹 부실채권 및 부동산 신탁 전문",
    logo_url: "/images/institutions/woori-trust.png",
    trust_grade: "AA",
    is_featured: false,
    total_deals: 67,
    active_listings: 8,
    success_rate: 0.85,
    avg_deal_period_days: 52,
    total_volume: 380000000000,
    region: "서울",
    contact_email: "npl@wooritrust.co.kr",
    website: "https://www.wooritrust.co.kr",
    verified_at: "2025-03-01T00:00:00Z",
    created_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "inst-004",
    tenant_id: "tenant-hana",
    name: "하나대체투자자산운용",
    type: "자산운용사",
    description: "하나금융그룹 NPL 대체투자 및 펀드 운용",
    logo_url: "/images/institutions/hana-alt.png",
    trust_grade: "AA",
    is_featured: true,
    total_deals: 54,
    active_listings: 6,
    success_rate: 0.91,
    avg_deal_period_days: 40,
    total_volume: 290000000000,
    region: "서울",
    contact_email: "invest@hana-alt.co.kr",
    website: "https://www.hana-alt.co.kr",
    verified_at: "2025-04-01T00:00:00Z",
    created_at: "2025-03-01T00:00:00Z",
  },
  {
    id: "inst-005",
    tenant_id: "tenant-kb",
    name: "KB부동산신탁",
    type: "신탁사",
    description: "KB금융그룹 부동산 개발 및 NPL 투자 전문 신탁사",
    logo_url: "/images/institutions/kb-retrust.png",
    trust_grade: "AA+",
    is_featured: false,
    total_deals: 82,
    active_listings: 10,
    success_rate: 0.87,
    avg_deal_period_days: 48,
    total_volume: 510000000000,
    region: "서울",
    contact_email: "deal@kbretrust.co.kr",
    website: "https://www.kbretrust.co.kr",
    verified_at: "2025-02-15T00:00:00Z",
    created_at: "2025-01-20T00:00:00Z",
  },
]

// ─── GET /api/v1/institutions ─────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const region = searchParams.get("region")
    const sort = searchParams.get("sort") || "featured"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

    const supabase = await createClient()

    let query = supabase
      .from("institution_profiles")
      .select("*", { count: "exact" })

    if (type) query = query.eq("type", type)
    if (region) query = query.ilike("region", `%${region}%`)

    switch (sort) {
      case "trust_grade":
        query = query.order("trust_grade", { ascending: true })
        break
      case "total_deals":
        query = query.order("total_deals", { ascending: false })
        break
      case "featured":
      default:
        query = query
          .order("is_featured", { ascending: false })
          .order("trust_grade", { ascending: true })
          .order("total_deals", { ascending: false })
        break
    }

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query

    if (error) {
      let filtered = [...MOCK_INSTITUTIONS]
      if (type) filtered = filtered.filter((i) => i.type === type)
      if (region) filtered = filtered.filter((i) => i.region.includes(region))

      if (sort === "total_deals") {
        filtered.sort((a, b) => b.total_deals - a.total_deals)
      } else {
        // Default: featured first, then by trust_grade
        filtered.sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          return a.trust_grade.localeCompare(b.trust_grade)
        })
      }

      const start = (page - 1) * limit
      const paged = filtered.slice(start, start + limit)

      return NextResponse.json({ data: paged, total: filtered.length, page, _mock: true }, {
        headers: { 'Cache-Control': 'public, max-age=600' },
      })
    }

    return NextResponse.json({ data, total: count ?? 0, page }, {
      headers: { 'Cache-Control': 'public, max-age=600' },
    })
  } catch (err) {
    logger.error("[institutions] GET error:", { error: err })
    return Errors.internal('기관 목록을 불러오는 중 오류가 발생했습니다.')
  }
}
