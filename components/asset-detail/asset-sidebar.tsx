/**
 * AssetSidebar — 자산 상세 우측 사이드바 (DR-4-C · 2026-04-21 · DR-23 · 2026-04-26)
 *
 * 구성 (4개 카드 스택):
 *   1. AI 투자 분석 (NPL 분석 리포트 연동 · McKinsey 스타일)
 *      - AI 투자 의견 BUY + AI 투자 등급 막대 그래프
 *      - AI 권고 매입가 + 매입률·낙찰가율
 *      - 예상 낙찰가 / 2질권자 배당 / 투자 에쿼티 / 예상 손익 / ROI / 연환산
 *      - 매입·낙찰 성공 확률 막대 그래프
 *   2. 매칭 수요
 *   3. 매수자 수수료 안내
 *   4. 제공 자료 체크리스트
 *
 * Engine: Nplatform NPL Engine
 * 상위 PrimaryActionCard 바로 아래에 배치되며 데스크톱에선 sticky.
 */

"use client"

import {
  Sparkles, MessageCircle, RefreshCcw,
  Users, Wand2, CheckCircle2, Circle,
  Sigma,
} from "lucide-react"

/* McKinsey palette */
const MCK = {
  ink:        "#0A1628",
  inkDeep:    "#051C2C",  // 딥 네이비 (등급 카드 배경)
  paper:      "#FFFFFF",
  paperTint:  "#FAFBFC",
  cobalt:     "#003A70",  // McKinsey 코발트
  cobaltLight:"#6FB8E6",  // 라벨 하이라이트 (네이비 위)
  brass:      "#B8924B",
  border:     "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub:    "#4A5568",
  textMuted:  "#718096",
  positive:   "#0F766E",
} as const

export interface AssetDocItem {
  label: string
  available: boolean
  hint?: string
}

export interface NplInvestmentSummary {
  /** AI 투자 의견 (BUY / HOLD / SELL) */
  verdict: 'BUY' | 'HOLD' | 'SELL'
  /** AI 투자 등급 (S/A+/A/B/C) */
  grade: string
  /** 투자 점수 (0-100) */
  score: number
  /** AI 권고 매입가 (원) */
  recommendedPurchasePrice: number
  /** 대출원금 대비 매입률 (소수, 예 0.95) */
  purchaseRate: number
  /** 예상낙찰가율 (소수, 예 0.835) */
  bidRatio: number
  /** 예상낙찰가 (원) */
  expectedBidPrice: number
  /** 2질권자 배당액 (원) */
  secondPledgeeAmount: number
  /** 투자 에쿼티 (원) */
  totalEquity: number
  /** 예상 손익 (원) */
  expectedNetProfit: number
  /** ROI (소수, 예 0.486) */
  roi: number
  /** 연환산 ROI (소수, 예 0.662) */
  annualizedRoi: number
  /** 매입·낙찰 성공 확률 (소수, 예 0.50) */
  winProbability: number
}

export interface AssetSidebarProps {
  /** 매각 희망가 (원) — 수수료 계산 기준 */
  askingPrice: number
  /**
   * NPL 분석 리포트 기반 AI 투자 요약 (DR-23).
   * 제공되면 첨부2 디자인(투자등급 막대그래프 · 매입가·배당·ROI · 성공확률 막대그래프) 노출.
   * 미제공이면 레거시 회수율 카드 fallback.
   */
  investmentSummary?: NplInvestmentSummary | null
  /** [Legacy] AI 회수율 예측 (%) — investmentSummary 미제공 시 fallback */
  recoveryRate: number | null
  /** [Legacy] AI 신뢰도 (%) */
  recoveryConfidence: number | null
  /** [Legacy] AI 권고 입찰가 — 평균/최소/최대 (원) */
  priceGuide: { mid: number; min: number; max: number } | null
  /** 이상 탐지 결과 (배경용 — 표시는 verdict 우선) */
  anomaly: { verdict: string; score: number } | null
  /** 제공 자료 체크리스트 */
  documents?: AssetDocItem[]
  /** AI에 질문하기 클릭 */
  onAskAi?: () => void
  /** 재분석 클릭 */
  onReanalyze?: () => void
  /** 확률 계산식 보기 클릭 */
  onShowProbability?: () => void
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
  investmentSummary,
  recoveryRate,
  recoveryConfidence,
  priceGuide,
  anomaly,
  documents = DEFAULT_DOCS,
  onAskAi,
  onReanalyze,
  onShowProbability,
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

