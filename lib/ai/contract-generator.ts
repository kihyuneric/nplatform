/**
 * lib/ai/contract-generator.ts
 *
 * NPL 매매계약서 자동 생성 엔진. 딜룸 단계가 MATCHED → CONTRACT 전이될 때 호출.
 *
 * 호출 위치:
 *   - /api/v1/ai/contract-generator
 *   - /deals/[id] 계약 탭의 "계약서 초안 생성" 버튼
 *   - /tools/contract-generator (단독 도구 모드)
 *
 * 설계:
 *   1) 표준 템플릿 (TEMPLATES) — 부속 조항 변형
 *   2) 변수 바인딩 ({{변수}} → 값)
 *   3) 권리분석 결과(rights-analysis)와 연동 → 위험 조항 자동 삽입
 *   4) PDF 변환은 별도 모듈 (lib/pdf-render.ts) 담당, 본 모듈은 텍스트만
 *
 * 법적 안전장치:
 *   - 모든 생성 문서는 "초안" 워터마크
 *   - 최종 본은 변호사·법무사 검토 후 e-sign
 *   - 생성 이력은 audit_logs.action="CONTRACT_DRAFT" 기록
 */

import type { CollateralType } from "@/components/npl"
import type { RiskFinding } from "./rights-analysis"

// ─── Types ────────────────────────────────────────────────────

export type ContractTemplate =
  | "NPL_PURCHASE"           // NPL 채권 매매계약서
  | "NPL_PURCHASE_BULK"      // 포트폴리오(다건) 매매
  | "REAL_ESTATE_AUCTION"    // 매각물건 인수 계약
  | "CO_INVESTMENT"          // 공동투자 약정서

export interface ContractParty {
  /** 매도자/매수자 식별 */
  role: "SELLER" | "BUYER" | "AGENT"
  name: string
  /** 사업자등록번호 또는 주민등록번호 (마스킹된 형태) */
  taxId: string
  address: string
  representative?: string
  contact: string
}

export interface ContractInput {
  template: ContractTemplate
  /** 거래 식별 */
  dealRoomId: string
  /** 매도자 */
  seller: ContractParty
  /** 매수자 */
  buyer: ContractParty
  /** NPL 채권 정보 */
  asset: {
    collateralType: CollateralType
    address: string
    appraisalValue: number
    outstandingAmount: number
    seniorLiens?: number
    leaseDeposits?: number
  }
  /** 매매가 (KRW) */
  purchasePrice: number
  /** 잔금일 */
  closingDate: string
  /** 계약금 비율 (default 10%) */
  depositRatio?: number
  /** 권리분석 결과 (위험조항 자동 삽입용) */
  riskFindings?: RiskFinding[]
  /** 추가 특약 */
  specialTerms?: string[]
  /** 작성일 */
  draftedAt?: string
}

export interface ContractDraft {
  template: ContractTemplate
  title: string
  body: string
  /** 자동 삽입된 위험 조항 코드 목록 */
  insertedRiskClauses: string[]
  /** 변수 바인딩 후 남은 미해결 placeholder (검토 필요) */
  unresolved: string[]
  /** 생성 메타 */
  metadata: {
    dealRoomId: string
    draftedAt: string
    modelVersion: string
    wordCount: number
  }
}

// ─── Constants ────────────────────────────────────────────────

const MODEL_VERSION = "contract-generator-v1.0.0-2026-04"

const TEMPLATE_TITLES: Record<ContractTemplate, string> = {
  NPL_PURCHASE: "부실채권(NPL) 매매계약서",
  NPL_PURCHASE_BULK: "부실채권 포트폴리오 매매계약서",
  REAL_ESTATE_AUCTION: "매각물건 인수 약정서",
  CO_INVESTMENT: "공동투자 약정서",
}

// ─── Templates ────────────────────────────────────────────────

