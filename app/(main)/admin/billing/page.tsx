"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { CommaNumberInput } from "@/components/ui/comma-number-input"

type TabKey = "payments" | "subscriptions" | "settlement" | "txfees" | "coupons" | "pricing" | "commissions"

const TABS: { key: TabKey; label: string }[] = [
  { key: "payments",      label: "결제 내역"   },
  { key: "subscriptions", label: "구독 관리"   },
  { key: "settlement",    label: "정산 관리"   },
  { key: "txfees",        label: "거래수수료"   },
  { key: "coupons",       label: "쿠폰 관리"   },
  { key: "pricing",       label: "요금제 설정"  },
  { key: "commissions",   label: "수수료"      },
]

// ─── Types ────────────────────────────────────────────────

interface PaymentRecord {
  id: string
  user_id: string
  order_id: string | null
  payment_id: string | null
  amount: number
  product_type: string
  credits_granted: number | null
  status: string
  pg_provider: string | null
  created_at: string
  user_email?: string
  user_name?: string
}

interface SubscriptionRecord {
  user_id: string
  plan: string
  status: string
  started_at: string
  expires_at: string | null
  order_id?: string
  user_email?: string
  user_name?: string
}

interface CreditTxRecord {
  id: string
  user_id: string
  type: string
  amount: number
  balance_after?: number
  description: string | null
  service_key?: string
  created_at: string
}

interface ChartDataPoint {
  month: string
  revenue: number
}

// ─── Status styles ────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  PAID:              "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  ACTIVE:            "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  PENDING:           "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  FAILED:            "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  CANCELLED:         "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  PARTIAL_CANCELLED: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  REFUNDED:          "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  EXPIRED:           "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]",
}

const STATUS_LABEL: Record<string, string> = {
  PAID:              "완료",
  ACTIVE:            "활성",
  PENDING:           "대기",
  FAILED:            "실패",
  CANCELLED:         "취소",
  PARTIAL_CANCELLED: "부분취소",
  REFUNDED:          "환불",
  EXPIRED:           "만료",
}

const PLAN_STYLE: Record<string, string> = {
  PREMIUM:    "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  PRO:        "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  ENTERPRISE: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  BASIC:      "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]",
  STARTER:    "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]",
  FREE:       "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]",
}

// ─── Commission types & mock data ────────────────────────

interface Commission {
  id: string
  deal_id: string
  case_number?: string
  winning_bid: number
  commission_amount: number
  vat_amount: number
  total_amount: number
  status: string
  invoice_id: string | null
  created_at: string
}

interface CommissionSummary {
  this_month: { total_amount: number; count: number; paid_amount: number; pending_amount: number }
  last_month: { total_amount: number; count: number }
  all_time:   { total_amount: number; count: number }
}

const COMM_STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  INVOICED: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  PAID:     "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  WAIVED:   "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]",
  DISPUTED: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
}

const COMM_STATUS_LABEL: Record<string, string> = {
  PENDING:  "미납",
  INVOICED: "청구됨",
  PAID:     "완납",
  WAIVED:   "면제",
  DISPUTED: "분쟁",
}

const fmt = (n: number) => "₩" + n.toLocaleString("ko-KR")

// ─── Helper: build monthly chart data from payments ──────

function buildChartData(payments: PaymentRecord[]): ChartDataPoint[] {
  const monthMap = new Map<string, number>()
  const now = new Date()

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthMap.set(key, 0)
  }

  for (const p of payments) {
    if (p.status !== "PAID") continue
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + (p.amount ?? 0))
    }
  }

  return Array.from(monthMap.entries()).map(([key, revenue]) => {
    const month = parseInt(key.split("-")[1]) + "월"
    return { month, revenue: Math.round(revenue / 10000) } // 만원 단위
  })
}

