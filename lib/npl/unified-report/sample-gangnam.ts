/**
 * lib/npl/unified-report/sample-gangnam.ts
 *
 * 강남구 신사동 상가 NPL 가상 사례 (XRF Vehicle 분석용 IR 시뮬레이션)
 *
 * 사용자 요청 (2026-05-05):
 *   "엑셀에 있는 강남 상가의 사례를 가상으로 작성해줘 ·
 *    XRF Valuation 및 NPL Valuation 내용 풍부 ·
 *    투자 전제 BASE 딜로 상세 · ROI 와 XRF/KOF/NPL VC 수수료 모두 엑셀에 맞게"
 *
 * XRF_Simulator_v7.xlsx Case 3 — BASE 시나리오 정확 재현:
 *
 * ─── 입력 (엑셀 정합) ──────────────────────────────────
 *   · Purchase price (₩M)         : 3,500   (= 매입가, 대출원금 100% 매각)
 *   · Blended LTV (corporate)      : 0.90    (법인 차주 · pledge LTV)
 *   · Duration (days)              : 360     (12개월)
 *   · Expected Auction Bid (₩M)    : 4,620   (감정가 55억 × 84% 낙찰가율)
 *   · Distribution Cap (₩M)        : 4,620   (= 청구상한)
 *   · Recovery rate (calc)         : 42.0%   = (4620 − 3500×0.90) / 3500 = 1470/3500
 *   · NPL Self-ROI (reference)     : 134.07%
 *
 * ─── BASE 결과 (XRF Vehicle 적용 후) ─────────────────────
 *   · LP Capital Call (1인당)      : USD 5,694  (100명 × $5,694 = $569,400)
 *   · LP Net Profit (1인당)        : USD 3,957  (= LP ROI 69.49%)
 *   · LP ROI (절대)                : 69.49%
 *   · LP IRR (annualized · 복리)   : 70.50%/yr
 *
 * ─── 이해관계자 수수료 (엑셀 정합 · USD) ────────────────
 *   · XRF Foundation (Mgmt + Setup + Carry) : $138,533
 *       - XRF Mgmt (0.5%/yr × 360일 cap)    : $13,266
 *       - XRF Setup (0.5% × purchase, 1회)  : $13,461
 *       - XRF Carry (5-tier marginal)        : $111,806
 *           [8%-20%]   slice $675 × 15%  = $101
 *           [20%-40%]  slice $1,123 × 20% = $225
 *           [40%-60%]  slice $1,124 × 25% = $281
 *           [60%+]     slice $1,704 × 30% = $511
 *           × 100 LPs                     = $111,806
 *   · KOF (Korea Operation Firm)           : $67,308
 *       - AI Valuation (0.7%)             : $18,846
 *       - Pipeline Sourcing (1.0%)        : $26,923
 *       - PM Fee (0.4%)                   : $10,769
 *       - KR Margin (0.4% TP defense)     : $10,769
 *   · NPL Vehicle Company (NPL VC)         : $53,846
 *       - Servicing Fee (2.0% × purchase) : $53,846
 *       - Capital Loan (10% Pool · 무이자) : $73,000 (Day Exit 100% 환급)
 *
 * ─── 투자 전제 ─────────────────────────────────────────
 *   1) 가상 매물 — 강남구 신사동 핵심 상권 1층 상가 (가상)
 *   2) 차주 (가상): 법인 — 강남 신사동 상가 운영사
 *   3) 채권자 (가상): ◆◆◆◆◆ Capital (외국계 PE)
 *   4) 매입가 35억 = 대출원금 100% 매각 (할인 0%)
 *   5) 감정가 55억 (LTV 63.6% · 권리 깨끗)
 *   6) 12개월 운용 · pledge LTV 90% (법인 우대)
 *   7) 1순위 우리은행 채권최고액 33.6억 변제 후 NPL 회수
 *   8) AUTO 판정: BASE tier (LP ROI ≥ 20% · 양보 불필요)
 */

import type { UnifiedAnalysisReport } from './types'
import { buildReportFromInput } from './sample'

export const GANGNAM_RETAIL_LISTING_ID = 'lst-gangnam-retail'

const 억 = 100_000_000

/**
 * 강남 상가 NPL 분석 보고서 — 가상 사례 (Case 3 · XRF Simulator v7 BASE 정합).
 */
