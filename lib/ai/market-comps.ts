/**
 * lib/ai/market-comps.ts
 *
 * 시세분석(Comparable Sales) 엔진. 매물 또는 분석 대상의
 * 위치/면적/유형을 받아 → 유사 사례(Comp) 추출 → 단가/총가 추정 + 신뢰구간 산출.
 *
 * 호출 위치:
 *   - /api/v1/ai/market-comps
 *   - /analysis/[id] 시세 탭
 *   - /exchange/sell Step 3 (가격가이드와 함께 표출)
 *
 * 데이터 출처(추상화):
 *   - 국토부 실거래가 (공식 API)
 *   - 경매 낙찰 데이터 (자산관리공사 + 자체 수집)
 *   - 플랫폼 내부 거래 완료 NPL
 *
 * v1: heuristic comp filter + IQR-trimmed mean
 * v2 (예정): 거리·시점 가중 회귀 (XGBoost) + 시계열 보정
 */

import type { CollateralType } from "@/components/npl"

// ─── Types ────────────────────────────────────────────────────

export interface CompRecord {
  id: string
  source: "MOLIT" | "AUCTION" | "INTERNAL"
  collateralType: CollateralType
  /** 광역시도 + 시군구 */
  region: string
  /** 단지/도로명 */
  address: string
  /** 전용면적 (㎡) */
  areaM2: number
  /** 거래가 (KRW) */
  price: number
  /** 거래일 (YYYY-MM-DD) */
  tradedAt: string
  /** 위경도 (없을 수 있음) */
  lat?: number
  lng?: number
}

export interface MarketCompsInput {
  collateralType: CollateralType
  region: string
  address?: string
  areaM2: number
  /** 분석 기준일 (default: today) */
  asOf?: string
  /** 후보 comp pool */
  pool: CompRecord[]
}

export interface MarketCompsResult {
  /** 채택된 comp 목록 (정렬: 유사도 desc) */
  selected: ScoredComp[]
  /** ㎡당 단가 (KRW/㎡) */
  unitPrice: number
  /** 총가 추정 (unitPrice × areaM2) */
  estimatedPrice: number
  /** 95% 신뢰구간 [low, high] */
  confidenceInterval: [number, number]
  /** 최근 12개월 가격 변동률 (%) */
  trendPct: number
  /** 사용된 comp 수 / 전체 후보 수 */
  sampleSize: { used: number; pool: number }
  /** 산정 근거 텍스트 */
  reasons: string[]
  modelVersion: string
}

export interface ScoredComp extends CompRecord {
  /** 0~1 — 1=완전 일치 */
  similarity: number
  /** ㎡당 단가 */
  unitPrice: number
  /** 시점 보정 후 단가 */
  adjustedUnitPrice: number
}

// ─── Constants ────────────────────────────────────────────────

const MODEL_VERSION = "market-comps-v1.0.0-2026-04"

/** 광역시도별 연간 가격 변동률 (단순 lookup, 분기마다 갱신 필요) */
const ANNUAL_DRIFT: Record<string, number> = {
  "서울": 0.04, "경기": 0.03, "인천": 0.025,
  "부산": 0.015, "대구": 0.01, "광주": 0.012, "대전": 0.018, "울산": 0.01,
  "세종": 0.025, "강원": 0.005, "충북": 0.008, "충남": 0.01,
  "전북": 0.005, "전남": 0.005, "경북": 0.005, "경남": 0.008, "제주": 0.012,
}

const MIN_SAMPLE = 5
const MAX_SAMPLE = 30

// ─── Helpers ──────────────────────────────────────────────────

function regionStem(region: string): string {
  return region.split(/\s+/)[0]?.replace(/(특별시|광역시|특별자치도|특별자치시|도)$/, "") ?? ""
}

