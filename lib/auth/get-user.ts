import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@nplatform.dev',
  role: 'SUPER_ADMIN',
}

/**
 * Get the authenticated user from Supabase or dev cookie.
 * Returns { id, email } or null if not authenticated.
 */
export async function getAuthUser(): Promise<{ id: string; email?: string } | null> {
  // Check dev login cookie first
  const cookieStore = await cookies()
  if (cookieStore.get('dev_user_active')?.value === 'true') {
    return DEV_USER
  }

  // Fall back to Supabase auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
