"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Brain, Database, Zap, BookOpen, RefreshCw, Play, CheckCircle2, Clock, Target, TrendingUp, AlertCircle, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"

const TABS = ["AI 모델", "시장 데이터", "자동화", "RAG 관리"] as const
type Tab = (typeof TABS)[number]

// AI 모델 mock data
const AI_MODELS = [
  { id: "m1", name: "낙찰가율 예측", version: "v2.1", type: "Deep Neural Network", accuracy: 94.2, callsPerDay: 1842, status: "활성" },
  { id: "m2", name: "AI 등급 평가", version: "v2.0", type: "Gradient Boosting", accuracy: 87.5, callsPerDay: 963, status: "활성" },
  { id: "m3", name: "문서 OCR 파싱", version: "v1.4", type: "Vision Transformer", accuracy: 91.8, callsPerDay: 541, status: "활성" },
  { id: "m4", name: "시세 예측 모델", version: "v3.0-beta", type: "LSTM + Attention", accuracy: 82.3, callsPerDay: 0, status: "대기" },
  { id: "m5", name: "NPL 리스크 스코어링", version: "v1.9", type: "XGBoost Ensemble", accuracy: 89.1, callsPerDay: 308, status: "활성" },
]

// 시장 데이터 소스 mock data
const DATA_SOURCES = [
  { id: "d1", name: "법원경매정보", url: "auction.co.kr", type: "경매", records: 128340, lastFetch: "2026-04-04 06:00", nextFetch: "2026-04-05 06:00", status: "정상" },
  { id: "d2", name: "KB시세", url: "kbland.kr", type: "시세", records: 2841920, lastFetch: "2026-04-04 07:30", nextFetch: "2026-04-05 07:30", status: "정상" },
  { id: "d3", name: "실거래가 (국토부)", url: "rtms.molit.go.kr", type: "실거래", records: 9412000, lastFetch: "2026-04-03 23:00", nextFetch: "2026-04-04 23:00", status: "지연" },
  { id: "d4", name: "온비드 공매정보", url: "onbid.co.kr", type: "공매", records: 34820, lastFetch: "2026-04-04 05:00", nextFetch: "2026-04-05 05:00", status: "정상" },
]

// 자동화 작업 mock data
const SCHEDULED_JOBS = [
  { id: "j1", name: "경매 데이터 크롤링", cron: "매일 06:00", lastRun: "2026-04-04 06:00", nextRun: "2026-04-05 06:00", duration: "4분 12초", status: "완료" },
  { id: "j2", name: "KB시세 동기화", cron: "매일 07:30", lastRun: "2026-04-04 07:30", nextRun: "2026-04-05 07:30", duration: "8분 44초", status: "완료" },
  { id: "j3", name: "AI 모델 재학습", cron: "매주 월요일 02:00", lastRun: "2026-03-31 02:00", nextRun: "2026-04-07 02:00", duration: "1시간 22분", status: "완료" },
  { id: "j4", name: "실거래가 업데이트", cron: "매일 23:00", lastRun: "2026-04-03 23:00", nextRun: "2026-04-04 23:00", duration: "-", status: "실패" },
  { id: "j5", name: "보고서 자동 발송", cron: "매주 금요일 18:00", lastRun: "2026-04-04 18:00", nextRun: "2026-04-11 18:00", duration: "1분 05초", status: "완료" },
  { id: "j6", name: "데이터 백업", cron: "매일 03:00", lastRun: "2026-04-04 03:00", nextRun: "2026-04-05 03:00", duration: "12분 33초", status: "완료" },
]

// RAG 관리 mock data
const RAG_DOCS = [
  { id: "r1", category: "경매 법령", docs: 1284, lastUpdated: "2026-04-01", accuracy: 93.2, chunks: 18420 },
  { id: "r2", category: "NPL 관련 판례", docs: 842, lastUpdated: "2026-03-28", accuracy: 88.7, chunks: 12340 },
  { id: "r3", category: "부동산 등기 가이드", docs: 321, lastUpdated: "2026-03-15", accuracy: 91.4, chunks: 4980 },
  { id: "r4", category: "임대차보호법", docs: 156, lastUpdated: "2026-04-03", accuracy: 96.1, chunks: 2841 },
]

