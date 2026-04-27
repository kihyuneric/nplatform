/**
 * DealCompletionStages — L3/L4/L5 인라인 거래 완료 단계 (DR-7 · 2026-04-26)
 *
 * 모달(ActionSheet)에 의존하던 거래 후반 단계를 자산 상세 페이지 본문에 인라인 합성.
 * 티어가 올라갈 때마다 해당 패널이 한 번에 인라인으로 드러나며 과거 단계는 요약으로 축소.
 *
 * 스택 (상->하):
 *   L3 채권오퍼     — OfferForm (LOI 작성) + 실사 데이터룸 요약
 *   L4 계약·에스크로 — SignaturePad + Escrow Timeline
 *   L5 완료         — 정산 영수증 · 거래 요약 · PDF 다운로드
 *
 * 톤: McKinsey 흰종이 + 사각 모서리 + 2px electric 상단 strip + ink/electric 단색계
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
import type { AssetTier } from "@/hooks/use-asset-tier"

// ─── McKinsey 팔레트 ────────────────────────────────────────────
const M = {
  ink:          "#0A1628",
  paper:        "#FFFFFF",
  paperTint:    "#FAFBFC",
  electric:     "#2251FF",
  electricDark: "#1A47CC",
  border:       "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub:      "#4A5568",
  textMuted:    "#718096",
  positive:     "#0F766E",
  positiveBg:   "rgba(15, 118, 110, 0.08)",
  positiveBorder: "rgba(15, 118, 110, 0.30)",
} as const

export interface DealCompletionStagesProps {
  tier: AssetTier
  /** 매각 희망가 — 에스크로/정산 기준 (원) */
  askingPrice: number
  /** 담보 타이틀 — 영수증에 표시 */
  assetTitle: string
  /** 관리자 에스크로 납입 확인 여부 (L4) */
  escrowConfirmed?: boolean
  /** 관리자 현장 계약 완료 확인 여부 (L5) */
  contractConfirmed?: boolean
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
   공통 PanelShell — McKinsey paper 톤 (단일 일관)
   ───────────────────────────────────────────────────────────── */
function PanelShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className="overflow-hidden"
      style={{
        background: M.paper,
        border: `1px solid ${M.border}`,
        borderTop: `2px solid ${M.electric}`,
        color: M.ink,
      }}
    >
      <header
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${M.border}`,
          background: M.paperTint,
        }}
      >
        <div>
          <h3
            className="inline-flex items-center gap-2"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: M.ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: "-0.005em",
            }}
          >
            <span style={{ color: M.electric }}>{icon}</span>
            {title}
          </h3>
          {subtitle && (
            <div
              className="mt-0.5"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: M.textSub,
                letterSpacing: "-0.005em",
              }}
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
      icon={<FileCheck size={14} />}
    >
      <div className="space-y-4">
        {/* Suggested price strip */}
        <div
          className="p-3.5 flex items-center justify-between flex-wrap gap-2"
          style={{
            background: M.paperTint,
            border: `1px solid ${M.border}`,
            borderTop: `2px solid ${M.electric}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: M.textMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              매각 희망가
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: M.ink,
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "-0.01em",
              }}
            >
              {formatKRW(askingPrice)}
            </div>
          </div>
          <div className="text-right">
            <div
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: M.electricDark,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <TrendingUp size={11} style={{ color: M.electric }} />
              AI 권고 입찰가
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: M.electric,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              {formatKRW(Math.round(askingPrice * 0.97))}
              <span
                className="ml-1"
                style={{ fontSize: 11, color: M.textMuted, fontWeight: 700 }}
              >
                ±3%
              </span>
            </div>
          </div>
        </div>

        {/* LOI 폼 or 제출 결과 */}
        {submittedOffer ? (
          <OfferCard offer={submittedOffer} isMine />
        ) : formVisible ? (
          <OfferForm onSubmit={handleSubmit} onCancel={() => setFormVisible(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setFormVisible(true)}
            className="w-full inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{
              padding: "12px 16px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: M.ink,
              color: M.paper,
              border: `1px solid ${M.ink}`,
              borderTop: `2px solid ${M.electric}`,
            }}
          >
            <FileCheck size={14} style={{ color: M.paper }} />
            <span style={{ color: M.paper }}>LOI 작성 열기</span>
          </button>
        )}

        {/* LOI 체결 안내 (DR-9) */}
        <div
          className="p-3.5 flex items-start gap-3"
          style={{
            background: M.paperTint,
            border: `1px dashed ${M.borderStrong}`,
          }}
        >
          <FolderOpen
            size={16}
            style={{ color: M.electric, flexShrink: 0, marginTop: 2 }}
          />
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: M.ink,
                letterSpacing: "-0.005em",
              }}
            >
              LOI 체결
            </div>
            <div
              className="mt-0.5 leading-relaxed"
              style={{ fontSize: 11, color: M.textSub }}
            >
              매도자 승인 후, 채권 정보 세부 자료는 금융기관 대면 미팅에서 검토할 수 있습니다.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1 transition-opacity hover:opacity-90 flex-shrink-0"
            style={{
              padding: "6px 10px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: M.ink,
              background: M.paper,
              border: `1px solid ${M.borderStrong}`,
              borderTop: `2px solid ${M.electric}`,
            }}
          >
            <span style={{ color: M.ink }}>열기</span>
            <ArrowRight size={11} style={{ color: M.ink }} />
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
   ───────────────────────────────────────────────────────────── */

