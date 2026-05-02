/**
 * lib/ai/training/recovery-backtest.ts
 *
 * 회수율 모델 백테스팅 인프라 (P0-1 · 2026-05-02)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-1 항목 처리.
 * 기존 `recovery-predictor.ts` 의 `model.accuracy: { mape: 11.3, rmse: 0.072, r2: 0.847 }`
 * 임의값을 실측 백테스트 결과로 교체하기 위한 데이터 파이프라인.
 *
 * 정책:
 *   - npl_cases 에 `actual_recovery_rate` 가 채워진 row 만 sample
 *   - 최소 30건 미만이면 `INSUFFICIENT_DATA` 명시 (가짜 메트릭 노출 금지)
 *   - MAPE / RMSE / R² 계산 (sklearn 동일 정의)
 *   - 결과는 단순 PoJo — 별도 테이블 또는 API 응답으로 활용
 *
 * 한계 (별도 트랙):
 *   - 현재 ENSEMBLE 은 정적 의사결정트리 — 실측으로 leaf 재학습 불가
 *   - 진정한 ML 학습은 Python 마이크로서비스 (XGBoost/LightGBM) 필요
 *   - 이 모듈은 "현재 모델이 실 데이터에 얼마나 정확한가" 만 측정
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { predictRecovery, type PredictionInput } from '../recovery-predictor'

const MIN_BACKTEST_SAMPLES = 30

export interface BacktestSample {
  caseId: string
  predicted: number  // 0~1
  actual: number     // 0~1
  closedAt: string
  propertyType?: string | null
  region?: string | null
}

export interface BacktestMetrics {
  /** 분석에 사용된 sample 수 */
  sampleCount: number
  /** Mean Absolute Percentage Error (% — 낮을수록 정확) */
  mape: number | null
  /** Root Mean Squared Error (0~1 절대값 — 낮을수록 정확) */
  rmse: number | null
  /** R² (Coefficient of Determination — 1.0 에 가까울수록 정확, 음수 가능) */
  r2: number | null
  /** 평균 절대 오차 */
  mae: number | null
  /** 백테스트 기준 시점 */
  computedAt: string
  /** 데이터 부족 시 그 이유 명시 */
  status: 'OK' | 'INSUFFICIENT_DATA' | 'ERROR'
  reason?: string
  /** 가장 최근 N개 샘플 (감사·리포트용) */
  recentSamples?: BacktestSample[]
}

// ─── 실 npl_cases row → PredictionInput 변환 ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPredictionInput(row: any): PredictionInput | null {
  if (!row || !row.id) return null
  const principal = Number(row.total_claim_amount ?? 0)
  const appraisalValue = Number(row.appraisal_value ?? 0)
  if (principal <= 0 || appraisalValue <= 0) return null

  return {
    principal,
    appraisalValue,
    region: String(row.address ?? '서울'),
    propertyType: String(row.property_type ?? '아파트'),
    buildYear: Number(row.build_year ?? new Date().getFullYear() - 10),
    buildingArea: Number(row.building_area ?? 0),
    landArea: Number(row.land_area ?? 0),
    auctionCount: Number(row.auction_count ?? 0),
    listingType: (row.listing_type === 'DEAL' ? 'DEAL' : 'COURT') as 'COURT' | 'DEAL',
    mortgageCount: Number(row.mortgage_count ?? 1),
    totalMortgageAmount: Number(row.total_mortgage_amount ?? principal),
    seizureCount: Number(row.seizure_count ?? 0),
    hasOpposingTenants: Boolean(row.has_opposing_tenants ?? false),
    tenantDepositTotal: Number(row.tenant_deposit_total ?? 0),
    nbiIndex: Number(row.nbi_index ?? 100),
  } as PredictionInput
}

// ─── 백테스트 실행 ─────────────────────────────────────────────
/**
 * `npl_cases` 의 실측 데이터로 현재 모델 정확도를 측정.
 *
 * 인자로 supabase client 를 받아서 server / edge / cron 어디서든 호출 가능.
 */
