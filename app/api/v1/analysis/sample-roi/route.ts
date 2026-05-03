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

interface RoiBundle {
  /** 보고서 RECENT PIPELINE / 카드에 표시할 prominent ROI (Monte Carlo 평균) */
  primary: number | null
  /** 비교용 — 모든 ROI 후보 */
  candidates: {
    /** monteCarlo.meanRoi — 시뮬레이션 평균 ROI (보고서 메인 표시값, % 단위) */
    monteCarloMean: number | null
    /** strategies.recommended.roi — 권고 시나리오 ROI (비율) */
    recommendedScenario: number | null
    /** strategies.conservative.roi — 보수적 시나리오 (비율) */
    conservativeScenario: number | null
    /** strategies.aggressive.roi — 강세 시나리오 (비율) */
    aggressiveScenario: number | null
    /** investment.roi — 입력 시나리오 ROI (비율) */
    investment: number | null
    /** investment.annualizedRoi — 연환산 (참고용, 사용 금지) */
    investmentAnnualized: number | null
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

  // 사용자 정책 (2026-05-03 v3): 보고서 메인 표시값 = monteCarlo.meanRoi
  // 우선순위: monteCarloMean > recommended > investment
  const primary =
    (typeof monteCarloMean === 'number' && Number.isFinite(monteCarloMean)) ? monteCarloMean
    : (typeof recommended === 'number' && Number.isFinite(recommended)) ? recommended
    : (typeof investment === 'number' && Number.isFinite(investment)) ? investment
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
  }
}

export async function GET() {
  try {
    const jongnoReport = buildJongnoSampleReport()
    const jamsilReport = buildSampleReport()

    const jongno = pickRoiBundle(jongnoReport)
    const jamsil = pickRoiBundle(jamsilReport)

    return NextResponse.json({
      // 분석 대시보드가 사용하는 prominent ROI (권고 시나리오)
      jongno: jongno.primary,
      jamsil: jamsil.primary,
      // 검증/디버깅용 — 모든 후보 노출
      details: {
        jongno: jongno.candidates,
        jamsil: jamsil.candidates,
      },
      computed_at: new Date().toISOString(),
      note: '분석 대시보드 ROI = profitability.monteCarlo.meanRoi (시뮬레이션 평균) — 보고서 메인 표시값',
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err) {
    return NextResponse.json({
      jongno: null,
      jamsil: null,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
