export type AdminLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export interface AdminAccount {
  id: string; name: string; email: string; level: AdminLevel; status: 'ACTIVE' | 'SUSPENDED'
  lastLogin?: string; createdAt: string
}

export const ADMIN_LEVELS: Record<AdminLevel, { name: string; description: string; color: string; permissions: string[] }> = {
  L1: { name: '슈퍼관리자', description: '모든 권한 + 관리자 관리', color: 'bg-red-600', permissions: ['*'] },
  L2: { name: '시스템관리자', description: '시스템, API, DB, 모듈', color: 'bg-purple-600', permissions: ['system','api','database','modules','monitoring','security','performance'] },
  L3: { name: '운영관리자', description: '회원, 매물, 거래, 정산', color: 'bg-blue-600', permissions: ['users','listings','deals','professionals','partners','billing','settlements','approvals','kyc','complaints','coupons'] },
  L4: { name: '콘텐츠관리자', description: '교육, 뉴스, 가이드, 배너', color: 'bg-green-600', permissions: ['banners','courses','glossary','news','guide','notices','cases'] },
  L5: { name: '모니터링', description: '읽기 전용', color: 'bg-gray-600', permissions: ['dashboard','monitoring','audit-logs','ml','performance','analytics'] },
}

export function hasAdminPermission(level: AdminLevel, section: string): boolean {
  const perms = ADMIN_LEVELS[level].permissions
  if (perms.includes('*')) return true
  return perms.includes(section)
}

export function canManageAdmins(level: AdminLevel): boolean {
  return level === 'L1'
}
