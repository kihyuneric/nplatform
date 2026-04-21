/**
 * DealCompletionStages — L3/L4/L5 인라인 거래 완료 단계 (DR-5-D · 2026-04-21)
 *
 * 모달(ActionSheet)에 의존하던 거래 후반 단계를 자산 상세 페이지 본문에 인라인 합성.
 * 티어가 올라갈 때마다 해당 패널이 한 번에 인라인으로 드러나며 과거 단계는 요약으로 축소.
 *
 * 스택 (상->하):
 *   L3 채권오퍼     — OfferForm (LOI 작성) + 실사 데이터룸 요약
 *   L4 계약·에스크로 — SignaturePad + Escrow Timeline
 *   L5 완료         — 정산 영수증 · 거래 요약 · PDF 다운로드
 *
 * 디자인 톤은 AiReportCard / InlineDealRoom 과 동일한 Bloomberg-다크 그라디언트.
 */

"use client"

import { useState } from "react"
import {
  FileCheck, FolderOpen, PenLine, Wallet, CheckCircle2, Download,
  TrendingUp, FileText, ShieldCheck, Clock, ArrowRight,
  Scale, DollarSign, Building2, Gavel, Users, Coins,
  ChevronRight, Sparkles, Calculator,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { OfferForm, OfferCard, type OfferData } from "@/components/deal-room/offer-card"
import SignaturePad from "@/components/deal-room/signature-pad"
import type { AssetTier } from "@/hooks/use-asset-tier"

export interface DealCompletionStagesProps {
  tier: AssetTier
  /** 매각 희망가 — 에스크로/정산 기준 (원) */
  askingPrice: number
  /** 담보 타이틀 — 영수증에 표시 */
  assetTitle: string
  /** 외부 모달(ActionSheet) 트리거 — 필요 시 */
  onOpenDetails?: () => void
  /** LOI 제출 콜백 (없으면 toast + 데모 UX) */
  onSubmitOffer?: (offer: Omit<OfferData, "status">) => void
  /** 서명 완료 콜백 */
  onSignConfirm?: (base64: string) => void
  /** 영수증 다운로드 콜백 */
  onDownloadReceipt?: () => void
}

function formatKRW(n: number): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

/* ─────────────────────────────────────────────────────────────
   공통 PanelShell — AiReportCard / InlineDealRoom 과 동일 톤
   ───────────────────────────────────────────────────────────── */
function PanelShell({
  title,
  subtitle,
  icon,
  accent = "blue",
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  accent?: "blue" | "gold" | "green"
  children: React.ReactNode
}) {
  const accentColor =
    accent === "gold" ? "#F59E0B" :
    accent === "green" ? "var(--color-positive)" :
    "var(--color-brand-bright)"

  return (
    <section
      className="rounded-2xl overflow-hidden"
      // PanelShell 은 항상 다크 배경 (Bloomberg 톤) — 하위 컴포넌트가
      // 페이지 라이트 모드에서도 올바른 대비를 갖도록 다크 토큰을 스코프 주입.
      style={{
        background: "linear-gradient(180deg, #0F1E35 0%, #122843 100%)",
        border: `1px solid ${accent === "gold"
          ? "rgba(245, 158, 11, 0.32)"
          : accent === "green"
          ? "rgba(16, 185, 129, 0.32)"
          : "rgba(46, 117, 182, 0.32)"}`,
        boxShadow: "0 8px 32px rgba(27, 58, 92, 0.20)",
        color: "var(--fg-on-brand)",
        // ── Dark-scoped CSS variable overrides (라이트 모드 페이지에서도 적용) ──
        ["--color-text-primary" as string]:   "#F1F5F9",
        ["--color-text-secondary" as string]: "#CBD5E1",
        ["--color-text-muted" as string]:     "#94A3B8",
        ["--color-surface-elevated" as string]: "#162035",
        ["--color-surface-overlay" as string]:  "#1E2D47",
        ["--color-surface-sunken" as string]:   "#0F1C30",
        ["--color-border-subtle" as string]:   "rgba(255,255,255,0.10)",
        ["--color-brand-bright" as string]:    "#60A5FA",
        ["--color-positive" as string]:        "#34D399",
        ["--color-warning" as string]:         "#FBBF24",
        ["--color-danger" as string]:          "#F87171",
        colorScheme: "dark",
      } as React.CSSProperties}
    >
      <header
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${accent === "gold"
            ? "rgba(245, 158, 11, 0.24)"
            : accent === "green"
            ? "rgba(16, 185, 129, 0.24)"
            : "rgba(46, 117, 182, 0.24)"}`,
        }}
      >
        <div>
          <h3 className="font-black inline-flex items-center gap-2" style={{ fontSize: 14 }}>
            <span style={{ color: accentColor }}>{icon}</span>
            {title}
          </h3>
          {subtitle && (
            <div
              className="font-semibold mt-0.5"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </header>
      <div style={{ padding: "18px" }}>{children}</div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   L3 채권오퍼 패널 — LOI 폼 + 실사 데이터룸 요약
   ───────────────────────────────────────────────────────────── */
function LoiOfferPanel({
  askingPrice,
  onSubmitOffer,
  onOpenDetails,
}: {
  askingPrice: number
  onSubmitOffer?: (offer: Omit<OfferData, "status">) => void
  onOpenDetails?: () => void
}) {
  const [submittedOffer, setSubmittedOffer] = useState<OfferData | null>(null)
  const [formVisible, setFormVisible] = useState(true)

  function handleSubmit(o: Omit<OfferData, "status">) {
    const offer: OfferData = { ...o, status: "pending" }
    setSubmittedOffer(offer)
    setFormVisible(false)
    onSubmitOffer?.(o)
    toast.success("LOI 제출 완료 · 매도자 승인 대기 중", { duration: 2500 })
  }

  return (
    <PanelShell
      title="채권오퍼 · LOI 제출"
      subtitle="매수의향서 제출 후 매도자 승인 시 실사 자료·계약 협상 채널이 열립니다"
      icon={<FileCheck size={16} />}
      accent="blue"
    >
      <div className="space-y-4">
        {/* Suggested price strip */}
        <div
          className="rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2"
          style={{
            backgroundColor: "rgba(46, 117, 182, 0.10)",
            border: "1px solid rgba(46, 117, 182, 0.24)",
          }}
        >
          <div>
            <div
              className="font-semibold"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
            >
              매각 희망가
            </div>
            <div
              className="font-black tabular-nums"
              style={{ fontSize: 18, color: "var(--fg-on-brand)" }}
            >
              {formatKRW(askingPrice)}
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-semibold inline-flex items-center gap-1"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
            >
              <TrendingUp size={11} />
              AI 권고 입찰가
            </div>
            <div
              className="font-black tabular-nums"
              style={{ fontSize: 16, color: "var(--color-brand-bright)" }}
            >
              {formatKRW(Math.round(askingPrice * 0.97))}
              <span
                className="font-semibold ml-1"
                style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
              >
                ±3%
              </span>
            </div>
          </div>
        </div>

        {/* LOI 폼 or 제출 결과 */}
        {submittedOffer ? (
          <div
            className="rounded-xl p-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              borderRadius: 12,
            }}
          >
            <OfferCard offer={submittedOffer} isMine />
          </div>
        ) : formVisible ? (
          <OfferForm onSubmit={handleSubmit} onCancel={() => setFormVisible(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setFormVisible(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-black transition-opacity"
            style={{
              padding: "12px 16px",
              fontSize: 13,
              backgroundColor: "rgba(46, 117, 182, 0.18)",
              color: "var(--fg-on-brand)",
              border: "1px solid rgba(46, 117, 182, 0.32)",
            }}
          >
            <FileCheck size={14} />
            LOI 작성 열기
          </button>
        )}

        {/* LOI 체결 안내 (DR-9) */}
        <div
          className="rounded-xl p-3.5 flex items-start gap-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.14)",
          }}
        >
          <FolderOpen
            size={16}
            style={{ color: "var(--color-brand-bright)", flexShrink: 0, marginTop: 2 }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-black" style={{ fontSize: 12 }}>
              LOI 체결
            </div>
            <div
              className="font-semibold mt-0.5 leading-relaxed"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
            >
              매도자 승인 후, 채권 정보 세부 자료는 금융기관 대면 미팅에서 검토할 수 있습니다.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1 font-bold transition-opacity flex-shrink-0"
            style={{
              padding: "6px 10px",
              fontSize: 11,
              color: "var(--color-brand-bright)",
              backgroundColor: "rgba(46, 117, 182, 0.14)",
              border: "1px solid rgba(46, 117, 182, 0.32)",
              borderRadius: 8,
            }}
          >
            열기
            <ArrowRight size={11} />
          </button>
        </div>

        {/* 실사 체크리스트 (DR-10) — LOI 체결 후 자동 생성 */}
        <DueDiligenceChecklist />
      </div>
    </PanelShell>
  )
}

/* ─────────────────────────────────────────────────────────────
   실사 체크리스트 (DR-12) — LOI 체결 후 L3 에서 표시
   6 카테고리 · 15 항목 · AI 컨설턴트 · 경매 수익률 분석기 바로가기
   ───────────────────────────────────────────────────────────── */

interface DDItem {
  key: string
  label: string
  done: boolean
  /** 상세 페이지 경로 또는 앵커 */
  detail?: string
}

interface DDCategory {
  key: string
  label: string
  icon: typeof Scale
  items: DDItem[]
}

const DD_CATEGORIES_INITIAL: DDCategory[] = [
  {
    key: "rights",
    label: "권리관계",
    icon: Scale,
    items: [
      { key: "reg",      label: "등기부등본 확인",    done: false, detail: "#deed-full" },
      { key: "bldg",     label: "건축물대장 검토",    done: false, detail: "#rights" },
      { key: "mortgage", label: "근저당권 분석",      done: false, detail: "#rights" },
    ],
  },
  {
    key: "valuation",
    label: "가치평가",
    icon: DollarSign,
    items: [
      { key: "appraise",    label: "감정평가서 검토",       done: false, detail: "#appraisal" },
      { key: "distrib",     label: "배당 시뮬레이션",        done: false, detail: "/analysis/simulator" },
      { key: "irr",         label: "수익률 분석(IRR/NPV)",   done: false, detail: "/analysis/simulator" },
    ],
  },
  {
    key: "physical",
    label: "물리적 상태",
    icon: Building2,
    items: [
      { key: "onsite", label: "현장 실사 완료",      done: false, detail: "#site-photos" },
      { key: "env",    label: "환경 리스크 평가",    done: false, detail: "#site-photos" },
    ],
  },
  {
    key: "legal",
    label: "법적 리스크",
    icon: Gavel,
    items: [
      { key: "auction",  label: "경매 기록 분석",         done: false, detail: "/analysis/simulator" },
      { key: "corp",     label: "법인 대표 신원 확인",    done: false, detail: "#debt-info" },
      { key: "urban",    label: "도시계획 확인",          done: false, detail: "#rights" },
    ],
  },
  {
    key: "profit",
    label: "수익성",
    icon: Users,
    items: [
      { key: "tenants", label: "임차인 현황 확인", done: false, detail: "#tenants" },
    ],
  },
  {
    key: "financial",
    label: "재무 리스크",
    icon: Coins,
    items: [
      { key: "tax",      label: "세금 체납 조회",      done: false, detail: "#debt-info" },
      { key: "mgmt-fee", label: "관리비 체납 조회",    done: false, detail: "#debt-info" },
      { key: "insure",   label: "보험 현황 확인",       done: false, detail: "#debt-info" },
    ],
  },
]

function DueDiligenceChecklist() {
  const [categories, setCategories] = useState<DDCategory[]>(DD_CATEGORIES_INITIAL)

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0)
  const doneTotal  = categories.reduce((s, c) => s + c.items.filter((i) => i.done).length, 0)
  const pct = totalItems > 0 ? Math.round((doneTotal / totalItems) * 100) : 0

  function toggle(catKey: string, itemKey: string) {
    setCategories((arr) =>
      arr.map((c) =>
        c.key !== catKey
          ? c
          : { ...c, items: c.items.map((i) => (i.key === itemKey ? { ...i, done: !i.done } : i)) }
      )
    )
  }

  return (
    <div
      id="dd-checklist"
      className="rounded-xl p-4 scroll-mt-24"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.14)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="font-black" style={{ fontSize: 13 }}>실사 체크리스트</span>
          <span
            className="font-semibold px-1.5 py-0.5 rounded"
            style={{
              fontSize: 10,
              backgroundColor: "rgba(46,117,182,0.18)",
              color: "var(--color-brand-bright)",
            }}
          >
            L3
          </span>
        </div>
        <div className="text-right">
          <div className="font-black tabular-nums" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
            실사 완료율
          </div>
          <div
            className="font-black tabular-nums"
            style={{ fontSize: 13, color: "var(--color-brand-bright)" }}
          >
            {doneTotal}/{totalItems} 완료 · {pct}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full rounded-full overflow-hidden mb-3"
        style={{ height: 5, backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, var(--color-brand-bright), var(--color-positive))",
          }}
        />
      </div>

      {/* Quick AI links */}
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <Link
          href="/analysis/copilot"
          className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
          style={{
            backgroundColor: "rgba(46,117,182,0.12)",
            border: "1px solid rgba(46,117,182,0.28)",
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--color-brand-bright)" }} />
            <span className="font-black" style={{ fontSize: 11, color: "var(--color-brand-bright)" }}>
              AI 컨설턴트에게 묻기
            </span>
          </span>
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--color-brand-bright)" }}
          />
        </Link>
        <Link
          href="/analysis/simulator"
          className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
          style={{
            backgroundColor: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.28)",
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" style={{ color: "var(--color-positive)" }} />
            <span className="font-black" style={{ fontSize: 11, color: "var(--color-positive)" }}>
              경매 수익률 분석기
            </span>
          </span>
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--color-positive)" }}
          />
        </Link>
      </div>

      {/* 상단 한 줄 AI 단축 메뉴 */}
      <div
        className="flex items-center gap-2 mb-3.5 pb-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <Link
          href="/analysis/copilot"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}
        >
          <Sparkles className="w-3 h-3" />
          AI 컨설턴트
        </Link>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.24)" }}>·</span>
        <Link
          href="/analysis/simulator"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}
        >
          <Calculator className="w-3 h-3" />
          경매 수익률 분석기
        </Link>
      </div>

      {/* Categories */}
      <div className="space-y-3.5">
        {categories.map((cat) => {
          const catDone = cat.items.filter((i) => i.done).length
          const CatIcon = cat.icon
          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <CatIcon className="w-3.5 h-3.5" style={{ color: "var(--color-brand-bright)" }} />
                  <span className="font-black" style={{ fontSize: 12, color: "rgba(255,255,255,0.88)" }}>
                    {cat.label}
                  </span>
                </span>
                <span
                  className="font-black tabular-nums"
                  style={{ fontSize: 10, color: "rgba(255,255,255,0.48)" }}
                >
                  {catDone}/{cat.items.length}
                </span>
              </div>
              <ul className="space-y-1">
                {cat.items.map((it) => (
                  <li key={it.key}>
                    <div
                      className="w-full inline-flex items-center gap-2 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ padding: "5px 8px" }}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(cat.key, it.key)}
                        className="inline-flex items-center gap-2 flex-1 text-left"
                        aria-label={`${it.label} ${it.done ? "완료 취소" : "완료 표시"}`}
                      >
                        <span
                          className="inline-flex items-center justify-center rounded shrink-0"
                          style={{
                            width: 16,
                            height: 16,
                            backgroundColor: it.done ? "var(--color-positive)" : "rgba(255,255,255,0.08)",
                            border: it.done ? "1px solid var(--color-positive)" : "1px solid rgba(255,255,255,0.18)",
                            color: "#041915",
                            fontSize: 10,
                          }}
                          aria-hidden
                        >
                          {it.done ? "✓" : ""}
                        </span>
                        <span
                          className="font-semibold"
                          style={{
                            fontSize: 11,
                            color: it.done ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.85)",
                            textDecoration: it.done ? "line-through" : "none",
                          }}
                        >
                          {it.label}
                        </span>
                      </button>
                      {it.detail && (
                        it.detail.startsWith("#") ? (
                          <a
                            href={it.detail}
                            className="inline-flex items-center gap-0.5 font-bold rounded px-1.5 py-0.5 shrink-0 transition-colors hover:bg-white/5"
                            style={{
                              fontSize: 10,
                              color: "var(--color-brand-bright)",
                            }}
                          >
                            상세 <ChevronRight className="w-3 h-3" />
                          </a>
                        ) : (
                          <Link
                            href={it.detail}
                            className="inline-flex items-center gap-0.5 font-bold rounded px-1.5 py-0.5 shrink-0 transition-colors hover:bg-white/5"
                            style={{
                              fontSize: 10,
                              color: "var(--color-brand-bright)",
                            }}
                          >
                            상세 <ChevronRight className="w-3 h-3" />
                          </Link>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p
        className="mt-3 pt-3 border-t leading-relaxed"
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.48)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        체크리스트는 L3 (LOI 제출 후) 매도자 승인과 함께 자동 생성됩니다. 각 항목의 &quot;상세&quot;를 눌러 해당 섹션·도구로 이동하거나, AI 컨설턴트에게 보완 질문을 요청하세요.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   L4 계약·에스크로 패널 — Signature + Escrow Timeline
   ───────────────────────────────────────────────────────────── */
function ContractSignPanel({
  askingPrice,
  onSignConfirm,
}: {
  askingPrice: number
  onSignConfirm?: (base64: string) => void
}) {
  const [signed, setSigned] = useState(false)

  function handleConfirm(base64: string) {
    setSigned(true)
    onSignConfirm?.(base64)
    toast.success("전자서명 완료 · 에스크로 입금 단계로 진행", { duration: 2500 })
  }

  const escrowSteps = [
    {
      label: "전자서명",
      status: signed ? "done" : "now" as const,
      hint: "매수자·매도자 양측 서명",
    },
    {
      label: "에스크로 입금",
      status: signed ? "now" : "pending" as const,
      hint: `KB에스크로 ${formatKRW(askingPrice)}`,
    },
    {
      label: "소유권 이전",
      status: "pending" as const,
      hint: "등기 이전 + 채권양도 통지",
    },
    {
      label: "정산 완료",
      status: "pending" as const,
      hint: "영수증 · 세금계산서 발급",
    },
  ]

  return (
    <PanelShell
      title="계약·에스크로"
      subtitle="전자서명 후 에스크로 계좌 입금까지 단일 흐름으로 진행"
      icon={<PenLine size={16} />}
      accent="gold"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        {/* 좌: Signature Pad (canvas) — 밝은 배경 */}
        <div
          className="rounded-xl p-4 flex flex-col items-center gap-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.97)",
            border: "1px solid rgba(245, 158, 11, 0.32)",
          }}
        >
          <div
            className="font-black inline-flex items-center gap-1.5 self-start"
            style={{ fontSize: 12, color: "var(--color-brand-dark)" }}
          >
            <PenLine size={14} />
            전자서명
          </div>
          <div className="max-w-full overflow-x-auto">
            <SignaturePad width={320} height={160} onConfirm={handleConfirm} />
          </div>
        </div>

        {/* 우: Escrow Timeline */}
        <div className="space-y-3">
          <div
            className="rounded-xl p-3.5"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.28)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} style={{ color: "#F59E0B" }} />
              <div className="font-black" style={{ fontSize: 12, color: "#FBBF24" }}>
                에스크로 계좌 (KB)
              </div>
            </div>
            <div
              className="font-mono tabular-nums"
              style={{ fontSize: 13, color: "var(--fg-on-brand)" }}
            >
              301-9999-****-23
            </div>
            <div
              className="font-bold tabular-nums mt-1"
              style={{ fontSize: 18, color: "var(--fg-on-brand)" }}
            >
              {formatKRW(askingPrice)}
            </div>
          </div>

          <ol className="space-y-0">
            {escrowSteps.map((s, idx) => {
              const isDone = s.status === "done"
              const isNow = s.status === "now"
              const color = isDone
                ? "var(--color-positive)"
                : isNow
                ? "#F59E0B"
                : "rgba(255,255,255,0.25)"
              return (
                <li key={s.label} className="flex gap-3 relative" style={{ paddingBottom: 14 }}>
                  {/* dot + line */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: isNow ? "0 0 0 4px rgba(245, 158, 11, 0.22)" : "none",
                      }}
                    />
                    {idx < escrowSteps.length - 1 && (
                      <div
                        className="flex-1 mt-1"
                        style={{
                          width: 2,
                          backgroundColor: isDone
                            ? "var(--color-positive)"
                            : "rgba(255,255,255,0.08)",
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div
                      className="font-black"
                      style={{ fontSize: 12, color: isNow ? "#FBBF24" : isDone ? "var(--color-positive)" : "var(--fg-on-brand)" }}
                    >
                      {s.label}
                      {isNow && (
                        <span
                          className="ml-2 px-1.5 py-0.5 rounded-full font-bold"
                          style={{
                            fontSize: 9,
                            backgroundColor: "rgba(245, 158, 11, 0.16)",
                            color: "#FBBF24",
                          }}
                        >
                          진행 중
                        </span>
                      )}
                    </div>
                    <div
                      className="font-semibold mt-0.5 inline-flex items-center gap-1"
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}
                    >
                      {s.status === "pending" && <Clock size={10} />}
                      {s.status === "done" && <CheckCircle2 size={10} style={{ color: "var(--color-positive)" }} />}
                      {s.hint}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </PanelShell>
  )
}

/* ─────────────────────────────────────────────────────────────
   L5 정산 패널 — 영수증 요약 · PDF 다운로드
   ───────────────────────────────────────────────────────────── */
function SettlementReceiptPanel({
  askingPrice,
  assetTitle,
  onDownloadReceipt,
}: {
  askingPrice: number
  assetTitle: string
  onDownloadReceipt?: () => void
}) {
  const buyerFee = Math.round(askingPrice * 0.018)
  const sellerFee = Math.round(askingPrice * 0.005)
  const totalSettled = askingPrice + buyerFee

  return (
    <PanelShell
      title="정산 완료"
      subtitle={`${assetTitle} — 거래가 종결되었습니다`}
      icon={<CheckCircle2 size={16} />}
      accent="green"
    >
      <div id="settlement" className="space-y-4 scroll-mt-24">
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.28)",
          }}
        >
          <div
            className="font-semibold mb-1"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
          >
            최종 결제 금액
          </div>
          <div
            className="font-black tabular-nums"
            style={{ fontSize: 26, color: "var(--color-positive)" }}
          >
            {formatKRW(totalSettled)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ReceiptRow label="거래가" value={formatKRW(askingPrice)} />
          <ReceiptRow label="매수 수수료 (1.8%)" value={formatKRW(buyerFee)} />
          <ReceiptRow label="매도 수수료 (0.5%)" value={formatKRW(sellerFee)} dim />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onDownloadReceipt?.()
              toast.success("영수증 PDF 다운로드 시작", { duration: 1800 })
            }}
            className="group rounded-xl p-4 text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.32)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black inline-flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <Download size={14} style={{ color: "var(--color-positive)" }} />
                  영수증 PDF
                </div>
                <div
                  className="mt-1 font-semibold"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}
                >
                  세금계산서 · 정산 내역 포함
                </div>
              </div>
              <ArrowRight size={14} className="opacity-60 group-hover:opacity-100" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              toast.info("거래 완료 보고서를 준비하고 있습니다.", { duration: 1800 })
            }}
            className="group rounded-xl p-4 text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
            style={{
              backgroundColor: "rgba(46, 117, 182, 0.12)",
              border: "1px solid rgba(46, 117, 182, 0.32)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black inline-flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <FileText size={14} style={{ color: "var(--color-brand-bright)" }} />
                  거래 완료 보고서
                </div>
                <div
                  className="mt-1 font-semibold"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}
                >
                  포트폴리오 반영 · 리스크 이력
                </div>
              </div>
              <ArrowRight size={14} className="opacity-60 group-hover:opacity-100" />
            </div>
          </button>
        </div>

        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <ShieldCheck size={12} style={{ color: "var(--color-positive)" }} />
          에스크로 정산 · 채권양도 통지 · 등기 이전 완료. 모든 보증 기록은 7년간 보관됩니다.
        </div>
      </div>
    </PanelShell>
  )
}

function ReceiptRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="font-semibold"
        style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}
      >
        {label}
      </div>
      <div
        className="font-black tabular-nums mt-1"
        style={{
          fontSize: 15,
          color: dim ? "rgba(255,255,255,0.5)" : "var(--fg-on-brand)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Root — tier에 따라 해당 패널만 렌더
   ───────────────────────────────────────────────────────────── */
export function DealCompletionStages({
  tier,
  askingPrice,
  assetTitle,
  onOpenDetails,
  onSubmitOffer,
  onSignConfirm,
  onDownloadReceipt,
}: DealCompletionStagesProps) {
  if (tier === "L3") {
    return (
      <LoiOfferPanel
        askingPrice={askingPrice}
        onSubmitOffer={onSubmitOffer}
        onOpenDetails={onOpenDetails}
      />
    )
  }
  if (tier === "L4") {
    return (
      <ContractSignPanel askingPrice={askingPrice} onSignConfirm={onSignConfirm} />
    )
  }
  if (tier === "L5") {
    return (
      <SettlementReceiptPanel
        askingPrice={askingPrice}
        assetTitle={assetTitle}
        onDownloadReceipt={onDownloadReceipt}
      />
    )
  }
  return null
}
