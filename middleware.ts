import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitKey, rateLimitHeaders } from '@/lib/rate-limiter'

// ─── Route Definitions ────────────────────────────────

// Tier 1 only (기관투자자)
const EXCHANGE_PATHS = ['/exchange']

// 승인 완료 회원만 접근 가능한 경로
const PROTECTED_PATHS = [
  '/deals', '/my', '/analysis/new', '/analysis/ocr',
  '/exchange',
]

// 미승인 회원 리다이렉트 제외 경로 (공개 접근 가능)
const APPROVAL_EXEMPT = [
  '/pending-approval', '/guide', '/terms', '/support',
  '/news', '/notices', '/services', '/analysis', '/pricing',
]

// 기능 키 → 경로 매핑 (비활성 기능 접근 차단)
const FEATURE_ROUTES: Record<string, string[]> = {
  deal_bridge: ['/exchange', '/deals'],
  ocr_bulk: ['/exchange/bulk-upload'],
  analytics: ['/analysis/new', '/analysis/ocr'],
  community: ['/services/community'],
  professional: ['/services/experts'],
  matching: ['/deals/matching'],
}

// Rate Limit 유형별 경로
const RATE_LIMIT_ROUTES: Record<string, string[]> = {
  ai: ['/api/v1/ai/', '/api/v1/ocr/', '/api/v1/npl/profitability'],
  auth: ['/api/v1/auth/'],
  search: ['/api/v1/search', '/api/v1/market/search'],
}

// ─── Helpers ──────────────────────────────────────────

function getInvestorTier(request: NextRequest): string | null {
  return request.cookies.get('investor_tier')?.value || null
}

function getApprovalStatus(request: NextRequest): string | null {
  return request.cookies.get('approval_status')?.value || null
}

function getActiveRole(request: NextRequest): string | null {
  return request.cookies.get('active_role')?.value || null
}

