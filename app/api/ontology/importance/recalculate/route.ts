export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { recalculateAllImportance } from '@/lib/ontology-db'

export async function POST() {
  try {
    const result = await recalculateAllImportance()
    return NextResponse.json({ success: true, updated: result.updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
