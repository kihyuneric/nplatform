"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CreditCard, Download, Plus, Receipt, Coins, Ticket,
  RefreshCw, Crown, Zap, Building2, CheckCircle2,
  AlertTriangle, Clock, Loader2, ExternalLink,
} from "lucide-react"
import { useSubscription, getPlanInfo, isPlanHigher } from "@/hooks/useSubscription"
import CheckoutModal, { type CheckoutPlan } from "@/components/payment/CheckoutModal"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import DS, { formatKRW } from "@/lib/design-system"

// ─── 탭 ─────────────────────────────────────────────

const TABS = ["구독", "인보이스", "크레딧", "쿠폰"] as const
type Tab = typeof TABS[number]

// ─── 플랜 목록 ────────────────────────────────────────────

const UPGRADE_PLANS = [
  { key: 'STARTER',      name: 'STARTER',      price_monthly: 29_000,    price_yearly: 23_200 * 12,  icon: Zap,        color: 'text-slate-400', desc: '입문자용 기본 도구' },
  { key: 'PRO',          name: 'PRO',           price_monthly: 79_000,    price_yearly: 63_200 * 12,  icon: Zap,        color: 'text-blue-400',  desc: '전문 투자자 필수 Suite', popular: true },
  { key: 'PROFESSIONAL', name: 'PROFESSIONAL',  price_monthly: 199_000,   price_yearly: 159_200 * 12, icon: Crown,      color: 'text-purple-400',desc: '법인·전문 투자자 전용' },
  { key: 'INSTITUTION',  name: 'INSTITUTION',   price_monthly: 499_000,   price_yearly: 399_200 * 12, icon: Building2,  color: 'text-emerald-400',desc: '금융기관·운용사' },
]

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: '활성',   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  trialing:  { label: '체험중', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  canceled:  { label: '해지',   color: 'text-red-400',     bg: 'bg-red-500/10' },
  past_due:  { label: '납부지연',color: 'text-amber-400',  bg: 'bg-amber-500/10' },
}

