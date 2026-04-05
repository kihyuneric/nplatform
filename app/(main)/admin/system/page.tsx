"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Database, Code, Package, AlertTriangle, Zap,
  CheckCircle2, ExternalLink,
} from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

const SYSTEM_TABS = ["데이터베이스", "API 연동", "모듈 관리", "자동화", "에러"] as const
type SystemTab = typeof SYSTEM_TABS[number]

const TAB_ICONS: Record<SystemTab, typeof Database> = {
  "데이터베이스": Database,
  "API 연동": Code,
  "모듈 관리": Package,
  "자동화": Zap,
  "에러": AlertTriangle,
}

export default function AdminSystemPage() {
  const [tab, setTab] = useState<SystemTab>("데이터베이스")

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-6`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-dark)] text-white">
            <Database className="h-7 w-7" />
          </div>
          <div>
            <h1 className={DS.text.pageSubtitle}>시스템</h1>
            <p className={DS.text.body}>데이터베이스, API, 모듈, 자동화, 에러 통합 관리</p>
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {SYSTEM_TABS.map(t => {
            const Icon = TAB_ICONS[t]
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`${tab === t ? DS.tabs.active : DS.tabs.trigger} flex items-center gap-1.5`}>
                <Icon className="h-4 w-4" /> {t}
              </button>
            )
          })}
        </div>

        {/* 데이터베이스 Tab */}
        {tab === "데이터베이스" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <CheckCircle2 className="h-5 w-5 text-[var(--color-positive)] mx-auto mb-1" />, label: "연결 정상" },
                { value: "42", label: "테이블 수" },
                { value: "1.2GB", label: "DB 크기" },
              ].map((s, i) => (
                <div key={i} className={`${DS.stat.card} text-center`}>
                  {s.icon || <p className={DS.stat.value}>{s.value}</p>}
                  {!s.icon && null}
                  <p className={s.icon ? DS.text.bodyBold : DS.stat.sub}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                  <Database className="h-5 w-5" /> 데이터베이스 현황
                </h3>
                <Link href="/admin/database" className={DS.button.secondary}>
                  <ExternalLink className="h-3.5 w-3.5" /> 자세히 보기
                </Link>
              </div>
              <p className={DS.text.body}>Supabase PostgreSQL 연결 상태 및 테이블 관리</p>
            </div>
          </div>
        )}

        {/* API 연동 Tab */}
        {tab === "API 연동" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "5", label: "활성 API", color: "text-[var(--color-positive)]" },
                { value: "1", label: "오류", color: "text-[var(--color-danger)]" },
                { value: "12,840", label: "오늘 호출", color: "" },
              ].map((s, i) => (
                <div key={i} className={`${DS.stat.card} text-center`}>
                  <p className={`${DS.stat.value} ${s.color}`}>{s.value}</p>
                  <p className={DS.stat.sub}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                  <Code className="h-5 w-5" /> 외부 API 연동
                </h3>
                <Link href="/admin/integrations" className={DS.button.secondary}>
                  <ExternalLink className="h-3.5 w-3.5" /> 자세히 보기
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Supabase", status: "active" },
                  { name: "OpenAI", status: "active" },
                  { name: "Kakao Maps", status: "active" },
                  { name: "공공데이터포털", status: "active" },
                  { name: "국토부 실거래가", status: "active" },
                  { name: "결제 게이트웨이", status: "error" },
                ].map((api) => (
                  <div key={api.name} className={`flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0`}>
                    <span className={DS.text.body}>{api.name}</span>
                    <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${
                      api.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {api.status === "active" ? "정상" : "오류"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 모듈 관리 Tab */}
        {tab === "모듈 관리" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "14", label: "전체 모듈", color: "" },
                { value: "12", label: "활성화", color: "text-[var(--color-positive)]" },
                { value: "2", label: "비활성화", color: "text-[var(--color-text-muted)]" },
              ].map((s, i) => (
                <div key={i} className={`${DS.stat.card} text-center`}>
                  <p className={`${DS.stat.value} ${s.color}`}>{s.value}</p>
                  <p className={DS.stat.sub}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                  <Package className="h-5 w-5" /> 모듈 목록
                </h3>
                <Link href="/admin/modules" className={DS.button.secondary}>
                  <ExternalLink className="h-3.5 w-3.5" /> 자세히 보기
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { name: "NPL 분석", enabled: true },
                  { name: "커뮤니티", enabled: true },
                  { name: "경매 시뮬레이터", enabled: true },
                  { name: "실시간 경매", enabled: false },
                  { name: "매칭 서비스", enabled: false },
                ].map((mod) => (
                  <div key={mod.name} className={`flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0`}>
                    <span className={DS.text.body}>{mod.name}</span>
                    <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${
                      mod.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {mod.enabled ? "활성" : "비활성"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 자동화 Tab */}
        {tab === "자동화" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "8", label: "등록 작업", color: "" },
                { value: "6", label: "활성 작업", color: "text-[var(--color-positive)]" },
                { value: "142", label: "이번 주 실행", color: "text-[var(--color-brand-mid)]" },
              ].map((s, i) => (
                <div key={i} className={`${DS.stat.card} text-center`}>
                  <p className={`${DS.stat.value} ${s.color}`}>{s.value}</p>
                  <p className={DS.stat.sub}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                  <Zap className="h-5 w-5" /> 자동화 작업
                </h3>
                <Link href="/admin/automation" className={DS.button.secondary}>
                  <ExternalLink className="h-3.5 w-3.5" /> 자세히 보기
                </Link>
              </div>
              <p className={DS.text.body}>자동화 작업 스케줄 및 실행 이력을 관리합니다.</p>
            </div>
          </div>
        )}

        {/* 에러 Tab */}
        {tab === "에러" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "3", label: "미해결 에러", color: "text-[var(--color-danger)]" },
                { value: "24", label: "해결 완료", color: "text-[var(--color-positive)]" },
                { value: "99.7%", label: "업타임", color: "" },
              ].map((s, i) => (
                <div key={i} className={`${DS.stat.card} text-center`}>
                  <p className={`${DS.stat.value} ${s.color}`}>{s.value}</p>
                  <p className={DS.stat.sub}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                  <AlertTriangle className="h-5 w-5" /> 최근 에러
                </h3>
                <Link href="/admin/errors" className={DS.button.secondary}>
                  <ExternalLink className="h-3.5 w-3.5" /> 자세히 보기
                </Link>
              </div>
              <p className={DS.text.body}>에러 로그 및 모니터링이 여기에 표시됩니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
