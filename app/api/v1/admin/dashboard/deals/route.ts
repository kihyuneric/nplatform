import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const STAGES = ['INTEREST', 'NDA', 'DUE_DILIGENCE', 'NEGOTIATION', 'CONTRACT', 'SETTLEMENT', 'COMPLETED']

export async function GET() {
  try {
    const supabase = await createClient()

    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') return NextResponse.json({ data: [], _mock: true })

    // Try contract_requests (deal_rooms) by current_stage or status
    const { data: deals } = await supabase
      .from('contract_requests')
      .select('status')

    if (deals && deals.length > 0) {
      const stageMap: Record<string, number> = {}
      STAGES.forEach((s) => { stageMap[s] = 0 })

      for (const d of deals) {
        const status = (d.status || '').toUpperCase()
        if (status in stageMap) {
          stageMap[status]++
        } else {
          // Map common statuses to pipeline stages
          if (['PENDING', 'SUBMITTED'].includes(status)) stageMap['INTEREST']++
          else if (status === 'REVIEWING') stageMap['DUE_DILIGENCE']++
          else if (status === 'ACCEPTED') stageMap['NEGOTIATION']++
          else if (['IN_PROGRESS', 'CLOSING'].includes(status)) stageMap['CONTRACT']++
          else if (status === 'SETTLED') stageMap['SETTLEMENT']++
          else if (['COMPLETED', 'CLOSED'].includes(status)) stageMap['COMPLETED']++
        }
      }

      const data = STAGES.map((stage) => ({
        stage,
        count: stageMap[stage],
      }))

      return NextResponse.json({ data })
    }

    return NextResponse.json({ data: [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
