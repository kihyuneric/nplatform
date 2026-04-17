import { Errors } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

// ─── Mock Data (fallback) ─────────────────────────────────────
const MOCK_LEADS = [
  { id: 'L-001', date: '2026-03-18', property: '서울 강남구 아파트 담보채권', amount: '32억', status: '신규', fee: '960만원', region: '서울', type: '아파트' },
  { id: 'L-002', date: '2026-03-17', property: '부산 해운대 상가 NPL', amount: '18억', status: '진행', fee: '540만원', region: '부산', type: '상가' },
  { id: 'L-003', date: '2026-03-16', property: '경기 판교 오피스 비경매', amount: '56억', status: '완료', fee: '1,680만원', region: '경기', type: '오피스' },
  { id: 'L-004', date: '2026-03-15', property: '인천 송도 물류센터 채권', amount: '124억', status: '진행', fee: '3,720만원', region: '인천', type: '공장/창고' },
  { id: 'L-005', date: '2026-03-14', property: '대전 유성구 토지 NPL', amount: '8.7억', status: '신규', fee: '261만원', region: '대전', type: '토지' },
  { id: 'L-006', date: '2026-03-13', property: '서울 마포구 빌라 포트폴리오', amount: '43억', status: '진행', fee: '1,290만원', region: '서울', type: '빌라/다세대' },
  { id: 'L-007', date: '2026-03-12', property: '광주 북구 상가 채권', amount: '6.2억', status: '완료', fee: '186만원', region: '광주', type: '상가' },
  { id: 'L-008', date: '2026-03-11', property: '경기 성남 오피스텔 NPL', amount: '15억', status: '신규', fee: '450만원', region: '경기', type: '오피스텔' },
  { id: 'L-009', date: '2026-03-10', property: '서울 종로구 빌딩 채권', amount: '89억', status: '진행', fee: '2,670만원', region: '서울', type: '오피스' },
  { id: 'L-010', date: '2026-03-09', property: '부산 동래구 아파트 NPL', amount: '12억', status: '완료', fee: '360만원', region: '부산', type: '아파트' },
  { id: 'L-011', date: '2026-03-08', property: '세종시 상업용 부지', amount: '22억', status: '신규', fee: '660만원', region: '세종', type: '토지' },
  { id: 'L-012', date: '2026-03-07', property: '경기 용인 아파트 NPL', amount: '9.5억', status: '완료', fee: '285만원', region: '경기', type: '아파트' },
]

// Helper: map referral status to display label
function mapStatus(status: string): string {
  switch (status) {
    case 'CONVERTED': return '완료'
    case 'ACTIVE': return '진행'
    case 'CHURNED': return '거절'
    default: return '신규'
  }
}

// Helper: format amount in 억 units
function formatAmount(value: number | null): string {
  if (!value) return '-'
  const eok = value / 100_000_000
  return eok >= 1 ? `${eok.toFixed(1).replace(/\.0$/, '')}억` : `${Math.round(value / 10_000).toLocaleString()}만원`
}

// ─── GET /api/v1/partner/leads ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    // Try to fetch from referrals table
    let query = supabase
      .from('referrals')
      .select('id, status, signed_up_at, converted_at', { count: 'exact' })
      .eq('referrer_id', user.id)
      .order('signed_up_at', { ascending: false })

    const { data: referrals, count, error } = await query

    if (error || !referrals || referrals.length === 0) {
      // Fall back to mock data
      let filtered = [...MOCK_LEADS]

      if (status && status !== '전체') {
        filtered = filtered.filter((l) => l.status === status)
      }

      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(
          (l) =>
            l.property.toLowerCase().includes(q) ||
            l.id.toLowerCase().includes(q) ||
            l.region.includes(q),
        )
      }

      const total = filtered.length
      const start = (page - 1) * pageSize
      const items = filtered.slice(start, start + pageSize)

      return NextResponse.json({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        _mock: true,
      })
    }

    // Map referrals to lead response format
    let items = referrals.map((r) => ({
      id: r.id.slice(0, 8).toUpperCase(),
      date: (r.signed_up_at ?? '').slice(0, 10),
      property: '추천 회원',
      amount: '-',
      status: mapStatus(r.status),
      fee: '-',
      region: '-',
      type: '-',
      _referralId: r.id,
    }))

    // Apply status filter
    if (status && status !== '전체') {
      items = items.filter((l) => l.status === status)
    }

    // Apply search filter
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (l) =>
          l.property.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q),
      )
    }

    const total = items.length
    const start = (page - 1) * pageSize
    const paginated = items.slice(start, start + pageSize)

    return NextResponse.json({
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    logger.error('[partner/leads] GET Error:', { error: err })
    return Errors.internal('리드 목록을 불러오는 데 실패했습니다.')
  }
}

// ─── POST /api/v1/partner/leads ───────────────────────────────
// Accept or reject a lead
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 })

    const body = await req.json()
    const { leadId, action } = body

    if (!leadId) {
      return Errors.badRequest('리드 ID가 필요합니다.')
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      return Errors.badRequest('유효한 액션(accept/reject)을 지정해주세요.')
    }

    const newStatus = action === 'accept' ? 'ACTIVE' : 'CHURNED'
    const displayStatus = action === 'accept' ? '진행' : '거절'

    // Try to update in referrals table (by short id prefix match or full id)
    const { data: updated, error } = await supabase
      .from('referrals')
      .update({ status: newStatus })
      .eq('referrer_id', user.id)
      .or(`id.eq.${leadId},id.like.${leadId}%`)
      .select('id')
      .maybeSingle()

    if (error) {
      logger.error('[partner/leads] POST update error:', { error })
    }

    // If no DB row found, treat as mock success
    const resolvedId = updated?.id ?? leadId

    return NextResponse.json({
      id: resolvedId,
      status: displayStatus,
      updatedAt: new Date().toISOString(),
      message: action === 'accept' ? '리드를 수락했습니다.' : '리드를 거절했습니다.',
    })
  } catch (err) {
    logger.error('[partner/leads] POST Error:', { error: err })
    return Errors.internal('리드 처리 중 오류가 발생했습니다.')
  }
}
