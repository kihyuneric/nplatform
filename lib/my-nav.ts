/**
 * lib/my-nav.ts
 *
 * 마이페이지 메뉴 카탈로그 — Single Source of Truth (SSoT).
 * Phase G7+ 2026-04-29 (My_Page_Restructure_Plan_2026Q2 v1).
 *
 * 한 곳에서 메뉴 정의·역할 매트릭스·라벨을 관리하고, 클라이언트/서버 양쪽에서 가져다 씁니다.
 *
 * 사용:
 *   const items = getMyNavItems({ roles, institutionType, isAdmin })
 *   → SubNav 에 role 별로 필터링된 항목만 전달
 */

import type { UserRole } from '@/lib/roles'

/** institution_type — 기관 유형 (taxonomy.ts SELLER_INSTITUTIONS 기반) */
export type InstitutionTypeCode =
  | 'BANK'
  | 'SAVINGS_BANK'
  | 'MUTUAL_CREDIT'
  | 'INSURANCE'
  | 'CREDIT_CARD'
  | 'CAPITAL'
  | 'SECURITIES'
  | 'AMC'
  | 'FUND'
  | 'MONEY_LENDER'
  | 'INDIVIDUAL'
  | 'CORPORATION'
  | 'TRUST'
  | 'CREDIT_UNION'
  | 'OTHER'
  | (string & {})  // 미지정 값 통과

/**
 * effective role flags — UserRole + institution_type → boolean 집합.
 * 메뉴 가시성 판단에 사용. SELLER 권한은 여러 경로에서 부여될 수 있어 별도 정책으로 합산.
 */
export interface EffectiveRoleFlags {
  /** 슈퍼관리자 — 모든 메뉴 노출 */
  isSuperAdmin: boolean
  /** 운영관리자 */
  isAdmin: boolean
  /** 금융기관 (은행·저축은행·상호금융·보험·카드·캐피탈 등) */
  isInstitution: boolean
  /** 대부업체 */
  isMoneyLender: boolean
  /** AMC / 자산운용사 */
  isAMC: boolean
  /** 일반회원 (개인·법인 — institution_type INDIVIDUAL/CORPORATION 또는 BUYER 단독) */
  isGeneral: boolean
  /** 파트너 / 자문사 */
  isPartner: boolean
  /** 전문가 (변호사·감정평가사 등) */
  isProfessional: boolean
  /** 매수자 (개인 BUYER 권한) */
  isBuyer: boolean
  /** 매도자 — 다음 중 하나라도 있으면 true:
   *    SELLER role · INSTITUTION · MONEY_LENDER · AMC · PARTNER · GENERAL */
  isSeller: boolean
}

/**
 * 사용자의 UserRole 배열 + institution_type 으로부터 effective flags 산출.
 * 매도자 권한은 여러 경로에서 부여될 수 있어 통합 판정.
 */
export function computeEffectiveRoles(input: {
  roles: readonly UserRole[]
  institutionType?: InstitutionTypeCode | null
}): EffectiveRoleFlags {
  const roles = new Set(input.roles)
  const it = String(input.institutionType ?? '').toUpperCase()

  const isSuperAdmin = roles.has('SUPER_ADMIN')
  const isAdmin = isSuperAdmin || roles.has('ADMIN')

  // institution_type 으로 세부 기관 유형 판정 (UserRole 'INSTITUTION' 만으로는 부족)
  const isInstitution = roles.has('INSTITUTION') ||
    ['BANK', 'SAVINGS_BANK', 'MUTUAL_CREDIT', 'INSURANCE', 'CREDIT_CARD',
     'CAPITAL', 'SECURITIES', 'TRUST', 'CREDIT_UNION'].includes(it)
  const isMoneyLender = it === 'MONEY_LENDER'
  const isAMC = it === 'AMC' || it === 'FUND'
  const isGeneral = (!isInstitution && !isMoneyLender && !isAMC) ||
    ['INDIVIDUAL', 'CORPORATION'].includes(it)

  const isPartner = roles.has('PARTNER')
  const isProfessional = roles.has('PROFESSIONAL')
  const isBuyer = roles.has('BUYER') || roles.has('INVESTOR')

  // 매도자 권한 — 사용자 정책 (2026-04-29):
  //   "금융기관·대부업체·자산운용사·일반회원·파트너 모두 매도자 관리 가능"
  const isSeller =
    roles.has('SELLER') ||
    isInstitution ||
    isMoneyLender ||
    isAMC ||
    isPartner ||
    isGeneral

  return {
    isSuperAdmin,
    isAdmin,
    isInstitution,
    isMoneyLender,
    isAMC,
    isGeneral,
    isPartner,
    isProfessional,
    isBuyer,
    isSeller,
  }
}

