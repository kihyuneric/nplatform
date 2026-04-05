/**
 * lib/ml/registry/model-registry.ts
 *
 * 모델 버전 레지스트리
 * - 각 모델의 버전, 정확도, 학습 메타데이터 관리
 * - A/B 테스트를 위한 모델 라우팅
 * - 성능 추적 및 자동 롤백 기준
 *
 * 추후 MLflow 또는 Vertex AI Model Registry로 마이그레이션 예정
 */

export type ModelType = 'price' | 'risk' | 'matching' | 'bid_rate'
export type ModelStatus = 'active' | 'shadow' | 'deprecated' | 'training'

export interface ModelMetrics {
  mape?: number              // 평균 절대 퍼센트 오차 (가격 예측)
  accuracy?: number          // 분류 정확도 (리스크)
  f1_score?: number          // F1 (리스크)
  auc_roc?: number           // AUC-ROC (리스크)
  r2?: number                // R² (가격)
  sample_count: number       // 검증 샘플 수
  validated_at: string
}

export interface ModelVersion {
  version: string            // semver: 1.0.0
  type: ModelType
  name: string
  status: ModelStatus
  algorithm: string          // 'SimpleNN' | 'XGBoost' | 'LightGBM' | 'Ensemble'
  features: string[]         // 입력 특성 목록
  metrics: ModelMetrics | null
  created_at: string
  promoted_at?: string       // active 승격 시각
  traffic_pct: number        // 트래픽 비율 (A/B 테스트용) 0~100
  notes?: string
}

// ─── 모델 카탈로그 ────────────────────────────────────────

const MODEL_CATALOG: ModelVersion[] = [
  // ── 가격 예측 모델 ──────────────────────────────────────
  {
    version: '1.0.0',
    type: 'price',
    name: 'NPL Price Predictor v1',
    status: 'active',
    algorithm: 'SimpleNN',
    features: ['collateral_type', 'region', 'principal_amount', 'appraised_value', 'ltv', 'delinquency_months', 'debtor_count', 'area_sqm'],
    metrics: {
      mape: 18.5,        // 하드코딩 가중치 → 낮은 정확도
      r2: 0.61,
      sample_count: 50,  // 샘플 데이터로만 검증
      validated_at: '2026-01-15',
    },
    created_at: '2026-01-01',
    promoted_at: '2026-01-15',
    traffic_pct: 100,
    notes: '초기 버전. 하드코딩 가중치. 실 데이터 학습 버전(v2)으로 교체 예정.',
  },
  {
    version: '2.0.0',
    type: 'price',
    name: 'NPL Price Predictor v2 (XGBoost)',
    status: 'shadow',   // 실 데이터 수집 후 활성화 예정
    algorithm: 'XGBoost',
    features: [
      'collateral_type', 'region', 'district', 'appraised_value', 'ltv',
      'delinquency_months', 'area_sqm', 'floor', 'year_built',
      'senior_claims_ratio', 'tenant_exists', 'seizure_count',
      'avg_bid_ratio_region',    // NBI에서 주입
      'avg_rent_per_sqm',        // 시장 참조 데이터에서 주입
    ],
    metrics: null,
    created_at: '2026-04-02',
    traffic_pct: 0,
    notes: '실 학습 데이터 1,000건 이상 수집 시 활성화. 목표 MAPE ≤ 10%.',
  },

  // ── 리스크 분류 모델 ────────────────────────────────────
  {
    version: '1.0.0',
    type: 'risk',
    name: 'NPL Risk Classifier v1',
    status: 'active',
    algorithm: 'SimpleNN',
    features: ['ltv', 'delinquency_months', 'senior_claims', 'tenant_exists', 'seizure_count', 'collateral_type', 'region'],
    metrics: {
      accuracy: 0.72,
      f1_score: 0.68,
      auc_roc: 0.79,
      sample_count: 50,
      validated_at: '2026-01-15',
    },
    created_at: '2026-01-01',
    promoted_at: '2026-01-15',
    traffic_pct: 100,
    notes: '초기 버전. 목표: Accuracy ≥ 0.88 (v2에서 달성 예정).',
  },
  {
    version: '2.0.0',
    type: 'risk',
    name: 'NPL Risk Classifier v2 (LightGBM)',
    status: 'shadow',
    algorithm: 'LightGBM',
    features: [
      'ltv', 'delinquency_months', 'senior_claims_ratio', 'tenant_exists',
      'tenant_priority', 'seizure_count', 'unpaid_taxes', 'collateral_type',
      'region', 'area_sqm', 'year_built', 'legal_issues_count',
    ],
    metrics: null,
    created_at: '2026-04-02',
    traffic_pct: 0,
    notes: '목표: Accuracy ≥ 0.88, AUC-ROC ≥ 0.93.',
  },

  // ── 낙찰가율 예측 모델 ──────────────────────────────────
  {
    version: '1.0.0',
    type: 'bid_rate',
    name: 'Bid Rate Predictor v1',
    status: 'shadow',
    algorithm: 'Ensemble',  // XGBoost + 규칙 기반
    features: ['collateral_type', 'region', 'district', 'appraised_value', 'attempt_count', 'nbi_index'],
    metrics: null,
    created_at: '2026-04-02',
    traffic_pct: 0,
    notes: 'NBI 지수 수집 3개월 이후 활성화 예정.',
  },
]

