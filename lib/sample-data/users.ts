// ─────────────────────────────────────────────────────────
//  Centralized Sample Users – 모든 API에서 참조하는 통합 사용자 데이터
// ─────────────────────────────────────────────────────────

export interface SampleUser {
  id: string
  name: string
  email: string
  role: 'BUYER' | 'SELLER' | 'PROFESSIONAL' | 'PARTNER' | 'ADMIN'
  grade?: string
  institution_id?: string
  specialty?: string
  tier?: string
  level?: string
  created_at: string
}

export const SAMPLE_USERS: SampleUser[] = [
  // ── Buyers (8) ──────────────────────────────────────────
  { id: 'user-b1', name: '김투자', email: 'buyer1@test.com', role: 'BUYER', grade: 'STANDARD', created_at: '2025-06-15' },
  { id: 'user-b2', name: '이매수', email: 'buyer2@test.com', role: 'BUYER', grade: 'PREMIUM', created_at: '2025-04-20' },
  { id: 'user-b3', name: '박인베스터', email: 'buyer3@test.com', role: 'BUYER', grade: 'BASIC', created_at: '2025-09-01' },
  { id: 'user-b4', name: '최자산', email: 'buyer4@test.com', role: 'BUYER', grade: 'VIP', created_at: '2025-02-10' },
  { id: 'user-b5', name: '정운용', email: 'buyer5@test.com', role: 'BUYER', grade: 'STANDARD', created_at: '2025-07-22' },
  { id: 'user-b6', name: '한부동산', email: 'buyer6@test.com', role: 'BUYER', grade: 'PREMIUM', created_at: '2025-05-11' },
  { id: 'user-b7', name: '윤재테크', email: 'buyer7@test.com', role: 'BUYER', grade: 'BASIC', created_at: '2025-11-03' },
  { id: 'user-b8', name: '강투자왕', email: 'buyer8@test.com', role: 'BUYER', grade: 'STANDARD', created_at: '2025-08-14' },

  // ── Sellers / Institutions (4) ──────────────────────────
  { id: 'user-s1', name: 'KB국민은행 NPL팀', email: 'kb-npl@test.com', role: 'SELLER', grade: 'INSTITUTION', institution_id: 'inst-1', created_at: '2024-12-01' },
  { id: 'user-s2', name: '신한은행 채권관리부', email: 'shinhan@test.com', role: 'SELLER', grade: 'INSTITUTION', institution_id: 'inst-2', created_at: '2024-11-15' },
  { id: 'user-s3', name: '하나은행 NPL사업부', email: 'hana@test.com', role: 'SELLER', grade: 'INSTITUTION', institution_id: 'inst-3', created_at: '2025-01-20' },
  { id: 'user-s4', name: '우리은행 여신관리팀', email: 'woori@test.com', role: 'SELLER', grade: 'INSTITUTION', institution_id: 'inst-4', created_at: '2025-03-10' },

  // ── Professionals (4) ───────────────────────────────────
  { id: 'user-p1', name: '박법률 변호사', email: 'lawyer@test.com', role: 'PROFESSIONAL', specialty: '법률', created_at: '2025-03-01' },
  { id: 'user-p2', name: '김세무 세무사', email: 'tax@test.com', role: 'PROFESSIONAL', specialty: '세무', created_at: '2025-04-15' },
  { id: 'user-p3', name: '이감정 감정평가사', email: 'appraiser@test.com', role: 'PROFESSIONAL', specialty: '감정평가', created_at: '2025-02-20' },
  { id: 'user-p4', name: '최중개 공인중개사', email: 'realtor@test.com', role: 'PROFESSIONAL', specialty: '공인중개', created_at: '2025-05-10' },

  // ── Partners (2) ────────────────────────────────────────
  { id: 'user-r1', name: '이파트너', email: 'partner1@test.com', role: 'PARTNER', tier: 'GOLD', created_at: '2025-01-15' },
  { id: 'user-r2', name: '조추천', email: 'partner2@test.com', role: 'PARTNER', tier: 'SILVER', created_at: '2025-06-20' },

  // ── Admins (2) ──────────────────────────────────────────
  { id: 'user-a1', name: '관리자', email: 'admin@nplatform.co.kr', role: 'ADMIN', level: 'L1', created_at: '2024-10-01' },
  { id: 'user-a2', name: '운영매니저', email: 'ops@nplatform.co.kr', role: 'ADMIN', level: 'L3', created_at: '2025-01-01' },
]

// ── Helper Functions ──────────────────────────────────────

export function getUsersByRole(role: SampleUser['role']): SampleUser[] {
  return SAMPLE_USERS.filter(u => u.role === role)
}

export function getBuyers(): SampleUser[] { return getUsersByRole('BUYER') }
export function getSellers(): SampleUser[] { return getUsersByRole('SELLER') }
export function getProfessionals(): SampleUser[] { return getUsersByRole('PROFESSIONAL') }
