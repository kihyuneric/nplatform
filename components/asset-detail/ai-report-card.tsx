/**
 * AiReportCard ??AI 遺꾩꽍 由ы룷??(DR-21 쨌 2026-04-25)
 *
 * 醫낇빀 AI 遺꾩꽍 由ы룷????McKinsey White Paper v9
 *
 * 援ъ꽦:
 *   1. ?ㅻ뜑 (?ㅽ겕 ?ㅼ씠鍮?+ ?덈줈怨좎묠)
 *   2. KPI Row 1 ???덉륫 ?뚯닔??/ 由ъ뒪???깃툒 / 湲덉쑖湲곌? NPL 留ㅺ컖媛
 *   3. KPI Row 2 ???ъ옄 ?먯옘??/ ?덉긽 ?ъ옄?섏씡 / ?ъ옄 ?섏씡瑜? *   4. ?덉륫 ?뚯닔???좊ː援ш컙 + ?ㅻ챸
 *   5. 3-Factor Cards (LTV / ?쒖옣?숉뼢 / ?숈같媛??
 *   6. AI 由ъ뒪???깃툒 쨌 ?앹꽦??AI ?꾨＼?꾪듃
 *   7. Monte Carlo ?쒕??덉씠?? */

"use client"

import {
  Brain, RefreshCcw, Shield, Sparkles, TrendingUp, Target,
  Sigma, Activity,
} from "lucide-react"

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Palette
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
const C = {
  ink: "#0A1628",
  inkDeep: "#051C2C",
  paper: "#FFFFFF",
  paperTint: "#FAFBFC",
  border: "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub: "#4A5568",
  textMuted: "#718096",
  brand: "#2558A0",
  brandBright: "#2E75B6",
  brass: "#2251FF",
  brassDark: "#1A47CC",
  positive: "#0F766E",
  warning: "#92400E",
  magenta: "#A21CAF",
} as const

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Types
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export interface AiReportFactor {
  label: string
  /** 0 ~ 100 */
  weight: number
}

export interface AiReportCardProps {
  recoveryRate: number | null
  confidence: number | null
  grade?: string
  factors?: AiReportFactor[]
  anomaly: { verdict: string; score: number } | null
  onRefresh?: () => void
  onOpenFull?: () => void
  onAskCopilot?: () => void
  loading?: boolean
}

