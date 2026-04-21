/**
 * lib/access-tier.ts
 *
 * NPLatform v4 — 4단계 정보 공개 모델 (Graduated Disclosure)
 *
 * L0: 무료·무로그인    — 채권잔액·매각희망가·감정평가요약·담보종류·지역(읍면동)
 * L1: 본인인증         — 감정평가PDF(마스킹)·등기요약·권리관계·임차요약
 * L2: 전문투자자+NDA   — 등기원본·임대차계약·실사사진·재무제표·매각자기관
 * L3: LOI+매각자승인   — 매각자 공식채널·실사원본·협상·에스크로·계약서
 */

import type { AccessTier, UserRecord } from './db-types'

export type { AccessTier }

// ─── 티어 순서 ─────────────────────────────────────────────
const TIER_ORDER: Record<AccessTier, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
}

/** 티어 A가 티어 B 이상인가 */
export function tierGte(a: AccessTier, b: AccessTier): boolean {
  return TIER_ORDER[a] >= TIER_ORDER[b]
}

// ─── 사용자 티어 판정 ─────────────────────────────────────
/**
 * 사용자의 현재 최대 접근 티어를 계산.
 * NDA/LOI는 매물 단위이므로 이 함수에선 기본 티어(L0~L2)만 반환.
 * 매물별 L3 접근은 canAccessListing() 사용.
 */
export function getUserTier(user: UserRecord | null | undefined): AccessTier {
  if (!user) return 'L0'
  if (user.qualified_investor) return 'L2'     // NDA는 매물별이지만 구독 기반 접근권으로 L2 기본 부여
  if (user.identity_verified) return 'L1'
  return 'L0'
}

// ─── 필드별 필요 티어 ─────────────────────────────────────
/** 각 필드가 공개되기 위한 최소 티어 */
export const FIELD_TIER_MAP: Record<string, AccessTier> = {
  // L0 — 무료 공개
  outstanding_principal: 'L0',
  asking_price: 'L0',
  discount_rate: 'L0',
  collateral_type: 'L0',
  collateral_region_code: 'L0',
  debtor_type: 'L0',
  auction_stage: 'L0',
  court_case_masked: 'L0',
  ai_grade: 'L0',
  'appraisal.value': 'L0',
  'appraisal.date': 'L0',
  'appraisal.agency': 'L0',

  // L1 — 본인인증
  'appraisal.pdf_masked_url': 'L1',
  registry_summary: 'L1',
  rights_structure: 'L1',
  lease_summary: 'L1',
  similar_auctions: 'L1',
  qa_thread: 'L1',
  seller_institution_name: 'L1',

  // L2 — 전문투자자 + NDA
  registry_full_url: 'L2',
  lease_documents_url: 'L2',
  site_photos: 'L2',
  financials: 'L2',
  debtor_statistics: 'L2',

  // L3 — LOI + 매각자 승인
  seller_contact_channel: 'L3',
  due_diligence_full: 'L3',
  negotiation_price_range: 'L3',
  escrow_account: 'L3',
  contract_draft: 'L3',
}

/** 특정 필드에 현재 티어로 접근 가능한가 */
export function canAccess(fieldName: string, currentTier: AccessTier): boolean {
  const required = FIELD_TIER_MAP[fieldName] ?? 'L0'
  return tierGte(currentTier, required)
}

// ─── 마스킹 처리 ──────────────────────────────────────────
/**
 * 티어 미달 시 값을 마스킹 리터럴로 치환.
 * 클라이언트 전송 직전 서버에서 호출하여 민감 데이터 누출 방지.
 */
export function maskValue<T>(
  value: T,
  fieldName: string,
  currentTier: AccessTier
): T | '●●●●●' {
  if (canAccess(fieldName, currentTier)) return value
  return '●●●●●'
}

/**
 * 객체 전체에서 티어 미달 필드를 제거하거나 마스킹.
 * API 응답 직전에 호출 (L2/L3 필드는 서버에서 절대 클라이언트로 전송 금지 원칙).
 */
export function filterByTier<T extends Record<string, unknown>>(
  obj: T,
  currentTier: AccessTier,
  options: { strategy?: 'remove' | 'mask' } = {}
): Partial<T> {
  const strategy = options.strategy ?? 'remove'
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (canAccess(key, currentTier)) {
      result[key] = obj[key]
    } else if (strategy === 'mask') {
      result[key] = '●●●●●'
    }
    // strategy === 'remove' 이면 생략
  }
  return result as Partial<T>
}

// ─── 티어 라벨 / 설명 ─────────────────────────────────────
export const TIER_META: Record<AccessTier, {
  label: string
  shortLabel: string
  description: string
  requirement: string
  color: string  // C 토큰 색상
}> = {
  L0: {
    label: '공개 (L0)',
    shortLabel: 'L0',
    description: '누구나 접근 가능한 기본 매물 정보',
    requirement: '로그인 불필요',
    color: '#64748B',
  },
  L1: {
    label: '본인인증 (L1)',
    shortLabel: 'L1',
    description: '등기부 요약·임대차 정보 열람',
    requirement: '휴대폰/공동인증 본인인증',
    color: '#3B82F6',
  },
  L2: {
    label: 'NDA 체결 (L2)',
    shortLabel: 'L2',
    description: '감정평가서 · 현장 사진 · 채권 정보',
    requirement: 'NDA 체결',
    color: '#A855F7',
  },
  L3: {
    label: '데이터룸 (L3)',
    shortLabel: 'L3',
    description: '매각자 직접 협상·계약·에스크로',
    requirement: 'LOI 제출 + 매각자 승인',
    color: '#F59E0B',
  },
}

/** 티어 업그레이드 경로 (현재 → 다음 단계 안내) */
export function getNextUpgradeStep(currentTier: AccessTier): {
  nextTier: AccessTier
  action: string
  href: string
} | null {
  switch (currentTier) {
    case 'L0':
      return { nextTier: 'L1', action: '본인인증', href: '/my/verify' }
    case 'L1':
      return { nextTier: 'L2', action: '전문투자자 인증', href: '/my/kyc' }
    case 'L2':
      return { nextTier: 'L3', action: 'LOI 제출', href: '' /* 매물별 동적 */ }
    case 'L3':
      return null
  }
}
