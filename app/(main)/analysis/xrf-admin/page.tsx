"use client"

/**
 * /analysis/xrf-admin — XRF Admin 상세 피 구조 분석
 *
 * 관리자 전용 페이지: 기존 XrfValuationSection 전체 (EXHIBIT 1~8 + 3-case 비교)
 * 일반 유저는 접근 불가 (subnav 필터 + 이 페이지에서 역할 확인).
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { buildGangnamSampleReport, GANGNAM_RETAIL_LISTING_ID } from "@/lib/npl/unified-report/sample-gangnam"
import { computeEffectiveFirstSaleDate } from "@/lib/npl/unified-report/auction-round"
import XrfValuationSection from "@/app/(main)/analysis/report/components/xrf-valuation-section"
import { createClient } from "@/lib/supabase/client"

export default function XrfAdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('active_role')
            .eq('id', user.id)
            .single()
          setIsAdmin(['ADMIN', 'SUPER_ADMIN'].includes(profile?.active_role ?? ''))
        }
      } catch { /* network unavailable — dev mode fallback */ }
      setAuthChecked(true)
    })()
  }, [])

  // 샘플 데이터 준비 (강남 상가 XRF Case)
  const { nplPurchasePriceKRW, nplTotalEquityKRW, nplNetProfitKRW, holdingPeriodDays, assetTitle, address } = useMemo(() => {
    const base = buildGangnamSampleReport()
    const firstSale = base.profitability?.schedule.milestones.find(m => m.key === 'firstSaleDate')?.date
    let report = base
    if (firstSale && base.profitability) {
      const shifted = computeEffectiveFirstSaleDate(
        firstSale,
        base.profitability.valuation.expectedBidRatio,
        base.profitability.valuation.auctionFailureDiscountPct,
      )
      if (shifted !== firstSale) {
        report = buildGangnamSampleReport({ firstSaleDateOverride: shifted })
      }
    }
    const p = report.profitability
    return {
      nplPurchasePriceKRW: p?.acquisition.purchasePrice ?? 2_800_000_000,
      nplTotalEquityKRW:   p?.investment.totalEquity ?? 585_640_973,
      nplNetProfitKRW:     p?.investment.expectedNetProfit ?? 300_000_000,
      holdingPeriodDays:   p?.investment.holdingPeriodDays ?? 540,
      assetTitle:          report.input?.assetTitle ?? '강남구 신사동 상가',
      address:             '서울특별시 강남구 신사동 (가상 샘플)',
    }
  }, [])

  // admin 체크 완료 전까지 로딩
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse text-[var(--color-text-secondary)]">권한 확인 중…</div>
      </div>
    )
  }

  // 비관리자 접근 차단
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-6 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">관리자 전용 페이지</h2>
        <p className="text-[var(--color-text-secondary)] max-w-sm">
          이 페이지는 ADMIN / SUPER_ADMIN 역할만 접근할 수 있습니다.
          투자자용 리포트는{" "}
          <a href="/analysis/xrf-rwa" className="text-[#10B981] underline">XRF RWA</a>에서 확인하세요.
        </p>
        <button
          onClick={() => router.push('/analysis')}
          className="mt-2 px-6 py-2 rounded-full bg-[#1B3A5C] text-white text-sm font-medium"
        >
          분석 대시보드로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <div className="pt-8 pb-4 border-b border-[var(--color-border-subtle)] mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded font-bold">ADMIN ONLY</span>
          <span className="text-xs text-[var(--color-text-tertiary)]">강남구 신사동 상가 · XRF Case (가상)</span>
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">XRF Admin — Vehicle 상세 피 분석</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          EXHIBIT 1~8 전체 · 3-Tier 비교 · 수수료 구조 · 관리자 내부용
        </p>
      </div>

      <XrfValuationSection
        nplPurchasePriceKRW={nplPurchasePriceKRW}
        nplTotalEquityKRW={nplTotalEquityKRW}
        nplNetProfitKRW={nplNetProfitKRW}
        holdingPeriodDays={holdingPeriodDays}
        assetTitle={assetTitle}
        address={address}
      />
    </div>
  )
}
