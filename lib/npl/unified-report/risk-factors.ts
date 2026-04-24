/**
 * lib/npl/unified-report/risk-factors.ts
 *
 * 리스크 4팩터 점수 산출 — 계산 가능한 선형/구간식 기반 (Phase G3 · 2026Q2).
 *
 *   · 담보가치   (35%)   LTV = 채권잔액 / min(감정가, AI시세) × 100 → 100 − max(0, LTV−50)
 *   · 권리관계   (30%)   max(20, 100 − Σ특수조건V2감점 − Σ등기부감점)  ← 법적 팩터 병합
 *   · 시장       (25%)   0.6 × min(100, 블렌드낙찰가율%) + 0.4 × 지역트렌드
 *   · 유동성     (10%)   100 − max(0, 매각일수 − 180) × 0.2  (하한 40)
 *
 * Phase G3 변경 (docs/NPLatform_Refactor_Dev_Plan_2026Q2.md):
 *   · 기존 '법적' 팩터를 '권리관계' 로 병합 — 특수조건 V2 18항목 (types.ts SPECIAL_CONDITIONS_V2)
 *     의 penalty 합산으로 단일 공식화, UI 중복 제거
 *   · 가중치 재분배: 담보 30→35 · 권리 15+법적25 = 40 → 30 (중복 제거 감안) · 시장 20→25 · 유동성 10 유지
 *   · V1 특수조건(25항목) 은 legacy — `migrateV1ToV2Keys` 어댑터로 투명 변환
 *   · 질권대출 LTV 기본값: 개인 75% / 법인 90% (`getDefaultMarginLtv`)
 *
 * 각 함수는 `score` 와 함께 사람이 읽을 수 있는 `formula` 문자열을 반환해
 * 리포트 UI 의 계산식 토글과 점수 산출이 완전히 일치하도록 단일 소스로 관리.
 */

import type {
  RegionTrendFactor,
  AuctionRatioFactor,
  SpecialConditions,
  RegistryAnalysisBlock,
} from './types'
import { computeLegalScoreV2 } from './types'
import { migrateV1ToV2Keys } from './special-conditions-migration'

export type RiskFactorCategory = '담보가치' | '권리관계' | '시장' | '유동성'

export type RiskFactorResult = {
  category: RiskFactorCategory
  score: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  explanation: string
  mitigation: string
  formula: string
  inputs: Record<string, string | number | boolean>
}

