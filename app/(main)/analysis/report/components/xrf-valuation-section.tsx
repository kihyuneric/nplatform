"use client"
/**
 * XRF Valuation Report Section
 *
 * NPL 자체 ROI → XRF 비히클 (XRF + 엔플랫폼 + 대부업체) 적용 후 LP 최종 ROI 산출.
 * NPL 분석 보고서와 동일한 McKinsey 스타일 EXHIBIT 레이아웃.
 *
 * 출처: XRF Ripple Deck v4.0 (2026-05) — 3-tier Fee System
 */
import { useMemo, useState } from 'react'
import {
  computeXrfValuationAllTiers,
  type XrfTier,
  type XrfValuationInput,
  type XrfValuationResult,
} from '@/lib/xrf/valuation'

interface XrfValuationSectionProps {
  /** NPL purchase price (KRW) — 매입가 */
  nplPurchasePriceKRW: number
  /** NPL totalEquity (KRW) — 자기자본 총계 */
  nplTotalEquityKRW: number
  /** NPL 예상 순수익 (KRW) */
  nplNetProfitKRW: number
  /** 운용 일수 */
  holdingPeriodDays: number
  /** 매물 표시명 (헤더용) */
  assetTitle?: string
}

const fmtUSD = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const fmtUSDFull = (v: number) =>
  `$${Math.round(v).toLocaleString('en-US')}`

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`

export default function XrfValuationSection({
  nplPurchasePriceKRW,
  nplTotalEquityKRW,
  nplNetProfitKRW,
  holdingPeriodDays,
  assetTitle,
}: XrfValuationSectionProps) {
  const [fxRate, setFxRate] = useState(1300)
  const [numLPs, setNumLPs] = useState(100)
  const [tierOverride, setTierOverride] = useState<Exclude<XrfTier, 'REJECT'> | undefined>(undefined)

  const input: XrfValuationInput = useMemo(
    () => ({
      nplPurchasePriceKRW,
      nplTotalEquityKRW,
      nplNetProfitKRW,
      holdingPeriodDays,
      exchangeRateKRWPerUSD: fxRate,
      numLPs,
      tierOverride,
    }),
    [
      nplPurchasePriceKRW,
      nplTotalEquityKRW,
      nplNetProfitKRW,
      holdingPeriodDays,
      fxRate,
      numLPs,
      tierOverride,
    ],
  )

  const { selected, base, conservative, saveTheDeal } = useMemo(
    () => computeXrfValuationAllTiers(input),
    [input],
  )

  // 색상 시스템 — NPL 보고서와 동일 (McKinsey navy + emerald accent)
  const c = {
    navy: '#1B3A5C',
    navyDark: '#051C2C',
    blue: '#2E75B6',
    emerald: '#10B981',
    bg: '#FFFFFF',
    bgSoft: '#F5F7FA',
    border: '#E5E8EC',
    text: '#1B3A5C',
    textSub: '#6B7280',
    textTertiary: '#9CA3AF',
  }

  const tierLabel: Record<XrfTier, string> = {
    BASE: 'BASE',
    CONSERVATIVE: 'CONSERVATIVE',
    'SAVE-THE-DEAL': 'SAVE-THE-DEAL',
    REJECT: 'REJECT',
  }

  const tierColor: Record<XrfTier, string> = {
    BASE: c.emerald,
    CONSERVATIVE: c.blue,
    'SAVE-THE-DEAL': '#F59E0B',
    REJECT: '#DC2626',
  }

  return (
    <div style={{ background: c.bg, padding: '24px 0' }}>
      {/* ───── 헤더 ───── */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: c.textTertiary,
            letterSpacing: 1.5,
            marginBottom: 4,
          }}
        >
          XRF VALUATION · RIPPLE × XRF VEHICLE
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: c.navy, margin: 0 }}>
          XRF Vehicle Valuation Report
        </h1>
        {assetTitle && (
          <div style={{ fontSize: 13, color: c.textSub, marginTop: 4 }}>
            {assetTitle}
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: c.textSub,
            marginTop: 12,
            padding: '12px 16px',
            background: c.bgSoft,
            borderLeft: `3px solid ${c.emerald}`,
          }}
        >
          NPL 자체 ROI <strong>{fmtPct(selected.nplRoi)}</strong> · IRR{' '}
          <strong>{fmtPct(selected.nplRoi / selected.durationYr)}/yr</strong> →{' '}
          XRF Vehicle (XRF + 엔플랫폼 + 대부업체) 구조 적용 →{' '}
          <strong style={{ color: tierColor[selected.tier] }}>
            {tierLabel[selected.tier]}
          </strong>{' '}
          tier · LP ROI{' '}
          <strong style={{ color: tierColor[selected.tier], fontSize: 14 }}>
            {fmtPct(selected.lpRoi)}
          </strong>
        </div>
      </div>

      {/* ───── EXHIBIT 1 — KEY METRICS ───── */}
      <Section title="EXHIBIT 1 · KEY METRICS" caption={`AUTO Tier 자동 선택 · ${selected.autoTierResult.selectedReason}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <MetricCard label="LP Capital Call (1인당)" value={fmtUSDFull(selected.lpCapitalPerLpUSD)} sub={`${numLPs}명 · 총 ${fmtUSD(selected.lpCapitalUSD)}`} tint={c.navy} />
          <MetricCard label="LP Net Profit (1인당)" value={fmtUSDFull(selected.lpNetProfitPerLpUSD)} sub={`총 ${fmtUSD(selected.lpNetProfitUSD)}`} tint={c.navyDark} />
          <MetricCard label="LP ROI (절대)" value={fmtPct(selected.lpRoi)} sub={`${selected.durationYr.toFixed(2)}년 운용`} tint={tierColor[selected.tier]} />
          <MetricCard label="LP IRR (연환산)" value={`${fmtPct(selected.lpIrrYr)}/yr`} sub="단순 연환산" tint={c.navyDark} />
        </div>
      </Section>

      {/* ───── EXHIBIT 2 — POOL 구조 ───── */}
      <Section title="EXHIBIT 2 · POOL 구조" caption="LP 90% + 대부업체 10% (Day Exit 1:1 환원)">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <Row label="Pool 총액" value={fmtUSDFull(selected.poolUSD)} note="= NPL totalEquity / 0.9" />
            <Row label="LP capital (90%)" value={fmtUSDFull(selected.lpCapitalUSD)} note={`${numLPs}명 × ${fmtUSDFull(selected.lpCapitalPerLpUSD)}`} />
            <Row label="대부업체 자본금 (10%)" value={fmtUSDFull(selected.daepuCapitalUSD)} note="Day Exit 1:1 환원 · 수익 무관" last />
          </tbody>
        </table>
      </Section>

      {/* ───── EXHIBIT 3 — VEHICLE FEE 분배 ───── */}
      <Section
        title={`EXHIBIT 3 · VEHICLE FEE — ${tierLabel[selected.tier]} TIER`}
        caption={`NPL 매입가 ${fmtUSDFull(nplPurchasePriceKRW / fxRate)} 기준 · ${selected.durationYrCapped < 1 ? `${(selected.durationYrCapped * 365).toFixed(0)}일` : '365일 cap (실 ' + holdingPeriodDays + '일)'}`}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>항목</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>금액 (USD)</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 120 }}>비중</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>XRF Foundation</td></tr>
            <Row label="  XRF 관리보수 (%/yr · 365일 cap)" value={fmtUSDFull(selected.fees.xrfMgmtUSD)} note={`${fmtPct(selected.lpCapitalUSD > 0 ? selected.fees.xrfMgmtUSD / selected.lpCapitalUSD : 0)} of LP cap`} />
            <Row label="  XRF SPV Setup (1회)" value={fmtUSDFull(selected.fees.xrfSetupUSD)} />
            <Row label="  XRF Carry (8% Hurdle 초과분)" value={fmtUSDFull(selected.fees.xrfCarryUSD)} note={`Hurdle ${fmtUSDFull(selected.hurdleUSD)} 초과분 × ${tierLabel[selected.tier] === 'BASE' ? '15%' : tierLabel[selected.tier] === 'CONSERVATIVE' ? '10%' : '5%'}`} />
            <Row label="  XRF 합계" value={fmtUSDFull(selected.fees.xrfTotalUSD)} bold last />

            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>엔플랫폼 (KR Platform Co)</td></tr>
            <Row label="  AI Valuation (ML 가격평가)" value={fmtUSDFull(selected.fees.platformAiUSD)} />
            <Row label="  Pipeline Sourcing (딜 발굴·소싱)" value={fmtUSDFull(selected.fees.platformSourcingUSD)} />
            <Row label="  PM Fee (프로젝트 매니지먼트)" value={fmtUSDFull(selected.fees.platformPmUSD)} />
            <Row label="  KR Margin (TP 방어선 ≥15%)" value={fmtUSDFull(selected.fees.platformMarginUSD)} />
            <Row label="  엔플랫폼 합계" value={fmtUSDFull(selected.fees.platformTotalUSD)} bold last />

            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>대부업체 (KR Servicer)</td></tr>
            <Row label="  Servicing (시장 표준 라이선스)" value={fmtUSDFull(selected.fees.servicingUSD)} note="2.0%/yr 고정 · 모든 tier 동일" />
            <Row label="  자본금 (Day Exit 1:1 환원)" value={fmtUSDFull(selected.daepuCapitalUSD)} note="순수익 무관 · Pool의 10% · Fee 아님" last />
          </tbody>
        </table>
      </Section>

      {/* ───── EXHIBIT 4 — 3-TIER 비교 ───── */}
      <Section title="EXHIBIT 4 · 3-TIER 비교 시뮬레이션" caption="동일 NPL deal에 BASE / CONSERVATIVE / SAVE-THE-DEAL 적용 시 LP ROI">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>Metric</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>BASE {selected.tier === 'BASE' && '★'}</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>CONSERVATIVE {selected.tier === 'CONSERVATIVE' && '★'}</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>SAVE-THE-DEAL {selected.tier === 'SAVE-THE-DEAL' && '★'}</th>
            </tr>
          </thead>
          <tbody>
            <CompareRow label="LP Capital Call (1인당)" v1={fmtUSDFull(base.lpCapitalPerLpUSD)} v2={fmtUSDFull(conservative.lpCapitalPerLpUSD)} v3={fmtUSDFull(saveTheDeal.lpCapitalPerLpUSD)} />
            <CompareRow label="LP Net Profit (1인당)" v1={fmtUSDFull(base.lpNetProfitPerLpUSD)} v2={fmtUSDFull(conservative.lpNetProfitPerLpUSD)} v3={fmtUSDFull(saveTheDeal.lpNetProfitPerLpUSD)} />
            <CompareRow label="LP ROI (절대)" v1={fmtPct(base.lpRoi)} v2={fmtPct(conservative.lpRoi)} v3={fmtPct(saveTheDeal.lpRoi)} bold />
            <CompareRow label="LP IRR (연환산)" v1={`${fmtPct(base.lpIrrYr)}/yr`} v2={`${fmtPct(conservative.lpIrrYr)}/yr`} v3={`${fmtPct(saveTheDeal.lpIrrYr)}/yr`} />
            <CompareRow label="XRF 합계 Fee" v1={fmtUSDFull(base.fees.xrfTotalUSD)} v2={fmtUSDFull(conservative.fees.xrfTotalUSD)} v3={fmtUSDFull(saveTheDeal.fees.xrfTotalUSD)} />
            <CompareRow label="엔플랫폼 합계 Fee" v1={fmtUSDFull(base.fees.platformTotalUSD)} v2={fmtUSDFull(conservative.fees.platformTotalUSD)} v3={fmtUSDFull(saveTheDeal.fees.platformTotalUSD)} />
            <CompareRow label="대부업체 Servicing" v1={fmtUSDFull(base.fees.servicingUSD)} v2={fmtUSDFull(conservative.fees.servicingUSD)} v3={fmtUSDFull(saveTheDeal.fees.servicingUSD)} last />
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: '12px 16px', background: c.bgSoft, borderLeft: `3px solid ${tierColor[selected.tier]}`, fontSize: 12, color: c.text }}>
          <strong style={{ color: tierColor[selected.tier] }}>AUTO 평가 · {tierLabel[selected.tier]}</strong> — {selected.autoTierResult.selectedReason}
        </div>
      </Section>

      {/* ───── EXHIBIT 5 — 입력 파라미터 / 시나리오 조정 ───── */}
      <Section title="EXHIBIT 5 · 입력 파라미터" caption="환율·LP 인원·tier 조정 가능">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Param label="USD 환율 (KRW/USD)">
            <input
              type="number"
              value={fxRate}
              onChange={e => setFxRate(Number(e.target.value) || 1300)}
              style={inputStyle}
            />
          </Param>
          <Param label="LP 인원 (분할)">
            <input
              type="number"
              value={numLPs}
              onChange={e => setNumLPs(Number(e.target.value) || 100)}
              style={inputStyle}
            />
          </Param>
          <Param label="Tier 강제 (없으면 AUTO)">
            <select
              value={tierOverride ?? ''}
              onChange={e => setTierOverride((e.target.value || undefined) as Exclude<XrfTier, 'REJECT'> | undefined)}
              style={inputStyle}
            >
              <option value="">AUTO (자동 선택)</option>
              <option value="BASE">BASE</option>
              <option value="CONSERVATIVE">CONSERVATIVE</option>
              <option value="SAVE-THE-DEAL">SAVE-THE-DEAL</option>
            </select>
          </Param>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: c.textTertiary, lineHeight: 1.6 }}>
          ⓘ 본 보고서는 XRF Ripple Deck v4.0 (2026-05) 의 3-tier Fee System 을 적용한 모델 시뮬레이션입니다.
          %/yr fees 는 365일 cap, Hurdle 8%/yr 는 실제 운용기간 기준. Carry 는 (LP profit − Hurdle) × tier별 Carry % 로 산출.
          실제 deal 출시 시 SG SPV 셋업 비용·법무비·환율 변동 등이 추가 반영될 수 있습니다.
        </div>
      </Section>
    </div>
  )
}