interface DDItem {
  key: string
  label: string
  done: boolean
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
      className="p-4 scroll-mt-24"
      style={{
        background: M.paperTint,
        border: `1px dashed ${M.borderStrong}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="inline-flex items-center gap-2">
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: M.ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: "-0.005em",
            }}
          >
            실사 체크리스트
          </span>
          <span
            className="inline-flex items-center"
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 6px",
              background: M.paper,
              color: M.electricDark,
              border: `1px solid ${M.electric}`,
              letterSpacing: "0.05em",
            }}
          >
            L3
          </span>
        </div>
        <div className="text-right">
          <div
            className="tabular-nums"
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: M.textMuted,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            실사 완료율
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: M.electric,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {doneTotal}/{totalItems} 완료 · {pct}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full overflow-hidden mb-3"
        style={{ height: 4, background: "rgba(10,22,40,0.06)" }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: M.electric,
          }}
        />
      </div>

      {/* Quick AI links */}
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <Link
          href="/analysis/copilot"
          className="group inline-flex items-center justify-between px-2.5 py-2 transition-opacity hover:opacity-90"
          style={{
            background: M.paper,
            border: `1px solid ${M.borderStrong}`,
            borderTop: `2px solid ${M.electric}`,
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: M.electric }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: M.ink,
                letterSpacing: "0.02em",
              }}
            >
              AI 컨설턴트에게 묻기
            </span>
          </span>
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: M.ink }}
          />
        </Link>
        <Link
          href="/analysis/simulator"
          className="group inline-flex items-center justify-between px-2.5 py-2 transition-opacity hover:opacity-90"
          style={{
            background: M.paper,
            border: `1px solid ${M.borderStrong}`,
            borderTop: `2px solid ${M.positive}`,
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" style={{ color: M.positive }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: M.ink,
                letterSpacing: "0.02em",
              }}
            >
              경매 수익률 분석기
            </span>
          </span>
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: M.ink }}
          />
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
                  <CatIcon className="w-3.5 h-3.5" style={{ color: M.electric }} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: M.ink,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {cat.label}
                  </span>
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: M.textMuted,
                    letterSpacing: "0.04em",
                  }}
                >
                  {catDone}/{cat.items.length}
                </span>
              </div>
              <ul className="space-y-1">
                {cat.items.map((it) => (
                  <li key={it.key}>
                    <div
                      className="w-full inline-flex items-center gap-2 transition-colors hover:bg-[rgba(10,22,40,0.03)]"
                      style={{ padding: "5px 8px" }}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(cat.key, it.key)}
                        className="inline-flex items-center gap-2 flex-1 text-left"
                        aria-label={`${it.label} ${it.done ? "완료 취소" : "완료 표시"}`}
                      >
                        <span
                          className="inline-flex items-center justify-center shrink-0"
                          style={{
                            width: 16,
                            height: 16,
                            background: it.done ? M.positive : M.paper,
                            border: it.done
                              ? `1px solid ${M.positive}`
                              : `1px solid ${M.borderStrong}`,
                            color: M.paper,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                          aria-hidden
                        >
                          {it.done ? "✓" : ""}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: it.done ? M.textMuted : M.ink,
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
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 shrink-0 transition-opacity hover:opacity-80"
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: M.electricDark,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            상세 <ChevronRight className="w-3 h-3" style={{ color: M.electricDark }} />
                          </a>
                        ) : (
                          <Link
                            href={it.detail}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 shrink-0 transition-opacity hover:opacity-80"
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: M.electricDark,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            상세 <ChevronRight className="w-3 h-3" style={{ color: M.electricDark }} />
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
        className="mt-3 pt-3 leading-relaxed"
        style={{
          fontSize: 10.5,
          color: M.textMuted,
          borderTop: `1px solid ${M.border}`,
          letterSpacing: "-0.005em",
        }}
      >
        체크리스트는 L3 (LOI 제출 후) 매도자 승인과 함께 자동 생성됩니다. 각 항목의 &quot;상세&quot;를 눌러 해당 섹션·도구로 이동하거나, AI 컨설턴트에게 보완 질문을 요청하세요.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   L4 에스크로 결제 패널
   ───────────────────────────────────────────────────────────── */
function EscrowPaymentPanel({
  askingPrice,
  escrowConfirmed,
}: {
  askingPrice: number
  escrowConfirmed?: boolean
}) {
  // 에스크로 보증금: 매입가의 10%
  const deposit = Math.round(askingPrice * 0.10)
  // 매수 수수료: NPL 1.5% + 우선협상권 0.3% = 1.8%
  const buyerFee = Math.round(askingPrice * 0.018)
  const total = deposit + buyerFee

  return (
    <PanelShell
      title="에스크로 결제"
      subtitle="매입가 10% 보증금 + 매수 수수료를 에스크로 계좌로 납부합니다"
      icon={<Wallet size={14} />}
    >
      <div id="escrow" className="space-y-4 scroll-mt-24">
        {/* 납입완료 뱃지 */}
        {escrowConfirmed && (
          <div
            className="p-4 flex items-center gap-3"
            style={{
              background: M.positiveBg,
              border: `1px solid ${M.positiveBorder}`,
              borderTop: `2px solid ${M.positive}`,
            }}
          >
            <CheckCircle2 size={22} style={{ color: M.positive, flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: M.positive,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                에스크로 결제 납입완료
              </div>
              <div
                className="mt-0.5"
                style={{ fontSize: 11, color: M.textSub, fontWeight: 600 }}
              >
                관리자 납부 확인 완료 · 현장 계약 단계로 진행됩니다.
              </div>
            </div>
          </div>
        )}

        {/* 결제 금액 상세 */}
        <div
          className="p-4"
          style={{
            background: M.paperTint,
            border: `1px solid ${M.border}`,
            borderTop: `2px solid ${M.electric}`,
          }}
        >
          <div
            className="mb-1"
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: M.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            납부 총액
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: M.ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: "-0.015em",
            }}
          >
            {formatKRW(total)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ReceiptRow label="매입가" value={formatKRW(askingPrice)} />
          <ReceiptRow label="보증금 (매입가 × 10%)" value={formatKRW(deposit)} />
          <ReceiptRow label="매수 수수료 (1.8%)" value={formatKRW(buyerFee)} />
        </div>

        {/* 에스크로 계좌 */}
        <div
          className="p-3.5"
          style={{
            background: M.ink,
            border: `1px solid ${M.ink}`,
            borderTop: `2px solid ${M.electric}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={13} style={{ color: M.paper }} />
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: M.paper,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              에스크로 계좌 (KB국민은행)
            </div>
          </div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: 16,
              color: M.paper,
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            301-9999-****-23
          </div>
          <div
            className="mt-1"
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 500,
            }}
          >
            예금주: KB에스크로서비스(주) · 가상계좌 자동 발급
          </div>
        </div>