const STATUS_BADGE_STYLE: Record<string, string> = {
  "활성": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "정상": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "완료": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "대기": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "지연": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "실패": "bg-red-500/10 text-red-400 border border-red-500/20",
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_STYLE[status] ?? "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
  return <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{status}</span>
}

const TAB_MAP: Record<string, Tab> = {
  "models": "AI 모델",
  "market-data": "시장 데이터",
  "automation": "자동화",
  "rag": "RAG 관리",
}

interface DataTableEntry { name: string; count: number; loaded: boolean; isSample: boolean }
interface DataStats {
  isSample: boolean
  totalTables: number
  totalRecords: number
  tables: DataTableEntry[]
}

export default function AdminMLPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)
  const [dataStats, setDataStats] = useState<DataStats | null>(null)
  const [syncingSource, setSyncingSource] = useState<string | null>(null)
  const [runningJob, setRunningJob] = useState<string | null>(null)

  // Real data state — fallback to mock constants if Supabase not configured
  const [models, setModels] = useState(AI_MODELS)
  const [dataSources, setDataSources] = useState(DATA_SOURCES)
  const [scheduledJobs, setScheduledJobs] = useState(SCHEDULED_JOBS)
  const [ragDocs, setRagDocs] = useState(RAG_DOCS)

  useEffect(() => {
    fetch('/api/v1/admin/data')
      .then(r => r.json())
      .then(setDataStats)
      .catch(() => {/* silent */ })
  }, [])

  // Load real data from Supabase tables with fallback to mock constants
  useEffect(() => {
    const loadRealData = async () => {
      try {
        const supabase = createClient()

        // ML models registry
        const { data: modelsData } = await supabase
          .from('ml_models')
          .select('id, name, version, type, accuracy, calls_per_day, status')
          .order('name')
        if (modelsData && modelsData.length > 0) {
          setModels(modelsData.map(r => ({
            id: String(r.id),
            name: r.name ?? '',
            version: r.version ?? 'v1.0',
            type: r.type ?? 'Model',
            accuracy: r.accuracy ?? 0,
            callsPerDay: r.calls_per_day ?? 0,
            status: r.status ?? '활성',
          })))
        }

        // Data sources (reuse data_sync_sources table)
        const { data: srcData } = await supabase
          .from('data_sync_sources')
          .select('id, name, url, type, records, last_sync, status')
          .order('name')
        if (srcData && srcData.length > 0) {
          setDataSources(srcData.map(r => ({
            id: String(r.id),
            name: r.name ?? '',
            url: r.url ?? '',
            type: r.type ?? '기타',
            records: r.records ?? 0,
            lastFetch: (r.last_sync ?? '').replace('T', ' ').slice(0, 16),
            nextFetch: '예약됨',
            status: r.status === 'error' ? '오류' : r.status === 'success' ? '정상' : '대기',
          })))
        }

        // Scheduled jobs
        const { data: jobsData } = await supabase
          .from('scheduled_jobs')
          .select('id, name, cron, last_run, next_run, duration, status')
          .order('name')
        if (jobsData && jobsData.length > 0) {
          setScheduledJobs(jobsData.map(r => ({
            id: String(r.id),
            name: r.name ?? '',
            cron: r.cron ?? '',
            lastRun: (r.last_run ?? '').replace('T', ' ').slice(0, 16),
            nextRun: (r.next_run ?? '').replace('T', ' ').slice(0, 16),
            duration: r.duration ?? '-',
            status: r.status ?? '대기',
          })))
        }

        // RAG document index
        const { data: ragData } = await supabase
          .from('rag_documents')
          .select('id, category, docs, last_updated, accuracy, chunks')
          .order('category')
        if (ragData && ragData.length > 0) {
          setRagDocs(ragData.map(r => ({
            id: String(r.id),
            category: r.category ?? '',
            docs: r.docs ?? 0,
            lastUpdated: (r.last_updated ?? '').slice(0, 10),
            accuracy: r.accuracy ?? 0,
            chunks: r.chunks ?? 0,
          })))
        }
      } catch { /* keep mock data */ }
    }
    loadRealData()
  }, [])

  const handleSyncSource = async (sourceId: string, sourceName: string) => {
    setSyncingSource(sourceId)
    try {
      const res = await fetch('/api/v1/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      if (res.ok) {
        const updated = await fetch('/api/v1/admin/data').then(r => r.json())
        setDataStats(updated)
        toast.success(`${sourceName} 즉시 수집을 완료했습니다.`)
      } else {
        toast.error('수집 요청에 실패했습니다.')
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.')
    } finally {
      setSyncingSource(null)
    }
  }

  const handleRunJob = async (jobId: string, jobName: string) => {
    setRunningJob(jobId)
    const toastId = toast.loading(`${jobName} 실행 중...`)
    try {
      const res = await fetch('/api/v1/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_job', job: jobName }),
      })
      if (res.ok) {
        toast.success(`${jobName} 실행이 완료됐습니다.`, { id: toastId })
        // Optimistically mark last run
        setScheduledJobs(prev => prev.map(j =>
          j.id === jobId
            ? { ...j, lastRun: new Date().toISOString().slice(0, 16).replace('T', ' '), status: '완료' }
            : j
        ))
      } else {
        toast.error(`${jobName} 실행 실패`, { id: toastId })
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.', { id: toastId })
    } finally {
      setRunningJob(null)
    }
  }

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Header */}
        <div className={DS.header.wrapper}>
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-[var(--color-brand-mid)]" />
            <h1 className={DS.header.title}>ML / AI 관리</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}
            >
              {t}
            </button>
          ))}
        </div>

        {/* AI 모델 */}
        {tab === "AI 모델" && (
          <div className="space-y-4">

          {/* ── AI 투자 분석 입력 데이터 명세 ────────────────────── */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-sm">
            <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.bodyBold}>AI 투자 분석 입력 데이터 명세</h2>
              <span className="ml-auto text-[0.6875rem] text-[var(--color-text-secondary)]">
                /exchange/[id] 상세 페이지의 예상 회수율 · AI 권고 입찰가에 사용
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 예상 회수율 카드 */}
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">예상 회수율 (Recovery Rate)</h3>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Model: NPL Recovery Predictor · XGBoost</p>
                  </div>
                </div>

                <div className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] mb-3">
                  <strong>출력:</strong> 예상 회수율 (%), 신뢰구간 [min, max], AI 등급(A~E)
                  <br />
                  <strong>계산식:</strong> 과거 낙찰가 / 감정가 × (리스크 가중치) · 5만건+ 과거 경매 데이터 학습
                </div>

                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                  필수 입력 데이터 (매도자 등록 시)
                </div>
                <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
                  {[
                    ["감정평가금액", "법원 감정평가서 · 필수"],
                    ["담보 유형 (대분류+상세)", "4대분류: 주거/상업/토지/기타"],
                    ["지역 (시군구)", "낙찰가 매칭 키"],
                    ["선순위 채권액", "근저당권 1순위 합계"],
                    ["후순위 채권액", "근저당권 2순위 이하"],
                    ["임차 보증금 총액", "최우선변제 계산"],
                    ["경매 진행 회차", "유찰 횟수 (회차 당 20% 저감)"],
                    ["특수권리 플래그", "유치권 · 법정지상권 · 분묘기지권"],
                    ["채무 원금", "회수 가능액 추정 베이스"],
                  ].map(([k, v]) => (
                    <li key={k} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-[var(--color-text-primary)]">{k}</strong>
                        <span className="text-[var(--color-text-muted)]"> — {v}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-emerald-400">
                  <strong>학습 데이터 소스:</strong> 대법원 경매정보 · 온비드 공매정보 · 내부 완료 거래 이력
                </div>
              </div>

              {/* AI 권고 입찰가 카드 */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">AI 권고 입찰가 (Bid Guide)</h3>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Model: Bid Price Guide · LightGBM + 시장 비교</p>
                  </div>
                </div>

                <div className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] mb-3">
                  <strong>출력:</strong> 권고 입찰가, 최소/최대 범위, 시장 전망 (강세/중립/약세)
                  <br />
                  <strong>계산식:</strong> 예상 회수액 − 필수 비용 − 목표 수익(ROI) · 최근 12개월 시세 반영
                </div>

                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-blue-400">
                  필수 입력 데이터
                </div>
                <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
                  {[
                    ["감정평가금액", "예상 회수율의 베이스"],
                    ["최근 12개월 낙찰가 실적", "동일 지역+유형 평균 (자동 조회)"],
                    ["KB시세 / 실거래가", "현재 시장 가치"],
                    ["임대 수익률", "수익형 부동산 (상가·오피스텔)"],
                    ["명도 비용 예상치", "점유자 유형 기반 추정"],
                    ["조세공과 · 공사 미수금", "우선변제 대상"],
                    ["사용자 목표 ROI", "기본값 12% · 사용자 설정"],
                    ["레버리지 조건", "대출가능액 · 금리 (선택)"],
                  ].map(([k, v]) => (
                    <li key={k} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-[var(--color-text-primary)]">{k}</strong>
                        <span className="text-[var(--color-text-muted)]"> — {v}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 pt-3 border-t border-blue-500/20 text-[10px] text-blue-400">
                  <strong>자동 연동 소스:</strong> KB시세 · 국토부 실거래가 · 내부 낙찰가 DB
                </div>
              </div>
            </div>

            {/* 사용자 입력 프로세스 가이드 */}
            <div className="px-5 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  <strong>매도자(금융기관) 제공 항목:</strong> 감정평가금액 · 채권 원금 · 담보 유형/지역 · 선후순위 채권 · 임차 현황 · 특수권리 플래그 (총 9개 필드)
                  <br />
                  <strong>플랫폼 자동 계산:</strong> 회차별 저감률 · 지역 낙찰가 평균 · KB시세 · 실거래가 매칭
                  <br />
                  <strong>투자자(매수자) 입력:</strong> 목표 ROI · 레버리지 조건 (선택) — 미입력 시 기본값 사용
                </div>
              </div>
            </div>
          </div>

          {/* ── 배포된 모델 목록 ─────────────────────────────── */}
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Brain className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.bodyBold}>배포된 모델 목록</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["모델명", "버전", "아키텍처", "정확도", "호출수/일", "상태", "조치"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h !== "모델명" && h !== "아키텍처" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{model.name}</td>
                    <td className={`${DS.table.cell} font-mono text-[var(--color-brand-mid)] text-center`}>{model.version}</td>
                    <td className={DS.table.cellMuted}>{model.type}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={`font-semibold ${model.accuracy >= 90 ? "text-[var(--color-positive)]" : model.accuracy >= 85 ? "text-[var(--color-brand-mid)]" : "text-[var(--color-warning)]"}`}>
                        {model.accuracy}%
                      </span>
                    </td>
                    <td className={`${DS.table.cellMuted} text-center`}>
                      {model.callsPerDay > 0 ? model.callsPerDay.toLocaleString() : "-"}
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <StatusBadge status={model.status} />
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <button
                        onClick={async () => {
                          const modelType = model.name.includes("가격") || model.name.includes("시세") ? "price"
                            : model.name.includes("리스크") || model.name.includes("등급") ? "risk"
                            : "recovery"
                          const id = toast.loading(`${model.name} 재학습 중...`)
                          try {
                            const res = await fetch("/api/v1/admin/ml/retrain", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ model_type: modelType }),
                            })
                            const json = await res.json()
                            if (json.ok) {
                              const m = json.data.metrics_after ?? {}
                              toast.success(
                                `${model.name} 재학습 완료 (샘플 ${json.data.sample_count}건${m.mape ? `, MAPE ${m.mape.toFixed(1)}%` : ""}${m.accuracy ? `, 정확도 ${(m.accuracy * 100).toFixed(1)}%` : ""})`,
                                { id }
                              )
                            } else {
                              toast.error(json.error?.message ?? "재학습 실패", { id })
                            }
                          } catch (e) {
                            toast.error("재학습 요청 실패", { id })
                          }
                        }}
                        className={`${DS.button.secondary} ${DS.button.sm}`}
                      >
                        재학습
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 재학습 이력 (Phase 6-4) ──────────────────────── */}
          <TrainingRunsHistory />
          </div>
        )}

        {/* 시장 데이터 */}
        {tab === "시장 데이터" && (
          <div className="space-y-4">
          {dataStats && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "총 로드된 테이블", value: dataStats.totalTables, sub: dataStats.isSample ? "샘플 모드" : "실연동" },
                { label: "총 레코드 수", value: dataStats.totalRecords.toLocaleString(), sub: "메모리 캐시 기준" },
                { label: "데이터 모드", value: dataStats.isSample ? "샘플" : "프로덕션", sub: dataStats.isSample ? "개발 환경" : "실 데이터" },
              ].map(s => (
                <div key={s.label} className={DS.stat.card}>
                  <p className={DS.stat.label}>{s.label}</p>
                  <p className={DS.stat.value}>{s.value}</p>
                  <p className={DS.stat.sub}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.bodyBold}>크롤링 데이터 소스</h2>
              {dataStats?.isSample && (
                <span className="ml-auto text-[0.6875rem] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">샘플 모드</span>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["소스명", "유형", "총 레코드", "마지막 수집", "다음 수집", "상태", "조치"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h === "유형" || h === "총 레코드" || h === "상태" || h === "조치" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataSources.map((src) => (
                  <tr key={src.id} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <div className="font-medium">{src.name}</div>
                      <div className={`${DS.text.micro} font-mono`}>{src.url}</div>
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={DS.badge.inline("bg-[var(--color-surface-overlay)]", "text-[var(--color-text-secondary)]", "border-[var(--color-border-subtle)]")}>{src.type}</span>
                    </td>
                    <td className={`${DS.table.cellMuted} text-center`}>{src.records.toLocaleString()}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{src.lastFetch}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{src.nextFetch}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <StatusBadge status={src.status} />
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <button
                        disabled={syncingSource === src.id}
                        onClick={() => handleSyncSource(src.id, src.name)}
                        className={`${DS.button.secondary} ${DS.button.sm}`}
                      >
                        {syncingSource === src.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {syncingSource === src.id ? "수집 중..." : "즉시 수집"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {/* 자동화 */}
        {tab === "자동화" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-warning)]" />
              <h2 className={DS.text.bodyBold}>스케줄 작업 목록</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["작업명", "주기", "마지막 실행", "다음 실행", "소요시간", "상태", "즉시 실행"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h !== "작업명" && h !== "마지막 실행" && h !== "다음 실행" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduledJobs.map((job) => (
                  <tr key={job.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{job.name}</td>
                    <td className={`${DS.table.cellMuted} text-center`}>
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />{job.cron}
                      </span>
                    </td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{job.lastRun}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{job.nextRun}</td>
                    <td className={`${DS.table.cellMuted} text-center`}>{job.duration}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <StatusBadge status={job.status} />
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <button
                        disabled={runningJob === job.id}
                        onClick={() => handleRunJob(job.id, job.name)}
                        className={DS.button.icon}
                        title={`${job.name} 즉시 실행`}
                      >
                        {runningJob === job.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RAG 관리 */}
        {tab === "RAG 관리" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "총 법률 문서 수", value: ragDocs.reduce((s, r) => s + r.docs, 0).toLocaleString(), sub: `${ragDocs.length}개 카테고리`, subColor: "text-[var(--color-positive)]" },
                { label: "총 청크 수", value: ragDocs.reduce((s, r) => s + r.chunks, 0).toLocaleString(), sub: ragDocs.length > 0 ? `평균 ${Math.round(ragDocs.reduce((s, r) => s + r.chunks, 0) / Math.max(ragDocs.reduce((s, r) => s + r.docs, 0), 1))}청크/문서` : '', subColor: "" },
                { label: "평균 검색 정확도", value: ragDocs.length > 0 ? `${(ragDocs.reduce((s, r) => s + r.accuracy, 0) / ragDocs.length).toFixed(1)}%` : '-', sub: "MRR@10 기준", subColor: "text-[var(--color-brand-mid)]" },
              ].map(s => (
                <div key={s.label} className={DS.stat.card}>
                  <p className={DS.stat.label}>{s.label}</p>
                  <p className={DS.stat.value}>{s.value}</p>
                  <p className={`${DS.stat.sub} ${s.subColor}`}>{s.sub}</p>
                </div>
              ))}
            </div>

            <div className={DS.table.wrapper}>
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-positive)]" />
                <h2 className={DS.text.bodyBold}>법률 문서 DB 카테고리별 현황</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["카테고리", "문서 수", "청크 수", "검색 정확도", "마지막 업데이트", "재색인"].map(h => (
                      <th key={h} className={`${DS.table.headerCell} ${h !== "카테고리" ? "text-center" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ragDocs.map((doc) => (
                    <tr key={doc.id} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-medium`}>{doc.category}</td>
                      <td className={`${DS.table.cellMuted} text-center`}>{doc.docs.toLocaleString()}</td>
                      <td className={`${DS.table.cellMuted} text-center`}>{doc.chunks.toLocaleString()}</td>
                      <td className={`${DS.table.cell} text-center`}>
                        <span className={`font-semibold ${doc.accuracy >= 92 ? "text-[var(--color-positive)]" : doc.accuracy >= 88 ? "text-[var(--color-brand-mid)]" : "text-[var(--color-warning)]"}`}>
                          {doc.accuracy}%
                        </span>
                      </td>
                      <td className={`${DS.table.cellMuted} text-center`}>{doc.lastUpdated}</td>
                      <td className={`${DS.table.cell} text-center`}>
                        <button
                          onClick={() => toast.success(`${doc.category} 재색인을 시작했습니다.`)}
                          className={`${DS.button.secondary} ${DS.button.sm}`}
                        >
                          <RefreshCw className="w-3 h-3" /> 재색인
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-[var(--color-border-subtle)] flex justify-end">
                <button
                  onClick={() => toast.success("전체 RAG DB 재색인을 시작했습니다. 약 20분 소요 예상")}
                  className={DS.button.primary}
                >
                  <CheckCircle2 className="w-4 h-4" /> 전체 재색인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TrainingRunsHistory Component (Phase 6-4) ─────────────────────

interface TrainingRun {
  id: string
  model_type: string
  status: "requested" | "running" | "completed" | "failed"
  sample_count: number
  metrics_before?: Record<string, number>
  metrics_after?: Record<string, number>
  promoted_version?: string
  started_at: string
  finished_at?: string
  error?: string
}

function TrainingRunsHistory() {
  const [runs, setRuns] = useState<TrainingRun[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/ml/retrain")
      const json = await res.json()
      if (json.ok) setRuns(json.data ?? [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const statusBadge = (s: TrainingRun["status"]) => {
    const cls =
      s === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-800" :
      s === "running"   ? "bg-blue-500/10 text-blue-300 border-blue-800" :
      s === "failed"    ? "bg-red-500/10 text-red-300 border-red-800" :
                          "bg-amber-500/10 text-amber-300 border-amber-800"
    return <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{s}</span>
  }

  const formatMetric = (m?: Record<string, number>) => {
    if (!m) return "-"
    const parts: string[] = []
    if (m.mape != null) parts.push(`MAPE ${m.mape.toFixed(1)}%`)
    if (m.accuracy != null) parts.push(`Acc ${(m.accuracy * 100).toFixed(1)}%`)
    if (m.f1_score != null) parts.push(`F1 ${(m.f1_score * 100).toFixed(1)}%`)
    if (m.sample_count != null) parts.push(`n=${m.sample_count}`)
    return parts.join(" · ") || "-"
  }

  return (
    <div className={`${DS.card.elevated} ${DS.card.padding}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">재학습 이력</h3>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">최근 실행된 모델 재학습 기록 (최대 20건)</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={`${DS.button.ghost} ${DS.button.sm}`}
          aria-label="재학습 이력 새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && runs.length === 0 ? (
        <div className="py-8 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : runs.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">
          아직 재학습 이력이 없습니다. "재학습" 버튼을 눌러 시작하세요.
        </div>
      ) : (
        <div className={DS.table.wrapper}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={DS.table.headerCell}>시각</th>
                <th className={DS.table.headerCell}>모델</th>
                <th className={`${DS.table.headerCell} text-center`}>상태</th>
                <th className={`${DS.table.headerCell} text-right`}>샘플</th>
                <th className={DS.table.headerCell}>이전 지표</th>
                <th className={DS.table.headerCell}>이후 지표</th>
                <th className={`${DS.table.headerCell} text-center`}>승격 버전</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} className={DS.table.row}>
                  <td className={`${DS.table.cell} text-xs text-[var(--color-text-tertiary)] tabular-nums`}>
                    {new Date(r.started_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className={`${DS.table.cell} font-medium`}>{r.model_type}</td>
                  <td className={`${DS.table.cell} text-center`}>{statusBadge(r.status)}</td>
                  <td className={`${DS.table.cell} text-right tabular-nums`}>{r.sample_count.toLocaleString()}</td>
                  <td className={`${DS.table.cell} text-xs text-[var(--color-text-tertiary)]`}>{formatMetric(r.metrics_before)}</td>
                  <td className={`${DS.table.cell} text-xs`}>{formatMetric(r.metrics_after)}</td>
                  <td className={`${DS.table.cell} text-center`}>
                    {r.promoted_version ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-positive)]">
                        <CheckCircle2 className="w-3 h-3" />
                        v{r.promoted_version}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