// ─── 질권대출 LTV 기본값 — 채무자 유형 분기 (Phase G3) ───────
//   · 개인 (INDIVIDUAL)  → 0.75 (75%)
//   · 법인 (CORPORATE)   → 0.90 (90%)
//   · 미지정/null        → 0.75 (보수적 기본값 = 개인)
//
//   근거: 저축은행·신협·캐피탈 실무 관행.
//         법인은 사업담보·ABS 가능 → LTV 한도 확대.
//         개인은 DSR 규제 영향 → 75% 이내로 제한.
export type DebtorType = 'INDIVIDUAL' | 'CORPORATE' | null | undefined | ''
export function getDefaultMarginLtv(debtorType: DebtorType): number {
  if (debtorType === 'CORPORATE') return 0.90
  return 0.75
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const severityOf = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' =>
  score >= 75 ? 'LOW' : score >= 55 ? 'MEDIUM' : 'HIGH'

// ─── 담보가치 ────────────────────────────────────────────────
//  LTV = 채권잔액 / min(감정가, AI시세) × 100
//  점수 = 100 − max(0, LTV − 50), 하한 30점
export function computeCollateralFactor(args: {
  claimBalance: number          // 채권잔액 (원금+연체이자)
  appraisalValue: number        // 감정가
  marketValue: number           // AI 시세
}): RiskFactorResult {
  const { claimBalance, appraisalValue, marketValue } = args
  const basisValue = Math.min(appraisalValue, marketValue)
  const ltv = basisValue > 0 ? (claimBalance / basisValue) * 100 : 999
  const raw = 100 - Math.max(0, ltv - 50)
  const score = Math.round(clamp(raw, 30, 100) * 10) / 10

  const formula =
    `LTV = 채권잔액 / min(감정가, AI시세) × 100\n` +
    `    = ${(claimBalance / 1e8).toFixed(2)}억 / min(${(appraisalValue / 1e8).toFixed(2)}억, ${(marketValue / 1e8).toFixed(2)}억)\n` +
    `    = ${(claimBalance / 1e8).toFixed(2)}억 / ${(basisValue / 1e8).toFixed(2)}억 × 100\n` +
    `    = ${ltv.toFixed(2)}%\n\n` +
    `담보가치 점수 = 100 − max(0, LTV − 50)  · 하한 30\n` +
    `           = 100 − max(0, ${ltv.toFixed(2)} − 50)\n` +
    `           = 100 − ${Math.max(0, ltv - 50).toFixed(2)}\n` +
    `           = ${score}점`

  return {
    category: '담보가치',
    score,
    severity: severityOf(score),
    explanation: `채권잔액 ${(claimBalance / 1e8).toFixed(1)}억 / 보수적 기준가(감정·AI시세 최솟값) ${(basisValue / 1e8).toFixed(1)}억 → LTV ${ltv.toFixed(1)}%`,
    mitigation: ltv > 80
      ? 'LTV 80% 초과 — 재감정 의뢰 또는 매입가 하향 협상 권장'
      : 'LTV 80% 이하 유지 중 — 현재 감정가 기준 건강한 커버리지',
    formula,
    inputs: { 채권잔액: claimBalance, 감정가: appraisalValue, AI시세: marketValue, LTV: `${ltv.toFixed(2)}%` },
  }
}

// ─── 권리관계 (법적 병합) ─────────────────────────────────────
//  Phase G3 · 특수조건 V2 18항목 의 penalty 합 + 등기부 시그널 감점.
//
//  formula: 권리관계점수 = max(20, 100 − Σ특수조건V2감점 − Σ등기부감점)
//
//  특수조건 V2 penalty (예): 선순위등기권리 50, 대항력임차 45, 유치권/법정지상권 45 …
//    (전체 카탈로그: types.ts SPECIAL_CONDITIONS_V2 · 단일 소스)
//  등기부 시그널 (legacy 하드코딩 · 등기부 특유 신호): 당해세NR −5, 소액임차NR −10, 일반채권NR −5, 후순위근저당 −3/건
//
//  V1 legacy 호환: `specialConditions` (V1 camelCase 객체) 가 전달되면 `migrateV1ToV2Keys` 로
//  내부 자동 변환 — UnifiedReportInput 은 양쪽 모두 허용 (점진적 마이그레이션).
export function computeRightsFactor(args: {
  /** 신규 — V2 18항목 중 체크된 key 배열 (권장) */
  specialConditionsV2?: readonly string[]
  /** @deprecated 레거시 V1 25항목 객체 — 내부에서 V2 로 변환 */
  specialConditions?: SpecialConditions
  registry?: RegistryAnalysisBlock
  subordinateClaimCount?: number
}): RiskFactorResult {
  const { specialConditionsV2, specialConditions, registry, subordinateClaimCount = 0 } = args

  // [1] 특수조건 V2 감점 합산 (types.ts SPECIAL_CONDITIONS_V2 단일 소스)
  const v2Keys: readonly string[] = specialConditionsV2
    ?? (specialConditions ? migrateV1ToV2Keys(specialConditions) : [])
  const v2Result = computeLegalScoreV2(v2Keys)
  // v2Result.score 는 max(20, 100 − Σpenalty) · 그대로 "특수조건 기반 기초점수" 로 사용

  // [2] 등기부 시그널 (registry 블록 기반 — 현장/OCR 파싱 후 NEEDS_REVIEW)
  const findKind = (name: string) => registry?.rights?.items?.find(r => r.kind === name)
  const hasLocalTax    = findKind('당해세(국세·지방세)')?.presence === 'NEEDS_REVIEW'
  const hasSmallTenant = findKind('소액임차인 최우선변제금')?.presence === 'NEEDS_REVIEW'
  const hasGenClaim    = findKind('일반채권(가압류 등)')?.presence === 'NEEDS_REVIEW'

  const registryPenalties = [
    { label: '당해세 검토 필요',      amount: 5,  hit: hasLocalTax },
    { label: '소액임차인 최우선 검토', amount: 10, hit: hasSmallTenant },
    { label: '일반채권 가압류 검토',   amount: 5,  hit: hasGenClaim },
    { label: `후순위 근저당 ${subordinateClaimCount}건`, amount: 3 * subordinateClaimCount, hit: subordinateClaimCount > 0 },
  ]
  const registryHits = registryPenalties.filter(p => p.hit)
  const registryPenaltySum = registryHits.reduce((s, p) => s + p.amount, 0)

  // [3] 최종 점수 = V2 기초점수 − 등기부 감점 · 하한 20
  const raw = v2Result.score - registryPenaltySum
  const score = Math.round(clamp(raw, 20, 100) * 10) / 10

  // [4] 계산식 문자열
  const hitLines: string[] = []
  if (v2Result.penaltySum > 0) {
    hitLines.push(`  · 특수조건 V2 감점 합 (${v2Keys.length}개 선택): −${v2Result.penaltySum}`)
    const buckets = v2Result.byBucket
    if (buckets.OWNERSHIP.count > 0) hitLines.push(`      🔴 소유권 ${buckets.OWNERSHIP.count}개 · −${buckets.OWNERSHIP.penaltySum}`)
    if (buckets.COST.count > 0)      hitLines.push(`      🟠 비용   ${buckets.COST.count}개 · −${buckets.COST.penaltySum}`)
    if (buckets.LIQUIDITY.count > 0) hitLines.push(`      🟡 유동성 ${buckets.LIQUIDITY.count}개 · −${buckets.LIQUIDITY.penaltySum}`)
  }
  for (const p of registryHits) hitLines.push(`  · ${p.label}: −${p.amount}`)
  if (hitLines.length === 0) hitLines.push('  · 해당 없음')

  const formula =
    `권리관계 점수 = max(20, 100 − Σ특수조건V2감점 − Σ등기부감점)\n` +
    `  (특수조건 V2: types.ts SPECIAL_CONDITIONS_V2 · 18항목 × 3-버킷 단일 소스)\n\n` +
    `해당 감점:\n${hitLines.join('\n')}\n\n` +
    `         = max(20, 100 − ${v2Result.penaltySum} − ${registryPenaltySum})\n` +
    `         = max(20, ${raw})\n` +
    `         = ${score}점`

  const explanationParts: string[] = []
  if (v2Keys.length > 0) explanationParts.push(`특수조건 ${v2Keys.length}건`)
  if (registryHits.length > 0) explanationParts.push(`등기부 시그널 ${registryHits.length}건`)
  const explanation = explanationParts.length === 0
    ? '특수조건·등기부 시그널 모두 해당 없음 — 1순위 근저당만 활성'
    : `검토 필요: ${explanationParts.join(' · ')}`

  const hasTenantV2   = v2Keys.includes('opposable_tenant') || v2Keys.includes('lease_registration')
  const hasSeniorV2   = v2Keys.includes('senior_registry_rights')
  const mitigation = hasTenantV2
    ? '임대차보호법상 우선변제권 확인 · 보증금 인수 조건으로 매입가 협상'
    : hasSeniorV2
      ? '선순위 등기권리 말소 여부 확인 · 인수 조건 명확화 후 매입가 하향 조정'
      : '현장조사 시 미등기 임차·전입세대 확인, 당해세·일반채권 송달내역 별도 검증'

  return {
    category: '권리관계',
    score,
    severity: severityOf(score),
    explanation,
    mitigation,
    formula,
    inputs: {
      특수조건V2개수: v2Keys.length,
      특수조건감점: v2Result.penaltySum,
      소유권버킷: v2Result.byBucket.OWNERSHIP.count,
      비용버킷:   v2Result.byBucket.COST.count,
      유동성버킷: v2Result.byBucket.LIQUIDITY.count,
      당해세검토: hasLocalTax,
      소액임차검토: hasSmallTenant,
      일반채권검토: hasGenClaim,
      후순위근저당: subordinateClaimCount,
    },
  }
}

// ─── 시장 ───────────────────────────────────────────────────
//  0.6 × min(100, 블렌드낙찰가율%) + 0.4 × 지역트렌드점수
export function computeMarketFactor(args: {
  region: RegionTrendFactor
  auction: AuctionRatioFactor
}): RiskFactorResult {
  const { region, auction } = args
  const bidRatioScore = Math.min(100, auction.blendedBidRatio)
  const trendScore = clamp(
    50 + (region.auctionMomentum ?? 0) * 2 + (region.transactionVolumeChange ?? 0) * 0.5,
    0, 100,
  )
  const raw = bidRatioScore * 0.6 + trendScore * 0.4
  const score = Math.round(clamp(raw, 30, 100) * 10) / 10

  const formula =
    `시장 점수 = 0.6 × min(100, 블렌드낙찰가율%) + 0.4 × 지역트렌드점수\n\n` +
    `[1] 블렌드낙찰가율 = ${auction.blendedBidRatio.toFixed(2)}%  →  min(100, x) = ${bidRatioScore.toFixed(2)}\n` +
    `[2] 지역트렌드 = 50 + 모멘텀×2 + 거래량변동×0.5  · 클램프 0~100\n` +
    `            = 50 + (${region.auctionMomentum.toFixed(1)})×2 + (${region.transactionVolumeChange.toFixed(1)})×0.5\n` +
    `            = ${trendScore.toFixed(2)}점\n\n` +
    `시장 점수 = 0.6 × ${bidRatioScore.toFixed(2)} + 0.4 × ${trendScore.toFixed(2)}\n` +
    `         = ${(bidRatioScore * 0.6).toFixed(2)} + ${(trendScore * 0.4).toFixed(2)}\n` +
    `         = ${score}점`

  return {
    category: '시장',
    score,
    severity: severityOf(score),
    explanation: `블렌드 낙찰가율 ${auction.blendedBidRatio.toFixed(1)}% · 모멘텀 ${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p · 거래량변동 ${region.transactionVolumeChange > 0 ? '+' : ''}${region.transactionVolumeChange}%`,
    mitigation: score < 70
      ? '가격지수 조정기 대비 보수적 낙찰가율 시나리오 점검'
      : '현 시장 흐름 안정 — 매각 시기 탄력 운용 가능',
    formula,
    inputs: { 블렌드낙찰가율: `${auction.blendedBidRatio.toFixed(2)}%`, 모멘텀: `${region.auctionMomentum}%p`, 거래량변동: `${region.transactionVolumeChange}%` },
  }
}

// ─── 유동성 ─────────────────────────────────────────────────
//  100 − max(0, 매각일수 − 180) × 0.2, 하한 40
export function computeLiquidityFactor(args: {
  auction: AuctionRatioFactor
  averageBidderCount?: number
}): RiskFactorResult {
  const { auction, averageBidderCount = 1 } = args
  const saleDays = auction.expectedSaleDays ?? 240
  const daysPenalty = Math.max(0, saleDays - 180) * 0.2
  const bidderBonus = Math.min(8, Math.max(0, averageBidderCount - 1) * 2)
  const raw = 100 - daysPenalty + bidderBonus
  const score = Math.round(clamp(raw, 40, 100) * 10) / 10

  const formula =
    `유동성 점수 = 100 − max(0, 매각일수 − 180) × 0.2 + 입찰자보너스  · 하한 40\n\n` +
    `[1] 매각일수 = ${saleDays}일 (${auction.courtName ?? '관할법원'} 1회차 평균)\n` +
    `[2] 일수 감점 = max(0, ${saleDays} − 180) × 0.2 = ${daysPenalty.toFixed(2)}\n` +
    `[3] 입찰자보너스 = min(8, max(0, ${averageBidderCount} − 1) × 2) = ${bidderBonus.toFixed(2)}\n\n` +
    `유동성 점수 = 100 − ${daysPenalty.toFixed(2)} + ${bidderBonus.toFixed(2)}\n` +
    `         = ${score}점`

  return {
    category: '유동성',
    score,
    severity: severityOf(score),
    explanation: `${auction.courtName ?? '관할법원'} 1회차 평균 ${saleDays}일 · 평균 입찰자 ${averageBidderCount}명`,
    mitigation: saleDays > 300
      ? '매각 장기화 가능성 — 질권 이자 부담 감안해 단기 유동화 루트 병행'
      : '매각 기간 업계 평균권 — 표준 자금 계획 적용 가능',
    formula,
    inputs: { 매각일수: saleDays, 평균입찰자수: averageBidderCount, 일수감점: daysPenalty, 입찰자보너스: bidderBonus },
  }
}

// ─── 4팩터 종합 리스크 점수 (Phase G3) ───────────────────────
//   가중치: 담보가치 0.35 · 권리관계 0.30 (법적 병합) · 시장 0.25 · 유동성 0.10
//
//   구 버전 (Phase 2~F): 담보 0.30 · 권리 0.15 · 시장 0.20 · 유동성 0.10 · 법적 0.25
//   G3 에서 '법적' 팩터를 '권리관계' 로 병합 (특수조건 V2 18항목) 하고 재분배.
export const RISK_FACTOR_WEIGHTS = {
  '담보가치': 0.35,
  '권리관계': 0.30,
  '시장':     0.25,
  '유동성':   0.10,
} as const satisfies Record<RiskFactorCategory, number>

// ─── 투자 의견 가중 스코어링 (0~100) ─────────────────────────
//   4개 팩터를 0~100 점수로 매핑한 뒤 가중 평균으로 통합 점수 산출.
//   게이트식(N개 통과=BUY) 대신 모든 팩터 기여도가 반영되는 구조.
//
//   팩터별 스코어링:
//     · 회수율:      0% @ 60% → 100점 @ 100% (선형)
//     · 리스크:      5팩터 종합 점수 그대로 (0~100)
//     · ROI:         0% @ 0 → 100점 @ 25% (선형)
//     · 할인율:      0% @ 0 → 100점 @ 15% 할인 (선형)
//
//   가중치:
//     · 회수율  0.35 (회수 가능성이 투자 결정의 1차 필터)
//     · 리스크  0.25 (구조적 안전성)
//     · ROI     0.25 (수익성)
//     · 할인    0.15 (매입 조건)
//
//   판정 버킷:
//     · ≥ 75점  BUY    (권고)
//     · ≥ 55점  HOLD   (관망)
//     · <  55점  AVOID  (회피)
export const VERDICT_WEIGHTS = {
  recovery: 0.35,
  risk:     0.25,
  roi:      0.25,
  discount: 0.15,
} as const

export type VerdictScoringInputs = {
  predictedRecoveryRate: number    // % (예: 107.8)
  riskScore: number                // 0~100
  recommendedRoi: number           // 소수 (예: 0.481)
  bankSalePrice: number            // 원
  claimBalance: number             // 원 (채권잔액)
}

export type VerdictScoringResult = {
  verdict: 'BUY' | 'HOLD' | 'AVOID'
  totalScore: number               // 0~100
  components: {
    recovery: { raw: number; mapped: number; contribution: number; weight: number }
    risk:     { raw: number; mapped: number; contribution: number; weight: number }
    roi:      { raw: number; mapped: number; contribution: number; weight: number }
    discount: { raw: number; mapped: number; contribution: number; weight: number }
  }
  formula: string
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * 투자 의견 점수를 A/B/C/D 등급으로 매핑.
 *   · A: ≥ 85 (최상위 BUY)
 *   · B: ≥ 75 (BUY)
 *   · C: ≥ 55 (HOLD)
 *   · D: <  55 (AVOID)
 */
export function verdictScoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

export function computeInvestmentVerdict(input: VerdictScoringInputs): VerdictScoringResult {
  const { predictedRecoveryRate, riskScore, recommendedRoi, bankSalePrice, claimBalance } = input

  // ── 1. 각 팩터 0~100 정규화 ────────────────────────────
  const recoveryMapped = clamp(((predictedRecoveryRate - 60) / 40) * 100, 0, 100)
  const riskMapped     = clamp(riskScore, 0, 100)
  const roiMapped      = clamp((recommendedRoi / 0.25) * 100, 0, 100)
  const discountRatio  = claimBalance > 0 ? 1 - bankSalePrice / claimBalance : 0
  const discountMapped = clamp((discountRatio / 0.15) * 100, 0, 100)

  // ── 2. 가중 합산 ──────────────────────────────────────
  const w = VERDICT_WEIGHTS
  const recoveryContrib = recoveryMapped * w.recovery
  const riskContrib     = riskMapped     * w.risk
  const roiContrib      = roiMapped      * w.roi
  const discountContrib = discountMapped * w.discount
  const totalScore      = round1(recoveryContrib + riskContrib + roiContrib + discountContrib)

  // ── 3. 버킷 판정 ──────────────────────────────────────
  const verdict: 'BUY' | 'HOLD' | 'AVOID' =
    totalScore >= 75 ? 'BUY' : totalScore >= 55 ? 'HOLD' : 'AVOID'

  // ── 4. 계산식 문자열 ───────────────────────────────────
  const formula =
    `투자 의견 점수 = Σ(팩터 정규화점수 × 가중치)\n\n` +
    `[1] 회수율 정규화: clamp((${predictedRecoveryRate.toFixed(1)} − 60) / 40 × 100, 0, 100) = ${round1(recoveryMapped)}점\n` +
    `    기여 = ${round1(recoveryMapped)} × ${w.recovery} = ${round1(recoveryContrib)}\n` +
    `[2] 리스크 정규화: ${round1(riskMapped)}점 (5팩터 종합)\n` +
    `    기여 = ${round1(riskMapped)} × ${w.risk} = ${round1(riskContrib)}\n` +
    `[3] ROI 정규화: clamp(${(recommendedRoi * 100).toFixed(1)}% / 25% × 100, 0, 100) = ${round1(roiMapped)}점\n` +
    `    기여 = ${round1(roiMapped)} × ${w.roi} = ${round1(roiContrib)}\n` +
    `[4] 할인 정규화: clamp(${(discountRatio * 100).toFixed(1)}% / 15% × 100, 0, 100) = ${round1(discountMapped)}점\n` +
    `    기여 = ${round1(discountMapped)} × ${w.discount} = ${round1(discountContrib)}\n\n` +
    `총점 = ${round1(recoveryContrib)} + ${round1(riskContrib)} + ${round1(roiContrib)} + ${round1(discountContrib)} = ${totalScore}점\n` +
    `판정 = ≥75→BUY · ≥55→HOLD · <55→AVOID  →  ${verdict}`

  return {
    verdict,
    totalScore,
    components: {
      recovery: { raw: predictedRecoveryRate, mapped: round1(recoveryMapped), contribution: round1(recoveryContrib), weight: w.recovery },
      risk:     { raw: riskScore,             mapped: round1(riskMapped),     contribution: round1(riskContrib),     weight: w.risk },
      roi:      { raw: recommendedRoi,         mapped: round1(roiMapped),      contribution: round1(roiContrib),      weight: w.roi },
      discount: { raw: discountRatio,          mapped: round1(discountMapped), contribution: round1(discountContrib), weight: w.discount },
    },
    formula,
  }
}

export function composeRiskScore(factors: RiskFactorResult[]): {
  score: number
  formula: string
} {
  const terms = factors.map(f => {
    const w = RISK_FACTOR_WEIGHTS[f.category]
    return { f, w, contrib: f.score * w }
  })
  const score = Math.round(terms.reduce((s, t) => s + t.contrib, 0) * 10) / 10
  const formula =
    `종합 리스크 점수 = Σ(팩터 점수 × 가중치)\n\n` +
    terms.map(t => `  · ${t.f.category.padEnd(4, '　')} ${t.f.score.toFixed(1)}점 × ${t.w} = ${t.contrib.toFixed(2)}`).join('\n') +
    `\n\n           = ${score}점`
  return { score, formula }
}
