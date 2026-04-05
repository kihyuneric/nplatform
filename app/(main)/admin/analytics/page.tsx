"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Users, TrendingUp, Zap, ShieldCheck, BarChart2, Clock, CheckCircle2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

const TABS = ["코호트 분석", "퍼널 분석", "성능", "컴플라이언스"] as const
type Tab = (typeof TABS)[number]

const COHORT = [
  { month: "2025-10", total: 312, r1: 68, r2: 54, r3: 41 },
  { month: "2025-11", total: 278, r1: 71, r2: 57, r3: 44 },
  { month: "2025-12", total: 401, r1: 65, r2: 49, r3: 38 },
  { month: "2026-01", total: 534, r1: 74, r2: 61, r3: null },
  { month: "2026-02", total: 489, r1: 70, r2: null, r3: null },
  { month: "2026-03", total: 621, r1: null, r2: null, r3: null },
]

const FUNNEL = [
  { step: "회원가입", users: 18240, color: "#3B82F6" },
  { step: "매물조회", users: 12108, color: "#7C3AED" },
  { step: "딜룸참여", users: 4562, color: "#10B981" },
  { step: "계약완료", users: 843, color: "#F59E0B" },
]

const PAGE_PERF = [
  { page: "/npl-analysis", load: "1.24s", api: "340ms", p99: "2.1s", status: "정상" },
  { page: "/listings", load: "0.98s", api: "210ms", p99: "1.6s", status: "정상" },
  { page: "/market/search", load: "1.87s", api: "520ms", p99: "3.4s", status: "주의" },
  { page: "/deal-rooms/[id]", load: "1.42s", api: "290ms", p99: "2.3s", status: "정상" },
  { page: "/statistics", load: "2.31s", api: "840ms", p99: "4.2s", status: "경고" },
  { page: "/tools/auction-simulator", load: "1.05s", api: "180ms", p99: "1.9s", status: "정상" },
]

const COMPLIANCE = [
  { label: "KYC 완료율", value: 87.4, target: 90, unit: "%" },
  { label: "GDPR 동의율", value: 96.2, target: 95, unit: "%" },
  { label: "개인정보 처리방침 동의", value: 99.1, target: 99, unit: "%" },
  { label: "마케팅 수신 동의", value: 61.3, target: 70, unit: "%" },
]

const PRIVACY_ITEMS = [
  { type: "수집", desc: "회원가입 시 이름, 이메일, 연락처 수집", retentionDays: 1825, status: "준수" },
  { type: "제3자 제공", desc: "본인인증 시 통신사 제공", retentionDays: 365, status: "준수" },
  { type: "위탁", desc: "결제 처리 PG사 위탁", retentionDays: 730, status: "준수" },
  { type: "파기", desc: "탈퇴 후 30일 내 파기 처리", retentionDays: 30, status: "준수" },
]

