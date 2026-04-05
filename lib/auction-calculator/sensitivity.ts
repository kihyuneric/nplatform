/**
 * 낙찰가별 수익률 민감도 테이블 (30행)
 */

import type { AuctionInput, SensitivityRow } from './types'
import { calcAuction } from './index'

// 감정가의 50% ~ 100% 구간을 30개 구간으로 나눠 테이블 생성
export function buildSensitivityTable(baseInput: AuctionInput): SensitivityRow[] {
  const { appraisalPrice, bidPrice } = baseInput

  const minBid = Math.round(appraisalPrice * 0.40)  // 최저: 감정가 40%
  const maxBid = Math.round(appraisalPrice * 1.10)  // 최대: 감정가 110%
  const step   = Math.round((maxBid - minBid) / 29) // 30개 구간

  const rows: SensitivityRow[] = []

  for (let i = 0; i < 30; i++) {
    const testBid = minBid + step * i
    const result = calcAuction({ ...baseInput, bidPrice: testBid })

    rows.push({
      bidPrice: testBid,
      bidRatio: Math.round((testBid / appraisalPrice) * 1000) / 10,  // 소수점 1자리
      netProfit: result.metrics.netProfit,
      roi: Math.round(result.metrics.roi * 10) / 10,                 // 소수점 1자리
      isCurrent: Math.abs(testBid - bidPrice) < step / 2,
    })
  }

  return rows
}