// ─── 레지스트리 API ───────────────────────────────────────

export function getActiveModel(type: ModelType): ModelVersion | null {
  return MODEL_CATALOG.find((m) => m.type === type && m.status === 'active') ?? null
}

export function getAllModels(type?: ModelType): ModelVersion[] {
  return type ? MODEL_CATALOG.filter((m) => m.type === type) : [...MODEL_CATALOG]
}

export function getModelByVersion(type: ModelType, version: string): ModelVersion | null {
  return MODEL_CATALOG.find((m) => m.type === type && m.version === version) ?? null
}

/**
 * A/B 테스트 라우팅
 * traffic_pct 기준으로 요청을 active/shadow 모델에 분배
 */
export function routeToModel(type: ModelType, requestId?: string): ModelVersion {
  const candidates = MODEL_CATALOG.filter(
    (m) => m.type === type && (m.status === 'active' || m.status === 'shadow') && m.traffic_pct > 0
  )
  if (candidates.length === 0) {
    return MODEL_CATALOG.find((m) => m.type === type && m.status === 'active')!
  }

  // 결정론적 라우팅 (requestId 기반 해시)
  const hash = requestId
    ? requestId.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 100
    : Math.floor(Math.random() * 100)

  let cumulative = 0
  for (const model of candidates) {
    cumulative += model.traffic_pct
    if (hash < cumulative) return model
  }
  return candidates[candidates.length - 1]
}

/**
 * 성능 지표로 자동 롤백 판단
 */
export function shouldRollback(model: ModelVersion): { rollback: boolean; reason?: string } {
  if (!model.metrics) return { rollback: false }

  if (model.type === 'price') {
    if ((model.metrics.mape ?? 0) > 25) {
      return { rollback: true, reason: `MAPE ${model.metrics.mape}% > 허용 임계값 25%` }
    }
  }

  if (model.type === 'risk') {
    if ((model.metrics.accuracy ?? 1) < 0.60) {
      return { rollback: true, reason: `Accuracy ${model.metrics.accuracy} < 허용 임계값 0.60` }
    }
  }

  return { rollback: false }
}

/**
 * 모델 레지스트리 요약 (관리자 대시보드용)
 */
export function getRegistrySummary() {
  const types: ModelType[] = ['price', 'risk', 'matching', 'bid_rate']
  return types.map((type) => {
    const active = getActiveModel(type)
    const shadow = MODEL_CATALOG.find((m) => m.type === type && m.status === 'shadow')
    return {
      type,
      active_version: active?.version ?? null,
      active_algorithm: active?.algorithm ?? null,
      active_metrics: active?.metrics ?? null,
      shadow_version: shadow?.version ?? null,
      shadow_algorithm: shadow?.algorithm ?? null,
      has_upgrade_candidate: !!shadow,
    }
  })
}
