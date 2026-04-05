export type MemberGrade = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'VIP' | 'INSTITUTION'

export interface PermissionRule {
  feature: string
  allowedGrades: MemberGrade[]
  allowedRoles: string[]
  creditCost: number
  description: string
}

// Default permission rules (admin can override via DB)
const DEFAULT_RULES: PermissionRule[] = [
  { feature: 'exchange.view', allowedGrades: ['BASIC','STANDARD','PREMIUM','VIP','INSTITUTION'], allowedRoles: [], creditCost: 0, description: '매물 열람' },
  { feature: 'exchange.create', allowedGrades: ['STANDARD','PREMIUM','VIP','INSTITUTION'], allowedRoles: ['SELLER','INSTITUTION'], creditCost: 0, description: '매물 등록' },
  { feature: 'exchange.deal', allowedGrades: ['STANDARD','PREMIUM','VIP','INSTITUTION'], allowedRoles: ['BUYER','SELLER'], creditCost: 0, description: '거래 진행' },
  { feature: 'ai.analysis', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 5, description: 'AI NPL 분석' },
  { feature: 'ai.ddReport', allowedGrades: ['PREMIUM','VIP'], allowedRoles: [], creditCost: 10, description: 'AI 실사 리포트' },
  { feature: 'ai.matching', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 3, description: 'AI 매칭' },
  { feature: 'ai.contractReview', allowedGrades: ['PREMIUM','VIP'], allowedRoles: [], creditCost: 8, description: 'AI 계약서 검토' },
  { feature: 'tools.ocr', allowedGrades: ['STANDARD','PREMIUM','VIP','INSTITUTION'], allowedRoles: [], creditCost: 2, description: 'OCR 문서인식' },
  { feature: 'tools.contractGen', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 3, description: '계약서 생성' },
  { feature: 'tools.auctionSim', allowedGrades: ['BASIC','STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 0, description: '경매 시뮬레이터' },
  { feature: 'professional.consult', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 0, description: '전문가 상담 요청' },
  { feature: 'community.post', allowedGrades: ['BASIC','STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 0, description: '커뮤니티 글 작성' },
  { feature: 'partner.referral', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: ['PARTNER'], creditCost: 0, description: '파트너 추천' },
  { feature: 'bulk.upload', allowedGrades: ['PREMIUM','VIP','INSTITUTION'], allowedRoles: ['SELLER','INSTITUTION'], creditCost: 0, description: '대량 매물 등록' },
  { feature: 'export.excel', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 1, description: '엑셀 내보내기' },
  { feature: 'export.pdf', allowedGrades: ['STANDARD','PREMIUM','VIP'], allowedRoles: [], creditCost: 1, description: 'PDF 다운로드' },
]

let rules = [...DEFAULT_RULES]

export function checkPermission(feature: string, userGrade: MemberGrade, userRole?: string): {
  allowed: boolean; creditCost: number; reason?: string
} {
  const rule = rules.find(r => r.feature === feature)
  if (!rule) return { allowed: true, creditCost: 0 } // Unknown feature = allow

  if (!rule.allowedGrades.includes(userGrade)) {
    return { allowed: false, creditCost: 0, reason: `${userGrade} 등급에서는 사용할 수 없습니다. 업그레이드가 필요합니다.` }
  }

  if (rule.allowedRoles.length > 0 && userRole && !rule.allowedRoles.includes(userRole)) {
    return { allowed: false, creditCost: 0, reason: `${userRole} 역할에서는 사용할 수 없습니다.` }
  }

  return { allowed: true, creditCost: rule.creditCost }
}

export function getAllRules(): PermissionRule[] { return rules }

export function updateRule(feature: string, updates: Partial<PermissionRule>) {
  rules = rules.map(r => r.feature === feature ? { ...r, ...updates } : r)
}

export function getGradeInfo(grade: MemberGrade): { name: string; color: string; features: string[] } {
  const info: Record<MemberGrade, { name: string; color: string }> = {
    BASIC: { name: '베이직', color: 'bg-gray-500' },
    STANDARD: { name: '스탠다드', color: 'bg-blue-500' },
    PREMIUM: { name: '프리미엄', color: 'bg-purple-500' },
    VIP: { name: 'VIP', color: 'bg-amber-500' },
    INSTITUTION: { name: '기관', color: 'bg-[#1B3A5C]' },
  }
  const features = rules.filter(r => r.allowedGrades.includes(grade)).map(r => r.feature)
  return { ...info[grade], features }
}
