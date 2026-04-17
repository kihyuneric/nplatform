import { createClient } from '@/lib/supabase/server'

/**
 * Get the authenticated user from Supabase.
 * Returns { id, email } or null if not authenticated.
 *
 * In development without Supabase configured, returns null (no implicit admin).
 */
export async function getAuthUser(): Promise<{ id: string; email?: string } | null> {
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
 * Get the authenticated user's role from the database.
 * Returns the role string or null.
 */
export async function getAuthUserWithRole(): Promise<{
  id: string
  email?: string
  role: string | null
} | null> {
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
