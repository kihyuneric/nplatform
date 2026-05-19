"use client"

/**
 * XRF Terminal Section — Bloomberg-style 다크 터미널 케이스 스터디 뷰
 *
 * /analysis/report 페이지에서 valuationMode === 'XRF_TERMINAL' 일 때 렌더링.
 * 스크린샷(2026-05-19 사용자 제공) 의 "06/32 CASE 01 · SETTLED · 종로구 홍지동 토지" 화면을
 * 정밀 재현한다. 색상: 흑색 배경 + 네온 그린 (#10B981 / #34D399) 액센트.
 *
 * 데이터는 케이스 스터디 (settled deal) 의 정적 값으로 하드코딩.
 * 추후 다른 케이스를 노출하려면 `cases` 배열에 항목을 추가하면 된다.
 */

import { useMemo, useState } from "react"

/* ─── Design tokens ──────────────────────────────────────────────────── */
const T = {
  bg: "#0A0E14",           // 거의 검은 본문 배경
  bgPanel: "#0E1219",      // 패널 (살짝 밝은 톤)
  bgHeader: "#0B0F16",     // 상단 헤더 바
  bgRow: "#0D1118",        // 테이블 행
  bgRowAlt: "#11151C",     // 테이블 행 (대체)
  border: "#1A2230",       // 어두운 보더
  borderGreen: "#10B981",  // 네온 그린 보더
  borderGreenDim: "rgba(16, 185, 129, 0.35)",
  green: "#34D399",        // 메인 그린 (강조)
  greenBright: "#10B981",  // 더 진한 그린
  greenDim: "rgba(52, 211, 153, 0.65)",
  white: "#F4F6F8",
  textDim: "#9CA3AF",
  textMuted: "#6B7280",
  red: "#FB7185",
  warn: "#FBBF24",
}

/* ─── 케이스 스터디 데이터 (스크린샷 06/32) ──────────────────────────── */
type CaseStudy = {
  caseNo: string
  pageNo: string
  status: "SETTLED" | "ACTIVE" | "PENDING"
  title: string
  subtitle: string
  oneDpuReturn: string
  oneDpuProfit: string
  lpRoi: string
  duration: string
  durationLabel: string
  aiRisk: string
  aiRiskLabel: string
  // Deal parameters
  params: { label: string; value: string; emphasis?: boolean; minus?: boolean }[]
  lpReceipt: string
  lpReceiptDelta: string
  // Simulator
  invest: string
  receive: string
  profitLine: string
  tierBadge: string
  tierNote: string
  // Lifecycle
  lifecycle: { label: string; date: string }[]
  // Bottom KPI strip
  bottom: { label: string; value: string; neg?: boolean }[]
  // Footer
  collateral: string
  riskFactors: string
}

