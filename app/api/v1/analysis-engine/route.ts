/**
 * POST /api/v1/analysis-engine
 *
 * 자동 분석 엔진 API.
 * 부동산/NPL 데이터를 입력하면 실행 가능한 모든 모델을 자동 실행합니다.
 *
 * GET  /api/v1/analysis-engine          → 모델 목록 및 필요 데이터 스키마 반환
 * POST /api/v1/analysis-engine          → 입력 데이터로 자동 분석 실행
 * GET  /api/v1/analysis-engine?model=X  → 특정 모델의 필요 데이터 필드 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runAnalysis } from '@/lib/analysis-engine'
import { ANALYSIS_MODELS, getMissingFields, dataCompletenessScore } from '@/lib/analysis-models-schema'
import { Errors, fromZodError, fromUnknown } from '@/lib/api-error'
import { publicCacheHeaders } from '@/lib/cache-headers'
import { withCache, CacheKeys, hashString, TTL } from '@/lib/redis-cache'

// ─── Input Validation ─────────────────────────────────
const AnalysisInputSchema = z.object({
  // 기본 물건 정보
  collateral_type: z.string().optional(),
  region: z.string().optional(),
  appraised_value: z.number().positive().optional(),
  area_sqm: z.number().positive().optional(),
  floor: z.number().optional(),
  year_built: z.number().min(1900).max(2030).optional(),

  // 채권 정보
  ltv_ratio: z.number().min(0).max(200).optional(),
  delinquency_months: z.number().min(0).optional(),
  principal_amount: z.number().positive().optional(),
  senior_claims: z.number().min(0).optional(),
  senior_mortgage: z.number().min(0).optional(),

  // 임차인
  tenant_exists: z.boolean().optional(),
  tenant_type: z.enum(['없음', '전세', '월세', '무상임차']).optional(),
  tenant_deposit: z.number().min(0).optional(),
  tenant_priority: z.boolean().optional(),

  // 법률
  seizure_count: z.number().min(0).optional(),
  seizure_amount: z.number().min(0).optional(),
  unpaid_taxes: z.number().min(0).optional(),

  // 수익률 계산
  min_bid: z.number().positive().optional(),
  expected_sale_price: z.number().positive().optional(),
  loan_ratio: z.number().min(0).max(100).optional(),
  loan_rate: z.number().min(0).max(50).optional(),
  holding_months: z.number().min(1).max(240).optional(),
  mode: z.enum(['개인', '매매사업자']).optional(),
  eviction_cost: z.number().min(0).optional(),

  // 메타
  listing_id: z.string().optional(),
}).passthrough()

// ─── GET: 모델 스키마 반환 ─────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const modelId = searchParams.get('model')

  // 특정 모델의 필드 스키마
  if (modelId) {
    const model = ANALYSIS_MODELS.find((m) => m.id === modelId)
    if (!model) return Errors.notFound(`모델 '${modelId}'을(를) 찾을 수 없습니다.`)
    return NextResponse.json({ model }, { headers: publicCacheHeaders(3600) })
  }

  // 전체 모델 목록
  const models = ANALYSIS_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    description: m.description,
    category: m.category,
    icon: m.icon,
    color: m.color,
    accuracy: m.accuracy,
    version: m.version,
    requiredFields: m.fields.filter((f) => f.required).map((f) => ({ key: f.key, label: f.label, type: f.type, unit: f.unit })),
    optionalFields: m.fields.filter((f) => !f.required).map((f) => ({ key: f.key, label: f.label, type: f.type, unit: f.unit })),
    outputFields: m.outputFields,
    minRequiredFields: m.minRequiredFields,
  }))

  return NextResponse.json(
    { models, totalModels: models.length, version: '1.0' },
    { headers: publicCacheHeaders(3600) }
  )
}

// ─── POST: 자동 분석 실행 ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Zod 검증
    const parsed = AnalysisInputSchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)

    const input = parsed.data

    // 최소 1개 필드라도 있어야 실행
    const hasAnyField = Object.values(input).some((v) => v !== undefined && v !== null)
    if (!hasAnyField) {
      return Errors.badRequest('분석할 데이터를 최소 1개 이상 입력해주세요.')
    }

    // 자동 분석 실행 (Redis 캐시: 동일 입력 10분 캐싱)
    const cacheKey = CacheKeys.analysis(hashString(JSON.stringify(input)))
    const report = await withCache(cacheKey, TTL.ANALYSIS, () => runAnalysis(input))

    // 실행된 모델이 없으면 어떤 필드가 부족한지 안내
    if (report.executedModels.length === 0) {
      const guidance = ANALYSIS_MODELS.map((m) => ({
        model: m.name,
        missingFields: getMissingFields(m.id, input as Record<string, unknown>).map((f) => ({
          key: f.key,
          label: f.label,
          description: f.description,
          example: f.example,
        })),
      }))
      return NextResponse.json(
        {
          message: '분석 실행을 위한 최소 데이터가 부족합니다.',
          completeness: report.completeness,
          guidance,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      ...report,
      _executionMs: Date.now() - Date.parse(report.generatedAt),
    })
  } catch (e) {
    return fromUnknown(e)
  }
}
