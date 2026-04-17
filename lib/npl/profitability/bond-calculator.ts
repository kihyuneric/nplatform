// ─── 채권액 산출 ────────────────────────────────────────────────────────────
// Excel 수식 1:1 변환: 원금 + 약정이자 + 지연손해금 = 총채권액
// ─────────────────────────────────────────────────────────────────────────────

import type { BondInfo, BondCalculation } from './types'

/** 두 날짜 사이의 일수 (절대값) */
function daysBetween(a: string, b: string): number {
  const d1 = new Date(a)
  const d2 = new Date(b)
  return Math.max(0, Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * 채권액 산출
 *
 * 실제 Excel 로직:
 * 1. 약정이자 = 원금 × 약정금리 × (대출실행일~연체시작일 일수/365)
 *    → 연체 전 정상이자. 실무에서는 이미 원금에 포함되는 경우가 많으므로
 *      remainingPrincipal에 반영된 것으로 간주하고 별도 계산하지 않음.
 * 2. 지연손해금 = 잔여원금 × 연체금리(%) × (연체시작일~분석기준일 일수/365)
 * 3. 총채권액 = 잔여원금 + 지연손해금
 */
export function calculateBondAmount(
  bond: BondInfo,
  analysisDate: string
): BondCalculation {
  const daysOverdue = daysBetween(bond.defaultStartDate, analysisDate)

  // 약정이자: 연체 전 미수이자 (보통 잔여원금에 이미 포함)
  // 명시적으로 분리 표시용
  const accruedInterest = 0 // 실무: 잔여원금에 포함됨

  // 지연손해금 = 잔여원금 × (연체금리/100) × (연체일수/365)
  const penaltyInterest = Math.round(
    bond.remainingPrincipal * (bond.penaltyRate / 100) * (daysOverdue / 365)
  )

  const totalBondAmount = bond.remainingPrincipal + accruedInterest + penaltyInterest

  return {
    principal: bond.remainingPrincipal,
    accruedInterest,
    penaltyInterest,
    totalBondAmount,
    calculationDate: analysisDate,
    daysOverdue,
  }
}

/**
 * 채권액 산출 (상세 — 약정이자 별도 계산 버전)
 *
 * 일부 기관에서 잔여원금과 미수이자를 분리 제공하는 경우:
 * - accruedInterest를 직접 전달하면 그 값을 사용
 * - 없으면 원금 × 약정금리 × (만기일~연체시작일 or 분석일) 기준 추정
 */
export function calculateBondAmountDetailed(
  bond: BondInfo,
  analysisDate: string,
  explicitAccruedInterest?: number
): BondCalculation {
  const daysOverdue = daysBetween(bond.defaultStartDate, analysisDate)

  // 약정이자
  let accruedInterest: number
  if (explicitAccruedInterest !== undefined) {
    accruedInterest = explicitAccruedInterest
  } else if (bond.maturityDate) {
    // 만기일~연체시작일 사이의 정상이자
    const normalDays = daysBetween(bond.maturityDate, bond.defaultStartDate)
    accruedInterest = Math.round(
      bond.remainingPrincipal * (bond.interestRate / 100) * (normalDays / 365)
    )
  } else {
    accruedInterest = 0
  }

  // 지연손해금
  const penaltyInterest = Math.round(
    bond.remainingPrincipal * (bond.penaltyRate / 100) * (daysOverdue / 365)
  )

  const totalBondAmount = bond.remainingPrincipal + accruedInterest + penaltyInterest

  return {
    principal: bond.remainingPrincipal,
    accruedInterest,
    penaltyInterest,
    totalBondAmount,
    calculationDate: analysisDate,
    daysOverdue,
  }
}
