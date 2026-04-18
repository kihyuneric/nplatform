export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getConceptImportance } from '@/lib/ontology-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domain_id')
    const level = searchParams.get('level')
    const limit = searchParams.get('limit')

    const importance = await getConceptImportance(
      domainId ? parseInt(domainId) : undefined,
      level || undefined,
      limit ? parseInt(limit) : 50
    )

    return NextResponse.json({
      importance,
      total: importance.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, importance: [] }, { status: 500 })
  }
}
