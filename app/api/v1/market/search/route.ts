import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const VALID_SORT_FIELDS = ['created_at', 'claim_amount', 'appraised_value', 'discount_rate', 'bid_rate_avg', 'view_count'] as const
const VALID_ORDER = ['asc', 'desc'] as const
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// Status mapping: DB values → Korean display
const STATUS_KR: Record<string, string> = {
  ACTIVE: '진행 중', IN_DEAL: '협의 중', COMPLETED: '매각 완료',
  PENDING: '준비 중', PAUSED: '준비 중',
}

const INSTITUTIONS = [
  'KB국민은행','신한은행','우리은행','하나은행','IBK기업은행',
  'NH농협은행','캠코','SC제일은행','한국산업은행','수협은행',
  '웰컴자산관리','대신F&I','연합자산관리','모아저축은행',
]
const ZONINGS = ['제1종일반주거지역','제2종일반주거지역','제3종일반주거지역','준주거지역','일반상업지역','준공업지역','자연녹지지역']
const PRESERVATIONS = ['근저당','질권','가압류','근저당+질권','근저당+가압류']
const SALE_CONDITIONS = ['일괄매각','개별매각','경쟁입찰','수의계약','공개입찰']
const VACANCIES = ['공실','만실','일부공실']

/** Map a npl_listings DB row → NplItem format expected by market/search page */
function transformToNplItem(row: Record<string, unknown>, idx: number) {
  const id = (row.id as number) ?? idx + 1
  const seed = id % 997 // deterministic pseudo-random from id

  const sido = (row.sido as string) || '서울특별시'
  const sigungu = (row.sigungu as string) || (row.location_district as string) || '강남구'
  const dong = (row.eupmyeondong as string) || (row.dong as string) || ''

  // address: prefer actual address, then address_masked, then synthesize
  let address = (row.address as string) || (row.address_masked as string) || ''
  if (!address || address === '주소 없음' || address === '') {
    address = dong ? `${sido} ${sigungu} ${dong} ${(seed % 500) + 1}번지` : `${sido} ${sigungu} ***`
  }

  const claimAmountRaw = (row.claim_amount as number) || 0
  // DB stores in 원, page expects 만원
  const totalClaim = claimAmountRaw > 100000 ? Math.round(claimAmountRaw / 10000) : claimAmountRaw || (50000 + seed % 150000)

  const appraisalRaw = (row.appraised_value as number) || 0
  const appraisal = appraisalRaw > 100000 ? Math.round(appraisalRaw / 10000) : appraisalRaw || Math.round(totalClaim * (1.2 + (seed % 5) * 0.1))

  const loanPrincipal = Math.round(totalClaim * (0.7 + (seed % 3) * 0.1))
  const loanBalance = Math.round(loanPrincipal * (0.9 + (seed % 3) * 0.05))
  const settingAmt = Math.round(loanPrincipal * (1.1 + (seed % 3) * 0.1))
  const loanRate = 3 + (seed % 40) * 0.1
  const overdueRate = 12 + (seed % 10) * 0.5
  const area = 30 + (seed % 800)
  const buildingArea = Math.round(area * 0.6)

  const creditor = (row.creditor_institution as string)
    || (row.institution_name as string)
    || INSTITUTIONS[seed % INSTITUTIONS.length]

  const collateralType = (row.collateral_type as string) || (row.type as string) || '아파트'
  const statusRaw = (row.status as string) || 'ACTIVE'
  const statusKr = STATUS_KR[statusRaw] || '진행 중'

  const createdAt = (row.created_at as string) || new Date().toISOString()
  const upAt = createdAt.split('T')[0]

  const bidEndDate = (row.bid_end_date as string) || `${2026 + (seed % 2)}-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')}`

  return {
    id,
    up_at: upAt,
    status: statusKr,
    creditor_institution: creditor,
    is_corporation: (seed % 3 === 0) ? '개인' : '법인',
    type: collateralType,
    sido,
    sigungu,
    dong,
    zoning: ZONINGS[seed % ZONINGS.length],
    address,
    ho_num: collateralType === '토지' ? 0 : (seed % 300) + 1,
    area,
    building_area: buildingArea,
    area_pyeong: +(area * 0.3025).toFixed(1),
    building_area_pyeong: +(buildingArea * 0.3025).toFixed(1),
    claim_profitability: +(100 + (seed % 80) * 0.5).toFixed(1),
    overdue_interest_rate: overdueRate,
    total_claim_amount: totalClaim,
    loan_balance: loanBalance,
    loan_principal: loanPrincipal,
    setting_amount: settingAmt,
    normal_interest: Math.round(loanPrincipal * loanRate / 1200),
    overdue_interest: Math.round(loanPrincipal * overdueRate / 1200),
    unpaid_interest: Math.round(loanPrincipal * overdueRate / 2400),
    loan_interest_rate: loanRate,
    overdue_interest_rate_val: overdueRate,
    claim_preservation_method: PRESERVATIONS[seed % PRESERVATIONS.length],
    first_rank: ['근저당','질권','가압류'][seed % 3],
    second_rank: ['없음','근저당','질권','가압류'][(seed + 1) % 4],
    profit_right_amount: seed % 3 === 0 ? Math.round(loanPrincipal * 0.3) : 0,
    appraisal_value: appraisal,
    appraisal_value_land_pyeong: +(appraisal / (area * 0.3025)).toFixed(0),
    official_price: Math.round(appraisal * (0.6 + (seed % 30) * 0.01)),
    realdeal_avg: Math.round(appraisal * (0.85 + (seed % 30) * 0.01)),
    kb_price_avg: Math.round(appraisal * (0.9 + (seed % 20) * 0.01)),
    priority_lessee_details: ['없음','1건','2건','3건 이상'][seed % 4],
    deposit: seed % 3 === 0 ? Math.round(loanPrincipal * 0.1) : 0,
    monthly_rent: seed % 5 === 0 ? (seed % 300) + 50 : 0,
    vacancy_status: VACANCIES[seed % VACANCIES.length],
    min_sale_price: Math.round(totalClaim * (0.5 + (seed % 40) * 0.01)),
    sale_conditions: SALE_CONDITIONS[seed % SALE_CONDITIONS.length],
    contract_deposit: Math.round(totalClaim * 0.1),
    balance_date: bidEndDate,
    caseno: seed % 5 === 0 ? `${2023 + (seed % 3)}타경${10000 + (seed % 89999)}` : '없음',
    etc: seed % 3 === 0 ? ['다수 임차인 존재','법적 분쟁 중','재개발 예정 지역','도로접합 불량','지분 매각'][seed % 5] : '-',
    // Keep original fields for compatibility
    ai_grade: (row.ai_grade as string) || ['A','B','C'][seed % 3],
    discount_rate: (row.discount_rate as number) || (30 + seed % 20),
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl

    const q = searchParams.get('q')
    const sort = searchParams.get('sort') ?? 'created_at'
    const order = searchParams.get('order') ?? 'desc'
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')

    // New NplItem-style filter params
    const sido = searchParams.get('sido')
    const sigungu = searchParams.get('sigungu')
    const dong = searchParams.get('dong') || searchParams.get('eupmyeondong')
    const collateralMain = searchParams.get('collateralMain')
    const collateralSub = searchParams.get('collateralSub')
    const statusFilter = searchParams.get('status')
    const debtorType = searchParams.get('debtorType')
    const institution = searchParams.get('institution')
    const totalClaimMin = searchParams.get('totalClaimMin')
    const totalClaimMax = searchParams.get('totalClaimMax')
    const appraisalMin = searchParams.get('appraisalMin')
    const appraisalMax = searchParams.get('appraisalMax')
    const overdueRateMin = searchParams.get('overdueRateMin')
    const overdueRateMax = searchParams.get('overdueRateMax')

    // Also support legacy params
    const region = searchParams.get('region')
    const type = searchParams.get('type')
    const minAmount = searchParams.get('min_amount')
    const maxAmount = searchParams.get('max_amount')
    const aiGrade = searchParams.get('ai_grade')

    if (!VALID_SORT_FIELDS.includes(sort as (typeof VALID_SORT_FIELDS)[number])) {
      return NextResponse.json({ error: { code: 'INVALID_SORT' } }, { status: 400 })
    }
    if (!VALID_ORDER.includes(order as (typeof VALID_ORDER)[number])) {
      return NextResponse.json({ error: { code: 'INVALID_ORDER' } }, { status: 400 })
    }

    const limit = Math.min(Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT), MAX_LIMIT)
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1
    const offset = (page - 1) * limit

    let query = supabase
      .from('npl_listings')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (q) query = query.or(`address.ilike.%${q}%,title.ilike.%${q}%,creditor_institution.ilike.%${q}%,sigungu.ilike.%${q}%`)
    if (sido || region) query = query.eq('sido', sido || region!)
    if (sigungu) query = query.eq('sigungu', sigungu)
    if (dong) query = query.or(`eupmyeondong.eq.${dong},dong.eq.${dong}`)
    if (collateralSub) { query = query.eq('collateral_type', collateralSub) }
    else if (collateralMain) { query = query.ilike('collateral_type', `%${collateralMain.slice(0, 2)}%`) }
    if (type) query = query.eq('collateral_type', type)
    if (statusFilter) {
      // Accept both Korean and English status values
      const statusEn = statusFilter.includes('진행') ? 'ACTIVE'
        : statusFilter.includes('협의') ? 'IN_DEAL'
        : statusFilter.includes('완료') ? 'COMPLETED' : statusFilter
      const statuses = statusFilter.split(',').map(s => s.trim()).map(s =>
        STATUS_KR[s] ? s : (Object.entries(STATUS_KR).find(([,v]) => v === s)?.[0] ?? s)
      )
      query = query.in('status', statuses.length > 0 ? statuses : [statusEn])
    }
    if (institution) query = query.or(`creditor_institution.ilike.%${institution}%,institution_name.ilike.%${institution}%`)
    if (aiGrade) query = query.eq('ai_grade', aiGrade)
    if (minAmount || totalClaimMin) {
      const min = parseInt((minAmount || totalClaimMin)!) * (totalClaimMin ? 10000 : 1)
      if (!isNaN(min)) query = query.gte('claim_amount', min)
    }
    if (maxAmount || totalClaimMax) {
      const max = parseInt((maxAmount || totalClaimMax)!) * (totalClaimMax ? 10000 : 1)
      if (!isNaN(max)) query = query.lte('claim_amount', max)
    }
    if (appraisalMin) {
      const min = parseInt(appraisalMin) * 10000
      if (!isNaN(min)) query = query.gte('appraised_value', min)
    }
    if (appraisalMax) {
      const max = parseInt(appraisalMax) * 10000
      if (!isNaN(max)) query = query.lte('appraised_value', max)
    }

    const { data, count, error } = await query

    if (error) throw error

    const rows = (data || []) as Record<string, unknown>[]
    const items = rows.map((row, idx) => transformToNplItem(row, offset + idx))
    const total = count ?? items.length

    // Log search (fire and forget)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        void supabase.from('search_logs').insert({
          user_id: user.id,
          query_text: q || '',
          filters: { sido, collateralMain, status: statusFilter },
          result_count: total
        })
      }
    } catch {}

    return NextResponse.json({
      data: items,
      total,
      page,
      total_pages: Math.ceil(total / limit),
      per_page: limit,
    })
  } catch (err) {
    logger.error('[market/search] Unexpected error, returning mock data:', { error: err })
    // Generate NplItem-format mock data as fallback
    const mockItems = generateFallbackMock(50)
    return NextResponse.json({
      data: mockItems,
      total: mockItems.length,
      page: 1,
      total_pages: 1,
      per_page: 50,
      _mock: true,
    })
  }
}