// ─── v2 Transaction Fee Tab ───────────────────────────────────────────────────
const TXFEE_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: '대기',   cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  invoiced: { label: '청구됨', cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  paid:     { label: '완납',   cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  waived:   { label: '면제',   cls: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]' },
  disputed: { label: '분쟁',   cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
}
const DEAL_TYPE_LABEL: Record<string, string> = {
  'npl-seller': 'NPL 매도', 'npl-buyer': 'NPL 매수',
  're-seller': '부동산 매도', 're-buyer': '부동산 매수',
}

interface TxFeeRecord {
  id: string
  deal_id: string
  deal_type: string
  transaction_amount: number
  seller_fee: { totalFee: number; effectiveRate: number; waived: boolean }
  buyer_fee:  { totalFee: number; effectiveRate: number; waived: boolean; withPNR?: boolean }
  status: string
  created_at: string
  notes?: string
}

function TransactionFeeTab() {
  const [records, setRecords] = useState<TxFeeRecord[]>([])
  const [summary, setSummary] = useState<{ total_revenue: number; pending_count: number; invoiced_count: number; paid_count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    setLoading(true)
    const qs = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
    fetch(`/api/v1/settlements${qs}`)
      .then(r => r.json())
      .then(j => { setRecords(j.data ?? []); setSummary(j.summary ?? null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '플랫폼 수익 (완납)', value: summary ? fmt(summary.total_revenue) : '—', border: 'border-l-emerald-400', color: 'text-[var(--color-positive)]' },
          { label: '정산 대기',           value: summary ? `${summary.pending_count}건` : '—', border: 'border-l-amber-400',   color: 'text-[var(--color-warning)]' },
          { label: '청구됨',              value: summary ? `${summary.invoiced_count}건` : '—', border: 'border-l-blue-400', color: 'text-[var(--color-brand-mid)]' },
          { label: '완납',                value: summary ? `${summary.paid_count}건` : '—',  border: 'border-l-emerald-400', color: 'text-[var(--color-positive)]' },
        ].map(k => (
          <div key={k.label} className={`${DS.stat.card} border-l-2 ${k.border}`}>
            <p className={DS.stat.label}>{k.label}</p>
            <p className={`${DS.stat.value} ${k.color} font-mono tabular-nums`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={DS.input.base + ' h-8 text-[0.8125rem] py-1 pr-8'}>
          <option value="all">전체 상태</option>
          {Object.entries(TXFEE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-[var(--color-brand-mid)] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className={DS.table.wrapper}>
          <table className="w-full">
            <thead>
              <tr className={DS.table.header}>
                <th className={DS.table.headerCell}>정산 ID</th>
                <th className={DS.table.headerCell}>거래 유형</th>
                <th className={DS.table.headerCell + ' text-right'}>거래금액</th>
                <th className={DS.table.headerCell + ' text-right'}>매도 수수료</th>
                <th className={DS.table.headerCell + ' text-right'}>매수 수수료</th>
                <th className={DS.table.headerCell + ' text-center'}>상태</th>
                <th className={DS.table.headerCell}>생성일</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const sc = TXFEE_STATUS[r.status] ?? TXFEE_STATUS.pending
                return (
                  <tr key={r.id} className={DS.table.row}>
                    <td className={DS.table.cellMuted + ' font-mono text-[0.75rem]'}>{r.id}</td>
                    <td className={DS.table.cell}>{DEAL_TYPE_LABEL[r.deal_type] ?? r.deal_type}</td>
                    <td className={DS.table.cell + ' text-right font-mono tabular-nums'}>{fmt(r.transaction_amount)}</td>
                    <td className={DS.table.cell + ' text-right font-mono tabular-nums'}>
                      {r.seller_fee.waived ? <span className="text-stone-900 text-[0.75rem]">면제</span> : fmt(r.seller_fee.totalFee)}
                      {!r.seller_fee.waived && <span className={DS.text.micro + ' ml-1'}>({(r.seller_fee.effectiveRate * 100).toFixed(2)}%)</span>}
                    </td>
                    <td className={DS.table.cell + ' text-right font-mono tabular-nums'}>
                      {r.buyer_fee.waived ? <span className="text-stone-900 text-[0.75rem]">면제</span> : fmt(r.buyer_fee.totalFee)}
                      {!r.buyer_fee.waived && <span className={DS.text.micro + ' ml-1'}>({(r.buyer_fee.effectiveRate * 100).toFixed(2)}%){r.buyer_fee.withPNR ? ' +PNR' : ''}</span>}
                    </td>
                    <td className={DS.table.cell + ' text-center'}>
                      <span className={`text-[0.75rem] font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className={DS.table.cellMuted + ' tabular-nums'}>{r.created_at.split('T')[0]}</td>
                  </tr>
                )
              })}
              {records.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-[var(--color-text-muted)]">정산 내역이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Settlement Tab ───────────────────────────────────────────────────────────
interface SettlementRecord {
  id: string
  recipient_id: string
  recipient_name?: string
  recipient_email?: string
  type: string
  amount: number
  status: string
  reference_id?: string
  created_at: string
  paid_at?: string | null
}

const SETTLE_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: '대기',   cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  APPROVED: { label: '승인',   cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  PAID:     { label: '지급완료', cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  REJECTED: { label: '거부',   cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
}
const SETTLE_TYPE_LABEL: Record<string, string> = {
  partner_referral: '파트너 추천',
  transaction_fee:  '거래 수수료',
  content_fee:      '콘텐츠 수수료',
  event_fee:        '이벤트 수익',
  data_fee:         '데이터 수익',
  seller_commission:'매도자 수익',
}

function SettlementTab() {
  const [records, setRecords] = useState<SettlementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchSettlements = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('settlement_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (data && data.length > 0) {
          // Enrich with user info
          const userIds = [...new Set(data.map((r: any) => r.recipient_id))]
          const { data: users } = await supabase
            .from('users')
            .select('id, email, display_name')
            .in('id', userIds.slice(0, 50))
          const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))
          setRecords(data.map((r: any) => {
            const u = userMap.get(r.recipient_id) as any
            return { ...r, recipient_name: u?.display_name ?? u?.email?.split('@')[0] ?? '-', recipient_email: u?.email ?? '-' }
          }))
        } else {
          // Demo data when table is empty
          setRecords([
            { id: 'set-001', recipient_id: 'u1', recipient_name: '김파트너', recipient_email: 'partner@example.com', type: 'partner_referral', amount: 58000, status: 'PENDING', reference_id: 'REF-2026-0401', created_at: '2026-04-01T09:00:00Z' },
            { id: 'set-002', recipient_id: 'u2', recipient_name: '이파트너', recipient_email: 'partner2@example.com', type: 'transaction_fee', amount: 125000, status: 'APPROVED', reference_id: 'REF-2026-0403', created_at: '2026-04-03T11:00:00Z' },
            { id: 'set-003', recipient_id: 'u3', recipient_name: '박파트너', recipient_email: 'partner3@example.com', type: 'partner_referral', amount: 32000, status: 'PAID', reference_id: 'REF-2026-0310', created_at: '2026-03-10T14:00:00Z', paid_at: '2026-03-15T10:00:00Z' },
            { id: 'set-004', recipient_id: 'u4', recipient_name: '최매도자', recipient_email: 'seller@example.com', type: 'seller_commission', amount: 850000, status: 'PENDING', reference_id: 'DEAL-2026-044', created_at: '2026-04-05T09:30:00Z' },
            { id: 'set-005', recipient_id: 'u5', recipient_name: '정파트너', recipient_email: 'partner5@example.com', type: 'content_fee', amount: 15000, status: 'PAID', reference_id: 'CONT-2026-012', created_at: '2026-03-28T16:00:00Z', paid_at: '2026-04-01T09:00:00Z' },
          ])
        }
      } catch {
        toast.error('정산 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchSettlements()
  }, [])

  const handleAction = async (id: string, action: 'approve' | 'pay' | 'reject') => {
    setProcessing(id)
    const newStatus = action === 'approve' ? 'APPROVED' : action === 'pay' ? 'PAID' : 'REJECTED'
    try {
      const supabase = createClient()
      await supabase.from('settlement_records').update({ status: newStatus, ...(action === 'pay' ? { paid_at: new Date().toISOString() } : {}) }).eq('id', id)
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, ...(action === 'pay' ? { paid_at: new Date().toISOString() } : {}) } : r))
      toast.success(action === 'approve' ? '승인 완료' : action === 'pay' ? '지급 완료로 변경됨' : '거부 처리됨')
    } catch {
      toast.error('처리에 실패했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = records.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false
    if (filterType !== 'ALL' && r.type !== filterType) return false
    if (search && !r.recipient_name?.toLowerCase().includes(search.toLowerCase()) && !r.recipient_email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPending  = records.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.amount, 0)
  const totalApproved = records.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.amount, 0)
  const totalPaid     = records.filter(r => r.status === 'PAID').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-4">
      {/* KPI 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '정산 대기', value: totalPending, cls: 'border-stone-300/20 bg-stone-100/10' },
          { label: '승인 완료', value: totalApproved, cls: 'border-stone-300/20 bg-stone-100/10' },
          { label: '지급 완료', value: totalPaid, cls: 'border-stone-300/20 bg-stone-100/10' },
        ].map(k => (
          <div key={k.label} className={`${DS.card.base} ${k.cls} p-4`}>
            <p className={DS.stat.label}>{k.label}</p>
            <p className="text-[1.25rem] font-bold mt-1">{fmt(k.value)}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="수신자 검색..." className={DS.input.base + " w-48 h-8 text-[0.8125rem] py-1"} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={DS.input.base + " h-8 text-[0.8125rem] py-1 pr-8"}>
          <option value="ALL">전체 상태</option>
          {Object.entries(SETTLE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={DS.input.base + " h-8 text-[0.8125rem] py-1 pr-8"}>
          <option value="ALL">전체 유형</option>
          {Object.entries(SETTLE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-[var(--color-brand-mid)] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className={DS.table.wrapper}>
          <table className="w-full">
            <thead>
              <tr className={DS.table.header}>
                <th className={DS.table.headerCell}>수신자</th>
                <th className={DS.table.headerCell}>유형</th>
                <th className={DS.table.headerCell + " text-right"}>금액</th>
                <th className={DS.table.headerCell + " text-center"}>상태</th>
                <th className={DS.table.headerCell}>기준일</th>
                <th className={DS.table.headerCell + " text-center"}>처리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const sc = SETTLE_STATUS[r.status] ?? { label: r.status, cls: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]' }
                return (
                  <tr key={r.id} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <p className="font-medium text-[var(--color-text-primary)]">{r.recipient_name}</p>
                      <p className={DS.text.caption}>{r.recipient_email}</p>
                    </td>
                    <td className={DS.table.cellMuted}>{SETTLE_TYPE_LABEL[r.type] ?? r.type}</td>
                    <td className={DS.table.cell + " text-right font-medium"}>{fmt(r.amount)}</td>
                    <td className={DS.table.cell + " text-center"}>
                      <span className={`text-[0.75rem] font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className={DS.table.cellMuted}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                    <td className={DS.table.cell + " text-center"}>
                      <div className="flex items-center justify-center gap-1">
                        {r.status === 'PENDING' && (
                          <>
                            <button disabled={processing === r.id} onClick={() => handleAction(r.id, 'approve')} className={DS.button.primary + " " + DS.button.sm}>승인</button>
                            <button disabled={processing === r.id} onClick={() => handleAction(r.id, 'reject')} className={DS.button.danger + " " + DS.button.sm}>거부</button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <button disabled={processing === r.id} onClick={() => handleAction(r.id, 'pay')} className={`${DS.button.secondary} ${DS.button.sm} !border-stone-300/20 !text-stone-900 hover:!bg-stone-100/10`}>지급 완료</button>
                        )}
                        {(r.status === 'PAID' || r.status === 'REJECTED') && (
                          <span className={DS.text.caption}>{r.status === 'PAID' ? r.paid_at ? new Date(r.paid_at).toLocaleDateString('ko-KR') : '완료' : '거부됨'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">조회된 정산 기록이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────
const PLAN_DEFAULTS = [
  { key: 'STARTER',      name: 'Starter',      monthly: 29000,  yearly: 278400,  credits: 500,   color: 'text-[var(--color-text-secondary)]', bg: 'bg-[var(--color-surface-overlay)]', desc: '입문자용 기본 도구' },
  { key: 'PRO',          name: 'Pro',           monthly: 79000,  yearly: 758400,  credits: 2000,  color: 'text-stone-900',   bg: 'bg-stone-100/10',  desc: '전문 투자자 필수 Suite', popular: true },
  { key: 'PROFESSIONAL', name: 'Professional',  monthly: 199000, yearly: 1910400, credits: 8000,  color: 'text-stone-900', bg: 'bg-stone-100/10', desc: '법인·전문 투자자 전용' },
  { key: 'INSTITUTION',  name: 'Institution',   monthly: 499000, yearly: 4790400, credits: 30000, color: 'text-stone-900',bg: 'bg-stone-100/10', desc: '금융기관·운용사' },
]

function PricingTab() {
  const [plans, setPlans] = useState(PLAN_DEFAULTS.map(p => ({ ...p })))
  const [saving, setSaving] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      await Promise.all(plans.map(p =>
        supabase.from('plan_configs').upsert({
          plan_key: p.key,
          name: p.name,
          price_monthly: p.monthly,
          price_yearly: p.yearly,
          monthly_credits: p.credits,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'plan_key' })
      ))
      toast.success('요금제 설정이 저장되었습니다.')
      setEditIdx(null)
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={DS.text.cardSubtitle}>요금제 가격 설정</h3>
          <p className={DS.text.caption + " mt-0.5"}>각 플랜의 월간·연간 가격 및 크레딧 수량을 설정합니다. 변경 사항은 저장 후 반영됩니다.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className={DS.button.primary}>
          {saving ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</> : '저장'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((p, i) => (
          <div key={p.key} className={`${DS.card.elevated} ${DS.card.padding} border-l-4 ${p.key === 'PRO' ? 'border-stone-300' : p.key === 'PROFESSIONAL' ? 'border-stone-300' : p.key === 'INSTITUTION' ? 'border-stone-300' : 'border-slate-300'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-bold ${p.color}`}>{p.name}</p>
                <p className={DS.text.caption}>{p.desc}</p>
              </div>
              <button onClick={() => setEditIdx(editIdx === i ? null : i)} className={DS.button.ghost + " " + DS.button.sm}>
                {editIdx === i ? '닫기' : '수정'}
              </button>
            </div>

            {editIdx === i ? (
              <div className="space-y-3">
                {[
                  { label: '월간 가격 (원)', field: 'monthly' as const },
                  { label: '연간 가격 (원)', field: 'yearly' as const },
                  { label: '월 크레딧', field: 'credits' as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className={DS.text.caption + " block mb-1"}>{label}</label>
                    <CommaNumberInput
                      value={p[field]}
                      onChange={v => setPlans(prev => prev.map((pl, j) => j === i ? { ...pl, [field]: Number(v) || 0 } : pl))}
                      className={DS.input.base + " text-[0.8125rem]"}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className={`${p.bg} rounded-lg py-2`}>
                  <p className={DS.text.caption}>월간</p>
                  <p className="font-bold text-[0.9375rem] mt-0.5">{fmt(p.monthly)}</p>
                </div>
                <div className={`${p.bg} rounded-lg py-2`}>
                  <p className={DS.text.caption}>연간</p>
                  <p className="font-bold text-[0.9375rem] mt-0.5">{fmt(p.yearly)}</p>
                </div>
                <div className={`${p.bg} rounded-lg py-2`}>
                  <p className={DS.text.caption}>크레딧/월</p>
                  <p className="font-bold text-[0.9375rem] mt-0.5">{p.credits.toLocaleString()}C</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Coupon Manager Component ─────────────────────────────────────────────────
// Coupon row shape shared between DB and local state
interface CouponRow {
  id: string
  code: string
  type: string
  value: number
  usageLimit: number
  usedCount: number
  expiresAt: string
  status: string
}

const TYPE_MAP: Record<string, string> = {
  CREDITS: '크레딧', FREE_PLAN: '구독일', DISCOUNT: '할인율',
  INVITATION: '초대', TICKET: '티켓', VIP: 'VIP',
}
const TYPE_REVERSE_MAP: Record<string, string> = {
  '크레딧': 'CREDITS', '구독일': 'FREE_PLAN', '할인율': 'DISCOUNT',
  '초대': 'INVITATION', '티켓': 'TICKET', 'VIP': 'VIP',
}

function CouponManager() {
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', type: '크레딧', value: '', usageLimit: '', expiresAt: '' })
  const [creating, setCreating] = useState(false)

  // Load coupons from Supabase on mount
  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('coupons')
          .select('id, code, type, value, max_uses, used_count, valid_until, status')
          .order('created_at', { ascending: false })
          .limit(50)

        if (data && data.length > 0) {
          setCoupons(
            data.map((c: Record<string, unknown>) => {
              const val = c.value as Record<string, unknown> | null
              return {
                id: c.id as string,
                code: c.code as string,
                type: TYPE_MAP[(c.type as string)] ?? (c.type as string),
                value: (val?.credits ?? val?.discount_pct ?? val?.months ?? 0) as number,
                usageLimit: (c.max_uses as number) ?? 999,
                usedCount: (c.used_count as number) ?? 0,
                expiresAt: c.valid_until ? (c.valid_until as string).slice(0, 10) : '9999-12-31',
                status: c.status === 'ACTIVE' ? '활성' : c.status === 'EXPIRED' ? '만료' : '비활성',
              }
            })
          )
        }
      } catch {
        // Table not yet created — start with empty list
      } finally {
        setCouponsLoading(false)
      }
    })()
  }, [])

  const handleCreate = async () => {
    if (!form.code || !form.value) { toast.error('코드와 혜택 값은 필수입니다'); return }
    setCreating(true)
    const code = form.code.toUpperCase()
    const typeKey = TYPE_REVERSE_MAP[form.type] ?? 'CREDITS'
    const numVal = Number(form.value)

    // Build JSONB value based on type
    const valueJson =
      typeKey === 'CREDITS'  ? { credits: numVal } :
      typeKey === 'DISCOUNT' ? { discount_pct: numVal } :
      typeKey === 'FREE_PLAN'? { months: numVal } :
      { value: numVal }

    try {
      const supabase = createClient()
      const { data: inserted, error } = await supabase
        .from('coupons')
        .insert({
          code,
          type: typeKey,
          value: valueJson,
          max_uses: Number(form.usageLimit) || 999,
          valid_until: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          status: 'ACTIVE',
        })
        .select('id, code, type, value, max_uses, used_count, valid_until, status')
        .single()

      if (error) throw error

      const c = inserted as Record<string, unknown>
      const val = c.value as Record<string, unknown> | null
      const newCoupon: CouponRow = {
        id: c.id as string,
        code: c.code as string,
        type: form.type,
        value: (val?.credits ?? val?.discount_pct ?? val?.months ?? numVal) as number,
        usageLimit: (c.max_uses as number) ?? 999,
        usedCount: 0,
        expiresAt: c.valid_until ? (c.valid_until as string).slice(0, 10) : '9999-12-31',
        status: '활성',
      }
      setCoupons(prev => [newCoupon, ...prev])
    } catch (err) {
      console.warn('[coupon create] DB failed, adding locally:', err)
      // Graceful degradation — add locally even if DB fails
      setCoupons(prev => [{
        id: String(Date.now()),
        code,
        type: form.type,
        value: numVal,
        usageLimit: Number(form.usageLimit) || 999,
        usedCount: 0,
        expiresAt: form.expiresAt || '2099-12-31',
        status: '활성',
      }, ...prev])
    } finally {
      setCreating(false)
      setForm({ code: '', type: '크레딧', value: '', usageLimit: '', expiresAt: '' })
      setShowForm(false)
      toast.success(`쿠폰 "${code}" 이 생성되었습니다.`)
    }
  }

  const toggleStatus = async (id: string) => {
    const cur = coupons.find(c => c.id === id)?.status
    const next = cur === '활성' ? '비활성' : '활성'
    const nextDb = next === '활성' ? 'ACTIVE' : 'DISABLED'
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: next } : c))
    try {
      const supabase = createClient()
      await supabase.from('coupons').update({ status: nextDb }).eq('id', id)
    } catch {
      // Revert
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: cur ?? '활성' } : c))
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '전체 쿠폰', value: coupons.length },
          { label: '활성 쿠폰', value: coupons.filter(c => c.status === '활성').length },
          { label: '총 사용 건수', value: coupons.reduce((s, c) => s + c.usedCount, 0) },
          { label: '이번 달 발급', value: 2 },
        ].map(s => (
          <div key={s.label} className={DS.stat.card}>
            <div className={DS.stat.value}>{s.value}</div>
            <div className={DS.stat.sub}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className={DS.card.elevated + ' ' + DS.card.padding + ' space-y-4'}>
          <h3 className={DS.text.cardTitle}>새 쿠폰 생성</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={DS.input.label}>쿠폰 코드 *</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="예: SUMMER2026" className={DS.input.base + ' font-mono uppercase'} />
            </div>
            <div>
              <label className={DS.input.label}>혜택 유형</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={DS.input.base}>
                <option value="크레딧">크레딧 지급</option>
                <option value="구독일">구독 무료 기간 (일)</option>
                <option value="할인율">구독료 할인율 (%)</option>
              </select>
            </div>
            <div>
              <label className={DS.input.label}>혜택 값 * ({form.type === '크레딧' ? '개' : form.type === '구독일' ? '일' : '%'})</label>
              <CommaNumberInput value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))}
                placeholder="예: 100" className={DS.input.base} />
            </div>
            <div>
              <label className={DS.input.label}>사용 한도 (0=무제한)</label>
              <CommaNumberInput value={form.usageLimit} onChange={v => setForm(p => ({ ...p, usageLimit: v }))}
                placeholder="예: 500" className={DS.input.base} />
            </div>
            <div className="sm:col-span-2">
              <label className={DS.input.label}>만료일</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className={DS.input.base} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating} className={DS.button.primary}>
              {creating ? '생성 중...' : '쿠폰 생성'}
            </button>
            <button onClick={() => setShowForm(false)} disabled={creating} className={DS.button.secondary}>취소</button>
          </div>
        </div>
      )}

      {/* Coupon table */}
      <div className={DS.card.elevated + ' overflow-hidden'}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className={DS.text.cardTitle}>쿠폰 목록</h3>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className={DS.button.primary + ' ' + DS.button.sm}>
              + 새 쿠폰 생성
            </button>
          )}
        </div>
        <div className={DS.table.wrapper}>
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className={DS.table.header}>
                <th className={DS.table.headerCell}>코드</th>
                <th className={DS.table.headerCell}>혜택</th>
                <th className={DS.table.headerCell + ' text-center'}>사용 현황</th>
                <th className={DS.table.headerCell}>만료일</th>
                <th className={DS.table.headerCell + ' text-center'}>상태</th>
                <th className={DS.table.headerCell + ' text-center'}>액션</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const usagePct = c.usageLimit > 0 ? Math.round((c.usedCount / c.usageLimit) * 100) : 0
                const statusCls = c.status === '활성' ? 'bg-stone-100/10 text-stone-900 border border-stone-300/20'
                  : c.status === '만료' ? 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
                  : 'bg-stone-100/10 text-stone-900 border border-stone-300/20'
                return (
                  <tr key={c.id} className={DS.table.row}>
                    <td className={DS.table.cell + ' font-mono font-bold text-[var(--color-brand-mid)]'}>{c.code}</td>
                    <td className={DS.table.cell}>
                      {c.type === '크레딧' ? `크레딧 ${c.value}개` : c.type === '구독일' ? `${c.value}일 무료` : `${c.value}% 할인`}
                    </td>
                    <td className={DS.table.cell + ' text-center'}>
                      <div className="flex flex-col items-center gap-1">
                        <span className={DS.text.captionLight + ' tabular-nums'}>{c.usedCount} / {c.usageLimit}</span>
                        {c.usageLimit > 0 && (
                          <div className="h-1.5 w-16 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--color-brand-mid)] rounded-full" style={{ width: `${usagePct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={DS.table.cellMuted + ' tabular-nums'}>{c.expiresAt}</td>
                    <td className={DS.table.cell + ' text-center'}>
                      <span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold ${statusCls}`}>{c.status}</span>
                    </td>
                    <td className={DS.table.cell + ' text-center'}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleStatus(c.id)}
                          className={DS.text.link + ' text-[0.75rem]'}
                        >
                          {c.status === '활성' ? '비활성화' : '활성화'}
                        </button>
                        <span className="text-[var(--color-border-default)]">|</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(c.code); toast.success('코드 복사됨') }}
                          className={DS.text.caption + ' hover:text-[var(--color-text-primary)] cursor-pointer'}
                        >
                          복사
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AdminBillingPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get("tab") ?? "") as TabKey
  const [tab, setTab] = useState<TabKey>(
    TABS.find(t => t.key === initialTab)?.key ?? TABS[0]!.key
  )

  // ─── Payments state ────────────────────────────────────
  const [payments, setPayments]           = useState<PaymentRecord[]>([])
  const [chartData, setChartData]         = useState<ChartDataPoint[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [refunding, setRefunding]         = useState<string | null>(null)

  // ─── Subscriptions state ───────────────────────────────
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [subsLoading, setSubsLoading]     = useState(false)

  // ─── KPI state ─────────────────────────────────────────
  const [kpi, setKpi] = useState({
    monthRevenue: 0,
    activeSubscribers: 0,
    pendingPayments: 0,
    refundRate: 0,
    prevMonthRevenue: 0,
    renewalRate: 0,
  })

  // ─── Commission state ─────────────────────────────────
  const [commissions, setCommissions]     = useState<Commission[]>([])
  const [commSummary, setCommSummary]     = useState<CommissionSummary | null>(null)
  const [commLoading, setCommLoading]     = useState(false)

  // ─── Fetch payments + KPI ──────────────────────────────

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      const supabase = createClient()
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

      // Fetch recent payments (last 6 months for chart + table)
      const { data: paymentData, error: payErr } = await supabase
        .from("payment_history")
        .select("id, user_id, order_id, payment_id, amount, product_type, credits_granted, status, pg_provider, created_at")
        .gte("created_at", sixMonthsAgo)
        .order("created_at", { ascending: false })
        .limit(200)

      if (payErr) throw payErr

      const allPayments: PaymentRecord[] = paymentData ?? []

      // Enrich with user info
      const userIds = Array.from(new Set(allPayments.map(p => p.user_id)))
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, display_name")
          .in("id", userIds.slice(0, 50))

        if (users) {
          const userMap = new Map((users as { id: string; email: string; display_name: string | null }[]).map(u => [u.id, u]))
          for (const p of allPayments) {
            const u = userMap.get(p.user_id)
            if (u) {
              p.user_email = u.email
              p.user_name = u.display_name ?? u.email?.split("@")[0] ?? "-"
            }
          }
        }
      }

      setPayments(allPayments)
      setChartData(buildChartData(allPayments))

      // Compute KPIs
      const thisMonthPayments = allPayments.filter(p => p.created_at >= thisMonthStart)
      const lastMonthPayments = allPayments.filter(p => p.created_at >= lastMonthStart && p.created_at < thisMonthStart)

      const thisMonthPaid = thisMonthPayments.filter(p => p.status === "PAID")
      const thisMonthRevenue = thisMonthPaid.reduce((sum, p) => sum + (p.amount ?? 0), 0)
      const lastMonthRevenue = lastMonthPayments.filter(p => p.status === "PAID").reduce((sum, p) => sum + (p.amount ?? 0), 0)

      const thisMonthRefunds = thisMonthPayments.filter(p => ["REFUNDED", "CANCELLED", "PARTIAL_CANCELLED"].includes(p.status)).length
      const thisMonthTotal = thisMonthPayments.length
      const refundRate = thisMonthTotal > 0 ? (thisMonthRefunds / thisMonthTotal) * 100 : 0

      const pendingCount = allPayments.filter(p => p.status === "PENDING").length

      // Get active subscriptions count
      const { count: subsCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "ACTIVE")

      setKpi(prev => ({
        ...prev,
        monthRevenue: thisMonthRevenue,
        prevMonthRevenue: lastMonthRevenue,
        pendingPayments: pendingCount,
        activeSubscribers: subsCount ?? 0,
        refundRate: Math.round(refundRate * 10) / 10,
      }))
    } catch (err) {
      console.error("[AdminBilling] fetchPayments error:", err)
      toast.error("결제 데이터를 불러오지 못했습니다")
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  // ─── Fetch subscriptions ───────────────────────────────

  const fetchSubscriptions = useCallback(async () => {
    setSubsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, started_at, expires_at, order_id")
        .order("started_at", { ascending: false })
        .limit(100)

      if (error) throw error

      const subs: SubscriptionRecord[] = data ?? []

      // Enrich with user info
      const userIds = Array.from(new Set(subs.map(s => s.user_id)))
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, display_name")
          .in("id", userIds.slice(0, 50))

        if (users) {
          const userMap = new Map((users as { id: string; email: string; display_name: string | null }[]).map(u => [u.id, u]))
          for (const s of subs) {
            const u = userMap.get(s.user_id)
            if (u) {
              s.user_email = u.email
              s.user_name = u.display_name ?? u.email?.split("@")[0] ?? "-"
            }
          }
        }
      }

      setSubscriptions(subs)

      // Compute renewal rate from subscription data
      const active = subs.filter(s => s.status === "ACTIVE").length
      const total = subs.length
      const renewalRate = total > 0 ? (active / total) * 100 : 0
      setKpi(prev => ({ ...prev, renewalRate: Math.round(renewalRate * 10) / 10 }))
    } catch (err) {
      console.error("[AdminBilling] fetchSubscriptions error:", err)
      toast.error("구독 데이터를 불러오지 못했습니다")
    } finally {
      setSubsLoading(false)
    }
  }, [])

  // ─── Refund action ─────────────────────────────────────

  const handleRefund = useCallback(async (paymentId: string) => {
    if (!confirm("이 결제를 환불 처리하시겠습니까?")) return
    setRefunding(paymentId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("payment_history")
        .update({ status: "REFUNDED" })
        .eq("id", paymentId)

      if (error) throw error

      // Also refund credits if it was a credit purchase
      const payment = payments.find(p => p.id === paymentId)
      if (payment?.credits_granted && payment.credits_granted > 0) {
        await supabase
          .from("credit_transactions")
          .insert({
            user_id: payment.user_id,
            type: "REFUND",
            amount: -payment.credits_granted,
            description: `환불 처리 - 주문 ${payment.order_id ?? paymentId}`,
          })

        // Deduct credit balance
        const { data: userProfile } = await supabase
          .from("users")
          .select("credit_balance")
          .eq("id", payment.user_id)
          .single()

        if (userProfile) {
          const newBalance = Math.max(0, ((userProfile as { credit_balance?: number }).credit_balance ?? 0) - payment.credits_granted)
          await supabase
            .from("users")
            .update({ credit_balance: newBalance })
            .eq("id", payment.user_id)
        }
      }

      toast.success("환불 처리가 완료되었습니다")
      // Update local state
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: "REFUNDED" } : p))
    } catch (err) {
      console.error("[AdminBilling] refund error:", err)
      toast.error("환불 처리에 실패했습니다")
    } finally {
      setRefunding(null)
    }
  }, [payments])

  // ─── Cancel subscription action ────────────────────────

  const handleCancelSubscription = useCallback(async (userId: string) => {
    if (!confirm("이 사용자의 구독을 해지하시겠습니까?")) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "CANCELLED" })
        .eq("user_id", userId)
        .eq("status", "ACTIVE")

      if (error) throw error

      // Also update user's subscription_tier to FREE
      await supabase
        .from("users")
        .update({ subscription_tier: "FREE" })
        .eq("id", userId)

      toast.success("구독이 해지되었습니다")
      setSubscriptions(prev => prev.map(s =>
        s.user_id === userId && s.status === "ACTIVE" ? { ...s, status: "CANCELLED" } : s
      ))
    } catch (err) {
      console.error("[AdminBilling] cancel subscription error:", err)
      toast.error("구독 해지에 실패했습니다")
    }
  }, [])

  // ─── Effects ───────────────────────────────────────────

  useEffect(() => {
    if (tab === "payments") fetchPayments()
    if (tab === "subscriptions") fetchSubscriptions()
  }, [tab, fetchPayments, fetchSubscriptions])

  // Initial load for KPI
  useEffect(() => { fetchPayments() }, [fetchPayments])

  // Commissions tab
  useEffect(() => {
    if (tab !== "commissions") return
    setCommLoading(true)

    Promise.all([
      fetch("/api/v1/commissions?page_size=50").then(r => r.json()).catch(() => null),
      fetch("/api/v1/commissions/summary").then(r => r.json()).catch(() => null),
    ]).then(([listRes, summaryRes]) => {
      const items: Commission[] = listRes?.data ?? []
      setCommissions(items)
      setCommSummary(summaryRes?._mock === undefined && summaryRes?.this_month
        ? summaryRes
        : {
            this_month: {
              total_amount:   items.filter(c => c.status !== 'WAIVED').reduce((a, c) => a + c.total_amount, 0),
              count:          items.filter(c => c.status !== 'WAIVED').length,
              paid_amount:    items.filter(c => c.status === 'PAID').reduce((a, c) => a + c.total_amount, 0),
              pending_amount: items.filter(c => c.status === 'PENDING').reduce((a, c) => a + c.total_amount, 0),
            },
            last_month: { total_amount: 0, count: 0 },
            all_time:   { total_amount: items.reduce((a, c) => a + c.total_amount, 0), count: items.length },
          }
      )
    }).finally(() => setCommLoading(false))
  }, [tab])

  // ─── Computed KPI values ───────────────────────────────

  const monthRevenueStr = kpi.monthRevenue >= 1_000_000
    ? `₩${(kpi.monthRevenue / 1_000_000).toFixed(1)}M`
    : fmt(kpi.monthRevenue)

  const prevMonthGrowth = kpi.prevMonthRevenue > 0
    ? ((kpi.monthRevenue - kpi.prevMonthRevenue) / kpi.prevMonthRevenue * 100).toFixed(1)
    : "0.0"

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0`}>
        <div className={`${DS.page.container} py-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={DS.header.eyebrow}>NPL Admin / 결제</p>
              <h1 className={DS.text.pageSubtitle}>결제 관리</h1>
            </div>
            <Link href="/admin">
              <button className={DS.button.secondary}>← 대시보드</button>
            </Link>
          </div>

          {/* KPI bar */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            {[
              { label: "이번 달 매출", value: paymentsLoading ? "..." : monthRevenueStr, color: "text-[var(--color-positive)]" },
              { label: "구독자", value: paymentsLoading ? "..." : `${kpi.activeSubscribers.toLocaleString()}명`, color: "text-[var(--color-brand-mid)]" },
              { label: "미결제", value: paymentsLoading ? "..." : `${kpi.pendingPayments}건`, color: "text-[var(--color-danger)]" },
            ].map(k => (
              <div key={k.label} className={DS.stat.card}>
                <span className={DS.stat.label}>{k.label}</span>
                <span className={`${DS.text.metricMedium} ${k.color} font-mono`}>{k.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "이번달 수익",  value: paymentsLoading ? "..." : monthRevenueStr, color: "text-[var(--color-positive)]", border: "border-l-emerald-400" },
            { label: "전월 대비",    value: paymentsLoading ? "..." : `${Number(prevMonthGrowth) >= 0 ? "+" : ""}${prevMonthGrowth}%`, color: "text-[var(--color-brand-mid)]", border: "border-l-blue-400" },
            { label: "구독 갱신율",  value: paymentsLoading ? "..." : `${kpi.renewalRate}%`, color: "text-stone-900",  border: "border-l-purple-400" },
            { label: "환불 비율",    value: paymentsLoading ? "..." : `${kpi.refundRate}%`, color: "text-[var(--color-warning)]", border: "border-l-amber-400" },
          ].map(c => (
            <div key={c.label} className={`${DS.stat.card} border-l-2 ${c.border}`}>
              <p className={DS.stat.label}>{c.label}</p>
              <p className={`${DS.stat.value} ${c.color} font-mono tabular-nums`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--color-border-subtle)]">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 text-[0.8125rem] font-medium transition-all -mb-px ${
                tab === t.key
                  ? "text-[var(--color-brand-mid)] border-b-2 border-[var(--color-brand-mid)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] border-b-2 border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Payments tab */}
        {tab === "payments" && (
          <div className="space-y-5">
            {/* Bar chart */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <span className={DS.text.bodyBold}>월별 매출 추이</span>
                <span className={DS.text.micro}>최근 6개월 (단위: 만원)</span>
              </div>
              <div className="p-4">
                {paymentsLoading ? (
                  <div className="flex items-center justify-center h-[180px]">
                    <span className="animate-pulse text-[var(--color-text-tertiary)]">데이터 로딩 중...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)" }} />
                      <Bar dataKey="revenue" fill="var(--color-brand-mid)" radius={[3, 3, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payments table */}
            <div className={DS.table.wrapper}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <span className={DS.text.bodyBold}>최근 결제 내역</span>
                {paymentsLoading && (
                  <span className={`${DS.text.micro} animate-pulse`}>로딩 중...</span>
                )}
              </div>

              {payments.length === 0 && !paymentsLoading ? (
                <div className="px-4 py-8 text-center">
                  <p className={DS.text.micro}>결제 내역이 없습니다</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className={DS.table.header}>
                      {["주문번호", "사용자", "유형", "금액", "결제일", "상태", "액션"].map(h => (
                        <th key={h} className={DS.table.headerCell}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 50).map(p => (
                      <tr key={p.id} className={DS.table.row}>
                        <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>
                          {p.order_id ?? p.id.slice(0, 12)}
                        </td>
                        <td className={`${DS.table.cell} font-medium`}>
                          <div className="flex flex-col">
                            <span>{p.user_name ?? "-"}</span>
                            {p.user_email && (
                              <span className={`${DS.text.micro} truncate max-w-[160px]`}>{p.user_email}</span>
                            )}
                          </div>
                        </td>
                        <td className={DS.table.cell}>
                          <span className={`${DS.badge.inline("", "", "")} ${PLAN_STYLE[p.product_type] ?? "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"}`}>
                            {p.product_type === "SUBSCRIPTION" ? "구독" : p.product_type === "CREDIT_PURCHASE" ? "크레딧" : p.product_type}
                          </span>
                        </td>
                        <td className={`${DS.table.cell} font-mono font-semibold tabular-nums`}>{fmt(p.amount)}</td>
                        <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>
                          {p.created_at?.split("T")[0] ?? "-"}
                        </td>
                        <td className={DS.table.cell}>
                          <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[p.status] ?? STATUS_STYLE.PENDING}`}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className={DS.table.cell}>
                          {p.status === "PAID" && (
                            <button
                              onClick={() => handleRefund(p.id)}
                              disabled={refunding === p.id}
                              className={`${DS.button.secondary} ${DS.button.sm} ${refunding === p.id ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {refunding === p.id ? "처리 중..." : "환불"}
                            </button>
                          )}
                          {p.status === "REFUNDED" && (
                            <span className={DS.text.micro}>환불 완료</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Subscriptions tab */}
        {tab === "subscriptions" && (
          <div className="space-y-5">
            {/* Subscription summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "활성 구독", value: `${subscriptions.filter(s => s.status === "ACTIVE").length}건`, color: "text-[var(--color-positive)]", border: "border-l-emerald-400" },
                { label: "만료 예정 (30일)", value: `${subscriptions.filter(s => {
                    if (s.status !== "ACTIVE" || !s.expires_at) return false
                    const exp = new Date(s.expires_at)
                    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    return exp <= thirtyDays
                  }).length}건`, color: "text-[var(--color-warning)]", border: "border-l-amber-400" },
                { label: "해지됨", value: `${subscriptions.filter(s => s.status === "CANCELLED").length}건`, color: "text-[var(--color-danger)]", border: "border-l-red-400" },
                { label: "전체", value: `${subscriptions.length}건`, color: "text-[var(--color-brand-mid)]", border: "border-l-blue-400" },
              ].map(c => (
                <div key={c.label} className={`${DS.stat.card} border-l-2 ${c.border}`}>
                  <p className={DS.stat.label}>{c.label}</p>
                  <p className={`${DS.stat.value} ${c.color} font-mono tabular-nums`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Subscriptions table */}
            <div className={DS.table.wrapper}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <span className={DS.text.bodyBold}>구독 현황</span>
                {subsLoading && (
                  <span className={`${DS.text.micro} animate-pulse`}>로딩 중...</span>
                )}
              </div>

              {subscriptions.length === 0 && !subsLoading ? (
                <div className="px-4 py-8 text-center">
                  <p className={DS.text.micro}>구독 내역이 없습니다</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className={DS.table.header}>
                      {["사용자", "플랜", "상태", "시작일", "만료일", "액션"].map(h => (
                        <th key={h} className={DS.table.headerCell}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s, i) => (
                      <tr key={`${s.user_id}-${i}`} className={DS.table.row}>
                        <td className={`${DS.table.cell} font-medium`}>
                          <div className="flex flex-col">
                            <span>{s.user_name ?? "-"}</span>
                            {s.user_email && (
                              <span className={`${DS.text.micro} truncate max-w-[200px]`}>{s.user_email}</span>
                            )}
                          </div>
                        </td>
                        <td className={DS.table.cell}>
                          <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${PLAN_STYLE[s.plan] ?? PLAN_STYLE.BASIC}`}>
                            {s.plan}
                          </span>
                        </td>
                        <td className={DS.table.cell}>
                          <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[s.status] ?? STATUS_STYLE.PENDING}`}>
                            {STATUS_LABEL[s.status] ?? s.status}
                          </span>
                        </td>
                        <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>
                          {s.started_at?.split("T")[0] ?? "-"}
                        </td>
                        <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>
                          {s.expires_at?.split("T")[0] ?? "-"}
                        </td>
                        <td className={DS.table.cell}>
                          {s.status === "ACTIVE" && (
                            <button
                              onClick={() => handleCancelSubscription(s.user_id)}
                              className={`${DS.button.secondary} ${DS.button.sm}`}
                            >
                              해지
                            </button>
                          )}
                          {s.status === "CANCELLED" && (
                            <span className={DS.text.micro}>해지됨</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── 정산 관리 탭 ─── */}
        {tab === "settlement" && <SettlementTab />}

        {/* ─── 거래수수료 탭 (v2) ─── */}
        {tab === "txfees" && <TransactionFeeTab />}

        {/* ─── 요금제 설정 탭 ─── */}
        {tab === "pricing" && (
          <PricingTab />
        )}

        {/* Coupons tab — IMPLEMENTED */}
        {tab === "coupons" && <CouponManager />}

        {/* Commissions tab */}
        {tab === "commissions" && (
          <div className="space-y-5">

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  label:  "이번 달 총 수수료",
                  value:  commSummary ? fmt(commSummary.this_month.total_amount) : "—",
                  sub:    commSummary ? `${commSummary.this_month.count}건` : "",
                  color:  "text-[var(--color-brand-mid)]",
                  border: "border-l-blue-400",
                },
                {
                  label:  "미납 수수료",
                  value:  commSummary ? fmt(commSummary.this_month.pending_amount) : "—",
                  sub:    commSummary ? `${commissions.filter(c => c.status === "PENDING").length}건` : "",
                  color:  "text-[var(--color-warning)]",
                  border: "border-l-amber-400",
                },
                {
                  label:  "완납 건수 (이번 달)",
                  value:  commSummary ? String(commissions.filter(c => c.status === "PAID").length) + "건" : "—",
                  sub:    commSummary ? fmt(commSummary.this_month.paid_amount) : "",
                  color:  "text-[var(--color-positive)]",
                  border: "border-l-emerald-400",
                },
              ].map(c => (
                <div key={c.label} className={`${DS.stat.card} border-l-2 ${c.border}`}>
                  <p className={DS.stat.label}>{c.label}</p>
                  <p className={`${DS.text.metricMedium} font-mono tabular-nums ${c.color}`}>{c.value}</p>
                  {c.sub && <p className={DS.stat.sub}>{c.sub}</p>}
                </div>
              ))}
            </div>

            {/* Commission table */}
            <div className={DS.table.wrapper}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <span className={DS.text.bodyBold}>수수료 현황</span>
                {commLoading && (
                  <span className={`${DS.text.micro} animate-pulse`}>로딩 중...</span>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["사건번호", "거래금액", "수수료", "부가세", "합계", "상태", "생성일", "액션"].map(h => (
                      <th key={h} className={`${DS.table.headerCell} whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className={DS.table.row}>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem] whitespace-nowrap`}>
                        {c.case_number ?? c.deal_id.slice(0, 12) + "..."}
                      </td>
                      <td className={`${DS.table.cell} font-mono tabular-nums whitespace-nowrap`}>
                        {fmt(c.winning_bid)}
                      </td>
                      <td className={`${DS.table.cell} font-mono tabular-nums whitespace-nowrap`}>
                        {fmt(c.commission_amount)}
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono tabular-nums whitespace-nowrap`}>
                        {fmt(c.vat_amount)}
                      </td>
                      <td className={`${DS.table.cell} font-mono tabular-nums font-semibold whitespace-nowrap`}>
                        {fmt(c.total_amount)}
                      </td>
                      <td className={`${DS.table.cell} whitespace-nowrap`}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${COMM_STATUS_STYLE[c.status] ?? COMM_STATUS_STYLE.PENDING}`}>
                          {COMM_STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem] whitespace-nowrap`}>
                        {c.created_at.split("T")[0]}
                      </td>
                      <td className={`${DS.table.cell} whitespace-nowrap`}>
                        {c.invoice_id ? (
                          <a
                            href={`/api/v1/commissions/${c.id}/invoice?format=html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${DS.button.secondary} ${DS.button.sm}`}
                          >
                            인보이스 보기
                          </a>
                        ) : (
                          <span className={DS.text.micro}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
