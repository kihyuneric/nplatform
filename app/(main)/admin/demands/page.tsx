"use client"

/**
 * /admin/demands — 관리자 매수자 요구사항 관리 화면 (Phase G7+).
 *
 * 기능:
 *   1. 접수된 demand 리스트 조회 (페이지네이션)
 *   2. 각 demand 클릭 → 매칭 후보 매물 자동 산출 (slide-in 패널)
 *   3. demand 상태 변경 (ACTIVE / PAUSED / CLOSED)
 */

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Loader2, Sparkles, MapPin, Building2, ChevronRight, Search, Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NplModal } from "@/components/design-system"

interface Demand {
  id: string
  buyer_name?: string
  collateral_types?: string[]
  regions?: string[]
  min_amount?: number
  max_amount?: number
  urgency?: string
  status?: string
  preferred_risk_grades?: string[]
  avoid_conditions?: string[]
  description?: string
  memo?: string
  created_at?: string
  is_public?: boolean
}

interface MatchListing {
  id: string
  title?: string
  collateral_type?: string
  sido?: string
  sigungu?: string
  claim_amount?: number
  ai_grade?: string
  status?: string
  bid_end_date?: string | null
}

interface MatchEntry {
  score: number
  breakdown: { collateral: number; region: number; price: number; riskGrade: number; urgency: number }
  listing: MatchListing | null
}

const formatKRW = (v?: number) => {
  if (!v) return "-"
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  return `${(v / 1e4).toFixed(0)}만`
}

const URGENCY_COLOR: Record<string, string> = {
  URGENT: "bg-stone-100/15 text-stone-900 dark:text-stone-900 border-stone-300/30",
  HIGH: "bg-stone-100/15 text-stone-900 dark:text-stone-900 border-stone-300/30",
  MEDIUM: "bg-stone-100/15 text-stone-900 dark:text-stone-900 border-stone-300/30",
  LOW: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
}

