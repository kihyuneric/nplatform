/**
 * NPL 수익률 분석 산식 (운영자 전용 · 규칙 기반 v1)
 * 리스트/상세 페이지 공용 SSoT. ML 모델 연동 시 이 모듈만 교체.
 */
export function computeAnalysis(r: { appraisal: number; principal: number; asking: number }) {
  const { appraisal, principal, asking } = r
  // 예상 회수액: 감정가의 85% (경매 평균 낙찰가율 가정)
  const expectedRecovery = appraisal * 0.85
  // 예상 ROI: (회수액 - 매입가) / 매입가
  const roi = asking > 0 ? ((expectedRecovery - asking) / asking) * 100 : 0
  // 예상 IRR — 회수율 대체 (2026-08-19)
  //   회수율(회수액÷채권잔액)은 매입 의사결정에 쓰이지 않아 제거하고,
  //   보유기간을 반영한 연환산 수익률(IRR)로 바꾼다.
  //   단일 현금흐름(매입 → 회수) 가정이므로 IRR = (회수액/매입가)^(1/보유연수) − 1.
  //   보유기간: 경매 배당까지 평균 18개월 (1.5년) 가정 — ML 연동 시 실측치로 대체.
  const HOLDING_YEARS = 1.5
  const irr = asking > 0 && expectedRecovery > 0
    ? (Math.pow(expectedRecovery / asking, 1 / HOLDING_YEARS) - 1) * 100
    : 0
  // LTV: 채권잔액 / 감정가
  const ltv = appraisal > 0 ? (principal / appraisal) * 100 : 0
  // 할인율: 1 - 협의가/채권잔액
  const discount = principal > 0 ? (1 - asking / principal) * 100 : 0
  // AI 등급: ROI·LTV 조합 규칙
  const grade =
    roi >= 40 && ltv <= 70 ? 'A' :
    roi >= 25 ? 'B' :
    roi >= 12 ? 'C' :
    roi >= 0 ? 'D' : 'E'
  const opinion = grade === 'A' || grade === 'B' ? 'BUY' : grade === 'C' ? 'HOLD' : 'PASS'
  return {
    roi: Math.round(roi * 10) / 10,
    irr: Math.round(irr * 10) / 10,
    holdingYears: HOLDING_YEARS,
    ltv: Math.round(ltv * 10) / 10,
    discount: Math.round(discount * 10) / 10,
    expectedRecovery,
    grade,
    opinion,
  }
}

export const fmtEok = (n: number) =>
  n >= 100_000_000 ? `${(n / 100_000_000).toFixed(1)}억` : n > 0 ? `${Math.round(n / 10_000).toLocaleString()}만` : '—'
