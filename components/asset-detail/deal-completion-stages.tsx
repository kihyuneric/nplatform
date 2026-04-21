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
} from "lucide-react"
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
      style={{
        background: "linear-gradient(180deg, #0F1E35 0%, #122843 100%)",
        border: `1px solid ${accent === "gold"
          ? "rgba(245, 158, 11, 0.32)"
          : accent === "green"
          ? "rgba(16, 185, 129, 0.32)"
          : "rgba(46, 117, 182, 0.32)"}`,
        boxShadow: "0 8px 32px rgba(27, 58, 92, 0.20)",
        color: "var(--fg-on-brand)",
      }}
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
   실사 체크리스트 (DR-10) — LOI 체결 후 L3 에서 표시
   ───────────────────────────────────────────────────────────── */
function DueDiligenceChecklist() {
  const [items, setItems] = useState([
    { key: "reg",      label: "등기부등본 원본 확인", done: true },
    { key: "appraise", label: "감정평가서 재검토", done: true },
    { key: "tax",      label: "재산세·종합부동산세 납부 이력", done: false },
    { key: "rent",     label: "임대차 계약·보증금 현황 점검", done: false },
    { key: "physical", label: "현장 실사 (외관·관리 상태)", done: false },
    { key: "legal",    label: "법무법인 권리분석 의견서", done: false },
  ])

  const doneCnt = items.filter((i) => i.done).length
  const pct = Math.round((doneCnt / items.length) * 100)

  function toggle(k: string) {
    setItems((arr) => arr.map((i) => (i.key === k ? { ...i, done: !i.done } : i)))
  }

  return (
    <div
      id="dd-checklist"
      className="rounded-xl p-3.5 scroll-mt-24"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.14)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="inline-flex items-center gap-2">
          <span className="font-black" style={{ fontSize: 12 }}>실사 체크리스트</span>
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
        <span
          className="font-black tabular-nums"
          style={{ fontSize: 11, color: "var(--color-brand-bright)" }}
        >
          {doneCnt}/{items.length} · {pct}%
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden mb-2.5"
        style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, var(--color-brand-bright), var(--color-positive))",
          }}
        />
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => toggle(it.key)}
              className="w-full inline-flex items-center gap-2.5 text-left rounded-lg transition-colors hover:bg-white/5"
              style={{ padding: "6px 8px" }}
            >
              <span
                className="inline-flex items-center justify-center rounded"
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
                  color: it.done ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)",
                  textDecoration: it.done ? "line-through" : "none",
                }}
              >
                {it.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p
        className="mt-2 leading-relaxed"
        style={{ fontSize: 10, color: "rgba(255,255,255,0.48)" }}
      >
        체크리스트는 L3 (LOI 제출 후) 매도자 승인과 함께 자동 생성됩니다. 금융기관 대면 미팅에서 검토한 내용을 업데이트하세요.
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