/** 메뉴 항목 정의 */
export interface MyNavItem {
  /** 라우트 path */
  href: string
  /** 표시 라벨 */
  label: string
  /** 표시 조건 — flags 받아 boolean 반환. 항상 true 면 모든 회원에게 노출 */
  visible: (f: EffectiveRoleFlags) => boolean
  /** 정렬 순서 */
  order: number
  /**
   * 활성 상태 매칭 prefix 추가 — Zone macro 가 sub-feature 라우트도 active 로 표시.
   * 예: 거래 macro 의 매칭 prefix = ['/my/deals', '/my/agreements', '/my/demands']
   */
  matchPaths?: readonly string[]
}

/**
 * 마이페이지 메뉴 카탈로그 (SSoT) — v2 (2026-04-29 · McKinsey 3-Zone).
 *
 * MECE 인지 구역:
 *   1. 진입 — 대시보드
 *   2. 활동 (Activity) — 거래 (딜룸·계약·매수수요)
 *   3. 보유 (Holdings) — 자산 (내 매물·관심매물·포트폴리오)
 *   4. 소통 — 알림센터 (알림·공지·문의)
 *   5. 계정 — 설정 (인증·기관·보안·결제·파트너·알림설정)
 *
 * 회원당 평균 4~5개 메뉴 노출 (역할에 따라).
 */
export const MY_NAV_CATALOG: readonly MyNavItem[] = [
  {
    href: '/my',
    label: '대시보드',
    visible: () => true,
    order: 10,
  },
  {
    href: '/my/deals',
    label: '거래',
    // 거래 = 딜룸/계약/매수수요. 매수수요는 일부 역할에 한정되지만
    //   딜룸·계약은 모든 역할이 사용 → 거래 macro 는 모두에게 노출.
    visible: () => true,
    matchPaths: ['/my/deals', '/my/agreements', '/my/demands'],
    order: 20,
  },
  {
    href: '/my/assets',
    label: '자산',
    // 자산 = 내 매물(매도자) + 관심매물(포트폴리오).
    visible: (f) =>
      f.isAdmin || f.isInstitution || f.isMoneyLender || f.isAMC ||
      f.isGeneral || f.isPartner || f.isBuyer || f.isSeller,
    matchPaths: ['/my/assets', '/my/seller', '/my/portfolio'],
    order: 30,
  },
  {
    href: '/my/inbox',
    label: '알림센터',
    visible: () => true,
    order: 40,
  },
  {
    href: '/my/settings',
    label: '설정',
    visible: () => true,
    order: 50,
  },
] as const

/** 역할/기관유형으로 필터링된 메뉴 항목 반환 (정렬됨) */
export function getMyNavItems(input: {
  roles: readonly UserRole[]
  institutionType?: InstitutionTypeCode | null
}): MyNavItem[] {
  const flags = computeEffectiveRoles(input)
  return MY_NAV_CATALOG
    .filter((item) => item.visible(flags))
    .sort((a, b) => a.order - b.order)
}

/**
 * 통합 설정 페이지 (`/my/settings`) 의 사이드 메뉴 카탈로그.
 * URL 형식: /my/settings?tab=<key>
 */
export interface SettingsTabItem {
  key: string
  label: string
  visible: (f: EffectiveRoleFlags) => boolean
  order: number
}

