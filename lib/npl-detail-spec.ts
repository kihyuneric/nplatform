/**
 * NPL 세부내역 표준 양식 (SSoT · 2026-08-19) — 운영기획서 v4 §3-2-0
 *
 * 출처: 부실채권(NPL) 상세내역 작성양식 (엑셀 템플릿 v3)
 * 매각 회원 등록 폼 · 운영자 검수 화면 · OCR 자동채움이 **모두 이 정의를 공유한다.**
 * 별도의 폼을 만들지 않는다.
 */

export type DetailField = {
  key: string
  label: string
  hint?: string
  /** 필수 여부 — 등록 제출에 반드시 필요한 항목 */
  required?: boolean
  /** 다른 값에서 자동 계산되는 항목 (입력 불가) */
  computed?: boolean
  /** 매입 회원 열람 모드에서 숨기는 항목 (채권기관·담당자 식별 정보) */
  hiddenForViewer?: boolean
  type?: 'text' | 'number' | 'date' | 'textarea'
}

export const NPL_DETAIL_SPEC: { group: string; fields: DetailField[] }[] = [
  { group: '채권기본정보', fields: [
    { key: 'institution', label: '채권기관', hint: '기관명 (예: OO신협)', required: true, hiddenForViewer: true },
    { key: 'base_date', label: '기준일', hint: 'YYYY-MM-DD', type: 'date', required: true },
    { key: 'manager_name', label: '담당자명', hiddenForViewer: true },
    { key: 'manager_title', label: '직책', hiddenForViewer: true },
    { key: 'manager_phone', label: '연락처', hiddenForViewer: true },
  ]},
  { group: '채무자정보', fields: [
    { key: 'debtor_type', label: '법인/개인 여부' },
    { key: 'debtor_name', label: '채무자명', hint: '앞글자만 (예: ㈜가나다)' },
    { key: 'debtor_prev', label: '변경전 채무자', hint: '비해당시 해당없음' },
  ]},
  { group: '매각방식', fields: [
    { key: 'sale_method', label: '매각방식', hint: '경매 / 공매 / 기타' },
    { key: 'auction_case_no', label: '경매 사건번호' },
    { key: 'public_sale_no', label: '공매 관리번호' },
  ]},
  { group: '채권상세내역', fields: [
    { key: 'loan_balance', label: '대출잔액', type: 'number', required: true },
    { key: 'loan_principal', label: '대출원금', type: 'number', required: true },
  ]},
  { group: '이자', fields: [
    { key: 'interest_normal', label: '정상이자', type: 'number' },
    { key: 'interest_overdue', label: '연체이자', type: 'number' },
    { key: 'interest_unpaid', label: '미수이자', hint: '정상이자 중 미수분', type: 'number' },
  ]},
  { group: '비용', fields: [
    { key: 'provisional_cost', label: '가지급비용', type: 'number' },
    { key: 'total_claim', label: '총 채권액', hint: '대출잔액 + 이자합계 + 비용 (자동계산)', computed: true, type: 'number' },
  ]},
  { group: '대출조건', fields: [
    { key: 'loan_period', label: '대출기간', hint: '예: 2015-05-15 ~ 2018-11-15' },
    { key: 'loan_rate', label: '대출금리', hint: '예: 4.00%' },
    { key: 'overdue_rate', label: '연체금리', hint: '예: 7.00%' },
    { key: 'overdue_start', label: '원금 연체시작일', hint: 'YYYY-MM-DD · 비해당시 해당없음' },
    { key: 'beneficial_amount', label: '수익권금액(채권최고액)', hint: '공부상 채권최고액', type: 'number' },
  ]},
  { group: '담보물정보', fields: [
    { key: 'collateral_address', label: '담보물주소', hint: '상세 주소 — 리스트에는 동 단위까지만 공개', required: true },
    { key: 'collateral_type', label: '담보물종류', hint: '아파트 · 상가 · 토지 · 오피스 · 공장 등', required: true },
    { key: 'exclusive_area', label: '전용면적', hint: '㎡ (건물은 총 연면적)', type: 'number' },
  ]},
  { group: '가치평가', fields: [
    { key: 'appraisal_value', label: '감정가(법사가)', type: 'number', required: true },
    { key: 'ltv', label: '담보인정비율(LTV)', hint: '대출잔액 ÷ 감정가 (자동계산)', computed: true },
  ]},
  { group: '권리관계', fields: [
    { key: 'security_method', label: '채권보전방식', hint: '담보신탁우선수익권 · 근저당권 등' },
    { key: 'rank_1', label: '1순위' },
    { key: 'rank_2', label: '2순위' },
    { key: 'max_claim', label: '설정금액(채권최고액)', type: 'number' },
  ]},
  { group: '현황', fields: [
    { key: 'senior_tenant', label: '선순위임차인 내역', hint: '비해당시 0' },
    { key: 'deposit', label: '보증금', hint: '비해당시 0', type: 'number' },
    { key: 'monthly_rent', label: '월세', hint: '비해당시 0', type: 'number' },
    { key: 'vacancy', label: '공실여부', hint: '공실 / 비해당시 0' },
  ]},
  { group: '매각조건', fields: [
    { key: 'asking_price', label: '제안 매각가(협의가)', hint: '리스트에 협의가로 공개', type: 'number', required: true },
    { key: 'min_sale_price', label: '최저매각가', type: 'number' },
    { key: 'sale_deadline', label: '매각 종료일', hint: 'YYYY-MM-DD', type: 'date' },
    { key: 'down_payment', label: '계약금', type: 'number' },
    { key: 'balance_date', label: '잔금일', hint: '계약일로부터 30일 이내' },
  ]},
  { group: '기타', fields: [
    { key: 'etc', label: '기타 전달사항', type: 'textarea' },
  ]},
]

