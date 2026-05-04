"use client"
/**
 * XRF Valuation Report Section
 *
 * NPL 자체 ROI → XRF 비히클 (XRF + 엔플랫폼 + 대부업체) 적용 후 LP 최종 ROI 산출.
 * NPL 분석 보고서와 동일한 McKinsey 스타일 EXHIBIT 레이아웃.
 *
 * 출처: XRF Ripple Deck v4.0 (2026-05) — 3-tier Fee System
 *
 * 사용자 정책 (2026-05-03):
 *   - 분석 메뉴 제거 (사이드바 X), 보고서 헤더 토글 버튼으로만 노출
 *   - PDF/Excel 내보내기 동작 (NPL 보고서와 동일)
 */
import { useMemo, useState } from 'react'
import {
  computeXrfValuationAllTiers,
  type LpCapitalMode,
  type XrfTier,
  type XrfValuationInput,
} from '@/lib/xrf/valuation'
import { computeFundMetrics, computeProfitAllocation } from '@/lib/xrf/metrics'
import { sensitivityOnHoldingDays, sensitivityOnNetProfit } from '@/lib/xrf/sensitivity'
import { downloadXrfCsv } from '@/lib/xrf/csv-export'

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

const fmtKRW = (v: number) => `₩${Math.round(v).toLocaleString('en-US')}`

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`

const tierLabel: Record<XrfTier, string> = {
  BASE: 'BASE',
  CONSERVATIVE: 'CONSERVATIVE',
  'SAVE-THE-DEAL': 'SAVE-THE-DEAL',
  REJECT: 'REJECT',
}

const tierColor: Record<XrfTier, string> = {
  BASE: '#10B981',
  CONSERVATIVE: '#2E75B6',
  'SAVE-THE-DEAL': '#F59E0B',
  REJECT: '#DC2626',
}

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
  const [lpCapitalMode, setLpCapitalMode] = useState<LpCapitalMode>('NPL_EQUITY_PLUS_FEES')

  const input: XrfValuationInput = useMemo(
    () => ({
      nplPurchasePriceKRW,
      nplTotalEquityKRW,
      nplNetProfitKRW,
      holdingPeriodDays,
      exchangeRateKRWPerUSD: fxRate,
      numLPs,
      tierOverride,
      lpCapitalMode,
    }),
    [
      nplPurchasePriceKRW,
      nplTotalEquityKRW,
      nplNetProfitKRW,
      holdingPeriodDays,
      fxRate,
      numLPs,
      tierOverride,
      lpCapitalMode,
    ],
  )

  const { selected, base, conservative, saveTheDeal } = useMemo(
    () => computeXrfValuationAllTiers(input),
    [input],
  )

  // ── Fund Metrics (PE/VC 산업 표준: DPI / TVPI / MoM / XIRR) ──
  const fundMetrics = useMemo(() => {
    const lpDistributionUSD = selected.lpCapitalUSD + selected.lpNetProfitUSD
    return computeFundMetrics(
      selected.lpCapitalUSD,
      lpDistributionUSD,
      holdingPeriodDays,
    )
  }, [selected, holdingPeriodDays])

  // ── Profit Allocation (NPL Net Profit → fees / carry / LP) ──
  const profitAllocation = useMemo(
    () =>
      computeProfitAllocation({
        nplNetProfitUSD: selected.nplNetProfitUSD,
        xrfMgmtUSD: selected.fees.xrfMgmtUSD,
        xrfSetupUSD: selected.fees.xrfSetupUSD,
        xrfCarryUSD: selected.fees.xrfCarryUSD,
        platformTotalUSD: selected.fees.platformTotalUSD,
        servicingUSD: selected.fees.servicingUSD,
        lpNetProfitUSD: selected.lpNetProfitUSD,
      }),
    [selected],
  )

  // ── Sensitivity 분석 ──
  const holdingSensitivity = useMemo(
    () =>
      sensitivityOnHoldingDays(input, [
        Math.max(30, holdingPeriodDays - 180),
        Math.max(30, holdingPeriodDays - 90),
        holdingPeriodDays,
        holdingPeriodDays + 90,
        holdingPeriodDays + 180,
      ]),
    [input, holdingPeriodDays],
  )

  const profitSensitivity = useMemo(
    () => sensitivityOnNetProfit(input, [0.5, 0.75, 1.0, 1.25, 1.5]),
    [input],
  )

  const handleCsvDownload = () => {
    downloadXrfCsv(
      { result: selected, metrics: fundMetrics, allocation: profitAllocation, assetTitle },
      assetTitle ? `xrf-valuation-${assetTitle.slice(0, 20).replace(/[^a-zA-Z0-9가-힣]/g, '-')}` : 'xrf-valuation',
    )
  }

  const c = {
    navy: '#1B3A5C',
    navyDark: '#051C2C',
    blue: '#2E75B6',
    emerald: '#10B981',
    amber: '#F59E0B',
    red: '#DC2626',
    bg: '#FFFFFF',
    bgSoft: '#F5F7FA',
    bgRed: '#FEF2F2',
    border: '#E5E8EC',
    text: '#1B3A5C',
    textSub: '#6B7280',
    textTertiary: '#9CA3AF',
  }

  const isRejected = selected.tier === 'REJECT'

  return (
    <div style={{ background: c.bg, padding: '24px 0' }} className="xrf-valuation-section">
      {/* 인쇄용 스타일 — PDF 출력 시 NPL 보고서와 동일한 가독성 */}
      <style jsx>{`
        @media print {
          .xrf-valuation-section {
            page-break-inside: auto;
          }
          .xrf-section {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .no-print { display: none !important; }
          input, select { border: 1px solid #9CA3AF !important; }
        }
      `}</style>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: c.navy, margin: 0 }}>
              XRF Vehicle Valuation Report
            </h1>
            {assetTitle && (
              <div style={{ fontSize: 13, color: c.textSub, marginTop: 4 }}>
                {assetTitle}
              </div>
            )}
          </div>
          {/* CSV 다운로드 버튼 — LP 커뮤니케이션 / DD 자료 첨부 */}
          <button
            type="button"
            onClick={handleCsvDownload}
            className="no-print"
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              background: c.navy,
              color: '#FFFFFF',
              border: 'none',
              borderTop: `2px solid ${c.emerald}`,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
            title="XRF Valuation 결과 CSV 다운로드 (Excel 호환)"
          >
            ↓ CSV 다운로드
          </button>
        </div>

        {/* REJECT 케이스: 별도 빨간 배너 */}
        {isRejected && (
          <div
            style={{
              fontSize: 13,
              color: c.red,
              marginTop: 12,
              padding: '14px 18px',
              background: c.bgRed,
              borderLeft: `4px solid ${c.red}`,
              fontWeight: 600,
            }}
          >
            ⚠ REJECT — BASE LP ROI {fmtPct(selected.autoTierResult.base.lpRoi)} 가 5% 임계값 미달.
            본 deal 은 XRF Vehicle 출시 부적합 (3-tier 양보로도 LP 매력 회복 불가).
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 6, fontWeight: 400 }}>
              참고: 시뮬레이션 시 BASE tier 기준값 표시. 실제 출시 진행 시 deal 재구조화 필요.
            </div>
          </div>
        )}

        {/* 정상 케이스: emerald 요약 */}
        {!isRejected && (
          <div
            style={{
              fontSize: 12,
              color: c.textSub,
              marginTop: 12,
              padding: '12px 16px',
              background: c.bgSoft,
              borderLeft: `3px solid ${tierColor[selected.tier]}`,
            }}
          >
            NPL 자체 ROI <strong>{fmtPct(selected.nplRoi)}</strong> · IRR{' '}
            <strong>{fmtPct(selected.nplRoi / selected.durationYr)}/yr</strong> →{' '}
            XRF Vehicle 적용 →{' '}
            <strong style={{ color: tierColor[selected.tier] }}>
              {tierLabel[selected.tier]}
            </strong>{' '}
            tier · LP ROI{' '}
            <strong style={{ color: tierColor[selected.tier], fontSize: 14 }}>
              {fmtPct(selected.lpRoi)}
            </strong>
            {' · '}
            LP IRR{' '}
            <strong style={{ color: tierColor[selected.tier] }}>
              {fmtPct(selected.lpIrrYr)}/yr
            </strong>
          </div>
        )}
      </div>

      {/* ───── EXHIBIT 1 — NPL → XRF 변환 투명성 ───── */}
      <Section title="EXHIBIT 1 · NPL → XRF 변환 투명성" caption={`KRW 환율 ${fxRate.toLocaleString()} / USD · 운용 ${holdingPeriodDays}일 · ${selected.durationYr.toFixed(2)}년`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>NPL Input (KRW)</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>원화</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>USD 환산</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>비고</th>
            </tr>
          </thead>
          <tbody>
            <Row4 label="NPL 매입가" v1={fmtKRW(nplPurchasePriceKRW)} v2={fmtUSDFull(selected.nplPurchaseUSD)} note="Vehicle Fee 산정 base (AUM)" />
            <Row4 label="NPL totalEquity" v1={fmtKRW(nplTotalEquityKRW)} v2={fmtUSDFull(selected.nplTotalEquityUSD)} note="NPL 자기자본 (LP funding base)" />
            <Row4 label="NPL 예상 순수익" v1={fmtKRW(nplNetProfitKRW)} v2={fmtUSDFull(selected.nplNetProfitUSD)} note="LP 분배 전 base profit" bold last />
          </tbody>
        </table>
      </Section>

      {/* ───── EXHIBIT 2 — Pool 구조 (LP가 Pool 100% 청약 · 2026-05-04 정책 변경) ───── */}
      <Section title="EXHIBIT 2 · POOL 구조" caption={`LP capital 모델: ${lpCapitalMode === 'NPL_EQUITY_PLUS_FEES' ? 'NPL equity + Fees prefund + 10% working buffer (PDF 정합)' : 'NPL equity 만 (단순 모델)'} · LP 100%`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <Row label="Pool 총액 (= LP 청약액)" value={fmtUSDFull(selected.poolUSD)} note={lpCapitalMode === 'NPL_EQUITY_PLUS_FEES' ? '= (NPL equity + Fees + Hurdle est.) × 1.111 (10% working buffer)' : '= NPL totalEquity × 1.111'} />
            <Row label="LP capital (100% 청약)" value={fmtUSDFull(selected.lpCapitalUSD)} note={`${numLPs}명 × ${fmtUSDFull(selected.lpCapitalPerLpUSD)} (1인당)`} bold last />
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
          ⓘ 사용자 정책 (2026-05-04): 대부업체 자본금 (이전 Pool의 10%) 제거 — LP가 Pool 전체 청약. 대부업체는 Servicing Fee 만 수령 (Capital 출자 없음). 10% buffer 는 SPV 운영비·예비비로 LP 가 흡수.
        </div>
      </Section>

      {/* ───── EXHIBIT 3 — Vehicle Fee (대부업체 자본금 제외) ───── */}
      <Section
        title={`EXHIBIT 3 · VEHICLE FEE — ${tierLabel[selected.tier]} TIER`}
        caption={`NPL 매입가 ${fmtUSDFull(selected.nplPurchaseUSD)} 기준 · %/yr fees ${selected.durationYrCapped < 1 ? `${(selected.durationYrCapped * 365).toFixed(0)}일` : `365일 cap (실 ${holdingPeriodDays}일)`}`}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>항목</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>금액 (USD)</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 240 }}>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>XRF Foundation</td></tr>
            <Row label="  XRF 관리보수 (%/yr · 365일 cap)" value={fmtUSDFull(selected.fees.xrfMgmtUSD)} note={tierLabel[selected.tier] === 'BASE' ? '0.7%/yr' : '0.5%/yr'} />
            <Row label="  XRF SPV Setup (1회)" value={fmtUSDFull(selected.fees.xrfSetupUSD)} note={tierLabel[selected.tier] === 'BASE' ? '0.5% × NPL 매입가' : '0.3% × NPL 매입가'} />
            <Row label="  XRF Carry (8% Hurdle 초과분)" value={fmtUSDFull(selected.fees.xrfCarryUSD)} note={`Hurdle ${fmtUSDFull(selected.hurdleUSD)} 초과분 × ${tierLabel[selected.tier] === 'BASE' ? '15%' : tierLabel[selected.tier] === 'CONSERVATIVE' ? '10%' : '5%'}`} />
            <Row label="  XRF 합계" value={fmtUSDFull(selected.fees.xrfTotalUSD)} bold last />

            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>엔플랫폼 (KR Platform Co) — 2026-05-04 v2 구조 (총 2.5%/yr · SAVE 2.0%/yr)</td></tr>
            <Row label="  AI Valuation (ML 가격평가)" value={fmtUSDFull(selected.fees.platformAiUSD)} note={tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? '0.2%/yr' : '0.3%/yr'} />
            <Row label="  Pipeline Sourcing (딜 발굴·소싱)" value={fmtUSDFull(selected.fees.platformSourcingUSD)} note={tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? '1.0%/yr' : '1.3%/yr'} />
            <Row label="  PM Fee (프로젝트 매니지먼트)" value={fmtUSDFull(selected.fees.platformPmUSD)} note={tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? '0.5%/yr' : '0.5%/yr'} />
            <Row label="  KR Margin (TP 방어선 ≥15%)" value={fmtUSDFull(selected.fees.platformMarginUSD)} note={tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? '0.3%/yr' : '0.4%/yr'} />
            <Row label="  엔플랫폼 합계" value={fmtUSDFull(selected.fees.platformTotalUSD)} bold last />

            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>대부업체 (KR Servicer)</td></tr>
            <Row label="  Servicing (시장 표준 라이선스)" value={fmtUSDFull(selected.fees.servicingUSD)} note="2.0%/yr 고정 · 모든 tier 동일" last />
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
          ⓘ 2026-05-04 정책 변경: 엔플랫폼 BASE Fee 3.0%/yr → 2.5%/yr (-0.5%p) — 절감분은 LP 순수익으로 자동 흡수. 대부업체 자본금 (이전 10%) 제거 → LP가 Pool 100% 청약.
        </div>
      </Section>

      {/* ───── EXHIBIT 4 — Cash Flow 타임라인 ───── */}
      <Section title="EXHIBIT 4 · CASH FLOW 타임라인" caption={`Day 0 (LP 청약) → Day ${holdingPeriodDays} (배당기일) — LP 관점 현금흐름`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 100 }}>시점</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>이벤트</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>LP Cash Flow (USD)</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>누적</th>
            </tr>
          </thead>
          <tbody>
            <CashflowRow phase="Day 0" event="LP capital call (Pool 100% 청약 송금)" amount={-selected.lpCapitalUSD} cumulative={-selected.lpCapitalUSD} negative note={`${numLPs}명 × ${fmtUSDFull(selected.lpCapitalPerLpUSD)}`} />
            <CashflowRow phase="Day 0~M3" event="XRF SPV Setup (1회)" amount={0} cumulative={-selected.lpCapitalUSD} note="prefund 차감 · LP 직접 X" />
            <CashflowRow phase="Day ~30" event="NPL 매입 + 질권대출 실행" amount={0} cumulative={-selected.lpCapitalUSD} note="Pool → NPL 매입가 funding" />
            <CashflowRow phase="운용 중" event="XRF/엔플랫폼/대부업체 fees prefund" amount={0} cumulative={-selected.lpCapitalUSD} note={`LP capital 에서 ${fmtUSDFull(selected.fees.xrfMgmtUSD + selected.fees.xrfSetupUSD + selected.fees.platformTotalUSD + selected.fees.servicingUSD)} 차감`} />
            <CashflowRow phase={`Day ${holdingPeriodDays}`} event="법원 배당 (전액 LP 분배)" amount={selected.lpCapitalUSD + selected.lpNetProfitUSD} cumulative={selected.lpNetProfitUSD} positive note="LP capital + Net Profit (대부업체 자본 회수 없음)" />
            <CashflowRow phase="LP 최종" event="순수익 (RLUSD 분배)" amount={0} cumulative={selected.lpNetProfitUSD} bold positive note={`ROI ${fmtPct(selected.lpRoi)} · IRR ${fmtPct(selected.lpIrrYr)}/yr`} />
          </tbody>
        </table>
      </Section>

      {/* ───── EXHIBIT 5 — KEY METRICS ───── */}
      <Section title="EXHIBIT 5 · KEY METRICS" caption={`AUTO Tier 자동 선택 · ${selected.autoTierResult.selectedReason}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <MetricCard label="LP Capital Call (1인당)" value={fmtUSDFull(selected.lpCapitalPerLpUSD)} sub={`${numLPs}명 · 총 ${fmtUSD(selected.lpCapitalUSD)}`} tint={c.navy} />
          <MetricCard label="LP Net Profit (1인당)" value={fmtUSDFull(selected.lpNetProfitPerLpUSD)} sub={`총 ${fmtUSD(selected.lpNetProfitUSD)}`} tint={c.navyDark} />
          <MetricCard label="LP ROI (절대)" value={fmtPct(selected.lpRoi)} sub={`${selected.durationYr.toFixed(2)}년 운용`} tint={tierColor[selected.tier]} />
          <MetricCard label="LP IRR (연환산)" value={`${fmtPct(selected.lpIrrYr)}/yr`} sub="단순 연환산" tint={c.navyDark} />
        </div>
      </Section>

      {/* ───── EXHIBIT 5b — FUND METRICS (PE/VC 산업 표준) ───── */}
      <Section title="EXHIBIT 5b · FUND METRICS (산업 표준)" caption="PE/VC 표준 지표 — DPI · TVPI · MoM · XIRR (Newton's method)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <MetricCard label="DPI" value={`${fundMetrics.dpi.toFixed(3)}x`} sub="Distributions / Paid-In" tint={c.navy} />
          <MetricCard label="TVPI" value={`${fundMetrics.tvpi.toFixed(3)}x`} sub="Total Value / Paid-In" tint={c.navyDark} />
          <MetricCard label="MoM" value={`${fundMetrics.mom.toFixed(3)}x`} sub="Multiple of Money" tint={c.blue} />
          <MetricCard label="Equity Multiple" value={`${fundMetrics.equityMultiple.toFixed(3)}x`} sub="LP 분배 / 출자" tint={c.navy} />
          <MetricCard label="XIRR (복리)" value={`${fmtPct(fundMetrics.xirr)}/yr`} sub="Newton's method" tint={tierColor[selected.tier]} />
        </div>
        <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
          ⓘ 단순 IRR ({fmtPct(selected.lpIrrYr)}/yr) vs XIRR ({fmtPct(fundMetrics.xirr)}/yr) 차이는 단순 연환산 vs 복리 계산의 차이입니다.
          XIRR은 Excel XIRR 함수와 동일 알고리즘 (Newton's method).
        </div>
      </Section>

      {/* ───── EXHIBIT 5c — PROFIT ALLOCATION 워터폴 ───── */}
      <Section title="EXHIBIT 5c · PROFIT ALLOCATION (NPL 순수익 분배)" caption={`NPL Net Profit ${fmtUSDFull(selected.nplNetProfitUSD)} → 6개 항목 분배 (XRF · 엔플랫폼 · 대부업체 · LP)`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>분배 항목</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 140 }}>USD</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 100 }}>NPL profit %</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>비중 시각화</th>
            </tr>
          </thead>
          <tbody>
            {profitAllocation.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: idx === profitAllocation.items.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 12px', color: c.text, fontWeight: item.category === 'LP' ? 700 : 400 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: item.color, marginRight: 8, verticalAlign: 'middle' }} />
                  {item.label}
                  {item.category === 'LP' && <span style={{ marginLeft: 8, fontSize: 10, color: c.emerald, fontWeight: 700 }}>★ FINAL</span>}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: c.text, fontWeight: item.category === 'LP' ? 700 : 500 }}>
                  {fmtUSDFull(item.amountUSD)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: item.color, fontWeight: 600 }}>
                  {fmtPct(item.pctOfNplProfit)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ width: '100%', height: 14, background: c.bgSoft, position: 'relative' }}>
                    <div
                      style={{
                        width: `${Math.min(100, item.pctOfNplProfit * 100)}%`,
                        height: '100%',
                        background: item.color,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: '10px 14px', background: c.bgSoft, borderLeft: `3px solid ${c.emerald}`, fontSize: 12, color: c.text }}>
          <strong>해석</strong>: NPL 순수익 {fmtUSDFull(selected.nplNetProfitUSD)} 중{' '}
          <strong style={{ color: c.emerald }}>{fmtPct(selected.lpNetProfitUSD / selected.nplNetProfitUSD)}</strong> 가 LP에게,{' '}
          <strong style={{ color: c.navy }}>{fmtPct(selected.fees.xrfTotalUSD / selected.nplNetProfitUSD)}</strong> 가 XRF Foundation,{' '}
          <strong style={{ color: c.amber }}>{fmtPct(selected.fees.platformTotalUSD / selected.nplNetProfitUSD)}</strong> 가 엔플랫폼,{' '}
          <strong style={{ color: '#9CA3AF' }}>{fmtPct(selected.fees.servicingUSD / selected.nplNetProfitUSD)}</strong> 가 대부업체로 분배.
        </div>
      </Section>

      {/* ───── EXHIBIT 5d — SENSITIVITY 분석 ───── */}
      <Section title="EXHIBIT 5d · SENSITIVITY 분석 (단일 변수 변동)" caption="운용기간 / NPL 순수익 변동이 LP ROI · Tier 에 미치는 영향">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <SensitivityTable result={holdingSensitivity} baselineDays={holdingPeriodDays} />
          <SensitivityTable result={profitSensitivity} baselineDays={holdingPeriodDays} variant="profit" />
        </div>
      </Section>

      {/* ───── EXHIBIT 6 — 3-TIER 비교 ───── */}
      <Section title="EXHIBIT 6 · 3-TIER 비교 시뮬레이션" caption="동일 NPL deal에 BASE / CONSERVATIVE / SAVE-THE-DEAL 적용 시 LP ROI">
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

      {/* ───── EXHIBIT 7 — 입력 파라미터 ───── */}
      <Section title="EXHIBIT 7 · 입력 파라미터 (시나리오 조정)" caption="환율·LP 인원·tier·LP capital 모델 인터랙티브 조정 가능">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="no-print">
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
          <Param label="LP Capital 모델">
            <select
              value={lpCapitalMode}
              onChange={e => setLpCapitalMode(e.target.value as LpCapitalMode)}
              style={inputStyle}
            >
              <option value="NPL_EQUITY_PLUS_FEES">NPL equity + Fees prefund (PDF 정합)</option>
              <option value="NPL_EQUITY">NPL equity 만 (단순 모델)</option>
            </select>
          </Param>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: c.textTertiary, lineHeight: 1.7 }}>
          ⓘ <strong>모델 설명</strong>: 본 보고서는 XRF Ripple Deck v4.0 (2026-05) 의 3-tier Fee System 적용 모델 시뮬레이션입니다.
          <br />• <strong>Vehicle Fee 산정 base</strong>: NPL 매입가 (AUM) 기준 · %/yr fees 365일 cap · Setup 1회
          <br />• <strong>Hurdle</strong>: 8%/yr × LP capital × 실제 운용기간 (NOT capped) — LP 우선 수익률
          <br />• <strong>Carry</strong>: (LP profit pre-carry − Hurdle) × tier별 Carry % (BASE 15% / CONS 10% / SAVE 5%)
          <br />• <strong>대부업체 출자</strong>: 2026-05-04 정책 변경 — Capital 출자 없음 (Servicing Fee 2.0%/yr 만 수령) · 이전 10% Day Exit 1:1 환원 모델 폐지
          <br />• <strong>LP Capital 모델 차이</strong>:
          <br />&nbsp;&nbsp;&nbsp;&nbsp;- <em>NPL equity + Fees prefund</em>: LP가 SPV 운영 fees + Hurdle 도 prefund (PDF Case 1 패턴, 실제 SPV 운영)
          <br />&nbsp;&nbsp;&nbsp;&nbsp;- <em>NPL equity 만</em>: LP는 deal 자기자본만 모금 (단순 모델, ROI 명목상 높음)
          <br />• 실제 deal 출시 시 SG SPV 셋업 비용·법무비·환율 변동 등이 추가 반영될 수 있습니다.
        </div>
      </Section>
    </div>
  )
}

