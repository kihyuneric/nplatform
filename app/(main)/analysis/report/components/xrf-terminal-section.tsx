"use client"

/**
 * XRF Terminal Section — Bloomberg-style 다크 케이스 스터디 뷰
 *
 * /analysis/report 페이지에서 valuationMode === 'XRF_TERMINAL' 일 때 렌더링.
 * NPL Valuation / XRF RWA / XRF Admin 의 데이터(report.profitability + XrfValuationResult)
 * 를 자동 매핑하여 동적으로 표시한다.
 *
 * 다국어 정책 (2026-05-19):
 *   - 한글(ko): 모든 라벨 한글 + 값 KRW(원)
 *   - 영어(en): 모든 라벨 영어 + 값 USD
 *   - 일본어(ja): 모든 라벨 일본어 + 값 USD
 *   언어는 document.documentElement.lang (브라우저 자동 번역과 동기)
 *
 * KPI: LP ROI 카드 아래 IRR (연환산) 동시 노출
 *
 * 색상: 흑색 배경 + 네온 그린 (#10B981 / #34D399) 액센트
 */

import { useEffect, useMemo, useState } from "react"
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

/* ─── Locale dictionary ──────────────────────────────────────────────── */
type Lang = "ko" | "en" | "ja"

const DICT: Record<Lang, {
  // Header
  caseStudy: string
  confidential: string
  // Status
  settled: string
  active: string
  pending: string
  // Section titles
  dealParamsPnl: string
  investmentSimulator: string
  invest: string
  receive: string
  dealLifecycle: string
  // KPI
  dpuReturn: string
  profitWord: string
  lpRoi: string
  irr: string
  vsInvested: string
  duration: string
  durationLabel: (status: "SETTLED" | "ACTIVE" | "PENDING") => string
  aiRisk: string
  riskLabels: { low: string; mod: string; elev: string; high: string }
  // Deal Parameters labels
  pAssetType: string
  pLocationDebtor: string
  pLTV: string
  pPurchase: string
  pAppraisal: string
  pAuctionStartBidRatio: string
  pLpInvested: string
  pTotalRecovered: string
  pOperating: string
  pMgmt: (pct: number) => string
  pCarry: (pct: number) => string
  pLpReceipt: string
  // Bottom strip
  bInvested: string
  bRecovered: string
  bOperating: string
  bXrfFees: string
  bLpReceived: string
  // Footer
  collateral: string
  riskFactors: string
  // Tier
  tierBadge: (tier: string) => string
  // Lifecycle steps
  lcPurchase: string
  lcAnalysis: string
  lcDpu: string
  lcWinBid: string
  lcSettlement: string
  // Debtor type
  debtorIndividual: string
  debtorCorporate: string
  debtorDefault: string
  // Subtitle parts
  ltvLabel: (pct: number) => string
  // Profit line in simulator
  profitLine: (profit: string, days: number) => string
  // Tier note
  tierNote: Record<string, string>
}> = {
  ko: {
    caseStudy: "케이스 스터디",
    confidential: "기밀 · 기관 전용 · XRF 실물자산금융",
    settled: "정산완료",
    active: "낙찰후",
    pending: "운용중",
    dealParamsPnl: "거래 조건 · 손익 분석",
    investmentSimulator: "1,000 단위 투자 시뮬레이터",
    invest: "투자",
    receive: "수령",
    dealLifecycle: "딜 라이프사이클",
    dpuReturn: "1 DPU 회수액",
    profitWord: "수익",
    lpRoi: "LP 수익률",
    irr: "연환산 IRR",
    vsInvested: "투자금 대비",
    duration: "운용기간",
    durationLabel: (s) => s === "SETTLED" ? "NPL → 정산완료" : "NPL → 정산",
    aiRisk: "AI 리스크 점수",
    riskLabels: { low: "낮은 위험", mod: "보통 위험", elev: "주의 위험", high: "높은 위험" },
    pAssetType: "자산 유형",
    pLocationDebtor: "위치 / 차주",
    pLTV: "질권 담보비율 (LTV)",
    pPurchase: "매입가격",
    pAppraisal: "감정가",
    pAuctionStartBidRatio: "경매개시결정일 / 낙찰가율",
    pLpInvested: "투자금 (LP)",
    pTotalRecovered: "총 회수금",
    pOperating: "(-) 운영비용",
    pMgmt: (pct) => `(-) 관리보수 ${pct.toFixed(0)}%`,
    pCarry: (pct) => `(-) 성과보수 ${pct.toFixed(0)}%`,
    pLpReceipt: "LP 수령액",
    bInvested: "투자금",
    bRecovered: "총 회수금",
    bOperating: "운영비용",
    bXrfFees: "XRF 보수 (관리+성과)",
    bLpReceived: "LP 수령액",
    collateral: "담보",
    riskFactors: "리스크 요인",
    tierBadge: (t) =>
      t === "BASE" ? "★ 기본 등급"
      : t === "CONSERVATIVE" ? "★ 보수적 등급"
      : t === "SAVE-THE-DEAL" ? "★ 한계 양보 등급"
      : "★ 출시 부적합",
    lcPurchase: "NPL 매입",
    lcAnalysis: "AI 분석",
    lcDpu: "DPU 발행",
    lcWinBid: "경매 낙찰",
    lcSettlement: "정산",
    debtorIndividual: "개인 차주",
    debtorCorporate: "법인 차주",
    debtorDefault: "차주",
    ltvLabel: (pct) => `담보비율 ${pct}%`,
    profitLine: (profit, days) =>
      `수익: +${profit} · ${days}일 · RLUSD 자동 · 3–5초`,
    tierNote: {
      BASE:           "AI가 ‘좋은 딜’로 판단 → 운용사(XRF) 성과보수 15% 적용",
      CONSERVATIVE:   "AI가 ‘보통 딜’로 판단 → 운용사 성과보수 10% (양보)",
      "SAVE-THE-DEAL":"AI가 ‘한계 딜’로 판단 → 운용사 성과보수 5% (최대 양보)",
      REJECT:         "AI ‘부적합’ 판정 → RWA 출시 미적합 (참고용)",
    },
  },
  en: {
    caseStudy: "CASE STUDY",
    confidential: "CONFIDENTIAL · INSTITUTIONAL USE ONLY · XRF REAL ASSET FINANCE",
    settled: "SETTLED",
    active: "ACTIVE",
    pending: "PENDING",
    dealParamsPnl: "DEAL PARAMETERS · P&L ANALYSIS",
    investmentSimulator: "$1,000 INVESTMENT SIMULATOR",
    invest: "INVEST",
    receive: "RECEIVE",
    dealLifecycle: "DEAL LIFECYCLE",
    dpuReturn: "1 DPU RETURN",
    profitWord: "PROFIT",
    lpRoi: "LP ROI",
    irr: "IRR",
    vsInvested: "VS USD INVESTED",
    duration: "DURATION",
    durationLabel: (s) => s === "SETTLED" ? "NPL → SETTLED" : "NPL → SETTLEMENT",
    aiRisk: "AI RISK SCORE",
    riskLabels: { low: "LOW RISK", mod: "MODERATE RISK", elev: "ELEVATED RISK", high: "HIGH RISK" },
    pAssetType: "Asset type",
    pLocationDebtor: "Location / Borrower",
    pLTV: "Pledge LTV",
    pPurchase: "Purchase price",
    pAppraisal: "Appraised value",
    pAuctionStartBidRatio: "Auction start / Bid ratio",
    pLpInvested: "LP invested",
    pTotalRecovered: "Total recovered",
    pOperating: "(-) Operating fees",
    pMgmt: (pct) => `(-) Mgmt fee ${pct.toFixed(0)}%`,
    pCarry: (pct) => `(-) Carry ${pct.toFixed(0)}%`,
    pLpReceipt: "LP received",
    bInvested: "INVESTED",
    bRecovered: "RECOVERED",
    bOperating: "OPERATING",
    bXrfFees: "XRF FEES (mgmt+carry)",
    bLpReceived: "LP RECEIVED",
    collateral: "COLLATERAL",
    riskFactors: "RISK FACTORS",
    tierBadge: (t) =>
      t === "BASE" ? "★ BASE TIER"
      : t === "CONSERVATIVE" ? "★ CONSERVATIVE TIER"
      : t === "SAVE-THE-DEAL" ? "★ SAVE-THE-DEAL TIER"
      : "★ REJECT",
    lcPurchase: "NPL Acquired",
    lcAnalysis: "AI Analysis",
    lcDpu: "DPU Issued",
    lcWinBid: "Auction Won",
    lcSettlement: "RLUSD Settled",
    debtorIndividual: "Individual borrower",
    debtorCorporate: "Corporate borrower",
    debtorDefault: "Borrower",
    ltvLabel: (pct) => `LTV ${pct}%`,
    profitLine: (profit, days) =>
      `PROFIT: +${profit} · ${days}D · RLUSD AUTO · 3–5 SEC`,
    tierNote: {
      BASE:           "AI rates this as a ‘good deal’ → 15% carry applied to manager (XRF)",
      CONSERVATIVE:   "AI rates this as ‘fair’ → 10% carry (manager concession)",
      "SAVE-THE-DEAL":"AI rates this as ‘marginal’ → 5% carry (max manager concession)",
      REJECT:         "AI rejects: not suitable for RWA issuance (reference only)",
    },
  },
  ja: {
    caseStudy: "ケーススタディ",
    confidential: "機密・機関投資家専用・XRFリアルアセットファイナンス",
    settled: "決済完了",
    active: "落札後",
    pending: "運用中",
    dealParamsPnl: "ディール条件 · 損益分析",
    investmentSimulator: "1,000ドル投資シミュレーター",
    invest: "投資",
    receive: "受領",
    dealLifecycle: "ディールライフサイクル",
    dpuReturn: "1 DPU 回収額",
    profitWord: "利益",
    lpRoi: "LP 利回り",
    irr: "年率IRR",
    vsInvested: "投資額対比",
    duration: "運用期間",
    durationLabel: (s) => s === "SETTLED" ? "NPL → 決済完了" : "NPL → 決済",
    aiRisk: "AI リスクスコア",
    riskLabels: { low: "低リスク", mod: "中リスク", elev: "やや高リスク", high: "高リスク" },
    pAssetType: "資産種類",
    pLocationDebtor: "所在地 / 借主",
    pLTV: "質権 LTV",
    pPurchase: "取得価格",
    pAppraisal: "鑑定価格",
    pAuctionStartBidRatio: "競売開始日 / 落札率",
    pLpInvested: "LP 投資額",
    pTotalRecovered: "総回収額",
    pOperating: "(-) 運営費用",
    pMgmt: (pct) => `(-) 管理報酬 ${pct.toFixed(0)}%`,
    pCarry: (pct) => `(-) 成果報酬 ${pct.toFixed(0)}%`,
    pLpReceipt: "LP 受領額",
    bInvested: "投資額",
    bRecovered: "総回収額",
    bOperating: "運営費用",
    bXrfFees: "XRF 報酬 (管理+成果)",
    bLpReceived: "LP 受領額",
    collateral: "担保",
    riskFactors: "リスク要因",
    tierBadge: (t) =>
      t === "BASE" ? "★ ベース・ティア"
      : t === "CONSERVATIVE" ? "★ 保守ティア"
      : t === "SAVE-THE-DEAL" ? "★ セーブ・ザ・ディール"
      : "★ 不適合",
    lcPurchase: "NPL 取得",
    lcAnalysis: "AI 分析",
    lcDpu: "DPU 発行",
    lcWinBid: "競売落札",
    lcSettlement: "RLUSD 決済",
    debtorIndividual: "個人借主",
    debtorCorporate: "法人借主",
    debtorDefault: "借主",
    ltvLabel: (pct) => `LTV ${pct}%`,
    profitLine: (profit, days) =>
      `利益: +${profit} · ${days}日 · RLUSD 自動 · 3–5秒`,
    tierNote: {
      BASE:           "AIが「良いディール」と判定 → 運用会社(XRF)成果報酬15%適用",
      CONSERVATIVE:   "AIが「普通のディール」と判定 → 成果報酬10% (運用会社譲歩)",
      "SAVE-THE-DEAL":"AIが「限界ディール」と判定 → 成果報酬5% (最大譲歩)",
      REJECT:         "AI「不適合」判定 → RWA発行不適 (参考)",
    },
  },
}

