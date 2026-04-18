export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getPathDetail } from '@/lib/ontology-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pathId = parseInt(id)
    if (isNaN(pathId)) {
      return NextResponse.json({ error: '유효하지 않은 ID' }, { status: 400 })
    }

    const pathDetail = await getPathDetail(pathId)
    return NextResponse.json(pathDetail)
  } catch (error) {
    console.error('[path/[id]] Error:', error)
    return NextResponse.json({ error: '경로 조회 실패' }, { status: 500 })
  }
}
