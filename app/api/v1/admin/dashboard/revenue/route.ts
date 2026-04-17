import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { Errors } from '@/lib/api-error'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (!authUser.role || !['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  try {
    const supabase = await createClient()

    // Monthly revenue from invoices (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const buildMonthMap = () => {
      const now = new Date()
      const monthMap: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap[key] = 0
      }
      return monthMap
    }

    const monthMapToData = (monthMap: Record<string, number>) =>
      Object.entries(monthMap).map(([key, revenue]) => ({
        month: `${parseInt(key.split('-')[1])}월`,
        revenue,
      }))

    // Try invoices table (payments)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('amount, created_at')
      .eq('status', 'PAID')
      .gte('created_at', sixMonthsAgo.toISOString())

    if (!invoicesError && invoices && invoices.length > 0) {
      const monthMap = buildMonthMap()
      for (const inv of invoices) {
        const d = new Date(inv.created_at as string)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in monthMap) monthMap[key] += Number(inv.amount) || 0
      }
      return NextResponse.json({ data: monthMapToData(monthMap), _source: 'invoices' })
    }

    // Try payments table
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'COMPLETED')
      .gte('created_at', sixMonthsAgo.toISOString())

    if (!paymentsError && payments && payments.length > 0) {
      const monthMap = buildMonthMap()
      for (const p of payments) {
        const d = new Date(p.created_at as string)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in monthMap) monthMap[key] += Number(p.amount) || 0
      }
      return NextResponse.json({ data: monthMapToData(monthMap), _source: 'payments' })
    }

    // Fallback: credit_transactions with positive amounts
    const { data: credits } = await supabase
      .from('credit_transactions')
      .select('amount, created_at')
      .gt('amount', 0)
      .gte('created_at', sixMonthsAgo.toISOString())

    if (credits && credits.length > 0) {
      const monthMap = buildMonthMap()
      for (const tx of credits) {
        const d = new Date(tx.created_at as string)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in monthMap) monthMap[key] += Number(tx.amount) || 0
      }
      return NextResponse.json({ data: monthMapToData(monthMap), _source: 'credit_transactions' })
    }

    return NextResponse.json({ data: [], _source: 'supabase' })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
