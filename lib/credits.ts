// ─── AI Credit System ─────────────────────────────────────
// Tiered pricing with credit-based AI usage management

// ─── Types ────────────────────────────────────────────────

export type TierName = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface Tier {
  name: TierName
  label: string
  monthlyPrice: number
  monthlyCredits: number
  unlimited: boolean
  features: string[]
}

export type CreditType =
  | 'NPL_ANALYSIS'
  | 'MARKET_REPORT'
  | 'DUE_DILIGENCE'
  | 'OCR_SCAN'
  | 'AI_CHAT'

export interface CreditCost {
  type: CreditType
  label: string
  cost: number
  description: string
}

export interface CreditHistoryEntry {
  id: string
  type: CreditType
  label: string
  creditsUsed: number
  remainingAfter: number
  createdAt: string
}

export interface UserCredits {
  userId: string
  tier: TierName
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  resetDate: string
  history: CreditHistoryEntry[]
}

// ─── Tier Definitions ─────────────────────────────────────

export const TIERS: Record<TierName, Tier> = {
  FREE: {
    name: 'FREE',
    label: '무료',
    monthlyPrice: 0,
    monthlyCredits: 5,
    unlimited: false,
    features: [
      '월 5 AI 크레딧',
      '기본 뉴스 검색',
      '시장 데이터 조회',
      '커뮤니티 이용',
    ],
  },
  PRO: {
    name: 'PRO',
    label: '프로',
    monthlyPrice: 99000,
    monthlyCredits: 100,
    unlimited: false,
    features: [
      '월 100 AI 크레딧',
      'NPL 심층 분석',
      '시장 리포트 생성',
      'OCR 문서 스캔',
      '우선 고객 지원',
      '데이터 내보내기',
    ],
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    label: '엔터프라이즈',
    monthlyPrice: 299000,
    monthlyCredits: -1,
    unlimited: true,
    features: [
      '무제한 AI 크레딧',
      '실사 보고서 자동 생성',
      '전담 컨설턴트 배정',
      'API 액세스',
      '맞춤형 대시보드',
      '팀 멤버 관리',
      'SLA 보장',
    ],
  },
}

// ─── Credit Cost Definitions ──────────────────────────────

export const CREDIT_COSTS: Record<CreditType, CreditCost> = {
  NPL_ANALYSIS: {
    type: 'NPL_ANALYSIS',
    label: 'NPL 분석',
    cost: 3,
    description: '부실채권 AI 심층 분석',
  },
  MARKET_REPORT: {
    type: 'MARKET_REPORT',
    label: '시장 리포트',
    cost: 5,
    description: 'AI 기반 시장 동향 보고서 생성',
  },
  DUE_DILIGENCE: {
    type: 'DUE_DILIGENCE',
    label: '실사 보고서',
    cost: 10,
    description: '부동산 실사 보고서 자동 생성',
  },
  OCR_SCAN: {
    type: 'OCR_SCAN',
    label: 'OCR 스캔',
    cost: 2,
    description: '문서 OCR 인식 및 데이터 추출',
  },
  AI_CHAT: {
    type: 'AI_CHAT',
    label: 'AI 채팅',
    cost: 1,
    description: 'AI 어시스턴트 질의응답',
  },
}

// ─── Mock Data ────────────────────────────────────────────

const MOCK_HISTORY: CreditHistoryEntry[] = [
  { id: 'CH-001', type: 'NPL_ANALYSIS', label: 'NPL 분석', creditsUsed: 3, remainingAfter: 87, createdAt: '2026-03-19T14:30:00Z' },
  { id: 'CH-002', type: 'AI_CHAT', label: 'AI 채팅', creditsUsed: 1, remainingAfter: 90, createdAt: '2026-03-19T11:15:00Z' },
  { id: 'CH-003', type: 'OCR_SCAN', label: 'OCR 스캔', creditsUsed: 2, remainingAfter: 91, createdAt: '2026-03-18T16:45:00Z' },
  { id: 'CH-004', type: 'MARKET_REPORT', label: '시장 리포트', creditsUsed: 5, remainingAfter: 93, createdAt: '2026-03-18T09:20:00Z' },
  { id: 'CH-005', type: 'AI_CHAT', label: 'AI 채팅', creditsUsed: 1, remainingAfter: 98, createdAt: '2026-03-17T15:00:00Z' },
  { id: 'CH-006', type: 'DUE_DILIGENCE', label: '실사 보고서', creditsUsed: 10, remainingAfter: 99, createdAt: '2026-03-16T10:30:00Z' },
  { id: 'CH-007', type: 'NPL_ANALYSIS', label: 'NPL 분석', creditsUsed: 3, remainingAfter: 109, createdAt: '2026-03-15T13:45:00Z' },
  { id: 'CH-008', type: 'AI_CHAT', label: 'AI 채팅', creditsUsed: 1, remainingAfter: 112, createdAt: '2026-03-14T17:10:00Z' },
]

const MOCK_USER_CREDITS: UserCredits = {
  userId: 'user-001',
  tier: 'PRO',
  totalCredits: 100,
  usedCredits: 13,
  remainingCredits: 87,
  resetDate: '2026-04-01T00:00:00Z',
  history: MOCK_HISTORY,
}

// ─── Utility Functions ────────────────────────────────────

export async function getUserCredits(userId?: string): Promise<UserCredits> {
  // In production: fetch from Supabase
  return { ...MOCK_USER_CREDITS, userId: userId || MOCK_USER_CREDITS.userId }
}

export async function consumeCredit(
  userId: string,
  type: CreditType
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const credits = await getUserCredits(userId)
  const cost = CREDIT_COSTS[type]

  if (!cost) {
    return { success: false, remaining: credits.remainingCredits, error: '유효하지 않은 크레딧 유형입니다.' }
  }

  // Unlimited tier
  if (TIERS[credits.tier].unlimited) {
    return { success: true, remaining: credits.remainingCredits }
  }

  if (credits.remainingCredits < cost.cost) {
    return {
      success: false,
      remaining: credits.remainingCredits,
      error: `크레딧이 부족합니다. (필요: ${cost.cost}, 보유: ${credits.remainingCredits})`,
    }
  }

  // In production: deduct from DB
  const remaining = credits.remainingCredits - cost.cost
  return { success: true, remaining }
}

export async function getCreditHistory(userId?: string): Promise<CreditHistoryEntry[]> {
  // In production: fetch from Supabase
  return MOCK_HISTORY
}

export async function canUseAI(
  userId: string,
  type: CreditType
): Promise<{ allowed: boolean; cost: number; remaining: number; shortfall: number }> {
  const credits = await getUserCredits(userId)
  const cost = CREDIT_COSTS[type]

  if (TIERS[credits.tier].unlimited) {
    return { allowed: true, cost: cost.cost, remaining: credits.remainingCredits, shortfall: 0 }
  }

  const allowed = credits.remainingCredits >= cost.cost
  const shortfall = allowed ? 0 : cost.cost - credits.remainingCredits

  return { allowed, cost: cost.cost, remaining: credits.remainingCredits, shortfall }
}
