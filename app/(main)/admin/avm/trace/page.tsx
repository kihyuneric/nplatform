"use client"

/**
 * AVM 검증 콘솔 — 화면 2: 평가 추적 (1차 개발계획 §4).
 *
 * explain + comparables 통합 뷰. valuationId로 모델 버전·가중치·감사
 * 이벤트·채택/제외 사례·resultHash를 확인하고, MANUAL_REVIEW_REQUIRED 건은
 * 리뷰 개설→결정 흐름을 화면에서 검증한다.
 */

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-md border border-[var(--color-border-subtle)]">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-[var(--color-surface-overlay)]">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="border-t border-[var(--color-border-subtle)] p-3">{children}</div>}
    </div>
  )
}

function TraceInner() {
  const params = useSearchParams()
  const [vid, setVid] = useState(params?.get("id") ?? "")
  const [loading, setLoading] = useState(false)
  const [explain, setExplain] = useState<any>(null)
  const [comps, setComps] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewer, setReviewer] = useState("console-reviewer")

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setError(null)
    setExplain(null)
    setComps(null)
    try {
      const [er, cr] = await Promise.all([
        fetch(`/api/v1/avm/api/valuation/v1/explain/${id}`),
        fetch(`/api/v1/avm/api/valuation/v1/comparables/${id}`),
      ])
      const ej = await er.json()
      const cj = await cr.json()
      if (!er.ok) setError(JSON.stringify(ej, null, 2))
      else {
        setExplain(ej.data ?? ej)
        setComps(cj.data ?? cj)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = params?.get("id")
    if (id) {
      setVid(id)
      load(id)
    }
  }, [params, load])

  const openReview = async () => {
    const r = await fetch("/api/v1/avm/api/valuation/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valuation_id: vid, reviewer, role: "CREDIT", comment: "검증 콘솔에서 개설" }),
    })
    const j = await r.json()
    if (r.ok) {
      toast.success(`리뷰 #${j.data?.reviewId} 개설됨`)
      load(vid)
    } else toast.error(JSON.stringify(j))
  }

  const decideReview = async (reviewId: number, decision: string) => {
    const r = await fetch(`/api/v1/avm/api/valuation/v1/reviews/${reviewId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer, decision, comment: `검증 콘솔 ${decision}` }),
    })
    if (r.ok) {
      toast.success(`리뷰 #${reviewId} → ${decision}`)
      load(vid)
    } else toast.error(await r.text())
  }

  const valuation = explain?.valuation
  const reviews: any[] = explain?.reviews ?? []
  const audit: any[] = explain?.auditTrail ?? []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">AVM 검증 콘솔 — 평가 추적</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">GET /explain · /comparables — 감사추적·근거·리뷰 흐름 검증</p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href="/admin/avm" className="px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">평가 실행</Link>
          <span className="px-3 py-1.5 rounded-md bg-[#1B3A5C] text-white font-semibold">평가 추적</span>
          <Link href="/admin/avm/models" className="px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">모델·백테스트</Link>
        </nav>
      </div>

      <div className="flex gap-2">
        <input
          value={vid}
          onChange={(e) => setVid(e.target.value)}
          placeholder="valuationId (평가 실행 화면에서 복사)"
          className="flex-1 h-9 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-mono"
        />
        <button onClick={() => load(vid)} disabled={loading || !vid} className="h-9 px-4 rounded-md bg-[#1B3A5C] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          조회
        </button>
      </div>

      {error && <pre className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 overflow-auto whitespace-pre-wrap">{error}</pre>}

      {valuation && (
        <div className="space-y-3">
          <Section title="평가 요약">
            <table className="text-sm w-full">
              <tbody>
                {[
                  ["status", valuation.status],
                  ["추정가 (marketValue)", valuation.marketValue?.estimatedValueKrw?.toLocaleString("ko-KR")],
                  ["선택 목적/가치", `${valuation.selectedPurpose} / ${valuation.selectedValue?.valueKrw?.toLocaleString("ko-KR")}`],
                  ["신뢰등급", `${valuation.confidenceGrade?.grade} (FSD ${valuation.confidenceGrade?.fsd})`],
                  ["가드레일", valuation.guardrail?.overall],
                  ["모델 버전", valuation.governance?.modelVersion],
                  ["스코프", JSON.stringify(valuation.governance?.scopeKeys)],
                  ["방법별 가중치", JSON.stringify(valuation.marketValue?.weights)],
                  ["resultHash", valuation.resultHash],
                ].map(([k, v]) => (
                  <tr key={String(k)} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="py-1.5 pr-3 font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">{k}</td>
                    <td className="py-1.5 font-mono text-xs break-all">{String(v ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={`채택 사례 (${comps?.included?.length ?? 0}) / 제외 사례 (${comps?.excluded?.length ?? 0})`}>
            <pre className="text-xs overflow-auto max-h-72">{JSON.stringify(comps, null, 2)}</pre>
          </Section>

          <Section title={`리뷰 (${reviews.length})`}>
            <div className="flex gap-2 mb-3">
              <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} className="h-8 rounded-md border border-[var(--color-border-subtle)] px-2 text-xs" />
              <button onClick={openReview} className="h-8 px-3 rounded-md bg-[#2E75B6] text-white text-xs font-semibold">리뷰 개설</button>
            </div>
            {reviews.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">리뷰 없음</p>}
            {reviews.map((rv) => (
              <div key={rv.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-subtle)] py-1.5 text-xs last:border-0">
                <span className="font-semibold">#{rv.id}</span>
                <span>{rv.reviewer}</span>
                <span className={`px-2 py-0.5 rounded-full border ${rv.status === "OPEN" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>{rv.status ?? rv.decision}</span>
                {(rv.status === "OPEN" || !rv.decision) && (
                  <span className="ml-auto flex gap-1">
                    {["APPROVED", "CONDITIONAL", "REJECTED"].map((d) => (
                      <button key={d} onClick={() => decideReview(rv.id, d)} className="px-2 py-0.5 rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">{d}</button>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </Section>

          <Section title={`감사 이벤트 타임라인 (${audit.length})`}>
            <div className="space-y-1">
              {audit.map((ev, i) => (
                <div key={i} className="flex gap-2 text-xs border-b border-[var(--color-border-subtle)] py-1 last:border-0">
                  <span className="text-[var(--color-text-secondary)] whitespace-nowrap">{ev.created_at ?? ev.createdAt}</span>
                  <span className="font-semibold whitespace-nowrap">{ev.event_type ?? ev.eventType}</span>
                  <span className="font-mono break-all opacity-70">{typeof ev.payload === "string" ? ev.payload : JSON.stringify(ev.payload_json ?? ev.payload ?? ev.detail_json ?? "")}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Raw JSON (explain 전문)" defaultOpen={false}>
            <pre className="text-xs overflow-auto max-h-[500px]">{JSON.stringify(explain, null, 2)}</pre>
          </Section>
        </div>
      )}
    </div>
  )
}

export default function AvmTracePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--color-text-secondary)]">로딩…</div>}>
      <TraceInner />
    </Suspense>
  )
}
