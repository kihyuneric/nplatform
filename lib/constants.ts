// ============================================================
// NPLATFORM Constants & Enums
// ============================================================

// ─── User Roles ──────────────────────────────────────────────

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
  BUYER_INST: 'BUYER_INST',
  BUYER_INDV: 'BUYER_INDV',
  PARTNER: 'PARTNER',
  VIEWER: 'VIEWER',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: '최고관리자',
  ADMIN: '운영관리자',
  SELLER: '매도자(금융기관)',
  BUYER_INST: '기관 매수자',
  BUYER_INDV: '개인 매수자',
  PARTNER: '파트너(자문사)',
  VIEWER: '일반회원',
}

export const BUYER_ROLES: UserRole[] = ['BUYER_INST', 'BUYER_INDV']
export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN']
export const SELLER_ROLES: UserRole[] = ['SELLER']
export const MFA_REQUIRED_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'SELLER']

// ─── Listing Types (3-Market) ────────────────────────────────

export const LISTING_TYPES = {
  DISTRESSED_SALE: '임의매각',
  AUCTION_NPL: '경공매 NPL',
  NON_AUCTION_NPL: '비경매 NPL',
} as const

export type ListingType = keyof typeof LISTING_TYPES

export const LISTING_TYPE_COLORS: Record<ListingType, string> = {
  DISTRESSED_SALE: 'bg-orange-100 text-orange-700',
  AUCTION_NPL: 'bg-blue-100 text-blue-700',
  NON_AUCTION_NPL: 'bg-emerald-100 text-emerald-700',
}

export const LISTING_TYPE_ICONS: Record<ListingType, string> = {
  DISTRESSED_SALE: 'Gavel',
  AUCTION_NPL: 'Scale',
  NON_AUCTION_NPL: 'FileText',
}

// ─── Collateral Types ────────────────────────────────────────

export const COLLATERAL_TYPES = {
  APARTMENT: '아파트',
  COMMERCIAL: '상가',
  LAND: '토지',
  FACTORY: '공장',
  OFFICE: '오피스',
  VILLA: '빌라/다세대',
  HOTEL: '호텔/모텔',
  WAREHOUSE: '창고',
  OTHER: '기타',
} as const

export type CollateralType = keyof typeof COLLATERAL_TYPES

// ─── Listing Status ──────────────────────────────────────────

export const LISTING_STATUS = {
  DRAFT: '초안',
  ACTIVE: '공개중',
  IN_DEAL: '거래진행',
  SOLD: '거래완료',
  WITHDRAWN: '철회',
} as const

export const LISTING_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  IN_DEAL: 'bg-blue-100 text-blue-700',
  SOLD: 'bg-purple-100 text-purple-700',
  WITHDRAWN: 'bg-red-100 text-red-700',
}

// ─── Disclosure Levels ───────────────────────────────────────

export const DISCLOSURE_LEVELS = {
  TEASER: '티저 (기본 정보)',
  NDA_REQUIRED: 'NDA 필요 (상세 정보)',
  FULL: '전체 공개 (데이터룸)',
} as const

// ─── Contract Status (14-State Machine) ──────────────────────

export const CONTRACT_STATUS = {
  PENDING: '대기중',
  REVIEWING: '검토중',
  COUNTER_OFFER: '역제안',
  ACCEPTED: '수락',
  REJECTED: '거절',
  DEPOSIT_PENDING: '계약금 대기',
  DEPOSIT_CONFIRMED: '계약금 확인',
  DEAL_ROOM_CREATED: '딜룸 생성',
  COOLDOWN: '청약철회 기간',
  IN_PROGRESS: '진행중',
  CLOSING: '마감 절차',
  COMPLETED: '완료',
  CANCELLED: '취소',
  WITHDRAWN: '철회',
} as const

export type ContractStatus = keyof typeof CONTRACT_STATUS

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  REVIEWING: 'bg-yellow-100 text-yellow-700',
  COUNTER_OFFER: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DEPOSIT_PENDING: 'bg-orange-100 text-orange-700',
  DEPOSIT_CONFIRMED: 'bg-teal-100 text-teal-700',
  DEAL_ROOM_CREATED: 'bg-blue-100 text-blue-700',
  COOLDOWN: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  CLOSING: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-stone-100 text-stone-700',
  WITHDRAWN: 'bg-rose-100 text-rose-700',
}

// Valid state transitions
export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  PENDING: ['REVIEWING', 'CANCELLED'],
  REVIEWING: ['COUNTER_OFFER', 'ACCEPTED', 'REJECTED'],
  COUNTER_OFFER: ['REVIEWING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DEPOSIT_PENDING', 'CANCELLED'],
  REJECTED: [],
  DEPOSIT_PENDING: ['DEPOSIT_CONFIRMED', 'CANCELLED'],
  DEPOSIT_CONFIRMED: ['DEAL_ROOM_CREATED'],
  DEAL_ROOM_CREATED: ['COOLDOWN'],
  COOLDOWN: ['IN_PROGRESS', 'WITHDRAWN'],
  IN_PROGRESS: ['CLOSING', 'CANCELLED'],
  CLOSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  WITHDRAWN: [],
}

// ─── KYC Status ──────────────────────────────────────────────

export const KYC_STATUS = {
  PENDING: '대기',
  SUBMITTED: '제출완료',
  IN_REVIEW: '심사중',
  APPROVED: '승인',
  REJECTED: '반려',
  SUSPENDED: '정지',
} as const

export const KYC_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
}

// ─── Institution Types ───────────────────────────────────────