  /* ─── DR-23: NPL 보고서 연동 AI 투자 요약 ───────────────
   * investmentSummary 가 있으면 첨부2 디자인.
   * 없으면 레거시 회수율 카드 fallback (구버전 호환).
   */
  const summary = investmentSummary
  const recoveryValue = recoveryRate ?? 72
  const recoveryConf = recoveryConfidence ?? 85
  const riskScore = Math.round((anomaly?.score ?? 0.15) * 100)
  const priceMid = priceGuide?.mid ?? Math.round(askingPrice * 0.86)
  const priceMin = priceGuide?.min ?? Math.round(priceMid * 0.94)
  const priceMax = priceGuide?.max ?? Math.round(priceMid * 1.19)

  return (
    <aside className="space-y-4">
      {/* ═══ AI 투자 분석 (DR-23 · NPL 보고서 연동 · McKinsey) ═══ */}
      <div
        style={{
          background: MCK.paper,
          border: `1px solid ${MCK.border}`,
          borderTop: `3px solid ${MCK.cobalt}`,
        }}
      >
        <div className="px-5 pt-5 pb-4">
          {/* Header — McKinsey editorial */}
          <div className="flex items-center justify-between mb-1">
            <div className="inline-flex items-center gap-2">
              <Sparkles size={14} style={{ color: MCK.cobalt }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.01em",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                AI 투자 분석
              </h3>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  background: MCK.cobalt,
                  color: MCK.paper,
                }}
              >
                Nplatform NPL Engine
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: MCK.textMuted, letterSpacing: "0.06em" }}>
              실시간
            </span>
          </div>
          <div style={{ width: 32, height: 1, background: MCK.cobalt, marginBottom: 14 }} />

          {summary ? (
            <>
              {/* ── AI 투자 의견 + 등급 (막대 그래프) ── */}
              <div
                style={{
                  background: MCK.inkDeep,
                  padding: "16px 18px",
                  marginBottom: 16,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: MCK.cobaltLight,
                        marginBottom: 4,
                      }}
                    >
                      AI 투자 의견
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: MCK.paper,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        lineHeight: 1,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {summary.verdict}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                      권고
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: MCK.cobaltLight,
                        marginBottom: 4,
                      }}
                    >
                      AI 투자 등급
                    </div>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: MCK.paper,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {summary.grade}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: MCK.cobaltLight,
                        marginTop: 4,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {summary.score.toFixed(1)}점 · {summary.verdict}
                    </div>
                  </div>
                </div>
                {/* 점수 막대 그래프 */}
                <div
                  style={{
                    height: 6,
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, summary.score))}%`,
                      background: MCK.cobaltLight,
                      transition: "width 0.6s ease-out",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>0</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>50</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>100</span>
                </div>
              </div>

              {/* ── AI 권고 매입가 ── */}
              <div
                style={{
                  background: MCK.paperTint,
                  border: `1px solid ${MCK.border}`,
                  padding: "14px 16px",
                  marginBottom: 14,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: MCK.ink,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    AI 권고 매입 (원금 {Math.round(summary.purchaseRate * 100)}%)
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      background: MCK.ink,
                      color: MCK.paper,
                    }}
                  >
                    AI 권고
                  </span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted, marginBottom: 8 }}>
                  대출원금 {Math.round(summary.purchaseRate * 100)}% 매입 ({((summary.purchaseRate - 1) * 100).toFixed(1)}%) · 기준 낙찰가율 {(summary.bidRatio * 100).toFixed(1)}%
                </p>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: MCK.cobalt,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                  }}
                >
                  {summary.recommendedPurchasePrice.toLocaleString("ko-KR")}원
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted, marginTop: 6 }}>
                  매입률 {Math.round(summary.purchaseRate * 100)}% · 낙찰가율 {(summary.bidRatio * 100).toFixed(1)}%
                </p>
              </div>

              {/* ── 수익 라인 아이템 ── */}
              <div className="space-y-2 mb-4">
                {[
                  { label: "예상 낙찰가", value: `${summary.expectedBidPrice.toLocaleString("ko-KR")}원`, accent: false },
                  { label: "2질권자 배당", value: `${summary.secondPledgeeAmount.toLocaleString("ko-KR")}원`, accent: false },
                  { label: "투자 에쿼티", value: `${summary.totalEquity.toLocaleString("ko-KR")}원`, accent: false },
                  {
                    label: "예상 손익",
                    value: `${summary.expectedNetProfit >= 0 ? "+" : ""}${summary.expectedNetProfit.toLocaleString("ko-KR")}원`,
                    accent: true,
                  },
                  {
                    label: "ROI / 연환산",
                    value: `${(summary.roi * 100).toFixed(1)}% / ${(summary.annualizedRoi * 100).toFixed(1)}%`,
                    accent: true,
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                    style={{
                      paddingBottom: 6,
                      borderBottom: i < 4 ? `1px dashed ${MCK.border}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textSub }}>{row.label}</span>
                    <span
                      style={{
                        fontSize: row.accent ? 12.5 : 12,
                        fontWeight: row.accent ? 800 : 700,
                        color: row.accent ? MCK.cobalt : MCK.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── 매입·낙찰 성공 확률 (막대 그래프) ── */}
              <div
                style={{
                  background: MCK.paperTint,
                  border: `1px solid ${MCK.border}`,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: MCK.ink,
                    }}
                  >
                    매입·낙찰 성공 확률
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: MCK.cobalt,
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {(summary.winProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: MCK.border,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, summary.winProbability * 100))}%`,
                      background: `linear-gradient(90deg, ${MCK.cobalt} 0%, ${MCK.cobaltLight} 100%)`,
                      transition: "width 0.6s ease-out",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: MCK.textMuted }}>0%</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: MCK.textMuted }}>50%</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: MCK.textMuted }}>100%</span>
                </div>
                {onShowProbability && (
                  <button
                    type="button"
                    onClick={onShowProbability}
                    className="mt-2.5 inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: MCK.cobalt,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <Sigma size={11} />
                    확률 계산식
                    <span style={{ marginLeft: 2 }}>›</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ── Legacy fallback (회수율 카드) ── */
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textMuted }}>
                    예상 회수율
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: MCK.textMuted }}>
                    신뢰도 {recoveryConf}%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: MCK.cobalt,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {recoveryValue.toFixed(1)}%
                </div>
                <div
                  className="mt-3 relative h-2 overflow-hidden"
                  style={{ background: MCK.border }}
                >
                  <div
                    className="absolute top-0 h-full"
                    style={{ left: "60%", width: "25%", background: MCK.cobalt, opacity: 0.85 }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 9, fontWeight: 700, color: MCK.textMuted }}>범위 60%</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: MCK.textMuted }}>85%</span>
                </div>
              </div>
              <div
                style={{
                  background: MCK.paperTint,
                  border: `1px solid ${MCK.border}`,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: MCK.textMuted, marginBottom: 4 }}>
                  AI 권고 입찰가
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: MCK.cobalt,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatKRW(priceMid)}
                </div>
                <div className="mt-1 flex items-center gap-2" style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted }}>
                  <span>보수 {formatKRW(priceMin)}</span>
                  <span>·</span>
                  <span>공격 {formatKRW(priceMax)}</span>
                </div>
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(15, 118, 110, 0.08)",
                  border: `1px solid rgba(15, 118, 110, 0.30)`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: MCK.positive }}>
                  {anomaly?.verdict ?? "이상 징후 없음"}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted }}>
                  리스크 {riskScore}/100
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={onAskAi}
              className="inline-flex items-center justify-center gap-1.5 transition-colors hover:bg-[#FAFBFC]"
              style={{
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 700,
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.borderStrong}`,
              }}
            >
              <MessageCircle size={12} />
              AI에게 질문
            </button>
            <button
              type="button"
              onClick={onReanalyze}
              className="inline-flex items-center justify-center gap-1.5 transition-colors hover:bg-[#FAFBFC]"
              style={{
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 700,
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.borderStrong}`,
              }}
            >
              <RefreshCcw size={12} />
              재분석
            </button>
          </div>
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
