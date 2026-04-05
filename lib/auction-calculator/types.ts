/**
 * NPLatform 경매 수익률 계산기 v2.0
 * v27 standalone 시뮬레이터 기능을 TypeScript로 이식
 */

// ────────────────────────────────────────────────
// 부동산 유형
// ────────────────────────────────────────────────
export type PropertyType =
  | '아파트'
  | '오피스텔'
  | '빌라/다세대'
  | '단독주택'
  | '상가'
  | '사무실'
  | '공장/창고'
  | '토지'
  | '임야'
  | '농지'
  | '숙박시설'
  | '종교시설'
  | '의료시설'
  | '기타'

// 매입자 유형
export type BuyerType = 'individual' | 'business'

// AI 판정 등급
export type VerdictGrade = 'STRONG_BUY' | 'BUY' | 'CONSIDER' | 'CAUTION' | 'STOP'

// ────────────────────────────────────────────────
// 입력값
// ────────────────────────────────────────────────
export interface AuctionInput {
  // 기본 정보
  propertyType: PropertyType
  appraisalPrice: number        // 감정가 (원)
  bidPrice: number              // 낙찰가 (원)
  expectedSalePrice: number     // 예상 매각가 (원)
  holdingMonths: number         // 보유 기간 (개월)

  // 세금 관련
  houseCount: number            // 현재 보유 주택 수 (낙찰 후)
  isAdjustedArea: boolean       // 조정대상지역 여부
  buyerType: BuyerType          // 개인 or 매매사업자

  // 선순위 채권
  seniorDebt: number            // 선순위 채권 합계 (원)

  // 추가 비용
  repairCost: number            // 수리/인테리어 비용 (원)
  auctionFee: number            // 경매비용 (원, 기본 300,000)
  legalFeeOverride?: number     // 법무사 비용 직접 입력 (없으면 자동 계산)
  brokerFeeOverride?: number    // 중개보수 직접 입력 (없으면 자동 계산)

  // 대출
  loanAmount: number            // 대출금액 (원)
  loanRate: number              // 대출 금리 (연, 0.05 = 5%)
  loanPrepaymentFeeRate: number // 중도상환수수료율 (0.01 = 1%)

  // NPLatform 연동
  dealId?: string               // /deals/[id] 연결 시
}

// ────────────────────────────────────────────────
// 세금 계산 결과
// ────────────────────────────────────────────────
export interface TaxResult {
  acquisitionTax: number        // 취득세
  educationTax: number          // 지방교육세
  agriSpecialTax: number        // 농어촌특별세
  totalAcquisitionTax: number   // 취득세 합계

  transferTax: number           // 양도소득세 (개인) or 종합소득세 (사업자)
  localIncomeTax: number        // 지방소득세 (10%)
  totalTransferTax: number      // 양도세 합계
}

// ────────────────────────────────────────────────
// 비용 항목
// ────────────────────────────────────────────────
export interface CostBreakdown {
  bidPrice: number              // 낙찰가
  totalAcquisitionTax: number   // 취득세 합계
  legalFee: number              // 법무사 비용
  auctionFee: number            // 경매 비용
  repairCost: number            // 수리비
  brokerFee: number             // 중개보수 (매입 시)
  saleBrokerFee: number         // 중개보수 (매도 시)
  loanInterest: number          // 대출 이자
  loanPrepaymentFee: number     // 중도상환수수료
  totalTransferTax: number      // 양도세 합계
  totalCost: number             // 총 비용
}

// ────────────────────────────────────────────────
// 수익 지표
// ────────────────────────────────────────────────
export interface ProfitMetrics {
  grossProfit: number           // 매각가 - 낙찰가
  netProfit: number             // 순이익 (세후)
  roi: number                   // 수익률 (순이익 / 총투자금, %)
  annualizedRoi: number         // 연환산 수익률 (%)
  bidRatio: number              // 낙찰가 / 감정가 (%)
  breakEvenPrice: number        // 손익분기 매각가 (원)
  totalInvestment: number       // 총 투자금 (낙찰가 + 비용 - 대출)
}

// ────────────────────────────────────────────────
// AI 판정 결과
// ────────────────────────────────────────────────
export interface AiVerdict {
  grade: VerdictGrade
  color: string
  label: string
  description: string
}

// ────────────────────────────────────────────────
// 민감도 테이블 행
// ────────────────────────────────────────────────
export interface SensitivityRow {
  bidPrice: number              // 낙찰가
  bidRatio: number              // 낙찰가 / 감정가 (%)
  netProfit: number             // 순이익
  roi: number                   // 수익률 (%)
  isCurrent: boolean            // 현재 입력값 여부 (하이라이트)
}

// ────────────────────────────────────────────────
// 최종 계산 결과
// ────────────────────────────────────────────────
export interface AuctionResult {
  input: AuctionInput
  taxes: TaxResult
  costs: CostBreakdown
  metrics: ProfitMetrics
  verdict: AiVerdict
  sensitivityTable: SensitivityRow[]
  calculatedAt: string
}

// ────────────────────────────────────────────────
// 시나리오 저장
// ────────────────────────────────────────────────
export interface AuctionScenario {
  id: string
  name: string
  result: AuctionResult
  savedAt: string
  creditUsed?: number           // PDF/Excel 출력 시 5크레딧
}

// ────────────────────────────────────────────────
// 프리셋
// ────────────────────────────────────────────────
export interface AuctionPreset {
  name: string
  description: string
  input: Partial<AuctionInput>
}
