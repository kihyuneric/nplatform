// ============================================================
// lib/court-auction/mapper.ts
// 원본 데이터 → DB 스키마 매핑 유틸리티
// ============================================================

import type {
  CourtAuctionListing,
  RawCourtAuctionRecord,
  RawMolitTransaction,
  PropertyType,
  CreditorType,
  AuctionStatus,
} from './types'

// ─── 숫자 파싱 헬퍼 ──────────────────────────────────────

function parseAmount(val: string | number | undefined | null): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return Math.round(val)
  // "1,234,567,000" → 1234567000
  const cleaned = String(val).replace(/[,\s원]/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : Math.round(parsed)
}

function parseInteger(val: string | number | undefined | null): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

// ─── 법원명 정규화 ────────────────────────────────────────

const COURT_CODE_MAP: Record<string, string> = {
  '서울중앙지방법원': 'SEOUL_CENTRAL',
  '서울동부지방법원': 'SEOUL_EAST',
  '서울서부지방법원': 'SEOUL_WEST',
  '서울남부지방법원': 'SEOUL_SOUTH',
  '서울북부지방법원': 'SEOUL_NORTH',
  '인천지방법원':     'INCHEON',
  '수원지방법원':     'SUWON',
  '의정부지방법원':   'UIJEONGBU',
  '부산지방법원':     'BUSAN',
  '대구지방법원':     'DAEGU',
  '광주지방법원':     'GWANGJU',
  '대전지방법원':     'DAEJEON',
}

export function normalizeCourt(courtName: string): { court_name: string; court_code: string | null } {
  const name = courtName.trim()
  return { court_name: name, court_code: COURT_CODE_MAP[name] ?? null }
}

// ─── 물건종별 정규화 ─────────────────────────────────────

const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  '아파트': '아파트',
  '연립다세대': '다세대',
  '다세대': '다세대',
  '다가구': '단독주택',
  '단독주택': '단독주택',
  '토지': '토지',
  '대': '토지',
  '임야': '토지',
  '상가': '상가',
  '근린시설': '상가',
  '근린상가': '상가',
  '오피스텔': '오피스텔',
  '공장': '공장',
}

export function normalizePropertyType(raw: string): PropertyType {
  const trimmed = raw.trim()
  return PROPERTY_TYPE_MAP[trimmed] ?? '기타'
}

// ─── 채권자 유형 추론 ─────────────────────────────────────

const CREDITOR_TYPE_PATTERNS: Array<{ pattern: RegExp; type: CreditorType }> = [
  { pattern: /은행|뱅크|KB|신한|하나|우리|기업|국민|농협|IBK|SC제일|씨티/i, type: 'BANK' },
  { pattern: /저축은행|상호|SBI|웰컴|OK|페퍼|애큐온/i, type: 'SAVINGS_BANK' },
  { pattern: /신협|새마을|수협|산림|단위농협/i, type: 'CREDIT_UNION' },
  { pattern: /캐피탈|리스|할부|카드사|여신|파이낸스/i, type: 'CAPITAL' },
  { pattern: /보험|생명|손해보험/i, type: 'INSURANCE' },
  { pattern: /HUG|주택도시보증|HF|한국주택금융|공사|공단|서울시|국가|지자체/i, type: 'PUBLIC' },
]

export function inferCreditorType(creditorName: string | undefined | null): CreditorType {
  if (!creditorName) return 'ETC'
  for (const { pattern, type } of CREDITOR_TYPE_PATTERNS) {
    if (pattern.test(creditorName)) return type
  }
  return 'ETC'
}

// ─── 경매 상태 정규화 ─────────────────────────────────────

export function normalizeStatus(raw: string): AuctionStatus {
  const s = raw.trim()
  if (s.includes('매각') || s.includes('낙찰')) return 'SOLD'
  if (s.includes('유찰')) return 'UNSOLD'
  if (s.includes('취하') || s.includes('취소')) return 'CANCELLED'
  if (s.includes('입찰') || s.includes('진행')) return 'BIDDING'
  return 'SCHEDULED'
}

// ─── 주소 분해 (시도/시군구/동 추출) ─────────────────────

export function parseAddress(address: string): {
  sido: string | null
  sigungu: string | null
  dong: string | null
} {
  const parts = address.trim().split(/\s+/)
  const sido = parts[0] ?? null
  const sigungu = parts[1] ?? null
  const dong = parts[2] ?? null
  return { sido, sigungu, dong }
}

// ─── 날짜 파싱 ────────────────────────────────────────────

export function parseAuctionDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  // "2024.05.15" or "2024-05-15" or "2024년05월15일"
  const match = raw.match(/(\d{4})[.\-년](\d{1,2})[.\-월](\d{1,2})/)
  if (!match) return null
  const [, y, m, d] = match
  return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
}

// ─── 법원경매 원본 → DB 레코드 변환 ─────────────────────

