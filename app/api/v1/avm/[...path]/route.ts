import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'

/**
 * AVM v5.3 게이트웨이 프록시 (1차 검증 콘솔용).
 *
 * 검증 콘솔에서는 mock fallback을 쓰지 않는다 — 게이트웨이 연결 실패는
 * 502로 그대로 노출되어야 "개발이 제대로 되었는지"를 판정할 수 있다.
 */
const AVM_GATEWAY_URL = process.env.AVM_GATEWAY_URL ?? 'http://localhost:8000'

/** 개방 프록시 방지 — 게이트웨이의 공개 API 프리픽스만 허용 */
const ALLOWED_PREFIXES = [
  'api/valuation/v1/',
  'api/v4.4/',
  'api/v4.5/',
  'api/v4.6/',
]

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

async function proxy(req: NextRequest, params: { path: string[] }) {
  const user = await getAuthUserWithRole()
  if (!user || !ADMIN_ROLES.includes(user.role ?? '')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' } },
      { status: 403 },
    )
  }

  const path = params.path.join('/')
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.json(
      { error: { code: 'PATH_NOT_ALLOWED', message: `허용되지 않은 경로입니다: ${path}` } },
      { status: 400 },
    )
  }

  const url = `${AVM_GATEWAY_URL}/${path}${req.nextUrl.search}`
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : await req.text(),
      cache: 'no-store',
    })
    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (e) {
    // 연결 실패를 명시적으로 노출 (mock 금지)
    return NextResponse.json(
      {
        error: {
          code: 'AVM_GATEWAY_UNREACHABLE',
          message: `AVM 게이트웨이(${AVM_GATEWAY_URL})에 연결할 수 없습니다. uvicorn이 떠 있는지 확인하세요.`,
          detail: e instanceof Error ? e.message : String(e),
        },
      },
      { status: 502 },
    )
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params)
}
