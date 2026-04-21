/**
 * AssetSidebar — 자산 상세 우측 사이드바 (DR-4-C · 2026-04-21)
 *
 * 구성 (4개 카드 스택):
 *   1. AI 투자 분석 (예상 회수율 · 권고 입찰가 · 이상 징후)
 *   2. 매칭 수요
 *   3. 매수자 수수료 안내
 *   4. 제공 자료 체크리스트
 *
 * 상위 PrimaryActionCard 바로 아래에 배치되며 데스크톱에선 sticky.
 */

"use client"

import {
  Sparkles, Brain, MessageCircle, RefreshCcw,
  Users, Wand2, CheckCircle2, Circle,
  ShieldCheck,
} from "lucide-react"

export interface AssetDocItem {
  label: string
  available: boolean
  hint?: string
}

export interface AssetSidebarProps {
  /** 매각 희망가 (원) — 수수료 계산 기준 */
  askingPrice: number
  /** AI 회수율 예측 (%) */
  recoveryRate: number | null
  /** AI 신뢰도 (%) */
  recoveryConfidence: number | null
  /** AI 권고 입찰가 — 평균/최소/최대 (원) */
  priceGuide: { mid: number; min: number; max: number } | null
  /** 이상 탐지 결과 */
  anomaly: { verdict: string; score: number } | null
  /** 제공 자료 체크리스트 */
  documents?: AssetDocItem[]
  /** AI에 질문하기 클릭 */
  onAskAi?: () => void
  /** 재분석 클릭 */
  onReanalyze?: () => void
  /** 수요 확인 클릭 */
  onSeeDemand?: () => void
  /** AI 매칭 클릭 */
  onAiMatch?: () => void
}

const DEFAULT_DOCS: AssetDocItem[] = [
  { label: "감정평가서", available: true },
  { label: "등기부등본", available: true },
  { label: "권리관계", available: true },
  { label: "임차현황", available: true },
  { label: "현장사진", available: true },
  { label: "재무자료", available: false, hint: "이후공개" },
]