const DEFAULT_FACTORS: AiReportFactor[] = [
  { label: "?대낫媛移??鍮?梨꾧텒鍮꾩쑉", weight: 35 },
  { label: "吏???쒖옣 ?숉뼢",         weight: 25 },
  { label: "梨꾨Т???좎슜?깃툒",         weight: 20 },
  { label: "寃쎈ℓ ?숈같媛??,           weight: 15 },
]

function gradeFromRate(rate: number | null): string {
  if (rate == null) return "??
  if (rate >= 85) return "S"
  if (rate >= 75) return "A+"
  if (rate >= 65) return "A"
  if (rate >= 55) return "B"
  return "C"
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   AiReportCard (硫붿씤)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export function AiReportCard({
  recoveryRate,
  confidence,
  grade,
  factors = DEFAULT_FACTORS,
  anomaly,
  onRefresh,
  onOpenFull,
  onAskCopilot,
  loading = false,
}: AiReportCardProps) {
  const effectiveGrade = grade ?? gradeFromRate(recoveryRate)
  const rate = recoveryRate ?? 107.8
  const conf = confidence ?? 92
  const lo = Math.max(0, rate - 10.9)
  const hi = rate + 10.9
  const anomalySafe = anomaly == null || anomaly.verdict === "safe" || anomaly.verdict === "?덉쟾"

  // ?곕え??mock 媛?(?ㅼ젣 API ?곕룞 ??prop ?쇰줈 援먯껜)
  const askingPrice = 19.6 // ??  const equity = 593_516_997
  const expectedProfit = 168_859_880
  const roi = 28.45
  const riskScore = 64.4

  return (
    <section
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 3px rgba(10,22,40,0.04)",
      }}
      aria-label="AI 遺꾩꽍 由ы룷??
    >
      {/* ??? Header (dark) ??????????????????????????????? */}
      <header
        className="flex items-center justify-between"
        style={{
          padding: "14px 22px",
          background: "linear-gradient(180deg, #051C2C 0%, #0A1628 100%)",
          borderBottom: `2px solid ${C.brass}`,
        }}
      >
        <h3 className="font-black inline-flex items-center gap-2.5" style={{ fontSize: 15, color: C.paper }}>
          <Brain size={18} style={{ color: C.brass }} />
          <span style={{ color: C.paper }}>AI 遺꾩꽍 由ы룷??/span>
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 transition-opacity disabled:opacity-50"
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(184, 146, 75, 0.32)",
            color: C.paper,
          }}
        >
          <RefreshCcw size={12} className={loading ? "animate-spin" : ""} style={{ color: C.brass }} />
          ?덈줈怨좎묠
        </button>
      </header>

      {/* ??? Body ???????????????????????????????????????? */}
      <div style={{ padding: 22 }}>
        {/* KPI Row 1 ???덉륫?뚯닔??/ 由ъ뒪??/ 留ㅺ컖媛 */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <KpiCard
            icon={<TrendingUp size={14} style={{ color: C.brandBright }} />}
            label="?덉륫 ?뚯닔??
            value={`${rate.toFixed(1)}%`}
            valueColor={C.brandBright}
            sub={`?좊ː??${conf}%`}
          />
          <KpiCard
            icon={<Shield size={14} style={{ color: C.magenta }} />}
            label="由ъ뒪???깃툒"
            value={`${effectiveGrade} 쨌 ${riskScore.toFixed(1)}??}
            valueColor={C.ink}
            sub="MEDIUM"
          />
          <KpiCard
            icon={<Target size={14} style={{ color: C.brandBright }} />}
            label="湲덉쑖湲곌? NPL 留ㅺ컖媛"
            value={`${askingPrice.toFixed(2)}?듭썝`}
            valueColor={C.ink}
            sub={`ROI ${roi.toFixed(2)}%`}
          />
        </div>

        {/* KPI Row 2 ???먯옘??/ ?덉긽?섏씡 / ROI */}
        <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <KpiCard
            label="?ъ옄 ?먯옘??珥앷퀎"
            value={`${equity.toLocaleString()}??}
            valueColor={C.ink}
          />
          <KpiCard
            label="?덉긽 ?ъ옄?섏씡"
            value={`${expectedProfit.toLocaleString()}??}
            valueColor={C.ink}
          />
          <KpiCard
            label="?ъ옄 ?섏씡瑜?(ROI)"
            value={`${roi.toFixed(2)}%`}
            valueColor={C.brandBright}
          />
        </div>

        {/* ??? ?덉륫 ?뚯닔??+ ?좊ː援ш컙 ??? */}
        <div
          className="mt-5"
          style={{
            background: C.paperTint,
            border: `1px solid ${C.border}`,
            padding: 18,
          }}
        >
          <div className="flex items-baseline gap-2 mb-3" style={{ flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>?덉륫 ?뚯닔??(?좊ː援ш컙)</span>
            <span
              className="tabular-nums"
              style={{ fontSize: 16, fontWeight: 800, color: C.brandBright }}
            >
              {rate.toFixed(1)}%
            </span>
            <span className="tabular-nums" style={{ fontSize: 11, color: C.textMuted }}>
              쨌 踰붿쐞 {lo.toFixed(1)}% ~ {hi.toFixed(1)}%
            </span>
          </div>
          <ConfidenceBar rate={rate} lo={lo} hi={hi} />
          <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.textSub }}>
            ?덉긽 ?뚯닔??{rate.toFixed(1)}% 쨌 ?좊ː援ш컙 {lo.toFixed(1)}~{hi.toFixed(1)}% (짹?) 쨌 ?좊ː??{conf}%.
            ?대낫 而ㅻ쾭由ъ? 128% (梨꾧텒???鍮??대낫媛移? ???숈같媛??83.5% ?ъ쁺???뚯닔 ?쒕굹由ъ삤.
            ?좊ː援ш컙??짹10.9%p 濡??볦뼱 ?멸렐 ?쒕낯 蹂닿컯(14嫄? ?꾩슂 ??蹂댁닔 ?쒕굹由ъ삤(96.9%) 蹂묓뻾 沅뚭퀬.
          </p>
          <CalcLink />
        </div>

        {/* ??? 3-Factor Cards ?뱀뀡 ?쒓굅 (2026-04-26 쨌 ?ъ슜???붿껌) ??? */}

        {/* ??? AI 由ъ뒪???깃툒 쨌 ?앹꽦??AI ?꾨＼?꾪듃 ??? */}
        <div
          className="mt-5"
          style={{
            background: C.paper,
            border: `1px solid ${C.border}`,
            padding: 18,
          }}
        >
          <div className="flex items-center justify-between mb-3" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="inline-flex items-center gap-2">
              <Shield size={14} style={{ color: C.brassDark }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>
                AI 由ъ뒪???깃툒
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>
              NPLATFORM 由ъ뒪??遺꾩꽍 紐⑤뜽
            </span>
          </div>

          <div className="flex items-start gap-4" style={{ flexWrap: "wrap" }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 48, height: 48,
                background: C.paper,
                border: `2px solid ${C.brass}`,
                fontSize: 22,
                fontWeight: 800,
                color: C.brassDark,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {effectiveGrade}
            </div>
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <div className="flex items-baseline gap-2 mb-1" style={{ flexWrap: "wrap" }}>
                <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>
                  醫낇빀 {riskScore.toFixed(1)}??                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub }}>쨌 MEDIUM</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
                  留ㅻЪ ?깅줉 ???뱀닔議곌굔 ?꾨＼?꾪듃 諛섏쁺
                </span>
              </div>
              <p className="leading-relaxed" style={{ fontSize: 12, color: C.textSub }}>
                由ъ뒪???섏? 蹂댄넻 ({riskScore.toFixed(1)}??쨌 ?깃툒 {effectiveGrade}). 4?⑺꽣 以?媛??痍⑥빟??援ш컙?
                <b style={{ color: C.warning }}> "沅뚮━愿怨? (52.0??</b> 쨌 媛??寃ш퀬??援ш컙?
                <b style={{ color: C.positive }}> "?좊룞?? (79.0??</b>. HIGH ?⑺꽣 1媛???留ㅼ엯 ???꾪솕 議곗튂 ?꾩닔.
                ?꾪솕 ?ъ빱?? ?뱁빐???〓떖?댁뿭쨌泥대궔泥섎텇 ?④퀎 ?뺤씤 쨌 理쒖슦??諛곕떦
                媛먯븸遺?留ㅼ엯媛 諛섏쁺.
              </p>
              <div className="mt-2"><CalcLink /></div>
            </div>
          </div>
        </div>

        {/* ??? Monte Carlo ??? */}
        <div
          className="mt-5"
          style={{
            background: C.paperTint,
            border: `1px solid ${C.border}`,
            padding: 18,
          }}
        >
          <div className="flex items-center justify-between mb-3" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="inline-flex items-center gap-2">
              <Sigma size={14} style={{ color: C.brassDark }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>
                Monte Carlo ?쒕??덉씠??              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.02em" }}>
              10,000???쒕? 쨌 ?숈같媛???뺢퇋遺꾪룷-?좎같 Poisson쨌鍮꾩슜 jitter 諛섏쁺
            </span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <McKpi label="?됯퇏 ROI" value="23.30%" sub="?쒖??몄감 5.30%p" valueColor={C.brandBright} />
            <McKpi label="?먯떎 ?뺣쪧 (ROI<0)" value="0.20%" sub="VaR 95% 12.70%" valueColor={C.warning} />
            {/* 以묒븰媛?(P50) 移대뱶 ?쒓굅 ??2026-04-26 ?ъ슜???붿껌 */}
            <McKpi label="?됯퇏 ?뚯닔 湲곌컙" value="338?? sub="?고솚??湲곗? 1.08x" valueColor={C.ink} />
          </div>
        </div>

        {/* ?댁긽 ?먯? (?듭뀡) */}
        {anomaly && (
          <div
            className="mt-5 flex items-center justify-between"
            style={{
              padding: "12px 16px",
              background: anomalySafe ? "rgba(15, 118, 110, 0.06)" : "rgba(146, 64, 14, 0.06)",
              border: `1px solid ${anomalySafe ? "rgba(15, 118, 110, 0.32)" : "rgba(146, 64, 14, 0.32)"}`,
            }}
          >
            <div className="inline-flex items-center gap-2 font-bold" style={{ fontSize: 12 }}>
              <Activity size={13} style={{ color: anomalySafe ? C.positive : C.warning }} />
              <span style={{ color: anomalySafe ? C.positive : C.warning }}>
                {anomalySafe ? "?댁긽 ?먯?: ?덉쟾" : `?댁긽 ?먯?: ${anomaly.verdict}`}
              </span>
            </div>
            <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
              ?먯닔 {anomaly.score.toFixed(1)}
            </span>
          </div>
        )}

        {/* Footer CTAs */}
        {(onOpenFull || onAskCopilot) && (
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {onOpenFull && (
              <button
                type="button"
                onClick={onOpenFull}
                className="inline-flex items-center justify-between transition-colors hover:bg-[rgba(184,146,75,0.06)]"
                style={{
                  padding: "12px 16px",
                  background: C.paper,
                  border: `1px solid ${C.borderStrong}`,
                  borderTop: `2px solid ${C.brass}`,
                  cursor: "pointer",
                }}
              >
                <span className="inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>
                  <Sparkles size={13} style={{ color: C.brass }} />
                  AI ?ъ옄 遺꾩꽍 (?뚯닔??쨌 DCF 쨌 紐ы뀒移대?濡?
                </span>
                <span style={{ fontSize: 14, color: C.brass }}>??/span>
              </button>
            )}
            {onAskCopilot && (
              <button
                type="button"
                onClick={onAskCopilot}
                className="inline-flex items-center justify-between transition-colors hover:bg-[rgba(184,146,75,0.06)]"
                style={{
                  padding: "12px 16px",
                  background: C.paper,
                  border: `1px solid ${C.borderStrong}`,
                  borderTop: `2px solid ${C.brass}`,
                  cursor: "pointer",
                }}
              >
                <span className="inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>
                  <Brain size={13} style={{ color: C.brass }} />
                  AI Copilot ?먭쾶 ??留ㅻЪ 吏덈Ц
                </span>
                <span style={{ fontSize: 14, color: C.brass }}>??/span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Sub: KpiCard
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function KpiCard({
  icon, label, value, valueColor, sub,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  valueColor: string
  sub?: string
}) {
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textSub, letterSpacing: "-0.005em" }}>
          {label}
        </span>
        {icon}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: valueColor,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5" style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Sub: FactorCard ??2026-04-26 ?ъ슜???붿껌?쇰줈 ?몄텧遺 ?쒓굅??(?뺤쓽???④퍡 ?뺣━)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Sub: ConfidenceBar
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function ConfidenceBar({ rate, lo, hi }: { rate: number; lo: number; hi: number }) {
  const max = 130
  const loPct = (lo / max) * 100
  const hiPct = (hi / max) * 100
  const ratePct = (rate / max) * 100
  return (
    <div>
      <div
        className="relative"
        style={{
          height: 22,
          background: "rgba(10, 22, 40, 0.04)",
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Confidence range */}
        <div
          style={{
            position: "absolute",
            left: `${loPct}%`,
            width: `${hiPct - loPct}%`,
            top: 0,
            bottom: 0,
            background: "linear-gradient(90deg, rgba(46, 117, 182, 0.18), rgba(46, 117, 182, 0.42))",
            borderLeft: `1px solid ${C.brandBright}`,
            borderRight: `1px solid ${C.brandBright}`,
          }}
        />
        {/* Rate marker */}
        <div
          style={{
            position: "absolute",
            left: `${ratePct}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: C.brand,
            transform: "translateX(-1px)",
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="tabular-nums" style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>0%</span>
        <span className="tabular-nums" style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>100%</span>
      </div>
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Sub: McKpi (Monte Carlo KPI)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function McKpi({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: 22, fontWeight: 800, color: valueColor, letterSpacing: "-0.025em", lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: C.textMuted, marginTop: 2 }}>
        {sub}
      </div>
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Sub: CalcLink
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function CalcLink() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 transition-colors hover:bg-[rgba(184,146,75,0.06)]"
      style={{
        padding: "4px 10px",
        background: C.paper,
        border: `1px solid ${C.border}`,
        fontSize: 10,
        fontWeight: 700,
        color: C.brassDark,
        letterSpacing: "0.02em",
        cursor: "pointer",
      }}
    >
      <Sigma size={11} style={{ color: C.brass }} />
      怨꾩궛??      <span style={{ marginLeft: 2, color: C.brass }}>??/span>
    </button>
  )
}