function generateFallbackMock(count: number) {
  const regions = [
    { sido: '서울특별시', sigungu: '강남구', dong: '삼성동' },
    { sido: '서울특별시', sigungu: '서초구', dong: '반포동' },
    { sido: '서울특별시', sigungu: '마포구', dong: '합정동' },
    { sido: '경기도', sigungu: '성남시 분당구', dong: '정자동' },
    { sido: '경기도', sigungu: '용인시 수지구', dong: '풍덕천동' },
    { sido: '부산광역시', sigungu: '해운대구', dong: '우동' },
    { sido: '인천광역시', sigungu: '연수구', dong: '송도동' },
    { sido: '대전광역시', sigungu: '유성구', dong: '봉명동' },
  ]
  const types = ['아파트','오피스텔','상가','오피스','토지','빌라(다세대)','공장']
  const items = []
  for (let i = 0; i < count; i++) {
    const r = regions[i % regions.length]
    const fake: Record<string, unknown> = {
      id: 1600 + i,
      created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
      sido: r.sido,
      sigungu: r.sigungu,
      eupmyeondong: r.dong,
      address: `${r.sido} ${r.sigungu} ${r.dong} ${(i * 17 + 1) % 500}번지`,
      creditor_institution: INSTITUTIONS[i % INSTITUTIONS.length],
      collateral_type: types[i % types.length],
      status: ['ACTIVE','ACTIVE','ACTIVE','IN_DEAL','COMPLETED'][i % 5],
      claim_amount: (5000 + i * 3000 + (i % 7) * 1500) * 10000,
      appraised_value: (8000 + i * 4000 + (i % 5) * 2000) * 10000,
      discount_rate: 25 + (i % 20),
      ai_grade: ['A','A','B','B','C'][i % 5],
    }
    items.push(transformToNplItem(fake, i))
  }
  return items
}