/** 필수 항목 키 — 등록 제출 검증 (운영기획서 v4: 필수는 6개뿐) */
export const REQUIRED_KEYS = NPL_DETAIL_SPEC
  .flatMap(g => g.fields)
  .filter(f => f.required)
  .map(f => f.key)

export const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  NPL_DETAIL_SPEC.flatMap(g => g.fields).map(f => [f.key, f.label]),
)

/** 매입 회원에게 끝까지 공개하지 않는 항목 (NDA 승인 후에도 비공개) */
export const VIEWER_HIDDEN_KEYS = new Set(
  NPL_DETAIL_SPEC.flatMap(g => g.fields).filter(f => f.hiddenForViewer).map(f => f.key),
)

const num = (s?: unknown) => {
  const n = parseFloat(String(s ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 자동계산 — 총 채권액 · LTV */
export function computeDerived(d: Record<string, string>): Record<string, string> {
  const total =
    num(d.loan_balance) + num(d.interest_normal) + num(d.interest_overdue) + num(d.provisional_cost)
  const appraisal = num(d.appraisal_value)
  const ltv = appraisal > 0 ? (num(d.loan_balance) / appraisal) * 100 : 0
  return {
    ...d,
    total_claim: total > 0 ? String(Math.round(total)) : (d.total_claim ?? ''),
    ltv: ltv > 0 ? `${ltv.toFixed(1)}%` : (d.ltv ?? ''),
  }
}

/** 제출 전 필수 검증 — 비어 있는 필수 항목의 **라벨** 목록 */
export function missingRequired(d: Record<string, string>): string[] {
  return REQUIRED_KEYS.filter(k => !String(d[k] ?? '').trim()).map(k => FIELD_LABEL[k] ?? k)
}

/**
 * 자동채움 결과 → 세부내역 폼 키 매핑 (2026-08-19)
 *
 * 엑셀 파서(parse-template)와 OCR(autofill)은 각자 다른 키로 값을 돌려준다.
 * 그 차이를 화면이 알 필요는 없으므로 여기서 한 번에 흡수한다.
 * 매핑에 없는 키는 버린다(폼에 없는 값이므로).
 */
const AUTOFILL_KEY_MAP: Record<string, string> = {
  // ── 엑셀 템플릿 파서 ──
  institution_name: 'institution',
  collateral_type: 'collateral_type',
  address: 'collateral_address',
  exclusive_area: 'exclusive_area',
  debtor_type: 'debtor_type',
  loan_principal: 'loan_principal',
  claim_balance: 'loan_balance',
  unpaid_interest: 'interest_unpaid',
  overdue_interest: 'interest_overdue',
  normal_rate: 'loan_rate',
  overdue_rate: 'overdue_rate',
  delinquency_start_date: 'overdue_start',
  beneficial_amount: 'beneficial_amount',
  appraisal_value: 'appraisal_value',
  asking_price: 'asking_price',
  proposed_sale_price: 'asking_price',
  min_sale_price: 'min_sale_price',
  sale_method: 'sale_method',
  auction_case_no: 'auction_case_no',
  case_number: 'auction_case_no',
  max_claim: 'max_claim',
  deposit: 'deposit',
  monthly_rent: 'monthly_rent',
  // ── OCR autofill ──
  minimum_bid: 'min_sale_price',
  property_type: 'collateral_type',
}

/** 시도/시군구가 따로 오면 주소로 합친다 */
export function mapAutofill(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw ?? {})) {
    const target = AUTOFILL_KEY_MAP[k]
    if (!target) continue
    const val = String(v ?? '').trim()
    if (val) out[target] = val
  }
  const region = [raw.sido, raw.sigungu].filter(Boolean).map(String).join(' ').trim()
  if (region && !out.collateral_address) out.collateral_address = region
  else if (region && out.collateral_address && !out.collateral_address.startsWith(region)) {
    out.collateral_address = `${region} ${out.collateral_address}`
  }
  return out
}
