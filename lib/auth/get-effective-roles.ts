/**
 * lib/auth/get-effective-roles.ts
 *
 * 서버 사이드에서 현재 사용자의 effective role flags 산출.
 * MyLayout (Server Component) 에서 호출해 SubNav 동적 필터링에 사용.
 *
 * Phase G7+ 2026-04-29 (My_Page_Restructure_Plan_2026Q2 Phase 1-B).
 */

import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import {
  computeEffectiveRoles,
  type EffectiveRoleFlags,
  type InstitutionTypeCode,
} from '@/lib/my-nav'
import type { UserRole } from '@/lib/roles'
import { cookies } from 'next/headers'

/**
 * 비로그인 / 게스트용 기본 flags — 모든 거짓 (메뉴는 "대시보드/딜룸/계약/포트폴리오/결제/알림/설정"
 * 등 default-true 항목만 노출).
 */
const GUEST_FLAGS: EffectiveRoleFlags = {
  isSuperAdmin: false,
  isAdmin: false,
  isInstitution: false,
  isMoneyLender: false,
  isAMC: false,
  isGeneral: true,  // 게스트는 일반회원 취급 (매수수요·포트폴리오 노출)
  isPartner: false,
  isProfessional: false,
  isBuyer: false,
  isSeller: false,
}

/**
 * 현재 사용자의 effective role flags 와 raw context (roles · institutionType) 을 함께 반환.
 *
 * 우선순위:
 *   1) dev cookie bypass (admin/admin 로그인) → active_role 사용
 *   2) Supabase auth → user_roles + users.institution_type 조회
 *   3) 비로그인 → GUEST_FLAGS
 */
export async function getEffectiveRoles(): Promise<{
  flags: EffectiveRoleFlags
  roles: UserRole[]
  institutionType: InstitutionTypeCode | null
  userId: string | null
}> {
  // 0) dev-bypass 처리
  try {
    const jar = await cookies()
    const devBypass = jar.get('dev_user_active')?.value === '1'
    if (devBypass) {
      const activeRole = (jar.get('active_role')?.value ?? 'SUPER_ADMIN') as UserRole
      const flags = computeEffectiveRoles({ roles: [activeRole], institutionType: null })
      return {
        flags,
        roles: [activeRole],
        institutionType: null,
        userId: '00000000-0000-0000-0000-000000000001',
      }
    }
  } catch {
    // cookies 호출 실패 — fall through
  }

  // 1) 실제 Supabase auth
  const user = await getAuthUser()
  if (!user) {
    return { flags: GUEST_FLAGS, roles: [], institutionType: null, userId: null }
  }

  try {
    const supabase = await createClient()

    // user_roles 테이블 조회 (다중 역할 지원)
    const [rolesResult, profileResult] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id),
      supabase
        .from('users')
        .select('role, institution_type')
        .eq('id', user.id)
        .single(),
    ])

    // user_roles 테이블에 행이 있으면 그 값 사용, 없으면 users.role 단일 값
    const roleSet = new Set<UserRole>()
    if (Array.isArray(rolesResult.data) && rolesResult.data.length > 0) {
      for (const r of rolesResult.data) {
        if (r?.role) roleSet.add(r.role as UserRole)
      }
    }
    if (profileResult.data?.role) {
      roleSet.add(profileResult.data.role as UserRole)
    }

    const roles = Array.from(roleSet)
    const institutionType =
      (profileResult.data?.institution_type as InstitutionTypeCode | null) ?? null

    const flags = computeEffectiveRoles({ roles, institutionType })
    return { flags, roles, institutionType, userId: user.id }
  } catch (err) {
    console.warn('[getEffectiveRoles] Supabase 조회 실패 — guest fallback:', err)
    return { flags: GUEST_FLAGS, roles: [], institutionType: null, userId: user.id }
  }
}
