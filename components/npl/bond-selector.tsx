"use client"

/**
 * components/npl/bond-selector.tsx
 *
 * NPL 분석 폼 상단에 삽입되는 "기등록 채권 선택" 드롭다운.
 * 매도자(본인)가 `/exchange/auction/new` 로 등록해둔 채권을 불러와 분석 폼을 자동으로 채움.
 *
 * UIF-2026Q2-v1 기획서 S2.
 */

import { useEffect, useState } from "react"
import { Bookmark, ChevronDown, Loader2, RotateCcw } from "lucide-react"

export interface MyListing {
  id: string
  title: string
  address: string | null
  collateral_type: string | null
  loan_principal: number | null
  unpaid_interest: number | null
  claim_amount: number | null
  appraised_value: number | null
  ai_estimated_price: number | null
  special_conditions: unknown
  claim_breakdown: unknown
  rights_summary: unknown
  lease_summary: unknown
  debtor_owner_same: boolean | null
  desired_sale_discount: number | null
  appraisal_date: string | null
  auction_date: string | null
  market_price_note: string | null
  created_at: string
}

export function BondSelector({
  onSelect,
  onClear,
}: {
  onSelect: (listing: MyListing) => void
  onClear?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<MyListing[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/exchange/auction/my-listings")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error?.message || "목록 조회 실패")
      }
      setItems(Array.isArray(json.data) ? (json.data as MyListing[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 조회 실패")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && items === null) load()
  }, [open, items])

  const current = items?.find((x) => x.id === selectedId) ?? null

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <Bookmark className="w-4 h-4 mt-0.5 text-sky-500" />
          <div>
            <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
              기등록 채권 불러오기 (매도사 · 매각사)
            </h4>
            <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
              이전에 거래소에 등록한 채권을 선택하면 분석 폼이 자동으로 채워집니다.
            </p>
          </div>
        </div>
        {current && (
          <button
            type="button"
            onClick={() => {
              setSelectedId(null)
              onClear?.()
            }}
            className="text-[0.6875rem] inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]"
          >
            <RotateCcw className="w-3 h-3" /> 선택 해제
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
      >
        <span className="truncate">
          {current
            ? `${current.title} · ${fmtMoney(current.loan_principal)} 원금`
            : "— 채권 선택 —"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--color-text-tertiary)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] max-h-72 overflow-y-auto">
          {loading && (
            <div className="p-4 flex items-center gap-2 text-[0.75rem] text-[var(--color-text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
            </div>
          )}
          {error && !loading && (
            <div className="p-4 text-[0.75rem] text-red-500">{error}</div>
          )}
          {!loading && !error && items && items.length === 0 && (
            <div className="p-4 text-[0.75rem] text-[var(--color-text-tertiary)]">
              등록한 NPL 채권이 없습니다. 먼저{" "}
              <a href="/exchange/auction/new" className="text-emerald-600 dark:text-emerald-300 underline">
                매물등록
              </a>{" "}
              을 진행하세요.
            </div>
          )}
          {!loading &&
            !error &&
            items &&
            items.length > 0 &&
            items.map((it) => {
              const active = selectedId === it.id
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(it.id)
                    onSelect(it)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-[var(--color-border-subtle)] last:border-b-0 transition-colors ${
                    active ? "bg-sky-500/10" : "hover:bg-[var(--color-surface-base)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[0.8125rem] font-semibold text-[var(--color-text-primary)] truncate">
                        {it.title}
                      </div>
                      <div className="text-[0.6875rem] text-[var(--color-text-tertiary)] truncate">
                        {it.address ?? "주소 미기재"} · {it.collateral_type ?? "기타"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[0.6875rem] text-[var(--color-text-tertiary)]">원금</div>
                      <div className="text-[0.75rem] font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">
                        {fmtMoney(it.loan_principal)}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

function fmtMoney(n: number | null): string {
  if (!n || n <= 0) return "-"
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString("ko-KR")}만`
  return n.toLocaleString("ko-KR")
}