export default function AdminDemandsPage() {
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Demand | null>(null)
  const [matches, setMatches] = useState<MatchEntry[] | null>(null)
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [filter, setFilter] = useState<string>("")

  const loadDemands = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/exchange/demands?page=${page}&limit=20`)
      const j = await r.json()
      setDemands(Array.isArray(j.data) ? j.data : [])
      setTotal(Number(j.total ?? 0))
    } catch {
      setDemands([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadDemands()
  }, [loadDemands])

  const openMatches = async (d: Demand) => {
    setSelected(d)
    setMatches(null)
    setMatchesLoading(true)
    try {
      const r = await fetch(`/api/v1/exchange/demands/${d.id}/matches?limit=10`)
      const j = await r.json()
      if (r.ok && j.data?.matches) {
        setMatches(j.data.matches as MatchEntry[])
      } else {
        setMatches([])
      }
    } catch {
      setMatches([])
    } finally {
      setMatchesLoading(false)
    }
  }

  const filteredDemands = filter
    ? demands.filter(d =>
        (d.buyer_name ?? "").includes(filter) ||
        (d.regions ?? []).some(r => r.includes(filter)) ||
        (d.collateral_types ?? []).some(c => c.includes(filter)),
      )
    : demands

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[0.75rem] text-[var(--color-text-tertiary)]">
        <Link href="/admin" className="hover:text-[var(--color-text-secondary)]">관리자</Link>
        <span>›</span>
        <span>매수자 요구사항</span>
      </nav>

      {/* Header */}
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">매수자 요구사항 관리</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            접수된 매수 수요 · 총 {total.toLocaleString()}건 · 클릭 시 AI 매칭 후보 자동 산출
          </p>
        </div>
        <Link href="/exchange/demands/new">
          <Button size="sm">+ 신규 등록</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
        <input
          type="text"
          placeholder="매수자명·지역·담보 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="npl-input pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--color-text-tertiary)] gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> 로딩 중...
        </div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-tertiary)]">
          접수된 매수자 요구사항이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDemands.map((d) => (
            <button
              key={d.id}
              onClick={() => openMatches(d)}
              className="npl-surface-card text-left rounded-none p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <strong className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                  {d.buyer_name ?? "익명 매수자"}
                </strong>
                {d.urgency && (
                  <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full border ${URGENCY_COLOR[d.urgency] ?? URGENCY_COLOR.LOW}`}>
                    {d.urgency}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-[var(--color-text-tertiary)]" />
                  {(d.regions ?? []).slice(0, 4).join(" · ") || "전체 지역"}
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3 h-3 shrink-0 text-[var(--color-text-tertiary)]" />
                  {(d.collateral_types ?? []).slice(0, 4).join(" · ") || "전체 담보"}
                </div>
                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-[var(--color-text-tertiary)]">예산:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {formatKRW(d.min_amount)} ~ {formatKRW(d.max_amount)}
                  </span>
                </div>
                {d.preferred_risk_grades && d.preferred_risk_grades.length > 0 && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[var(--color-text-tertiary)]">등급:</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {d.preferred_risk_grades.join("/")}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-[0.625rem] text-[var(--color-text-tertiary)]">
                <span>{d.created_at ? new Date(d.created_at).toLocaleDateString("ko-KR") : ""}</span>
                <span className="inline-flex items-center gap-1 text-stone-900 dark:text-stone-900 font-bold">
                  <Sparkles className="w-3 h-3" /> AI 매칭 보기 <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Matches Modal */}
      <NplModal
        open={!!selected}
        onOpenChange={(o) => { if (!o) { setSelected(null); setMatches(null) } }}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-stone-900" />
            {selected?.buyer_name ?? "익명"} · AI 매칭 후보
          </span>
        }
        description={
          selected
            ? `${(selected.regions ?? []).join("·") || "전체 지역"} · ${(selected.collateral_types ?? []).join("·") || "전체 담보"} · ${formatKRW(selected.min_amount)} ~ ${formatKRW(selected.max_amount)}`
            : ""
        }
        size="lg"
      >
        {matchesLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[var(--color-text-tertiary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> AI 매칭 중...
          </div>
        ) : !matches ? (
          <p className="text-center py-8 text-[var(--color-text-tertiary)] text-sm">매칭 결과 없음</p>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-tertiary)] text-sm mb-2">조건에 맞는 매물이 없습니다.</p>
            <p className="text-[var(--color-text-muted)] text-xs">회피 조건 / 가격 범위를 완화해 보세요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m, idx) => (
              <div
                key={`${m.listing?.id ?? idx}`}
                className="npl-surface-card-raised rounded-none p-4"
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <strong className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                    {m.listing?.title ?? "(매물명 없음)"}
                  </strong>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100/15 text-stone-900 dark:text-stone-900 text-[0.6875rem] font-bold tabular-nums">
                    매칭 {m.score}점
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[0.6875rem]">
                  <div>
                    <div className="text-[var(--color-text-tertiary)]">담보</div>
                    <div className="font-semibold text-[var(--color-text-primary)]">{m.listing?.collateral_type ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-tertiary)]">지역</div>
                    <div className="font-semibold text-[var(--color-text-primary)] truncate">{m.listing?.sido ?? "-"} {m.listing?.sigungu ?? ""}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-tertiary)]">채권액</div>
                    <div className="font-semibold tabular-nums text-[var(--color-text-primary)]">{formatKRW(m.listing?.claim_amount)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-tertiary)]">AI등급</div>
                    <div className="font-bold text-[var(--color-text-primary)]">{m.listing?.ai_grade ?? "-"}</div>
                  </div>
                </div>
                {/* breakdown bars */}
                <div className="mt-3 grid grid-cols-5 gap-1 text-[0.625rem]">
                  {[
                    { label: "담보", v: m.breakdown.collateral, max: 35 },
                    { label: "지역", v: m.breakdown.region, max: 25 },
                    { label: "가격", v: m.breakdown.price, max: 20 },
                    { label: "등급", v: m.breakdown.riskGrade, max: 10 },
                    { label: "급도", v: m.breakdown.urgency, max: 10 },
                  ].map((b) => (
                    <div key={b.label} className="text-center">
                      <div className="h-1 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
                        <div className="h-full bg-stone-100" style={{ width: `${(b.v / b.max) * 100}%` }} />
                      </div>
                      <div className="mt-1 text-[var(--color-text-tertiary)]">{b.label} {b.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  {m.listing?.id && (
                    <Link href={`/exchange/${m.listing.id}`} target="_blank" className="text-[0.6875rem] font-semibold text-stone-900 dark:text-stone-900 hover:underline inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> 매물 상세 ↗
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </NplModal>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span>{total.toLocaleString()}건 · {page}/{Math.ceil(total / 20)} 페이지</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] disabled:opacity-50"
            >
              이전
            </button>
            <button
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
