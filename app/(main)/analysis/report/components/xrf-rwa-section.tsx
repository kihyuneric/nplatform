"use client"

/**
 * XRF RWA Section — LP 투자자용 인라인 리포트
 *
 * /analysis/report 보고서 내 [XRF RWA] 버튼 클릭 시 렌더.
 * 입력 파라미터는 보고서의 listing 데이터 고정값 사용 (슬라이더 없음).
 *
 * 섹션:
 *   1. LP 투자 요약 Hero
 *   2. POOL 구조 + RWA 발행
 *   3. CASH FLOW 타임라인
 *   4. KEY METRICS
 *   5. FUND METRICS — XRF vs 산업 표준
 *   6. SENSITIVITY 분석 (단일 변수)
 *   7. AI 총평 (XRF RWA 데이터만 사용)
 */

import { useMemo, useState } from "react"
import { computeXrfValuation } from "@/lib/xrf/valuation"
import { computeFundMetrics, computeIndustryBenchmark } from "@/lib/xrf/metrics"
import { buildXrfRwaSummary, buildXrfRwaSummaryEn } from "@/lib/xrf/summary"
import { PropertyCollateralAnalysis } from "./property-collateral-analysis"

interface XrfRwaSectionProps {
  nplPurchasePriceKRW: number
  nplTotalEquityKRW:   number
  nplNetProfitKRW:     number
  holdingPeriodDays:   number
  assetTitle?:         string
  /** 담보 부동산 주소 (AI 분석 전달용 — UI 미노출) */
  address?:            string
}

// ── 팔레트 ────────────────────────────────────────────────────────────────
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

const fmt$ = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
const fmtPct  = (v: number) => `${(v * 100).toFixed(2)}%`
const fmtPct1 = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtX    = (v: number) => `${v.toFixed(2)}×`