export const SETTINGS_TABS: readonly SettingsTabItem[] = [
  { key: 'profile',      label: '프로필',              visible: () => true,             order: 10 },
  { key: 'verify',       label: '본인인증',            visible: () => true,             order: 20 },
  { key: 'kyc',          label: '사업자·투자자 인증',  visible: () => true,             order: 30 },
  { key: 'professional', label: '전문가 인증',         visible: (f) => f.isAdmin || f.isProfessional, order: 40 },
  { key: 'organization', label: '기관 계정',           visible: (f) => f.isAdmin || f.isInstitution || f.isAMC, order: 50 },
  // v2 (2026-04-29): 결제·파트너·알림설정 도 설정 사이드바로 흡수
  { key: 'billing',      label: '결제·크레딧',         visible: () => true,             order: 55 },
  { key: 'partner',      label: '파트너 관리',         visible: (f) => f.isAdmin || f.isPartner, order: 58 },
  { key: 'alerts',       label: '알림 환경설정',       visible: () => true,             order: 60 },
  { key: 'security',     label: '보안',                visible: () => true,             order: 70 },
  { key: 'privacy',      label: '개인정보 (관리자)',   visible: (f) => f.isAdmin,       order: 80 },
  { key: 'role',         label: '역할 전환',           visible: () => true,             order: 90 },
  { key: 'delete',       label: '계정 삭제',           visible: () => true,             order: 99 },
] as const

export function getSettingsTabs(input: {
  roles: readonly UserRole[]
  institutionType?: InstitutionTypeCode | null
}): SettingsTabItem[] {
  const flags = computeEffectiveRoles(input)
  return SETTINGS_TABS
    .filter((t) => t.visible(flags))
    .sort((a, b) => a.order - b.order)
}

/**
 * 통합 알림센터 (`/my/inbox`) 의 탭 카탈로그.
 * URL 형식: /my/inbox?tab=<key>
 */
export const INBOX_TABS = [
  { key: 'alerts',    label: '알림',     order: 10 },
  { key: 'notices',   label: '공지',     order: 20 },
  { key: 'inquiries', label: '문의',     order: 30 },
] as const
export type InboxTabKey = typeof INBOX_TABS[number]['key']

/**
 * v2 (2026-04-29) — Zone macro 별 sub-tab 카탈로그.
 * 사용자 정책: 거래(활동) · 자산(보유) macro 안에 sub-feature 들이 모임.
 */
export interface ZoneTabItem {
  key: string
  label: string
  href: string
  visible: (f: EffectiveRoleFlags) => boolean
  order: number
}

/** 거래 (Activity) Zone 의 3-탭 — 딜룸·계약·매수수요 */
export const DEALS_ZONE_TABS: readonly ZoneTabItem[] = [
  {
    key: 'rooms', label: '딜룸',
    href: '/my/deals',
    visible: () => true,
    order: 10,
  },
  {
    key: 'agreements', label: '계약',
    href: '/my/agreements',
    visible: () => true,
    order: 20,
  },
  {
    key: 'demands', label: '매수 수요',
    href: '/my/demands',
    visible: (f) =>
      f.isAdmin || f.isMoneyLender || f.isAMC || f.isGeneral ||
      f.isPartner || f.isBuyer,
    order: 30,
  },
] as const

/** 자산 (Holdings) Zone 의 2-탭 — 내 매물·관심매물 */
export const ASSETS_ZONE_TABS: readonly ZoneTabItem[] = [
  {
    key: 'seller', label: '내 매물',
    href: '/my/seller',
    visible: (f) => f.isAdmin || f.isSeller,
    order: 10,
  },
  {
    key: 'portfolio', label: '관심매물·포트폴리오',
    href: '/my/portfolio',
    visible: (f) =>
      f.isAdmin || f.isInstitution || f.isMoneyLender || f.isAMC ||
      f.isGeneral || f.isPartner || f.isBuyer,
    order: 20,
  },
] as const

export function getDealsZoneTabs(input: {
  roles: readonly UserRole[]
  institutionType?: InstitutionTypeCode | null
}): ZoneTabItem[] {
  const flags = computeEffectiveRoles(input)
  return DEALS_ZONE_TABS.filter((t) => t.visible(flags)).sort((a, b) => a.order - b.order)
}

export function getAssetsZoneTabs(input: {
  roles: readonly UserRole[]
  institutionType?: InstitutionTypeCode | null
}): ZoneTabItem[] {
  const flags = computeEffectiveRoles(input)
  return ASSETS_ZONE_TABS.filter((t) => t.visible(flags)).sort((a, b) => a.order - b.order)
}
