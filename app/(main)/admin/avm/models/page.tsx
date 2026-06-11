"use client"

/**
 * AVM 검증 콘솔 — 화면 3: 모델·백테스트 상태 (1차 개발계획 §4).
 *
 * model-status(Kill Switch 토글 포함), 스코프·과제별 리더보드,
 * v5.1 기관 백테스트 실행·리포트 markdown 조회.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, RefreshCw, Power, PlayCircle } from "lucide-react"
import { toast } from "sonner"
import { TRAINED_VERSION } from "../avm-presets"

export default function AvmModelsPage() {
  const [version, setVersion] = useState(TRAINED_VERSION)
  const [status, setStatus] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [btLoading, setBtLoading] = useState(false)
  const [btMarkdown, setBtMarkdown] = useState<string | null>(null)

  const load = useCallback(async (ver: string) => {
    setLoading(true)
    setError(null)
    try {
      const [sr, lr] = await Promise.all([
        fetch("/api/v1/avm/api/valuation/v1/model-status"),
        fetch("/api/v1/avm/api/v4.5/models/backtest-leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: ver }),
        }),
      ])
      const sj = await sr.json()
      const lj = await lr.json()
      if (!sr.ok) throw new Error(JSON.stringify(sj))
      setStatus(sj.data ?? sj)
      setLeaderboard(lr.ok ? (lj.data ?? lj) : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(version)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleKill = async () => {
    const next = !status?.killSwitch
    if (next && !confirm("Kill Switch를 켜면 모든 기관용 평가가 503으로 차단됩니다. 켤까요?")) return
    const r = await fetch("/api/v1/avm/api/valuation/v1/kill-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next, updated_by: "avm-console", reason: next ? "콘솔 수동 차단" : "콘솔 수동 해제" }),
    })
    if (r.ok) {
      toast.success(`Kill Switch ${next ? "ON — 평가 차단됨" : "OFF — 평가 재개"}`)
      load(version)
    } else toast.error(await r.text())
  }

  const runBacktest = async () => {
    setBtLoading(true)
    setBtMarkdown(null)
    try {
      // 합성 관측치 간이 백테스트 — 파이프라인 동작 검증용
      const observations = Array.from({ length: 12 }, (_, i) => ({
        observation_id: `CONSOLE-${i}`,
        observation_date: "2026-01-15",
        property_code: i % 2 ? "R01" : "C02",
        sigungu_code: "11680",
        actual_sale_price_krw: 1_000_000_000 + i * 50_000_000,
        avm_prediction_krw: 1_000_000_000 + i * 50_000_000 * (i % 3 ? 0.97 : 1.06),
        appraisal_value_krw: 980_000_000 + i * 48_000_000,
        price_band: "10억~20억",
        area_band: "60~85㎡",
        age_band: "10년 이하",
        data_quality_grade: "A",
        model_scope_key: `TYPE:${i % 2 ? "R01" : "C02"}:SIGUNGU:11680`,
        model_version: version,
      }))
      const r = await fetch("/api/v1/avm/api/valuation/v1/backtests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_name: "검증 콘솔",
          model_version: version,
          valuation_purpose: "MARKET",
          property_codes: ["R01", "C02"],
          observations,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(JSON.stringify(j))
      const reportId = j.data?.reportId ?? j.data?.report_id
      toast.success(`백테스트 리포트 생성: ${reportId}`)
      const mr = await fetch(`/api/v1/avm/api/valuation/v1/backtests/${reportId}/markdown`)
      setBtMarkdown(await mr.text())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBtLoading(false)
    }
  }

  const rows: any[] = leaderboard?.leaderboard ?? []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">AVM 검증 콘솔 — 모델·백테스트</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">model-status · 리더보드 · v5.1 기관 백테스트</p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href="/admin/avm" className="px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">평가 실행</Link>
          <Link href="/admin/avm/trace" className="px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">평가 추적</Link>
          <span className="px-3 py-1.5 rounded-md bg-[#1B3A5C] text-white font-semibold">모델·백테스트</span>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={version} onChange={(e) => setVersion(e.target.value)} className="h-9 w-28 rounded-md border border-[var(--color-border-subtle)] px-2 text-sm font-mono" />
        <button onClick={() => load(version)} disabled={loading} className="h-9 px-3 rounded-md border border-[var(--color-border-subtle)] text-sm flex items-center gap-1.5 hover:bg-[var(--color-surface-overlay)]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 새로고침
        </button>
        {status && (
          <button
            onClick={toggleKill}
            className={`h-9 px-3 rounded-md text-sm font-semibold flex items-center gap-1.5 ${status.killSwitch ? "bg-red-600 text-white" : "border border-red-300 text-red-700 hover:bg-red-50"}`}
          >
            <Power className="h-4 w-4" />
            Kill Switch: {status.killSwitch ? "ON (평가 차단 중)" : "OFF"}
          </button>
        )}
        <button onClick={runBacktest} disabled={btLoading} className="h-9 px-3 rounded-md bg-[#2E75B6] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
          {btLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          v5.1 백테스트 실행
        </button>
      </div>

      {error && <pre className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 overflow-auto whitespace-pre-wrap">{error}</pre>}

      {status && (
        <div className="rounded-md border border-[var(--color-border-subtle)] p-3 text-sm">
          <span className="font-semibold">모델 레지스트리:</span>{" "}
          {(status.models ?? []).length === 0
            ? "등록된 모델 없음 (POST /models/register 미실행 — 1차에서는 정상)"
            : `${status.models.length}건`}
          {(status.models ?? []).length > 0 && (
            <pre className="mt-2 text-xs overflow-auto max-h-48">{JSON.stringify(status.models, null, 2)}</pre>
          )}
        </div>
      )}

      <div className="rounded-md border border-[var(--color-border-subtle)] overflow-auto">
        <div className="px-3 py-2 text-sm font-semibold border-b border-[var(--color-border-subtle)]">
          리더보드 — {version} ({rows.length}행)
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
              {["scope", "task", "accepted", "model", "표본", "검증", "MdAPE", "±10%", "±20%", "bias"].map((h) => (
                <th key={h} className="px-2 py-1.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
                <td className="px-2 py-1 font-mono whitespace-nowrap">{r.scopeKey}</td>
                <td className="px-2 py-1 whitespace-nowrap">{r.task}</td>
                <td className={`px-2 py-1 font-semibold ${r.accepted ? "text-emerald-700" : "text-red-700"}`}>
                  {r.accepted ? "ACCEPT" : (r.rejectionReasons ?? []).join(",") || "REJECT"}
                </td>
                <td className="px-2 py-1">{r.bestModel}</td>
                <td className="px-2 py-1 text-right">{r.sampleCount}</td>
                <td className="px-2 py-1 text-right">{r.validationCount}</td>
                <td className="px-2 py-1 text-right font-semibold">{r.MdAPE != null ? (r.MdAPE * 100).toFixed(1) + "%" : "—"}</td>
                <td className="px-2 py-1 text-right">{r.within10Pct != null ? (r.within10Pct * 100).toFixed(0) + "%" : "—"}</td>
                <td className="px-2 py-1 text-right">{r.within20Pct != null ? (r.within20Pct * 100).toFixed(0) + "%" : "—"}</td>
                <td className="px-2 py-1 text-right">{r.biasPct != null ? (r.biasPct * 100).toFixed(1) + "%" : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-[var(--color-text-secondary)]">리더보드 없음 — 해당 버전 학습 여부 확인 (train-batch)</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {btMarkdown && (
        <div className="rounded-md border border-[var(--color-border-subtle)]">
          <div className="px-3 py-2 text-sm font-semibold border-b border-[var(--color-border-subtle)]">v5.1 기관 백테스트 리포트 (markdown)</div>
          <pre className="p-3 text-xs overflow-auto max-h-[500px] whitespace-pre-wrap">{btMarkdown}</pre>
        </div>
      )}
    </div>
  )
}