type SensVar = 'netProfit' | 'holdingDays' | 'purchasePrice'
const SENS_LABELS: Record<SensVar, string> = {
  netProfit:     '예상 순수익',
  holdingDays:   '운용 기간',
  purchasePrice: 'NPL 매입가',
}
const SENS_DELTAS = [-0.20, -0.10, 0, +0.10, +0.20]

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: '20px 24px', marginBottom: 16,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Sec({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: 0 }}>{title}</h3>
      {sub && <p style={{ fontSize: 10, color: TEXT_MUT, margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

function TR({
  label, value, note, bold, last,
}: { label: string; value: string; note?: string; bold?: boolean; last?: boolean }) {
  return (
    <tr style={{ borderBottom: last ? 'none' : `1px solid ${BORDER}` }}>
      <td style={{ padding: '8px 10px', fontSize: 12, color: bold ? TEXT_PRI : TEXT_SEC, fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={{ padding: '8px 10px', fontSize: 12, color: bold ? TEXT_PRI : TEXT_SEC, fontWeight: bold ? 700 : 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
      {note !== undefined && <td style={{ padding: '8px 10px', fontSize: 10, color: TEXT_MUT, textAlign: 'right' }}>{note}</td>}
    </tr>
  )
}

export default function XrfRwaSection({
  nplPurchasePriceKRW,
  nplTotalEquityKRW,
  nplNetProfitKRW,
  holdingPeriodDays,
  assetTitle,
  address,
}: XrfRwaSectionProps) {
  const [rwaPriceUSD, setRwaPriceUSD] = useState<100 | 1000 | 10000>(1000)
  const [sensVar,     setSensVar]     = useState<SensVar>('netProfit')
  const [summaryLang, setSummaryLang] = useState<'ko' | 'en'>('ko')

  const FX = 1300

  // ── XRF 계산 ─────────────────────────────────────────────────────────────
  const result = useMemo(() => computeXrfValuation({
    nplPurchasePriceKRW,
    nplTotalEquityKRW,
    nplNetProfitKRW,
    holdingPeriodDays,
    exchangeRateKRWPerUSD: FX,
  }), [nplPurchasePriceKRW, nplTotalEquityKRW, nplNetProfitKRW, holdingPeriodDays])

  // ── Pool / RWA ─────────────────────────────────────────────────────────────
  const fixedFeesUSD = result.fees.xrfMgmtUSD + result.fees.xrfSetupUSD +
                       result.fees.platformMarginUSD + result.fees.servicingUSD
  const displayPoolUSD = result.nplTotalEquityUSD + fixedFeesUSD
  const numRwa = Math.max(1, Math.round(displayPoolUSD / rwaPriceUSD))
  const perRwaProfit = result.lpNetProfitUSD / numRwa

  // ── Fund Metrics ───────────────────────────────────────────────────────────
  const lpDistributionUSD  = result.lpCapitalUSD + result.lpNetProfitUSD
  const totalVehicleFeesUSD = result.fees.xrfTotalUSD + result.fees.platformTotalUSD + result.fees.servicingUSD
  const metrics = useMemo(() => computeFundMetrics({
    lpCapitalUSD: result.lpCapitalUSD, lpDistributionUSD,
    holdingPeriodDays, nplPurchaseUSD: result.nplPurchaseUSD,
    nplNetProfitUSD: result.nplNetProfitUSD, totalVehicleFeesUSD, hurdleRateYr: 0.08,
  }), [result, lpDistributionUSD, holdingPeriodDays, totalVehicleFeesUSD])

  const benchmark = useMemo(() => computeIndustryBenchmark(0.08, result.durationYr), [result.durationYr])

  // ── Sensitivity ─────────────────────────────────────────────────────────────
  const sensRows = useMemo(() =>
    SENS_DELTAS.map(delta => {
      let inp = { nplPurchasePriceKRW, nplTotalEquityKRW, nplNetProfitKRW, holdingPeriodDays, exchangeRateKRWPerUSD: FX }
      if (sensVar === 'netProfit')     inp = { ...inp, nplNetProfitKRW:     Math.round(nplNetProfitKRW     * (1 + delta)) }
      if (sensVar === 'holdingDays')   inp = { ...inp, holdingPeriodDays:   Math.round(holdingPeriodDays   * (1 + delta)) }
      if (sensVar === 'purchasePrice') inp = { ...inp, nplPurchasePriceKRW: Math.round(nplPurchasePriceKRW * (1 + delta)) }
      const r = computeXrfValuation(inp)
      return { delta, lpRoi: r.lpRoi, lpIrrYr: r.lpIrrYr, netProfit: r.lpNetProfitUSD, isBase: delta === 0 }
    })
  , [sensVar, nplPurchasePriceKRW, nplTotalEquityKRW, nplNetProfitKRW, holdingPeriodDays])

  // ── AI 총평 ────────────────────────────────────────────────────────────────
  const summaryArgs = useMemo(() => ({
    result, metrics, displayPoolUSD, numRwa, rwaPriceUSD, perRwaProfit, benchmark,
  }), [result, metrics, displayPoolUSD, numRwa, rwaPriceUSD, perRwaProfit, benchmark])
  const summaryText = summaryLang === 'ko'
    ? buildXrfRwaSummary(summaryArgs)
    : buildXrfRwaSummaryEn(summaryArgs)

  const verdict = result.lpRoi >= 0.15 ? 'BUY' : result.lpRoi >= 0.05 ? 'HOLD' : 'AVOID'
  const verdictColor = verdict === 'BUY' ? EMERALD : verdict === 'HOLD' ? AMBER : '#EF4444'

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── 1. LP 투자 요약 Hero ── */}
      <Card style={{ background: NAVY, border: 'none' }}>
        <div style={{ color: '#93C5FD', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>
          XRF RWA · LP 투자 요약
        </div>

        {/* 투자 → 수익 → 기간 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { lbl: '투자 (LP Capital)  Pool', val: fmt$(displayPoolUSD), sub: '', color: '#fff' },
            { lbl: '→', val: '', sub: '', color: EMERALD },
            { lbl: '수익 (Net Profit)', val: fmt$(result.lpNetProfitUSD), sub: `ROI ${fmtPct(result.lpRoi)}`, color: EMERALD },
            { lbl: '⏱', val: '', sub: '', color: '#93C5FD' },
            { lbl: '기간', val: `${holdingPeriodDays}일`, sub: `${result.durationYr.toFixed(1)}년`, color: '#fff' },
          ].map(({ lbl, val, sub, color }, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              {val ? (
                <>
                  <div style={{ fontSize: 10, color: '#93C5FD', fontWeight: 600, marginBottom: 2 }}>{lbl}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{val}</div>
                  {sub && <div style={{ fontSize: 10, color: '#93C5FD' }}>{sub}</div>}
                </>
              ) : (
                <div style={{ fontSize: 28, fontWeight: 900, color, padding: '0 4px' }}>{lbl}</div>
              )}
            </div>
          ))}
        </div>

        {/* 핵심 지표 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
          {[
            { l: 'LP IRR',       v: `${fmtPct1(result.lpIrrYr)}/yr` },
            { l: 'Hurdle Rate',  v: '8.00%/yr' },
            { l: 'Hurdle 금액',  v: fmt$(result.hurdleUSD) },
            { l: 'Carry',        v: result.fees.xrfCarryUSD > 0 ? fmt$(result.fees.xrfCarryUSD) : '$0 (미발생)' },
            { l: 'Carry entry',  v: `${result.tier === 'BASE' ? 15 : result.tier === 'CONSERVATIVE' ? 10 : 5}% (5-tier)` },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ fontSize: 9, color: '#93C5FD', fontWeight: 600, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* RWA 선택 + 1 RWA당 수익 */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#93C5FD', fontWeight: 600 }}>RWA 단가:</span>
          {([100, 1000, 10000] as const).map(p => (
            <button key={p} onClick={() => setRwaPriceUSD(p)} style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: rwaPriceUSD === p ? '#fff' : 'transparent',
              color: rwaPriceUSD === p ? NAVY : '#93C5FD',
              border: `1px solid ${rwaPriceUSD === p ? '#fff' : 'rgba(147,197,253,0.4)'}`,
            }}>
              ${p.toLocaleString('en-US')}
            </button>
          ))}
          <span style={{ fontSize: 10, color: EMERALD, fontWeight: 700, marginLeft: 4 }}>
            → {numRwa.toLocaleString('en-US')} RWA · 1 RWA당 {fmt$(perRwaProfit)}
          </span>
        </div>
      </Card>

      {/* ── 2. POOL 구조 ── */}
      <Card>
        <Sec title="POOL 구조 (Pool Structure)" sub="LP 청약 총액 = NPL 자기자본 + Vehicle Fees (Pool prefund)" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            <TR label="NPL 자기자본 (LP funding base)" value={fmt$(result.nplTotalEquityUSD)} />
            <TR label="XRF Vehicle Fees (Pool prefund)" value={fmt$(result.fees.xrfMgmtUSD + result.fees.xrfSetupUSD + result.fees.platformMarginUSD + result.fees.servicingUSD)} note="Pool prefund" />
            <TR label="Pool 총액 (= LP 청약액)" value={fmt$(displayPoolUSD)} bold />
            <TR label="RWA 발행" value={`${numRwa.toLocaleString('en-US')} RWA × $${rwaPriceUSD.toLocaleString('en-US')}`} note={`1 RWA당 ${fmt$(perRwaProfit)}`} bold last />
          </tbody>
        </table>
      </Card>

      {/* ── 3. CASH FLOW 타임라인 ── */}
      <Card>
        <Sec title="CASH FLOW 타임라인" sub="LP 자금 흐름 · 투자 → 운용 → 회수" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { phase: 'Day 0',     event: 'LP capital call (RWA 100% 청약)', amount: -result.lpCapitalUSD, cum: -result.lpCapitalUSD, note: `${numRwa.toLocaleString('en-US')} RWA × $${rwaPriceUSD.toLocaleString('en-US')}`, color: '#EF4444' },
            { phase: 'Day 0~30',  event: 'XRF SPV Setup · NPL 매입 실행',   amount: 0, cum: -result.lpCapitalUSD, note: 'Pool → NPL 매입가 funding', color: TEXT_MUT },
            { phase: '운용 중',   event: 'Vehicle fees 정산',                 amount: -(fixedFeesUSD), cum: -result.lpCapitalUSD - fixedFeesUSD, note: `AI Sourcing ${fmt$(result.fees.platformAiUSD)} NPL profit 차감`, color: AMBER },
            { phase: `Day ${holdingPeriodDays}`, event: '법원 배당 · LP 분배', amount: result.lpCapitalUSD + result.lpNetProfitUSD, cum: result.lpNetProfitUSD, note: `Capital ${fmt$(result.lpCapitalUSD)} + Profit ${fmt$(result.lpNetProfitUSD)}`, color: EMERALD },
            { phase: 'LP 최종',   event: `순수익 RLUSD 분배 — ROI ${fmtPct(result.lpRoi)} · IRR ${fmtPct1(result.lpIrrYr)}/yr`, amount: 0, cum: result.lpNetProfitUSD, note: `1 RWA당 ${fmt$(perRwaProfit)}`, color: EMERALD, bold: true },
          ].map(({ phase, event, amount, cum, note, color, bold }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 72, flexShrink: 0, fontSize: 9, fontWeight: 700, color: '#fff', background: color, borderRadius: 5, padding: '3px 6px', textAlign: 'center', marginTop: 2 }}>{phase}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: bold ? 700 : 400, color: TEXT_PRI }}>{event}</div>
                {note && <div style={{ fontSize: 10, color: TEXT_MUT }}>{note}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {amount !== 0 && <div style={{ fontSize: 11, fontWeight: 700, color: amount < 0 ? '#EF4444' : EMERALD }}>{amount < 0 ? '' : '+'}{fmt$(amount)}</div>}
                <div style={{ fontSize: 9, color: TEXT_MUT }}>누계 {cum >= 0 ? '+' : ''}{fmt$(cum)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 4. KEY METRICS ── */}
      <Card>
        <Sec title="KEY METRICS" sub="LP 투자 핵심 지표 5종" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { l: 'Net DPI',          v: fmtX(metrics.dpi),              s: 'LP 분배 / LP 출자',    c: NAVY },
            { l: 'LP IRR (XIRR)',    v: `${fmtPct1(metrics.xirr)}/yr`,  s: '연환산 복리',           c: BLUE },
            { l: 'Hurdle Spread',    v: fmtPct(metrics.hurdleSpread),   s: 'XIRR − 8%/yr',         c: metrics.hurdleSpread > 0 ? EMERALD : '#EF4444' },
            { l: 'Gross MoM',        v: fmtX(metrics.grossMomAsset),    s: 'NPL 자산레벨 배수',     c: TEXT_PRI },
            { l: 'Vehicle Take-Rate',v: fmtPct(metrics.vehicleTakeRate),s: '총 수수료 / NPL 순수익', c: TEXT_PRI },
          ].map(({ l, v, s, c }) => (
            <div key={l} style={{ background: BG_SOFT, borderRadius: 10, padding: '12px 14px', border: `1px solid ${BORDER}`, flex: 1, minWidth: 110 }}>
              <p style={{ fontSize: 9, color: TEXT_SEC, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{l}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: c, margin: '3px 0 0' }}>{v}</p>
              <p style={{ fontSize: 9, color: TEXT_MUT, margin: '1px 0 0' }}>{s}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 5. FUND METRICS ── */}
      <Card>
        <Sec title="FUND METRICS — XRF Vehicle vs 산업 표준" sub="Cambridge Associates · Preqin · ILPA 벤치마크 기준" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {['지표', 'XRF Vehicle', '업계 중간값', '업계 상위 25%'].map((h, i) => (
                <th key={h} style={{ padding: '7px 10px', color: '#fff', fontWeight: 700, textAlign: i === 0 ? 'left' : 'right', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'IRR (연환산)',    xrfRaw: metrics.xirr,         xrf: `${fmtPct1(metrics.xirr)}/yr`,       med: `${fmtPct1(benchmark.median.irr)}/yr`,       top: `${fmtPct1(benchmark.topQuartile.irr)}/yr`, medRaw: benchmark.median.irr },
              { label: 'Net DPI (MoM)',  xrfRaw: metrics.dpi,          xrf: fmtX(metrics.dpi),                   med: fmtX(benchmark.median.mom),                  top: fmtX(benchmark.topQuartile.mom),           medRaw: benchmark.median.mom },
              { label: 'Hurdle Spread', xrfRaw: metrics.hurdleSpread,  xrf: fmtPct(metrics.hurdleSpread),        med: fmtPct(benchmark.median.irr - 0.08),         top: fmtPct(benchmark.topQuartile.irr - 0.08),  medRaw: benchmark.median.irr - 0.08 },
            ].map(({ label, xrf, xrfRaw, med, top, medRaw }, i) => (
              <tr key={label} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 ? BG_SOFT : BG_CARD }}>
                <td style={{ padding: '8px 10px', color: TEXT_SEC, fontSize: 12 }}>{label}</td>
                <td style={{ padding: '8px 10px', fontWeight: 800, color: xrfRaw >= medRaw ? EMERALD : AMBER, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {xrf} {xrfRaw >= medRaw ? '✓' : '△'}
                </td>
                <td style={{ padding: '8px 10px', color: TEXT_SEC, textAlign: 'right' }}>{med}</td>
                <td style={{ padding: '8px 10px', color: TEXT_SEC, textAlign: 'right' }}>{top}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── 6. SENSITIVITY ── */}
      <Card>
        <Sec title="SENSITIVITY 분석" sub="단일 변수 ±20% 변동 시 LP ROI·IRR 변화" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {(Object.entries(SENS_LABELS) as [SensVar, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setSensVar(k)} style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: sensVar === k ? BLUE : '#fff',
              color: sensVar === k ? '#fff' : TEXT_SEC,
              border: `1px solid ${sensVar === k ? BLUE : BORDER}`,
            }}>{l}</button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: BG_SOFT }}>
              {['변동', 'LP ROI', 'LP IRR/yr', 'LP 순수익'].map((h, i) => (
                <th key={h} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: TEXT_SEC, textAlign: i === 0 ? 'left' : 'right', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sensRows.map(({ delta, lpRoi, lpIrrYr, netProfit, isBase }) => (
              <tr key={delta} style={{ borderBottom: `1px solid ${BORDER}`, background: isBase ? '#ECFDF5' : 'transparent', fontWeight: isBase ? 700 : 400 }}>
                <td style={{ padding: '7px 10px', color: delta < 0 ? '#EF4444' : delta > 0 ? EMERALD : TEXT_PRI }}>
                  {delta === 0 ? '기준 (Base)' : delta > 0 ? `+${(delta * 100).toFixed(0)}%` : `${(delta * 100).toFixed(0)}%`}
                </td>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: lpRoi >= 0.15 ? EMERALD : lpRoi >= 0.05 ? AMBER : '#EF4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(lpRoi)}</td>
                <td style={{ padding: '7px 10px', color: TEXT_PRI, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPct1(lpIrrYr)}/yr</td>
                <td style={{ padding: '7px 10px', color: netProfit >= 0 ? EMERALD : '#EF4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt$(netProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── 7. 부동산 담보 가치 분석 (Claude AI) ── */}
      <PropertyCollateralAnalysis address={address} assetTitle={assetTitle} />

      {/* ── 8. AI 총평 ── */}
      <Card style={{ borderColor: NAVY }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: 0 }}>AI 총평</h3>
            <p style={{ fontSize: 10, color: TEXT_MUT, margin: '2px 0 0' }}>XRF RWA 리포트 데이터만 사용 · 입력 파라미터 변경 시 즉시 재생성</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['ko', 'en'] as const).map(lang => (
              <button key={lang} onClick={() => setSummaryLang(lang)} style={{
                padding: '3px 10px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                background: summaryLang === lang ? NAVY : '#fff',
                color: summaryLang === lang ? '#fff' : TEXT_SEC,
                border: `1px solid ${summaryLang === lang ? NAVY : BORDER}`,
              }}>
                {lang === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {summaryText.split('\n\n').map((para, i) => {
            const isLead = i === 0
            const vc = para.startsWith('[BUY]') ? EMERALD : para.startsWith('[HOLD]') ? AMBER : para.startsWith('[AVOID]') ? '#EF4444' : TEXT_PRI
            return (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 8,
                background: isLead ? (para.startsWith('[BUY]') ? '#ECFDF5' : para.startsWith('[HOLD]') ? '#FFFBEB' : '#FEF2F2') : BG_SOFT,
                borderLeft: isLead ? `3px solid ${vc}` : `2px solid ${BORDER}`,
              }}>
                <p style={{ fontSize: isLead ? 12 : 11, fontWeight: isLead ? 700 : 400, color: isLead ? vc : TEXT_PRI, margin: 0, lineHeight: 1.7 }}>
                  {para}
                </p>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 10, padding: '6px 10px', background: '#F0F7FF', borderRadius: 6, fontSize: 10, color: TEXT_MUT }}>
          <span style={{ fontWeight: 600, color: TEXT_SEC }}>생성 기준:</span>{' '}
          LP ROI {fmtPct(result.lpRoi)} · IRR {fmtPct1(result.lpIrrYr)}/yr · Pool {fmt$(displayPoolUSD)} · {numRwa.toLocaleString('en-US')} RWA × ${rwaPriceUSD.toLocaleString('en-US')} · Carry {result.fees.xrfCarryUSD > 0 ? `${fmt$(result.fees.xrfCarryUSD)} 발동` : '$0 미발생'}
        </div>
      </Card>
    </div>
  )
}