/* ─── Currency formatters ────────────────────────────────────────────── */

/** USD 표기: "USD 1,253,130" */
function fmtUSD(v: number, opts?: { withDollar?: boolean }): string {
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  const s = abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return opts?.withDollar ? `${sign}$${s}` : `USD ${sign}${s}`
}

/** USD k 단위 표기: "$510K" */
function fmtUSDk(v: number): string {
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  return `${sign}$${Math.round(abs / 1000).toLocaleString("en-US")}K`
}

/** KRW 표기: "12.5억" / "1,234만" / "1,234원" */
function fmtKRW(v: number, opts?: { with원?: boolean }): string {
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  const num = Math.round(abs).toLocaleString("ko-KR")
  return opts?.with원 ? `${sign}${num}원` : `${sign}${num}`
}

/** KRW k 단위 (1억 이상) */
function fmtKRWBig(v: number): string {
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return `${sign}${Math.round(abs).toLocaleString("ko-KR")}원`
}

/** % */
function fmtPct(v: number, digits = 1): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`
}

function fmtDate(iso?: string): string {
  return iso ? iso.slice(0, 7).replace("-", ".") : "—"
}

/* 등급 → 100점 환산 (verdictScore 가 없을 때 fallback) */
function gradeToScore(g?: string): number {
  switch (g) {
    case "A": return 92
    case "B": return 78
    case "C": return 62
    case "D": return 45
    case "E": return 25
    default:  return 50
  }
}

function scoreToRiskMeta(s: number, riskLabels: Record<"low"|"mod"|"elev"|"high", string>): { label: string; color: string } {
  if (s >= 75) return { label: riskLabels.low,  color: T.green }
  if (s >= 55) return { label: riskLabels.mod,  color: T.green }
  if (s >= 35) return { label: riskLabels.elev, color: T.warn  }
  return         { label: riskLabels.high, color: T.red   }
}

/* Deal status 결정 */
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
  pageNo?: string
  caseNo?: string
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function XrfTerminalSection({
  report,
  xrfResult,
  pageNo,
  caseNo,
}: XrfTerminalSectionProps) {
  /* 언어 감지 — document.documentElement.lang */
  const [lang, setLang] = useState<Lang>("ko")
  useEffect(() => {
    if (typeof document === "undefined") return
    const apply = () => {
      const raw = (document.documentElement.lang || "ko").toLowerCase().slice(0, 2)
      setLang(raw === "en" ? "en" : raw === "ja" ? "ja" : "ko")
    }
    apply()
    const mo = new MutationObserver(apply)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] })
    return () => mo.disconnect()
  }, [])

  const L = DICT[lang]
  const useKRW = lang === "ko"

  const data = useMemo(() => {
    const { input, summary, profitability } = report
    const r = xrfResult
    const fx = r.exchangeRateKRWPerUSD || 1300

    /* USD → 디스플레이 통화 변환 */
    const toCcy = (usd: number) => useKRW ? usd * fx : usd
    const fmtCcy = (usd: number) => useKRW ? fmtKRW(usd * fx, { with원: true }) : fmtUSD(usd)
    const fmtCcyShort = (usd: number) => useKRW ? fmtKRWBig(usd * fx) : fmtUSDk(usd)
    const fmtCcyDeltaWithDollar = (usd: number) =>
      useKRW ? `+ ${fmtKRW(usd * fx, { with원: true })}` : `+ ${fmtUSD(usd, { withDollar: true })}`

    /* DPU 단위(USD 환경: $1,000 / KRW 환경: 100만원) */
    const dpuUnitUsd = 1000
    const dpuUnitDisplay = useKRW ? "100만원" : "$1,000"

    // ── 기본 메타 ────────────────────────────────────────────────
    const title = input.assetTitle || "Untitled Deal"
    const region = input.region || ""
    const debtorTypeLabel =
      input.debtorType === "CORPORATE" ? L.debtorCorporate
      : input.debtorType === "INDIVIDUAL" ? L.debtorIndividual
      : L.debtorDefault
    const propertyType = input.propertyType || ""
    const ltvPct = profitability?.acquisition.pledgeLoanRatio
      ? Math.round(profitability.acquisition.pledgeLoanRatio * 100)
      : 0
    const subtitleParts = [
      debtorTypeLabel,
      ltvPct > 0 ? L.ltvLabel(ltvPct) : "",
      propertyType,
    ].filter(Boolean)
    const subtitle = subtitleParts.join(" · ")

    // ── 마일스톤 ────────────────────────────────────────────────
    const milestones = profitability?.schedule.milestones ?? []
    const ms = (key: string) => milestones.find((x) => x.key === key)?.date
    const auctionStart = ms("auctionStart")
    const winBid = ms("winBidDate")
    const distribution = ms("distributionDate")
    const purchaseDate = profitability?.acquisition.purchaseDate
    const analysisDate = purchaseDate
      ? new Date(new Date(purchaseDate).getTime() - 30 * 86400_000).toISOString().slice(0, 10)
      : undefined

    const status = deriveStatus(new Date(), distribution, winBid)

    // ── KPI ────────────────────────────────────────────────────
    const displayRoi = r.displayRoi
    const displayIrr = r.displayIrrYr
    const dpuReturnUsd = dpuUnitUsd * (1 + displayRoi)
    const dpuProfitUsd = dpuReturnUsd - dpuUnitUsd
    const durationDays = profitability?.investment.holdingPeriodDays ?? Math.round(r.durationYr * 365)

    const aiScore = summary.verdictScore ?? gradeToScore(summary.riskGrade)
    const riskMeta = scoreToRiskMeta(aiScore, L.riskLabels)

    // ── Deal Parameters · P&L (USD 기준 계산 → 표시 변환) ──────
    const purchasePriceUsd = r.nplPurchaseUSD
    const appraisalUsd = (input.appraisalValue || 0) / fx
    const lpInvestedUsd = r.displayPoolUSD
    const lpReceiptUsd = r.lpCapitalUSD + r.lpNetProfitUSD
    const operatingUsd = r.fees.platformTotalUSD + r.fees.servicingUSD
    const mgmtFeeUsd = r.fees.xrfMgmtUSD + r.fees.xrfSetupUSD
    const carryFeeUsd = r.fees.xrfCarryUSD
    const totalRecoveredUsd = lpReceiptUsd + operatingUsd + mgmtFeeUsd + carryFeeUsd
    const lpDeltaUsd = r.lpNetProfitUSD
    const expectedBidRatioPct = profitability?.valuation.expectedBidRatio
      ? profitability.valuation.expectedBidRatio * 100
      : 0

    // ── Fee % (tier 별) ────────────────────────────────────────
    const mgmtPct = 1.0
    const carryPct =
      r.tier === "BASE" ? 15
      : r.tier === "CONSERVATIVE" ? 10
      : r.tier === "SAVE-THE-DEAL" ? 5
      : 0
    const tierNote = L.tierNote[r.tier] || L.tierNote.BASE

    // ── Collateral 풋터 ────────────────────────────────────────
    const seniorTotalKrw = input.rightsSummary?.seniorTotal ?? 0
    const collateralLtv = appraisalUsd > 0
      ? Math.round((purchasePriceUsd / appraisalUsd) * 1000) / 10
      : 0
    const collateralFooter = [
      propertyType ? `${propertyType}(${region})` : region,
      `${L.pAppraisal} ${fmtCcy(appraisalUsd)}`,
      collateralLtv > 0 ? `${L.pLTV.replace("(LTV)", "").replace(/Pledge LTV|質権 LTV/, "")} ${collateralLtv.toFixed(1)}%`.trim() : "",
      seniorTotalKrw > 0
        ? `${useKRW ? "선순위" : (lang === "ja" ? "先順位" : "Senior")} ${fmtCcy(seniorTotalKrw / fx)}`
        : (useKRW ? "선순위 없음" : (lang === "ja" ? "先順位なし" : "No senior")),
    ].filter(Boolean).join(" · ")

    // ── Risk Factor 메시지 ────────────────────────────────────
    const riskFactors = (() => {
      const baseEn = `Bid ratio ${expectedBidRatioPct.toFixed(1)}% applied`
      const baseKo = `낙찰가율 ${expectedBidRatioPct.toFixed(1)}% 시나리오 적용`
      const baseJa = `落札率 ${expectedBidRatioPct.toFixed(1)}% 想定適用`
      const base = lang === "en" ? baseEn : lang === "ja" ? baseJa : baseKo
      if (lang === "en") {
        if (r.tier === "BASE") return `LOW: Stable recovery expected · ${base}`
        if (r.tier === "CONSERVATIVE") return `MODERATE: Manager concession on mgmt/carry · ${base}`
        if (r.tier === "SAVE-THE-DEAL") return `ELEVATED: Hurdle barely cleared after max concession · ${base}`
        return `HIGH: Not suitable for RWA — hurdle missed · ${base}`
      }
      if (lang === "ja") {
        if (r.tier === "BASE") return `低: 安定回収見込み · ${base}`
        if (r.tier === "CONSERVATIVE") return `中: 管理・成果報酬で運用会社譲歩 · ${base}`
        if (r.tier === "SAVE-THE-DEAL") return `やや高: 最大譲歩でハードル接近 · ${base}`
        return `高: ハードル未達でRWA不適合 · ${base}`
      }
      if (r.tier === "BASE") return `낮음: 안정적 회수 예상 · ${base}`
      if (r.tier === "CONSERVATIVE") return `보통: 관리·성과보수 양보로 LP 목표 ROI 달성 · ${base}`
      if (r.tier === "SAVE-THE-DEAL") return `주의: 운용사 최대 양보 후 hurdle 근접 · ${base}`
      return `높음: hurdle 미달로 RWA 출시 부적합 · ${base}`
    })()

    return {
      title,
      subtitle,
      status,
      caseNo: caseNo ?? "01",
      pageNo: pageNo ?? "—",
      // KPI raw
      dpuUnitDisplay,
      dpuReturnDisplay: useKRW
        ? fmtKRW(dpuReturnUsd * fx)
        : `$${dpuReturnUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      dpuProfitDisplay: useKRW
        ? `+ ${fmtKRW(dpuProfitUsd * fx, { with원: true })} ${L.profitWord}`
        : `+ ${fmtUSD(dpuProfitUsd, { withDollar: true })} ${L.profitWord}`,
      lpRoiPct: displayRoi * 100,
      lpIrrPct: displayIrr * 100,
      durationDays,
      aiScore,
      riskMeta,
      // Deal Parameters
      assetTypeText: propertyType ? `${propertyType} (${region || "—"})` : (region || "—"),
      locationDebtor: `${region || "—"} · ${debtorTypeLabel}`,
      ltvPct,
      purchasePriceText: fmtCcy(purchasePriceUsd),
      appraisalText: fmtCcy(appraisalUsd),
      auctionStartDate: auctionStart || "—",
      expectedBidRatioPct,
      lpInvestedText: fmtCcy(lpInvestedUsd),
      totalRecoveredText: fmtCcy(totalRecoveredUsd),
      operatingText: fmtCcy(operatingUsd),
      mgmtFeeText: fmtCcy(mgmtFeeUsd),
      mgmtPct,
      carryFeeText: fmtCcy(carryFeeUsd),
      carryPct,
      lpReceiptText: fmtCcy(lpReceiptUsd),
      lpDeltaText: fmtCcyDeltaWithDollar(lpDeltaUsd),
      // Simulator
      dpuProfitInline: useKRW
        ? fmtKRW(dpuProfitUsd * fx, { with원: true })
        : fmtUSD(dpuProfitUsd, { withDollar: true }),
      tier: r.tier,
      tierNote,
      // Lifecycle
      lifecycle: [
        { label: L.lcPurchase,   date: fmtDate(purchaseDate) },
        { label: L.lcAnalysis,   date: fmtDate(analysisDate) },
        { label: L.lcDpu,        date: fmtDate(analysisDate) },
        { label: L.lcWinBid,     date: fmtDate(winBid) },
        { label: L.lcSettlement, date: fmtDate(distribution) },
      ],
      // Bottom strip
      bottomKpi: [
        { label: L.bInvested,   value: fmtCcyShort(lpInvestedUsd) },
        { label: L.bRecovered,  value: fmtCcyShort(totalRecoveredUsd) },
        { label: L.bOperating,  value: fmtCcyShort(-operatingUsd), neg: true },
        { label: L.bXrfFees,    value: fmtCcyShort(-(mgmtFeeUsd + carryFeeUsd)), neg: true },
        { label: L.bLpReceived, value: fmtCcyShort(lpReceiptUsd) },
      ],
      // Footer
      collateralFooter,
      riskFactors,
      // For internal use
      _useKRW: useKRW,
      _toCcy: toCcy,
    }
  }, [report, xrfResult, pageNo, caseNo, lang, useKRW, L])

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
            AI : <span style={{ color: T.green }}>{data.aiScore.toFixed(1)}%</span>
          </span>
        </div>
        <div style={{ color: T.greenDim, fontWeight: 700 }}>
          {L.caseStudy} · {todayKst}
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
        <span>{L.confidential}</span>
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
              CASE {data.caseNo} · {data.status === "SETTLED" ? L.settled : data.status === "ACTIVE" ? L.active : L.pending}
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
            ★ {data.status === "SETTLED" ? L.settled : data.status === "ACTIVE" ? L.active : L.pending}
          </div>
        </div>
      </div>

      {/* ─── KPI Row (4 cards · LP ROI 카드에 IRR 동시 노출) ───── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Card 1: DPU RETURN */}
        <div style={kpiCellStyle(true)}>
          <div style={kpiLabelStyle}>{`1 DPU ${useKRW ? "회수액" : lang === "ja" ? "回収額" : "RETURN"} (${data.dpuUnitDisplay})`}</div>
          <div style={kpiValueStyle(T.green)}>{data.dpuReturnDisplay}</div>
          <div style={{ ...kpiHintStyle, color: T.green }}>{data.dpuProfitDisplay}</div>
        </div>

        {/* Card 2: LP ROI + IRR */}
        <div style={kpiCellStyle(true)}>
          <div style={kpiLabelStyle}>{`${L.lpRoi} / ${L.irr}`}</div>
          <div style={kpiValueStyle(T.green)}>{fmtPct(data.lpRoiPct)}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 11, color: T.textMuted, letterSpacing: "0.08em", fontWeight: 700 }}>
              {L.irr}
            </span>
            <span style={{
              fontSize: 16,
              fontWeight: 800,
              color: T.greenBright,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}>
              {fmtPct(data.lpIrrPct)}<span style={{ fontSize: 10, color: T.textMuted, marginLeft: 2 }}>/yr</span>
            </span>
          </div>
          <div style={{ ...kpiHintStyle, color: T.textDim, marginTop: 2 }}>{L.vsInvested}</div>
        </div>

        {/* Card 3: DURATION */}
        <div style={kpiCellStyle(true)}>
          <div style={kpiLabelStyle}>{L.duration}</div>
          <div style={kpiValueStyle(T.green)}>
            <span>{data.durationDays}</span>
            <span style={{ fontSize: 18, color: T.textDim, marginLeft: 4 }}>{useKRW ? "일" : lang === "ja" ? "日" : "D"}</span>
          </div>
          <div style={{ ...kpiHintStyle, color: T.textDim }}>{L.durationLabel(data.status)}</div>
        </div>

        {/* Card 4: AI RISK SCORE */}
        <div style={kpiCellStyle(false)}>
          <div style={kpiLabelStyle}>{L.aiRisk}</div>
          <div style={kpiValueStyle(T.green)}>
            <span>{Math.round(data.aiScore)}</span>
            <span style={{ fontSize: 18, color: T.textDim, marginLeft: 4 }}>/100</span>
          </div>
          <div style={{ ...kpiHintStyle, color: data.riskMeta.color }}>{data.riskMeta.label}</div>
        </div>
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
            {L.dealParamsPnl}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { label: L.pAssetType,             value: data.assetTypeText },
              { label: L.pLocationDebtor,        value: data.locationDebtor },
              { label: L.pLTV,                   value: data.ltvPct > 0 ? `${data.ltvPct}%` : "—" },
              { label: L.pPurchase,              value: data.purchasePriceText },
              { label: L.pAppraisal,             value: data.appraisalText },
              { label: L.pAuctionStartBidRatio,  value: `${data.auctionStartDate} · ${data.expectedBidRatioPct.toFixed(1)}%` },
              { label: L.pLpInvested,            value: data.lpInvestedText },
              { label: L.pTotalRecovered,        value: data.totalRecoveredText },
              { label: L.pOperating,             value: data.operatingText, minus: true },
              { label: L.pMgmt(data.mgmtPct),    value: data.mgmtFeeText, minus: true },
              { label: L.pCarry(data.carryPct),  value: data.carryFeeText, minus: true },
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
                  gap: 12,
                }}
              >
                <span style={{ color: T.textDim, letterSpacing: "-0.005em" }}>{p.label}</span>
                <span
                  style={{
                    color: p.minus ? T.warn : T.white,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
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
                gap: 12,
              }}
            >
              <span style={{ color: T.white, fontWeight: 700 }}>{L.pLpReceipt}</span>
              <span style={{ color: T.green, fontWeight: 800, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {data.lpReceiptText}{" "}
                <span style={{ color: T.greenDim, fontWeight: 700 }}>
                  ({data.lpDeltaText})
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
              {L.investmentSimulator}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: "0.10em", fontWeight: 700, marginBottom: 2 }}>
                  {L.invest}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.white, fontVariantNumeric: "tabular-nums" }}>
                  {data.dpuUnitDisplay}
                </div>
              </div>
              <div style={{ color: T.green, fontSize: 20 }}>→</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: "0.10em", fontWeight: 700, marginBottom: 2 }}>
                  {L.receive}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.green, fontVariantNumeric: "tabular-nums" }}>
                  {data.dpuReturnDisplay}
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
              {L.profitLine(data.dpuProfitInline, data.durationDays)}
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
              {L.tierBadge(data.tier)}
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
              {L.dealLifecycle}
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
          <span style={{ color: T.green, fontWeight: 800, letterSpacing: "0.10em" }}>{L.collateral}</span>
          <span>·</span>
          <span>{data.collateralFooter}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ color: T.green, fontWeight: 800, letterSpacing: "0.10em" }}>{L.riskFactors}</span>
          <span>·</span>
          <span>{data.riskFactors}</span>
        </div>
      </div>
    </section>
  )
}

/* ─── KPI cell style helpers ─────────────────────────────────────────── */
const kpiCellStyle = (rightBorder: boolean): React.CSSProperties => ({
  padding: "20px 22px",
  borderRight: rightBorder ? `1px solid ${T.border}` : "none",
  display: "flex",
  flexDirection: "column",
  gap: 6,
})
const kpiLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: T.textMuted,
  letterSpacing: "0.12em",
  fontWeight: 700,
}
const kpiValueStyle = (color: string): React.CSSProperties => ({
  fontSize: 30,
  fontWeight: 800,
  color,
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
})
const kpiHintStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
}
