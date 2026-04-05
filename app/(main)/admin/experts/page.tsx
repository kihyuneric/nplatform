"use client"

import { useState } from "react"
import { toast } from "sonner"
import { GraduationCap, Users, Wallet, CheckCircle, XCircle, Clock } from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type Tab = "전문가 목록" | "파트너 관리" | "정산 관리"
const TABS: Tab[] = ["전문가 목록", "파트너 관리", "정산 관리"]

const EXPERTS = [
  { name: "김민준", field: "법무사",     joined: "2025-11-03", status: "활성" },
  { name: "이서연", field: "감정평가사", joined: "2025-12-15", status: "활성" },
  { name: "박지훈", field: "세무사",     joined: "2026-01-08", status: "활성" },
  { name: "최수아", field: "공인중개사", joined: "2026-02-20", status: "심사중" },
  { name: "정도현", field: "법무사",     joined: "2026-03-01", status: "활성" },
  { name: "한예진", field: "세무사",     joined: "2026-03-18", status: "심사중" },
  { name: "오지석", field: "감정평가사", joined: "2026-03-22", status: "정지" },
  { name: "윤채원", field: "공인중개사", joined: "2026-03-30", status: "심사중" },
]

const PARTNERS = [
  { name: "한국자산관리공사", code: "KAMCO2025", referrals: 48, revenue: "₩1,200,000", status: "활성" },
  { name: "우리은행 NPL팀",  code: "WOORI-NPL",  referrals: 23, revenue: "₩580,000",   status: "활성" },
  { name: "대신F&I",         code: "DAESHIN01",  referrals: 11, revenue: "₩275,000",   status: "비활성" },
  { name: "경매로114",        code: "GM114-REF",  referrals: 7,  revenue: "₩175,000",   status: "활성" },
  { name: "부동산인사이트",   code: "RI-REFER",   referrals: 34, revenue: "₩850,000",   status: "활성" },
]

const SETTLEMENTS = [
  { name: "김민준",        type: "전문가", amount: "₩420,000",   month: "2026-03", status: "완료" },
  { name: "이서연",        type: "전문가", amount: "₩310,000",   month: "2026-03", status: "완료" },
  { name: "한국자산관리공사", type: "파트너", amount: "₩1,200,000", month: "2026-03", status: "대기" },
  { name: "박지훈",        type: "전문가", amount: "₩570,000",   month: "2026-03", status: "대기" },
  { name: "우리은행 NPL팀", type: "파트너", amount: "₩580,000",   month: "2026-03", status: "대기" },
  { name: "정도현",        type: "전문가", amount: "₩190,000",   month: "2026-03", status: "대기" },
]

const statusBadge: Record<string, string> = {
  활성:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  심사중: "bg-amber-50 text-amber-700 border-amber-200",
  정지:  "bg-red-50 text-red-700 border-red-200",
  완료:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  대기:  "bg-amber-50 text-amber-700 border-amber-200",
  비활성: "bg-slate-50 text-slate-600 border-slate-200",
}

