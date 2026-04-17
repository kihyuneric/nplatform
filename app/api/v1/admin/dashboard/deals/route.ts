import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { Errors } from '@/lib/api-error'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const STAGES = ['INTEREST', 'NDA', 'DUE_DILIGENCE', 'NEGOTIATION', 'CONTRACT', 'SETTLEMENT', 'COMPLETED']

export async function GET() {
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (!authUser.role || !['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  try {
    const supabase = await createClient()

    // Try deal_rooms table first
    const { data: dealRooms, error: dealRoomsError } = await supabase
      .from('deal_rooms')
      .select('status, stage')

    if (!dealRoomsError && dealRooms && dealRooms.length > 0) {
      const stageMap: Record<string, number> = {}
      STAGES.forEach((s) => { stageMap[s] = 0 })

      for (const d of dealRooms) {
        const stage = ((d.stage || d.status) as string || '').toUpperCase()
        if (stage in stageMap) {
          stageMap[stage]++
        } else {
          const status = (d.status as string || '').toUpperCase()
          if (['PENDING', 'SUBMITTED'].includes(status)) stageMap['INTEREST']++
          else if (status === 'REVIEWING') stageMap['DUE_DILIGENCE']++
          else if (status === 'ACCEPTED') stageMap['NEGOTIATION']++
          else if (['IN_PROGRESS', 'CLOSING'].includes(status)) stageMap['CONTRACT']++
          else if (status === 'SETTLED') stageMap['SETTLEMENT']++
          else if (['COMPLETED', 'CLOSED'].includes(status)) stageMap['COMPLETED']++
        }
      }

      const data = STAGES.map((stage) => ({ stage, count: stageMap[stage] }))
      return NextResponse.json({ data, _source: 'supabase' })
    }

    // Fallback: contract_requests table
    const { data: deals } = await supabase
      .from('contract_requests')
      .select('status')

    if (deals && deals.length > 0) {
      const stageMap: Record<string, number> = {}
      STAGES.forEach((s) => { stageMap[s] = 0 })

      for (const d of deals) {
        const status = ((d.status as string) || '').toUpperCase()
        if (status in stageMap) {
          stageMap[status]++
        } else {
          if (['PENDING', 'SUBMITTED'].includes(status)) stageMap['INTEREST']++
          else if (status === 'REVIEWING') stageMap['DUE_DILIGENCE']++
          else if (status === 'ACCEPTED') stageMap['NEGOTIATION']++
          else if (['IN_PROGRESS', 'CLOSING'].includes(status)) stageMap['CONTRACT']++
          else if (status === 'SETTLED') stageMap['SETTLEMENT']++
          else if (['COMPLETED', 'CLOSED'].includes(status)) stageMap['COMPLETED']++
        }
      }

      const data = STAGES.map((stage) => ({ stage, count: stageMap[stage] }))
      return NextResponse.json({ data, _source: 'supabase' })
    }

    return NextResponse.json({ data: [], _source: 'supabase' })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
