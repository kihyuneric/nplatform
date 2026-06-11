"use client"

/**
 * AVM 검증 콘솔 — 화면 1: 평가 실행 (1차 개발계획 §4).
 *
 * 목적은 검증이다: 프리셋 요청을 게이트웨이에 보내고, §3 필드 체크리스트를
 * 자동 판정해 카드로 보여준다. 응답에 없는 필드는 MISSING(빨강)으로
 * 노출하고, 게이트웨이 연결 실패도 그대로 표시한다 (mock fallback 금지).
 */

import { useState } from "react"
import Link from "next/link"
import { Play, Loader2, Copy, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { AVM_PRESETS } from "./avm-presets"
import { runAvmChecks, type CheckResult } from "./avm-checks"

const STATUS_STYLE: Record<CheckResult["status"], string> = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAIL: "bg-red-50 text-red-700 border-red-300",
  MISSING: "bg-red-100 text-red-800 border-red-400",
}

export default function AvmValuePage() {
  const [presetKey, setPresetKey] = useState(AVM_PRESETS[0].key)
  const [requestText, setRequestText] = useState(() => JSON.stringify(AVM_PRESETS[0].body, null, 2))
  const [loading, setLoading] = useState(false)
  const [httpStatus, setHttpStatus] = useState<number | null>(null)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  const preset = AVM_PRESETS.find((p) => p.key === presetKey)

  const selectPreset = (key: string) => {
    setPresetKey(key)
    const p = AVM_PRESETS.find((x) => x.key === key)
    if (p) setRequestText(JSON.stringify(p.body, null, 2))
  }

  const run = async () => {
    let body: unknown
    try {
      body = JSON.parse(requestText)
    } catch {
      toast.error("요청 JSON 파싱 실패 — 문법을 확인하세요.")
      return
    }
    setLoading(true)
    setError(null)
    setResponse(null)
    setHttpStatus(null)
    try {
      const r = await fetch("/api/v1/avm/api/valuation/v1/value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setHttpStatus(r.status)
      const j = await r.json()
      if (!r.ok) {
        // 실패는 실패로 보여야 한다 — 원본 에러 그대로 노출
        setError(JSON.stringify(j, null, 2))
      } else {
        setResponse(j.data ?? j)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const checks = response ? runAvmChecks(response) : []
  const passCount = checks.filter((c) => c.status === "PASS").length

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">AVM 검증 콘솔 — 평가 실행</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            POST /api/valuation/v1/value · 필드 체크리스트 자동 판정 (1차 계획 §3) · mock fallback 없음
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-md bg-[#1B3A5C] text-white font-semibold">평가 실행</span>
          <Link href="/admin/avm/trace" className="px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">평가 추적</Link>
          <Link href="/admin/avm/models" className="px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">모델·백테스트</Link>
        </nav>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 좌: 요청 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={presetKey}
              onChange={(e) => selectPreset(e.target.value)}
              className="flex-1 h-9 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-2 text-sm"
            >
              {AVM_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <button
              onClick={run}
              disabled={loading}
              className="h-9 px-4 rounded-md bg-[#1B3A5C] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              평가 실행
            </button>
          </div>
          {preset && (
            <p className="text-xs text-[var(--color-text-secondary)] border-l-2 border-[#2E75B6] pl-2">
              기대 결과: {preset.expectation}
            </p>
          )}
          <textarea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            spellCheck={false}
            className="w-full h-[420px] rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 font-mono text-xs"
          />
        </div>

        {/* 우: 응답 검증 */}
        <div className="space-y-3">
          {httpStatus !== null && (
            <div className={`text-sm font-semibold ${httpStatus === 200 ? "text-emerald-700" : "text-red-700"}`}>
              HTTP {httpStatus}
              {response?.valuationId && (
                <Link
                  href={`/admin/avm/trace?id=${response.valuationId}`}
                  className="ml-3 inline-flex items-center gap-1 text-[#2E75B6] underline font-normal"
                >
                  평가 추적으로 <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          {error && (
            <pre className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 overflow-auto max-h-64 whitespace-pre-wrap">
              {error}
            </pre>
          )}

          {response && (
            <>
              <div className="text-sm font-semibold">
                필드 체크리스트: <span className={passCount === checks.length ? "text-emerald-700" : "text-red-700"}>{passCount}/{checks.length} PASS</span>
              </div>
              <div className="space-y-1.5 max-h-[440px] overflow-auto pr-1">
                {checks.map((c) => (
                  <div key={c.key} className={`rounded-md border px-3 py-2 text-xs ${STATUS_STYLE[c.status]}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className="font-bold shrink-0">{c.status}</span>
                    </div>
                    <div className="mt-0.5 opacity-80 break-all">{c.detail}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!response && !error && httpStatus === null && (
            <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
              프리셋을 선택하고 평가를 실행하면 응답 필드가 §3 체크리스트로 판정됩니다.
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON */}
      {response && (
        <div className="rounded-md border border-[var(--color-border-subtle)]">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-[var(--color-surface-overlay)]"
          >
            {showRaw ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Raw JSON 응답 전문
            <span
              role="button"
              tabIndex={0}
              className="ml-auto flex items-center gap-1 text-xs text-[#2E75B6]"
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(JSON.stringify(response, null, 2))
                toast.success("응답 JSON 복사됨")
              }}
            >
              <Copy className="h-3 w-3" /> 복사
            </span>
          </button>
          {showRaw && (
            <pre className="border-t border-[var(--color-border-subtle)] p-3 text-xs overflow-auto max-h-[500px]">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