function getDisabledFeatures(request: NextRequest): string[] {
  const raw = request.cookies.get('disabled_features')?.value
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function isPathMatch(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

function getRateLimitType(pathname: string): string {
  for (const [type, paths] of Object.entries(RATE_LIMIT_ROUTES)) {
    if (paths.some((p) => pathname.startsWith(p))) return type
  }
  return 'default'
}

// ─── Main Middleware ──────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // ── 1. API Rate Limiting (단일 실행 — 결과를 헤더 추가에도 재사용) ──
  let rlResult: Awaited<ReturnType<typeof checkRateLimit>> | null = null
  let rlLimitType = 'default'

  if (isApi) {
    const ip = getClientIP(request)
    rlLimitType = getRateLimitType(pathname)
    const key = getRateLimitKey(ip, pathname)
    rlResult = await Promise.resolve(checkRateLimit(key, rlLimitType))

    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' } },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rlResult.remaining, rlLimitType),
            'Retry-After': String(rlResult.retryAfter || 60),
          },
        }
      )
    }
  }

  // ── 2. Tier-based access control (Exchange) ───────
  if (isPathMatch(pathname, EXCHANGE_PATHS)) {
    const tier = getInvestorTier(request)

    if (tier === 'TIER2' || tier === 'TIER3') {
      const url = request.nextUrl.clone()
      url.pathname = '/my/settings'
      url.searchParams.set('reason', 'exchange_tier_required')
      url.searchParams.set('required', 'TIER1')
      return NextResponse.redirect(url)
    }

    if (tier === 'NONE') {
      const url = request.nextUrl.clone()
      url.pathname = '/my/settings'
      url.searchParams.set('reason', 'verification_required')
      return NextResponse.redirect(url)
    }
  }

  // ── 3. 승인 회원제 체크 ───────────────────────────
  // 쿠키가 명시적으로 PENDING/SUSPENDED인 경우만 차단 (없으면 통과)
  if (isPathMatch(pathname, PROTECTED_PATHS) && !isPathMatch(pathname, APPROVAL_EXEMPT)) {
    const approvalStatus = getApprovalStatus(request)

    if (approvalStatus === 'PENDING_APPROVAL') {
      const url = request.nextUrl.clone()
      url.pathname = '/pending-approval'
      return NextResponse.redirect(url)
    }

    if (approvalStatus === 'SUSPENDED') {
      const url = request.nextUrl.clone()
      url.pathname = '/pending-approval'
      url.searchParams.set('reason', 'suspended')
      return NextResponse.redirect(url)
    }
  }

  // ── 3.5. Admin route protection ──────────────────
  // Accepts EITHER real Supabase session OR dev-bypass cookie
  // (`dev_user_active=1` set by login page on admin/admin) so that
  // every feature can be verified without real auth during the
  // current verification phase.
  const hasDevBypass = request.cookies.get('dev_user_active')?.value === '1'

  if (!isApi && isPathMatch(pathname, ['/admin']) && process.env.NODE_ENV !== 'development') {
    const hasSupabaseSession = request.cookies.getAll().some(
      c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )

    if (!hasSupabaseSession && !hasDevBypass) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      url.searchParams.set('reason', 'admin_required')
      return NextResponse.redirect(url)
    }
  }

  // ── 3.6. Auth-required routes: only sensitive sub-paths require login ──
  // 정책 변경 (2026-04-27): /my 대시보드는 비로그인 시 샘플(체험) 데이터를 표시하므로
  // 미들웨어 redirect 에서 제외. 단, 본인 식별이 필수인 정산/실명/결제/세금/API
  // 키 등 고민감 sub-path 만 로그인 강제.
  const AUTH_REQUIRED = [
    '/my/billing',     // 결제·크레딧 (실 결제 내역)
    '/my/settlements', // 정산
    '/my/kyc',         // KYC 실명/사업자
    '/my/privacy',     // PII 열람 로그
    '/my/developer',   // API 키
  ]
  if (!isApi && isPathMatch(pathname, AUTH_REQUIRED) && process.env.NODE_ENV !== 'development') {
    const hasSupabaseSession = request.cookies.getAll().some(
      c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )

    if (!hasSupabaseSession && !hasDevBypass) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── 4. 기능 게이트 (비활성 기능 URL 접근 차단) ────
  const disabledFeatures = getDisabledFeatures(request)
  if (disabledFeatures.length > 0) {
    for (const [featureKey, routes] of Object.entries(FEATURE_ROUTES)) {
      if (disabledFeatures.includes(featureKey) && isPathMatch(pathname, routes)) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  // ── 5. Supabase session update + auth logic ───────
  const response = await updateSession(request)

  // ── 6. Security Headers ───────────────────────────
  const headers = response.headers

  // Per-request trace ID — propagated to handlers + logger + Sentry
  const existingId = request.headers.get('x-request-id')
  const requestId = existingId && /^[a-zA-Z0-9_-]{6,64}$/.test(existingId)
    ? existingId
    : crypto.randomUUID()
  headers.set('x-request-id', requestId)
  response.headers.set('x-request-id', requestId)

  // Generate a per-request nonce for CSP script-src (removes 'unsafe-inline' for scripts)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  headers.set('x-nonce', nonce)

  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-DNS-Prefetch-Control', 'on')
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  )

  // CSP — nonce-based script-src eliminates 'unsafe-inline' for scripts.
  // style-src retains 'unsafe-inline' because Tailwind CSS requires it.
  const isDev = process.env.NODE_ENV !== 'production'
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // dev: add 'unsafe-eval' for Next.js source maps (eval-based HMR)
      isDev
        ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
        : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Phase L · translate.googleapis.com 허용 (i18n 자동 번역)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.supabase.co https://api.anthropic.com https://api.openai.com https://translate.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      isDev ? "" : "upgrade-insecure-requests",
    ].filter(Boolean).join('; ')
  )

  // HSTS
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // ── 7. Rate limit headers for API responses (1번에서 저장된 결과 재사용) ──
  if (isApi && rlResult) {
    const rlHeaders = rateLimitHeaders(rlResult.remaining, rlLimitType)
    for (const [k, v] of Object.entries(rlHeaders)) {
      headers.set(k, v)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|html|json|manifest)$).*)',
  ],
}