        <div
          className="p-3 flex items-center gap-2"
          style={{
            background: M.paperTint,
            border: `1px solid ${M.border}`,
            fontSize: 11,
            color: M.textSub,
            lineHeight: 1.5,
          }}
        >
          <ShieldCheck size={12} style={{ color: M.electric, flexShrink: 0 }} />
          보증금은 현장 계약 체결 후 잔금(90%) 납부 시 충당됩니다. 계약 불발 시 귀책 여부에 따라 몰취될 수 있습니다.
        </div>
      </div>
    </PanelShell>
  )
}

/* ─────────────────────────────────────────────────────────────
   L5 현장 계약 패널
   ───────────────────────────────────────────────────────────── */
function ContractFinalPanel({
  askingPrice,
  assetTitle,
  contractConfirmed,
  onDownloadReceipt,
}: {
  askingPrice: number
  assetTitle: string
  contractConfirmed?: boolean
  onDownloadReceipt?: () => void
}) {
  const buyerFee = Math.round(askingPrice * 0.018)

  return (
    <PanelShell
      title="현장 계약"
      subtitle={`${assetTitle} — 현장에서 최종 계약서에 서명합니다`}
      icon={<PenLine size={14} />}
    >
      <div id="contract-final" className="space-y-4 scroll-mt-24">
        {/* 계약완료 뱃지 */}
        {contractConfirmed ? (
          <div
            className="p-4 flex items-center gap-3"
            style={{
              background: M.positiveBg,
              border: `1px solid ${M.positiveBorder}`,
              borderTop: `2px solid ${M.positive}`,
            }}
          >
            <CheckCircle2 size={22} style={{ color: M.positive, flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: M.positive,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                계약 완료
              </div>
              <div
                className="mt-0.5"
                style={{ fontSize: 11, color: M.textSub, fontWeight: 600 }}
              >
                관리자 계약 완료 확인 · 채권양도 통지 및 등기 이전 절차가 진행됩니다.
              </div>
            </div>
          </div>
        ) : (
          <div
            className="p-4 flex items-center gap-3"
            style={{
              background: M.paperTint,
              border: `1px solid ${M.border}`,
              borderTop: `2px solid ${M.electric}`,
            }}
          >
            <Clock size={20} style={{ color: M.electric, flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: M.ink,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                현장 계약 진행 대기 중
              </div>
              <div
                className="mt-0.5"
                style={{ fontSize: 11, color: M.textSub, fontWeight: 600 }}
              >
                매도자·매수자 대면 서명 후 관리자가 확인하면 계약 완료가 표시됩니다.
              </div>
            </div>
          </div>
        )}

        {/* 거래 요약 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReceiptRow label="매입가 (최종)" value={formatKRW(askingPrice)} />
          <ReceiptRow label="매수 수수료 (1.8%)" value={formatKRW(buyerFee)} />
        </div>

        {contractConfirmed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                onDownloadReceipt?.()
                toast.success("계약서 PDF 다운로드 시작", { duration: 1800 })
              }}
              className="group p-4 text-left transition-opacity hover:opacity-90"
              style={{
                background: M.paper,
                border: `1px solid ${M.borderStrong}`,
                borderTop: `2px solid ${M.positive}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: M.ink,
                      fontFamily: 'Georgia, "Times New Roman", serif',
                    }}
                  >
                    <Download size={14} style={{ color: M.positive }} />
                    계약서 PDF
                  </div>
                  <div
                    className="mt-1"
                    style={{ fontSize: 11, color: M.textSub, fontWeight: 600 }}
                  >
                    서명본 · 세금계산서 포함
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: M.ink }} className="opacity-60 group-hover:opacity-100" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => toast.info("거래 완료 보고서를 준비하고 있습니다.", { duration: 1800 })}
              className="group p-4 text-left transition-opacity hover:opacity-90"
              style={{
                background: M.paper,
                border: `1px solid ${M.borderStrong}`,
                borderTop: `2px solid ${M.electric}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: M.ink,
                      fontFamily: 'Georgia, "Times New Roman", serif',
                    }}
                  >
                    <FileText size={14} style={{ color: M.electric }} />
                    거래 완료 보고서
                  </div>
                  <div
                    className="mt-1"
                    style={{ fontSize: 11, color: M.textSub, fontWeight: 600 }}
                  >
                    포트폴리오 반영 · 리스크 이력
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: M.ink }} className="opacity-60 group-hover:opacity-100" />
              </div>
            </button>
          </div>
        )}

        <div
          className="p-3 flex items-center gap-2"
          style={{
            background: M.paperTint,
            border: `1px solid ${M.border}`,
            fontSize: 11,
            color: M.textSub,
            lineHeight: 1.5,
          }}
        >
          <ShieldCheck size={12} style={{ color: M.positive, flexShrink: 0 }} />
          현장 계약 완료 후 채권양도 통지·등기 이전이 진행됩니다. 모든 기록은 7년간 보관됩니다.
        </div>
      </div>
    </PanelShell>
  )
}

function ReceiptRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div
      className="p-3"
      style={{
        background: M.paperTint,
        border: `1px solid ${M.border}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: M.textMuted,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="tabular-nums mt-1"
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: dim ? M.textMuted : M.ink,
          fontFamily: 'Georgia, "Times New Roman", serif',
          letterSpacing: "-0.01em",
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
  escrowConfirmed,
  contractConfirmed,
  onOpenDetails,
  onSubmitOffer,
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
      <EscrowPaymentPanel
        askingPrice={askingPrice}
        escrowConfirmed={escrowConfirmed}
      />
    )
  }
  if (tier === "L5") {
    return (
      <ContractFinalPanel
        askingPrice={askingPrice}
        assetTitle={assetTitle}
        contractConfirmed={contractConfirmed}
        onDownloadReceipt={onDownloadReceipt}
      />
    )
  }
  return null
}