// ─── Sub Components ───
function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }} className="xrf-section">
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

function Row4({ label, v1, v2, note, bold, last }: { label: string; v1: string; v2: string; note?: string; bold?: boolean; last?: boolean }) {
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <td style={{ padding: '8px 12px', color: bold ? '#1B3A5C' : '#374151', fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: '#1B3A5C', fontWeight: bold ? 700 : 500 }}>{v1}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: '#1B3A5C', fontWeight: bold ? 700 : 500 }}>{v2}</td>
      <td style={{ padding: '8px 12px', fontSize: 11, color: '#9CA3AF' }}>{note ?? ''}</td>
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

function CashflowRow({
  phase, event, amount, cumulative, note, bold, negative, positive, last,
}: {
  phase: string
  event: string
  amount: number
  cumulative: number
  note?: string
  bold?: boolean
  negative?: boolean
  positive?: boolean
  last?: boolean
}) {
  const amountColor = negative ? '#DC2626' : positive ? '#10B981' : '#9CA3AF'
  const amountStr = amount === 0 ? '—' : `${amount > 0 ? '+' : ''}${fmtUSDFull(amount)}`
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6', background: bold ? '#F5F7FA' : undefined }}>
      <td style={{ padding: '8px 12px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>{phase}</td>
      <td style={{ padding: '8px 12px', color: '#1B3A5C' }}>{event}{note && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{note}</div>}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: amountColor, fontWeight: bold ? 700 : 500 }}>{amountStr}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: cumulative >= 0 ? '#10B981' : '#1B3A5C', fontWeight: bold ? 700 : 500 }}>{`${cumulative > 0 ? '+' : ''}${fmtUSDFull(cumulative)}`}</td>
    </tr>
  )
}

