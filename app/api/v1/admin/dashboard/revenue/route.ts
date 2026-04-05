import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') return NextResponse.json({ data: [], _mock: true })

    // Monthly revenue from invoices (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, created_at')
      .eq('status', 'PAID')
      .gte('created_at', sixMonthsAgo.toISOString())

    if (invoices && invoices.length > 0) {
      const monthMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap[key] = 0
      }

      for (const inv of invoices) {
        const d = new Date(inv.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in monthMap) {
          monthMap[key] += Number(inv.amount) || 0
        }
      }

      const data = Object.entries(monthMap).map(([key, revenue]) => ({
        month: `${parseInt(key.split('-')[1])}월`,
        revenue,
      }))

      return NextResponse.json({ data })
    }

    // Fallback: try credit_transactions
    const { data: credits } = await supabase
      .from('credit_transactions')
      .select('amount, created_at')
      .gt('amount', 0)
      .gte('created_at', sixMonthsAgo.toISOString())

    if (credits && credits.length > 0) {
      const monthMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap[key] = 0
      }

      for (const tx of credits) {
        const d = new Date(tx.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in monthMap) {
          monthMap[key] += Number(tx.amount) || 0
        }
      }

      const data = Object.entries(monthMap).map(([key, revenue]) => ({
        month: `${parseInt(key.split('-')[1])}월`,
        revenue,
      }))

      return NextResponse.json({ data })
    }

    return NextResponse.json({ data: [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