export function buildGangnamSampleReport(): UnifiedAnalysisReport {
  // ─── 가상 채권 정보 (엑셀 v7 Case 3 입력 정합) ──────────
  const principal = 35 * 억              // 35억 = 매입가 = 대출원금 (할인 0%)
  const overdueInterest = 1.4 * 억      // 가상 연체이자 1.4억 (15%/yr × 12개월 가정)
  const appraisal = 55 * 억              // 감정가 55억 (LTV 63.6%)
  const aiMarket = 53 * 억               // AI 시세 53억

  // buildReportFromInput — 기본 분석 (recovery / risk / registry / profitability) 자동 산출
  const report = buildReportFromInput({
    address: '서울특별시 강남구 신사동 (가상 사례)',
    collateralType: '상가',
    bondNumber: 'GANGNAM-VC-2026-0501',
    caseNumber: '서울중앙지방법원 2026타경00000 (가상)',
    debtorType: 'CORPORATE',
    appraisedValue: appraisal,
    currentMarketValue: aiMarket,
    appraisalDate: '2026-05-01',
    marketPriceNote: '강남 신사동 핵심 상권 1층 상가 평균 m² 단가 4,200만원 기준 AI 추정 (가상)',
    principal,
    unpaidInterest: 0,
    overdueInterest,
    claimBreakdown: {
      principal,
      unpaidInterest: 0,
      overdueInterest,
      delinquencyStartDate: '2025-12-01',
      normalRate: 0.0625,           // 정상금리 6.25%
      overdueRate: 0.150,            // 연체금리 15.0% (법인 더 높음)
    },
    rightsSummary: {
      seniorTotal: 33.6 * 억,        // 1순위 우리은행 33.6억 (채권최고액 = 28억 × 1.2)
      juniorTotal: 0,                 // 후순위 없음 (clean deal)
    },
    auctionStartDate: '2026-09-01',
    desiredSaleDiscount: 0,         // 100% 매각
    debtorOwnerSame: true,           // 채무자 = 소유자 (법인 직접 보유)
  })

  // ─── BASE 시나리오 상세 executiveSummary (엑셀 v7 Case 3 정합) ────
  // 사용자 요청 (2026-05-05): 투자 전제 BASE 딜로 상세 + 모든 이해관계자 수수료 엑셀 정합
  const executiveSummary = [
    `[가상 사례 · IR 시뮬레이션 — XRF Simulator v7 Case 3] 강남구 신사동 상가 NPL · BASE Deal 분석`,
    ``,
    `▸ 투자 전제 (Base Deal Premise)`,
    `  · 매물       : 강남구 신사동 핵심 상권 1층 상가 1동 (가상)`,
    `  · 차주       : 법인 (가상) · pledge LTV 90% (법인 차주 우대 적용)`,
    `  · 채권자     : ◆◆◆◆◆ Capital (외국계 PE · 가상)`,
    `  · 채권 내역  : 대출원금 35억 + 연체이자 1.4억 = 채권잔액 36.4억`,
    `  · 매입가     : 35억 (대출원금 100% 매각, 할인 0%)`,
    `  · 감정가     : 55억 (LTV 63.6% · 권리 깨끗)`,
    `  · 1순위      : 우리은행 채권최고액 33.6억 (= 28억 × 1.2)`,
    `  · 운용기간   : 360일 (12개월) · 매각시작 2026-09-01`,
    ``,
    `▸ NPL Valuation (자체 수익성)`,
    `  · 회수율     : 42.0% = (예상낙찰가 46.2억 − 1순위 33.6억) / 매입가 35억 → NPL 회수 12.6억`,
    `  · NPL 자체 ROI: 134.07% (XRF Simulator v7 reference)`,
    `  · NPL IRR    : 135.93%/yr`,
    `  · AI 등급    : ${report.summary.riskGrade}등급 · 회수율 ${report.recovery.predictedRecoveryRate.toFixed(1)}%`,
    `  · 권리관계   : 깨끗 (2순위 권리자 부재 · 임차인 없음 · 특수조건 없음)`,
    ``,
    `▸ XRF Vehicle Valuation — BASE Tier (AUTO 판정)`,
    `  · LP Capital Call (1인당) : USD 5,694 × 100 LPs = 총 USD 569,400`,
    `  · LP Net Profit (1인당)   : USD 3,957 × 100 LPs = 총 USD 395,700`,
    `  · LP ROI (절대)            : 69.49%`,
    `  · LP IRR (annualized 복리) : 70.50%/yr`,
    `  · Hurdle 8%/yr 충당 후 잉여분 5-tier marginal Carry 발동`,
    ``,
    `▸ 이해관계자 수수료 분배 (엑셀 v7 BASE 정합)`,
    `  · XRF Foundation (Mgmt + Setup + Carry) : USD 138,533`,
    `      ‒ Mgmt 0.5%/yr × 360일 cap     : USD 13,266`,
    `      ‒ Setup 0.5% × purchase (1회)  : USD 13,461`,
    `      ‒ Carry 5-tier marginal × 100 LPs : USD 111,806`,
    `        [8-20%] 15% / [20-40%] 20% / [40-60%] 25% / [60%+] 30%`,
    `  · Korea Operation Firm (KOF · 舊 엔플랫폼) : USD 67,308`,
    `      ‒ AI Valuation (0.7%)          : USD 18,846`,
    `      ‒ Pipeline Sourcing (1.0%)     : USD 26,923`,
    `      ‒ PM Fee (0.4%)                : USD 10,769`,
    `      ‒ KR Margin (0.4% TP defense)  : USD 10,769`,
    `  · NPL Vehicle Company (NPL VC · 舊 대부업체) : USD 53,846`,
    `      ‒ Servicing Fee 2.0% × purchase (FLAT) : USD 53,846`,
    `      ‒ Capital Loan 10% Pool (무이자 대여)   : USD 73,000 (Day Exit 100% LP 환급)`,
    ``,
    `▸ 투자 의견`,
    `  AUTO 판정 BASE tier — LP ROI 69.49% ≥ 20% · 양보 불필요 · RWA 즉시 출시 가능.`,
    `  법인 차주 90% pledge LTV 활용 + 12개월 짧은 cycle + 강남 핵심 상권 견고 ` +
      `→ XRF 시그너처 deal 패턴. AI 투자 의견: BUY.`,
  ].join('\n')

  return {
    ...report,
    id: 'sample-gangnam-' + Date.now().toString(36),
    source: 'SAMPLE',
    input: {
      ...report.input,
      assetTitle: '강남구 신사동 상가 NPL · 가상 사례 (XRF Case 3 · BASE)',
      region: '서울특별시 강남구',
      acquisitionBaseLabel: '대출원금',
      acquisitionBaseAmount: principal,
    },
    executiveSummary,
  }
}
