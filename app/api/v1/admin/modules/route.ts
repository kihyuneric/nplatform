import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'

const moduleStates = new Map<string, boolean>()

export async function GET() {
  const modules = Array.from(moduleStates.entries()).map(([id, enabled]) => ({ id, enabled }))
  return NextResponse.json({ data: modules })
}

export async function PATCH(request: NextRequest) {
  try {
    const { moduleId, enabled } = await request.json()

    if (!moduleId || typeof enabled !== 'boolean') {
      return Errors.badRequest('moduleId (string) and enabled (boolean) are required')
    }

    moduleStates.set(moduleId, enabled)
    return NextResponse.json({
      data: { moduleId, enabled },
      message: '모듈 상태가 변경되었습니다.',
    })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
