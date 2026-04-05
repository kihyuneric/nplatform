// ============================================================
// hooks/useSubscription.ts
// 현재 사용자의 구독/크레딧 상태 훅
// ============================================================

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 ─────────────────────────────────────────────────

export interface SubscriptionInfo {
  plan_key:        string     // FREE|STARTER|PRO|PROFESSIONAL|INSTITUTION|FUND
  plan_name:       string
  status:          string     // active|trialing|canceled|past_due
  current_period_start: string | null
  current_period_end:   string | null
  cancel_at_period_end: boolean
  price_monthly:   number
  price_yearly:    number
  billing_cycle:   'monthly' | 'yearly'
  features:        string[]
}

export interface CreditInfo {
  balance:         number
  monthly_grant:   number     // 플랜 월 지급 크레딧
  used_this_month: number
}

export interface BillingInfo {
  subscription: SubscriptionInfo | null
  credits:      CreditInfo | null
  invoices:     UserInvoice[]
  loading:      boolean
  error:        string | null
  refetch:      () => void
}

export interface UserInvoice {
  id:             string
  invoice_number: string
  total:          number
  status:         string
  due_date:       string | null
  paid_at:        string | null
  pdf_url:        string | null
  created_at:     string
}

// ─── 플랜 정보 매핑 ───────────────────────────────────────

const PLAN_INFO: Record<string, { name: string; price_monthly: number; price_yearly: number; features: string[]; monthly_grant: number }> = {
  FREE: {
    name: '무료',
    price_monthly: 0,
    price_yearly: 0,
    features: ['매물 조회 10건/월', 'AI 분석 3회/월', '딜룸 1개'],
    monthly_grant: 50,
  },
  STARTER: {
    name: 'STARTER',
    price_monthly: 29_000,
    price_yearly: 23_200,
    features: ['매물 조회 50건/월', 'AI 분석 10회/월', '딜룸 3개'],
    monthly_grant: 150,
  },
  PRO: {
    name: 'PRO',
    price_monthly: 79_000,
    price_yearly: 63_200,
    features: ['무제한 매물 조회', 'AI 분석 100건/월', '딜룸 20개', '계약서 생성'],
    monthly_grant: 500,
  },
  PROFESSIONAL: {
    name: 'PROFESSIONAL',
    price_monthly: 199_000,
    price_yearly: 159_200,
    features: ['무제한 AI 분석', '법률 RAG', '딜룸 무제한', '전담 매니저'],
    monthly_grant: 2000,
  },
  INSTITUTION: {
    name: 'INSTITUTION',
    price_monthly: 499_000,
    price_yearly: 399_200,
    features: ['PROFESSIONAL 전체', 'API 무제한', '팀 50명', 'SLA 99.9%'],
    monthly_grant: 10000,
  },
  FUND: {
    name: 'FUND',
    price_monthly: 1_490_000,
    price_yearly: 1_192_000,
    features: ['INSTITUTION 전체', '펀드 운용 도구', 'LP 리포팅', '커스텀 연동'],
    monthly_grant: 50000,
  },
}

// ─── 훅 ──────────────────────────────────────────────────

export function useSubscription(): BillingInfo {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [credits,      setCredits]      = useState<CreditInfo | null>(null)
  const [invoices,     setInvoices]     = useState<UserInvoice[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [tick,         setTick]         = useState(0)

  const supabase = createClient()

  useEffect(() => {
    void fetchAll()
  }, [tick])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // 프로필에서 플랜 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_key, plan_status, plan_started_at, plan_expires_at, billing_cycle, cancel_at_period_end')
      .eq('id', user.id)
      .single()

    if (profile) {
      const planKey  = (profile.plan_key as string) || 'FREE'
      const planMeta = PLAN_INFO[planKey] ?? PLAN_INFO['FREE']!

      setSubscription({
        plan_key:             planKey,
        plan_name:            planMeta.name,
        status:               (profile.plan_status as string) || 'active',
        current_period_start: profile.plan_started_at as string | null,
        current_period_end:   profile.plan_expires_at as string | null,
        cancel_at_period_end: !!(profile.cancel_at_period_end),
        price_monthly:        planMeta.price_monthly,
        price_yearly:         planMeta.price_yearly,
        billing_cycle:        (profile.billing_cycle as 'monthly' | 'yearly') ?? 'monthly',
        features:             planMeta.features,
      })
    } else {
      // 기본 무료
      const free = PLAN_INFO['FREE']!
      setSubscription({
        plan_key: 'FREE', plan_name: '무료', status: 'active',
        current_period_start: null, current_period_end: null,
        cancel_at_period_end: false,
        price_monthly: free.price_monthly, price_yearly: free.price_yearly,
        billing_cycle: 'monthly', features: free.features,
      })
    }

    // 크레딧
    const { data: creditData } = await supabase
      .from('credit_balances')
      .select('balance, used_this_month')
      .eq('user_id', user.id)
      .single()

    const planKey2   = (profile?.plan_key as string) || 'FREE'
    const planMeta2  = PLAN_INFO[planKey2] ?? PLAN_INFO['FREE']!

    setCredits({
      balance:         (creditData?.balance as number) ?? 0,
      monthly_grant:   planMeta2.monthly_grant,
      used_this_month: (creditData?.used_this_month as number) ?? 0,
    })

    // 인보이스 (수수료 인보이스)
    const { data: invData } = await supabase
      .from('commission_invoices')
      .select('id, invoice_number, total, status, due_date, paid_at, pdf_url, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setInvoices((invData ?? []) as UserInvoice[])
    setLoading(false)
  }

  return {
    subscription,
    credits,
    invoices,
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  }
}

// ─── 플랜 업그레이드 가능 여부 ────────────────────────────

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'PROFESSIONAL', 'INSTITUTION', 'FUND']

export function isPlanHigher(current: string, target: string): boolean {
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current)
}

export function isPlanLower(current: string, target: string): boolean {
  return PLAN_ORDER.indexOf(target) < PLAN_ORDER.indexOf(current)
}

export function getPlanInfo(planKey: string) {
  return PLAN_INFO[planKey] ?? PLAN_INFO['FREE']!
}
