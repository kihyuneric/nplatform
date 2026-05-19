"use client"

/**
 * XRF Terminal Section — Bloomberg-style 다크 케이스 스터디 뷰
 *
 * /analysis/report 페이지에서 valuationMode === 'XRF_TERMINAL' 일 때 렌더링.
 * 기존 NPL Valuation / XRF RWA / XRF Admin 의 데이터(report.profitability + XrfValuationResult)
 * 를 자동 매핑하여 동적으로 표시한다.
 *
 * 색상: 흑색 배경 + 네온 그린 (#10B981 / #34D399) 액센트
 */

import { useMemo } from "react"
import type { UnifiedAnalysisReport } from "@/lib/npl/unified-report/types"
import type { XrfValuationResult } from "@/lib/xrf/valuation"

/* ─── Design tokens ──────────────────────────────────────────────────── */
const T = {
  bg: "#0A0E14",
  bgPanel: "#0E1219",
  bgHeader: "#0B0F16",
  border: "#1A2230",
  borderGreen: "#10B981",
  borderGreenDim: "rgba(16, 185, 129, 0.35)",
  green: "#34D399",
  greenBright: "#10B981",
  greenDim: "rgba(52, 211, 153, 0.65)",
  white: "#F4F6F8",
  textDim: "#9CA3AF",
  textMuted: "#6B7280",
  red: "#FB7185",
  warn: "#FBBF24",
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

const fmtUSD = (v: number, opts?: { withDollar?: boolean }) => {
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  const s = abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return opts?.withDollar ? `${sign}$${s}` : `USD ${sign}${s}`
}
const fmtUSDk = (v: number) => {
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  return `${sign}$${Math.round(abs / 1000).toLocaleString("en-US")}K`
}
const fmtPct = (v: number, digits = 1) => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`
const fmtDate = (iso?: string) =>
  iso ? iso.slice(0, 7).replace("-", ".") : "—"

/* 등급 → 100점 환산 (verdictScore 가 없을 때 fallback) */
const gradeToScore = (g?: string): number => {
  switch (g) {
    case "A": return 92
    case "B": return 78
    case "C": return 62
    case "D": return 45
    case "E": return 25
    default:  return 50
  }
}
const scoreToRiskLabel = (s: number): { label: string; color: string } => {
  if (s >= 75) return { label: "LOW RISK",      color: T.green }
  if (s >= 55) return { label: "MODERATE RISK", color: T.green }
  if (s >= 35) return { label: "ELEVATED RISK", color: T.warn  }
  return         { label: "HIGH RISK",      color: T.red   }
}

/* Tier note (한국어) */
const TIER_NOTE: Record<string, string> = {
  BASE:           "AI가 '좋은 딜'로 판단 → 운용사(XRF) 성과보수 15% 적용",
  CONSERVATIVE:   "AI가 '보통 딜'로 판단 → 운용사 성과보수 10% (양보)",
  "SAVE-THE-DEAL":"AI가 '한계 딜'로 판단 → 운용사 성과보수 5% (최대 양보)",
  REJECT:         "AI '부적합' 판정 → RWA 출시 미적합 (참고용)",
}

/* Deal status 결정 — 오늘 vs 마일스톤 비교 */
function deriveStatus(now: Date, distributionDate?: string, winBidDate?: string): "SETTLED" | "ACTIVE" | "PENDING" {
  if (!distributionDate) return "PENDING"
  const dist = new Date(distributionDate).getTime()
  if (now.getTime() >= dist) return "SETTLED"
  if (winBidDate) {
    const win = new Date(winBidDate).getTime()
    if (now.getTime() >= win) return "ACTIVE"
  }
  return "PENDING"
}

/* ─── Props ──────────────────────────────────────────────────────────── */

export interface XrfTerminalSectionProps {
  report: UnifiedAnalysisReport
  xrfResult: XrfValuationResult
  /** 페이지 번호 (예: "06 / 32") — 옵션 */
  pageNo?: string
  /** Case 번호 — 옵션 */
  caseNo?: string
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function XrfTerminalSection({
  report,
  xrfResult,
  pageNo,
  caseNo,
}: XrfTerminalSectionProps) {
  const data = useMemo(() => {
    const { input, summary, profitability } = report
    const r = xrfResult

    // ── 기본 메타 ────────────────────────────────────────────────
    const title = input.assetTitle || "Untitled Deal"
    const region = input.region || ""
    const debtorTypeLabel =
      input.debtorType === "CORPORATE" ? "법인 차주"
      : input.debtorType === "INDIVIDUAL" ? "개인 차주"
      : "차주"
    const propertyType = input.propertyType || ""
    const ltvPct = profitability?.acquisition.pledgeLoanRatio
      ? Math.round(profitability.acquisition.pledgeLoanRatio * 100)
      : 0
    const subtitleParts = [
      debtorTypeLabel,
      ltvPct > 0 ? `담보비율 ${ltvPct}%` : "",
      propertyType,
    ].filter(Boolean)
    const subtitle = subtitleParts.join(" · ")

    // ── 마일스톤 ────────────────────────────────────────────────
    const milestones = profitability?.schedule.milestones ?? []
    const m = (key: string) => milestones.find((x) => x.key === key)?.date
    const auctionStart = m("auctionStart")
    const winBid = m("winBidDate")
    const distribution = m("distributionDate")
    const purchaseDate = profitability?.acquisition.purchaseDate
    // AI 분석 / DPU 발행 — purchaseDate 직전(-1 ~ 0개월) 으로 추정
    const analysisDate = purchaseDate
      ? new Date(new Date(purchaseDate).getTime() - 30 * 86400_000).toISOString().slice(0, 10)
      : undefined

    const status = deriveStatus(new Date(), distribution, winBid)

    // ── KPI ────────────────────────────────────────────────────
    const displayRoi = r.displayRoi // LP 표시 ROI (0.259 = 25.9%)
    const dpuReturnUSD = 1000 * (1 + displayRoi) // $1,000 invest → receive
    const dpuProfitUSD = dpuReturnUSD - 1000
    const durationDays = profitability?.investment.holdingPeriodDays ?? Math.round(r.durationYr * 365)

    const aiScore = summary.verdictScore ?? gradeToScore(summary.riskGrade)
    const riskMeta = scoreToRiskLabel(aiScore)

    // ── Deal Parameters · P&L ─────────────────────────────────
    const fx = r.exchangeRateKRWPerUSD || 1300
    const purchasePriceUSD = r.nplPurchaseUSD
    const appraisalUSD = (input.appraisalValue || 0) / fx
    const lpInvestedUSD = r.displayPoolUSD // = nplEquity + fixed fees
    const lpReceiptUSD = r.lpCapitalUSD + r.lpNetProfitUSD
    // 운영비용 = KOF + Servicing (Setup 은 별도)
    const operatingUSD = r.fees.platformTotalUSD + r.fees.servicingUSD
    const mgmtFeeUSD = r.fees.xrfMgmtUSD + r.fees.xrfSetupUSD // 관리보수 (1%/yr) + setup (1회)
    const carryFeeUSD = r.fees.xrfCarryUSD                     // 성과보수
    // 총 회수금 = LP 수령액 + 운영비용 + 관리보수 + 성과보수
    const totalRecoveredUSD = lpReceiptUSD + operatingUSD + mgmtFeeUSD + carryFeeUSD
    const lpDeltaUSD = r.lpNetProfitUSD
    const expectedBidRatioPct = profitability?.valuation.expectedBidRatio
      ? profitability.valuation.expectedBidRatio * 100
      : 0

    // ── Fee 라벨 % (tier 별) ────────────────────────────────────
    const mgmtPct = r.tier === "REJECT" ? 1.0 : 1.0 // v9 flat 1.0
    const carryPct =
      r.tier === "BASE" ? 15
      : r.tier === "CONSERVATIVE" ? 10
      : r.tier === "SAVE-THE-DEAL" ? 5
      : 0
    const tierNote = TIER_NOTE[r.tier] || TIER_NOTE.BASE

    // ── Collateral 풋터 ────────────────────────────────────────
    const seniorTotal = input.rightsSummary?.seniorTotal ?? 0
    const collateralLtv = appraisalUSD > 0
      ? Math.round((purchasePriceUSD / appraisalUSD) * 1000) / 10
      : 0
    const collateralFooter = [
      propertyType ? `${propertyType}(${region})` : region,
      `감정가 USD ${(appraisalUSD).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      collateralLtv > 0 ? `담보비율 ${collateralLtv.toFixed(1)}%` : "",
      seniorTotal > 0 ? `선순위 USD ${(seniorTotal / fx).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "선순위 없음",
    ].filter(Boolean).join(" · ")

    // ── Risk Factor 메시지 ────────────────────────────────────
    const riskFactors = (() => {
      const base = `낙찰가율 ${expectedBidRatioPct.toFixed(1)}% 시나리오 적용`
      if (r.tier === "BASE") return `LOW: 안정적 회수 예상 · ${base}`
      if (r.tier === "CONSERVATIVE") return `MODERATE: 관리·성과보수 양보로 LP 목표 ROI 달성 · ${base}`
      if (r.tier === "SAVE-THE-DEAL") return `ELEVATED: 운용사 최대 양보 후 hurdle 근접 · ${base}`
      return `HIGH: RWA 출시 부적합 — 운용사 양보로도 hurdle 미달 · ${base}`
    })()

    return {
      // header
      title,
      subtitle,
      status,
      caseNo: caseNo ?? "01",
      pageNo: pageNo ?? "—",
      // KPI
      dpuReturnUSD,
      dpuProfitUSD,
      displayRoi,
      durationDays,
      durationLabel: status === "SETTLED" ? "NPL → SETTLED" : "NPL → SETTLEMENT",
      aiScore,
      riskMeta,
      // Deal Parameters
      assetTypeText: propertyType ? `${propertyType} (${region || "—"})` : (region || "—"),
      locationDebtor: `${region || "—"} · ${debtorTypeLabel}`,
      ltvPct,
      purchasePriceUSD,
      appraisalUSD,
      auctionStartDate: auctionStart || "—",
      expectedBidRatioPct,
      lpInvestedUSD,
      totalRecoveredUSD,
      operatingUSD,
      mgmtFeeUSD,
      mgmtPct,
      carryFeeUSD,
      carryPct,
      lpReceiptUSD,
      lpDeltaUSD,
      // Simulator
      tier: r.tier,
      tierNote,
      // Lifecycle
      lifecycle: [
        { label: "NPL 매입",  date: fmtDate(purchaseDate) },
        { label: "AI 분석",   date: fmtDate(analysisDate) },
        { label: "DPU 발행",  date: fmtDate(analysisDate) },
        { label: "경매 낙찰", date: fmtDate(winBid) },
        { label: "RLUSD 정산", date: fmtDate(distribution) },
      ],
      // Bottom strip
      bottomKpi: [
        { label: "INVESTED", value: fmtUSDk(lpInvestedUSD) },
        { label: "RECOVERED", value: fmtUSDk(totalRecoveredUSD) },
        { label: "OPERATING", value: fmtUSDk(-operatingUSD), neg: true },
        { label: "XRF FEES (관리보수+성과보수)", value: fmtUSDk(-(mgmtFeeUSD + carryFeeUSD)), neg: true },
        { label: "LP RECEIVED", value: fmtUSDk(lpReceiptUSD) },
      ],
      // Footer
      collateralFooter,
      riskFactors,
    }
  }, [report, xrfResult, pageNo, caseNo])

  // 헤더 ticker — 고정 (XRPL/RLUSD 메인넷 가정)
  const aiPct = data.aiScore
  const todayKst = useMemo(() => new Date().toISOString().slice(0, 10) + " KST", [])

  return (
    <section
      className="no-print"
      style={{
        background: T.bg,
        color: T.white,
        fontFamily: "'JetBrains Mono', 'Consolas', 'Menlo', monospace",
        border: `1px solid ${T.borderGreen}`,
        margin: "0 24px",
        position: "relative",
      }}
    >
      {/* ─── 상단 헤더 바 ──────────────────────────── */}
      <div
        style={{
          background: T.bgHeader,
          borderBottom: `1px solid ${T.borderGreen}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: T.greenBright, flexWrap: "wrap" }}>
          <span style={{ color: T.green, fontWeight: 800 }}>XRF TERMINAL</span>
          <span style={{ color: T.border }}>|</span>
          <span style={{ color: T.textDim }}>
            XRPL : <span style={{ color: T.green }}>MAINNET</span>
          </span>
          <span style={{ color: T.border }}>|</span>
          <span style={{ color: T.textDim }}>
            RLUSD : <span style={{ color: T.green }}>1.00</span>
          </span>
          <span style={{ color: T.border }}>|</span>
          <span style={{ color: T.textDim }}>
            AI : <span style={{ color: T.green }}>{aiPct.toFixed(1)}%</span>
          </span>
        </div>
        <div style={{ color: T.greenDim, fontWeight: 700 }}>
          CASE STUDY · {todayKst}
        </div>
      </div>

      {/* Sub header */}
      <div
        style={{
          background: T.bg,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 9.5,
          letterSpacing: "0.10em",
          color: T.textMuted,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span>CONFIDENTIAL · INSTITUTIONAL USE ONLY · XRF REAL ASSET FINANCE</span>
        <span style={{ color: T.greenDim, fontWeight: 700 }}>{data.pageNo}</span>
      </div>

      {/* ─── Title block ──────────────────────────── */}
      <div style={{ padding: "24px 24px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: T.green,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.16em",
                marginBottom: 10,
              }}
            >
              CASE {data.caseNo} · {data.status}
            </div>
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: T.white,
                letterSpacing: "-0.015em",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              {data.title}
            </h2>
            <div style={{ color: T.textDim, fontSize: 12.5, fontWeight: 500 }}>
              {data.subtitle}
            </div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              border: `1px solid ${T.green}`,
              color: T.green,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              whiteSpace: "nowrap",
            }}
          >
            ★ {data.status}
          </div>
        </div>
      </div>

      {/* ─── KPI Row (4 cards) ───────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {[
          {
            label: "1 DPU RETURN",
            value: `$${data.dpuReturnUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
            hint: `+ ${fmtUSD(data.dpuProfitUSD, { withDollar: true })} PROFIT`,
            hintColor: T.green,
          },
          {
            label: "LP ROI",
            value: fmtPct(data.displayRoi * 100),
            hint: "VS USD INVESTED",
            hintColor: T.textDim,
            valueColor: T.green,
          },
          {
            label: "DURATION",
            value: (
              <>
                <span>{data.durationDays}</span>
                <span style={{ fontSize: 18, color: T.textDim, marginLeft: 4 }}>D</span>
              </>
            ),
            hint: data.durationLabel,
            hintColor: T.textDim,
          },
          {
            label: "AI RISK SCORE",
            value: (
              <>
                <span>{Math.round(data.aiScore)}</span>
                <span style={{ fontSize: 18, color: T.textDim, marginLeft: 4 }}>/100</span>
              </>
            ),
            hint: data.riskMeta.label,
            hintColor: data.riskMeta.color,
          },
        ].map((k, i) => (
          <div
            key={k.label}
            style={{
              padding: "20px 22px",
              borderRight: i < 3 ? `1px solid ${T.border}` : "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.12em", fontWeight: 700 }}>
              {k.label}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: (k as { valueColor?: string }).valueColor ?? T.green,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
              }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: k.hintColor, fontWeight: 700, letterSpacing: "0.08em" }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Body (2-col) ───────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* LEFT — Deal Parameters · P&L Analysis */}
        <div style={{ padding: "20px 22px", borderRight: `1px solid ${T.border}` }}>
          <div
            style={{
              fontSize: 10.5,
              color: T.green,
              letterSpacing: "0.16em",
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            DEAL PARAMETERS · P&amp;L ANALYSIS
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { label: "자산 유형",                   value: data.assetTypeText },
              { label: "위치 / 차주",                  value: data.locationDebtor },
              { label: "질권 담보비율 (LTV)",         value: data.ltvPct > 0 ? `${data.ltvPct}%` : "—" },
              { label: "매입가격",                    value: fmtUSD(data.purchasePriceUSD) },
              { label: "감정가",                      value: fmtUSD(data.appraisalUSD) },
              { label: "경매개시결정일 / 낙찰가율",   value: `${data.auctionStartDate} · ${data.expectedBidRatioPct.toFixed(1)}%` },
              { label: "투자금 (LP)",                 value: fmtUSD(data.lpInvestedUSD) },
              { label: "총 회수금",                   value: fmtUSD(data.totalRecoveredUSD) },
              { label: "(-) 운영비용",                value: fmtUSD(data.operatingUSD), minus: true },
              { label: `(-) 관리보수 ${data.mgmtPct.toFixed(0)}%`,  value: fmtUSD(data.mgmtFeeUSD), minus: true },
              { label: `(-) 성과보수 ${data.carryPct.toFixed(0)}%`, value: fmtUSD(data.carryFeeUSD), minus: true },
            ].map((p, i, arr) => (
              <div
                key={p.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "9px 0",
                  borderBottom:
                    i < arr.length - 1
                      ? `1px dashed ${T.border}`
                      : `1px solid ${T.borderGreenDim}`,
                  fontSize: 12.5,
                }}
              >
                <span style={{ color: T.textDim, letterSpacing: "-0.005em" }}>{p.label}</span>
                <span
                  style={{
                    color: p.minus ? T.warn : T.white,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.value}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "12px 0 4px",
                fontSize: 13,
              }}
            >
              <span style={{ color: T.white, fontWeight: 700 }}>LP 수령액</span>
              <span style={{ color: T.green, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {fmtUSD(data.lpReceiptUSD)}{" "}
                <span style={{ color: T.greenDim, fontWeight: 700 }}>
                  (+ {fmtUSD(data.lpDeltaUSD, { withDollar: true })})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — Simulator + Lifecycle */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Investment Simulator */}
          <div style={{ border: `1px solid ${T.borderGreen}`, padding: "14px 16px" }}>
            <div
              style={{
                fontSize: 10.5,
                color: T.green,
                letterSpacing: "0.14em",
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              $1,000 INVESTMENT SIMULATOR
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: "0.10em", fontWeight: 700, marginBottom: 2 }}>
                  INVEST
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.white, fontVariantNumeric: "tabular-nums" }}>
                  $1,000
                </div>
              </div>
              <div style={{ color: T.green, fontSize: 20 }}>→</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: "0.10em", fontWeight: 700, marginBottom: 2 }}>
                  RECEIVE
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.green, fontVariantNumeric: "tabular-nums" }}>
                  ${data.dpuReturnUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px dashed ${T.border}`,
                fontSize: 10.5,
                color: T.greenDim,
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              PROFIT: +{fmtUSD(data.dpuProfitUSD, { withDollar: true })} · {data.durationDays}D · RLUSD AUTO · 3–5 SEC
            </div>
          </div>

          {/* Tier badge + note */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                padding: "6px 12px",
                border: `1px solid ${T.green}`,
                color: T.green,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.12em",
                whiteSpace: "nowrap",
              }}
            >
              ★ {data.tier} TIER
            </div>
            <div style={{ color: T.textDim, fontSize: 12, lineHeight: 1.4, flex: 1, minWidth: 0 }}>
              {data.tierNote}
            </div>
          </div>

          {/* Deal Lifecycle */}
          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.green,
                letterSpacing: "0.14em",
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              DEAL LIFECYCLE
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.lifecycle.map((l, i) => (
                <div
                  key={l.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom:
                      i < data.lifecycle.length - 1 ? `1px dashed ${T.border}` : "none",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: T.textDim }}>{l.label}</span>
                  <span style={{ color: T.white, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {l.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom KPI strip (5-col) ────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {data.bottomKpi.map((b, i, arr) => (
          <div
            key={b.label}
            style={{
              padding: "16px 18px",
              borderRight: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: b.neg ? T.warn : T.green,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {b.value}
            </div>
            <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: "0.10em", fontWeight: 700 }}>
              {b.label}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Footer ──────────────────────────────── */}
      <div
        style={{
          padding: "12px 22px",
          fontSize: 11,
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          color: T.textDim,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: T.green, fontWeight: 800, letterSpacing: "0.10em" }}>COLLATERAL</span>
          <span>·</span>
          <span>{data.collateralFooter}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ color: T.green, fontWeight: 800, letterSpacing: "0.10em" }}>RISK FACTORS</span>
          <span>·</span>
          <span>{data.riskFactors}</span>
        </div>
      </div>
    </section>
  )
}
