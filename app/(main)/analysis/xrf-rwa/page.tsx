"use client"

/**
 * /analysis/xrf-rwa — XRF RWA Report (LP 투자자용)
 *
 * LP 투자자가 "얼마 투자 → 얼마 수익 (몇 일)" 즉시 파악 가능한 클린 리포트.
 *
 * 섹션:
 *   0. 입력 파라미터 (시나리오 조정)
 *   1. LP 투자 요약 Hero
 *   2. POOL 구조 + RWA 발행
 *   3. CASH FLOW 타임라인
 *   4. KEY METRICS
 *   5. FUND METRICS — XRF vs 산업 표준
 *   6. SENSITIVITY 분석 (단일 변수)
 */

import { useMemo, useState } from "react"
import { computeXrfValuation } from "@/lib/xrf/valuation"
import {
  computeFundMetrics,
  computeIndustryBenchmark,
} from "@/lib/xrf/metrics"
import { buildXrfRwaSummary, buildXrfRwaSummaryEn } from "@/lib/xrf/summary"

// ── 색상 팔레트 ────────────────────────────────────────────────────────────
const NAVY    = '#1B3A5C'
const EMERALD = '#10B981'
const BLUE    = '#2E75B6'
const AMBER   = '#F59E0B'
const BG_SOFT = '#F8FAFC'
const BG_CARD = '#FFFFFF'
const BORDER  = '#E2E8F0'
const TEXT_PRI = '#0F172A'
const TEXT_SEC = '#64748B'
const TEXT_MUT = '#94A3B8'

