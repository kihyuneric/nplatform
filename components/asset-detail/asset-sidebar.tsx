/**
 * AssetSidebar ???먯궛 ?곸꽭 ?곗륫 ?ъ씠?쒕컮 (DR-4-C 쨌 2026-04-21 쨌 DR-23 쨌 2026-04-26)
 *
 * 援ъ꽦 (4媛?移대뱶 ?ㅽ깮):
 *   1. AI ?ъ옄 遺꾩꽍 (NPL 遺꾩꽍 由ы룷???곕룞 쨌 McKinsey ?ㅽ???
 *      - AI ?ъ옄 ?섍껄 BUY + AI ?ъ옄 ?깃툒 留됰? 洹몃옒?? *      - AI 沅뚭퀬 留ㅼ엯媛 + 留ㅼ엯瑜졖룸굺李곌??? *      - ?덉긽 ?숈같媛 / 2吏덇텒??諛곕떦 / ?ъ옄 ?먯옘??/ ?덉긽 ?먯씡 / ROI / ?고솚?? *      - 留ㅼ엯쨌?숈같 ?깃났 ?뺣쪧 留됰? 洹몃옒?? *   2. 留ㅼ묶 ?섏슂
 *   3. 留ㅼ닔???섏닔猷??덈궡
 *   4. ?쒓났 ?먮즺 泥댄겕由ъ뒪?? *
 * Engine: Nplatform NPL Engine
 * ?곸쐞 PrimaryActionCard 諛붾줈 ?꾨옒??諛곗튂?섎ŉ ?곗뒪?ы넲?먯꽑 sticky.
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
  inkDeep:    "#051C2C",  // ???ㅼ씠鍮?(?깃툒 移대뱶 諛곌꼍)
  paper:      "#FFFFFF",
  paperTint:  "#FAFBFC",
  cobalt:     "#003A70",  // McKinsey 肄붾컻??  cobaltLight:"#6FB8E6",  // ?쇰꺼 ?섏씠?쇱씠??(?ㅼ씠鍮???
  brass:      "#2251FF",
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
  /** AI ?ъ옄 ?섍껄 (BUY / HOLD / SELL) */
  verdict: 'BUY' | 'HOLD' | 'SELL'
  /** AI ?ъ옄 ?깃툒 (S/A+/A/B/C) */
  grade: string
  /** ?ъ옄 ?먯닔 (0-100) */
  score: number
  /** AI 沅뚭퀬 留ㅼ엯媛 (?? */
  recommendedPurchasePrice: number
  /** ?異쒖썝湲??鍮?留ㅼ엯瑜?(?뚯닔, ??0.95) */
  purchaseRate: number
  /** ?덉긽?숈같媛??(?뚯닔, ??0.835) */
  bidRatio: number
  /** ?덉긽?숈같媛 (?? */
  expectedBidPrice: number
  /** 2吏덇텒??諛곕떦??(?? */
  secondPledgeeAmount: number
  /** ?ъ옄 ?먯옘??(?? */
  totalEquity: number
  /** ?덉긽 ?먯씡 (?? */
  expectedNetProfit: number
  /** ROI (?뚯닔, ??0.486) */
  roi: number
  /** ?고솚??ROI (?뚯닔, ??0.662) */
  annualizedRoi: number
  /** 留ㅼ엯쨌?숈같 ?깃났 ?뺣쪧 (?뚯닔, ??0.50) */
  winProbability: number
}

export interface AssetSidebarProps {
  /** 留ㅺ컖 ?щ쭩媛 (?? ???섏닔猷?怨꾩궛 湲곗? */
  askingPrice: number
  /**
   * NPL 遺꾩꽍 由ы룷??湲곕컲 AI ?ъ옄 ?붿빟 (DR-23).
   * ?쒓났?섎㈃ 泥⑤?2 ?붿옄???ъ옄?깃툒 留됰?洹몃옒??쨌 留ㅼ엯媛쨌諛곕떦쨌ROI 쨌 ?깃났?뺣쪧 留됰?洹몃옒?? ?몄텧.
   * 誘몄젣怨듭씠硫??덇굅???뚯닔??移대뱶 fallback.
   */
  investmentSummary?: NplInvestmentSummary | null
  /** [Legacy] AI ?뚯닔???덉륫 (%) ??investmentSummary 誘몄젣怨???fallback */
  recoveryRate: number | null
  /** [Legacy] AI ?좊ː??(%) */
  recoveryConfidence: number | null
  /** [Legacy] AI 沅뚭퀬 ?낆같媛 ???됯퇏/理쒖냼/理쒕? (?? */
  priceGuide: { mid: number; min: number; max: number } | null
  /** ?댁긽 ?먯? 寃곌낵 (諛곌꼍?????쒖떆??verdict ?곗꽑) */
  anomaly: { verdict: string; score: number } | null
  /** ?쒓났 ?먮즺 泥댄겕由ъ뒪??*/
  documents?: AssetDocItem[]
  /** AI??吏덈Ц?섍린 ?대┃ */
  onAskAi?: () => void
  /** ?щ텇???대┃ */
  onReanalyze?: () => void
  /** ?뺣쪧 怨꾩궛??蹂닿린 ?대┃ */
  onShowProbability?: () => void
  /** ?섏슂 ?뺤씤 ?대┃ */
  onSeeDemand?: () => void
  /** AI 留ㅼ묶 ?대┃ */
  onAiMatch?: () => void
}

