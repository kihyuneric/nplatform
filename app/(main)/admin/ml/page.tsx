"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Brain, Database, Zap, BookOpen, RefreshCw, Play, CheckCircle2, Clock } from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

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
  "활성": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "정상": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "완료": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "대기": "bg-amber-50 text-amber-700 border border-amber-200",
  "지연": "bg-amber-50 text-amber-700 border border-amber-200",
  "실패": "bg-red-50 text-red-700 border border-red-200",
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_STYLE[status] ?? "bg-slate-50 text-slate-600 border border-slate-200"
  return <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{status}</span>
}

const TAB_MAP: Record<string, Tab> = {
  "models": "AI 모델",
  "market-data": "시장 데이터",
  "automation": "자동화",
  "rag": "RAG 관리",
}

export default function AdminMLPage() {
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
                {AI_MODELS.map((model) => (
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
                        onClick={() => toast.success(`${model.name} 재학습을 요청했습니다.`)}
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
        )}

        {/* 시장 데이터 */}
        {tab === "시장 데이터" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.bodyBold}>크롤링 데이터 소스</h2>
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
                {DATA_SOURCES.map((src) => (
                  <tr key={src.id} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <div className="font-medium">{src.name}</div>
                      <div className={`${DS.text.micro} font-mono`}>{src.url}</div>
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={DS.badge.inline("bg-slate-50", "text-slate-700", "border-slate-200")}>{src.type}</span>
                    </td>
                    <td className={`${DS.table.cellMuted} text-center`}>{src.records.toLocaleString()}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{src.lastFetch}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{src.nextFetch}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <StatusBadge status={src.status} />
                    </td>
                    <td className={`${DS.table.cell} text-center`}>
                      <button
                        onClick={() => toast.success(`${src.name} 즉시 수집을 시작했습니다.`)}
                        className={`${DS.button.secondary} ${DS.button.sm}`}
                      >
                        <RefreshCw className="w-3 h-3" /> 즉시 수집
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {SCHEDULED_JOBS.map((job) => (
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
                        onClick={() => toast.success(`${job.name} 실행을 시작했습니다.`)}
                        className={DS.button.icon}
                      >
                        <Play className="w-3.5 h-3.5" />
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
                { label: "총 법률 문서 수", value: "2,603", sub: "+48 이번 주", subColor: "text-[var(--color-positive)]" },
                { label: "총 청크 수", value: "38,581", sub: "평균 15.4청크/문서", subColor: "" },
                { label: "평균 검색 정확도", value: "92.4%", sub: "MRR@10 기준", subColor: "text-[var(--color-brand-mid)]" },
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
                  {RAG_DOCS.map((doc) => (
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
