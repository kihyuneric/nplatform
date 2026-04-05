import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MOCK_EARNINGS = {
  summary: {
    total_earned: 4850000,
    total_fee: 485000,
    total_net: 4365000,
    pending_settlement: 1200000,
    minimum_settlement: 100000,
  },
  earnings: [
    {
      id: 'earn-1',
      consultation_id: 'con-1',
      date: '2026-03-15',
      client_name: '이OO',
      service_name: 'NPL 채권 법률 자문',
      gross_amount: 300000,
      platform_fee: 30000,
      net_amount: 270000,
      status: 'SETTLED',
    },
    {
      id: 'earn-2',
      consultation_id: 'con-10',
      date: '2026-03-12',
      client_name: '박OO',
      service_name: '경매 권리분석',
      gross_amount: 200000,
      platform_fee: 20000,
      net_amount: 180000,
      status: 'SETTLED',
    },
    {
      id: 'earn-3',
      consultation_id: 'con-11',
      date: '2026-03-18',
      client_name: '김OO',
      service_name: '명도소송 대행',
      gross_amount: 1500000,
      platform_fee: 150000,
      net_amount: 1350000,
      status: 'PENDING',
    },
    {
      id: 'earn-4',
      consultation_id: 'con-12',
      date: '2026-03-08',
      client_name: '정OO',
      service_name: 'NPL 채권 법률 자문',
      gross_amount: 300000,
      platform_fee: 30000,
      net_amount: 270000,
      status: 'SETTLED',
    },
    {
      id: 'earn-5',
      consultation_id: 'con-13',
      date: '2026-03-20',
      client_name: '최OO',
      service_name: '경매 권리분석',
      gross_amount: 200000,
      platform_fee: 20000,
      net_amount: 180000,
      status: 'PENDING',
    },
  ],
  settlements: [
    {
      id: 'set-1',
      amount: 720000,
      fee: 72000,
      net: 648000,
      status: 'COMPLETED',
      requested_at: '2026-03-01T09:00:00Z',
      completed_at: '2026-03-03T15:00:00Z',
      bank: '국민은행',
      account_last4: '1234',
    },
    {
      id: 'set-2',
      amount: 450000,
      fee: 45000,
      net: 405000,
      status: 'COMPLETED',
      requested_at: '2026-02-15T09:00:00Z',
      completed_at: '2026-02-17T14:00:00Z',
      bank: '국민은행',
      account_last4: '1234',
    },
  ],
}

// GET - Professional earnings
export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') return NextResponse.json({ data: { ...MOCK_EARNINGS }, _mock: true })

    // Try to get professional profile
    const { data: professional, error: proErr } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (proErr || !professional) throw new Error('not_professional')

    // Get completed consultations as earnings
    const { data: consultations, error: conErr } = await supabase
      .from('consultations')
      .select(`
        id, created_at, status, rating,
        client:users!consultations_client_id_fkey(name),
        service:professional_services!consultations_service_id_fkey(name, price)
      `)
      .eq('professional_id', professional.id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })

    if (conErr) throw conErr

    const earnings = (consultations || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      consultation_id: c.id,
      date: c.created_at,
      client_name: ((c.client as Record<string, string>)?.name || '').replace(/(?<=.).(?=.)/g, 'O'),
      service_name: (c.service as Record<string, string>)?.name || '',
      gross_amount: Number((c.service as Record<string, number>)?.price) || 0,
      platform_fee: Math.round((Number((c.service as Record<string, number>)?.price) || 0) * 0.1),
      net_amount: Math.round((Number((c.service as Record<string, number>)?.price) || 0) * 0.9),
      status: 'SETTLED',
    }))

    const totalEarned = earnings.reduce((s: number, e: { gross_amount: number }) => s + e.gross_amount, 0)
    const totalFee = earnings.reduce((s: number, e: { platform_fee: number }) => s + e.platform_fee, 0)

    return NextResponse.json({
      data: {
        summary: {
          total_earned: totalEarned,
          total_fee: totalFee,
          total_net: totalEarned - totalFee,
          pending_settlement: 0,
          minimum_settlement: 100000,
        },
        earnings,
        settlements: [],
      },
      _source: 'supabase',
    })
  } catch {
    return NextResponse.json({ data: { ...MOCK_EARNINGS }, _mock: true })
  }
}
