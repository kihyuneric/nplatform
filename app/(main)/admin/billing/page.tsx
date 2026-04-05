"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type TabKey = "payments" | "subscriptions" | "settlement" | "coupons" | "pricing" | "commissions"

const TABS: { key: TabKey; label: string }[] = [
  { key: "payments",      label: "결제 내역"  },
  { key: "subscriptions", label: "구독 관리"  },
  { key: "settlement",    label: "정산 관리"  },
  { key: "coupons",       label: "쿠폰 관리"  },
  { key: "pricing",       label: "요금제 설정" },
  { key: "commissions",   label: "수수료"     },
]

const CHART_DATA = [
  { month: "10월", revenue: 42 }, { month: "11월", revenue: 58 },
  { month: "12월", revenue: 72 }, { month: "1월",  revenue: 61 },
  { month: "2월",  revenue: 89 }, { month: "3월",  revenue: 112 },
]

const PAYMENTS = [
  { id: "PAY-20260324-001", name: "김민준", plan: "PRO",        amount: "₩49,000",  date: "2026-03-24", status: "완료"   },
  { id: "PAY-20260323-007", name: "이서연", plan: "STARTER",    amount: "₩12,000",  date: "2026-03-23", status: "완료"   },
  { id: "PAY-20260322-003", name: "박지호", plan: "ENTERPRISE", amount: "₩199,000", date: "2026-03-22", status: "완료"   },
  { id: "PAY-20260321-011", name: "최수아", plan: "PRO",        amount: "₩49,000",  date: "2026-03-21", status: "환불"   },
  { id: "PAY-20260320-002", name: "정태양", plan: "STARTER",    amount: "₩12,000",  date: "2026-03-20", status: "미결제" },
]

const STATUS_STYLE: Record<string, string> = {
  "완료":   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "환불":   "bg-amber-50 text-amber-700 border border-amber-200",
  "미결제": "bg-red-50 text-red-700 border border-red-200",
}

const PLAN_STYLE: Record<string, string> = {
  PRO:        "bg-blue-50 text-blue-700 border border-blue-200",
  ENTERPRISE: "bg-purple-50 text-purple-700 border border-purple-200",
  STARTER:    "bg-slate-50 text-slate-600 border border-slate-200",
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

const MOCK_COMMISSIONS: Commission[] = [
  { id: 'comm-001', deal_id: 'deal-001', case_number: '2025타경12345',  winning_bid: 850_000_000,   commission_amount: 3_400_000, vat_amount: 340_000,  total_amount: 3_740_000, status: 'PAID',     invoice_id: 'inv-001', created_at: '2026-03-15T10:00:00Z' },
  { id: 'comm-002', deal_id: 'deal-002', case_number: '2025타경98765',  winning_bid: 1_200_000_000, commission_amount: 4_200_000, vat_amount: 420_000,  total_amount: 4_620_000, status: 'PENDING',  invoice_id: 'inv-002', created_at: '2026-03-18T09:00:00Z' },
  { id: 'comm-003', deal_id: 'deal-003', case_number: '2024타경55501',  winning_bid: 620_000_000,   commission_amount: 2_480_000, vat_amount: 248_000,  total_amount: 2_728_000, status: 'PAID',     invoice_id: 'inv-003', created_at: '2026-02-10T14:00:00Z' },
  { id: 'comm-004', deal_id: 'deal-004', case_number: '2025타경33210',  winning_bid: 450_000_000,   commission_amount: 1_800_000, vat_amount: 180_000,  total_amount: 1_980_000, status: 'DISPUTED', invoice_id: null,      created_at: '2026-03-01T08:00:00Z' },
  { id: 'comm-005', deal_id: 'deal-005', case_number: '2025타경77890',  winning_bid: 2_100_000_000, commission_amount: 5_000_000, vat_amount: 500_000,  total_amount: 5_500_000, status: 'WAIVED',   invoice_id: 'inv-005', created_at: '2026-01-22T11:00:00Z' },
  { id: 'comm-006', deal_id: 'deal-006', case_number: '2026타경10023',  winning_bid: 380_000_000,   commission_amount: 1_520_000, vat_amount: 152_000,  total_amount: 1_672_000, status: 'PENDING',  invoice_id: null,      created_at: '2026-04-01T09:30:00Z' },
  { id: 'comm-007', deal_id: 'deal-007', case_number: '2026타경20045',  winning_bid: 730_000_000,   commission_amount: 2_920_000, vat_amount: 292_000,  total_amount: 3_212_000, status: 'PAID',     invoice_id: 'inv-007', created_at: '2026-04-02T10:00:00Z' },
]

const COMM_STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border border-amber-200",
  INVOICED: "bg-blue-50 text-blue-700 border border-blue-200",
  PAID:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  WAIVED:   "bg-slate-50 text-slate-600 border border-slate-200",
  DISPUTED: "bg-red-50 text-red-700 border border-red-200",
}

