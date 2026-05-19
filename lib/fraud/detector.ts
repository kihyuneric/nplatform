/**
 * lib/fraud/detector.ts
 *
 * NPL 입찰·거래 이상 패턴 탐지.
 *
 * 룰 기반 (Phase 1) + 통계 (Phase 5 — XGBoost) 혼합 전략.
 * 운영 시 fraud_logs 테이블에 기록 + admin 알림.
 *
 * 사용:
 *   const result = await detectBidFraud({ userId, bidAmount, auctionId, ... })
 *   if (result.risk > 70) await flagForReview(result)
 */

export type FraudRule =
  | 'BURST_BIDS'            // 짧은 시간 내 다수 입찰
  | 'WASH_TRADING'          // 동일 사용자·계정 간 가격 조작
  | 'BID_SUDDEN_JUMP'       // 시세 대비 비정상적 입찰가 (>30% 상회)
  | 'NEW_ACCOUNT_HIGH_BID'  // 신규 계정 + 고액 입찰
  | 'CIRCULAR_DEAL'         // 동일 자산 매도자↔매수자 반복
  | 'ABNORMAL_TIMING'       // 마감 직전 입찰 패턴
  | 'KYC_INCONSISTENT'      // 본인인증 정보 불일치

export interface FraudFlag {
  rule: FraudRule
  weight: number  // 0~100 (해당 룰의 위험 가중치)
  evidence: string
}

export interface FraudResult {
  /** 종합 위험도 0~100 */
  risk: number
  flags: FraudFlag[]
  /** 차단 권장 (risk >= 80) */
  shouldBlock: boolean
  /** 관리자 검토 권장 (risk 40~80) */
  shouldReview: boolean
}

export interface BidFraudInput {
  userId: string
  bidAmount: number
  auctionId: string
  /** 사용자 계정 생성일 (ISO) */
  userCreatedAt: string
  /** 최근 24h 내 동일 사용자 입찰 수 */
  recentBidCount24h: number
  /** 평균 시장 시세 (USD or KRW) */
  marketEstimate: number
  /** KYC 일치 여부 */
  kycMatches: boolean
  /** 매도자 — 매수자 과거 동일 거래 수 */
  prevDealsWithSameSeller: number
  /** 입찰 마감까지 남은 분 */
  minutesUntilDeadline: number
}

const NEW_ACCOUNT_DAYS = 7

export function detectBidFraud(input: BidFraudInput): FraudResult {
  const flags: FraudFlag[] = []

  // 1) 짧은 시간 내 다수 입찰
  if (input.recentBidCount24h > 10) {
    flags.push({
      rule: 'BURST_BIDS',
      weight: Math.min(50, input.recentBidCount24h * 3),
      evidence: `24h 내 ${input.recentBidCount24h}회 입찰`,
    })
  }

  // 2) 시세 대비 비정상 입찰가 (30% 이상 상회)
  if (input.marketEstimate > 0) {
    const ratio = input.bidAmount / input.marketEstimate
    if (ratio > 1.3) {
      flags.push({
        rule: 'BID_SUDDEN_JUMP',
        weight: Math.min(60, (ratio - 1.3) * 100),
        evidence: `시세 대비 ${(ratio * 100).toFixed(0)}% 입찰`,
      })
    }
  }

  // 3) 신규 계정 + 고액 입찰
  const accountAgeDays = Math.floor((Date.now() - new Date(input.userCreatedAt).getTime()) / 86400_000)
  if (accountAgeDays < NEW_ACCOUNT_DAYS && input.bidAmount > 500_000_000) {
    flags.push({
      rule: 'NEW_ACCOUNT_HIGH_BID',
      weight: 70,
      evidence: `계정 ${accountAgeDays}일, 입찰 ${(input.bidAmount / 100_000_000).toFixed(1)}억`,
    })
  }

  // 4) 순환 거래
  if (input.prevDealsWithSameSeller >= 3) {
    flags.push({
      rule: 'CIRCULAR_DEAL',
      weight: input.prevDealsWithSameSeller * 15,
      evidence: `동일 매도자 거래 ${input.prevDealsWithSameSeller}회`,
    })
  }

  // 5) 마감 직전 패턴
  if (input.minutesUntilDeadline < 5 && input.bidAmount > input.marketEstimate * 1.2) {
    flags.push({
      rule: 'ABNORMAL_TIMING',
      weight: 30,
      evidence: `마감 ${input.minutesUntilDeadline}분 전 ${(input.bidAmount / input.marketEstimate * 100).toFixed(0)}% 입찰`,
    })
  }

  // 6) KYC 불일치
  if (!input.kycMatches) {
    flags.push({
      rule: 'KYC_INCONSISTENT',
      weight: 80,
      evidence: '본인인증 정보 불일치',
    })
  }

  // 종합 위험도 (가중치 합, 100 cap)
  const risk = Math.min(100, flags.reduce((sum, f) => sum + f.weight, 0))

  return {
    risk,
    flags,
    shouldBlock: risk >= 80,
    shouldReview: risk >= 40 && risk < 80,
  }
}

/**
 * TODO Phase 5 — XGBoost 모델 기반 회수율·이상치 탐지.
 * 룰 기반 + ML 점수 가중평균 → 정확도 향상.
 */
export function combineFraudScore(ruleScore: number, mlScore: number): number {
  // 룰 60% + ML 40% (초기 weight, 운영 데이터 누적 후 재조정)
  return Math.min(100, ruleScore * 0.6 + mlScore * 0.4)
}