export async function runRecoveryBacktest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  options: {
    /** 최근 N건만 백테스트 (기본 200, max 500) */
    limit?: number
    /** 특정 시점 이후만 (created_at) */
    since?: string
  } = {},
): Promise<BacktestMetrics> {
  const computedAt = new Date().toISOString()
  const limit = Math.min(500, Math.max(MIN_BACKTEST_SAMPLES, options.limit ?? 200))

  try {
    let query = supabase
      .from('npl_cases')
      .select('*')
      .not('actual_recovery_rate', 'is', null)
      .order('case_closed_at', { ascending: false })
      .limit(limit)

    if (options.since) query = query.gte('case_closed_at', options.since)

    const { data: rows, error } = await query

    if (error) {
      return {
        sampleCount: 0,
        mape: null, rmse: null, r2: null, mae: null,
        computedAt,
        status: 'ERROR',
        reason: error.message,
      }
    }

    const validRows = (rows ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => typeof r.actual_recovery_rate === 'number' && r.actual_recovery_rate >= 0 && r.actual_recovery_rate <= 1,
    )

    if (validRows.length < MIN_BACKTEST_SAMPLES) {
      return {
        sampleCount: validRows.length,
        mape: null, rmse: null, r2: null, mae: null,
        computedAt,
        status: 'INSUFFICIENT_DATA',
        reason: `actual_recovery_rate 채워진 case ${validRows.length}건 — ${MIN_BACKTEST_SAMPLES}건 이상 필요`,
      }
    }

    const samples: BacktestSample[] = []
    for (const row of validRows) {
      const input = rowToPredictionInput(row)
      if (!input) continue
      try {
        const prediction = predictRecovery(input)
        samples.push({
          caseId: String(row.id),
          predicted: prediction.recoveryRate,
          actual: Number(row.actual_recovery_rate),
          closedAt: String(row.case_closed_at ?? ''),
          propertyType: row.property_type ?? null,
          region: row.address ?? null,
        })
      } catch {
        // 개별 sample 실패는 건너뜀
      }
    }

    if (samples.length < MIN_BACKTEST_SAMPLES) {
      return {
        sampleCount: samples.length,
        mape: null, rmse: null, r2: null, mae: null,
        computedAt,
        status: 'INSUFFICIENT_DATA',
        reason: `유효 prediction sample ${samples.length}건 (입력 누락 등으로 제외) — ${MIN_BACKTEST_SAMPLES}건 이상 필요`,
      }
    }

    // ── 메트릭 계산 ────────────────────────────────────────
    const n = samples.length
    let sumAbsErr = 0
    let sumPctErr = 0
    let sumSqErr = 0
    let sumActual = 0
    samples.forEach((s) => {
      const err = s.predicted - s.actual
      sumAbsErr += Math.abs(err)
      sumSqErr += err * err
      // MAPE 는 actual=0 인 경우 정의되지 않음 — 0.001 floor 로 무한대 방지
      const denom = Math.max(0.001, Math.abs(s.actual))
      sumPctErr += Math.abs(err) / denom
      sumActual += s.actual
    })
    const meanActual = sumActual / n

    let sumSqTot = 0
    samples.forEach((s) => {
      sumSqTot += (s.actual - meanActual) ** 2
    })

    const mae = sumAbsErr / n
    const mape = (sumPctErr / n) * 100  // %
    const rmse = Math.sqrt(sumSqErr / n)
    const r2 = sumSqTot > 0 ? 1 - sumSqErr / sumSqTot : 0

    return {
      sampleCount: n,
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 10000) / 10000,
      r2: Math.round(r2 * 10000) / 10000,
      mae: Math.round(mae * 10000) / 10000,
      computedAt,
      status: 'OK',
      recentSamples: samples.slice(0, 10), // 가장 최근 10건만 응답에 포함
    }
  } catch (err) {
    return {
      sampleCount: 0,
      mape: null, rmse: null, r2: null, mae: null,
      computedAt,
      status: 'ERROR',
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── 모델 메타 산출 ───────────────────────────────────────────
export interface ModelMetadata {
  /** 모델 버전 (수동 관리) */
  version: string
  /** 학습 sample 수 — npl_cases 의 실측 row count */
  trainingSamples: number
  /** 백테스트 정확도 — 실측 데이터 충분 시만 산출, 아니면 null */
  accuracy: {
    mape: number | null
    rmse: number | null
    r2: number | null
  }
  /** 마지막 백테스트 실행 시점 */
  lastBacktestAt: string
  /** 백테스트 상태 */
  backtestStatus: 'OK' | 'INSUFFICIENT_DATA' | 'ERROR'
  /** 데이터 부족 또는 에러 사유 */
  backtestNote?: string
}

/**
 * 현재 모델의 메타데이터를 동적 산출.
 * - trainingSamples: npl_cases 의 actual_recovery_rate 채워진 row count
 * - accuracy: 백테스트 결과 (sample 부족 시 null)
 *
 * KB 본계약 보고서 / IR 자료 정합성 핵심.
 */
export async function getDynamicModelMetadata(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<ModelMetadata> {
  const result = await runRecoveryBacktest(supabase, { limit: 200 })

  return {
    version: '3.0.0-gb6-static',
    trainingSamples: result.sampleCount,
    accuracy: {
      mape: result.mape,
      rmse: result.rmse,
      r2: result.r2,
    },
    lastBacktestAt: result.computedAt,
    backtestStatus: result.status,
    backtestNote: result.reason,
  }
}
