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
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'BASE' ? '#ECFDF5' : 'transparent', borderLeft: selected.tier === 'BASE' ? `3px solid ${c.emerald}` : '3px solid transparent' }}>
            <div style={{ fontWeight: 800, color: c.emerald, fontSize: 14 }}>★ BASE</div>
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>최적 · 양보 불필요</div>
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'BASE' ? '#ECFDF5' : 'transparent', fontWeight: 700, color: c.emerald }}>
            ≥ 20%
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'BASE' ? '#ECFDF5' : 'transparent', color: c.text, lineHeight: 1.6 }}>
            <strong>모든 주체 정상 fee 수령</strong> — XRF Carry 15% (entry) · KOF 2.50% · NPL VC Servicing 2.0% · LP ROI ≥ 20% 매력적 deal.
            <br /><span style={{ fontSize: 11, color: c.textSub }}>→ <strong>RWA 즉시 출시 가능</strong> · 기관·개인 LP 모두 권고 · 표준 시나리오</span>
          </div>

          {/* CONSERVATIVE row */}
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'CONSERVATIVE' ? '#FEF9C3' : 'transparent', borderLeft: selected.tier === 'CONSERVATIVE' ? `3px solid ${c.amber}` : '3px solid transparent' }}>
            <div style={{ fontWeight: 800, color: c.amber, fontSize: 14 }}>CONSERVATIVE</div>
            <div style={{ fontSize: 11, color: c.textSub, marginTop: 2 }}>보수적 · 부분 양보</div>
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'CONSERVATIVE' ? '#FEF9C3' : 'transparent', fontWeight: 700, color: c.amber }}>
            10% – 20%
          </div>
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${c.border}`, background: selected.tier === 'CONSERVATIVE' ? '#FEF9C3' : 'transparent', color: c.text, lineHeight: 1.6 }}>
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

        <div style={{ fontSize: 11, color: c.text, marginTop: 12, padding: '10px 14px', background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: 4 }}>
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

      {/* ───── EXHIBIT 5b — XRF Vehicle vs 산업 표준 (PE/VC NPL Fund 벤치마크) ───── */}
      <Section
        title="EXHIBIT 5b · FUND METRICS — XRF Vehicle vs 산업 표준"
        caption="PE/VC 표준 지표 (DPI · TVPI · MoM · XIRR · Equity Multiple) · 본 deal vs NPL/Special-Situations 펀드 산업 벤치마크 비교"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
          <MetricCard label="DPI" value={`${fundMetrics.dpi.toFixed(3)}x`} sub="Distributions / Paid-In" tint={c.navy} />
          <MetricCard label="TVPI" value={`${fundMetrics.tvpi.toFixed(3)}x`} sub="Total Value / Paid-In" tint={c.navyDark} />
          <MetricCard label="MoM" value={`${fundMetrics.mom.toFixed(3)}x`} sub="Multiple of Money" tint={c.blue} />
          <MetricCard label="Equity Multiple" value={`${fundMetrics.equityMultiple.toFixed(3)}x`} sub="LP 분배 / 출자" tint={c.navy} />
          <MetricCard label="XIRR (복리)" value={`${fmtPct(fundMetrics.xirr)}/yr`} sub="Newton's method" tint={tierColor[selected.tier]} />
        </div>

        {/* 벤치마크 비교표 — XRF Vehicle vs PE/VC NPL Fund Industry Median / Top Quartile */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.bgSoft, borderBottom: `2px solid ${c.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 180 }}>Metric</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.emerald, fontWeight: 700, width: 120 }}>★ XRF Vehicle (본 deal)</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 130 }}>NPL Fund 산업 중앙값</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', color: c.textSub, fontWeight: 600, width: 120 }}>Top Quartile</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: c.textSub, fontWeight: 600 }}>판정 vs 산업 중앙값</th>
            </tr>
          </thead>
          <tbody>
            {/* DPI: NPL/Special-Situations 펀드 산업 median 1.20-1.40x · Top Quartile 1.60x+ */}
            <BenchmarkRow
              label="DPI · 분배 / 출자 비율"
              xrf={fundMetrics.dpi}
              median={1.30}
              topQuartile={1.60}
              format="x"
              c={c}
              note="실현된 분배 / LP 납입자본"
            />
            <BenchmarkRow
              label="TVPI · 총가치 / 출자"
              xrf={fundMetrics.tvpi}
              median={1.40}
              topQuartile={1.80}
              format="x"
              c={c}
              note="(분배 + 잔여NAV) / LP 납입자본"
            />
            <BenchmarkRow
              label="MoM · Multiple of Money"
              xrf={fundMetrics.mom}
              median={1.40}
              topQuartile={1.80}
              format="x"
              c={c}
              note="총회수 / 총투자 (실현+미실현)"
            />
            <BenchmarkRow
              label="Equity Multiple"
              xrf={fundMetrics.equityMultiple}
              median={1.40}
              topQuartile={1.80}
              format="x"
              c={c}
              note="LP equity 기준 multiple"
            />
            <BenchmarkRow
              label="XIRR (annualized · 복리)"
              xrf={fundMetrics.xirr}
              median={0.12}
              topQuartile={0.20}
              format="pct"
              c={c}
              note="LP 연환산 IRR (Newton's method)"
              last
            />
          </tbody>
        </table>

        <div style={{ fontSize: 11, color: c.text, marginTop: 12, padding: '10px 14px', background: '#F0F9FF', borderLeft: `3px solid ${c.blue}`, lineHeight: 1.6 }}>
          <strong>벤치마크 출처</strong>: NPL/Special-Situations Private Debt Fund (10년 closed-end fund) 산업 데이터 — Cambridge Associates · Preqin · ILPA Industry Reports (2020-2024 vintage average).
          NPL 펀드는 일반 PE buyout 보다 cycle 짧고 (3-5yr) recovery-driven 이라 DPI/TVPI 수렴 속도가 빠른 특성.
        </div>
        <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
          ⓘ 단순 IRR ({fmtPct(selected.lpIrrYr)}/yr) vs XIRR ({fmtPct(fundMetrics.xirr)}/yr) 차이는 단순 연환산 vs 복리 계산의 차이입니다.
          XIRR은 Excel XIRR 함수와 동일 알고리즘 (Newton's method).
          XRF Vehicle 의 짧은 cycle (NPL 6-19개월) 덕분에 산업 평균 (5-10년) 대비 자본 회전율이 높은 점이 차별화 요소.
        </div>
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

      {/* ───── EXHIBIT 6 — 3-TIER 비교 ───── */}
      <Section title="EXHIBIT 6 · 3-TIER 비교 시뮬레이션" caption="동일 NPL deal에 BASE (LP ROI ≥ 20%) / CONSERVATIVE (10-20%) / SAVE-THE-DEAL (5-10%) 적용 시 결과 — EXHIBIT 2b 정의 참조">
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
            <CompareRow label="XRF 수수료 합계" v1={fmtUSDFull(base.fees.xrfTotalUSD)} v2={fmtUSDFull(conservative.fees.xrfTotalUSD)} v3={fmtUSDFull(saveTheDeal.fees.xrfTotalUSD)} />
            <CompareRow label="KOF 수수료 합계" v1={fmtUSDFull(base.fees.platformTotalUSD)} v2={fmtUSDFull(conservative.fees.platformTotalUSD)} v3={fmtUSDFull(saveTheDeal.fees.platformTotalUSD)} />
            <CompareRow label="NPL VC Servicing 수수료" v1={fmtUSDFull(base.fees.servicingUSD)} v2={fmtUSDFull(conservative.fees.servicingUSD)} v3={fmtUSDFull(saveTheDeal.fees.servicingUSD)} last />
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

/**
 * BenchmarkRow — XRF Vehicle 의 metric 을 산업 중앙값/Top Quartile 과 비교.
 * format='x' → multiple (1.234x), format='pct' → percentage.
 */
function BenchmarkRow({
  label, xrf, median, topQuartile, format, c, note, last,
}: {
  label: string
  xrf: number
  median: number
  topQuartile: number
  format: 'x' | 'pct'
  c: { emerald: string; amber: string; navy: string; textSub: string; text: string }
  note?: string
  last?: boolean
}) {
  const fmt = (v: number) => format === 'x' ? `${v.toFixed(3)}x` : `${(v * 100).toFixed(2)}%`
  const verdict =
    xrf >= topQuartile ? { color: c.emerald, label: '★ Top Quartile 진입 — 우수' }
    : xrf >= median    ? { color: c.emerald, label: '✓ Median 상회 — 양호' }
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
      <td style={{ ...cellRight, color: c.text }}>{fmt(topQuartile)}+</td>
      <td style={{ padding: '10px 12px', color: verdict.color, fontWeight: 600, fontSize: 12 }}>{verdict.label}</td>
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
