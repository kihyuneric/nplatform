/**
 * lib/npl/unified-report/sample-gangnam.ts
 *
 * 강남 상가 NPL 가상 사례 (XRF Vehicle 분석용)
 *   사용자 요청 (2026-05-05): "엑셀에 있는 강남 상가의 사례를
 *   /analysis 가상으로 만들어줘"
 *
 * XRF_Simulator_v7.xlsx 의 Case 3 입력 정합:
 *   · Purchase price (₩M)        : 3,500
 *   · Blended LTV (corporate)     : 0.90 (법인 90% pledge LTV)
 *   · Duration (days)             : 360 (12개월)
 *   · Expected Auction Bid (₩M)   : 4,620
 *   · Distribution Cap (₩M)       : 4,620
 *   · Recovery rate (calc)        : 42.0% = max(0, min(4620, 4620) - 3500*0.90) / 3500
 *   · NPL self-ROI (reference)    : 134.07% (= profit/equity 가정)
 *
 * 가상 시나리오 (NPL holder 관점):
 *   · 매입가 35억 (대출원금 35억 100% 매각)
 *   · 감정가 55억 (LTV 63.6%)
 *   · 차주 법인 (질권 LTV 90%)
 *   · 운용기간 12개월 → senior loan 6.5%/yr × 0.90 × 1.0 = 5.85% 이자 비용
 *   · NPL 회수: min(낙찰가, 청구상한) - 선순위 = 4,620 - 3,150 = 1,470M
 *   · NPL 매입가 35억 → NPL 회수 14.7억 = ROI 약 42%
 *
 * 본 파일은 /analysis 페이지의 가상 case study 로 노출.
 */

import type { UnifiedAnalysisReport } from './types'
import { buildReportFromInput } from './sample'

export const GANGNAM_RETAIL_LISTING_ID = 'lst-gangnam-retail'

/**
 * 강남 상가 NPL 분석 보고서 — XRF Simulator v7 Case 3 정합 가상 사례.
 *
 * 입력 (실 데이터 아님 · IR 시뮬레이션 용):
 *   · 강남구 신사동 상가 (가상)
 *   · 채권자 (가상)
 *   · 법인 차주 · 90% pledge LTV
 *   · 12개월 운용
 */
export function buildGangnamSampleReport(): UnifiedAnalysisReport {
  const principal = 3_500_000_000        // 35억 (= 매입가, 대출원금만 매각 가정)
  const overdueInterest = 0               // 가상 사례 — 연체이자 0 (단순화)
  const appraisal = 5_500_000_000         // 55억 감정가 (LTV 63.6%)
  const aiMarket = 5_300_000_000          // 53억 AI 시세 (감정가 96.4%)

  return buildReportFromInput({
    address: '서울특별시 강남구 신사동 (가상)',
    collateralType: '상가',
    bondNumber: 'GANGNAM-VC-2026-0501',
    caseNumber: '서울중앙지방법원 2026타경00000 (가상)',
    debtorType: 'CORPORATE',
    appraisedValue: appraisal,
    currentMarketValue: aiMarket,
    appraisalDate: '2026-05-01',
    marketPriceNote: '강남 신사동 상가 평균 m² 단가 기준 AI 추정 (가상)',
    principal,
    unpaidInterest: 0,
    overdueInterest,
    claimBreakdown: {
      principal,
      unpaidInterest: 0,
      overdueInterest: 0,
      delinquencyStartDate: '2025-12-01',
      normalRate: 0.0625,           // 정상금리 6.25%
      overdueRate: 0.150,            // 연체금리 15.0% (법인 더 높음)
    },
    auctionStartDate: '2026-09-01',
    desiredSaleDiscount: 0,         // 100% 매각 (할인 없음 · 매입가 = 대출원금)
    debtorOwnerSame: true,
  })
}
