"use client"

import { useState } from "react"
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
import DS, { formatKRW } from "@/lib/design-system"

// ─── 탭 ─────────────────────────────────────────────

const TABS = ["구독", "인보이스", "크레딧", "쿠폰"] as const
type Tab = typeof TABS[number]

// ─── 플랜 목록 ────────────────────────────────────────────

const UPGRADE_PLANS = [
  { key: 'STARTER',      name: 'STARTER',      price_monthly: 29_000,    price_yearly: 23_200 * 12,  icon: Zap,        color: 'text-slate-500', desc: '입문자용 기본 도구' },
  { key: 'PRO',          name: 'PRO',           price_monthly: 79_000,    price_yearly: 63_200 * 12,  icon: Zap,        color: 'text-blue-600',  desc: '전문 투자자 필수 Suite', popular: true },
  { key: 'PROFESSIONAL', name: 'PROFESSIONAL',  price_monthly: 199_000,   price_yearly: 159_200 * 12, icon: Crown,      color: 'text-purple-600',desc: '법인·전문 투자자 전용' },
  { key: 'INSTITUTION',  name: 'INSTITUTION',   price_monthly: 499_000,   price_yearly: 399_200 * 12, icon: Building2,  color: 'text-emerald-600',desc: '금융기관·운용사' },
]

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: '활성',   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  trialing:  { label: '체험중', color: 'text-blue-700',    bg: 'bg-blue-50' },
  canceled:  { label: '해지',   color: 'text-red-700',     bg: 'bg-red-50' },
  past_due:  { label: '납부지연',color: 'text-amber-700',  bg: 'bg-amber-50' },
}

const INV_STATUS: Record<string, { label: string; color: string }> = {
  ISSUED:   { label: '발행',     color: 'text-blue-600' },
  SENT:     { label: '발송됨',   color: 'text-blue-600' },
  PAID:     { label: '납부완료', color: 'text-emerald-600' },
  OVERDUE:  { label: '연체',     color: 'text-red-600' },
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

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
                  연간 <span className="text-emerald-600 text-[0.6875rem] ml-0.5">-20%</span>
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
                      ? '!border-[var(--color-brand-bright)] bg-blue-50'
                      : plan.popular
                      ? '!border-purple-200 bg-purple-50/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlanIcon className={`h-4 w-4 ${plan.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={DS.text.cardSubtitle}>{plan.name}</span>
                        {isCurrent && <span className="text-[0.6875rem] bg-[var(--color-brand-mid)] text-white px-2 py-0.5 rounded-full font-bold">현재</span>}
                        {plan.popular && !isCurrent && <span className="text-[0.6875rem] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">인기</span>}
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
          <div>
            {invoices.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <Receipt className={DS.empty.icon} />
                <p className={DS.empty.title}>발행된 인보이스가 없습니다</p>
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
                            ) : <span className={DS.text.muted}>—</span>}
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
            <div className={DS.card.base + " " + DS.card.padding}>
              <p className={DS.text.cardSubtitle + " mb-3"}>크레딧 사용처</p>
              <div className="space-y-2">
                {[
                  ['AI 스크리닝 1회', '10 크레딧'],
                  ['NPL 분석 리포트', '50 크레딧'],
                  ['OCR 문서 처리', '20 크레딧'],
                  ['법률 RAG 검색', '5 크레딧'],
                  ['경매 시뮬레이터', '무료'],
                ].map(([item, cost]) => (
                  <div key={item} className="flex justify-between">
                    <span className={DS.text.body}>{item}</span>
                    <span className={DS.text.bodyBold}>{cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 쿠폰 탭 ─── */}
        {activeTab === '쿠폰' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                placeholder="쿠폰 코드 입력"
                className={DS.input.base}
              />
              <button className={DS.button.primary}>
                등록
              </button>
            </div>
            <div className={DS.empty.wrapper}>
              <Ticket className={DS.empty.icon} />
              <p className={DS.empty.title}>등록된 쿠폰이 없습니다</p>
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