const DEFAULT_DOCS: AssetDocItem[] = [
  { label: "媛먯젙?됯???, available: true },
  { label: "?깃린遺?깅낯", available: true },
  { label: "沅뚮━愿怨?, available: true },
  { label: "?꾩감?꾪솴", available: true },
  { label: "?꾩옣?ъ쭊", available: true },
  { label: "?щТ?먮즺", available: false, hint: "?댄썑怨듦컻" },
]

function formatKRW(n: number | null | undefined): string {
  if (!n) return "??
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}??
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}留?
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
  // ?섏닔猷?怨꾩궛 ??湲곕낯 1.5% + PNR ?곗꽑?묒긽沅?0.3% = 1.8%
  const basicFeeRate = 1.5
  const pnrFeeRate = 0.3
  const totalFeeRate = basicFeeRate + pnrFeeRate
  const basicFee = Math.round(askingPrice * basicFeeRate / 100)
  const pnrFee = Math.round(askingPrice * pnrFeeRate / 100)
  const totalFee = basicFee + pnrFee

  const availableDocs = documents.filter(d => d.available).length
  const totalDocs = documents.length

  /* ??? DR-23: NPL 蹂닿퀬???곕룞 AI ?ъ옄 ?붿빟 ???????????????
   * investmentSummary 媛 ?덉쑝硫?泥⑤?2 ?붿옄??
   * ?놁쑝硫??덇굅???뚯닔??移대뱶 fallback (援щ쾭???명솚).
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
      {/* ?먥븧??AI ?ъ옄 遺꾩꽍 (DR-23 쨌 NPL 蹂닿퀬???곕룞 쨌 McKinsey) ?먥븧??*/}
      <div
        style={{
          background: MCK.paper,
          border: `1px solid ${MCK.border}`,
          borderTop: `3px solid ${MCK.cobalt}`,
        }}
      >
        <div className="px-5 pt-5 pb-4">
          {/* Header ??McKinsey editorial */}
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
                AI ?ъ옄 遺꾩꽍
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
              ?ㅼ떆媛?            </span>
          </div>
          <div style={{ width: 32, height: 1, background: MCK.cobalt, marginBottom: 14 }} />

          {summary ? (
            <>
              {/* ?? AI ?ъ옄 ?섍껄 + ?깃툒 (留됰? 洹몃옒?? ?? */}
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
                      AI ?ъ옄 ?섍껄
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
                      沅뚭퀬
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
                      AI ?ъ옄 ?깃툒
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
                      {summary.score.toFixed(1)}??쨌 {summary.verdict}
                    </div>
                  </div>
                </div>
                {/* ?먯닔 留됰? 洹몃옒??*/}
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

              {/* ?? AI 沅뚭퀬 留ㅼ엯媛 ?? */}
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
                    AI 沅뚭퀬 留ㅼ엯 (?먭툑 {Math.round(summary.purchaseRate * 100)}%)
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
                    AI 沅뚭퀬
                  </span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted, marginBottom: 8 }}>
                  ?異쒖썝湲?{Math.round(summary.purchaseRate * 100)}% 留ㅼ엯 ({((summary.purchaseRate - 1) * 100).toFixed(1)}%) 쨌 湲곗? ?숈같媛??{(summary.bidRatio * 100).toFixed(1)}%
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
                  {summary.recommendedPurchasePrice.toLocaleString("ko-KR")}??                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted, marginTop: 6 }}>
                  留ㅼ엯瑜?{Math.round(summary.purchaseRate * 100)}% 쨌 ?숈같媛??{(summary.bidRatio * 100).toFixed(1)}%
                </p>
              </div>

              {/* ?? ?섏씡 ?쇱씤 ?꾩씠???? */}
              <div className="space-y-2 mb-4">
                {[
                  { label: "?덉긽 ?숈같媛", value: `${summary.expectedBidPrice.toLocaleString("ko-KR")}??, accent: false },
                  { label: "2吏덇텒??諛곕떦", value: `${summary.secondPledgeeAmount.toLocaleString("ko-KR")}??, accent: false },
                  { label: "?ъ옄 ?먯옘??, value: `${summary.totalEquity.toLocaleString("ko-KR")}??, accent: false },
                  {
                    label: "?덉긽 ?먯씡",
                    value: `${summary.expectedNetProfit >= 0 ? "+" : ""}${summary.expectedNetProfit.toLocaleString("ko-KR")}??,
                    accent: true,
                  },
                  {
                    label: "ROI / ?고솚??,
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

              {/* ?? 留ㅼ엯쨌?숈같 ?깃났 ?뺣쪧 (留됰? 洹몃옒?? ?? */}
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
                    留ㅼ엯쨌?숈같 ?깃났 ?뺣쪧
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
                    ?뺣쪧 怨꾩궛??                    <span style={{ marginLeft: 2 }}>??/span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ?? Legacy fallback (?뚯닔??移대뱶) ?? */
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textMuted }}>
                    ?덉긽 ?뚯닔??                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: MCK.textMuted }}>
                    ?좊ː??{recoveryConf}%
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
                  <span style={{ fontSize: 9, fontWeight: 700, color: MCK.textMuted }}>踰붿쐞 60%</span>
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
                  AI 沅뚭퀬 ?낆같媛
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
                  <span>蹂댁닔 {formatKRW(priceMin)}</span>
                  <span>쨌</span>
                  <span>怨듦꺽 {formatKRW(priceMax)}</span>
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
                  {anomaly?.verdict ?? "?댁긽 吏뺥썑 ?놁쓬"}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: MCK.textMuted }}>
                  由ъ뒪??{riskScore}/100
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
              AI?먭쾶 吏덈Ц
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
              ?щ텇??            </button>
          </div>
        </div>
      </div>

      {/* ?먥븧??留ㅼ묶 ?섏슂 ?먥븧??*/}
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
          留ㅼ묶 ?섏슂
        </h3>
        <p className="leading-relaxed mb-3" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          ??留ㅻЪ怨?議곌굔???쇱튂?섎뒗 留ㅼ닔???섏슂瑜??뺤씤?섏꽭?? AI 留ㅼ묶 ?붿쭊???대낫 ?좏삎쨌吏??룰?寃⑸?瑜?湲곕컲?쇰줈 理쒖쟻 留ㅼ닔?먮? 異붿쿇?⑸땲??
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
            ?섏슂 ?뺤씤
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
            AI 留ㅼ묶
          </button>
        </div>
      </div>

      {/* ?먥븧??留ㅼ닔???섏닔猷??덈궡 ?먥븧??*/}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <h3 className="font-black mb-3" style={{ fontSize: 13, color: "var(--fg-strong)" }}>
          留ㅼ닔???섏닔猷??덈궡
        </h3>
        {/* 湲곗? 嫄곕옒媛 */}
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-3"
          style={{
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
          }}
        >
          <span className="font-semibold" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            湲곗? 嫄곕옒媛
          </span>
          <span className="font-black tabular-nums" style={{ fontSize: 14, color: "var(--fg-strong)" }}>
            {formatKRW(askingPrice)}
          </span>
        </div>
        {/* ?섏닔猷??붿빟 */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-black tabular-nums"
            style={{ fontSize: 20, color: "var(--color-positive)" }}
          >
            {totalFeeRate.toFixed(1)}%
          </span>
          <div className="text-right">
            <div className="text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
              ?덉긽 ?섏닔猷?            </div>
            <div className="font-black tabular-nums" style={{ fontSize: 15, color: "var(--color-positive)" }}>
              {formatKRW(totalFee)}
            </div>
          </div>
        </div>
        {/* Breakdown */}
        <div className="space-y-1 mb-3 text-[11px]">
          <div className="flex items-center justify-between" style={{ color: "var(--fg-default)" }}>
            <span>湲곕낯 ?섏닔猷?({basicFeeRate}%)</span>
            <span className="font-bold tabular-nums">{formatKRW(basicFee)}</span>
          </div>
          <div className="flex items-center justify-between" style={{ color: "var(--fg-default)" }}>
            <span>+ ?곗꽑?묒긽沅?(PNR, {pnrFeeRate}%)</span>
            <span className="font-bold tabular-nums">{formatKRW(pnrFee)}</span>
          </div>
        </div>
        <p
          className="text-[10px] leading-relaxed pt-2 border-t"
          style={{ color: "var(--fg-muted)", borderColor: "var(--layer-border-strong)" }}
        >
          ?뮕 ?섏닔猷뚮뒗 <strong style={{ color: "var(--fg-default)" }}>嫄곕옒 ?깆궗 ??/strong>?먮쭔 遺怨쇰맗?덈떎.
          ?먯뒪?щ줈 怨꾩쥖濡??먮룞 ?뺤궛?섎ŉ, 留ㅻ룄???섏닔猷뚮뒗 蹂꾨룄濡?泥섎━?⑸땲??
        </p>
      </div>

      {/* ?먥븧???쒓났 ?먮즺 ?먥븧??*/}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black" style={{ fontSize: 13, color: "var(--fg-strong)" }}>
            ?쒓났 ?먮즺
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
          蹂?留ㅻЪ? 媛쒖씤?뺣낫蹂댄샇踰빧룹떊?⑹젙蹂대쾿쨌?꾩옄湲덉쑖嫄곕옒踰뺤쓣 以?섑븯硫? 紐⑤뱺 ?대엺? PII Access Log??湲곕줉?⑸땲??
        </p>
      </div>
    </aside>
  )
}
