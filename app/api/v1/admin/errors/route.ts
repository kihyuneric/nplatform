import { NextRequest, NextResponse } from 'next/server'
import { getErrors, updateErrorStatus, getErrorStats, trackError } from '@/lib/error-tracker'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const severity = searchParams.get('severity') || undefined
  const errors = getErrors({ status, severity })
  const stats = getErrorStats()
  return NextResponse.json({ data: errors, stats })
}

export async function PATCH(request: NextRequest) {
  const { id, status } = await request.json()
  updateErrorStatus(id, status)
  return NextResponse.json({ message: '상태가 변경되었습니다.' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  trackError(body)
  return NextResponse.json({ message: '에러가 기록되었습니다.' })
}
