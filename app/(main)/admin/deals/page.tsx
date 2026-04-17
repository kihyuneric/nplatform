"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, CheckCircle, Eye, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type Stage = "협의중" | "실사" | "계약" | "완료" | "분쟁"

const STATUS_TO_STAGE: Record<string, Stage> = {
  negotiation: "협의중",
  due_diligence: "실사",
  contract: "계약",
  completed: "완료",
  dispute: "분쟁",
  active: "협의중",
  pending: "협의중",
  closed: "완료",
}

const STAGE_TO_STATUS: Record<Stage, string> = {
  "협의중": "negotiation",
  "실사": "due_diligence",
  "계약": "contract",
  "완료": "completed",
  "분쟁": "dispute",
}

interface Deal {
  id: string
  title: string
  buyer: string
  seller: string
  amount: number
  stage: Stage
  date: string
  participantCount: number
  contractCount: number
}

interface Dispute {
  id: string
  dealId: string
  title: string
  reporter: string
  reason: string
  status: string
  date: string
}

interface MonthlyStats {
  month: string
  count: number
  amount: number
}

const STAGE_BADGE: Record<Stage | string, string> = {
  "협의중": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "실사":   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "계약":   "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  "완료":   "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "분쟁":   "bg-red-500/10 text-red-400 border border-red-500/20",
}

const DISPUTE_BADGE: Record<string, string> = {
  "접수":   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "심사중": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "해결":   "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
}

const DISPUTE_STATUS_MAP: Record<string, string> = {
  pending: "접수",
  reviewing: "심사중",
  resolved: "해결",
  접수: "접수",
  심사중: "심사중",
  해결: "해결",
}

const TABS = ["진행 거래", "완료 거래", "분쟁/신고", "거래 통계"] as const
type Tab = typeof TABS[number]

// ─── Supabase Hook ────────────────────────────────────────────────────────────