export const INSTITUTION_TYPES = {
  BANK: '은행',
  CAPITAL: '캐피탈',
  AMC: '자산관리회사(AMC)',
  TRUST: '신탁사',
  INSURANCE: '보험사',
  SAVINGS_BANK: '저축은행',
  CREDIT_UNION: '신용협동조합',
  SECURITIES: '증권사',
  OTHER: '기타 금융기관',
} as const

// ─── Complaint ───────────────────────────────────────────────

export const COMPLAINT_CATEGORIES = {
  SERVICE: '서비스 이용',
  TRANSACTION: '거래 관련',
  LISTING: '매물 관련',
  CONTRACT: '계약 관련',
  PRIVACY: '개인정보',
  TECHNICAL: '기술적 문제',
  OTHER: '기타',
} as const

export const COMPLAINT_STATUS = {
  RECEIVED: '접수',
  IN_REVIEW: '검토중',
  IN_PROGRESS: '처리중',
  RESOLVED: '해결',
  CLOSED: '종결',
  ESCALATED: '에스컬레이션',
} as const

export const COMPLAINT_STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-purple-100 text-purple-700',
  ESCALATED: 'bg-red-100 text-red-700',
}

// ─── Survey & Matching ───────────────────────────────────────

export const SURVEY_STATUS = {
  DRAFT: '작성중',
  ACTIVE: '활성',
  MATCHED: '매칭완료',
  EXPIRED: '만료',
  CANCELLED: '취소',
} as const

export const DEAL_ROOM_STATUS = {
  OPEN: '오픈',
  IN_PROGRESS: '진행중',
  CLOSING: '마감예정',
  CLOSED: '완료',
  CANCELLED: '취소',
} as const

export const INVESTMENT_EXPERIENCE = {
  NONE: '없음',
  BEGINNER: '초급 (1~2건)',
  INTERMEDIATE: '중급 (3~10건)',
  EXPERT: '전문가 (10건 이상)',
} as const

export const URGENCY_LEVELS = {
  URGENT: '긴급',
  NORMAL: '보통',
  FLEXIBLE: '여유',
} as const

// ─── AI Analysis ─────────────────────────────────────────────

export const AI_ANALYSIS_TYPES = {
  PRICE_ESTIMATION: '가격 추정',
  REGISTRY_ANALYSIS: '등기 분석',
  WINNING_RATE: '낙찰가율 예측',
  PROFIT_SIMULATION: '수익 시뮬레이션',
} as const

// ─── Alert Frequency ─────────────────────────────────────────

export const ALERT_FREQUENCIES = {
  IMMEDIATE: '즉시',
  DAILY: '일간',
  WEEKLY: '주간',
} as const

// ─── Auction Types ───────────────────────────────────────────

export const AUCTION_TYPES = {
  COURT_AUCTION: '법원경매',
  PUBLIC_SALE: '공매(캠코)',
} as const

export const AUCTION_RESULTS = {
  SOLD: '낙찰',
  FAILED: '유찰',
  WITHDRAWN: '취하',
  POSTPONED: '연기',
} as const

// ─── Notification Types ──────────────────────────────────────

export const NOTIFICATION_TYPES = {
  MATCHING: '매칭 알림',
  CONTRACT: '계약 알림',
  DEAL_ROOM: '딜룸 알림',
  KYC: 'KYC 알림',
  LISTING: '매물 알림',
  ALERT: '맞춤 알림',
  SYSTEM: '시스템 알림',
  COMPLAINT: '민원 알림',
} as const

// ─── Pipeline Names ──────────────────────────────────────────

export const PIPELINE_NAMES = {
  COURT_AUCTION: '대법원 경매정보',
  KAMCO_PUBLIC_SALE: '캠코 온비드',
  MOLIT_TRADE_PRICE: '국토부 실거래가',
  MATCHING_BATCH: '매칭 배치',
} as const

// ─── Korean Regions (시/도) ──────────────────────────────────

export const REGIONS = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시',
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
] as const

// ─── Matching Engine Weights ─────────────────────────────────

export const MATCHING_WEIGHTS = {
  collateral: 0.30,
  region: 0.25,
  amount: 0.20,
  discount: 0.15,
  avoidance: 0.10,
} as const

// ─── Rate Limits ─────────────────────────────────────────────

export const RATE_LIMITS = {
  AUTHENTICATED: 100,     // per minute
  UNAUTHENTICATED: 20,    // per minute
  AI_ANALYSIS: 10,         // per hour
  FILE_UPLOAD: 20,         // per hour
  ADMIN: 300,              // per minute
} as const

// ─── SLA Deadlines (hours) ───────────────────────────────────

export const SLA_HOURS = {
  KYC_REVIEW: 72,
  LISTING_INSPECTION: 48,
  COMPLAINT_RESOLUTION: 14 * 24, // 14 business days
  COOLDOWN_PERIOD: 7 * 24,       // 7 business days
} as const

// ─── Design Tokens ───────────────────────────────────────────

export const COLORS = {
  primary: '#1B3A5C',
  primaryLight: '#2E75B6',
  secondary: '#2E75B6',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
} as const

// ─── Format Helpers ──────────────────────────────────────────

export function formatKRW(amount: number | null | undefined): string {
  if (!amount) return '-'
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000)
    const man = Math.floor((amount % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${value.toFixed(1)}%`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatArea(sqm: number | null | undefined): string {
  if (!sqm) return '-'
  const pyeong = (sqm * 0.3025).toFixed(1)
  return `${sqm}㎡ (${pyeong}평)`
}

export function isValidTransition(
  from: string,
  to: string
): boolean {
  const allowed = CONTRACT_TRANSITIONS[from as keyof typeof CONTRACT_TRANSITIONS]
  return allowed ? allowed.includes(to as any) : false
}
