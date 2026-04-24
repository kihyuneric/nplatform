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
//  formula: 권리관계점수 = max(20, 100 − Σ특수조건V2감점 − Σ매핑안된등기부감점)
//
//  Phase G 후속 수정 (2026-04-24):
//    · 기존: 등기부 NEEDS_REVIEW 시그널을 별도 소액 감점(-5·-10·-5)으로 처리
//            → 특수조건 V2 감점표(당해세 -40 등)와 불일치 문제 발생.
//    · 수정: REGISTRY_TO_V2_KEY_MAP 매핑 테이블 도입.
//            등기부에서 감지된 NEEDS_REVIEW 는 대응하는 V2 key 를
//            "자동 체크" 처리 → 단일 감점 체계로 통일.
//            매도자가 체크박스로 이미 체크한 경우 Set 중복 제거 → 이중감점 없음.
//            V2 에 매핑할 수 없는 신호(후순위 근저당 등)만 별도 고정 감점 유지.
//
//  V1 legacy 호환: `specialConditions` (V1 camelCase 객체) 가 전달되면 `migrateV1ToV2Keys` 로
//  내부 자동 변환 — UnifiedReportInput 은 양쪽 모두 허용 (점진적 마이그레이션).

/**
 * 등기부 시그널 → V2 SpecialConditions 키 매핑.
 *
 * 등기부 OCR/실사 단계에서 감지된 NEEDS_REVIEW 항목을
 * V2 카탈로그의 어느 key 와 동일한 위험으로 볼지 정의.
 *
 * 매핑 규칙:
 *   · 매핑 존재 → 해당 V2 key 를 자동 체크 (감점 V2 카탈로그 기준)
 *   · 매핑 미존재 (null/undefined) → 기존 고정 감점 별도 유지
 *
 * 번역·테마 교체 시 이 테이블만 수정하면 됨 (계산 로직은 불변).
 */
const REGISTRY_TO_V2_KEY_MAP: Record<string, string | null> = {
  // 당해세는 특수조건 V2 inherent_tax(-40) 와 동일 위험 → 자동 체크
  '당해세(국세·지방세)': 'inherent_tax',
  // 이하는 V2 카탈로그에 1:1 매칭되는 key 없음 → 별도 감점으로 유지
  // (향후 V2 확장 시 여기에 매핑 추가 가능)
  '소액임차인 최우선변제금': null,
  '일반채권(가압류 등)':     null,
}

/**
 * V2 매핑 없는 등기부 시그널의 별도 감점 테이블.
 * 각 항목의 라벨과 감점값 · 활성 조건을 단일 소스로 관리.
 */
type UnmappedRegistrySignal = {
  registryKind: string          // RegistryItem.kind 매칭 문자열
  label: string                 // UI 표시 라벨
  penalty: number               // 감점값 (양수)
}
const UNMAPPED_REGISTRY_SIGNALS: readonly UnmappedRegistrySignal[] = [
  { registryKind: '소액임차인 최우선변제금', label: '소액임차인 최우선 검토', penalty: 10 },
  { registryKind: '일반채권(가압류 등)',     label: '일반채권 가압류 검토',    penalty: 5 },
] as const