const TEMPLATE_BODIES: Record<ContractTemplate, string> = {
  NPL_PURCHASE: `
{{TITLE}}

매도자 ("갑"): {{SELLER_NAME}} ({{SELLER_TAXID}})
주소: {{SELLER_ADDRESS}}
대표: {{SELLER_REP}}

매수자 ("을"): {{BUYER_NAME}} ({{BUYER_TAXID}})
주소: {{BUYER_ADDRESS}}
대표: {{BUYER_REP}}

위 당사자는 다음과 같이 부실채권 매매계약을 체결한다.

제1조 (목적)
갑은 을에게 본 계약 별지에 명시된 부실채권(이하 "본 채권")을 매도하고, 을은 이를 매수한다.
본 채권의 담보 부동산은 {{ASSET_ADDRESS}}({{COLLATERAL_TYPE}})이며, 감정가는 일금 {{APPRAISAL_VALUE}}원이다.
채권 잔액은 {{OUTSTANDING_AMOUNT}}원이다.

제2조 (매매대금)
1. 매매대금은 일금 {{PURCHASE_PRICE}}원으로 한다.
2. 계약금 일금 {{DEPOSIT_AMOUNT}}원(매매대금의 {{DEPOSIT_RATIO}}%)은 본 계약 체결과 동시에 지급한다.
3. 잔금 일금 {{BALANCE_AMOUNT}}원은 {{CLOSING_DATE}}까지 지급한다.

제3조 (채권의 양도)
1. 갑은 잔금 수령과 동시에 본 채권을 을에게 양도하며, 양도통지에 필요한 일체의 서류를 교부한다.
2. 갑은 채무자에 대한 양도통지(민법 제450조)를 잔금 수령일로부터 7일 이내에 완료한다.
3. 본 채권에 부수하는 담보권(근저당권 등)은 매매대금에 포함되며, 별도 이전등기는 을의 책임으로 한다.

제4조 (선순위 권리)
본 채권에 우선하는 다음 권리가 존재함을 을은 인지하고 매수한다:
- 선순위 채권 잔액: {{SENIOR_LIENS}}원
- 임차보증금 합계: {{LEASE_DEPOSITS}}원
{{RISK_CLAUSES}}

제5조 (진술과 보증)
1. 갑은 본 채권이 적법·유효하게 존속하며 제3자의 권리에 의해 제한되지 않음을 진술한다.
2. 갑은 본 계약 체결일까지 알고 있는 일체의 중대한 사실을 을에게 고지하였음을 보증한다.
3. 본 조의 진술과 보증이 허위임이 밝혀진 경우 을은 계약을 해제하고 손해배상을 청구할 수 있다.

제6조 (계약의 해제)
1. 어느 일방이 본 계약상의 의무를 이행하지 아니한 경우, 상대방은 14일의 이행 최고 후 본 계약을 해제할 수 있다.
2. 계약 해제 시 갑은 수령한 매매대금을 즉시 반환하며, 위약금으로 매매대금의 10%를 지급한다.

제7조 (특약사항)
{{SPECIAL_TERMS}}

제8조 (관할법원)
본 계약에 관한 분쟁은 서울중앙지방법원을 제1심 관할법원으로 한다.

본 계약의 성립을 증명하기 위하여 본 계약서 2부를 작성하여 갑과 을이 각 1부씩 보관한다.

계약일: {{DRAFTED_AT}}

매도자(갑): {{SELLER_NAME}}                  (인)
매수자(을): {{BUYER_NAME}}                   (인)
`,

  NPL_PURCHASE_BULK: `
{{TITLE}}

(포트폴리오 매매 — 별지 채권목록 참조)

매도자: {{SELLER_NAME}}
매수자: {{BUYER_NAME}}

제1조 본 계약은 별지 목록에 기재된 부실채권 일체를 일괄 매매한다.
제2조 일괄 매매대금은 {{PURCHASE_PRICE}}원이며, {{CLOSING_DATE}}까지 지급한다.
제3조 별지 채권 중 일부의 권리하자가 발견되어도 매매대금은 조정되지 않는다.
       다만, 매도자가 알고도 고지하지 않은 중대한 하자에 대해서는 손해배상 책임을 진다.

{{RISK_CLAUSES}}

특약: {{SPECIAL_TERMS}}

작성일: {{DRAFTED_AT}}
`,

  REAL_ESTATE_AUCTION: `
{{TITLE}}

매도자: {{SELLER_NAME}}
매수자: {{BUYER_NAME}}

본 약정은 {{ASSET_ADDRESS}} 매각물건의 인수에 관한 사항을 정한다.

제1조 인수 가격: {{PURCHASE_PRICE}}원
제2조 인수 대상: {{COLLATERAL_TYPE}}
제3조 잔금일: {{CLOSING_DATE}}

{{RISK_CLAUSES}}

특약: {{SPECIAL_TERMS}}

작성일: {{DRAFTED_AT}}
`,

  CO_INVESTMENT: `
{{TITLE}}

업무집행조합원: {{SELLER_NAME}}
일반조합원: {{BUYER_NAME}}

본 약정은 {{ASSET_ADDRESS}} 부실채권에 대한 공동투자에 관한 사항을 정한다.

제1조 총 투자금: {{PURCHASE_PRICE}}원
제2조 회수 분배: 우선수익권 → LP → GP carry 20%
제3조 청산일: {{CLOSING_DATE}}

{{RISK_CLAUSES}}

특약: {{SPECIAL_TERMS}}

작성일: {{DRAFTED_AT}}
`,
}

// ─── Risk clause mapping ──────────────────────────────────────

const RISK_CLAUSE_TEMPLATES: Record<string, string> = {
  "SR-001": "선순위 채권 비율이 감정가의 70%를 초과함을 을은 명시적으로 인지하며, 이로 인한 회수 차질에 대해 갑에게 별도 책임을 묻지 아니한다.",
  "SR-002": "본 채권 담보 부동산에 가등기가 존재하며, 본등기가 이루어질 경우 소유권 상실 위험이 있음을 을이 인지한 상태에서 매수한다.",
  "SR-003": "대항력 있는 임차인의 보증금이 매수인에게 인수될 수 있으며, 갑은 임대차 계약서 사본 및 확정일자 자료를 잔금 전 을에게 제공한다.",
  "SR-004": "처분금지 가처분이 등재되어 있어 매각 절차가 지연·중단될 가능성이 있다.",
  "SR-005": "신탁등기로 인해 수탁자 동의가 필요하며, 갑은 동의서 확보의 책임을 진다.",
}

