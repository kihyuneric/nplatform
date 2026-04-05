"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, CheckCircle, Eye } from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type Stage = "협의중" | "실사" | "계약" | "완료" | "분쟁"

interface Deal {
  id: string; title: string; buyer: string; seller: string
  amount: number; stage: Stage; date: string
}

const ACTIVE_DEALS: Deal[] = [
  { id: "DR-1021", title: "강남구 오피스 빌딩 4층",    buyer: "김민준", seller: "이서연", amount: 45, stage: "실사",  date: "2026-03-10" },
  { id: "DR-1022", title: "송파구 상업용 건물",         buyer: "최지우", seller: "정하은", amount: 120, stage: "계약", date: "2026-03-15" },
  { id: "DR-1023", title: "마포구 근린생활시설",         buyer: "강서준", seller: "윤채원", amount: 28, stage: "협의중", date: "2026-03-22" },
  { id: "DR-1024", title: "서초구 아파트형 공장",        buyer: "오수아", seller: "신예준", amount: 67, stage: "실사",  date: "2026-03-28" },
  { id: "DR-1025", title: "영등포구 복합 수익 빌딩",     buyer: "임지호", seller: "박도현", amount: 89, stage: "협의중", date: "2026-04-01" },
]

const COMPLETED_DEALS: Deal[] = [
  { id: "DR-0901", title: "해운대 해변상가",       buyer: "한소희", seller: "차은우", amount: 55,  stage: "완료", date: "2026-02-14" },
  { id: "DR-0902", title: "송도 물류센터 2동",     buyer: "남주혁", seller: "박보검", amount: 230, stage: "완료", date: "2026-02-20" },
  { id: "DR-0903", title: "대전 유성구 오피스텔",  buyer: "이종석", seller: "공유",   amount: 18,  stage: "완료", date: "2026-03-05" },
  { id: "DR-0904", title: "부산 서면 상업빌딩",    buyer: "공효진", seller: "손예진", amount: 77,  stage: "완료", date: "2026-03-18" },
]

const DISPUTES = [
  { id: "DP-001", dealId: "DR-0855", title: "강남 꼬마빌딩",  reporter: "김민준", reason: "계약 조건 위반",    status: "접수",   date: "2026-03-20" },
  { id: "DP-002", dealId: "DR-0812", title: "종로 상가건물",  reporter: "이서연", reason: "서류 허위 기재",    status: "심사중", date: "2026-03-25" },
  { id: "DP-003", dealId: "DR-0790", title: "홍대 복합건물",  reporter: "최지우", reason: "중도금 지연",       status: "해결",   date: "2026-04-01" },
]

const CHART_DATA = [
  { month: "11월", count: 32, amount: 280 },
  { month: "12월", count: 41, amount: 340 },
  { month: "1월",  count: 28, amount: 210 },
  { month: "2월",  count: 53, amount: 490 },
  { month: "3월",  count: 67, amount: 620 },
  { month: "4월",  count: 19, amount: 180 },
]

const STAGE_BADGE: Record<Stage | string, string> = {
  "협의중": "bg-blue-50 text-blue-700 border border-blue-200",
  "실사":   "bg-amber-50 text-amber-700 border border-amber-200",
  "계약":   "bg-purple-50 text-purple-700 border border-purple-200",
  "완료":   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "분쟁":   "bg-red-50 text-red-700 border border-red-200",
}

const DISPUTE_BADGE: Record<string, string> = {
  "접수":   "bg-amber-50 text-amber-700 border border-amber-200",
  "심사중": "bg-blue-50 text-blue-700 border border-blue-200",
  "해결":   "bg-emerald-50 text-emerald-700 border border-emerald-200",
}

const TABS = ["진행 거래", "완료 거래", "분쟁/신고", "거래 통계"] as const
type Tab = typeof TABS[number]