export function computeRightsFactor(args: {
  /** 신규 — V2 18항목 중 체크된 key 배열 (권장) */
  specialConditionsV2?: readonly string[]
  /** @deprecated 레거시 V1 25항목 객체 — 내부에서 V2 로 변환 */
  specialConditions?: SpecialConditions
  registry?: RegistryAnalysisBlock
  subordinateClaimCount?: number
}): RiskFactorResult {
  const { specialConditionsV2, specialConditions, registry, subordinateClaimCount = 0 } = args

  // [1] 매도자 체크 기반 V2 key 집합
  const sellerCheckedKeys: readonly string[] = specialConditionsV2
    ?? (specialConditions ? migrateV1ToV2Keys(specialConditions) : [])

  // [2] 등기부 시그널 수집
  const findKind = (name: string) => registry?.rights?.items?.find(r => r.kind === name)

  // [2-1] 매핑된 시그널 → V2 key 자동 추가 (Set 합류)
  const autoCheckedFromRegistry = new Set<string>()
  const registryAutoCheckLabels: { v2Key: string; registryKind: string }[] = []
  for (const [registryKind, v2Key] of Object.entries(REGISTRY_TO_V2_KEY_MAP)) {
    if (!v2Key) continue
    const hit = findKind(registryKind)?.presence === 'NEEDS_REVIEW'
    if (hit && !sellerCheckedKeys.includes(v2Key)) {
      autoCheckedFromRegistry.add(v2Key)
      registryAutoCheckLabels.push({ v2Key, registryKind })
    }
  }

  // [2-2] V2 매핑 없는 시그널 → 별도 고정 감점
  const unmappedHits: { label: string; penalty: number }[] = []
  for (const sig of UNMAPPED_REGISTRY_SIGNALS) {
    if (findKind(sig.registryKind)?.presence === 'NEEDS_REVIEW') {
      unmappedHits.push({ label: sig.label, penalty: sig.penalty })
    }
  }
  // 후순위 근저당은 등기부 항목이 아니라 숫자 입력 → 별도 처리
  if (subordinateClaimCount > 0) {
    unmappedHits.push({
      label: `후순위 근저당 ${subordinateClaimCount}건`,
      penalty: 3 * subordinateClaimCount,
    })
  }
  const unmappedPenaltySum = unmappedHits.reduce((s, p) => s + p.penalty, 0)

  // [3] 최종 V2 key 집합 = 매도자체크 ∪ 등기부자동체크
  const finalV2Keys = Array.from(new Set([...sellerCheckedKeys, ...autoCheckedFromRegistry]))
  const v2Result = computeLegalScoreV2(finalV2Keys)

  // [4] 최종 점수 = max(20, 100 − V2감점 − 매핑안된등기부감점)
  //     · v2Result.score 는 이미 max(20, 100 − V2감점) · 여기서는 rawSum 재계산으로 일관
  const rawSum = v2Result.penaltySum + unmappedPenaltySum
  const raw = 100 - rawSum
  const score = Math.round(clamp(raw, 20, 100) * 10) / 10

  // [5] 계산식 문자열
  const hitLines: string[] = []
  if (v2Result.penaltySum > 0) {
    const autoCount = registryAutoCheckLabels.length
    const autoNote = autoCount > 0 ? ` · 등기부 자동 체크 ${autoCount}개 포함` : ''
    hitLines.push(`  · 특수조건 V2 감점 합 (${finalV2Keys.length}개${autoNote}): −${v2Result.penaltySum}`)
    const buckets = v2Result.byBucket
    if (buckets.OWNERSHIP.count > 0) hitLines.push(`      🔴 소유권 ${buckets.OWNERSHIP.count}개 · −${buckets.OWNERSHIP.penaltySum}`)
    if (buckets.COST.count > 0)      hitLines.push(`      🟠 비용   ${buckets.COST.count}개 · −${buckets.COST.penaltySum}`)
    if (buckets.LIQUIDITY.count > 0) hitLines.push(`      🟡 유동성 ${buckets.LIQUIDITY.count}개 · −${buckets.LIQUIDITY.penaltySum}`)
    for (const r of registryAutoCheckLabels) {
      hitLines.push(`      · 등기부 ${r.registryKind} → V2 [${r.v2Key}] 자동 체크`)
    }
  }
  for (const p of unmappedHits) hitLines.push(`  · ${p.label}: −${p.penalty}`)
  if (hitLines.length === 0) hitLines.push('  · 해당 없음')

  const formula =
    `권리관계 점수 = max(20, 100 − Σ특수조건V2감점 − Σ매핑안된등기부감점)\n` +
    `  (특수조건 V2: types.ts SPECIAL_CONDITIONS_V2 · 18항목 × 3-버킷 단일 소스)\n` +
    `  (등기부 NEEDS_REVIEW → V2 key 자동 체크 · REGISTRY_TO_V2_KEY_MAP 기반)\n\n` +
    `해당 감점:\n${hitLines.join('\n')}\n\n` +
    `         = max(20, 100 − ${v2Result.penaltySum} − ${unmappedPenaltySum})\n` +
    `         = max(20, ${raw})\n` +
    `         = ${score}점`

  const explanationParts: string[] = []
  if (finalV2Keys.length > 0) explanationParts.push(`특수조건 ${finalV2Keys.length}건`)
  if (unmappedHits.length > 0) explanationParts.push(`추가 등기부 시그널 ${unmappedHits.length}건`)
  const explanation = explanationParts.length === 0
    ? '특수조건·등기부 시그널 모두 해당 없음 — 1순위 근저당만 활성'
    : `검토 필요: ${explanationParts.join(' · ')}`

  const hasTenantV2   = finalV2Keys.includes('opposable_tenant') || finalV2Keys.includes('lease_registration')
  const hasSeniorV2   = finalV2Keys.includes('senior_registry_rights')
  const hasInherentTaxV2 = finalV2Keys.includes('inherent_tax')
  const mitigation = hasTenantV2
    ? '임대차보호법상 우선변제권 확인 · 보증금 인수 조건으로 매입가 협상'
    : hasSeniorV2
      ? '선순위 등기권리 말소 여부 확인 · 인수 조건 명확화 후 매입가 하향 조정'
      : hasInherentTaxV2
        ? '당해세 송달내역·체납처분 단계 확인 · 최우선 배당 감액분 매입가 반영'
        : '현장조사 시 미등기 임차·전입세대 확인, 소액임차·일반채권 송달내역 별도 검증'

  return {
    category: '권리관계',
    score,
    severity: severityOf(score),
    explanation,
    mitigation,
    formula,
    inputs: {
      특수조건V2개수: finalV2Keys.length,
      매도자체크개수: sellerCheckedKeys.length,
      등기부자동체크개수: autoCheckedFromRegistry.size,
      특수조건감점: v2Result.penaltySum,
      소유권버킷: v2Result.byBucket.OWNERSHIP.count,
      비용버킷:   v2Result.byBucket.COST.count,
      유동성버킷: v2Result.byBucket.LIQUIDITY.count,
      매핑안된감점: unmappedPenaltySum,
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