function RetentionCell({ value }: { value: number | null }) {
  if (value === null)
    return <td className={`${DS.table.cellMuted} text-center`}>-</td>
  const cls =
    value >= 60 ? "bg-emerald-50 text-emerald-700"
    : value >= 40 ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-700"
  return (
    <td className={`${DS.table.cell} text-center`}>
      <span className={`text-[0.8125rem] font-semibold px-2 py-0.5 rounded ${cls}`}>{value}%</span>
    </td>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "정상" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : status === "주의" ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-red-50 text-red-700 border border-red-200"
  return <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{status}</span>
}

const TAB_MAP: Record<string, Tab> = {
  "cohort": "코호트 분석",
  "funnel": "퍼널 분석",
  "monitoring": "성능",
  "performance": "성능",
  "compliance": "컴플라이언스",
}

export default function AdminAnalyticsPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Header */}
        <div className={DS.header.wrapper}>
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-[var(--color-brand-mid)]" />
            <h1 className={DS.header.title}>고급 분석</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* 코호트 분석 */}
        {tab === "코호트 분석" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.bodyBold}>월별 신규가입 코호트 리텐션</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["가입월", "신규 가입수", "1개월 리텐션", "2개월 리텐션", "3개월 리텐션"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h !== "가입월" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COHORT.map((row) => (
                  <tr key={row.month} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-mono`}>{row.month}</td>
                    <td className={`${DS.table.cell} text-center`}>{row.total.toLocaleString()}</td>
                    <RetentionCell value={row.r1} />
                    <RetentionCell value={row.r2} />
                    <RetentionCell value={row.r3} />
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`px-4 py-3 border-t border-[var(--color-border-subtle)] ${DS.text.captionLight}`}>
              * 리텐션률: 해당 기간 내 1회 이상 로그인한 사용자 비율 | — 는 아직 집계되지 않은 데이터
            </div>
          </div>
        )}

        {/* 퍼널 분석 */}
        {tab === "퍼널 분석" && (
          <div className="space-y-4">
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h2 className={DS.text.bodyBold}>전환 퍼널 분석</h2>
                <span className={`${DS.text.caption} ml-auto`}>최근 30일 기준</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={FUNNEL} layout="vertical" margin={{ left: 16, right: 32 }}>
                  <XAxis type="number" tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} />
                  <YAxis dataKey="step" type="category" tick={{ fill: "var(--color-text-primary)", fontSize: 13 }} width={80} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", borderRadius: 8 }}
                    labelStyle={{ color: "var(--color-text-primary)" }}
                    formatter={(v: number) => [v.toLocaleString() + "명", "사용자"]}
                  />
                  <Bar dataKey="users" radius={[0, 6, 6, 0]}>
                    {FUNNEL.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {FUNNEL.map((step, i) => {
                const prev = i > 0 ? FUNNEL[i - 1].users : step.users
                const conv = i === 0 ? 100 : Math.round((step.users / prev) * 100)
                return (
                  <div key={step.step} className={`${DS.stat.card}`}>
                    <p className={DS.stat.label}>{step.step}</p>
                    <p className={DS.stat.value}>{step.users.toLocaleString()}</p>
                    <p className={DS.stat.sub} style={{ color: step.color }}>
                      {i === 0 ? "시작점" : `전환 ${conv}%`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 성능 */}
        {tab === "성능" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-warning)]" />
              <h2 className={DS.text.bodyBold}>페이지 및 API 성능</h2>
              <button
                onClick={() => toast.success("성능 데이터를 새로고침했습니다.")}
                className={`ml-auto ${DS.button.ghost} text-[0.75rem]`}
              >
                <Clock className="w-3 h-3" /> 새로고침
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["페이지 경로", "평균 로딩시간", "API 응답시간", "P99", "상태"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h !== "페이지 경로" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAGE_PERF.map((row) => (
                  <tr key={row.page} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-mono text-[var(--color-brand-mid)]`}>{row.page}</td>
                    <td className={`${DS.table.cell} text-center`}>{row.load}</td>
                    <td className={`${DS.table.cell} text-center`}>{row.api}</td>
                    <td className={`${DS.table.cellMuted} text-center`}>{row.p99}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 컴플라이언스 */}
        {tab === "컴플라이언스" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {COMPLIANCE.map((item) => {
                const ok = item.value >= item.target
                return (
                  <div key={item.label} className={`${DS.card.base} ${DS.card.padding}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={DS.text.body}>{item.label}</span>
                      <ShieldCheck className={`w-4 h-4 ${ok ? "text-[var(--color-positive)]" : "text-[var(--color-warning)]"}`} />
                    </div>
                    <div className={`${DS.text.metricLarge} mb-2`}>
                      {item.value}{item.unit}
                    </div>
                    <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-2 mb-1">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${item.value}%`,
                          background: ok ? "var(--color-positive)" : "var(--color-warning)",
                        }}
                      />
                    </div>
                    <div className={DS.text.captionLight}>목표: {item.target}{item.unit}</div>
                  </div>
                )
              })}
            </div>

            <div className={DS.table.wrapper}>
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />
                <h2 className={DS.text.bodyBold}>개인정보 처리 현황</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["처리 유형", "내용", "보유 기간", "상태"].map(h => (
                      <th key={h} className={`${DS.table.headerCell} ${h === "보유 기간" || h === "상태" ? "text-center" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRIVACY_ITEMS.map((item) => (
                    <tr key={item.type} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-medium`}>{item.type}</td>
                      <td className={DS.table.cellMuted}>{item.desc}</td>
                      <td className={`${DS.table.cell} text-center`}>{item.retentionDays}일</td>
                      <td className={`${DS.table.cell} text-center`}>
                        <span className="text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {item.status}
                        </span>
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