function SensitivityTable({
  result,
  baselineDays,
  variant = 'days',
}: {
  result: { variable: string; baselineValue: number | string; cases: { label: string; lpRoi: number; lpIrrYr: number; tier: XrfTier; lpNetProfitPerLpUSD: number }[] }
  baselineDays: number
  variant?: 'days' | 'profit'
}) {
  const tierColor: Record<XrfTier, string> = {
    BASE: '#10B981',
    CONSERVATIVE: '#2E75B6',
    'SAVE-THE-DEAL': '#F59E0B',
    REJECT: '#DC2626',
  }
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', marginBottom: 6, letterSpacing: 0.5 }}>
        {result.variable}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F5F7FA', borderBottom: '1px solid #E5E8EC' }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6B7280', fontWeight: 600 }}>변동값</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', color: '#6B7280', fontWeight: 600 }}>LP ROI</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', color: '#6B7280', fontWeight: 600 }}>1인당 Net</th>
            <th style={{ textAlign: 'center', padding: '6px 10px', color: '#6B7280', fontWeight: 600 }}>Tier</th>
          </tr>
        </thead>
        <tbody>
          {result.cases.map((cs, idx) => {
            const isBaseline =
              variant === 'days'
                ? cs.label.startsWith(`${baselineDays}일`)
                : cs.label.startsWith('100%')
            return (
              <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: isBaseline ? '#FEF9C3' : undefined }}>
                <td style={{ padding: '6px 10px', color: '#374151', fontWeight: isBaseline ? 700 : 400 }}>
                  {cs.label} {isBaseline && '★'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'tabular-nums', color: tierColor[cs.tier], fontWeight: 600 }}>
                  {(cs.lpRoi * 100).toFixed(2)}%
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'tabular-nums', color: '#1B3A5C' }}>
                  ${Math.round(cs.lpNetProfitPerLpUSD).toLocaleString('en-US')}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: tierColor[cs.tier], fontWeight: 700, fontSize: 11 }}>
                  {cs.tier}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
