"use client"
/**
 * XRF Valuation Report Section
 *
 * NPL 자체 ROI → XRF 비히클 (XRF + KOF + NPL VC) 적용 후 LP 최종 ROI 산출.
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
import { computeFundMetrics, computeProfitAllocation, computeIndustryBenchmark } from '@/lib/xrf/metrics'
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

/**
 * McKinsey Blue 팔레트 (사용자 정책 2026-05-05 — 녹색·노란색 제거 · 블루 단색 체계)
 *   BASE         = Cobalt #2251FF    (signature electric — 최적 deal · premium signal)
 *   CONSERVATIVE = Steel Blue #2E75B6 (mid)
 *   SAVE-THE-DEAL= Mid Navy #1B3A5C   (deeper · concession)
 *   REJECT       = Red #DC2626        (critical — 유일한 비-블루 · 경고용)
 */
const tierColor: Record<XrfTier, string> = {
  BASE: '#2251FF',
  CONSERVATIVE: '#2E75B6',
  'SAVE-THE-DEAL': '#1B3A5C',
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

  // ── Fund Metrics (v7 — 5 metric, 모두 수식 기반) ──
  const fundMetrics = useMemo(() => {
    const lpDistributionUSD = selected.lpCapitalUSD + selected.lpNetProfitUSD
    const totalVehicleFeesUSD =
      selected.fees.xrfTotalUSD + selected.fees.platformTotalUSD + selected.fees.servicingUSD
    return computeFundMetrics({
      lpCapitalUSD: selected.lpCapitalUSD,
      lpDistributionUSD,
      holdingPeriodDays,
      nplPurchaseUSD: selected.nplPurchaseUSD,
      nplNetProfitUSD: selected.nplNetProfitUSD,
      totalVehicleFeesUSD,
      hurdleRateYr: 0.08,
    })
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

  // McKinsey Blue 단색 팔레트 (2026-05-05 사용자 정책)
  //   · 녹색 (emerald) → cobalt (signature electric)
  //   · 노란색 (amber) → skyBlue (light blue accent)
  //   · 변수명은 호환성 유지 — 색만 블루 계열로 교체
  const c = {
    navy: '#1B3A5C',          // mid navy
    navyDark: '#051C2C',      // hero panel bg
    navyDeepest: '#0A1628',   // title text
    blue: '#2E75B6',          // steel blue (CONS)
    cobalt: '#2251FF',        // electric (signature · BASE)
    skyBlue: '#6FB8E6',       // accent (light highlight)
    iceBlue: '#C7E5F0',       // soft bg
    brass: '#B7892C',         // exhibit eyebrow only
    emerald: '#2251FF',       // [legacy] → cobalt (LP / 양호 · 호환 변수명)
    amber: '#6FB8E6',         // [legacy] → skyBlue (warning · 호환 변수명)
    red: '#DC2626',           // CRITICAL only (REJECT)
    bg: '#FFFFFF',
    bgSoft: '#F5F7FA',        // table header soft gray
    bgIce: '#EFF6FF',         // info panel · cobalt-tinted
    bgDeep: '#F0F9FF',        // deeper info bg
    bgRed: '#FEF2F2',         // critical bg only
    border: '#E5E8EC',
    text: '#1B3A5C',
    textDeep: '#0A1628',
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

      {/* ───── EXHIBIT 2 — Pool 구조 (LP 100% 청약 + 10% NPL VC 차입금) ───── */}
      <Section title="EXHIBIT 2 · POOL 구조 (Pool Structure)" caption={`LP capital 모델: ${lpCapitalMode === 'NPL_EQUITY_PLUS_FEES' ? 'NPL equity + Fees prefund + 10% buffer (PDF 정합)' : 'NPL equity 만 (단순 모델)'} · LP 100% 청약 · NPL VC 차입금 분리`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <Row label="Pool 총액 (= LP 청약액)" value={fmtUSDFull(selected.poolUSD)} note={lpCapitalMode === 'NPL_EQUITY_PLUS_FEES' ? '= (NPL equity + Fees + Hurdle est.) × 1.111' : '= NPL totalEquity × 1.111'} bold />
            <Row label="  └ LP capital (100% 청약)" value={fmtUSDFull(selected.lpCapitalUSD)} note={`${numLPs}명 × ${fmtUSDFull(selected.lpCapitalPerLpUSD)} (1인당)`} />
            <Row label="  └ ⓘ NPL Vehicle Company 차입금 (10%)" value={fmtUSDFull(selected.daepuCapitalUSD)} note="LP→NPL VC 무이자 대여 · Day Exit 1:1 환급 · 수수료 아님" last />
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
          ⓘ <strong>NPL Vehicle Company (NPL VC)</strong>: 한국 NPL 시장에서 부실채권을 보관·회수하는 라이선스 보유 법인 (舊 '대부업체'). LP 가 Pool 100% 청약 후 그 중 10% 를 NPL VC 에 무이자 대여 (한국 대부업법 license capital 명목 · 수수료 아닌 자본 보관). 청산 시 100% 환급되어 LP 로 반환. NPL VC 수익은 별도의 Servicing Fee 2.0%/yr.
        </div>
      </Section>

      {/* ───── EXHIBIT 2b — 3-Tier 정의 · 기준 (BASE/CONS/SAVE/REJECT) ───── */}
      <Section
        title="EXHIBIT 2b · 3-TIER SYSTEM 정의 (Tier Definitions & Criteria)"
        caption="시뮬레이터가 BASE LP ROI 기준으로 자동 선택 — 각 tier 의 의미와 적용 조건"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '180px 140px 1fr', gap: 0, fontSize: 13, border: `1px solid ${c.border}` }}>
          {/* 헤더 */}
          <div style={{ padding: '10px 12px', background: c.bgSoft, fontWeight: 700, color: c.textSub, fontSize: 12, borderBottom: `2px solid ${c.border}` }}>Tier</div>
          <div style={{ padding: '10px 12px', background: c.bgSoft, fontWeight: 700, color: c.textSub, fontSize: 12, borderBottom: `2px solid ${c.border}` }}>발동 기준 (BASE LP ROI)</div>
          <div style={{ padding: '10px 12px', background: c.bgSoft, fontWeight: 700, color: c.textSub, fontSize: 12, borderBottom: `2px solid ${c.border}` }}>의미 · 양보 구조 · 의사결정</div>

          {/* BASE row */}
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'BASE' ? '#EFF6FF' : 'transparent', borderLeft: selected.tier === 'BASE' ? `3px solid ${c.emerald}` : '3px solid transparent' }}>
            <div style={{ fontWeight: 800, color: c.emerald, fontSize: 14 }}>★ BASE</div>
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>최적 · 양보 불필요</div>
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'BASE' ? '#EFF6FF' : 'transparent', fontWeight: 700, color: c.emerald }}>
            ≥ 20%
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'BASE' ? '#EFF6FF' : 'transparent', color: c.text, lineHeight: 1.6 }}>
            <strong>모든 주체 정상 fee 수령</strong> — XRF Carry 15% (entry) · KOF 2.50% · NPL VC Servicing 2.0% · LP ROI ≥ 20% 매력적 deal.
            <br /><span style={{ fontSize: 11, color: c.textSub }}>→ <strong>RWA 즉시 출시 가능</strong> · 기관·개인 LP 모두 권고 · 표준 시나리오</span>
          </div>

          {/* CONSERVATIVE row */}
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'CONSERVATIVE' ? '#F0F9FF' : 'transparent', borderLeft: selected.tier === 'CONSERVATIVE' ? `3px solid ${c.amber}` : '3px solid transparent' }}>
            <div style={{ fontWeight: 800, color: c.amber, fontSize: 14 }}>CONSERVATIVE</div>
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>보수적 · 부분 양보</div>
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'CONSERVATIVE' ? '#F0F9FF' : 'transparent', fontWeight: 700, color: c.amber }}>
            10% – 20%
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'CONSERVATIVE' ? '#F0F9FF' : 'transparent', color: c.text, lineHeight: 1.6 }}>
            <strong>XRF · KOF 부분 양보</strong> — XRF Carry 10% (entry) · Mgmt 0.4% · KOF 2.25% (AI/Sourcing/PM 압축).
            <br /><span style={{ fontSize: 11, color: c.textSub }}>→ <strong>RWA 출시 가능</strong> (LP 매력도 보강) · KR Margin 0.4% TP defense 유지 · NPL VC Servicing 변동 X</span>
          </div>

          {/* SAVE-THE-DEAL row */}
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'SAVE-THE-DEAL' ? '#FEF2F2' : 'transparent', borderLeft: selected.tier === 'SAVE-THE-DEAL' ? `3px solid #DC2626` : '3px solid transparent' }}>
            <div style={{ fontWeight: 800, color: '#DC2626', fontSize: 14 }}>SAVE-THE-DEAL</div>
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>Deal 살리기 · 최대 양보</div>
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'SAVE-THE-DEAL' ? '#FEF2F2' : 'transparent', fontWeight: 700, color: '#DC2626' }}>
            5% – 10%
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'SAVE-THE-DEAL' ? '#FEF2F2' : 'transparent', color: c.text, lineHeight: 1.6 }}>
            <strong>XRF · KOF 최대 양보</strong> — XRF Carry 5% (entry) · KOF 2.00% (AI/Sourcing/PM 추가 압축) · 모든 주체 양보로 LP 매력도 회복.
            <br /><span style={{ fontSize: 11, color: c.textSub }}>→ <strong>한계 매력 deal</strong> — 기관 LP 우선 검토 · 짧은 cycle · 회수율 낮은 deal 전형</span>
          </div>

          {/* REJECT row */}
          <div style={{ padding: '14px 12px', background: '#F9FAFB' }}>
            <div style={{ fontWeight: 800, color: '#6B7280', fontSize: 14 }}>REJECT</div>
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>부적합 · 재구조화 필요</div>
          </div>
          <div style={{ padding: '14px 12px', background: '#F9FAFB', fontWeight: 700, color: '#6B7280' }}>
            &lt; 5%
          </div>
          <div style={{ padding: '14px 12px', background: '#F9FAFB', color: c.textSub, lineHeight: 1.6 }}>
            <strong>RWA 출시 부적합</strong> — 모든 주체 양보로도 LP ROI 5% 미달 · LP 손실 위험 노출.
            <br /><span style={{ fontSize: 11, color: c.textSub }}>→ <strong>Deal 재구조화 필요</strong> (담보 추가 · 매입가 재협상 · 운용기간 단축 등)</span>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0F9FF', borderLeft: `3px solid ${c.blue}`, fontSize: 11, color: c.text, lineHeight: 1.6 }}>
          <strong>AUTO Tier 선택 로직</strong>: 시뮬레이터는 항상 <strong>BASE tier 시뮬레이션의 LP ROI</strong> 기준으로 tier 를 결정합니다.
          BASE 에서 LP ROI ≥ 20% 면 BASE 그대로 출시 · 10~20% 면 Carry/Fees 부분 양보 (CONS) 로 출시 · 5~10% 면 최대 양보 (SAVE) 로 deal 살리기 시도 · 5% 미만이면 REJECT (재구조화).
          <strong> 본 매물의 AUTO 판정: <span style={{ color: tierColor[selected.tier], fontWeight: 700 }}>{tierLabel[selected.tier]}</span></strong> ({selected.autoTierResult.selectedReason || '기본 시뮬레이션'}).
        </div>
      </Section>

      {/* ───── EXHIBIT 3 — Vehicle Fee (NPL VC 자본금 제외) ───── */}
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
            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>XRF Foundation (SG SPV · RWA Issuer)</td></tr>
            <Row label="  관리보수 Mgmt (%/yr · 365일 cap)" value={fmtUSDFull(selected.fees.xrfMgmtUSD)} note={tierLabel[selected.tier] === 'BASE' ? '0.5%/yr · 운영비' : '0.4%/yr · 운영비 (CONS/SAVE 양보)'} />
            <Row label="  SPV Setup (1회)" value={fmtUSDFull(selected.fees.xrfSetupUSD)} note={tierLabel[selected.tier] === 'BASE' ? '0.5% × NPL 매입가' : '0.3% × NPL 매입가'} />
            <Row label="  ★ Carry (5-tier 누진 · European Waterfall)" value={fmtUSDFull(selected.fees.xrfCarryUSD)} note={selected.fees.xrfCarryUSD > 0 ? `LP profit slice 별 marginal rate 적용 (entry ${tierLabel[selected.tier] === 'BASE' ? '15%' : tierLabel[selected.tier] === 'CONSERVATIVE' ? '10%' : '5%'})` : '⚠ Hurdle 8%/yr 미달 → Carry $0'} />
            <Row label="  XRF 수수료 합계 (Mgmt + Setup + Carry)" value={fmtUSDFull(selected.fees.xrfTotalUSD)} bold last />

            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>Korea Operation Firm (KOF) — Korean PM/Sourcing/Valuation 서비스 · BASE 2.50% · CONS 2.25% · SAVE 2.00%</td></tr>
            <Row label="  AI Valuation (ML 가격평가)" value={fmtUSDFull(selected.fees.platformAiUSD)} note={tierLabel[selected.tier] === 'BASE' ? '0.7%' : tierLabel[selected.tier] === 'CONSERVATIVE' ? '0.6%' : '0.5%'} />
            <Row label="  Pipeline Sourcing (딜 발굴·소싱)" value={fmtUSDFull(selected.fees.platformSourcingUSD)} note={tierLabel[selected.tier] === 'BASE' ? '1.0%' : tierLabel[selected.tier] === 'CONSERVATIVE' ? '0.9%' : '0.8%'} />
            <Row label="  PM Fee (프로젝트 매니지먼트)" value={fmtUSDFull(selected.fees.platformPmUSD)} note={tierLabel[selected.tier] === 'BASE' ? '0.4%' : tierLabel[selected.tier] === 'CONSERVATIVE' ? '0.35%' : '0.3%'} />
            <Row label="  KR Margin (TP 방어선 ≥15%)" value={fmtUSDFull(selected.fees.platformMarginUSD)} note="0.4% 모든 tier 고정" />
            <Row label="  KOF 수수료 합계" value={fmtUSDFull(selected.fees.platformTotalUSD)} bold last />

            <tr><td colSpan={3} style={{ padding: '8px 12px', background: c.bgSoft, fontWeight: 700, color: c.navy, fontSize: 12 }}>NPL Vehicle Company (NPL VC) — Korean NPL 라이선스 보유 · 채권 보관·회수 법인</td></tr>
            <Row label="  Servicing Fee (시장 표준 라이선스)" value={fmtUSDFull(selected.fees.servicingUSD)} note="2.0% × 매입가 · 모든 tier 동일 (차입금에 대한 수수료 아님)" last />
          </tbody>
        </table>

        {/* ★ v7: 5-tier Carry 누진표 (European Waterfall) */}
        <div style={{ marginTop: 16, padding: 12, background: '#F8FAFC', border: `1px solid ${c.border}`, borderRadius: 4 }}>
          <div style={{ fontWeight: 700, color: c.navy, fontSize: 12, marginBottom: 8 }}>
            ⓘ XRF Carry 5-tier 누진 구조 (European Waterfall · v7)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.border}`, color: c.textSub }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>LP gross ROI 구간 (annualized)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>BASE</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>CONSERVATIVE</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>SAVE-THE-DEAL</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>설명</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 12 }}>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '6px 8px', color: c.text }}>&lt; 8% (Hurdle)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>0%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>0%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>0%</td>
                <td style={{ padding: '6px 8px', color: c.textSub, fontSize: 11 }}>LP 우선 회수 · Carry 발생 X</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '6px 8px', color: c.text }}>8% – 20% (Entry)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'BASE' ? 700 : 400, color: tierLabel[selected.tier] === 'BASE' ? c.emerald : c.text }}>15%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'CONSERVATIVE' ? 700 : 400, color: tierLabel[selected.tier] === 'CONSERVATIVE' ? c.emerald : c.text }}>10%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? 700 : 400, color: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? c.emerald : c.text }}>5%</td>
                <td style={{ padding: '6px 8px', color: c.textSub, fontSize: 11 }}>LP 손실 없는 정도의 Carry</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '6px 8px', color: c.text }}>20% – 40%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'BASE' ? 700 : 400, color: tierLabel[selected.tier] === 'BASE' ? c.emerald : c.text }}>20%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'CONSERVATIVE' ? 700 : 400, color: tierLabel[selected.tier] === 'CONSERVATIVE' ? c.emerald : c.text }}>15%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? 700 : 400, color: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? c.emerald : c.text }}>10%</td>
                <td style={{ padding: '6px 8px', color: c.textSub, fontSize: 11 }}>20%+ profit slice</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '6px 8px', color: c.text }}>40% – 60%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'BASE' ? 700 : 400, color: tierLabel[selected.tier] === 'BASE' ? c.emerald : c.text }}>25%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'CONSERVATIVE' ? 700 : 400, color: tierLabel[selected.tier] === 'CONSERVATIVE' ? c.emerald : c.text }}>20%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? 700 : 400, color: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? c.emerald : c.text }}>15%</td>
                <td style={{ padding: '6px 8px', color: c.textSub, fontSize: 11 }}>40%+ profit slice</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', color: c.text }}>60%+ (Top tier)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'BASE' ? 700 : 400, color: tierLabel[selected.tier] === 'BASE' ? c.emerald : c.text }}>30%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'CONSERVATIVE' ? 700 : 400, color: tierLabel[selected.tier] === 'CONSERVATIVE' ? c.emerald : c.text }}>25%</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? 700 : 400, color: tierLabel[selected.tier] === 'SAVE-THE-DEAL' ? c.emerald : c.text }}>20%</td>
                <td style={{ padding: '6px 8px', color: c.textSub, fontSize: 11 }}>고수익 deal · XRF 적정 보상</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: c.textSub, marginTop: 8, lineHeight: 1.5 }}>
            <strong>산정 방식 (Marginal Carry):</strong> 각 LP profit slice 를 해당 구간 rate 로 곱하여 누적 합산.
            예: LP gross ROI 41.5% → (8-20%) slice × 15% + (20-40%) slice × 20% + (40-41.5%) slice × 25% (BASE).
            Hurdle 8% 미달 시 모든 slice = $0 (Carry 발생 X).
          </div>
        </div>

        <div style={{ fontSize: 11, color: c.text, marginTop: 12, padding: '10px 14px', background: '#EFF6FF', borderLeft: '3px solid #2251FF', borderRadius: 4 }}>
          ⚠ <strong>XRF Carry 조건부 수령</strong>: LP 가 <strong>Hurdle Rate 8%/yr × 운용기간</strong> 달성 시 그 초과분에 대해서만 5-tier 누진율 적용. Hurdle 미달 시 Carry = $0 (XRF 는 Mgmt + Setup 만 수령).
          {selected.fees.xrfCarryUSD === 0 && <span style={{ color: c.amber, fontWeight: 700, marginLeft: 6 }}>← 본 deal 은 Carry 미발생 상태</span>}
        </div>
        <div style={{ fontSize: 10, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
          ⓘ 2026-05-05 v7 (XRF_Simulator_v7.xlsx 정합): KOF 4종 (AI 0.7/0.6/0.5% · Sourcing 1.0/0.9/0.8% · PM 0.4/0.35/0.3% · Margin 0.4% flat) · NPL VC Servicing 2.0% × 매입가 (FLAT, no duration cap). XRF Carry 5-tier marginal (European Waterfall): Hurdle 8%/yr 미달 시 0, 그 외 8-20/20-40/40-60/60%+ slice 별 marginal rate 적용. NPL VC 차입금 10%: LP→NPL VC 무이자 대여 · Day Exit 100% 환급.
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
            <CashflowRow phase="Day 0" event="└ NPL VC 차입금 (10%)" amount={0} cumulative={-selected.lpCapitalUSD} note={`${fmtUSDFull(selected.daepuCapitalUSD)} 무이자 대여 (Pool 내 분리 · Day Exit 환급)`} />
            <CashflowRow phase="Day 0~M3" event="XRF SPV Setup (1회)" amount={0} cumulative={-selected.lpCapitalUSD} note="prefund 차감 · LP 직접 X" />
            <CashflowRow phase="Day ~30" event="NPL 매입 + 질권대출 실행" amount={0} cumulative={-selected.lpCapitalUSD} note="Pool → NPL 매입가 funding" />
            <CashflowRow phase="운용 중" event="XRF/KOF/NPL VC fees prefund" amount={0} cumulative={-selected.lpCapitalUSD} note={`LP capital 에서 ${fmtUSDFull(selected.fees.xrfMgmtUSD + selected.fees.xrfSetupUSD + selected.fees.platformTotalUSD + selected.fees.servicingUSD)} 차감`} />
            <CashflowRow phase={`Day ${holdingPeriodDays}`} event="법원 배당 + NPL VC 차입금 환급 (1:1)" amount={selected.lpCapitalUSD + selected.lpNetProfitUSD} cumulative={selected.lpNetProfitUSD} positive note={`LP capital ${fmtUSDFull(selected.lpCapitalUSD)} + Net Profit ${fmtUSDFull(selected.lpNetProfitUSD)} (차입금 ${fmtUSDFull(selected.daepuCapitalUSD)} 포함 환급)`} />
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

      {/* ───── EXHIBIT 5b — XRF Vehicle vs 산업 표준 (5 metric · 수식 기반) ───── */}
      <Section
        title="EXHIBIT 5b · FUND METRICS — XRF Vehicle vs 산업 표준"
        caption="자산 레벨 + LP 레벨 + Vehicle 비용 효율 — 5개 metric 모두 수식 기반 산출 · 산업 벤치마크는 Hurdle Rate × 표준 premium 으로 도출"
      >
        {(() => {
          // 산업 벤치마크 — 수식 기반 (하드코딩 X)
          //   median IRR  = Hurdle (8%) + 4%/yr premium  = 12%/yr
          //   topQ IRR    = Hurdle (8%) + 12%/yr premium = 20%/yr
          //   MoM         = (1 + IRR)^durationYr (복리)
          // 산업 벤치마크 — IRR 은 deal 무관 FIXED, MoM 은 본 deal 운용기간 복리 환산
          const benchmark = computeIndustryBenchmark(0.08, holdingPeriodDays / 365)
          return (
            <>
              {/* Metric 정의 박스 — 각 4 metric 의 공식과 의미 */}
              <div style={{ marginBottom: 16, padding: 14, background: '#F8FAFC', border: `1px solid ${c.border}`, borderRadius: 4 }}>
                <div style={{ fontWeight: 700, color: c.navy, fontSize: 12, marginBottom: 10 }}>
                  ⓘ 4 Metric 정의 (Definitions)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 8, fontSize: 12, lineHeight: 1.6, color: c.text }}>
                  <div>
                    <strong style={{ color: c.navy }}>① Net DPI (LP):</strong>{' '}
                    <span style={{ color: c.textSub }}>= LP 분배 / LP 출자</span>{' '}
                    <span style={{ fontStyle: 'italic', color: c.textTertiary }}>
                      — Vehicle 모든 fee 차감 후 LP 가 실제로 받는 회수 비율 (1.0x = 원금만 회수, 1.5x = 50% 수익)
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: c.navyDark }}>② Gross MoM (Asset):</strong>{' '}
                    <span style={{ color: c.textSub }}>= NPL 회수 / NPL 매입가</span>{' '}
                    <span style={{ fontStyle: 'italic', color: c.textTertiary }}>
                      — 자산 (NPL deal) 자체의 gross multiple. Vehicle 구조 (XRF/KOF/NPL VC) 와 senior loan leverage 무관 — 순수 자산 성과
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: tierColor[selected.tier] }}>③ XIRR (Compound):</strong>{' '}
                    <span style={{ color: c.textSub }}>= 연환산 복리 IRR (Newton's method)</span>{' '}
                    <span style={{ fontStyle: 'italic', color: c.textTertiary }}>
                      — Excel XIRR 함수 동일 알고리즘. 비균등 시점 cash flow 의 내부수익률. 단순 연환산 IRR (LP ROI ÷ 운용기간) 보다 엄밀한 복리 기준 IRR
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: c.emerald }}>④ Hurdle Spread:</strong>{' '}
                    <span style={{ color: c.textSub }}>= XIRR − Hurdle 8%/yr</span>{' '}
                    <span style={{ fontStyle: 'italic', color: c.textTertiary }}>
                      — LP 우선 수익률 (Hurdle Rate) 대비 초과 수익. 양수면 XRF Carry 발동 임계 통과 · 음수면 LP 우선 회수 가능
                    </span>
                  </div>
                </div>
              </div>

              {/* 4개 차별화 metric 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                <MetricCard
                  label="Net DPI (LP)"
                  value={`${fundMetrics.dpi.toFixed(3)}x`}
                  sub="LP 분배 / 출자 (fee 차감 후)"
                  tint={c.navy}
                />
                <MetricCard
                  label="Gross MoM (Asset)"
                  value={`${fundMetrics.grossMomAsset.toFixed(3)}x`}
                  sub="NPL 회수 / 매입가 (자산 레벨)"
                  tint={c.navyDark}
                />
                <MetricCard
                  label="XIRR (Compound)"
                  value={`${fmtPct(fundMetrics.xirr)}/yr`}
                  sub="LP 복리 연환산 IRR"
                  tint={tierColor[selected.tier]}
                />
                <MetricCard
                  label="Hurdle Spread"
                  value={`${fundMetrics.hurdleSpread > 0 ? '+' : ''}${(fundMetrics.hurdleSpread * 100).toFixed(2)}%p`}
                  sub="XIRR − Hurdle 8%/yr"
                  tint={fundMetrics.hurdleSpread > 0 ? c.emerald : '#DC2626'}
                />
              </div>

              {/* 벤치마크 비교표 — 수식 기반 (산업 중앙값만) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 180 }}>Metric</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: c.emerald, fontWeight: 700, width: 140 }}>★ XRF Vehicle</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 160 }}>산업 중앙값 (수식)</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>판정</th>
                  </tr>
                </thead>
                <tbody>
                  <BenchmarkRow
                    label="Net DPI (LP 레벨)"
                    xrf={fundMetrics.dpi}
                    median={benchmark.median.dpi}
                    format="x"
                    c={c}
                    note="(1 + median IRR)^운용기간 = (1.12)^운용"
                  />
                  <BenchmarkRow
                    label="Gross MoM (Asset)"
                    xrf={fundMetrics.grossMomAsset}
                    median={benchmark.median.mom}
                    format="x"
                    c={c}
                    note="자산 레벨 — Vehicle 구조 무관"
                  />
                  <BenchmarkRow
                    label="XIRR (annualized)"
                    xrf={fundMetrics.xirr}
                    median={benchmark.median.irr}
                    format="pct"
                    c={c}
                    note="median = Hurdle + 4%"
                  />
                  <BenchmarkRow
                    label="Hurdle Spread (LP 초과)"
                    xrf={fundMetrics.hurdleSpread}
                    median={benchmark.median.irr - 0.08}
                    format="pct"
                    c={c}
                    note="XIRR − Hurdle (8%/yr 우선수익률 대비)"
                    last
                  />
                </tbody>
              </table>

              <div style={{ fontSize: 11, color: c.text, marginTop: 12, padding: '10px 14px', background: '#F0F9FF', borderLeft: `3px solid ${c.blue}`, lineHeight: 1.6 }}>
                <strong>산업 벤치마크 도출 수식</strong> (Hurdle Rate × premium · 출처: Cambridge Associates · Preqin · ILPA · NPL/Special-Situations Private Debt 2020-2024):
                <br />• 산업 중앙값 IRR (annualized) = Hurdle 8% + 4% premium = <strong>{fmtPct(benchmark.median.irr)}/yr</strong> ★ <em>deal 무관 FIXED</em>
                <br />• 산업 중앙값 MoM = (1 + IRR) ^ <strong>본 deal 운용기간 ({(holdingPeriodDays/365).toFixed(2)}년)</strong> = <strong>{benchmark.median.mom.toFixed(3)}x</strong>
              </div>
              <div style={{ fontSize: 11, color: '#1B3A5C', marginTop: 8, padding: '10px 14px', background: '#F5F7FA', borderLeft: `3px solid ${c.amber}`, lineHeight: 1.6 }}>
                ⚠ <strong>중요</strong>: 산업 중앙값 <strong>MoM (배수)</strong> 은 본 deal 운용기간 ({(holdingPeriodDays/365).toFixed(2)}년) 으로 복리 환산되어 case 마다 달라집니다. 종로 (1.58년) MoM 1.196x · 잠실 (0.64년) MoM 1.076x 처럼 다른 이유는 동일한 산업 IRR 12%/yr 기준이라도 운용기간 차이로 multiple 값이 변하기 때문 (수학적으로 자연스러움). <strong>direct 비교는 IRR / Hurdle Spread (annualized) 추천</strong> — deal 무관 FIXED 라 fair.
              </div>
              <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
                ⓘ <strong>4 metric 차별화</strong>: 이전 DPI/TVPI/MoM/Equity Multiple 은 closed fund (NAV=0) 에서 모두 동일 = LP DPI. v7 부터 자산-레벨 (Gross MoM) · LP 초과수익 (Hurdle Spread) 으로 차별화. 단순 IRR ({fmtPct(selected.lpIrrYr)}/yr) vs XIRR ({fmtPct(fundMetrics.xirr)}/yr) 차이는 단순 연환산 vs 복리 계산.
              </div>
            </>
          )
        })()}
      </Section>

      {/* ───── EXHIBIT 5c — PROFIT ALLOCATION 워터폴 ───── */}
      <Section title="EXHIBIT 5c · PROFIT ALLOCATION (NPL 순수익 분배)" caption={`NPL Net Profit ${fmtUSDFull(selected.nplNetProfitUSD)} → 6개 항목 분배 (XRF · KOF · NPL VC · LP)`}>
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
                  {item.category === 'XRF' && (
                    <div style={{ fontSize: 10, color: c.textSub, marginTop: 4, marginLeft: 18, lineHeight: 1.6 }}>
                      <div>
                        Mgmt {fmtUSDFull(selected.fees.xrfMgmtUSD)} (고정 운영비) ·
                        Setup {fmtUSDFull(selected.fees.xrfSetupUSD)} (1회) ·
                        <strong style={{ color: selected.fees.xrfCarryUSD > 0 ? c.emerald : c.amber }}>
                          {' '}Carry ★ {fmtUSDFull(selected.fees.xrfCarryUSD)}
                        </strong>
                      </div>
                      {selected.fees.xrfCarryUSD > 0 ? (
                        <div style={{ color: c.textTertiary, marginTop: 2 }}>
                          ⓘ Carry는 LP 가 Hurdle 8%/yr 달성 시 초과분에 5-tier marginal rate 적용 (성과 조건부 지불)
                        </div>
                      ) : (
                        <div style={{ color: c.amber, marginTop: 2, fontWeight: 600 }}>
                          ⚠ Carry $0 — 본 deal LP profit 이 Hurdle 8%/yr 미달 → 산정된 Carry $0 (XRF 에 지불되지 않음)
                        </div>
                      )}
                    </div>
                  )}
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
          <strong style={{ color: c.amber }}>{fmtPct(selected.fees.platformTotalUSD / selected.nplNetProfitUSD)}</strong> 가 KOF,{' '}
          <strong style={{ color: '#9CA3AF' }}>{fmtPct(selected.fees.servicingUSD / selected.nplNetProfitUSD)}</strong> 가 NPL VC로 분배.
        </div>
      </Section>

      {/* ───── EXHIBIT 5d — SENSITIVITY 분석 ───── */}
      <Section title="EXHIBIT 5d · SENSITIVITY 분석 (단일 변수 변동)" caption="운용기간 / NPL 순수익 변동이 LP ROI · Tier 에 미치는 영향">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <SensitivityTable result={holdingSensitivity} baselineDays={holdingPeriodDays} />
          <SensitivityTable result={profitSensitivity} baselineDays={holdingPeriodDays} variant="profit" />
        </div>
      </Section>

      {/* ───── EXHIBIT 6 — 3-TIER 비교 (AUTO 컬럼 강조 · McKinsey style) ───── */}
      <Section title="EXHIBIT 6 · 3-TIER 비교 시뮬레이션" caption="동일 NPL deal 에 BASE (LP ROI ≥ 20%) / CONSERVATIVE (10-20%) / SAVE-THE-DEAL (5-10%) 적용 시 결과 — EXHIBIT 2b 정의 참조 · ★ AUTO 평가 tier 강조">
        {(() => {
          // AUTO selected tier — column highlight 처리
          const autoCol: 1 | 2 | 3 =
            selected.tier === 'BASE' ? 1
            : selected.tier === 'CONSERVATIVE' ? 2
            : selected.tier === 'SAVE-THE-DEAL' ? 3
            : 1
          const colorByTier: Record<XrfTier, string> = {
            BASE: c.emerald,
            CONSERVATIVE: c.blue,
            'SAVE-THE-DEAL': c.amber,
            REJECT: c.red,
          }
          const accentColor = colorByTier[selected.tier]
          // 색상 별 light 배경 (AUTO 컬럼 highlight)
          const highlightBg: Record<XrfTier, string> = {
            BASE: '#EFF6FF',
            CONSERVATIVE: '#EFF6FF',
            'SAVE-THE-DEAL': '#F5F7FA',
            REJECT: '#FEF2F2',
          }
          const colHighlight = highlightBg[selected.tier]

          const TierHeader = ({ tier, isAuto }: { tier: XrfTier; isAuto: boolean }) => (
            <th
              style={{
                textAlign: 'right',
                padding: '12px 14px',
                color: isAuto ? '#FFFFFF' : c.textSub,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.04em',
                background: isAuto ? c.navyDark : 'transparent',
                borderTop: isAuto ? `3px solid ${accentColor}` : 'none',
                position: 'relative',
              }}
            >
              {isAuto && <span style={{ display: 'inline-block', marginRight: 6, color: accentColor, fontSize: 14 }}>★</span>}
              {tierLabel[tier]}
              {isAuto && (
                <div style={{ fontSize: 9, color: accentColor, fontWeight: 600, letterSpacing: '0.12em', marginTop: 2 }}>
                  AUTO 평가
                </div>
              )}
            </th>
          )

          return (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: c.textSub, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em' }}>METRIC</th>
                    <TierHeader tier="BASE" isAuto={selected.tier === 'BASE'} />
                    <TierHeader tier="CONSERVATIVE" isAuto={selected.tier === 'CONSERVATIVE'} />
                    <TierHeader tier="SAVE-THE-DEAL" isAuto={selected.tier === 'SAVE-THE-DEAL'} />
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="LP Capital Call (1인당)" v1={fmtUSDFull(base.lpCapitalPerLpUSD)} v2={fmtUSDFull(conservative.lpCapitalPerLpUSD)} v3={fmtUSDFull(saveTheDeal.lpCapitalPerLpUSD)} highlightCol={autoCol} highlightBg={colHighlight} />
                  <CompareRow label="LP Net Profit (1인당)" v1={fmtUSDFull(base.lpNetProfitPerLpUSD)} v2={fmtUSDFull(conservative.lpNetProfitPerLpUSD)} v3={fmtUSDFull(saveTheDeal.lpNetProfitPerLpUSD)} highlightCol={autoCol} highlightBg={colHighlight} />
                  <CompareRow label="LP ROI (절대)" v1={fmtPct(base.lpRoi)} v2={fmtPct(conservative.lpRoi)} v3={fmtPct(saveTheDeal.lpRoi)} bold highlightCol={autoCol} highlightBg={colHighlight} accentColor={accentColor} />
                  <CompareRow label="LP IRR (연환산)" v1={`${fmtPct(base.lpIrrYr)}/yr`} v2={`${fmtPct(conservative.lpIrrYr)}/yr`} v3={`${fmtPct(saveTheDeal.lpIrrYr)}/yr`} highlightCol={autoCol} highlightBg={colHighlight} />
                  <CompareRow label="XRF 수수료 합계" v1={fmtUSDFull(base.fees.xrfTotalUSD)} v2={fmtUSDFull(conservative.fees.xrfTotalUSD)} v3={fmtUSDFull(saveTheDeal.fees.xrfTotalUSD)} highlightCol={autoCol} highlightBg={colHighlight} />
                  <CompareRow label="KOF 수수료 합계" v1={fmtUSDFull(base.fees.platformTotalUSD)} v2={fmtUSDFull(conservative.fees.platformTotalUSD)} v3={fmtUSDFull(saveTheDeal.fees.platformTotalUSD)} highlightCol={autoCol} highlightBg={colHighlight} />
                  <CompareRow label="NPL VC Servicing 수수료" v1={fmtUSDFull(base.fees.servicingUSD)} v2={fmtUSDFull(conservative.fees.servicingUSD)} v3={fmtUSDFull(saveTheDeal.fees.servicingUSD)} last highlightCol={autoCol} highlightBg={colHighlight} />
                </tbody>
              </table>
              <div style={{
                marginTop: 12,
                padding: '14px 18px',
                background: c.navyDark,
                color: '#FFFFFF',
                borderTop: `3px solid ${accentColor}`,
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: accentColor, fontWeight: 700, marginBottom: 4 }}>
                  AUTO VERDICT · ★ {tierLabel[selected.tier]}
                </div>
                <div style={{ color: '#FFFFFF', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 14, fontWeight: 500 }}>
                  {selected.autoTierResult.selectedReason}
                </div>
              </div>
            </>
          )
        })()}
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
          <br />• <strong>NPL VC 차입금 (v5)</strong>: LP 가 Pool 100% 청약 후 그 중 10%를 NPL VC에 무이자 대여 (대부업법 license capital). 청산 시 LP 로 100% 환급. 수수료 아님 — NPL VC 수익은 별도 Servicing Fee 2.0%/yr.
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
/**
 * Section — McKinsey Advisory v3 스타일.
 *   · EXHIBIT 번호 = brass gold (#B7892C) small caps eyebrow
 *   · 본문 title  = Georgia serif 16px black
 *   · 1pt cobalt (#2251FF) rule under title — McKinsey signature
 *   · caption = 13px neutral gray
 *
 * Title 'EXHIBIT 5b · FUND METRICS' 형식을 split 하여 eyebrow + body 분리.
 */
function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  // 'EXHIBIT 5b · ...' → eyebrow / body split
  const dotIndex = title.indexOf('·')
  const eyebrow = dotIndex > 0 ? title.slice(0, dotIndex).trim() : title
  const body = dotIndex > 0 ? title.slice(dotIndex + 1).trim() : ''

  return (
    <section style={{ marginBottom: 36 }} className="xrf-section">
      <div style={{ marginBottom: 16 }}>
        {/* Eyebrow — brass gold, small caps */}
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#B7892C',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {eyebrow}
        </div>
        {/* Body title — Georgia serif, deep navy */}
        {body && (
          <div style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 18,
            fontWeight: 700,
            color: '#0A1628',
            letterSpacing: '-0.005em',
            lineHeight: 1.2,
            marginBottom: 8,
          }}>
            {body}
          </div>
        )}
        {/* 1pt cobalt rule — McKinsey signature */}
        <div style={{ height: 1, background: '#2251FF', width: 40, marginBottom: 8 }} />
        {caption && (
          <div style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.55, marginTop: 6 }}>
            {caption}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * MetricCard — McKinsey KPI tile.
 *   · 1pt cobalt top accent
 *   · Georgia serif numerals (large)
 *   · Tabular nums for alignment
 *   · Subtle hover/border
 */
function MetricCard({ label, value, sub, tint }: { label: string; value: string; sub?: string; tint: string }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: '#FFFFFF',
      border: '1px solid #E5E8EC',
      borderTop: `3px solid ${tint}`,
      boxShadow: '0 1px 2px rgba(10, 22, 40, 0.04)',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#6B7280',
        marginBottom: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 26,
        fontWeight: 700,
        color: tint,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.015em',
        lineHeight: 1.05,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 10.5,
          color: '#9CA3AF',
          marginTop: 6,
          lineHeight: 1.4,
        }}>
          {sub}
        </div>
      )}
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

/**
 * BenchmarkRow — XRF Vehicle 의 metric 을 산업 중앙값과 비교.
 * format='x' → multiple (1.234x), format='pct' → percentage.
 */
function BenchmarkRow({
  label, xrf, median, format, c, note, last,
}: {
  label: string
  xrf: number
  median: number
  format: 'x' | 'pct'
  c: { emerald: string; amber: string; navy: string; textSub: string; text: string }
  note?: string
  last?: boolean
}) {
  const fmt = (v: number) => format === 'x' ? `${v.toFixed(3)}x` : `${(v * 100).toFixed(2)}%`
  const verdict =
    xrf >= median * 1.30 ? { color: c.emerald, label: '★ Median 크게 상회 — 우수' }
    : xrf >= median       ? { color: c.emerald, label: '✓ Median 상회 — 양호' }
    : xrf >= median * 0.85 ? { color: c.amber, label: '~ Median 근접 — 평균 수준' }
    : { color: '#DC2626', label: '⚠ Median 미달 — 검토 필요' }

  const cellRight = { padding: '10px 12px', textAlign: 'right' as const, fontFamily: 'tabular-nums' }
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <td style={{ padding: '10px 12px', color: c.text, fontWeight: 500 }}>
        {label}
        {note && <div style={{ fontSize: 10, color: c.textSub, marginTop: 2, fontWeight: 400 }}>{note}</div>}
      </td>
      <td style={{ ...cellRight, color: c.emerald, fontWeight: 700, fontSize: 14 }}>{fmt(xrf)}</td>
      <td style={{ ...cellRight, color: c.text }}>{fmt(median)}</td>
      <td style={{ padding: '10px 12px', color: verdict.color, fontWeight: 600, fontSize: 12 }}>{verdict.label}</td>
    </tr>
  )
}

function CompareRow({
  label, v1, v2, v3, bold, last, highlightCol, highlightBg, accentColor,
}: {
  label: string
  v1: string
  v2: string
  v3: string
  bold?: boolean
  last?: boolean
  /** AUTO 평가된 컬럼 번호 (1=BASE, 2=CONS, 3=SAVE) */
  highlightCol?: 1 | 2 | 3
  /** highlight 컬럼 배경 색 */
  highlightBg?: string
  /** highlight 컬럼 강조 색 (LP ROI 등 bold 행 텍스트 색) */
  accentColor?: string
}) {
  const baseCell = { padding: '10px 14px', textAlign: 'right' as const, fontFamily: 'tabular-nums', color: '#1B3A5C', fontWeight: bold ? 700 : 500 }
  const cell = (col: 1 | 2 | 3) => {
    const isHighlight = highlightCol === col
    return {
      ...baseCell,
      background: isHighlight ? (highlightBg ?? 'transparent') : 'transparent',
      color: isHighlight && bold && accentColor ? accentColor : baseCell.color,
      fontWeight: isHighlight ? 700 : baseCell.fontWeight,
      borderLeft: isHighlight ? `2px solid #FFFFFF` : 'none',
      borderRight: isHighlight ? `2px solid #FFFFFF` : 'none',
    }
  }
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <td style={{ padding: '10px 14px', color: bold ? '#1B3A5C' : '#374151', fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={cell(1)}>{v1}</td>
      <td style={cell(2)}>{v2}</td>
      <td style={cell(3)}>{v3}</td>
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
  const amountColor = negative ? '#DC2626' : positive ? '#2251FF' : '#9CA3AF'
  const amountStr = amount === 0 ? '—' : `${amount > 0 ? '+' : ''}${fmtUSDFull(amount)}`
  return (
    <tr style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6', background: bold ? '#F5F7FA' : undefined }}>
      <td style={{ padding: '8px 12px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>{phase}</td>
      <td style={{ padding: '8px 12px', color: '#1B3A5C' }}>{event}{note && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{note}</div>}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: amountColor, fontWeight: bold ? 700 : 500 }}>{amountStr}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'tabular-nums', color: cumulative >= 0 ? '#2251FF' : '#1B3A5C', fontWeight: bold ? 700 : 500 }}>{`${cumulative > 0 ? '+' : ''}${fmtUSDFull(cumulative)}`}</td>
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
    BASE: '#2251FF',
    CONSERVATIVE: '#2E75B6',
    'SAVE-THE-DEAL': '#6FB8E6',
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
              <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: isBaseline ? '#F0F9FF' : undefined }}>
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