function annualDrift(region: string): number {
  return ANNUAL_DRIFT[regionStem(region)] ?? 0.01
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

/** 시점 보정: drift만큼 현재가로 환산 */
function adjustPrice(price: number, tradedAt: string, asOf: Date, region: string): number {
  const traded = new Date(tradedAt)
  const months = monthsBetween(traded, asOf)
  const drift = annualDrift(region) / 12
  return price * Math.pow(1 + drift, months)
}

/** Region 일치 점수: 시군구 동일=1.0, 광역만 동일=0.6, 그 외=0.2 */
function regionScore(target: string, comp: string): number {
  const tParts = target.split(/\s+/)
  const cParts = comp.split(/\s+/)
  if (tParts[0] === cParts[0] && tParts[1] && tParts[1] === cParts[1]) return 1.0
  if (regionStem(target) === regionStem(comp)) return 0.6
  return 0.2
}

/** 면적 점수: 면적비 (작은쪽/큰쪽)를 0.5~1.0로 매핑 */
function areaScore(target: number, comp: number): number {
  if (target <= 0 || comp <= 0) return 0
  const ratio = Math.min(target, comp) / Math.max(target, comp)
  return ratio < 0.5 ? 0 : ratio
}

/** 시점 점수: 1년 이내=1.0, 2년 이내=0.7, 3년 이내=0.4, 그 이상=0.1 */
function timeScore(tradedAt: string, asOf: Date): number {
  const months = monthsBetween(new Date(tradedAt), asOf)
  if (months < 0) return 0.5 // 미래는 비정상
  if (months <= 12) return 1.0
  if (months <= 24) return 0.7
  if (months <= 36) return 0.4
  return 0.1
}

// ─── Core ─────────────────────────────────────────────────────

export function analyzeMarketComps(input: MarketCompsInput): MarketCompsResult {
  const asOf = input.asOf ? new Date(input.asOf) : new Date()

  // 1) 1차 필터: 같은 담보유형
  const candidates = input.pool.filter(c => c.collateralType === input.collateralType)

  // 2) 점수화
  const scored: ScoredComp[] = candidates.map(c => {
    const sRegion = regionScore(input.region, c.region)
    const sArea = areaScore(input.areaM2, c.areaM2)
    const sTime = timeScore(c.tradedAt, asOf)
    const similarity = (sRegion * 0.45) + (sArea * 0.30) + (sTime * 0.25)
    const unitPrice = c.price / c.areaM2
    const adjustedUnitPrice = adjustPrice(unitPrice, c.tradedAt, asOf, c.region)
    return { ...c, similarity, unitPrice, adjustedUnitPrice }
  })

  // 3) similarity ≥ 0.4만 채택, 상위 MAX_SAMPLE
  const filtered = scored
    .filter(s => s.similarity >= 0.4)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_SAMPLE)

  if (filtered.length < MIN_SAMPLE) {
    // 데이터 부족 fallback — 광역시도 평균 단가 사용
    return buildLowConfidenceFallback(input, scored, asOf)
  }

  // 4) IQR trimmed mean
  const prices = filtered.map(c => c.adjustedUnitPrice).sort((a, b) => a - b)
  const q1 = prices[Math.floor(prices.length * 0.25)]
  const q3 = prices[Math.floor(prices.length * 0.75)]
  const iqr = q3 - q1
  const trimmed = prices.filter(p => p >= q1 - iqr * 1.5 && p <= q3 + iqr * 1.5)
  const unitPrice = trimmed.reduce((s, p) => s + p, 0) / trimmed.length

  // 5) 95% CI (정규근사)
  const variance = trimmed.reduce((s, p) => s + (p - unitPrice) ** 2, 0) / Math.max(trimmed.length - 1, 1)
  const stdErr = Math.sqrt(variance / trimmed.length)
  const ci: [number, number] = [
    Math.round((unitPrice - 1.96 * stdErr) * 100) / 100,
    Math.round((unitPrice + 1.96 * stdErr) * 100) / 100,
  ]

  // 6) 12개월 trend
  const trendPct = computeTrend(filtered, asOf)

  const estimatedPrice = Math.round(unitPrice * input.areaM2 / 1_000_000) * 1_000_000

  const reasons: string[] = [
    `${filtered.length}건의 유사 거래(similarity ≥ 0.4)에서 IQR 트림 평균 산출`,
    `시점 보정: ${regionStem(input.region)} 연 ${(annualDrift(input.region) * 100).toFixed(1)}% 적용`,
    `12개월 가격 변동률 ${trendPct.toFixed(1)}%`,
  ]

  return {
    selected: filtered,
    unitPrice: Math.round(unitPrice),
    estimatedPrice,
    confidenceInterval: ci,
    trendPct: Number(trendPct.toFixed(1)),
    sampleSize: { used: trimmed.length, pool: input.pool.length },
    reasons,
    modelVersion: MODEL_VERSION,
  }
}

