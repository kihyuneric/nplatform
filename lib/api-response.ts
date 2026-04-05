import { NextResponse } from 'next/server'

export function success<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...meta })
}

export function error(code: string, message: string, status: number = 400) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

export function unauthorized(message = '로그인이 필요합니다') {
  return NextResponse.json({ error: { code: 'UNAUTHORIZED', message } }, { status: 401 })
}

export function notFound(message = '리소스를 찾을 수 없습니다') {
  return NextResponse.json({ error: { code: 'NOT_FOUND', message } }, { status: 404 })
}

export function forbidden(message = '접근 권한이 없습니다') {
  return NextResponse.json({ error: { code: 'FORBIDDEN', message } }, { status: 403 })
}

export function validationError(details: unknown) {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', details } },
    { status: 400 }
  )
}