export function mapCourtAuctionRecord(
  raw: RawCourtAuctionRecord,
  overrides: Partial<CourtAuctionListing> = {}
): Omit<CourtAuctionListing, 'id' | 'created_at' | 'updated_at'> {
  const address = String(raw['소재지'] ?? '')
  const { sido, sigungu, dong } = parseAddress(address)
  const { court_name, court_code } = normalizeCourt(String(raw['법원명'] ?? ''))
  const creditorName = raw['채권자'] ? String(raw['채권자']) : null
  const appraisedValue = parseAmount(raw['감정가']) ?? 0
  const minBidPrice = parseAmount(raw['최저매각가격']) ?? 0
  const totalClaim = parseAmount(raw['청구금액'])
  const auctionCount = parseInteger(raw['입찰횟수']) ?? 1

  return {
    case_number:          String(raw['사건번호'] ?? '').trim(),
    court_name,
    court_code,
    property_type:        normalizePropertyType(String(raw['물건종별'] ?? '')),
    property_sub_type:    null,
    address,
    sido,
    sigungu,
    dong,
    detail_address:       null,
    latitude:             null,
    longitude:            null,
    area_m2:              parseAmount(raw['면적'] as string | number | undefined) ?? null,
    land_area_m2:         null,
    floor:                parseInteger(raw['층수'] as string | number | undefined),
    total_floors:         null,
    build_year:           parseInteger(raw['건축연도'] as string | number | undefined),
    appraised_value:      appraisedValue,
    min_bid_price:        minBidPrice,
    winning_bid:          parseAmount(raw['낙찰가'] as string | number | undefined),
    winning_bid_rate:     null,
    deposit_amount:       Math.round(minBidPrice * 0.1) || null,
    status:               normalizeStatus(String(raw['진행상황'] ?? '')),
    auction_date:         parseAuctionDate(raw['매각기일'] as string),
    auction_count:        auctionCount,
    previous_min_bid:     auctionCount > 1 ? Math.round(minBidPrice / 0.8) : null,
    result_at:            null,
    creditor_name:        creditorName,
    creditor_type:        inferCreditorType(creditorName),
    loan_principal:       null,
    loan_balance:         null,
    total_claim:          totalClaim,
    senior_claim:         null,
    junior_claim:         null,
    lien_count:           parseInteger(raw['근저당건수'] as string | number | undefined) ?? 0,
    seizure_count:        parseInteger(raw['압류건수'] as string | number | undefined) ?? 0,
    tenant_count:         parseInteger(raw['임차인수'] as string | number | undefined) ?? 0,
    total_tenant_deposit: parseAmount(raw['임차보증금합계'] as string | number | undefined),
    has_opposing_force:   raw['대항력'] === 'Y' || raw['대항력'] === true,
    lease_detail:         [],
    ai_roi_estimate:      null,
    ai_risk_score:        null,
    ai_bid_prob:          null,
    ai_verdict:           null,
    ai_reasoning:         null,
    ai_screened_at:       null,
    ai_model_version:     'v1',
    related_listing_id:   null,
    external_id:          raw['외부ID'] ? String(raw['외부ID']) : null,
    source:               'COURT',
    raw_data:             raw as Record<string, unknown>,
    images:               [],
    documents:            [],
    notes:                null,
    is_featured:          false,
    view_count:           0,
    bookmark_count:       0,
    ...overrides,
  }
}

// ─── 낙찰가율 계산 ────────────────────────────────────────

export function calcBidRate(winningBid: number, appraisedValue: number): number | null {
  if (!winningBid || !appraisedValue || appraisedValue === 0) return null
  return Math.round((winningBid / appraisedValue) * 10000) / 10000
}

// ─── 예상 ROI 간이 계산 ────────────────────────────────────
// 낙찰가 / 감정가 대비 차익 추정 (AI 스크리닝 전 기본값용)

export function estimateBasicRoi(
  minBidPrice: number,
  appraisedValue: number,
  totalClaim: number | null,
  tenantDeposit: number | null
): number | null {
  if (!minBidPrice || !appraisedValue) return null
  // 실질 회수 예상액 = 감정가 * 0.9 (매각 비용 가정)
  const estimatedRecovery = appraisedValue * 0.9
  // 실제 투자액 = 낙찰가 + 임차인 보증금 인수액
  const tenantBurden = tenantDeposit ?? 0
  const totalInvestment = minBidPrice + tenantBurden
  if (totalInvestment === 0) return null
  const roi = ((estimatedRecovery - totalInvestment) / totalInvestment) * 100
  return Math.round(roi * 100) / 100
}

// ─── 국토부 실거래가 원본 → DB 변환 ─────────────────────

export function mapMolitTransaction(raw: RawMolitTransaction) {
  const dealAmountStr = String(raw['거래금액'] ?? '').replace(/[,\s]/g, '')
  const dealAmount = parseFloat(dealAmountStr)
  const area = parseAmount(raw['전용면적'])
  const year  = parseInteger(raw['계약년도'])
  const month = parseInteger(raw['계약월'])
  const day   = parseInteger(raw['계약일'])

  let dealDate: string | null = null
  if (year && month && day) {
    dealDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  } else if (year && month) {
    dealDate = `${year}-${String(month).padStart(2,'0')}-01`
  }

  const address = [raw['시군구'], raw['법정동'], raw['지번']].filter(Boolean).join(' ')
  const { sido, sigungu, dong } = parseAddress(
    String(raw['시군구'] ?? '') + ' ' + String(raw['법정동'] ?? '')
  )

  return {
    transaction_type: '아파트',  // 기본값, 호출 시 오버라이드 가능
    deal_type: 'SALE',
    sido,
    sigungu: sigungu ?? String(raw['시군구'] ?? ''),
    dong,
    address,
    building_name: raw['아파트'] ? String(raw['아파트']) : null,
    area_m2: area,
    floor: parseInteger(raw['층']),
    build_year: parseInteger(raw['건축년도']),
    deal_price: isNaN(dealAmount) ? null : Math.round(dealAmount * 10000), // 만원 → 원
    jeonse_price: null,
    deal_date: dealDate,
    source: 'MOLIT',
    raw_data: raw as Record<string, unknown>,
  }
}
