/**
 * /api/v1/analysis/sample-roi
 *
 * GET — 분석 대시보드 RECENT PIPELINE 리스트의 사례 매물 ROI.
 *
 * 사용자 정책 (2026-05-03):
 *   - 분석 보고서와 동일한 ROI 표시
 *   - 연환산 (annualizedRoi) 사용 금지 — 보고서 표시값과 정합
 *   - 하드코딩 금지 — buildJongnoSampleReport / buildSampleReport 호출
 *
 * 보고서 페이지 (`/analysis/report?listingId=lst-jongno-hongji`) 가 표시하는 ROI:
 *   - ACQUISITION ECONOMICS 매각가 카드 옆 (라인 596): profitability.investment.roi
 *   - 권고 시나리오 ROI (라인 614): profitability.strategies.recommended.roi
 *   - Hero KEY TAKEAWAY (라인 4312): profitability.investment.roi
 *
 * 우선순위 (사용자 피드백 반영):
 *   1. strategies.recommended.roi  (사용자가 보는 핵심 의사결정 ROI — 권고 시나리오)
 *   2. investment.roi              (입력 시나리오 그대로 — fallback)
 *
 * 응답에 모든 후보 포함하여 사용자가 어떤 값 보는지 검증 가능.
 *
 * 5분 캐싱.
 */
import { NextResponse } from 'next/server'
import { buildJongnoSampleReport } from '@/lib/npl/unified-report/sample-jongno'
import { buildSampleReport } from '@/lib/npl/unified-report/sample'
import { buildGangnamSampleReport } from '@/lib/npl/unified-report/sample-gangnam'
import { computeEffectiveFirstSaleDate } from '@/lib/npl/unified-report/auction-round'

interface RoiBundle {
  /** 보고서 RECENT PIPELINE / 카드에 표시할 prominent ROI */
  primary: number | null
  /** 비교용 — 모든 ROI 후보 */
  candidates: {
    monteCarloMean: number | null
    recommendedScenario: number | null
    conservativeScenario: number | null
    aggressiveScenario: number | null
    investment: number | null
    investmentAnnualized: number | null
  }
  /** 디버깅용 — 보고서 페이지의 운용일수와 비교 */
  debug: {
    holdingPeriodDays: number | null
    totalEquity: number | null
    expectedNetProfit: number | null
  }
}

function pickRoiBundle(report: ReturnType<typeof buildJongnoSampleReport>): RoiBundle {
  const profitability = report.profitability ?? null
  if (!profitability) {
    return {
      primary: null,
      candidates: {
        monteCarloMean: null,
        recommendedScenario: null,
        conservativeScenario: null,
        aggressiveScenario: null,
        investment: null,
        investmentAnnualized: null,
      },
      debug: {
        holdingPeriodDays: null,
        totalEquity: null,
        expectedNetProfit: null,
      },
    }
  }

  // monteCarlo.meanRoi 는 이미 % 단위 (예: 61.1) — 비율로 정규화 (0.611)
  const mcMeanPct = profitability.monteCarlo?.meanRoi
  const monteCarloMean = (typeof mcMeanPct === 'number' && Number.isFinite(mcMeanPct))
    ? mcMeanPct / 100
    : null

  const recommended = profitability.strategies?.recommended?.roi ?? null
  const conservative = profitability.strategies?.conservative?.roi ?? null
  const aggressive = profitability.strategies?.aggressive?.roi ?? null
  const investment = profitability.investment?.roi ?? null
  const annualized = profitability.investment?.annualizedRoi ?? null

  // 사용자 정책 (2026-05-03 v4): 보고서 화면 ROI 카드 라벨 = "투자 수익률 (ROI)" = investment.roi
  // 우선순위: investment > recommended > monteCarloMean
  const primary =
    (typeof investment === 'number' && Number.isFinite(investment)) ? investment
    : (typeof recommended === 'number' && Number.isFinite(recommended)) ? recommended
    : (typeof monteCarloMean === 'number' && Number.isFinite(monteCarloMean)) ? monteCarloMean
    : null

  return {
    primary,
    candidates: {
      monteCarloMean,
      recommendedScenario: recommended,
      conservativeScenario: conservative,
      aggressiveScenario: aggressive,
      investment,
      investmentAnnualized: annualized,
    },
    debug: {
      holdingPeriodDays: profitability.investment?.holdingPeriodDays ?? null,
      totalEquity: profitability.investment?.totalEquity ?? null,
      expectedNetProfit: profitability.investment?.expectedNetProfit ?? null,
    },
  }
}