function DealTable({ deals }: { deals: Deal[] }) {
  return (
    <div className={DS.table.wrapper}>
      <table className="w-full">
        <thead>
          <tr className={DS.table.header}>
            {["딜룸 ID", "매물명", "매수자", "매도자", "금액(억)", "진행 단계", "날짜", ""].map(h => (
              <th key={h} className={DS.table.headerCell}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map(d => (
            <tr key={d.id} className={DS.table.row}>
              <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{d.id}</td>
              <td className={`${DS.table.cell} font-medium max-w-[160px] truncate`}>{d.title}</td>
              <td className={DS.table.cellMuted}>{d.buyer}</td>
              <td className={DS.table.cellMuted}>{d.seller}</td>
              <td className={`${DS.table.cell} font-mono`}>{d.amount}억</td>
              <td className={DS.table.cell}>
                <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${STAGE_BADGE[d.stage]}`}>{d.stage}</span>
              </td>
              <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{d.date}</td>
              <td className={DS.table.cell}>
                <button onClick={() => toast.info(`${d.id} 상세 조회`)} className={`${DS.text.link} text-[0.8125rem] flex items-center gap-1`}>
                  <Eye size={12} />보기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminDealsPage() {
  const [tab, setTab] = useState<Tab>("진행 거래")

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <h1 className={DS.text.pageSubtitle}>거래 관리</h1>
        <p className={`${DS.text.body} mt-1`}>딜룸 진행 현황 및 분쟁 처리</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* 진행 거래 */}
        {tab === "진행 거래" && (
          <div className="space-y-3">
            <div className="flex gap-3">
              {[
                { label: "진행중", value: ACTIVE_DEALS.length, color: "text-[var(--color-brand-mid)]" },
                { label: "총액(억)", value: ACTIVE_DEALS.reduce((s, d) => s + d.amount, 0), color: "text-[var(--color-positive)]" },
              ].map(k => (
                <div key={k.label} className={DS.stat.card}>
                  <p className={DS.stat.label}>{k.label}</p>
                  <p className={`${DS.stat.value} ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
            <DealTable deals={ACTIVE_DEALS} />
          </div>
        )}

        {/* 완료 거래 */}
        {tab === "완료 거래" && (
          <div className="space-y-3">
            <div className={`${DS.stat.card} w-fit`}>
              <p className={DS.stat.label}>완료 건수</p>
              <p className={`${DS.stat.value} text-[var(--color-positive)]`}>{COMPLETED_DEALS.length}</p>
            </div>
            <DealTable deals={COMPLETED_DEALS} />
          </div>
        )}

        {/* 분쟁/신고 */}
        {tab === "분쟁/신고" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              {[
                { label: "전체 신고", value: DISPUTES.length, color: "text-[var(--color-danger)]" },
                { label: "심사중",   value: DISPUTES.filter(d => d.status === "심사중").length, color: "text-[var(--color-warning)]" },
                { label: "해결",     value: DISPUTES.filter(d => d.status === "해결").length,   color: "text-[var(--color-positive)]" },
              ].map(k => (
                <div key={k.label} className={DS.stat.card}>
                  <p className={DS.stat.label}>{k.label}</p>
                  <p className={`${DS.stat.value} ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
            <div className={DS.table.wrapper}>
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
                <AlertTriangle size={14} className="text-[var(--color-warning)]" />
                <span className={DS.text.bodyBold}>신고 목록</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["신고 ID", "딜룸", "매물명", "신고자", "사유", "상태", "접수일", "처리"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DISPUTES.map(d => (
                    <tr key={d.id} className={DS.table.row}>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{d.id}</td>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{d.dealId}</td>
                      <td className={`${DS.table.cell} font-medium`}>{d.title}</td>
                      <td className={DS.table.cellMuted}>{d.reporter}</td>
                      <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{d.reason}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${DISPUTE_BADGE[d.status]}`}>{d.status}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{d.date}</td>
                      <td className={DS.table.cell}>
                        {d.status !== "해결" && (
                          <button onClick={() => toast.success(`${d.id} 처리 완료`)} className={`${DS.text.link} text-[var(--color-positive)] text-[0.8125rem] flex items-center gap-1`}>
                            <CheckCircle size={12} />처리
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 거래 통계 */}
        {tab === "거래 통계" && (
          <div className="space-y-5">
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <h2 className={`${DS.text.cardTitle} mb-4`}>월별 거래 건수</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CHART_DATA} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="var(--color-brand-mid)" radius={[4, 4, 0, 0]} name="거래건수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <h2 className={`${DS.text.cardTitle} mb-4`}>월별 거래 금액(억원)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CHART_DATA} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)", borderRadius: 8 }} />
                  <Bar dataKey="amount" fill="var(--color-positive)" radius={[4, 4, 0, 0]} name="거래금액(억)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