export default function AdminExpertsPage() {
  const [tab, setTab] = useState<Tab>("전문가 목록")

  const totalSettlement = "₩3,270,000"
  const pendingCount = SETTLEMENTS.filter(s => s.status === "대기").length

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-[var(--color-brand-mid)]" />
            <div>
              <p className={DS.header.eyebrow}>Admin / Experts</p>
              <h1 className={DS.text.cardTitle}>전문가·파트너 관리</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200`}>
              심사중 {EXPERTS.filter(e => e.status === "심사중").length}건
            </span>
            <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200`}>
              정산 대기 {pendingCount}건
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className={`border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]`}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border-subtle)]">
          {[
            { label: "등록 전문가", value: `${EXPERTS.length}명`, sub: `활성 ${EXPERTS.filter(e => e.status === "활성").length}명`, color: "text-[var(--color-brand-mid)]" },
            { label: "파트너 수",   value: `${PARTNERS.length}개`, sub: "이달 추천 89건",       color: "text-[var(--color-positive)]" },
            { label: "총 정산 금액", value: totalSettlement,        sub: "2026년 3월",           color: "text-[var(--color-warning)]" },
            { label: "정산 대기",   value: `${pendingCount}건`,     sub: "처리 필요",            color: "text-[var(--color-danger)]" },
          ].map(k => (
            <div key={k.label} className="px-6 py-4">
              <p className={DS.stat.label}>{k.label}</p>
              <p className={`${DS.stat.value} ${k.color} font-mono`}>{k.value}</p>
              <p className={DS.stat.sub}>{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6`}>
        <div className="max-w-6xl mx-auto flex">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-[0.8125rem] font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-[var(--color-brand-mid)] text-[var(--color-text-primary)] bg-[var(--color-surface-base)]"
                  : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* 전문가 목록 */}
        {tab === "전문가 목록" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={DS.text.caption}>전문가 현황 -- {EXPERTS.length}명</p>
              <button onClick={() => toast.success("전문가 초대 링크가 복사되었습니다")} className={DS.button.secondary}>
                <GraduationCap className="w-3 h-3" /> 전문가 초대
              </button>
            </div>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "전문 분야", "등록일", "상태", "액션"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXPERTS.map((e, i) => (
                    <tr key={i} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{e.name}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>{e.field}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono`}>{e.joined}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[e.status]}`}>{e.status}</span>
                      </td>
                      <td className={DS.table.cell}>
                        <div className="flex gap-2">
                          {e.status === "심사중" && (
                            <button onClick={() => toast.success(`${e.name} 승인 완료`)} className={`${DS.button.accent} ${DS.button.sm}`}>
                              <CheckCircle className="w-3 h-3" /> 승인
                            </button>
                          )}
                          {e.status === "활성" && (
                            <button onClick={() => toast.error(`${e.name} 계정 정지됨`)} className={`${DS.button.danger} ${DS.button.sm}`}>
                              <XCircle className="w-3 h-3" /> 정지
                            </button>
                          )}
                          {e.status === "정지" && (
                            <button onClick={() => toast.success(`${e.name} 계정 복원됨`)} className={`${DS.button.primary} ${DS.button.sm}`}>
                              <CheckCircle className="w-3 h-3" /> 복원
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 파트너 관리 */}
        {tab === "파트너 관리" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={DS.text.caption}>파트너 현황 -- {PARTNERS.length}개</p>
              <button onClick={() => toast.success("파트너 등록 폼이 열립니다")} className={DS.button.secondary}>
                <Users className="w-3 h-3" /> 파트너 추가
              </button>
            </div>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "추천 코드", "추천 수", "수익", "상태", "액션"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PARTNERS.map((p, i) => (
                    <tr key={i} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{p.name}</td>
                      <td className={DS.table.cell}>
                        <code className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>{p.code}</code>
                      </td>
                      <td className={`${DS.table.cell} text-[var(--color-positive)] font-bold font-mono`}>{p.referrals}건</td>
                      <td className={`${DS.table.cell} text-[var(--color-warning)] font-mono`}>{p.revenue}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[p.status] ?? statusBadge["비활성"]}`}>{p.status}</span>
                      </td>
                      <td className={DS.table.cell}>
                        <button onClick={() => toast.info(`${p.name} 상세 정보`)} className={`${DS.button.secondary} ${DS.button.sm}`}>
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 정산 관리 */}
        {tab === "정산 관리" && (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "총 정산 금액",  value: totalSettlement, sub: "2026년 3월",    icon: Wallet,       color: "text-[var(--color-warning)]", border: "border-l-amber-400" },
                { label: "정산 대기",     value: `${pendingCount}건`,  sub: "처리 필요",   icon: Clock,        color: "text-[var(--color-danger)]",    border: "border-l-red-400" },
                { label: "정산 완료",     value: `${SETTLEMENTS.filter(s => s.status === "완료").length}건`, sub: "지급 완료", icon: CheckCircle, color: "text-[var(--color-positive)]", border: "border-l-emerald-400" },
              ].map(c => (
                <div key={c.label} className={`${DS.stat.card} border-l-2 ${c.border} flex items-center gap-4`}>
                  <c.icon className={`w-7 h-7 shrink-0 ${c.color}`} />
                  <div>
                    <p className={`${DS.stat.value} ${c.color} font-mono`}>{c.value}</p>
                    <p className={DS.stat.label}>{c.label}</p>
                    <p className={DS.stat.sub}>{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className={DS.text.caption}>2026년 3월 정산 내역</p>
              <button onClick={() => toast.success("일괄 지급 처리 완료")} className={DS.button.secondary}>
                <Wallet className="w-3 h-3" /> 일괄 지급
              </button>
            </div>

            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "유형", "정산 월", "금액", "상태", ""].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SETTLEMENTS.map((s, i) => (
                    <tr key={i} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{s.name}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-slate-50", "text-slate-700", "border-slate-200")}>{s.type}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono`}>{s.month}</td>
                      <td className={`${DS.table.cell} text-[var(--color-positive)] font-bold font-mono`}>{s.amount}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[s.status]}`}>{s.status}</span>
                      </td>
                      <td className={DS.table.cell}>
                        {s.status === "대기" && (
                          <button onClick={() => toast.success(`${s.name} 정산 지급 완료`)} className={`${DS.button.accent} ${DS.button.sm}`}>
                            지급 처리
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