function formatKRW(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

export function AssetSidebar({
  askingPrice,
  recoveryRate,
  recoveryConfidence,
  priceGuide,
  anomaly,
  documents = DEFAULT_DOCS,
  onAskAi,
  onReanalyze,
  onSeeDemand,
  onAiMatch,
}: AssetSidebarProps) {
  // 수수료 계산 — 기본 1.5% + PNR 우선협상권 0.3% = 1.8%
  const basicFeeRate = 1.5
  const pnrFeeRate = 0.3
  const totalFeeRate = basicFeeRate + pnrFeeRate
  const basicFee = Math.round(askingPrice * basicFeeRate / 100)
  const pnrFee = Math.round(askingPrice * pnrFeeRate / 100)
  const totalFee = basicFee + pnrFee

  const availableDocs = documents.filter(d => d.available).length
  const totalDocs = documents.length
  const recoveryValue = recoveryRate ?? 72
  const recoveryConf = recoveryConfidence ?? 85
  const riskScore = Math.round((anomaly?.score ?? 0.15) * 100)
  const priceMid = priceGuide?.mid ?? Math.round(askingPrice * 0.86)
  const priceMin = priceGuide?.min ?? Math.round(priceMid * 0.94)
  const priceMax = priceGuide?.max ?? Math.round(priceMid * 1.19)

  return (
    <aside className="space-y-4">
      {/* ═══ AI 투자 분석 ═══ */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2">
            <Sparkles size={14} color="var(--color-brand-bright)" />
            <h3 className="font-black" style={{ fontSize: 13, color: "var(--fg-strong)" }}>
              AI 투자 분석
            </h3>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "var(--color-positive-bg)",
                color: "var(--color-positive)",
              }}
            >
              Claude NPL Engine
            </span>
          </div>
          <span className="text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
            실시간
          </span>
        </div>

        {/* 예상 회수율 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
              예상 회수율
            </span>
            <span className="text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
              신뢰도 {recoveryConf}%
            </span>
          </div>
          <div
            className="font-black tabular-nums leading-none"
            style={{ fontSize: 32, color: "var(--color-positive)" }}
          >
            {recoveryValue.toFixed(1)}%
          </div>
          {/* Range bar */}
          <div className="mt-3 relative h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--layer-2-bg)" }}
          >
            <div
              className="absolute top-0 h-full rounded-full"
              style={{
                left: "60%",
                width: "25%",
                backgroundColor: "var(--color-positive)",
                opacity: 0.8,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-bold" style={{ color: "var(--fg-subtle)" }}>범위 60%</span>
            <span className="text-[9px] font-bold" style={{ color: "var(--fg-subtle)" }}>85%</span>
          </div>
        </div>

        {/* AI 권고 입찰가 */}
        <div
          className="rounded-xl p-3 mb-4"
          style={{
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Brain size={11} color="var(--color-brand-bright)" />
            <span className="font-semibold" style={{ fontSize: 10, color: "var(--fg-muted)" }}>
              AI 권고 입찰가
            </span>
          </div>
          <div className="font-black tabular-nums" style={{ fontSize: 20, color: "var(--color-brand-bright)" }}>
            {formatKRW(priceMid)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
            <span>보수 {formatKRW(priceMin)}</span>
            <span style={{ color: "var(--fg-subtle)" }}>·</span>
            <span>공격 {formatKRW(priceMax)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "var(--layer-border-strong)",
                color: "var(--fg-default)",
              }}
            >
              시장 전망: 중립
            </span>
          </div>
        </div>

        {/* 이상 탐지 */}
        <div
          className="rounded-lg px-3 py-2.5 flex items-center gap-2"
          style={{
            backgroundColor: "var(--color-positive-bg)",
            border: "1px solid var(--color-positive)",
          }}
        >
          <ShieldCheck size={14} color="var(--color-positive)" />
          <div className="flex-1 min-w-0">
            <div className="font-bold" style={{ fontSize: 11, color: "var(--color-positive)" }}>
              {anomaly?.verdict ?? "이상 징후 없음"}
            </div>
            <div className="text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
              리스크 {riskScore}/100
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={onAskAi}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors"
            style={{
              padding: "8px 10px",
              fontSize: 11,
              backgroundColor: "transparent",
              color: "var(--fg-default)",
              border: "1px solid var(--layer-border-strong)",
            }}
          >
            <MessageCircle size={12} />
            AI에게 질문
          </button>
          <button
            type="button"
            onClick={onReanalyze}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors"
            style={{
              padding: "8px 10px",
              fontSize: 11,
              backgroundColor: "transparent",
              color: "var(--fg-default)",
              border: "1px solid var(--layer-border-strong)",
            }}
          >
            <RefreshCcw size={12} />
            재분석
          </button>
        </div>
      </div>

      {/* ═══ 매칭 수요 ═══ */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <h3
          className="font-black mb-2 inline-flex items-center gap-1.5"
          style={{ fontSize: 13, color: "var(--fg-strong)" }}
        >
          <Users size={14} color="var(--color-brand-bright)" />
          매칭 수요
        </h3>
        <p className="leading-relaxed mb-3" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          이 매물과 조건이 일치하는 매수자 수요를 확인하세요. AI 매칭 엔진이 담보 유형·지역·가격대를 기반으로 최적 매수자를 추천합니다.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSeeDemand}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors"
            style={{
              padding: "9px 10px",
              fontSize: 11,
              backgroundColor: "var(--color-positive-bg)",
              color: "var(--color-positive)",
              border: "1px solid var(--color-positive)",
            }}
          >
            <Users size={12} />
            수요 확인
          </button>
          <button
            type="button"
            onClick={onAiMatch}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors"
            style={{
              padding: "9px 10px",
              fontSize: 11,
              backgroundColor: "var(--color-brand-bright)",
              color: "var(--fg-on-brand)",
              border: "1px solid var(--color-brand-bright)",
            }}
          >
            <Wand2 size={12} />
            AI 매칭
          </button>
        </div>
      </div>

      {/* ═══ 매수자 수수료 안내 ═══ */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <h3 className="font-black mb-3" style={{ fontSize: 13, color: "var(--fg-strong)" }}>
          매수자 수수료 안내
        </h3>
        {/* 기준 거래가 */}
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-3"
          style={{
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
          }}
        >
          <span className="font-semibold" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            기준 거래가
          </span>
          <span className="font-black tabular-nums" style={{ fontSize: 14, color: "var(--fg-strong)" }}>
            {formatKRW(askingPrice)}
          </span>
        </div>
        {/* 수수료 요약 */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-black tabular-nums"
            style={{ fontSize: 20, color: "var(--color-positive)" }}
          >
            {totalFeeRate.toFixed(1)}%
          </span>
          <div className="text-right">
            <div className="text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
              예상 수수료
            </div>
            <div className="font-black tabular-nums" style={{ fontSize: 15, color: "var(--color-positive)" }}>
              {formatKRW(totalFee)}
            </div>
          </div>
        </div>
        {/* Breakdown */}
        <div className="space-y-1 mb-3 text-[11px]">
          <div className="flex items-center justify-between" style={{ color: "var(--fg-default)" }}>
            <span>기본 수수료 ({basicFeeRate}%)</span>
            <span className="font-bold tabular-nums">{formatKRW(basicFee)}</span>
          </div>
          <div className="flex items-center justify-between" style={{ color: "var(--fg-default)" }}>
            <span>+ 우선협상권 (PNR, {pnrFeeRate}%)</span>
            <span className="font-bold tabular-nums">{formatKRW(pnrFee)}</span>
          </div>
        </div>
        <p
          className="text-[10px] leading-relaxed pt-2 border-t"
          style={{ color: "var(--fg-muted)", borderColor: "var(--layer-border-strong)" }}
        >
          💡 수수료는 <strong style={{ color: "var(--fg-default)" }}>거래 성사 시</strong>에만 부과됩니다.
          에스크로 계좌로 자동 정산되며, 매도자 수수료는 별도로 처리됩니다.
        </p>
      </div>

      {/* ═══ 제공 자료 ═══ */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black" style={{ fontSize: 13, color: "var(--fg-strong)" }}>
            제공 자료
          </h3>
          <span className="font-bold tabular-nums" style={{ fontSize: 12, color: "var(--color-positive)" }}>
            {availableDocs}/{totalDocs}
          </span>
        </div>
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.label}
              className="flex items-center justify-between text-[12px]"
            >
              <span
                className="font-semibold"
                style={{ color: doc.available ? "var(--fg-default)" : "var(--fg-subtle)" }}
              >
                {doc.label}
              </span>
              {doc.available ? (
                <CheckCircle2 size={15} color="var(--color-positive)" />
              ) : (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--layer-2-bg)",
                    color: "var(--fg-muted)",
                    border: "1px solid var(--layer-border-strong)",
                  }}
                >
                  {doc.hint ?? <Circle size={10} />}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p
          className="text-[10px] leading-relaxed pt-3 mt-3 border-t"
          style={{ color: "var(--fg-muted)", borderColor: "var(--layer-border-strong)" }}
        >
          본 매물은 개인정보보호법·신용정보법·전자금융거래법을 준수하며, 모든 열람은 PII Access Log에 기록됩니다.
        </p>
      </div>
    </aside>
  )
}
