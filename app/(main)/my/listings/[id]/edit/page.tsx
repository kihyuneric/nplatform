"use client"

/**
 * /my/listings/[id]/edit — 매도자 본인 매물 편집 페이지 (Phase G6).
 *
 * 흐름
 *   1. GET  /api/v1/exchange/listings/[id] → 기존 매물 조회
 *   2. applyRowToState 로 UnifiedFormState 하이드레이션
 *   3. NplUnifiedForm(mode=SELL) 렌더링
 *   4. 저장: PATCH /api/v1/exchange/listings/[id] (오너십 검증은 서버에서)
 *
 * 3-tier 네비게이션:
 *   TopBar(마이) > SubNav(매도자 대시보드) > Breadcrumb(매물 > [제목] > 편집)
 */

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Save, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  NplUnifiedForm,
  useUnifiedFormState,
  applyRowToState,
  toSellListingBody,
  preflightSell,
} from "@/components/npl/unified-listing-form"

type FetchState = "loading" | "ready" | "error" | "notfound"

export default function SellerListingEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id
  const { state, dispatch } = useUnifiedFormState("SELL")

  const [fetchState, setFetchState] = useState<FetchState>("loading")
  const [fetchError, setFetchError] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>("")
  const [saveOk, setSaveOk] = useState(false)
  // Phase G7+ · 자발적 경매 일정 (있는 경우 편집 가능)
  const [bidEndDate, setBidEndDate] = useState<string>("")
  const [minBidPrice, setMinBidPrice] = useState<number>(0)
  const [hasAuctionSchedule, setHasAuctionSchedule] = useState<boolean>(false)

  // 1. GET 으로 기존 매물 조회 후 상태 하이드레이션
  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/v1/exchange/listings/${id}`)
        const j = await r.json()
        if (cancelled) return
        if (!r.ok || !j.data) {
          if (r.status === 404) {
            setFetchState("notfound")
          } else {
            setFetchError(j?.error?.message || "매물 조회 실패")
            setFetchState("error")
          }
          return
        }
        setTitle(String(j.data.title ?? "") || `매물 ${id}`)
        applyRowToState(j.data as Record<string, unknown>, dispatch as (a: { type: string; [k: string]: unknown }) => void)
        // Phase G7+ · 자발적 경매 일정 hydrate (있는 경우만 표시)
        const row = j.data as Record<string, unknown>
        const endDateRaw = row.bid_end_date as string | null | undefined
        if (endDateRaw) {
          // ISO timestamp → YYYY-MM-DD
          setBidEndDate(String(endDateRaw).slice(0, 10))
          setHasAuctionSchedule(true)
        }
        if (typeof row.min_bid_price === "number") {
          setMinBidPrice(row.min_bid_price)
        }
        setFetchState("ready")
      } catch (e) {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : "네트워크 오류")
          setFetchState("error")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, dispatch])

  const preflightError = useMemo(() => preflightSell(state), [state])

  const handleSave = useCallback(async () => {
    if (!id) return
    if (preflightError) {
      setSaveError(preflightError.message)
      return
    }
    setSaving(true)
    setSaveError("")
    setSaveOk(false)
    try {
      const body: Record<string, unknown> = {
        ...toSellListingBody(state, {}),
        special_conditions_v2: state.specialConditionsV2,
        debtor_type: state.debtorType || undefined,
      }
      // Phase G7+ · 자발적 경매 일정 변경 시 함께 전송
      if (hasAuctionSchedule) {
        if (bidEndDate) body.bid_end_date = `${bidEndDate}T23:59:59.000Z`
        if (minBidPrice > 0) body.min_bid_price = minBidPrice
      }
      const r = await fetch(`/api/v1/exchange/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (!r.ok) {
        throw new Error(j?.error?.message || "저장 실패")
      }
      setSaveOk(true)
      // 2초 후 매도자 대시보드로 이동
      setTimeout(() => router.push("/my/seller"), 1500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(false)
    }
  }, [id, state, preflightError, router, hasAuctionSchedule, bidEndDate, minBidPrice])

  if (fetchState === "loading") {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">매물 정보를 불러오는 중…</span>
        </div>
      </div>
    )
  }

  if (fetchState === "notfound") {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-xl border border-stone-300/40 bg-stone-100/10 p-4">
          <div className="font-bold text-stone-900 dark:text-stone-900">매물을 찾을 수 없습니다</div>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            ID: <code>{id}</code> — 이미 삭제되었거나 권한이 없습니다.
          </p>
          <Link
            href="/my/seller"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-stone-900 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 매도자 대시보드로
          </Link>
        </div>
      </div>
    )
  }

  if (fetchState === "error") {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-xl border border-stone-300/40 bg-stone-100/10 p-4">
          <div className="font-bold text-stone-900 dark:text-stone-900">매물 조회 실패</div>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{fetchError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[0.75rem] text-[var(--color-text-tertiary)]">
        <Link href="/my" className="hover:text-[var(--color-text-secondary)]">마이</Link>
        <span>›</span>
        <Link href="/my/seller" className="hover:text-[var(--color-text-secondary)]">매도자</Link>
        <span>›</span>
        <span>매물 편집</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">매물 편집</h1>
          <p className="mt-1 text-[0.8125rem] text-[var(--color-text-tertiary)]">
            {title} <span className="text-[var(--color-text-muted)]">· {id}</span>
          </p>
        </div>
        <Link
          href="/my/seller"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-[0.75rem] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 취소
        </Link>
      </div>

      {/* Phase G7+ · 자발적 경매 일정 패널 (있는 경우만 표시) */}
      {hasAuctionSchedule && (
        <div className="rounded-xl border border-stone-300/30 bg-stone-100/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-stone-100/15">
              <span aria-hidden className="text-stone-900 dark:text-stone-900 text-sm">⚖</span>
            </span>
            <h3 className="text-[0.875rem] font-bold text-[var(--color-text-primary)]">
              자발적 경매 일정 조정
            </h3>
            <span className="ml-auto text-[0.625rem] font-bold px-2 py-0.5 rounded bg-stone-100/15 text-stone-900 dark:text-stone-900">
              진행 중
            </span>
          </div>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mb-4 leading-relaxed">
            본 매물의 자발적 경매가 진행 중입니다. 종료일이나 최저 입찰가를 수정할 수 있습니다.
            저장 시 입찰자에게 변경 알림이 발송됩니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
                경매 종료일
              </label>
              <input
                type="date"
                value={bidEndDate}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                onChange={(e) => setBidEndDate(e.target.value)}
                className="npl-input"
              />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
                최저 입찰가 (원)
              </label>
              <input
                type="number"
                value={minBidPrice || ""}
                onChange={(e) => setMinBidPrice(Number(e.target.value) || 0)}
                placeholder="예: 850000000"
                className="npl-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <NplUnifiedForm mode="SELL" state={state} dispatch={dispatch} />

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 rounded-xl border border-stone-300/30 bg-[var(--color-surface-elevated)]/95 backdrop-blur p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-[0.75rem]">
          {preflightError ? (
            <>
              <AlertCircle className="w-4 h-4 text-stone-900" />
              <span className="text-stone-900 dark:text-stone-900">
                <strong>{preflightError.field}</strong>: {preflightError.message}
              </span>
            </>
          ) : saveError ? (
            <>
              <AlertCircle className="w-4 h-4 text-stone-900" />
              <span className="text-stone-900 dark:text-stone-900">{saveError}</span>
            </>
          ) : saveOk ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-stone-900" />
              <span className="text-stone-900 dark:text-stone-900 font-semibold">
                저장되었습니다. 대시보드로 이동합니다…
              </span>
            </>
          ) : (
            <span className="text-[var(--color-text-tertiary)]">
              수정한 내용을 검토한 후 저장하세요.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !!preflightError || saveOk}
          className="inline-flex items-center gap-2 rounded-lg bg-stone-100 px-4 py-2 text-sm font-bold text-white shadow hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 저장 중…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> 저장
            </>
          )}
        </button>
      </div>
    </div>
  )
}