// ── 기본 입력값 (강남 상가 XRF Case) ─────────────────────────────────────
const DEFAULT = {
  purchasePriceKRW:  2_800_000_000,  // 28억 — NPL 매입가
  totalEquityKRW:      585_640_973,  // 5.856억 — LP funding base
  netProfitKRW:        380_000_000,  // 3.8억 — 예상 순수익
  holdingDays:                  540, // ~18개월
  fxRate:                     1_300, // KRW / USD
}

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────────
const fmt$ = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
const fmtKRW = (v: number) => {
  const eok = v / 1e8
  if (Math.abs(eok) >= 1) return `₩${eok.toFixed(2)}억`
  return `₩${(v / 1e4).toFixed(0)}만`
}
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`
const fmtPct1 = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtX = (v: number) => `${v.toFixed(2)}×`

// ── SENSITIVITY 변수 타입 ─────────────────────────────────────────────────
type SensVar = 'netProfit' | 'holdingDays' | 'purchasePrice'
const SENS_LABELS: Record<SensVar, string> = {
  netProfit:     '예상 순수익',
  holdingDays:   '운용 기간 (일)',
  purchasePrice: 'NPL 매입가',
}
const SENS_DELTAS = [-0.20, -0.10, 0, +0.10, +0.20]

// ── UI 컴포넌트 ──────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.01em' }}>
        {children}
      </h2>
      {sub && <p style={{ fontSize: 11, color: TEXT_MUT, margin: '2px 0 0', fontWeight: 500 }}>{sub}</p>}
    </div>
  )
}

function MetricBox({
  label, value, sub, accent, large,
}: { label: string; value: string; sub?: string; accent?: string; large?: boolean }) {
  return (
    <div style={{
      background: BG_SOFT, borderRadius: 10, padding: '14px 16px',
      border: `1px solid ${BORDER}`,
      flex: 1, minWidth: 120,
    }}>
      <p style={{ fontSize: 10, color: TEXT_SEC, margin: 0, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: large ? 26 : 20, fontWeight: 900, color: accent ?? TEXT_PRI, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 10, color: TEXT_MUT, margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

function TableRow({
  label, value, note, bold, last, highlight,
}: {
  label: string; value: string; note?: string; bold?: boolean; last?: boolean; highlight?: boolean
}) {
  return (
    <tr style={{ borderBottom: last ? 'none' : `1px solid ${BORDER}`, background: highlight ? '#EFF6FF' : 'transparent' }}>
      <td style={{ padding: '9px 12px', fontSize: 12, color: bold ? TEXT_PRI : TEXT_SEC, fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={{ padding: '9px 12px', fontSize: 12, color: bold ? TEXT_PRI : TEXT_SEC, fontWeight: bold ? 700 : 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
      {note !== undefined && (
        <td style={{ padding: '9px 12px', fontSize: 10, color: TEXT_MUT, textAlign: 'right' }}>{note}</td>
      )}
    </tr>
  )
}

// ── 슬라이더 래퍼 ─────────────────────────────────────────────────────────
function SliderRow({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600, width: 110, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: NAVY }}
      />
      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRI, width: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {display}
      </span>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default function XrfRwaPage() {
  // ── 입력 파라미터 state ───────────────────────────────────────────────
  const [purchasePriceKRW, setPurchasePriceKRW] = useState(DEFAULT.purchasePriceKRW)
  const [totalEquityKRW,   setTotalEquityKRW]   = useState(DEFAULT.totalEquityKRW)
  const [netProfitKRW,     setNetProfitKRW]     = useState(DEFAULT.netProfitKRW)
  const [holdingDays,      setHoldingDays]      = useState(DEFAULT.holdingDays)
  const [fxRate,           setFxRate]           = useState(DEFAULT.fxRate)
  const [rwaPriceUSD,      setRwaPriceUSD]      = useState<100 | 1000 | 10000>(1000)
  const [sensVar,          setSensVar]          = useState<SensVar>('netProfit')

  // ── XRF 계산 ─────────────────────────────────────────────────────────
  const result = useMemo(() => computeXrfValuation({
    nplPurchasePriceKRW: purchasePriceKRW,
    nplTotalEquityKRW:   totalEquityKRW,
    nplNetProfitKRW:     netProfitKRW,
    holdingPeriodDays:   holdingDays,
    exchangeRateKRWPerUSD: fxRate,
  }), [purchasePriceKRW, totalEquityKRW, netProfitKRW, holdingDays, fxRate])

  // ── Pool / RWA ───────────────────────────────────────────────────────
  const fixedFeesUSD = useMemo(() =>
    result.fees.xrfMgmtUSD +
    result.fees.xrfSetupUSD +
    result.fees.platformMarginUSD +
    result.fees.servicingUSD
  , [result])
  const displayPoolUSD = result.nplTotalEquityUSD + fixedFeesUSD
  const numRwa = Math.max(1, Math.round(displayPoolUSD / rwaPriceUSD))
  const perRwaProfit = result.lpNetProfitUSD / numRwa

  // ── Fund Metrics ─────────────────────────────────────────────────────
  const lpDistributionUSD = result.lpCapitalUSD + result.lpNetProfitUSD
  const totalVehicleFeesUSD =
    result.fees.xrfTotalUSD + result.fees.platformTotalUSD + result.fees.servicingUSD
  const metrics = useMemo(() => computeFundMetrics({
    lpCapitalUSD:       result.lpCapitalUSD,
    lpDistributionUSD,
    holdingPeriodDays:  holdingDays,
    nplPurchaseUSD:     result.nplPurchaseUSD,
    nplNetProfitUSD:    result.nplNetProfitUSD,
    totalVehicleFeesUSD,
    hurdleRateYr:       0.08,
  }), [result, lpDistributionUSD, holdingDays, totalVehicleFeesUSD])

  const benchmark = useMemo(() =>
    computeIndustryBenchmark(0.08, result.durationYr)
  , [result.durationYr])

  // ── AI 총평 (XRF RWA LP 전용) ────────────────────────────────────────────
  const [summaryLang, setSummaryLang] = useState<'ko' | 'en'>('ko')
  const summaryArgs = useMemo(() => ({
    result,
    metrics,
    displayPoolUSD,
    numRwa,
    rwaPriceUSD,
    perRwaProfit,
    benchmark,
  }), [result, metrics, displayPoolUSD, numRwa, rwaPriceUSD, perRwaProfit, benchmark])
  const summaryKo   = useMemo(() => buildXrfRwaSummary(summaryArgs),   [summaryArgs])
  const summaryEn   = useMemo(() => buildXrfRwaSummaryEn(summaryArgs), [summaryArgs])
  const summaryText = summaryLang === 'ko' ? summaryKo : summaryEn

  // ── Sensitivity ──────────────────────────────────────────────────────
  const sensRows = useMemo(() =>
    SENS_DELTAS.map(delta => {
      let input = {
        nplPurchasePriceKRW: purchasePriceKRW,
        nplTotalEquityKRW:   totalEquityKRW,
        nplNetProfitKRW:     netProfitKRW,
        holdingPeriodDays:   holdingDays,
        exchangeRateKRWPerUSD: fxRate,
      }
      if (sensVar === 'netProfit')     input = { ...input, nplNetProfitKRW:    Math.round(netProfitKRW    * (1 + delta)) }
      if (sensVar === 'holdingDays')   input = { ...input, holdingPeriodDays:  Math.round(holdingDays    * (1 + delta)) }
      if (sensVar === 'purchasePrice') input = { ...input, nplPurchasePriceKRW: Math.round(purchasePriceKRW * (1 + delta)) }
      const r = computeXrfValuation(input)
      return {
        delta,
        lpRoi:    r.lpRoi,
        lpIrrYr:  r.lpIrrYr,
        netProfit: r.lpNetProfitUSD,
        isBase:   delta === 0,
      }
    })
  , [sensVar, purchasePriceKRW, totalEquityKRW, netProfitKRW, holdingDays, fxRate])

  // ── Carry 설명 ────────────────────────────────────────────────────────
  const hurdleUSD = result.hurdleUSD
  const carryUSD  = result.fees.xrfCarryUSD
  const tierLabel = result.tier === 'BASE' ? 'BASE (최적)' :
                    result.tier === 'CONSERVATIVE' ? 'CONSERVATIVE' :
                    result.tier === 'SAVE-THE-DEAL' ? 'SAVE-THE-DEAL' : 'REJECT'
  const carryEntryRatePct = result.tier === 'BASE' ? 15 :
                            result.tier === 'CONSERVATIVE' ? 10 : 5

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 80px', fontFamily: 'inherit' }}>

      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, background: EMERALD, color: '#fff', padding: '2px 8px', borderRadius: 4 }}>XRF RWA REPORT</span>
          <span style={{ fontSize: 10, color: TEXT_MUT }}>Investor LP Summary · 투자자 수익 요약</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: NAVY, margin: 0, letterSpacing: '-0.02em' }}>
          XRF RWA — LP 투자 리포트
        </h1>
        <p style={{ fontSize: 12, color: TEXT_SEC, margin: '4px 0 0' }}>
          얼마를 투자해서, 얼마를, 몇 일 안에 받는가 — 핵심 수익 구조만 정리합니다.
        </p>
      </div>

      {/* ───── 0. 입력 파라미터 ───── */}
      <Card style={{ marginBottom: 20, background: '#F0F7FF', borderColor: '#BFDBFE' }}>
        <SectionTitle sub="슬라이더로 시나리오를 조정하면 모든 수치가 즉시 반영됩니다">
          입력 파라미터 (시나리오 조정)
        </SectionTitle>
        <SliderRow
          label="NPL 매입가"
          value={purchasePriceKRW}
          min={500_000_000} max={5_000_000_000} step={50_000_000}
          onChange={setPurchasePriceKRW}
          display={fmtKRW(purchasePriceKRW)}
        />
        <SliderRow
          label="LP Equity (totalEquity)"
          value={totalEquityKRW}
          min={100_000_000} max={2_000_000_000} step={10_000_000}
          onChange={setTotalEquityKRW}
          display={fmtKRW(totalEquityKRW)}
        />
        <SliderRow
          label="예상 순수익"
          value={netProfitKRW}
          min={50_000_000} max={2_000_000_000} step={10_000_000}
          onChange={setNetProfitKRW}
          display={fmtKRW(netProfitKRW)}
        />
        <SliderRow
          label="운용 기간"
          value={holdingDays}
          min={180} max={1095} step={30}
          onChange={setHoldingDays}
          display={`${holdingDays}일 (${(holdingDays / 365).toFixed(1)}yr)`}
        />
        <SliderRow
          label="환율 (KRW/USD)"
          value={fxRate}
          min={1100} max={1600} step={10}
          onChange={setFxRate}
          display={`₩${fxRate.toLocaleString('en-US')}`}
        />

        {/* RWA 단가 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600, width: 110 }}>RWA 단가</span>
          {([100, 1000, 10000] as const).map(p => (
            <button
              key={p}
              onClick={() => setRwaPriceUSD(p)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: rwaPriceUSD === p ? NAVY : '#fff',
                color: rwaPriceUSD === p ? '#fff' : TEXT_SEC,
                border: `1px solid ${rwaPriceUSD === p ? NAVY : BORDER}`,
              }}
            >
              ${p.toLocaleString('en-US')}
            </button>
          ))}
          <span style={{ fontSize: 10, color: TEXT_MUT, marginLeft: 6 }}>
            → {numRwa.toLocaleString('en-US')} RWA 발행
          </span>
        </div>
      </Card>

      {/* ───── 1. LP 투자 요약 Hero ───── */}
      <Card style={{ marginBottom: 20, background: NAVY, border: 'none' }}>
        <div style={{ color: '#93C5FD', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>
          LP 투자 요약 · {tierLabel} Tier 적용
        </div>

        {/* 핵심: 투자 → 수익 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#93C5FD', fontWeight: 600, marginBottom: 2 }}>투자 (LP Capital)</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
              {fmt$(result.lpCapitalUSD)}
            </div>
            <div style={{ fontSize: 10, color: '#93C5FD' }}>{fmtKRW(result.nplTotalEquityUSD * fxRate)}</div>
          </div>
          <div style={{ fontSize: 32, color: EMERALD, fontWeight: 900 }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#93C5FD', fontWeight: 600, marginBottom: 2 }}>수익 (Net Profit)</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: EMERALD, letterSpacing: '-0.03em' }}>
              {fmt$(result.lpNetProfitUSD)}
            </div>
            <div style={{ fontSize: 10, color: '#93C5FD' }}>{fmtKRW(result.lpNetProfitUSD * fxRate)}</div>
          </div>
          <div style={{ fontSize: 32, color: '#93C5FD', fontWeight: 900 }}>⏱</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#93C5FD', fontWeight: 600, marginBottom: 2 }}>기간</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
              {holdingDays}일
            </div>
            <div style={{ fontSize: 10, color: '#93C5FD' }}>{result.durationYr.toFixed(1)}년</div>
          </div>
        </div>

        {/* ROI / IRR / Hurdle / Carry */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {[
            { l: 'LP ROI', v: fmtPct(result.lpRoi), s: '절대 수익률' },
            { l: 'LP IRR', v: `${fmtPct1(result.lpIrrYr)}/yr`, s: '연환산 수익률' },
            { l: 'Hurdle Rate', v: '8.00%/yr', s: 'LP 우선 수익률' },
            { l: 'Carry 발생 조건', v: `LP ROI ≥ ${fmtPct(result.fees.xrfCarryUSD > 0 ? 0.08 * result.durationYr : 0.08 * result.durationYr)}`, s: `${carryEntryRatePct}% entry (5-tier)` },
            { l: 'Carry 금액', v: carryUSD > 0 ? fmt$(carryUSD) : '$0 (미발생)', s: carryUSD > 0 ? `Hurdle ${fmt$(hurdleUSD)} 초과 시` : 'Hurdle 미달' },
          ].map(({ l, v, s }) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#93C5FD', fontWeight: 600, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{v}</div>
              <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* 1 RWA당 수익 */}
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.15)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)' }}>
          <span style={{ fontSize: 11, color: EMERALD, fontWeight: 700 }}>
            1 RWA (${rwaPriceUSD.toLocaleString('en-US')}) 당 수익:{' '}
            <span style={{ fontSize: 15 }}>{fmt$(perRwaProfit)}</span>
            {' '}· 총 {numRwa.toLocaleString('en-US')} RWA 발행
          </span>
        </div>
      </Card>

      {/* ───── 2. POOL 구조 ───── */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle sub="LP 청약 총액 = NPL 자기자본 + Vehicle Fees (Pool prefund)">
          POOL 구조 (Pool Structure)
        </SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <TableRow label="NPL 자기자본 (LP funding base)" value={fmt$(result.nplTotalEquityUSD)} note={fmtKRW(totalEquityKRW)} />
            <TableRow label="  ├ XRF 관리보수 (1%/yr)" value={fmt$(result.fees.xrfMgmtUSD)} note={`Pool prefund`} />
            <TableRow label="  ├ XRF SPV Setup (1회)" value={fmt$(result.fees.xrfSetupUSD)} note={`Pool prefund`} />
            <TableRow label="  ├ KOF KR Margin (0.5%)" value={fmt$(result.fees.platformMarginUSD)} note={`Pool prefund`} />
            <TableRow label="  ├ NPL VC Servicing (2%)" value={fmt$(result.fees.servicingUSD)} note={`Pool prefund`} />
            <TableRow label="  └ AI Sourcing (1.5%)" value={fmt$(result.fees.platformAiUSD)} note="NPL profit 차감 · Pool 제외" />
            <TableRow label="Pool 총액 (= LP 청약액)" value={fmt$(displayPoolUSD)} bold />
            <TableRow label="RWA 발행" value={`${numRwa.toLocaleString('en-US')} RWA × $${rwaPriceUSD.toLocaleString('en-US')}`} note={fmt$(displayPoolUSD)} bold last />
          </tbody>
        </table>
      </Card>

      {/* ───── 3. CASH FLOW 타임라인 ───── */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle sub="LP 자금 흐름 · 투자 → 운용 → 회수">
          CASH FLOW 타임라인
        </SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              phase: 'Day 0',
              event: 'LP capital call (RWA 100% 청약 송금)',
              amount: -result.lpCapitalUSD,
              cumulative: -result.lpCapitalUSD,
              note: `${numRwa.toLocaleString('en-US')} RWA × ${fmt$(rwaPriceUSD)}`,
              color: '#EF4444',
            },
            {
              phase: 'Day 0~30',
              event: 'XRF SPV Setup · NPL 매입 실행',
              amount: 0,
              cumulative: -result.lpCapitalUSD,
              note: 'Pool → NPL 매입가 funding',
              color: TEXT_MUT,
            },
            {
              phase: '운용 중',
              event: 'XRF/KOF/NPL VC fees 정산',
              amount: -(result.fees.xrfMgmtUSD + result.fees.xrfSetupUSD + result.fees.platformMarginUSD + result.fees.servicingUSD),
              cumulative: -result.lpCapitalUSD - (result.fees.xrfMgmtUSD + result.fees.xrfSetupUSD + result.fees.platformMarginUSD + result.fees.servicingUSD),
              note: `Pool prefund 차감 · AI Sourcing ${fmt$(result.fees.platformAiUSD)} NPL profit 차감`,
              color: AMBER,
            },
            {
              phase: `Day ${holdingDays}`,
              event: '법원 경매 배당 · LP 분배',
              amount: result.lpCapitalUSD + result.lpNetProfitUSD,
              cumulative: result.lpNetProfitUSD,
              note: `Capital ${fmt$(result.lpCapitalUSD)} + Net Profit ${fmt$(result.lpNetProfitUSD)}`,
              color: EMERALD,
            },
            {
              phase: 'LP 최종',
              event: `순수익 (RLUSD 분배) — ROI ${fmtPct(result.lpRoi)} · IRR ${fmtPct1(result.lpIrrYr)}/yr`,
              amount: 0,
              cumulative: result.lpNetProfitUSD,
              note: `1 RWA당 ${fmt$(perRwaProfit)}`,
              color: EMERALD,
              bold: true,
            },
          ].map(({ phase, event, amount, cumulative, note, color, bold }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 72, flexShrink: 0, fontSize: 10, fontWeight: 700,
                color: '#fff', background: color, borderRadius: 6,
                padding: '4px 8px', textAlign: 'center', marginTop: 2,
              }}>{phase}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: bold ? 800 : 500, color: TEXT_PRI }}>{event}</div>
                {note && <div style={{ fontSize: 10, color: TEXT_MUT, marginTop: 1 }}>{note}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {amount !== 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: amount < 0 ? '#EF4444' : EMERALD, fontVariantNumeric: 'tabular-nums' }}>
                    {amount < 0 ? '' : '+'}{fmt$(amount)}
                  </div>
                )}
                <div style={{ fontSize: 10, color: TEXT_MUT, fontVariantNumeric: 'tabular-nums' }}>
                  누계 {cumulative >= 0 ? '+' : ''}{fmt$(cumulative)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ───── 4. KEY METRICS ───── */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle sub="LP 투자 핵심 지표 5종">KEY METRICS</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <MetricBox label="Net DPI" value={fmtX(metrics.dpi)} sub="LP 분배 / LP 출자" accent={NAVY} large />
          <MetricBox label="LP IRR (XIRR)" value={`${fmtPct1(metrics.xirr)}/yr`} sub="연환산 복리" accent={BLUE} />
          <MetricBox label="Hurdle Spread" value={fmtPct(metrics.hurdleSpread)} sub={`XIRR − 8%/yr`} accent={metrics.hurdleSpread > 0 ? EMERALD : '#EF4444'} />
          <MetricBox label="Gross MoM (Asset)" value={fmtX(metrics.grossMomAsset)} sub="NPL 자산레벨 배수" />
          <MetricBox label="Vehicle Take-Rate" value={fmtPct(metrics.vehicleTakeRate)} sub="총 수수료 / NPL 순수익" />
        </div>
      </Card>

      {/* ───── 5. FUND METRICS — XRF vs 산업 표준 ───── */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle sub="Cambridge Associates · Preqin · ILPA 벤치마크 기준">
          FUND METRICS — XRF Vehicle vs 산업 표준
        </SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {['지표', 'XRF Vehicle (이 딜)', '업계 중간값', '업계 상위 25%'].map((h, i) => (
                <th key={h} style={{ padding: '8px 12px', color: '#fff', fontWeight: 700, textAlign: i === 0 ? 'left' : 'right', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: 'IRR (연환산)',
                xrf: `${fmtPct1(metrics.xirr)}/yr`,
                med: `${fmtPct1(benchmark.median.irr)}/yr`,
                top: `${fmtPct1(benchmark.topQuartile.irr)}/yr`,
                xrfRaw: metrics.xirr,
                medRaw: benchmark.median.irr,
              },
              {
                label: 'Net DPI (MoM)',
                xrf: fmtX(metrics.dpi),
                med: fmtX(benchmark.median.mom),
                top: fmtX(benchmark.topQuartile.mom),
                xrfRaw: metrics.dpi,
                medRaw: benchmark.median.mom,
              },
              {
                label: 'Hurdle Spread',
                xrf: fmtPct(metrics.hurdleSpread),
                med: fmtPct(benchmark.median.irr - 0.08),
                top: fmtPct(benchmark.topQuartile.irr - 0.08),
                xrfRaw: metrics.hurdleSpread,
                medRaw: benchmark.median.irr - 0.08,
              },
            ].map(({ label, xrf, med, top, xrfRaw, medRaw }, i) => (
              <tr key={label} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 ? BG_SOFT : BG_CARD }}>
                <td style={{ padding: '9px 12px', fontSize: 12, color: TEXT_SEC }}>{label}</td>
                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 800, color: xrfRaw >= medRaw ? EMERALD : AMBER, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {xrf} {xrfRaw >= medRaw ? '✓' : '△'}
                </td>
                <td style={{ padding: '9px 12px', fontSize: 12, color: TEXT_SEC, textAlign: 'right' }}>{med}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, color: TEXT_SEC, textAlign: 'right' }}>{top}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 10, color: TEXT_MUT, marginTop: 8 }}>
          ✓ 업계 중간값 이상 · △ 중간값 미만 · 운용기간 {result.durationYr.toFixed(1)}yr 기준 복리 환산
        </p>
      </Card>

      {/* ───── 6. SENSITIVITY 분석 ───── */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle sub="단일 변수 ±20% 변동 시 LP ROI · IRR 변화">
          SENSITIVITY 분석
        </SectionTitle>

        {/* 변수 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {(Object.entries(SENS_LABELS) as [SensVar, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSensVar(k)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: sensVar === k ? BLUE : '#fff',
                color: sensVar === k ? '#fff' : TEXT_SEC,
                border: `1px solid ${sensVar === k ? BLUE : BORDER}`,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: BG_SOFT }}>
              {['변동', '변수값', 'LP ROI', 'LP IRR/yr', 'LP 순수익'].map((h, i) => (
                <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: TEXT_SEC, textAlign: i === 0 ? 'left' : 'right', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sensRows.map(({ delta, lpRoi, lpIrrYr, netProfit, isBase }) => {
              let varDisplay = ''
              const baseVal = sensVar === 'netProfit' ? netProfitKRW :
                              sensVar === 'holdingDays' ? holdingDays :
                              purchasePriceKRW
              const varVal = Math.round(baseVal * (1 + delta))
              varDisplay = sensVar === 'holdingDays' ? `${varVal}일` : fmtKRW(varVal)
              return (
                <tr key={delta} style={{
                  borderBottom: `1px solid ${BORDER}`,
                  background: isBase ? '#ECFDF5' : 'transparent',
                  fontWeight: isBase ? 700 : 400,
                }}>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: delta < 0 ? '#EF4444' : delta > 0 ? EMERALD : TEXT_PRI }}>
                    {delta === 0 ? '기준 (Base)' : delta > 0 ? `+${(delta * 100).toFixed(0)}%` : `${(delta * 100).toFixed(0)}%`}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: TEXT_SEC, textAlign: 'right' }}>{varDisplay}</td>
                  <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: lpRoi >= 0.15 ? EMERALD : lpRoi >= 0.05 ? AMBER : '#EF4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPct(lpRoi)}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: TEXT_PRI, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPct1(lpIrrYr)}/yr
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: netProfit >= 0 ? EMERALD : '#EF4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt$(netProfit)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 10, color: TEXT_MUT, marginTop: 6 }}>
          ROI 색상: 초록 ≥15% · 노랑 5~15% · 빨강 {'<'}5% | Tier 자동 선정 기준 적용
        </p>
      </Card>

      {/* ───── 7. AI 총평 ───── */}
      <Card style={{ marginBottom: 20, borderColor: NAVY }}>
        {/* 헤더 + 언어 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>AI 총평</h2>
            <p style={{ fontSize: 10, color: TEXT_MUT, margin: '2px 0 0' }}>
              위 XRF RWA 리포트 데이터만을 기반으로 생성 · 입력 파라미터 변경 시 즉시 재생성
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['ko', 'en'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setSummaryLang(lang)}
                style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: summaryLang === lang ? NAVY : '#fff',
                  color: summaryLang === lang ? '#fff' : TEXT_SEC,
                  border: `1px solid ${summaryLang === lang ? NAVY : BORDER}`,
                }}
              >
                {lang === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* 총평 본문 — 5단락 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {summaryText.split('\n\n').map((para, i) => {
            const isLead = i === 0
            const verdictColor =
              para.startsWith('[BUY]') ? EMERALD :
              para.startsWith('[HOLD]') ? AMBER :
              para.startsWith('[AVOID]') ? '#EF4444' : TEXT_PRI
            return (
              <div key={i} style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: isLead ? (
                  para.startsWith('[BUY]') ? '#ECFDF5' :
                  para.startsWith('[HOLD]') ? '#FFFBEB' : '#FEF2F2'
                ) : BG_SOFT,
                borderLeft: isLead ? `3px solid ${verdictColor}` : `2px solid ${BORDER}`,
              }}>
                <p style={{
                  fontSize: isLead ? 13 : 12,
                  fontWeight: isLead ? 700 : 400,
                  color: isLead ? verdictColor : TEXT_PRI,
                  margin: 0,
                  lineHeight: 1.7,
                }}>
                  {para}
                </p>
              </div>
            )
          })}
        </div>

        {/* 생성 기준 메타 */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#F0F7FF', borderRadius: 6, fontSize: 10, color: TEXT_MUT }}>
          <span style={{ fontWeight: 600, color: TEXT_SEC }}>생성 기준:</span>{' '}
          LP ROI {(result.lpRoi * 100).toFixed(2)}% · IRR {(result.lpIrrYr * 100).toFixed(1)}%/yr · Pool {fmt$(displayPoolUSD)} · RWA {numRwa.toLocaleString('en-US')}개 × ${rwaPriceUSD.toLocaleString('en-US')} · Hurdle 8%/yr · Carry {result.fees.xrfCarryUSD > 0 ? `${fmt$(result.fees.xrfCarryUSD)} 발동` : '$0 (미발생)'}
          · 운용 {holdingDays}일 · 환율 ₩{fxRate.toLocaleString('en-US')}
        </div>
      </Card>

      {/* 하단 면책 */}
      <p style={{ fontSize: 10, color: TEXT_MUT, textAlign: 'center', marginTop: 16 }}>
        본 리포트는 시뮬레이션 목적의 예시입니다. 실제 투자 수익은 시장 상황에 따라 달라질 수 있습니다.
        XRF v9 Fee System · KRW/USD {fxRate.toLocaleString('en-US')} 환율 기준
      </p>
    </div>
  )
}
