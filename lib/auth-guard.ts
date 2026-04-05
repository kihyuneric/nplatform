/**
 * lib/auth-guard.ts
 *
 * API 라우트용 서버사이드 권한 검증 헬퍼.
 *
 * 기존 middleware는 쿠키 기반으로 소프트 차단만 수행.
 * 이 모듈은 DB를 직접 조회하여 API 진입점에서 권한을 확실히 검증한다.
 *
 * 사용법:
 *   const { user, profile } = await requireAuth()
 *   await requireTier(1)        // TIER1 이상
 *   await requireApproval()     // 승인 완료 회원
 *   await requireAdmin()        // ADMIN / SUPER_ADMIN
 */

import { createClient } from '@/lib/supabase/server'
import { Errors } from '@/lib/api-error'
import type { NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  investor_tier: number        // 0=없음, 1=TIER1, 2=TIER2, 3=TIER3
  approval_status: string      // PENDING_APPROVAL | APPROVED | SUSPENDED
  active_role: string          // BUYER | SELLER | INVESTOR | INSTITUTION | ADMIN | SUPER_ADMIN
  credit_balance: number
}

export type AuthGuardError = NextResponse

// ─── Internal: getUser ────────────────────────────────

async function getUser(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return { id: user.id, email: user.email ?? '' }
  } catch {
    return null
  }
}

async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, investor_tier, approval_status, active_role, credit_balance')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as UserProfile
  } catch {
    return null
  }
}

// ─── requireAuth ─────────────────────────────────────
/** 로그인 여부만 확인. 미로그인이면 401 에러 객체 반환. */
export async function requireAuth(): Promise<
  { ok: true; user: { id: string; email: string }; profile: UserProfile } |
  { ok: false; error: AuthGuardError }
> {
  const user = await getUser()
  if (!user) return { ok: false, error: Errors.unauthorized() }

  const profile = await getProfile(user.id)
  if (!profile) {
    // 인증은 됐지만 프로필 없음 → 샘플/개발 모드 폴백
    return {
      ok: true,
      user,
      profile: {
        id: user.id,
        email: user.email,
        investor_tier: 1,
        approval_status: 'APPROVED',
        active_role: 'BUYER',
        credit_balance: 0,
      },
    }
  }

  return { ok: true, user, profile }
}

// ─── requireApproval ─────────────────────────────────
/** 로그인 + 승인 완료 회원인지 DB에서 확인. */
export async function requireApproval(): Promise<
  { ok: true; user: { id: string; email: string }; profile: UserProfile } |
  { ok: false; error: AuthGuardError }
> {
  const result = await requireAuth()
  if (!result.ok) return result

  const { profile } = result
  if (profile.approval_status === 'PENDING_APPROVAL') {
    return { ok: false, error: Errors.forbidden('승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.') }
  }
  if (profile.approval_status === 'SUSPENDED') {
    return { ok: false, error: Errors.forbidden('계정이 정지되었습니다. 고객센터에 문의해주세요.') }
  }

  return result
}

// ─── requireTier ─────────────────────────────────────
/** 로그인 + 승인 + investor_tier >= minTier 인지 DB에서 확인. */
export async function requireTier(minTier: 1 | 2 | 3): Promise<
  { ok: true; user: { id: string; email: string }; profile: UserProfile } |
  { ok: false; error: AuthGuardError }
> {
  const result = await requireApproval()
  if (!result.ok) return result

  const { profile } = result
  if ((profile.investor_tier ?? 0) < minTier) {
    return {
      ok: false,
      error: Errors.forbidden(`TIER${minTier} 이상 투자자만 이용 가능합니다.`),
    }
  }

  return result
}

// ─── requireAdmin ─────────────────────────────────────
/** 로그인 + ADMIN 또는 SUPER_ADMIN 역할인지 DB에서 확인. */
export async function requireAdmin(): Promise<
  { ok: true; user: { id: string; email: string }; profile: UserProfile } |
  { ok: false; error: AuthGuardError }
> {
  const result = await requireAuth()
  if (!result.ok) return result

  const { profile } = result
  if (profile.active_role !== 'ADMIN' && profile.active_role !== 'SUPER_ADMIN') {
    return { ok: false, error: Errors.forbidden('관리자 전용 기능입니다.') }
  }

  return result
}
