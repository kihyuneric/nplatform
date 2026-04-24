/**
 * lib/data-completeness.ts
 *
 * 매물 자료 완성도 점수 (0~100, Phase G·2026Q2).
 * 금융기관마다 보유 자료 수준이 달라 일부 항목은 미제공 가능 — 이를 점수화하여 투명하게 표시.
 *
 * 점수 구성 (100점 기준):
 *   필수(L0) 50점 — 5항목 × 10점 : 채권잔액·매각희망가·담보종류·소재지·채무자유형
 *   선택(L1) 50점 — 5항목 × 10점 : 감정평가·등기·권리관계·임차·면적/사진
 *
 * 과거 0~10 스케일은 `calculateCompletenessLegacy10` 로 유지 (DB 마이그레이션 전 호환용).
 */

import type { DealListingRecord, ProvidedFields } from './db-types'

// ─── 필수 항목 (L0) ──────────────────────────────────────
/** 필수 5항목이 모두 채워졌는지 검사 */
function checkRequired(listing: DealListingRecord): number {
  let score = 0
  if (listing.outstanding_principal && listing.outstanding_principal > 0) score++
  if (listing.asking_price && listing.asking_price > 0) score++
  if (listing.collateral_type) score++
  if (listing.collateral_region_code) score++
  if (listing.debtor_type) score++
  return score  // 최대 5
}

// ─── 선택 항목 (L1) ──────────────────────────────────────
/** provided_fields 기반 선택 5항목 점수 */
function checkOptional(listing: DealListingRecord): number {
  const pf = listing.provided_fields
  if (!pf) return 0
  let score = 0
  if (pf.appraisal) score++
  if (pf.registry) score++
  if (pf.rights) score++
  if (pf.lease) score++
  if (pf.site_photos || pf.financials) score++  // 사진 또는 재무자료 중 하나
  return score  // 최대 5
}

// ─── 총점 계산 ────────────────────────────────────────────
/** @deprecated 구 0~10 스케일 (Phase G 이전). 새 코드는 `calculateCompleteness` 사용 */
export function calculateCompletenessLegacy10(listing: DealListingRecord): number {
  return checkRequired(listing) + checkOptional(listing)
}

/**
 * 매물 완성도 점수 0~100 (Phase G 표준).
 *   · 필수 5항목 × 10점 = 50점
 *   · 선택 5항목 × 10점 = 50점
 */
export function calculateCompleteness(listing: DealListingRecord): number {
  return (checkRequired(listing) + checkOptional(listing)) * 10
}

// ─── 뱃지 스타일 ──────────────────────────────────────────
export type CompletenessBadgeLevel = 'high' | 'mid' | 'low'

export interface CompletenessBadgeStyle {
  level: CompletenessBadgeLevel
  label: string               // "자료 8/10"
  color: string               // 전경색
  bgColor: string             // 배경색
  borderColor: string
  hint: string                // 툴팁 설명
}

/**
 * 자료 완성도 뱃지 스타일.
 *
 * Phase G: 100점 기준으로 통일.
 *   · ≥ 90 · high   : 핵심·실사 자료 완비
 *   · ≥ 50 · mid    : 기본 자료 충족
 *   · <  50 · low   : 자료 부족
 *
 * 호환: 기존 0~10 스케일로 호출되면 자동으로 ×10 정규화 (score ≤ 10 감지).
 */
export function getCompletenessBadge(score: number): CompletenessBadgeStyle {
  // 과거 0~10 스케일 입력 자동 승격 (Phase G 이전 DB/캐시 호환)
  const normalized = score <= 10 ? score * 10 : score
  const clamped = Math.max(0, Math.min(100, Math.round(normalized)))
  const label = `자료 ${clamped}/100`

  if (clamped >= 90) {
    return {
      level: 'high',
      label,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      hint: '핵심·실사 자료 완비 — 프리미엄 노출',
    }
  }
  if (clamped >= 50) {
    return {
      level: 'mid',
      label,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      hint: '기본 자료 충족 — 추가 실사 권장',
    }
  }
  return {
    level: 'low',
    label,
    color: '#F43F5E',
    bgColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    hint: '자료 부족 — 매수자 직접 실사 필수',
  }
}

// ─── 제공/미제공 항목 라벨 ────────────────────────────────
export interface FieldStatus {
  key: keyof ProvidedFields
  label: string
  provided: boolean
}

export function getProvidedFieldsList(listing: DealListingRecord): FieldStatus[] {
  const pf: ProvidedFields = listing.provided_fields ?? {
    appraisal: false,
    registry: false,
    rights: false,
    lease: false,
    site_photos: false,
    financials: false,
  }
  return [
    { key: 'appraisal',   label: '감정평가서',   provided: pf.appraisal },
    { key: 'registry',    label: '등기부등본',   provided: pf.registry },
    { key: 'rights',      label: '권리관계',     provided: pf.rights },
    { key: 'lease',       label: '임차현황',     provided: pf.lease },
    { key: 'site_photos', label: '현장사진',     provided: pf.site_photos },
    { key: 'financials',  label: '재무자료',     provided: pf.financials },
  ]
}

// ─── 정렬·필터 유틸 ───────────────────────────────────────
/** 완성도 임계값 이상 필터 */
export function filterByMinCompleteness<T extends DealListingRecord>(
  listings: T[],
  min: number
): T[] {
  return listings.filter(l => (l.data_completeness ?? calculateCompleteness(l)) >= min)
}

/** 완성도 내림차순 정렬 */
export function sortByCompleteness<T extends DealListingRecord>(listings: T[]): T[] {
  return [...listings].sort((a, b) => {
    const sa = a.data_completeness ?? calculateCompleteness(a)
    const sb = b.data_completeness ?? calculateCompleteness(b)
    return sb - sa
  })
}