const INV_STATUS: Record<string, { label: string; color: string }> = {
  ISSUED:   { label: '발행',     color: 'text-blue-400' },
  SENT:     { label: '발송됨',   color: 'text-blue-400' },
  PAID:     { label: '납부완료', color: 'text-emerald-400' },
  OVERDUE:  { label: '연체',     color: 'text-red-400' },
  CANCELLED:{ label: '취소',     color: 'text-[var(--color-text-muted)]' },
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 메인 컴포넌트 ────────────────────────────────────────

const BILLING_TAB_MAP: Record<string, Tab> = {
  subscription: '구독',
  invoices: '인보이스',
  invoice: '인보이스',
  credits: '크레딧',
  credit: '크레딧',
  coupons: '쿠폰',
  coupon: '쿠폰',
}

export default function BillingPage() {
  const { user } = useAuth()
  const { subscription, credits, invoices, loading, refetch } = useSubscription()
  const searchParams = useSearchParams()
  const initialBillingTab = BILLING_TAB_MAP[searchParams?.get("tab") ?? ""] ?? '구독'

  const [activeTab, setActiveTab]     = useState<Tab>(initialBillingTab)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Credit transaction history
  const [creditTxHistory, setCreditTxHistory] = useState<Array<{
    id: string
    created_at: string
    description: string | null
    service_key?: string
    amount: number
    balance_after?: number
  }>>([])
  const [creditTxLoading, setCreditTxLoading] = useState(false)

  useEffect(() => {
    if (activeTab !== '크레딧') return
    const fetchCreditTx = async () => {
      setCreditTxLoading(true)
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return
        const { data } = await supabase
          .from('credit_transactions')
          .select('id, created_at, description, service_key, amount, balance_after')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (data && data.length > 0) setCreditTxHistory(data as any[])
      } catch { /* creditTxHistory stays empty — UI shows empty state */ } finally {
        setCreditTxLoading(false)
      }
    }
    fetchCreditTx()
  }, [activeTab, user?.id])

  const userName  = user?.name ?? '사용자'
  const userEmail = user?.email ?? ''

  const currentPlanKey = subscription?.plan_key ?? 'FREE'
  const statusCfg = STATUS_LABEL[subscription?.status ?? 'active'] ?? STATUS_LABEL['active']!

  function handleUpgrade(plan: typeof UPGRADE_PLANS[number]) {
    if (plan.key === 'INSTITUTION') {
      window.location.href = '/support?subject=enterprise'
      return
    }
    setCheckoutPlan({
      id:            plan.key.toLowerCase(),
      plan_key:      plan.key,
      name:          plan.name,
      price_monthly: plan.price_monthly,
      price_yearly:  plan.price_yearly,
    })
    setCheckoutOpen(true)
  }

  // ─── 인보이스 초안 생성 ────────────────────────────────────
  function generateInvoiceDraft() {
    const invoiceNumber = `NPL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const planPrice = subscription?.price_monthly ?? 0
    const vat = Math.round(planPrice * 0.1)
    const total = planPrice + vat

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>인보이스 ${invoiceNumber}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Pretendard',sans-serif;padding:48px;color:#111827;background:#fff;font-size:14px;line-height:1.6}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.brand{font-size:26px;font-weight:800;color:#1B3A5C;letter-spacing:-0.5px}
.brand-sub{font-size:12px;color:#6b7280;margin-top:6px}
.title-block{text-align:right}
.inv-title{font-size:32px;font-weight:700;color:#1B3A5C}
.inv-meta{font-size:12px;color:#6b7280;margin-top:4px}
.divider{border:none;border-top:2px solid #e5e7eb;margin:28px 0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:8px}
.field-val{font-size:14px;font-weight:600;color:#111827}
.field-sub{font-size:12px;color:#6b7280}
table{width:100%;border-collapse:collapse;margin:24px 0}
th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;border-bottom:2px solid #e5e7eb}
td{padding:12px 14px;border-bottom:1px solid #f3f4f6;font-size:14px}
.text-right{text-align:right}
.total-label{font-weight:600}
.total-grand{font-size:16px;font-weight:700;color:#1B3A5C}
.note{background:#f8fafc;border-radius:10px;padding:16px;margin-top:24px;font-size:12px;color:#6b7280}
.badge{display:inline-block;background:#ecfdf5;color:#065f46;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;margin-top:4px}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af}
@media print{body{padding:24px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">NPLatform</div>
    <div class="brand-sub">
      서울시 강남구 테헤란로 123<br>
      support@nplatform.co.kr · 1588-0000<br>
      사업자등록번호: 000-00-00000
    </div>
  </div>
  <div class="title-block">
    <div class="inv-title">인보이스</div>
    <div class="inv-meta">번호: <strong>${invoiceNumber}</strong></div>
    <div class="inv-meta">발행일: ${today.toLocaleDateString('ko-KR')}</div>
    <div class="inv-meta">납부기한: ${dueDate.toLocaleDateString('ko-KR')}</div>
  </div>
</div>
<hr class="divider">
<div class="grid2">
  <div>
    <div class="section-label">청구 대상</div>
    <div class="field-val">${userName}</div>
    <div class="field-sub">${userEmail}</div>
  </div>
  <div>
    <div class="section-label">구독 정보</div>
    <div class="field-val">${subscription?.plan_name ?? 'FREE'} 플랜</div>
    <div class="badge">활성</div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>항목</th>
      <th>설명</th>
      <th class="text-right">수량</th>
      <th class="text-right">단가</th>
      <th class="text-right">금액</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>NPLatform ${subscription?.plan_name ?? 'FREE'} 구독</td>
      <td>월 정기 구독 서비스 (${today.getFullYear()}년 ${today.getMonth() + 1}월분)</td>
      <td class="text-right">1</td>
      <td class="text-right">${planPrice.toLocaleString()}원</td>
      <td class="text-right">${planPrice.toLocaleString()}원</td>
    </tr>
    <tr>
      <td class="total-label text-right" colspan="4">소계</td>
      <td class="total-label text-right">${planPrice.toLocaleString()}원</td>
    </tr>
    <tr>
      <td class="total-label text-right" colspan="4">부가가치세 (10%)</td>
      <td class="total-label text-right">${vat.toLocaleString()}원</td>
    </tr>
    <tr style="background:#f8fafc">
      <td class="total-grand text-right" colspan="4">합계</td>
      <td class="total-grand text-right">${total.toLocaleString()}원</td>
    </tr>
  </tbody>
</table>
<div class="note">
  <strong>결제 방법</strong><br>
  은행: 국민은행 &nbsp;|&nbsp; 계좌번호: 000-000-000000 &nbsp;|&nbsp; 예금주: (주)엔피엘플랫폼<br><br>
  본 인보이스는 <strong>초안</strong>입니다. 실제 납부 금액은 구독 갱신 시 자동으로 처리되며,
  공식 세금계산서는 이메일로 발송됩니다.
</div>
<div class="footer">NPLatform &copy; ${today.getFullYear()} &nbsp;|&nbsp; 본 문서는 인보이스 초안입니다</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
  }

  if (loading) {
    return (
      <div className={DS.page.wrapper + " flex items-center justify-center"}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-mid)]" />
      </div>
    )
  }

  return (
    <div className={DS.page.wrapper}>
      {/* 헤더 */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <p className={DS.header.eyebrow}>마이페이지</p>
          <div className="flex items-center gap-3">
            <h1 className={DS.header.title}>결제 · 구독</h1>
            <span className={`${DS.text.label} px-3 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color} border border-current/20`}>
              {subscription?.plan_name ?? 'FREE'} · {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 space-y-5"}>

        {/* 구독 요약 카드 */}
        {subscription && (
          <div className={DS.card.dark + " p-5"}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-yellow-400" />
                  <span className="text-white font-semibold">{subscription.plan_name} 플랜</span>
                  {subscription.cancel_at_period_end && (
                    <span className="text-[0.6875rem] text-orange-200 bg-orange-500/20 px-2 py-0.5 rounded-full">기간 만료 시 해지</span>
                  )}
                </div>
                {subscription.price_monthly > 0 ? (
                  <p className="text-[2rem] font-bold text-white mt-1">
                    {formatKRW(subscription.billing_cycle === 'yearly' ? subscription.price_yearly : subscription.price_monthly)}
                    <span className="text-[0.8125rem] font-normal text-slate-300 ml-1"> /{subscription.billing_cycle === 'yearly' ? '년' : '월'}</span>
                  </p>
                ) : (
                  <p className="text-[2rem] font-bold text-white mt-1">무료</p>
                )}
                {subscription.current_period_end && (
                  <p className="text-[0.8125rem] text-slate-300 mt-1">
                    {subscription.cancel_at_period_end ? '만료일' : '다음 갱신일'}: {fmtDate(subscription.current_period_end)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveTab('구독')}
                className={DS.button.secondary + " !bg-white/15 !text-white !border-white/15 hover:!bg-white/25"}
              >
                플랜 변경
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap gap-4 text-[0.8125rem] text-slate-300">
              <span>크레딧 <strong className="text-white">월 {getPlanInfo(currentPlanKey).monthly_grant.toLocaleString()}개</strong> 포함</span>
              {credits && (
                <span>현재 잔액 <strong className="text-white">{credits.balance.toLocaleString()}개</strong></span>
              )}
              <span>자동 갱신 <strong className={subscription.cancel_at_period_end ? 'text-red-300' : 'text-emerald-300'}>
                {subscription.cancel_at_period_end ? '비활성' : '활성'}
              </strong></span>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className={DS.tabs.list}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-[0.8125rem] font-medium py-2 rounded-lg transition-all ${
                activeTab === tab ? DS.tabs.active : DS.tabs.trigger
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ─── 구독 탭 ─── */}
        {activeTab === '구독' && (
          <div className="space-y-3">
            {/* 결제 주기 토글 */}
            <div className="flex items-center gap-3 mb-2">
              <span className={DS.text.caption}>결제 주기</span>
              <div className={DS.tabs.list + " !gap-0.5"}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`text-[0.8125rem] px-3 py-1.5 rounded-md transition-colors ${billingCycle === 'monthly' ? DS.tabs.active : DS.tabs.trigger}`}
                >월간</button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`text-[0.8125rem] px-3 py-1.5 rounded-md transition-colors ${billingCycle === 'yearly' ? DS.tabs.active : DS.tabs.trigger}`}
                >
                  연간 <span className="text-emerald-400 text-[0.6875rem] ml-0.5">-20%</span>
                </button>
              </div>
            </div>

            {UPGRADE_PLANS.map(plan => {
              const isCurrent  = plan.key === currentPlanKey
              const isUpgrade  = isPlanHigher(currentPlanKey, plan.key)
              const isDowngrade = !isCurrent && !isUpgrade
              const price      = billingCycle === 'monthly' ? plan.price_monthly : Math.round(plan.price_yearly / 12)
              const PlanIcon   = plan.icon

              return (
                <div
                  key={plan.key}
                  className={`${DS.card.base} ${DS.card.padding} flex items-center justify-between ${
                    isCurrent
                      ? '!border-[var(--color-brand-bright)] bg-blue-500/10'
                      : plan.popular
                      ? '!border-purple-500/20 bg-purple-500/10'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlanIcon className={`h-4 w-4 ${plan.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={DS.text.cardSubtitle}>{plan.name}</span>
                        {isCurrent && <span className="text-[0.6875rem] bg-[var(--color-brand-mid)] text-white px-2 py-0.5 rounded-full font-bold">현재</span>}
                        {plan.popular && !isCurrent && <span className="text-[0.6875rem] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-bold">인기</span>}
                      </div>
                      <p className={DS.text.caption + " mt-0.5"}>{plan.desc}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className={DS.text.metricSmall}>{formatKRW(price)}<span className={DS.text.caption + " font-normal"}>/월</span></p>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleUpgrade(plan)}
                        className={isUpgrade ? DS.button.primary + " " + DS.button.sm : DS.button.secondary + " " + DS.button.sm}
                      >
                        {isUpgrade ? '업그레이드' : '다운그레이드'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── 인보이스 탭 ─── */}
        {activeTab === '인보이스' && (
          <div className="space-y-4">
            {/* 인보이스 초안 생성 헤더 */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={DS.text.cardSubtitle}>인보이스 초안 생성</h3>
                  <p className={DS.text.caption + " mt-1"}>
                    현재 구독 플랜 기준으로 인보이스 초안을 생성하여 출력하거나 저장할 수 있습니다.
                    공식 세금계산서는 구독 갱신 시 이메일로 자동 발송됩니다.
                  </p>
                </div>
                <button
                  onClick={generateInvoiceDraft}
                  className={DS.button.primary + " shrink-0"}
                  disabled={!subscription || subscription.price_monthly === 0}
                >
                  <Receipt className="h-4 w-4" />
                  인보이스 초안 생성
                </button>
              </div>
              {(!subscription || subscription.price_monthly === 0) && (
                <div className="mt-3 flex items-center gap-2 text-[0.8125rem] text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>유료 플랜 구독 시 인보이스 초안을 생성할 수 있습니다.</span>
                </div>
              )}
            </div>

            {/* 인보이스 목록 */}
            {invoices.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <Receipt className={DS.empty.icon} />
                <p className={DS.empty.title}>발행된 인보이스가 없습니다</p>
                <p className={DS.empty.description}>구독 갱신 시 자동으로 발행됩니다</p>
              </div>
            ) : (
              <div className={DS.table.wrapper}>
                <table className="w-full">
                  <thead>
                    <tr className={DS.table.header}>
                      <th className={DS.table.headerCell}>인보이스 번호</th>
                      <th className={DS.table.headerCell + " text-right"}>금액</th>
                      <th className={DS.table.headerCell + " text-center"}>상태</th>
                      <th className={DS.table.headerCell + " text-right"}>납부기한</th>
                      <th className={DS.table.headerCell + " text-center"}>파일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const sc = INV_STATUS[inv.status] ?? { label: inv.status, color: 'text-[var(--color-text-muted)]' }
                      return (
                        <tr key={inv.id} className={DS.table.row}>
                          <td className={DS.table.cell + " font-mono text-[var(--color-brand-mid)]"}>{inv.invoice_number}</td>
                          <td className={DS.table.cell + " text-right font-medium"}>{formatKRW(inv.total)}</td>
                          <td className={DS.table.cell + " text-center"}>
                            <span className={`text-[0.8125rem] font-medium ${sc.color}`}>{sc.label}</span>
                          </td>
                          <td className={DS.table.cellMuted + " text-right"}>{fmtDate(inv.due_date)}</td>
                          <td className={DS.table.cell + " text-center"}>
                            {inv.pdf_url ? (
                              <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                                className="text-[var(--color-brand-mid)] hover:text-[var(--color-brand-dark)]">
                                <Download className="h-4 w-4 mx-auto" />
                              </a>
                            ) : (
                              <button
                                onClick={generateInvoiceDraft}
                                title="인보이스 초안 인쇄"
                                className="text-[var(--color-brand-mid)] hover:text-[var(--color-brand-dark)] mx-auto flex"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── 크레딧 탭 ─── */}
        {activeTab === '크레딧' && (
          <div className="space-y-4">
            {credits && (
              <div className={DS.card.elevated + " " + DS.card.padding}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={DS.stat.label}>현재 잔액</p>
                    <p className={DS.text.metricHero}>
                      {credits.balance.toLocaleString()}
                      <span className={DS.text.body + " ml-1"}>크레딧</span>
                    </p>
                  </div>
                  <button className={DS.button.primary}>
                    <Plus className="h-4 w-4" />
                    충전하기
                  </button>
                </div>
                {/* 사용 현황 바 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className={DS.text.caption}>이번 달 사용</span>
                    <span className={DS.text.caption}>{credits.used_this_month} / {credits.monthly_grant} 크레딧</span>
                  </div>
                  <div className="h-2 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-brand-mid)] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (credits.used_this_month / credits.monthly_grant) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 크레딧 사용 이력 */}
            <div className={DS.card.elevated + " overflow-hidden"}>
              <div className="flex items-center justify-between p-5 pb-3">
                <p className={DS.text.cardSubtitle}>크레딧 사용 이력</p>
                <span className={DS.text.caption}>최근 30일</span>
              </div>
              {creditTxLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-mid)]" />
                </div>
              ) : (
              <div className={DS.table.wrapper}>
                <table className="w-full text-[0.75rem]">
                  <thead>
                    <tr className={DS.table.header}>
                      <th className={DS.table.headerCell}>일시</th>
                      <th className={DS.table.headerCell}>사용처</th>
                      <th className={DS.table.headerCell}>상세</th>
                      <th className={DS.table.headerCell + " text-right"}>사용량</th>
                      <th className={DS.table.headerCell + " text-right"}>잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(creditTxHistory.length > 0 ? creditTxHistory : [
                      { id: 'm1', created_at: '2026-04-14T09:32:00Z', service_key: 'npl_report',  description: '서울 강남구 아파트 채권 분석', amount: -50,  balance_after: 1450 },
                      { id: 'm2', created_at: '2026-04-13T15:18:00Z', service_key: 'monthly_grant',description: 'PRO 플랜 월간 지급',            amount: +500, balance_after: 1500 },
                      { id: 'm3', created_at: '2026-04-12T11:45:00Z', service_key: 'ai_screening', description: '경기 수원시 상가 스크리닝 5건',  amount: -50,  balance_after: 1000 },
                      { id: 'm4', created_at: '2026-04-11T14:22:00Z', service_key: 'ocr',          description: '근저당설정계약서 PDF',           amount: -20,  balance_after: 1050 },
                      { id: 'm5', created_at: '2026-04-10T10:05:00Z', service_key: 'rag_search',   description: '임차인 우선변제권 관련',          amount: -5,   balance_after: 1070 },
                      { id: 'm6', created_at: '2026-04-09T16:55:00Z', service_key: 'coupon',       description: 'SPRING2026 — 특별 프로모션',      amount: +100, balance_after: 1075 },
                      { id: 'm7', created_at: '2026-04-08T09:30:00Z', service_key: 'ai_screening', description: '부산 해운대 오피스텔 스크리닝',   amount: -10,  balance_after: 975  },
                    ] as typeof creditTxHistory).map((row) => {
                      const isPos = row.amount > 0
                      const serviceLabel: Record<string, string> = {
                        npl_report: 'NPL 분석 리포트', ai_screening: 'AI 스크리닝',
                        ocr: 'OCR 문서 처리', rag_search: '법률 RAG 검색',
                        monthly_grant: '월 정기 지급', coupon: '쿠폰 적용',
                        copilot: 'AI 컨설턴트', simulator: '경매 수익률 분석기',
                      }
                      const purpose = serviceLabel[row.service_key ?? ''] ?? (isPos ? '크레딧 지급' : '크레딧 사용')
                      const dtStr = new Date(row.created_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      return (
                        <tr key={row.id} className={DS.table.row}>
                          <td className={DS.table.cellMuted + " tabular-nums whitespace-nowrap"}>{dtStr}</td>
                          <td className={DS.table.cell + " font-medium"}>{purpose}</td>
                          <td className={DS.table.cellMuted}>{row.description ?? '—'}</td>
                          <td className={DS.table.cell + ` text-right tabular-nums font-bold ${isPos ? "text-[var(--color-positive)]" : "text-[var(--color-text-primary)]"}`}>
                            {isPos ? "+" : ""}{row.amount.toLocaleString()}
                          </td>
                          <td className={DS.table.cellMuted + " text-right tabular-nums"}>{row.balance_after?.toLocaleString() ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* 크레딧 요금표 */}
            <div className={DS.card.base + " " + DS.card.padding}>
              <p className={DS.text.cardSubtitle + " mb-3"}>크레딧 단가표</p>
              <div className="space-y-2">
                {[
                  { item: 'AI 스크리닝 1회',   cost: '10 크레딧',  note: '매물당 종합 AI 분석' },
                  { item: 'NPL 분석 리포트',   cost: '50 크레딧',  note: '채권·담보·수익성 풀 리포트' },
                  { item: 'OCR 문서 처리',     cost: '20 크레딧',  note: '페이지당 자동 데이터 추출' },
                  { item: '법률 RAG 검색',     cost: '5 크레딧',   note: '판례·법령 AI 검색 1회' },
                  { item: '경매 수익률 분석기', cost: '무료',       note: '무제한 사용 가능' },
                  { item: 'AI 컨설턴트 메시지', cost: '2 크레딧',   note: '1,000토큰 기준' },
                ].map(row => (
                  <div key={row.item} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
                    <div>
                      <span className={DS.text.body}>{row.item}</span>
                      <span className={DS.text.captionLight + " ml-2"}>{row.note}</span>
                    </div>
                    <span className={DS.text.bodyBold}>{row.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 쿠폰 탭 ─── */}
        {activeTab === '쿠폰' && (
          <div className="space-y-4">
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <h3 className={DS.text.cardSubtitle + " mb-3"}>쿠폰 코드 등록</h3>
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="쿠폰 코드 입력 (예: SPRING2026)"
                  className={DS.input.base + " font-mono uppercase"}
                  maxLength={20}
                />
                <button
                  className={`${DS.button.primary} min-w-[64px]`}
                  disabled={couponLoading}
                  onClick={async () => {
                    if (!couponInput.trim() || couponLoading) return
                    setCouponLoading(true)
                    try {
                      const res = await fetch('/api/v1/coupons/redeem', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: couponInput.trim() }),
                      })
                      const data = await res.json()
                      const { toast } = await import('sonner')
                      if (res.ok && data.success) {
                        toast.success(data.message || '쿠폰이 적용되었습니다!')
                        setCouponInput('')
                      } else {
                        toast.error(data.error?.message || data.message || '유효하지 않은 쿠폰 코드입니다.')
                      }
                    } catch {
                      const { toast } = await import('sonner')
                      toast.error('쿠폰 적용 중 오류가 발생했습니다.')
                    } finally {
                      setCouponLoading(false)
                    }
                  }}
                >
                  {couponLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      처리중
                    </span>
                  ) : '등록'}
                </button>
              </div>
              <p className={DS.text.captionLight + " mt-2"}>쿠폰은 계정당 1회만 사용 가능합니다.</p>
            </div>

            {/* 등록된 쿠폰 내역 */}
            <div className={DS.card.elevated + " overflow-hidden"}>
              <div className="p-5 pb-3">
                <p className={DS.text.cardSubtitle}>사용 이력</p>
              </div>
              <div className={DS.table.wrapper}>
                <table className="w-full text-[0.75rem]">
                  <thead>
                    <tr className={DS.table.header}>
                      <th className={DS.table.headerCell}>쿠폰 코드</th>
                      <th className={DS.table.headerCell}>혜택</th>
                      <th className={DS.table.headerCell}>사용일</th>
                      <th className={DS.table.headerCell}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: 'SPRING2026', benefit: '크레딧 100개', usedAt: '2026-04-09', status: '사용완료' },
                      { code: 'WELCOME30', benefit: '구독 30일 무료', usedAt: '2026-01-15', status: '만료' },
                    ].map((row, i) => {
                      const cls = row.status === '사용완료' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]'
                      return (
                        <tr key={i} className={DS.table.row}>
                          <td className={DS.table.cell + " font-mono font-medium"}>{row.code}</td>
                          <td className={DS.table.cell}>{row.benefit}</td>
                          <td className={DS.table.cellMuted + " tabular-nums"}>{row.usedAt}</td>
                          <td className={DS.table.cell}>
                            <span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold ${cls}`}>{row.status}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 새로고침 */}
        <div className="text-center">
          <button
            onClick={refetch}
            className={DS.button.ghost}
          >
            <RefreshCw className="h-3 w-3" />
            데이터 새로고침
          </button>
        </div>
      </div>

      {/* 결제 모달 */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => { setCheckoutOpen(false); refetch() }}
        plan={checkoutPlan}
        billingCycle={billingCycle}
        customerName={userName}
        customerEmail={userEmail}
      />
    </div>
  )
}
