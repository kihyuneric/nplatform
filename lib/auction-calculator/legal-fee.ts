/**
 * 법무사 수수료 계산 (낙찰가 구간별 요율)
 * 법무사 보수 기준 규정 준용
 */

// ────────────────────────────────────────────────
// 법무사 수수료 구간
// ────────────────────────────────────────────────
interface LegalFeeRow {
  limit: number
  base: number      // 기본 고정액
  rate: number      // 초과분 요율
  over: number      // 기준 초과 시작점
}

const LEGAL_FEE_TABLE: LegalFeeRow[] = [
  { limit: 50_000_000,     base: 100_000, rate: 0.002,  over: 0 },
  { limit: 100_000_000,    base: 200_000, rate: 0.0015, over: 50_000_000 },
  { limit: 300_000_000,    base: 275_000, rate: 0.001,  over: 100_000_000 },
  { limit: 500_000_000,    base: 475_000, rate: 0.0008, over: 300_000_000 },
  { limit: 1_000_000_000,  base: 635_000, rate: 0.0006, over: 500_000_000 },
  { limit: 3_000_000_000,  base: 935_000, rate: 0.0004, over: 1_000_000_000 },
  { limit: Infinity,       base: 1_735_000,rate: 0.0003, over: 3_000_000_000 },
]

// ────────────────────────────────────────────────
// 공개 함수: 법무사 수수료 계산
// ────────────────────────────────────────────────
export function calcLegalFee(bidPrice: number): number {
  for (const row of LEGAL_FEE_TABLE) {
    if (bidPrice <= row.limit) {
      const fee = row.base + (bidPrice - row.over) * row.rate
      // 부가세 10% 포함, 실비(등록세 등) 별도 — 순수 보수만 계산
      return Math.round(fee * 1.1)
    }
  }
  return Math.round(LEGAL_FEE_TABLE[LEGAL_FEE_TABLE.length - 1].base * 1.1)
}
