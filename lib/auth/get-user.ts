import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Dev-bypass user — when `dev_user_active=1` cookie is set (login page sets it
 * on admin/admin), every server-side auth call returns this mock user so that
 * every feature (my-page, admin, watchlist, API routes) unlocks for
 * functional verification. Role comes from `active_role` cookie.
 *
 * NOTE: This is an explicit product decision for the current verification
 * phase. When real auth is required, delete this helper and the cookie check.
 */
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'
const DEV_USER_EMAIL = 'admin@nplatform.dev'

async function readDevBypass(): Promise<{ active: boolean; role: string }> {
  try {
    const jar = await cookies()
    const active = jar.get('dev_user_active')?.value === '1'
    const role = jar.get('active_role')?.value ?? 'SUPER_ADMIN'
    return { active, role }
  } catch {
    return { active: false, role: 'SUPER_ADMIN' }
  }
}

/**
 * Get the authenticated user from Supabase — with dev cookie bypass.
 * Returns { id, email } or null if not authenticated.
 */
export async function getAuthUser(): Promise<{ id: string; email?: string } | null> {
  // Dev-bypass cookie takes precedence so admin/admin unlocks everything
  const bypass = await readDevBypass()
  if (bypass.active) {
    return { id: DEV_USER_ID, email: DEV_USER_EMAIL }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    // Supabase not configured (e.g., placeholder URL in dev) — unauthenticated
    if (process.env.NODE_ENV === 'development') return null
    throw new Error('Supabase 인증 서비스에 연결할 수 없습니다.')
  }
}

/**
 * Get the authenticated user's role — with dev cookie bypass.
 * Returns the role string or null.
 */
export async function getAuthUserWithRole(): Promise<{
  id: string
  email?: string
  role: string | null
} | null> {
  // Dev-bypass cookie — return role from `active_role` cookie directly
  const bypass = await readDevBypass()
  if (bypass.active) {
    return {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      role: bypass.role || 'SUPER_ADMIN',
    }
  }

  const user = await getAuthUser()
  if (!user) return null

  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email ?? undefined,
      role: profile?.role ?? null,
    }
  } catch {
    return { id: user.id, email: user.email ?? undefined, role: null }
  }
}