export async function GET() {
  try {
    // 1차: builder 기본값으로 빌드 → firstSaleDate (1차 매각기일) + expectedBidRatio 추출
    const jongnoBase = buildJongnoSampleReport()
    const jamsilBase = buildSampleReport()

    // 2차: 보고서 페이지 ProfitabilitySections 가 적용하는 effectivePredictedSaleDate
    //      (= 1차 매각기일 + (predictedRound − 1) × 28일) 시프트를 동일하게 적용하여 재빌드
    //      → API ↔ 보고서 페이지 LIVE recompute ROI 정합 (사용자 정책 2026-05-03)
    const jongnoFirstSale = jongnoBase.profitability?.schedule.milestones.find(m => m.key === 'firstSaleDate')?.date
    const jamsilFirstSale = jamsilBase.profitability?.schedule.milestones.find(m => m.key === 'firstSaleDate')?.date

    // v3 사용자 정책 (2026-05-06): 회차당 유찰 할인율(default 20%p)도 통계 매핑.
    //   valuation.auctionFailureDiscountPct 가 주입되어 있으면 그 값으로 회차 산출.
    const jongnoShifted = (jongnoFirstSale && jongnoBase.profitability)
      ? computeEffectiveFirstSaleDate(
          jongnoFirstSale,
          jongnoBase.profitability.valuation.expectedBidRatio,
          jongnoBase.profitability.valuation.auctionFailureDiscountPct,
        )
      : undefined
    const jamsilShifted = (jamsilFirstSale && jamsilBase.profitability)
      ? computeEffectiveFirstSaleDate(
          jamsilFirstSale,
          jamsilBase.profitability.valuation.expectedBidRatio,
          jamsilBase.profitability.valuation.auctionFailureDiscountPct,
        )
      : undefined

    const jongnoReport = jongnoShifted ? buildJongnoSampleReport({ firstSaleDateOverride: jongnoShifted }) : jongnoBase
    const jamsilReport = jamsilShifted ? buildSampleReport({ firstSaleDateOverride: jamsilShifted }) : jamsilBase
    const gangnamReport = buildGangnamSampleReport()

    const jongno = pickRoiBundle(jongnoReport)
    const jamsil = pickRoiBundle(jamsilReport)
    const gangnam = pickRoiBundle(gangnamReport)

    return NextResponse.json({
      // 분석 대시보드가 사용하는 prominent ROI (권고 시나리오)
      jongno: jongno.primary,
      jamsil: jamsil.primary,
      gangnam: gangnam.primary,                  // ★ 강남 가상 사례 (XRF Case · BUY tier)
      // 검증/디버깅용 — 모든 후보 노출
      details: {
        jongno: jongno.candidates,
        jamsil: jamsil.candidates,
        gangnam: gangnam.candidates,
      },
      debug: {
        jongno: jongno.debug,
        jamsil: jamsil.debug,
        gangnam: gangnam.debug,
      },
      computed_at: new Date().toISOString(),
      note: '분석 대시보드 ROI = profitability.investment.roi (보고서 화면 "투자 수익률 (ROI)" 카드 = expectedNetProfit / totalEquity)',
    }, {
      headers: {
        // 디버깅 단계 — 캐시 비활성화. 안정화 후 max-age 복원.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err) {
    return NextResponse.json({
      jongno: null,
      jamsil: null,
      gangnam: null,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