function useAdminDeals() {
  const supabase = createClient()

  const [activeDeals, setActiveDeals] = useState<Deal[]>([])
  const [completedDeals, setCompletedDeals] = useState<Deal[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [chartData, setChartData] = useState<MonthlyStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch deal rooms with participants count
      const { data: rooms, error: roomsErr } = await supabase
        .from("deal_rooms")
        .select(`
          id,
          title,
          status,
          created_at,
          listing_id,
          deal_room_participants ( user_id, role ),
          contract_requests ( id, status )
        `)
        .order("created_at", { ascending: false })

      if (roomsErr) throw roomsErr

      const active: Deal[] = []
      const completed: Deal[] = []
      const disputeList: Dispute[] = []

      for (const room of rooms || []) {
        const participants = (room.deal_room_participants as Array<{ user_id: string; role: string }>) || []
        const contracts = (room.contract_requests as Array<{ id: string; status: string }>) || []
        const buyer = participants.find((p) => p.role === "buyer")
        const seller = participants.find((p) => p.role === "seller")

        const stage = STATUS_TO_STAGE[room.status] || "협의중"

        const deal: Deal = {
          id: room.id,
          title: room.title || `딜룸 ${room.id.slice(0, 8)}`,
          buyer: buyer?.user_id?.slice(0, 6) || "-",
          seller: seller?.user_id?.slice(0, 6) || "-",
          amount: 0,
          stage,
          date: formatDate(room.created_at),
          participantCount: participants.length,
          contractCount: contracts.length,
        }

        if (stage === "완료") {
          completed.push(deal)
        } else if (stage === "분쟁") {
          disputeList.push({
            id: `DP-${room.id.slice(0, 6)}`,
            dealId: room.id.slice(0, 8),
            title: deal.title,
            reporter: buyer?.user_id?.slice(0, 6) || "-",
            reason: "분쟁 접수",
            status: "심사중",
            date: deal.date,
          })
          active.push(deal)
        } else {
          active.push(deal)
        }
      }

      // Also fetch contract_requests with dispute status
      const { data: disputeContracts } = await supabase
        .from("contract_requests")
        .select("id, deal_room_id, status, created_at")
        .in("status", ["dispute", "pending", "reviewing", "rejected"])
        .order("created_at", { ascending: false })

      if (disputeContracts) {
        for (const dc of disputeContracts) {
          const matchingRoom = (rooms || []).find((r) => r.id === dc.deal_room_id)
          if (matchingRoom && !disputeList.find((d) => d.dealId === dc.deal_room_id.slice(0, 8))) {
            disputeList.push({
              id: `DP-${dc.id.slice(0, 6)}`,
              dealId: dc.deal_room_id.slice(0, 8),
              title: matchingRoom.title || `딜룸 ${dc.deal_room_id.slice(0, 8)}`,
              reporter: "-",
              reason: dc.status === "rejected" ? "계약 거절" : "계약 분쟁",
              status: DISPUTE_STATUS_MAP[dc.status] || "접수",
              date: formatDate(dc.created_at),
            })
          }
        }
      }

      setActiveDeals(active)
      setCompletedDeals(completed)
      setDisputes(disputeList)

      // Build chart data from monthly aggregation
      const monthlyMap = new Map<string, { count: number; amount: number }>()
      const allDeals = [...active, ...completed]
      for (const d of allDeals) {
        const dateStr = d.date
        // Extract month (assuming formatDate returns YYYY-MM-DD or similar)
        const month = dateStr.length >= 7 ? dateStr.slice(0, 7) : dateStr
        const existing = monthlyMap.get(month) || { count: 0, amount: 0 }
        existing.count += 1
        existing.amount += d.amount
        monthlyMap.set(month, existing)
      }

      const months = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, stats]) => ({
          month: month.length >= 7 ? `${parseInt(month.slice(5))}월` : month,
          count: stats.count,
          amount: stats.amount,
        }))

      setChartData(months.length > 0 ? months : [])
    } catch (err) {
      console.error("Failed to fetch deals:", err)
      toast.error("거래 데이터를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const updateDealStatus = useCallback(async (dealId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("deal_rooms")
        .update({ status: newStatus })
        .eq("id", dealId)

      if (error) throw error
      toast.success("거래 상태가 업데이트되었습니다.")
      await fetchDeals()
    } catch (err) {
      console.error("Failed to update deal:", err)
      toast.error("상태 업데이트에 실패했습니다.")
    }
  }, [supabase, fetchDeals])

  const resolveDispute = useCallback(async (dealId: string) => {
    try {
      // Update the deal room status to completed (resolved)
      const { error } = await supabase
        .from("deal_rooms")
        .update({ status: "completed" })
        .eq("id", dealId)

      if (error) throw error

      // Also update any dispute contract requests
      await supabase
        .from("contract_requests")
        .update({ status: "resolved" })
        .eq("deal_room_id", dealId)
        .in("status", ["dispute", "pending", "reviewing"])

      toast.success("분쟁이 해결 처리되었습니다.")
      await fetchDeals()
    } catch (err) {
      console.error("Failed to resolve dispute:", err)
      toast.error("분쟁 처리에 실패했습니다.")
    }
  }, [supabase, fetchDeals])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  return {
    activeDeals,
    completedDeals,
    disputes,
    chartData,
    loading,
    refresh: fetchDeals,
    updateDealStatus,
    resolveDispute,
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

function DealTable({
  deals,
  onViewDeal,
  onUpdateStatus,
}: {
  deals: Deal[]
  onViewDeal?: (id: string) => void
  onUpdateStatus?: (id: string, status: string) => void
}) {
  return (
    <div className={DS.table.wrapper}>
      <table className="w-full min-w-[860px]">
        <thead>
          <tr className={DS.table.header}>
            {["딜룸 ID", "매물명", "매수자", "매도자", "참여자", "계약", "진행 단계", "날짜", ""].map(h => (
              <th key={h} className={DS.table.headerCell}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-8">
                <p className={DS.text.captionLight}>데이터가 없습니다.</p>
              </td>
            </tr>
          ) : (
            deals.map(d => (
              <tr key={d.id} className={DS.table.row}>
                <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{d.id.slice(0, 8)}</td>
                <td className={`${DS.table.cell} font-medium max-w-[160px] truncate`}>{d.title}</td>
                <td className={DS.table.cellMuted}>{d.buyer}</td>
                <td className={DS.table.cellMuted}>{d.seller}</td>
                <td className={`${DS.table.cellMuted} text-center`}>{d.participantCount}</td>
                <td className={`${DS.table.cellMuted} text-center`}>{d.contractCount}</td>
                <td className={DS.table.cell}>
                  <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${STAGE_BADGE[d.stage]}`}>{d.stage}</span>
                </td>
                <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{d.date}</td>
                <td className={DS.table.cell}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewDeal?.(d.id) ?? toast.info(`딜룸 ${d.id.slice(0, 8)} 상세 조회`)}
                      className={`${DS.text.link} text-[0.8125rem] flex items-center gap-1`}
                    >
                      <Eye size={12} />보기
                    </button>
                    {d.stage !== "완료" && d.stage !== "분쟁" && onUpdateStatus && (
                      <button
                        onClick={() => {
                          const stages: Stage[] = ["협의중", "실사", "계약", "완료"]
                          const currentIdx = stages.indexOf(d.stage)
                          if (currentIdx < stages.length - 1) {
                            const nextStage = stages[currentIdx + 1]
                            onUpdateStatus(d.id, STAGE_TO_STATUS[nextStage])
                          }
                        }}
                        className={`text-[0.8125rem] flex items-center gap-1 text-[var(--color-positive)] hover:text-emerald-300 font-medium transition-colors`}
                      >
                        <CheckCircle size={12} />진행
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDealsPage() {
  const [tab, setTab] = useState<Tab>("진행 거래")
  const {
    activeDeals,
    completedDeals,
    disputes,
    chartData,
    loading,
    refresh,
    updateDealStatus,
    resolveDispute,
  } = useAdminDeals()

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={DS.text.pageSubtitle}>거래 관리</h1>
            <p className={`${DS.text.body} mt-1`}>딜룸 진행 현황 및 분쟁 처리</p>
          </div>
          <button onClick={refresh} disabled={loading} className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            새로고침
          </button>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Quick Nav */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>← 대시보드</Link>
          <Link href="/admin/users" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>회원 관리 →</Link>
          <Link href="/admin/listings" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>매물 관리 →</Link>
          <Link href="/deals" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>사용자 거래 현황 →</Link>
        </div>

        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 size={20} className="animate-spin text-[var(--color-brand-mid)]" />
            <span className={DS.text.body}>데이터를 불러오는 중...</span>
          </div>
        )}

        {/* 진행 거래 */}
        {!loading && tab === "진행 거래" && (
          <div className="space-y-3">
            <div className="flex gap-3">
              {[
                { label: "진행중", value: activeDeals.length, color: "text-[var(--color-brand-mid)]" },
                { label: "실사 단계", value: activeDeals.filter(d => d.stage === "실사").length, color: "text-[var(--color-warning)]" },
                { label: "계약 단계", value: activeDeals.filter(d => d.stage === "계약").length, color: "text-[var(--color-positive)]" },
              ].map(k => (
                <div key={k.label} className={DS.stat.card}>
                  <p className={DS.stat.label}>{k.label}</p>
                  <p className={`${DS.stat.value} ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
            <DealTable deals={activeDeals} onUpdateStatus={updateDealStatus} />
          </div>
        )}

        {/* 완료 거래 */}
        {!loading && tab === "완료 거래" && (
          <div className="space-y-3">
            <div className={`${DS.stat.card} w-fit`}>
              <p className={DS.stat.label}>완료 건수</p>
              <p className={`${DS.stat.value} text-[var(--color-positive)]`}>{completedDeals.length}</p>
            </div>
            <DealTable deals={completedDeals} />
          </div>
        )}

        {/* 분쟁/신고 */}
        {!loading && tab === "분쟁/신고" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              {[
                { label: "전체 신고", value: disputes.length, color: "text-[var(--color-danger)]" },
                { label: "심사중",   value: disputes.filter(d => d.status === "심사중").length, color: "text-[var(--color-warning)]" },
                { label: "해결",     value: disputes.filter(d => d.status === "해결").length,   color: "text-[var(--color-positive)]" },
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
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className={DS.table.header}>
                    {["신고 ID", "딜룸", "매물명", "신고자", "사유", "상태", "접수일", "처리"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disputes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8">
                        <p className={DS.text.captionLight}>신고 내역이 없습니다.</p>
                      </td>
                    </tr>
                  ) : (
                    disputes.map(d => (
                      <tr key={d.id} className={DS.table.row}>
                        <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{d.id}</td>
                        <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{d.dealId}</td>
                        <td className={`${DS.table.cell} font-medium`}>{d.title}</td>
                        <td className={DS.table.cellMuted}>{d.reporter}</td>
                        <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{d.reason}</td>
                        <td className={DS.table.cell}>
                          <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${DISPUTE_BADGE[d.status] || DISPUTE_BADGE["접수"]}`}>{d.status}</span>
                        </td>
                        <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{d.date}</td>
                        <td className={DS.table.cell}>
                          {d.status !== "해결" && (
                            <button
                              onClick={() => resolveDispute(d.dealId)}
                              className={`${DS.text.link} text-[var(--color-positive)] text-[0.8125rem] flex items-center gap-1`}
                            >
                              <CheckCircle size={12} />처리
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 거래 통계 */}
        {!loading && tab === "거래 통계" && (
          <div className="space-y-5">
            {chartData.length === 0 ? (
              <div className={`${DS.card.base} ${DS.card.padding} text-center py-12`}>
                <p className={DS.text.captionLight}>거래 통계 데이터가 아직 없습니다.</p>
              </div>
            ) : (
              <>
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <h2 className={`${DS.text.cardTitle} mb-4`}>월별 거래 건수</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barSize={28}>
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
                    <BarChart data={chartData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)", borderRadius: 8 }} />
                      <Bar dataKey="amount" fill="var(--color-positive)" radius={[4, 4, 0, 0]} name="거래금액(억)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