// ─── Sub Components ───
function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #E5E8EC' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1B3A5C', letterSpacing: 1.2 }}>{title}</div>
        {caption && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{caption}</div>}
      </div>
      {children}
    </section>
  )
}

function MetricCard({ label, value, sub, tint }: { label: string; value: string; sub?: string; tint: string }) {
  return (
    <div style={{ padding: 16, background: '#FFFFFF', border: `1px solid ${tint}`, borderTop: `3px solid ${tint}` }}>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: tint }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Row({ label, value, note, bold, last }: { label: string; value: string; note?: string; bold?: boolean; last?: boolean }) {
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <td style={{ padding: '8px 12px', color: bold ? '#1B3A5C' : '#374151', fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: bold ? '#1B3A5C' : '#1B3A5C', fontWeight: bold ? 700 : 500 }}>{value}</td>
      {note !== undefined && <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#9CA3AF' }}>{note}</td>}
    </tr>
  )
}

function CompareRow({ label, v1, v2, v3, bold, last }: { label: string; v1: string; v2: string; v3: string; bold?: boolean; last?: boolean }) {
  const cell = { padding: '8px 12px', textAlign: 'right' as const, fontFamily: 'tabular-nums', color: '#1B3A5C', fontWeight: bold ? 700 : 500 }
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <td style={{ padding: '8px 12px', color: bold ? '#1B3A5C' : '#374151', fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={cell}>{v1}</td>
      <td style={cell}>{v2}</td>
      <td style={cell}>{v3}</td>
    </tr>
  )
}

function Param({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #E5E8EC',
  background: '#FFFFFF',
  color: '#1B3A5C',
  fontFamily: 'inherit',
}
