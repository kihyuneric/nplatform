import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Dev mode: check for dev_user cookie (set by client-side dev login)
  const hasDevUser = request.cookies.get('dev_user_active')?.value === 'true'
  const isAuthenticated = !!user || hasDevUser

  // Protected routes
  const protectedPaths = ['/demand', '/deal-rooms', '/mypage', '/notifications', '/buyer', '/seller', '/partner', '/professional/my', '/settings']
  const adminPaths = ['/admin']
  const authPaths = ['/login', '/signup', '/select-role']

  const pathname = request.nextUrl.pathname

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authPaths.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirect unauthenticated users to login (skip in dev mode)
  if (!isAuthenticated && !hasDevUser && process.env.NODE_ENV !== 'development' && protectedPaths.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Admin route protection
  // Dev mode: allow admin access with dev_user cookie
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated && !hasDevUser && process.env.NODE_ENV !== 'development') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Check admin role via cookie (soft guard; real check in admin layout)
    const activeRole = request.cookies.get('active_role')?.value
    if (activeRole && !['SUPER_ADMIN', 'ADMIN'].includes(activeRole) && !hasDevUser && process.env.NODE_ENV !== 'development') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Role-based route protection (soft guard via active_role cookie)
  const activeRole = request.cookies.get('active_role')?.value
  if (activeRole && isAuthenticated) {
    // Seller routes require SELLER role
    if (pathname.startsWith('/seller') && !['SELLER', 'SUPER_ADMIN', 'ADMIN'].includes(activeRole)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    // Partner routes require PARTNER role
    if (pathname.startsWith('/partner') && !['PARTNER', 'SUPER_ADMIN', 'ADMIN'].includes(activeRole)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