// ─── Generator ────────────────────────────────────────────────

export function generateContract(input: ContractInput): ContractDraft {
  const template = input.template
  const depositRatio = input.depositRatio ?? 10
  const depositAmount = Math.round(input.purchasePrice * depositRatio / 100)
  const balanceAmount = input.purchasePrice - depositAmount
  const draftedAt = input.draftedAt ?? new Date().toISOString().slice(0, 10)

  // 위험 조항 빌드
  const insertedRiskClauses: string[] = []
  const riskClauseLines: string[] = []
  for (const f of input.riskFindings ?? []) {
    const tpl = RISK_CLAUSE_TEMPLATES[f.code]
    if (tpl) {
      riskClauseLines.push(`  - [${f.code}] ${tpl}`)
      insertedRiskClauses.push(f.code)
    }
  }
  const riskClauseBlock = riskClauseLines.length > 0
    ? `\n부속조항 (위험 고지):\n${riskClauseLines.join("\n")}\n`
    : ""

  // 특약 빌드
  const specialTermsBlock = (input.specialTerms ?? []).length > 0
    ? (input.specialTerms ?? []).map((t, i) => `  ${i + 1}. ${t}`).join("\n")
    : "  (없음)"

  const bindings: Record<string, string> = {
    TITLE: TEMPLATE_TITLES[template],
    SELLER_NAME: input.seller.name,
    SELLER_TAXID: input.seller.taxId,
    SELLER_ADDRESS: input.seller.address,
    SELLER_REP: input.seller.representative ?? "—",
    BUYER_NAME: input.buyer.name,
    BUYER_TAXID: input.buyer.taxId,
    BUYER_ADDRESS: input.buyer.address,
    BUYER_REP: input.buyer.representative ?? "—",
    ASSET_ADDRESS: input.asset.address,
    COLLATERAL_TYPE: input.asset.collateralType,
    APPRAISAL_VALUE: formatKrw(input.asset.appraisalValue),
    OUTSTANDING_AMOUNT: formatKrw(input.asset.outstandingAmount),
    SENIOR_LIENS: formatKrw(input.asset.seniorLiens ?? 0),
    LEASE_DEPOSITS: formatKrw(input.asset.leaseDeposits ?? 0),
    PURCHASE_PRICE: formatKrw(input.purchasePrice),
    DEPOSIT_AMOUNT: formatKrw(depositAmount),
    DEPOSIT_RATIO: String(depositRatio),
    BALANCE_AMOUNT: formatKrw(balanceAmount),
    CLOSING_DATE: input.closingDate,
    DRAFTED_AT: draftedAt,
    RISK_CLAUSES: riskClauseBlock,
    SPECIAL_TERMS: specialTermsBlock,
  }

  let body = TEMPLATE_BODIES[template]
  for (const [key, value] of Object.entries(bindings)) {
    body = body.replaceAll(`{{${key}}}`, value)
  }

  // 미해결 placeholder 탐지
  const unresolved = Array.from(body.matchAll(/\{\{([A-Z_]+)\}\}/g)).map(m => m[1])

  return {
    template,
    title: TEMPLATE_TITLES[template],
    body: body.trim(),
    insertedRiskClauses,
    unresolved,
    metadata: {
      dealRoomId: input.dealRoomId,
      draftedAt,
      modelVersion: MODEL_VERSION,
      wordCount: body.split(/\s+/).length,
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function formatKrw(amount: number): string {
  // "120,000,000원" 대신 "1억 2,000만원"의 가독 표기는 유지하되,
  // 계약서 본문에는 정확한 숫자 + 한글 병기가 안전 → "120,000,000(일금 일억이천만)원"
  return new Intl.NumberFormat("ko-KR").format(amount)
}

// ─── 검증 ─────────────────────────────────────────────────────

export interface ContractValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateContract(draft: ContractDraft, input: ContractInput): ContractValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (draft.unresolved.length > 0) {
    errors.push(`미해결 변수 ${draft.unresolved.length}개: ${draft.unresolved.join(", ")}`)
  }
  if (input.purchasePrice <= 0) {
    errors.push("매매대금은 0보다 커야 합니다.")
  }
  if (input.purchasePrice > input.asset.outstandingAmount) {
    warnings.push("매매대금이 채권 잔액을 초과합니다 — 일반적으로 비정상.")
  }
  if (!input.seller.taxId || !input.buyer.taxId) {
    errors.push("매도자/매수자 식별번호 누락")
  }
  if (new Date(input.closingDate) < new Date()) {
    errors.push("잔금일이 과거입니다.")
  }
  if ((input.riskFindings ?? []).some(f => f.severity === "CRITICAL") && draft.insertedRiskClauses.length === 0) {
    warnings.push("CRITICAL 위험이 있으나 위험 조항이 자동 삽입되지 않았습니다 — 수동 검토 필요.")
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  TEMPLATE_TITLES,
  RISK_CLAUSE_TEMPLATES,
  formatKrw,
  MODEL_VERSION,
}
