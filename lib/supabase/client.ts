import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client.
 *
 * ⚠️ 중요: 환경변수가 없더라도 throw하지 않는다.
 * UI가 import 시점에 crash 하지 않도록 placeholder 값으로 fallback.
 * 실제 네트워크 호출 시점에만 에러가 발생하므로, dev bypass 로그인(admin/admin)은
 * Supabase 없이도 동작해야 한다.
 *
 * Production에서는 반드시 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를
 * Vercel Environment Variables에 설정해야 auth/DB 기능이 동작한다.
 */

let warned = false

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    if (!warned && typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[Supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY가 없습니다. ' +
        '네트워크 호출은 실패하지만 dev bypass 로그인은 계속 동작합니다. ' +
        'Vercel Environment Variables를 설정하세요.'
      )
      warned = true
    }
    // Placeholder 값으로 createBrowserClient 호출 — import 시 throw 방지.
    // 실제 auth.signIn / from().select() 호출 시에는 네트워크 에러 발생하지만 try/catch로 잡을 수 있음.
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key-please-configure-vercel-env-vars'
    )
  }

  return createBrowserClient(url, key)
}
