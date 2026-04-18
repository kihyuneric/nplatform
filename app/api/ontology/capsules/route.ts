export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getLectureCapsules } from '@/lib/ontology-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const concept_id = searchParams.get('concept_id')
    const level = searchParams.get('level')
    const domain_id = searchParams.get('domain_id')

    const capsules = await getLectureCapsules({
      concept_id: concept_id ? parseInt(concept_id) : undefined,
      level: level || undefined,
      domain_id: domain_id ? parseInt(domain_id) : undefined,
    })

    return NextResponse.json({ capsules })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, capsules: [] }, { status: 500 })
  }
}
