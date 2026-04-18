import { NextRequest, NextResponse } from 'next/server'
import { getAllConfigs, setConfig, type ProviderKey } from '@/lib/runtime-config'

// GET /api/v1/admin/runtime-config — 현재 설정 전체 조회
export async function GET() {
  const configs = await getAllConfigs()
  return NextResponse.json({ success: true, data: configs })
}

// PATCH /api/v1/admin/runtime-config — 설정 단건 변경
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { key, value } = body

  if (!key || value === undefined) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'key and value are required' } },
      { status: 400 }
    )
  }

  const validKeys: ProviderKey[] = [
    'ai_provider', 'embedding_provider', 'payment_provider',
    'ocr_mode', 'registry_mode', 'market_data_mode',
  ]
  if (!validKeys.includes(key)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: `Invalid key: ${key}` } },
      { status: 400 }
    )
  }

  await setConfig(key, String(value), 'admin')

  return NextResponse.json({
    success: true,
    data: { key, value, updatedAt: new Date().toISOString() },
    message: `${key} → ${value} 로 변경되었습니다. 5분 내 전체 인스턴스에 반영됩니다.`,
  })
}