const COMM_STATUS_LABEL: Record<string, string> = {
  PENDING:  "미납",
  INVOICED: "청구됨",
  PAID:     "완납",
  WAIVED:   "면제",
  DISPUTED: "분쟁",
}

const fmt = (n: number) => "₩" + n.toLocaleString("ko-KR")

export default function AdminBillingPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get("tab") ?? "") as TabKey
  const [tab, setTab] = useState<TabKey>(
    TABS.find(t => t.key === initialTab)?.key ?? TABS[0]!.key
  )

  const [commissions, setCommissions]       = useState<Commission[]>([])
  const [commSummary, setCommSummary]       = useState<CommissionSummary | null>(null)
  const [commLoading, setCommLoading]       = useState(false)

  useEffect(() => {
    if (tab !== "commissions") return
    setCommLoading(true)

    Promise.all([
      fetch("/api/v1/commissions?page_size=50").then(r => r.json()).catch(() => null),
      fetch("/api/v1/commissions/summary").then(r => r.json()).catch(() => null),
    ]).then(([listRes, summaryRes]) => {
      const items: Commission[] = listRes?.data ?? MOCK_COMMISSIONS
      setCommissions(items.length > 0 ? items : MOCK_COMMISSIONS)
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
              { label: "이번 달 매출", value: "₩48.2M", color: "text-[var(--color-positive)]" },
              { label: "구독자", value: "2,841명", color: "text-[var(--color-brand-mid)]" },
              { label: "미결제", value: "34건", color: "text-[var(--color-danger)]" },
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
            { label: "이번달 수익",  value: "₩48.2M",   color: "text-[var(--color-positive)]", border: "border-l-emerald-400" },
            { label: "전월 대비",    value: "+26.4%",    color: "text-[var(--color-brand-mid)]", border: "border-l-blue-400"   },
            { label: "구독 갱신율",  value: "91.2%",     color: "text-purple-600",  border: "border-l-purple-400" },
            { label: "환불 비율",    value: "2.1%",      color: "text-[var(--color-warning)]",   border: "border-l-amber-400"  },
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
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={CHART_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)" }} />
                    <Bar dataKey="revenue" fill="var(--color-brand-mid)" radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payments table */}
            <div className={DS.table.wrapper}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <span className={DS.text.bodyBold}>최근 결제 내역</span>
                <button className={`${DS.text.link} text-[0.75rem]`}>전체 보기 →</button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["결제번호", "이름", "플랜", "금액", "결제일", "상태"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PAYMENTS.map(p => (
                    <tr key={p.id} className={DS.table.row}>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{p.id}</td>
                      <td className={`${DS.table.cell} font-medium`}>{p.name}</td>
                      <td className={DS.table.cell}>
                        <span className={`${DS.badge.inline("", "", "")} ${PLAN_STYLE[p.plan] ?? PLAN_STYLE.STARTER}`}>{p.plan}</span>
                      </td>
                      <td className={`${DS.table.cell} font-mono font-semibold tabular-nums`}>{p.amount}</td>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{p.date}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Placeholder tabs */}
        {tab !== "payments" && tab !== "commissions" && (
          <div className={`${DS.empty.wrapper} ${DS.card.base}`}>
            <p className={DS.empty.description}>
              {tab === "subscriptions" && "구독 관리 기능 준비 중"}
              {tab === "settlement"    && "정산 관리 기능 준비 중"}
              {tab === "coupons"       && "쿠폰 관리 기능 준비 중"}
              {tab === "pricing"       && "요금제 설정 기능 준비 중"}
            </p>
          </div>
        )}

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
                  {(commissions.length > 0 ? commissions : MOCK_COMMISSIONS).map(c => (
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
