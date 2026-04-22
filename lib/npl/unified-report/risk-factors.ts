/**
 * lib/npl/unified-report/risk-factors.ts
 *
 * 리스크 5팩터 점수 산출 — 계산 가능한 선형/구간식 기반.
 *   · 담보가치    LTV = 채권잔액 / min(감정가, AI시세) × 100 → 점수 = 100 − max(0, LTV−50)
 *   · 권리관계    90 − Σ(선순위임차 −25, 당해세NR −5, 소액임차 −10, 일반채권NR −5, 후순위근저당 −3)
 *   · 시장        0.6 × min(100, 블렌드낙찰가율%) + 0.4 × (50 + 모멘텀×2 + 거래량변동×0.5)
 *   · 유동성      100 − max(0, 매각일수 − 180) × 0.2  (하한 40)
 *   · 법적        95 − Σ(유치권 −15, 법정지상권 −10, 지분경매 −15, 위반건축 −10, 분묘 −8, 농지 −10)
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
import { SPECIAL_CONDITION_CATALOG } from './types'

export type RiskFactorResult = {
  category: '담보가치' | '권리관계' | '시장' | '유동성' | '법적'
  score: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  explanation: string
  mitigation: string
  formula: string
  inputs: Record<string, string | number | boolean>
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

// ─── 권리관계 ───────────────────────────────────────────────
//  기본 90점 − Σ(임차인 특수조건 + 등기부 시그널 + 후순위 근저당)
//  임차인·선순위 특수조건은 SPECIAL_CONDITION_CATALOG(types.ts)에서 파생 — 단일 소스.
export function computeRightsFactor(args: {
  specialConditions: SpecialConditions
  registry?: RegistryAnalysisBlock
  subordinateClaimCount?: number   // 후순위 근저당/기타 담보 건수
}): RiskFactorResult {
  const { specialConditions, registry, subordinateClaimCount = 0 } = args

  // [1] 카탈로그 파생 — 임차인(E) + 선순위 권리(B) 중 권리관계 직접 영향 항목
  //     가중치: 임차인은 legalPenalty × 2.5 (인수/명도 직접 연관, 원래 25점 기준 유지)
  //            선순위 등기 권리는 legalPenalty × 0.5 (법적 팩터와 중복 방지)
  const catalogPenalties = SPECIAL_CONDITION_CATALOG
    .filter(it => it.category === 'TENANT' || it.category === 'SENIOR_ENCUMBRANCE')
    .map(it => ({
      label: it.label,
      amount: it.category === 'TENANT'
        ? Math.round(Math.abs(it.legalPenalty) * 2.5)
        : Math.round(Math.abs(it.legalPenalty) * 0.5),
      hit: Boolean(specialConditions[it.key]),
    }))

  // [2] 등기부 기반 시그널 (하드코딩 유지 — 등기부 특유 신호)
  const findKind = (name: string) => registry?.rights?.items?.find(r => r.kind === name)
  const hasLocalTax    = findKind('당해세(국세·지방세)')?.presence === 'NEEDS_REVIEW'
  const hasSmallTenant = findKind('소액임차인 최우선변제금')?.presence === 'NEEDS_REVIEW'
  const hasGenClaim    = findKind('일반채권(가압류 등)')?.presence === 'NEEDS_REVIEW'

  const registryPenalties = [
    { label: '당해세 검토 필요',            amount: 5,  hit: hasLocalTax },
    { label: '소액임차인 최우선 검토',      amount: 10, hit: hasSmallTenant },
    { label: '일반채권 가압류 검토',        amount: 5,  hit: hasGenClaim },
    { label: `후순위 근저당 ${subordinateClaimCount}건`, amount: 3 * subordinateClaimCount, hit: subordinateClaimCount > 0 },
  ]

  const penalties = [...catalogPenalties, ...registryPenalties]
  const hits = penalties.filter(p => p.hit)
  const totalPenalty = hits.reduce((s, p) => s + p.amount, 0)
  const raw = 90 - totalPenalty
  const score = Math.round(clamp(raw, 30, 100) * 10) / 10

  const hitLines = hits.length === 0
    ? '  · 해당 없음'
    : hits.map(p => `  · ${p.label}: −${p.amount}`).join('\n')
  const formula =
    `권리관계 점수 = 90 − Σ(임차인 특수조건 + 선순위 권리 + 등기부 시그널)\n` +
    `  (임차인/선순위 카탈로그: types.ts SPECIAL_CONDITION_CATALOG 단일 소스)\n\n` +
    `해당 감점:\n${hitLines}\n\n` +
    `           = 90 − ${totalPenalty}\n` +
    `           = ${score}점`

  const hitLabels = hits.map(p => p.label)
  return {
    category: '권리관계',
    score,
    severity: severityOf(score),
    explanation: hitLabels.length === 0
      ? '임차인·선순위 권리·등기부 시그널 모두 특이사항 없음 — 1순위 근저당만 활성'
      : `검토 필요 항목 ${hitLabels.length}개: ${hitLabels.slice(0, 5).join(', ')}${hitLabels.length > 5 ? ` 외 ${hitLabels.length - 5}건` : ''}`,
    mitigation: specialConditions.seniorTenant || specialConditions.leaseholdRegistered
      ? '임대차보호법상 우선변제권 확인, 보증금 인수 조건 매입가 협상'
      : '현장조사 시 미등기 임차·전입세대 확인, 당해세·일반채권 송달내역 별도 검증',
    formula,
    inputs: {
      대항력임차: specialConditions.seniorTenant,
      임차권등기: specialConditions.leaseholdRegistered,
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

// ─── 법적 ───────────────────────────────────────────────────
//  95 − Σ(특수조건 카탈로그 legalPenalty 절대값), 하한 30
//  항목/점수는 lib/npl/unified-report/types.ts SPECIAL_CONDITION_CATALOG 단일 소스.
export function computeLegalFactor(args: {
  specialConditions: SpecialConditions
}): RiskFactorResult {
  const sc = args.specialConditions
  const penalties = SPECIAL_CONDITION_CATALOG.map(item => ({
    key: item.key,
    label: item.label,
    amount: Math.abs(item.legalPenalty),
    hit: Boolean(sc[item.key]),
  }))
  const hits = penalties.filter(p => p.hit)
  const totalPenalty = hits.reduce((s, p) => s + p.amount, 0)
  const raw = 95 - totalPenalty
  const score = Math.round(clamp(raw, 30, 100) * 10) / 10

  const hitLines = hits.length === 0
    ? '  · 해당 없음'
    : hits.map(p => `  · ${p.label}: −${p.amount}`).join('\n')
  const formula =
    `법적 점수 = 95 − Σ(특수조건별 감점)  · 하한 30\n` +
    `  (항목/점수: types.ts SPECIAL_CONDITION_CATALOG 단일 소스)\n\n` +
    `해당 감점:\n${hitLines}\n\n` +
    `         = 95 − ${totalPenalty}\n` +
    `         = ${score}점`

  return {
    category: '법적',
    score,
    severity: severityOf(score),
    explanation: hits.length === 0
      ? '25개 특수조건 전부 해당 없음 — 등기/물권/조세 청결'
      : `특수조건 ${hits.length}건 해당: ${hits.slice(0, 5).map(h => h.label).join(', ')}${hits.length > 5 ? ` 외 ${hits.length - 5}건` : ''}`,
    mitigation: hits.length === 0
      ? '현장조사 시 점유관계·무허가 증축 여부 재확인'
      : '해당 특수조건별 전문가 자문 확보 후 낙찰가 협상에 반영',
    formula,
    inputs: Object.fromEntries(penalties.map(p => [p.label, p.hit])),
  }
}

// ─── 5팩터 종합 리스크 점수 ─────────────────────────────────
//   가중치: 담보가치 0.30 · 권리관계 0.15 · 시장 0.20 · 유동성 0.10 · 법적 0.25
export const RISK_FACTOR_WEIGHTS = {
  '담보가치': 0.30,
  '권리관계': 0.15,
  '시장':     0.20,
  '유동성':   0.10,
  '법적':     0.25,
} as const

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