const DEFAULT_CASE: CaseStudy = {
  caseNo: "01",
  pageNo: "06 / 32",
  status: "SETTLED",
  title: "종로구 홍지동 토지 — 아시아프라퍼티",
  subtitle: "개인 차주 · 담보비율 75% · 토지 8필지 · 아시아프라퍼티",
  oneDpuReturn: "$1,259",
  oneDpuProfit: "+ $259 PROFIT",
  lpRoi: "+25.9%",
  duration: "502",
  durationLabel: "NPL → SETTLEMENT",
  aiRisk: "82",
  aiRiskLabel: "LOW RISK",
  params: [
    { label: "자산 유형", value: "토지 8필지 (종로구 홍지동)" },
    { label: "위치 / 차주", value: "서울 종로구 · 개인" },
    { label: "질권 담보비율 (LTV)", value: "75%" },
    { label: "매입가격", value: "USD 1,253,130" },
    { label: "감정가", value: "USD 4,835,519" },
    { label: "경매개시결정일 / 낙찰가율", value: "2026-08-15 · 68.2%" },
    { label: "투자금 (LP)", value: "USD 510,353" },
    { label: "총 회수금", value: "USD 736,789" },
    { label: "(-) 운영비용", value: "USD 66,512", minus: true },
    { label: "(-) 관리보수 1%", value: "USD 13,302", minus: true },
    { label: "(-) 성과보수 15%", value: "USD 14,558", minus: true },
  ],
  lpReceipt: "USD 642,417",
  lpReceiptDelta: "+ $132,064",
  invest: "$1,000",
  receive: "$1,259",
  profitLine: "PROFIT: +$259 · 502D · RLUSD AUTO · 3–5 SEC",
  tierBadge: "★ BASE TIER",
  tierNote: "AI가 '좋은 딜'로 판단 → 운용사(XRF) 성과보수 15% 적용",
  lifecycle: [
    { label: "NPL 매입", date: "2026.06" },
    { label: "AI 분석", date: "2026.05" },
    { label: "DPU 발행", date: "2026.05" },
    { label: "경매 낙찰", date: "2027.08" },
    { label: "RLUSD 정산", date: "2027.10" },
  ],
  bottom: [
    { label: "INVESTED", value: "$510K" },
    { label: "RECOVERED", value: "$737K" },
    { label: "OPERATING", value: "-$67K", neg: true },
    { label: "XRF FEES (관리보수+성과보수)", value: "-$28K", neg: true },
    { label: "LP RECEIVED", value: "$642K" },
  ],
  collateral: "토지 8필지(종로) · 감정가 USD 4,835,519 · 담보비율 60.1% · 선순위 없음",
  riskFactors: "MODERATE: 토지 분할매각 시 유찰 가능 · 감정가 대비 68.2% 낙찰 달성",
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function XrfTerminalSection() {
  const data = DEFAULT_CASE

  // 헤더 라이브 ticker — XRPL/RLUSD/AI 메트릭 약간의 무빙 (UX 디테일)
  const [aiPct] = useState(82.8)

  // 현재 시간 표시 (KST)
  const kst = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10) + " KST"
  }, [])

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: T.greenBright }}>
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
          CASE STUDY · {kst}
        </div>
      </div>

      {/* Sub header (CONFIDENTIAL + page no) */}
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
          <div>
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
          { label: "1 DPU RETURN", value: data.oneDpuReturn, hint: data.oneDpuProfit, hintColor: T.green },
          { label: "LP ROI", value: data.lpRoi, hint: "VS USD INVESTED", hintColor: T.textDim, valueColor: T.green },
          { label: "DURATION", value: <><span>{data.duration}</span><span style={{ fontSize: 18, color: T.textDim, marginLeft: 4 }}>D</span></>, hint: data.durationLabel, hintColor: T.textDim },
          { label: "AI RISK SCORE", value: <><span>{data.aiRisk}</span><span style={{ fontSize: 18, color: T.textDim, marginLeft: 4 }}>/100</span></>, hint: data.aiRiskLabel, hintColor: T.green },
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
            {data.params.map((p, i) => (
              <div
                key={p.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "9px 0",
                  borderBottom:
                    i < data.params.length - 1
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
                {data.lpReceipt}{" "}
                <span style={{ color: T.greenDim, fontWeight: 700 }}>({data.lpReceiptDelta})</span>
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
                  {data.invest}
                </div>
              </div>
              <div style={{ color: T.green, fontSize: 20 }}>→</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9.5, color: T.textMuted, letterSpacing: "0.10em", fontWeight: 700, marginBottom: 2 }}>
                  RECEIVE
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.green, fontVariantNumeric: "tabular-nums" }}>
                  {data.receive}
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
              {data.profitLine}
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
              {data.tierBadge}
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
        {data.bottom.map((b, i) => (
          <div
            key={b.label}
            style={{
              padding: "16px 18px",
              borderRight: i < data.bottom.length - 1 ? `1px solid ${T.border}` : "none",
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
          <span>{data.collateral}</span>
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