function buildLowConfidenceFallback(
  input: MarketCompsInput,
  scored: ScoredComp[],
  asOf: Date,
): MarketCompsResult {
  // 광역시도 + 담보유형만 일치하는 모든 comp의 평균
  const broad = scored.filter(s => regionStem(s.region) === regionStem(input.region))
  const fallbackUnit = broad.length > 0
    ? broad.reduce((s, c) => s + c.adjustedUnitPrice, 0) / broad.length
    : 0
  const estimatedPrice = Math.round(fallbackUnit * input.areaM2 / 1_000_000) * 1_000_000
  return {
    selected: broad.slice(0, 10),
    unitPrice: Math.round(fallbackUnit),
    estimatedPrice,
    confidenceInterval: [Math.round(fallbackUnit * 0.8), Math.round(fallbackUnit * 1.2)],
    trendPct: annualDrift(input.region) * 100,
    sampleSize: { used: broad.length, pool: input.pool.length },
    reasons: [
      "유사 거래 ${MIN_SAMPLE}건 미만 — 광역시도 평균으로 fallback",
      `신뢰도 낮음: 더 많은 사례 확보 후 재산출 권장`,
    ],
    modelVersion: MODEL_VERSION,
  }
}

function computeTrend(comps: ScoredComp[], asOf: Date): number {
  const recent = comps.filter(c => monthsBetween(new Date(c.tradedAt), asOf) <= 6)
  const older = comps.filter(c => {
    const m = monthsBetween(new Date(c.tradedAt), asOf)
    return m > 6 && m <= 18
  })
  if (recent.length === 0 || older.length === 0) return 0
  const recentAvg = recent.reduce((s, c) => s + c.unitPrice, 0) / recent.length
  const olderAvg = older.reduce((s, c) => s + c.unitPrice, 0) / older.length
  return ((recentAvg - olderAvg) / olderAvg) * 100
}

// ─── 단건 빠른 평가 (공시지가 vs 시세) ────────────────────────

export interface QuickValuationInput {
  collateralType: CollateralType
  region: string
  areaM2: number
  publicLandPrice: number          // 공시지가 (KRW/㎡)
}

export function quickValuationFromPublicPrice(input: QuickValuationInput): {
  estimated: number
  multiplier: number
  reasoning: string
} {
  // 공시지가 × 시세 배율 (지역+유형별 lookup)
  const stem = regionStem(input.region)
  const baseMultiplier = stem === "서울" ? 2.3 : stem === "경기" ? 1.9 : 1.6
  const typeBoost = input.collateralType === "아파트" ? 1.1
    : input.collateralType === "상가" ? 1.0
    : input.collateralType === "토지" ? 0.85 : 1.0
  const multiplier = baseMultiplier * typeBoost
  const estimated = Math.round(input.publicLandPrice * input.areaM2 * multiplier / 1_000_000) * 1_000_000
  return {
    estimated,
    multiplier: Number(multiplier.toFixed(2)),
    reasoning: `공시지가 ${(input.publicLandPrice / 1e4).toFixed(0)}만/㎡ × 면적 ${input.areaM2}㎡ × 시세배율 ${multiplier.toFixed(2)}`,
  }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  regionStem,
  annualDrift,
  monthsBetween,
  adjustPrice,
  regionScore,
  areaScore,
  timeScore,
  computeTrend,
  MIN_SAMPLE,
  MAX_SAMPLE,
  MODEL_VERSION,
}
