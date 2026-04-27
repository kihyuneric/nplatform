"use client"

/**
 * /exchange/auction — 자발적 경매 (McKinsey White-Paper Re-skin · 2026-04-26)
 *
 * 디자인: lib/mck-design.ts + components/mck/* 사용. 직각 모서리, brass 2px top accent,
 * Georgia serif heading, 흰 종이 배경. 비즈니스 로직(목록/입찰/낙찰 결과)은 그대로 보존.
 */

import { useState, useMemo, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  Gavel, Search, MapPin, Eye, Timer, ChevronRight, AlertTriangle,
  Filter, X, FileText, Users, Activity, ChevronDown, Loader2, Plus,
  Award, TrendingUp, Sparkles, CheckCircle2,
} from "lucide-react"
import { formatTimeLeft, REGION_SHORT_LIST, SELLER_INSTITUTIONS } from "@/lib/taxonomy"
import { maskInstitutionName } from "@/lib/mask"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW as mckFormatKRW } from "@/lib/mck-design"
import {
  MckPageShell,
  MckPageHeader,
  MckKpiGrid,
  MckEmptyState,
  MckDemoBanner,
  MckBadge,
} from "@/components/mck"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKRW(n: number) {
  return mckFormatKRW(n)
}
function getDDay(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  return diff <= 0 ? 'D-0' : `D-${diff}`
}
function formatDate(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BidItem {
  id: string
  title: string
  institution: string
  collateralType: string
  location: string
  principal: number
  minimumBid: number
  aiEstimate: number
  deadline: string
  bidCount: number
  viewCount: number
  riskGrade: "A" | "B" | "C" | "D"
  status: "진행중" | "마감임박" | "마감"
  listingCategory?: "NPL" | "GENERAL"
}

interface MyBid {
  id: string
  title: string
  institution: string
  bidAmount: number
  principal: number
  bidDate: string
  status: "진행중" | "낙찰" | "유찰" | "철회"
  resultDate?: string
}

interface AwardResult {
  id: string
  title: string
  institution: string
  principal: number
  winningBid: number
  bidRate: number
  bidCount: number
  awardDate: string
  collateralType: string
}

// ─── Filter Options ───────────────────────────────────────────────────────────

const LISTING_CATEGORY_FILTER: { value: string; label: string }[] = [
  { value: "ALL",     label: "전체" },
  { value: "NPL",     label: "NPL" },
  { value: "GENERAL", label: "일반 부동산" },
]

const COLLATERAL_MAJOR_FILTER: { value: string; label: string; keywords: string[] | null }[] = [
  { value: "ALL",         label: "전체",       keywords: null },
  { value: "RESIDENTIAL", label: "주거용",     keywords: ["아파트", "오피스텔", "빌라", "연립", "단독", "다가구", "원룸", "도시형"] },
  { value: "COMMERCIAL",  label: "상업/산업용", keywords: ["상가", "사무실", "빌딩", "공장", "창고", "호텔", "숙박", "근린"] },
  { value: "LAND",        label: "토지",       keywords: ["토지", "대지", "임야", "농지", "전", "답", "잡종"] },
  { value: "ETC",         label: "기타",       keywords: null },
]
const COLLATERAL_MINOR_MAP: Record<string, { value: string; label: string }[]> = {
  RESIDENTIAL: [
    { value: "ALL",      label: "전체" },
    { value: "아파트",     label: "아파트" },
    { value: "오피스텔",   label: "오피스텔" },
    { value: "빌라",      label: "빌라·연립" },
    { value: "단독",      label: "단독·다가구" },
  ],
  COMMERCIAL: [
    { value: "ALL",   label: "전체" },
    { value: "상가",   label: "상가·근린" },
    { value: "사무실", label: "사무실" },
    { value: "빌딩",   label: "빌딩" },
    { value: "공장",   label: "공장·창고" },
  ],
  LAND: [
    { value: "ALL",   label: "전체" },
    { value: "대지",  label: "대지" },
    { value: "임야",  label: "임야" },
    { value: "농지",  label: "농지" },
  ],
  ETC: [{ value: "ALL", label: "전체" }],
}
const REGION_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...REGION_SHORT_LIST.map((s) => ({ value: s, label: s })),
]
const INST_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...Object.values(SELLER_INSTITUTIONS).map((l) => ({ value: l, label: l })),
]

// Risk grade tone map (McKinsey monochromatic — 색을 적게 사용)
// A = ink (가장 강조 · 가장 안정) · B = blue (electric soft) · C = neutral outline · D = warning (회갈색 차분)
const RISK_TONE: Record<string, "positive" | "blue" | "warning" | "danger" | "neutral"> = {
  A: "blue",       // McKinsey Electric Blue tint
  B: "neutral",    // light grey outline
  C: "warning",    // 차분한 amber (이미 채도 낮음)
  D: "danger",     // 차분한 brick (이미 채도 낮음)
}

// ─── BidDialog (McKinsey 화이트 페이퍼 모달) ─────────────────────────────────

function BidDialog({ item, open, onClose, onSubmitted }: { item: BidItem | null; open: boolean; onClose: () => void; onSubmitted?: () => void }) {
  const [bidAmount, setBidAmount] = useState("")
  const [agreed1, setAgreed1] = useState(false)
  const [agreed2, setAgreed2] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (!item || !open) return null

  const numAmount = Number(bidAmount.replace(/,/g, ""))
  const isValid = numAmount >= item.minimumBid && agreed1 && agreed2
  const bidRate = numAmount > 0 ? ((numAmount / item.principal) * 100).toFixed(1) : "0.0"

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(10, 22, 40, 0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 540,
          background: MCK.paper,
          border: `1px solid ${MCK.borderStrong}`,
          borderTop: `3px solid ${MCK.brass}`,
          boxShadow: "0 24px 64px rgba(10,22,40,0.30)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${MCK.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span style={{ width: 14, height: 1.5, background: MCK.brass, display: "inline-block" }} />
              <span style={{ color: MCK.brassDark, ...MCK_TYPE.eyebrow }}>BID SUBMISSION</span>
            </div>
            <h3
              style={{
                fontFamily: MCK_FONTS.serif,
                color: MCK.ink,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}
            >
              {item.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32,
              background: MCK.paperTint,
              color: MCK.textSub,
              border: `1px solid ${MCK.border}`,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="닫기"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Info Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              border: `1px solid ${MCK.border}`,
            }}
          >
            <div style={{ padding: "12px 14px", borderRight: `1px solid ${MCK.border}`, background: MCK.paperTint }}>
              <p style={{ ...MCK_TYPE.label, color: MCK.textSub, marginBottom: 4 }}>채권 원금</p>
              <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 17, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                {formatKRW(item.principal)}
              </p>
            </div>
            <div style={{ padding: "12px 14px", background: MCK.paperTint }}>
              <p style={{ ...MCK_TYPE.label, color: MCK.textSub, marginBottom: 4 }}>최저 입찰가</p>
              <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 17, fontWeight: 800, color: MCK.brassDark, fontVariantNumeric: "tabular-nums" }}>
                {formatKRW(item.minimumBid)}
              </p>
            </div>
          </div>

          {/* AI Reference */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: MCK.paperTint,
              border: `1px solid ${MCK.border}`,
              borderLeft: `3px solid ${MCK.blue}`,
            }}
          >
            <Sparkles size={16} style={{ color: MCK.blue, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: MCK.textSub, letterSpacing: "0.04em", marginBottom: 2 }}>
                AI 적정 입찰가 참고
              </p>
              <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 15, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                {formatKRW(item.aiEstimate)}
                <span style={{ fontSize: 12, fontWeight: 600, color: MCK.blue, marginLeft: 6 }}>
                  ({((item.aiEstimate / item.principal) * 100).toFixed(1)}% of principal)
                </span>
              </p>
            </div>
          </div>

          {/* Bid Input */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: MCK.ink, marginBottom: 6, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              입찰 금액 (원)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={bidAmount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "")
                  setBidAmount(v ? Number(v).toLocaleString() : "")
                }}
                placeholder={`최소 ${formatKRW(item.minimumBid)} 이상`}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontFamily: MCK_FONTS.mono,
                  fontSize: 14,
                  fontWeight: 700,
                  background: MCK.paper,
                  border: `1.5px solid ${numAmount > 0 && numAmount < item.minimumBid ? MCK.danger : MCK.borderStrong}`,
                  color: MCK.ink,
                  outline: "none",
                }}
              />
              {numAmount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    fontWeight: 800,
                    background: MCK.positiveBg,
                    color: MCK.positive,
                    padding: "3px 8px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  낙찰가율 {bidRate}%
                </span>
              )}
            </div>
            {numAmount > 0 && numAmount < item.minimumBid && (
              <p style={{ fontSize: 12, fontWeight: 700, color: MCK.danger, marginTop: 6 }}>
                최저 입찰가 이상 입력해주세요
              </p>
            )}
          </div>

          {/* Agreements */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { state: agreed1, setter: setAgreed1, label: "입찰 참여 약관 및 유의사항을 확인했습니다" },
              { state: agreed2, setter: setAgreed2, label: "낙찰 시 계약 체결 의무가 있음을 확인합니다" },
            ].map(({ state, setter, label }, i) => (
              <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <span
                  onClick={() => setter(!state)}
                  style={{
                    marginTop: 2,
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    background: state ? MCK.ink : MCK.paper,
                    border: `1.5px solid ${state ? MCK.ink : MCK.borderStrong}`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {state && <CheckCircle2 size={11} style={{ color: MCK.brass }} />}
                </span>
                <span style={{ fontSize: 12, color: MCK.textSub, fontWeight: 500, lineHeight: 1.5 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "16px 24px",
            borderTop: `1px solid ${MCK.border}`,
            background: MCK.paperTint,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: MCK.paper,
              color: MCK.ink,
              border: `1px solid ${MCK.borderStrong}`,
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            취소
          </button>
          <button
            disabled={!isValid || submitting}
            onClick={async () => {
              if (!isValid || submitting) return
              setSubmitting(true); setSubmitError(null)
              try {
                const res = await fetch('/api/v1/auction/bids', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    listing_id: item.id,
                    amount: numAmount,
                    note: `낙찰가율 ${bidRate}%`,
                  }),
                })
                if (!res.ok && res.status !== 401 && res.status !== 404) {
                  const data = await res.json().catch(() => ({}))
                  throw new Error((data as { error?: { message?: string } })?.error?.message || `입찰 제출 실패 (${res.status})`)
                }
                if (typeof window !== 'undefined') {
                  const { toast } = await import('sonner')
                  toast.success(`${formatKRW(numAmount)} 입찰이 접수되었습니다.`)
                }
                onSubmitted?.()
                onClose()
              } catch (err) {
                setSubmitError(err instanceof Error ? err.message : '입찰 제출 중 오류가 발생했습니다.')
              } finally {
                setSubmitting(false)
              }
            }}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: (isValid && !submitting) ? MCK.ink : MCK.border,
              color: (isValid && !submitting) ? MCK.paper : MCK.textMuted,
              borderTop: (isValid && !submitting) ? `2.5px solid ${MCK.brass}` : "none",
              border: "none",
              cursor: (isValid && !submitting) ? "pointer" : "not-allowed",
              letterSpacing: "-0.01em",
              boxShadow: (isValid && !submitting) ? "0 4px 16px rgba(10,22,40,0.18)" : "none",
            }}
          >
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> 제출 중...</>
              : <><Gavel size={14} /> 입찰 제출</>}
          </button>
        </div>
        {submitError && (
          <div style={{ padding: "0 24px 16px", background: MCK.paperTint }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: MCK.danger }}>{submitError}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BidCard (McKinsey 화이트 페이퍼) ─────────────────────────────────────────

function BidCard({ item, onBid }: { item: BidItem; onBid: (item: BidItem) => void }) {
  const dday = getDDay(item.deadline)
  const ddayNum = parseInt(dday.replace("D-", ""), 10)
  const ddayUrgent = ddayNum <= 1
  const isUrgent = item.status === "마감임박"
  // 최저입찰가는 채권원금 상한 (사용자 요청 — DB 이상값 방어)
  const minimumBidCapped = Math.min(item.minimumBid, item.principal)
  const bidRateRaw = (minimumBidCapped / item.principal) * 100
  // 진행 바는 100% 상한 · 표기 숫자도 100% 상한
  const bidRatePct = Math.min(100, bidRateRaw).toFixed(1)
  const bidRateBar = Math.min(100, bidRateRaw)
  // 할인율 = (1 - 최저입찰가/채권원금) × 100 (음수는 0으로 클램프)
  const discountRate = Math.max(0, (1 - minimumBidCapped / item.principal) * 100)
  const riskTone = RISK_TONE[item.riskGrade] ?? "warning"

  return (
    <article
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        // McKinsey 톤 — urgent 도 monochromatic ink (더 이상 빨강 X · electric으로 강조)
        borderTop: `2px solid ${isUrgent ? MCK.ink : MCK.electric}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(10,22,40,0.10)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      {/* Badges row — 모두 McKinsey monochromatic outline (색 최소화) */}
      <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
        <MckBadge tone={riskTone} size="sm">{`등급 ${item.riskGrade}`}</MckBadge>
        <MckBadge tone="neutral" size="sm" outlined>{item.collateralType}</MckBadge>
        <span style={{ marginLeft: "auto" }}>
          {isUrgent ? (
            // 마감임박 — ink 검정 + 흰 글씨 (강조 but 색 X)
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px",
                background: MCK.ink, color: MCK.paper,
                fontSize: 10, fontWeight: 800,
                letterSpacing: "0.06em", textTransform: "uppercase",
                border: `1px solid ${MCK.ink}`,
              }}
            >
              <Timer size={10} /> 마감임박
            </span>
          ) : (
            // 진행중 — Electric Blue outline + electricDark 글씨 (옅은 강조)
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px",
                background: "rgba(34, 81, 255, 0.10)",
                color: "#1A47CC",
                fontSize: 10, fontWeight: 800,
                letterSpacing: "0.06em", textTransform: "uppercase",
                border: "1px solid rgba(34, 81, 255, 0.35)",
              }}
            >
              진행중
            </span>
          )}
        </span>
      </div>

      {/* Eyebrow + Title */}
      <div>
        <p
          style={{
            ...MCK_TYPE.eyebrow,
            color: MCK.brassDark,
            marginBottom: 6,
          }}
          title="NDA 체결 후 실명 공개"
        >
          {maskInstitutionName(item.institution)}
        </p>
        <Link href={`/exchange/${item.id}`} style={{ textDecoration: "none" }}>
          <h3
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.ink,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "-0.015em",
              lineHeight: 1.35,
              marginBottom: 6,
            }}
          >
            {item.title}
          </h3>
        </Link>
        <div className="flex items-center" style={{ gap: 6 }}>
          <MapPin size={12} style={{ color: MCK.textMuted, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: MCK.textSub, fontWeight: 500 }}>{item.location}</span>
        </div>
      </div>

      {/* Metrics 3-col panel — McKinsey Deep Navy + Electric top accent + 흰 Georgia 16px + Cyan 강조 */}
      <div
        style={{
          background: MCK.inkDeep,                          /* #051C2C */
          borderTop: `3px solid ${MCK.electric}`,           /* electric blue accent strip */
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
        }}
      >
        <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <p style={{ ...MCK_TYPE.label, color: "rgba(255, 255, 255, 0.65)", marginBottom: 4 }}>채권원금</p>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.paper, letterSpacing: "-0.015em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
            {formatKRW(item.principal)}
          </p>
        </div>
        <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <p style={{ ...MCK_TYPE.label, color: "rgba(255, 255, 255, 0.65)", marginBottom: 4 }}>최저입찰가</p>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.paper, letterSpacing: "-0.015em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
            {formatKRW(minimumBidCapped)}
          </p>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <p style={{ ...MCK_TYPE.label, color: MCK.cyan, marginBottom: 4 }}>할인율</p>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.cyan, letterSpacing: "-0.015em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
            {discountRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Progress bar — 100% 상한 (시각적/숫자 모두) */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <span style={{ ...MCK_TYPE.label, color: MCK.textMuted }}>최저입찰 비율</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: MCK.textSub, fontVariantNumeric: "tabular-nums" }}>
            {bidRatePct}%
          </span>
        </div>
        <div style={{ height: 3, background: MCK.border, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${bidRateBar}%`,
              background: MCK.electric,
            }}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          paddingBottom: 14,
          borderBottom: `1px solid ${MCK.border}`,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 800,
            color: ddayUrgent ? MCK.danger : MCK.ink,
          }}
        >
          <Timer size={13} />
          {dday}
          {ddayUrgent && (
            <span
              style={{
                marginLeft: 4,
                padding: "1px 6px",
                background: MCK.dangerBg,
                color: MCK.danger,
                fontSize: 10,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTimeLeft(item.deadline)}
            </span>
          )}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: MCK.textSub, fontWeight: 700 }}>
          <Users size={12} /> 입찰 {item.bidCount}명
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: MCK.textMuted, fontWeight: 500 }}>
          <Eye size={12} /> 조회 {item.viewCount.toLocaleString()}
        </span>
      </div>

      {/* CTAs */}
      <div className="flex" style={{ gap: 8 }}>
        <Link
          href={`/exchange/${item.id}`}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 800,
            background: MCK.paper,
            color: MCK.ink,
            border: `1px solid ${MCK.ink}`,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          <Eye size={13} /> 상세보기
        </Link>
        <button
          onClick={() => onBid(item)}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 800,
            background: "#A8CDE8",                              /* McKinsey soft sky blue (사용자 첨부 톤) */
            color: MCK.ink,                                     /* deep navy 텍스트 */
            borderTop: `2px solid ${MCK.electric}`,             /* cobalt blue accent */
            border: "1px solid #7FA8C8",
            borderRadius: 4,
            cursor: "pointer",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 12px rgba(34, 81, 255, 0.10)",
          }}
        >
          <Gavel size={13} style={{ color: MCK.ink }} /> 입찰 참여
        </button>
      </div>
    </article>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuctionPage() {
  const [activeTab, setActiveTab] = useState<"bidding" | "my" | "awards">("bidding")
  const [search, setSearch] = useState("")
  const [listingCategory, setListingCategory] = useState("ALL")
  const [collateral, setCollateral] = useState("ALL")
  const [collateralMinor, setCollateralMinor] = useState("ALL")
  const [region, setRegion] = useState("ALL")
  const [instType, setInstType] = useState("ALL")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState("마감임박순")
  const [bidTarget, setBidTarget] = useState<BidItem | null>(null)
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  const [bids, setBids] = useState<BidItem[]>([])
  const [myBids, setMyBids] = useState<MyBid[]>([])
  const [awards, setAwards] = useState<AwardResult[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [demoFallback, setDemoFallback] = useState(false)

  const SAMPLE_BIDS: BidItem[] = useMemo(() => [
    {
      id: 'sample-bid-001',
      title: '강남구 역삼동 아파트 (84m²) NPL 채권',
      institution: '하나저축은행',
      collateralType: '아파트',
      location: '서울 강남구',
      principal: 780_000_000,
      minimumBid: 840_000_000,
      aiEstimate: 903_000_000,
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      bidCount: 3,
      viewCount: 42,
      riskGrade: 'B',
      status: '진행중',
    },
    {
      id: 'sample-bid-002',
      title: '마포구 서교동 오피스텔 (33m²) NPL',
      institution: '신한은행',
      collateralType: '오피스텔',
      location: '서울 마포구',
      principal: 250_000_000,
      minimumBid: 200_000_000,
      aiEstimate: 218_000_000,
      deadline: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
      bidCount: 7,
      viewCount: 88,
      riskGrade: 'A',
      status: '마감임박',
    },
    {
      id: 'sample-bid-003',
      title: '인천 연수구 상가 (62m²) 부실채권',
      institution: '기업은행',
      collateralType: '상가',
      location: '인천 연수구',
      principal: 420_000_000,
      minimumBid: 320_000_000,
      aiEstimate: 348_000_000,
      deadline: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      bidCount: 1,
      viewCount: 19,
      riskGrade: 'C',
      status: '진행중',
    },
  ], [])

  const SAMPLE_AWARDS: AwardResult[] = useMemo(() => [
    {
      id: 'aw-001',
      title: '서초구 잠원동 아파트 NPL',
      institution: '국민은행',
      principal: 1_200_000_000,
      winningBid: 1_020_000_000,
      bidRate: 85.0,
      bidCount: 6,
      awardDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      collateralType: '아파트',
    },
    {
      id: 'aw-002',
      title: '수원시 영통구 오피스텔 NPL',
      institution: '하나은행',
      principal: 320_000_000,
      winningBid: 240_000_000,
      bidRate: 75.0,
      bidCount: 4,
      awardDate: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
      collateralType: '오피스텔',
    },
    {
      id: 'aw-003',
      title: '부산 해운대구 상가 부실채권',
      institution: '한국자산관리공사',
      principal: 680_000_000,
      winningBid: 489_000_000,
      bidRate: 71.9,
      bidCount: 2,
      awardDate: new Date(Date.now() - 18 * 86400000).toISOString().slice(0, 10),
      collateralType: '상가',
    },
  ], [])

  const loadData = useCallback(async () => {
    setDataLoading(true)
    let usedFallback = false
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [bidsRes, myBidsRes, awardsRes] = await Promise.allSettled([
        supabase.from("npl_listings")
          .select("id, title, seller_profiles:profiles!npl_listings_seller_id_fkey(name), collateral_type, region, principal_amount, minimum_bid, ai_estimate, auction_deadline, bid_count, view_count, risk_grade, auction_status")
          .eq("status", "ACTIVE")
          .not("auction_deadline", "is", null)
          .order("auction_deadline", { ascending: true })
          .limit(50),

        user ? supabase.from("auction_bids")
          .select("id, listing_id, bid_amount, created_at, status, result_date, npl_listings(title, collateral_type, principal_amount, profiles!npl_listings_seller_id_fkey(name))")
          .eq("bidder_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20) : Promise.resolve({ data: [] }),

        supabase.from("auction_results")
          .select("id, listing_id, winning_bid, bid_count, awarded_at, npl_listings(title, collateral_type, principal_amount, profiles!npl_listings_seller_id_fkey(name))")
          .order("awarded_at", { ascending: false })
          .limit(20),
      ])

      let nextBids: BidItem[] = []
      let nextMyBids: MyBid[] = []
      let nextAwards: AwardResult[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (bidsRes.status === "fulfilled" && (bidsRes.value as any).data?.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextBids = (bidsRes.value as any).data.map((r: any) => ({
          id: String(r.id),
          title: r.title ?? "NPL 채권",
          institution: r.seller_profiles?.name ?? "—",
          collateralType: r.collateral_type ?? "기타",
          location: r.region ?? "—",
          principal: r.principal_amount ?? 0,
          minimumBid: r.minimum_bid ?? Math.round((r.principal_amount ?? 0) * 0.7),
          aiEstimate: r.ai_estimate ?? Math.round((r.principal_amount ?? 0) * 0.78),
          deadline: String(r.auction_deadline ?? "").slice(0, 10),
          bidCount: r.bid_count ?? 0,
          viewCount: r.view_count ?? 0,
          riskGrade: r.risk_grade ?? "C",
          status: r.auction_status ?? "진행중",
        }))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (myBidsRes.status === "fulfilled" && ((myBidsRes.value as any).data ?? []).length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextMyBids = ((myBidsRes.value as any).data ?? []).map((r: any) => ({
          id: String(r.listing_id ?? r.id),
          title: r.npl_listings?.title ?? "NPL 채권",
          institution: r.npl_listings?.profiles?.name ?? "—",
          bidAmount: r.bid_amount ?? 0,
          principal: r.npl_listings?.principal_amount ?? 0,
          bidDate: String(r.created_at ?? "").slice(0, 10),
          status: r.status ?? "진행중",
          resultDate: r.result_date ? String(r.result_date).slice(0, 10) : undefined,
        }))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (awardsRes.status === "fulfilled" && (awardsRes.value as any).data?.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextAwards = (awardsRes.value as any).data.map((r: any) => {
          const principal = r.npl_listings?.principal_amount ?? 0
          const winning = r.winning_bid ?? 0
          return {
            id: String(r.id),
            title: r.npl_listings?.title ?? "NPL 채권",
            institution: r.npl_listings?.profiles?.name ?? "—",
            principal,
            winningBid: winning,
            bidRate: principal > 0 ? Math.round((winning / principal) * 1000) / 10 : 0,
            bidCount: r.bid_count ?? 0,
            awardDate: String(r.awarded_at ?? "").slice(0, 10),
            collateralType: r.npl_listings?.collateral_type ?? "기타",
          }
        })
      }

      // Demo fallback
      if (nextBids.length === 0) { nextBids = SAMPLE_BIDS; usedFallback = true }
      if (nextAwards.length === 0) { nextAwards = SAMPLE_AWARDS; usedFallback = true }

      setBids(nextBids)
      setMyBids(nextMyBids)
      setAwards(nextAwards)
      setDemoFallback(usedFallback)
    } catch {
      setBids(SAMPLE_BIDS)
      setAwards(SAMPLE_AWARDS)
      setMyBids([])
      setDemoFallback(true)
    } finally {
      setDataLoading(false)
    }
  }, [SAMPLE_BIDS, SAMPLE_AWARDS])

  useEffect(() => { loadData() }, [loadData])

  const filteredBids = useMemo(() => {
    const majorDef = COLLATERAL_MAJOR_FILTER.find((m) => m.value === collateral)
    const allMajorKeywords = COLLATERAL_MAJOR_FILTER
      .filter((m) => m.value !== "ALL" && m.value !== "ETC" && m.keywords)
      .flatMap((m) => m.keywords as string[])

    const filtered = bids.filter((b) => {
      const type = b.collateralType ?? ""

      if (listingCategory !== "ALL") {
        const cat = b.listingCategory ?? "NPL"
        if (cat !== listingCategory) return false
      }

      if (collateral !== "ALL") {
        if (collateral === "ETC") {
          const matchesOther = allMajorKeywords.some((kw) => type.includes(kw))
          if (matchesOther) return false
        } else if (majorDef?.keywords) {
          const matches = majorDef.keywords.some((kw) => type.includes(kw))
          if (!matches) return false
        }
      }

      if (collateralMinor !== "ALL" && !type.includes(collateralMinor)) return false
      if (region !== "ALL" && !(b.location ?? "").includes(region)) return false
      if (instType !== "ALL" && !(b.institution ?? "").includes(instType)) return false
      if (search && !b.title.includes(search) && !b.institution.includes(search) && !b.location.includes(search)) return false

      return true
    })

    if (sortBy === "마감임박순") return [...filtered].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    if (sortBy === "원금높은순") return [...filtered].sort((a, b) => b.principal - a.principal)
    if (sortBy === "입찰많은순") return [...filtered].sort((a, b) => b.bidCount - a.bidCount)
    if (sortBy === "저위험순")   return [...filtered].sort((a, b) => (a.riskGrade < b.riskGrade ? -1 : 1))
    return filtered
  }, [bids, search, listingCategory, collateral, collateralMinor, region, instType, sortBy])

  const activeBids = bids.filter((b) => b.status !== "마감").length
  const urgentBids = bids.filter((b) => b.status === "마감임박").length
  const avgBidRate = awards.length > 0 ? awards.reduce((s, a) => s + a.bidRate, 0) / awards.length : 0

  function handleBid(item: BidItem) {
    setBidTarget(item)
    setBidDialogOpen(true)
  }

  const TABS = [
    { key: "bidding", label: "진행중 입찰", icon: Gavel, count: activeBids },
    { key: "my", label: "내 입찰 현황", icon: FileText, count: myBids.length },
    { key: "awards", label: "낙찰 결과", icon: Award, count: awards.length },
  ] as const

  // My bid status - McKinsey tone mapping
  const MY_STATUS_TONE: Record<string, "neutral" | "positive" | "blue" | "warning" | "danger"> = {
    진행중: "blue",
    낙찰: "positive",
    유찰: "danger",
    철회: "neutral",
  }

  return (
    <MckPageShell variant="tint">
      {demoFallback && <MckDemoBanner />}

      <MckPageHeader
        breadcrumbs={[
          { label: "거래소", href: "/exchange" },
          { label: "자발적 경매" },
        ]}
        eyebrow="VOLUNTARY AUCTION · LIVE BID DESK"
        title="자발적 경매"
        subtitle="금융기관이 등록한 NPL 매물에 자발적 경매로 참여하세요. AI 적정 입찰가 추천이 함께 제공됩니다."
        actions={
          <Link
            href="/exchange/auction/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              background: MCK.ink,
              color: MCK.paper,
              borderTop: `2.5px solid ${MCK.brass}`,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(10,22,40,0.18)",
            }}
          >
            <Plus size={14} />
            자발적 경매 등록
          </Link>
        }
      />

      {/* KPI strip — DARK variant 매물 탐색 대시보드와 동일 톤 */}
      <section className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 8px" }}>
        <MckKpiGrid
          variant="dark"
          items={[
            { label: "Total Listings", value: `${bids.length}건`, hint: "전체 입찰" },
            { label: "Active", value: `${activeBids}건`, hint: "진행중" },
            { label: "Closing Soon", value: `${urgentBids}건`, hint: "마감 임박", delta: urgentBids > 0 ? { value: "주의", positive: false } : undefined },
            { label: "Avg. Win Rate", value: `${avgBidRate.toFixed(1)}%`, hint: "낙찰가율 (vs 원금)" },
          ]}
        />
      </section>

      {/* Cross links */}
      <section className="max-w-[1280px] mx-auto" style={{ padding: "8px 24px 0" }}>
        <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          {[
            { href: "/analysis/simulator", label: "경매 수익률 분석기" },
            { href: "/analysis/copilot", label: "AI 컨설턴트" },
            { href: "/exchange", label: "매물 거래소" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                background: MCK.paper,
                border: `1px solid ${MCK.border}`,
                color: MCK.textSub,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.02em",
              }}
            >
              {l.label}
              <ChevronRight size={11} style={{ color: MCK.textMuted }} />
            </Link>
          ))}
        </div>
      </section>

      {/* Tab bar */}
      <section className="max-w-[1280px] mx-auto" style={{ padding: "28px 24px 0" }}>
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: `1px solid ${MCK.border}`,
          }}
        >
          {TABS.map(({ key, label, icon: Icon, count }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 20px",
                  background: isActive ? MCK.paper : "transparent",
                  color: isActive ? MCK.ink : MCK.textSub,
                  border: "none",
                  borderTop: isActive ? `2px solid ${MCK.brass}` : "2px solid transparent",
                  borderLeft: isActive ? `1px solid ${MCK.border}` : "1px solid transparent",
                  borderRight: isActive ? `1px solid ${MCK.border}` : "1px solid transparent",
                  marginBottom: -1,
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                }}
              >
                <Icon size={14} />
                {label}
                <span
                  style={{
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                    background: isActive ? MCK.ink : MCK.paperTint,
                    color: isActive ? MCK.paper : MCK.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.02em",
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Filter bar — bidding tab only */}
      {activeTab === "bidding" && (
        <section
          className="max-w-[1280px] mx-auto"
          style={{
            padding: "16px 24px",
            background: MCK.paper,
            borderLeft: `1px solid ${MCK.border}`,
            borderRight: `1px solid ${MCK.border}`,
          }}
        >
          <div className="flex items-center" style={{ gap: 10, flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MCK.textMuted }} />
              <input
                type="text"
                placeholder="매물명, 기관, 지역 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 40px 9px 36px",
                  fontSize: 13,
                  background: MCK.paperTint,
                  border: `1px solid ${search ? MCK.ink : MCK.border}`,
                  color: MCK.ink,
                  outline: "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 800,
                  background: MCK.electric,
                  color: MCK.paper,                /* 코발트 위 흰 글씨 */
                  letterSpacing: "0.04em",
                }}
              >
                AI
              </span>
            </div>

            {/* 매물 유형 */}
            <div className="flex items-center" style={{ gap: 4 }}>
              {LISTING_CATEGORY_FILTER.map((c) => {
                const active = listingCategory === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setListingCategory(c.value)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: active ? MCK.ink : MCK.paper,
                      color: active ? MCK.paper : MCK.textSub,
                      border: `1px solid ${active ? MCK.ink : MCK.border}`,
                      cursor: "pointer",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Major chips — active 시 electric blue + 흰 글씨 (가독성) */}
            <div className="flex items-center" style={{ gap: 4, flexWrap: "wrap" }}>
              {COLLATERAL_MAJOR_FILTER.map((c) => {
                const active = collateral === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => { setCollateral(c.value); setCollateralMinor("ALL") }}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: active ? MCK.electric : MCK.paper,
                      color: active ? MCK.paper : MCK.textSub,
                      border: `1px solid ${active ? MCK.electric : MCK.border}`,
                      cursor: "pointer",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Toggle advanced */}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                background: filtersOpen ? MCK.ink : MCK.paper,
                color: filtersOpen ? MCK.paper : MCK.textSub,
                border: `1px solid ${filtersOpen ? MCK.ink : MCK.border}`,
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
              aria-pressed={filtersOpen}
            >
              <Filter size={12} />
              상세필터
              {(collateralMinor !== "ALL" || region !== "ALL" || instType !== "ALL") && (
                <span
                  style={{
                    minWidth: 18,
                    height: 16,
                    padding: "0 4px",
                    background: MCK.electric,
                    color: MCK.paper,
                    fontSize: 10,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {[collateralMinor !== "ALL", region !== "ALL", instType !== "ALL"].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort */}
            <div style={{ marginLeft: "auto", position: "relative" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  appearance: "none",
                  padding: "8px 30px 8px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: MCK.paper,
                  color: MCK.ink,
                  border: `1px solid ${MCK.border}`,
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                }}
              >
                <option>마감임박순</option>
                <option>원금높은순</option>
                <option>입찰많은순</option>
                <option>저위험순</option>
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: MCK.textMuted,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Advanced filter panel */}
          {filtersOpen && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${MCK.border}`,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 14,
              }}
            >
              {/* Minor */}
              <div>
                <label style={{ display: "block", ...MCK_TYPE.label, color: MCK.textSub, marginBottom: 6 }}>담보 소분류</label>
                <div className="flex flex-wrap" style={{ gap: 4 }}>
                  {(COLLATERAL_MINOR_MAP[collateral] ?? [{ value: "ALL", label: "전체" }]).map((m) => {
                    const active = collateralMinor === m.value
                    return (
                      <button
                        key={m.value}
                        onClick={() => setCollateralMinor(m.value)}
                        disabled={collateral === "ALL"}
                        style={{
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          background: active ? MCK.ink : MCK.paper,
                          color: active ? MCK.paper : MCK.textSub,
                          border: `1px solid ${active ? MCK.ink : MCK.border}`,
                          cursor: collateral === "ALL" ? "not-allowed" : "pointer",
                          opacity: collateral === "ALL" ? 0.5 : 1,
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Region */}
              <div>
                <label style={{ display: "block", ...MCK_TYPE.label, color: MCK.textSub, marginBottom: 6 }}>지역</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    style={{
                      appearance: "none",
                      width: "100%",
                      padding: "8px 30px 8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: MCK.paper,
                      color: MCK.ink,
                      border: `1px solid ${MCK.border}`,
                      cursor: "pointer",
                    }}
                  >
                    {REGION_FILTER.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: MCK.textMuted, pointerEvents: "none" }} />
                </div>
              </div>

              {/* Institution */}
              <div>
                <label style={{ display: "block", ...MCK_TYPE.label, color: MCK.textSub, marginBottom: 6 }}>기관</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={instType}
                    onChange={(e) => setInstType(e.target.value)}
                    style={{
                      appearance: "none",
                      width: "100%",
                      padding: "8px 30px 8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: MCK.paper,
                      color: MCK.ink,
                      border: `1px solid ${MCK.border}`,
                      cursor: "pointer",
                    }}
                  >
                    {INST_FILTER.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: MCK.textMuted, pointerEvents: "none" }} />
                </div>
              </div>

              {(listingCategory !== "ALL" || collateralMinor !== "ALL" || region !== "ALL" || instType !== "ALL") && (
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setListingCategory("ALL"); setCollateralMinor("ALL"); setRegion("ALL"); setInstType("ALL") }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: MCK.textSub,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <X size={12} /> 필터 초기화
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Content */}
      <section className="max-w-[1280px] mx-auto" style={{ padding: "24px 24px 64px" }}>
        {/* Tab: 진행중 입찰 */}
        {activeTab === "bidding" && (
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: MCK.textSub, fontWeight: 500 }}>
                총 <span style={{ fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{filteredBids.length}</span>건의 입찰 매물
              </p>
              {dataLoading && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: MCK.textMuted }}>
                  <Loader2 size={11} className="animate-spin" /> 불러오는 중...
                </span>
              )}
            </div>

            {filteredBids.length > 0 ? (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {filteredBids.map((item) => (
                  <BidCard key={item.id} item={item} onBid={handleBid} />
                ))}
              </div>
            ) : (
              <MckEmptyState
                icon={Search}
                title="검색 결과가 없습니다"
                description="다른 검색어나 필터를 시도해보세요. 필터를 초기화하면 전체 매물을 다시 볼 수 있습니다."
                actionLabel="필터 초기화"
                onActionClick={() => {
                  setSearch(""); setListingCategory("ALL"); setCollateral("ALL")
                  setCollateralMinor("ALL"); setRegion("ALL"); setInstType("ALL")
                }}
              />
            )}
          </div>
        )}

        {/* Tab: 내 입찰 현황 */}
        {activeTab === "my" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 0,
                border: `1px solid ${MCK.border}`,
                background: MCK.paper,
              }}
            >
              {[
                { label: "전체", count: myBids.length, color: MCK.ink, icon: Activity },
                { label: "진행중", count: myBids.filter(b => b.status === "진행중").length, color: MCK.blue, icon: Gavel },
                { label: "낙찰", count: myBids.filter(b => b.status === "낙찰").length, color: MCK.positive, icon: Award },
                { label: "유찰/철회", count: myBids.filter(b => b.status === "유찰" || b.status === "철회").length, color: MCK.danger, icon: AlertTriangle },
              ].map(({ label, count, color, icon: Icon }, i, arr) => (
                <div
                  key={label}
                  style={{
                    padding: "18px 20px",
                    borderRight: i < arr.length - 1 ? `1px solid ${MCK.border}` : "none",
                    borderTop: i === 0 ? `2px solid ${MCK.brass}` : "none",
                    background: MCK.paper,
                  }}
                >
                  <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
                    <Icon size={11} style={{ color: MCK.textMuted }} />
                    <p style={{ ...MCK_TYPE.label, color: MCK.textSub }}>{label}</p>
                  </div>
                  <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 26, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
                    {count}건
                  </p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.brass}` }}>
              <div style={{ padding: "16px 22px", borderBottom: `1px solid ${MCK.border}` }}>
                <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 17, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.015em" }}>
                  내 입찰 현황
                </h2>
                <p style={{ fontSize: 12, color: MCK.textMuted, marginTop: 2 }}>총 {myBids.length}건의 입찰 내역</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                {myBids.length === 0 ? (
                  <div style={{ padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: MCK.textMuted, fontWeight: 500 }}>
                      입찰 내역이 없습니다. 진행중 입찰 탭에서 매물에 참여해보세요.
                    </p>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: MCK.paperTint, borderBottom: `1px solid ${MCK.border}` }}>
                        {["매물명", "매각 기관", "채권 원금", "입찰 금액", "낙찰가율", "입찰일", "상태", "관리"].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 14px",
                              fontSize: 10,
                              fontWeight: 800,
                              color: MCK.textSub,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                              textAlign: i >= 2 && i <= 4 ? "right" : (i === 6 || i === 7 ? "center" : "left"),
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myBids.map((bid) => {
                        const rate = ((bid.bidAmount / bid.principal) * 100).toFixed(1)
                        const tone = MY_STATUS_TONE[bid.status] ?? "neutral"
                        return (
                          <tr
                            key={bid.id}
                            style={{ borderBottom: `1px solid ${MCK.border}` }}
                          >
                            <td style={{ padding: "12px 14px" }}>
                              <Link
                                href={`/exchange/${bid.id}`}
                                style={{
                                  fontFamily: MCK_FONTS.serif,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: MCK.ink,
                                  textDecoration: "none",
                                }}
                              >
                                {bid.title}
                              </Link>
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: 12, color: MCK.textSub, whiteSpace: "nowrap" }} title="NDA 체결 후 실명 공개">
                              {maskInstitutionName(bid.institution)}
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: MCK.ink, fontVariantNumeric: "tabular-nums", fontFamily: MCK_FONTS.mono, whiteSpace: "nowrap" }}>
                              {formatKRW(bid.principal)}
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: MCK.brassDark, fontVariantNumeric: "tabular-nums", fontFamily: MCK_FONTS.mono, whiteSpace: "nowrap" }}>
                              {formatKRW(bid.bidAmount)}
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: MCK.textSub, fontVariantNumeric: "tabular-nums", fontFamily: MCK_FONTS.mono }}>
                              {rate}%
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: 12, color: MCK.textMuted, whiteSpace: "nowrap" }}>
                              {formatDate(bid.bidDate)}
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <MckBadge tone={tone} size="sm">{bid.status}</MckBadge>
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <Link
                                href={`/deals/${bid.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "6px 10px",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: MCK.paper,
                                  color: MCK.ink,
                                  border: `1px solid ${MCK.borderStrong}`,
                                  textDecoration: "none",
                                  letterSpacing: "0.01em",
                                }}
                              >
                                딜룸 <ChevronRight size={11} />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: 낙찰 결과 */}
        {activeTab === "awards" && (
          <div style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.brass}` }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${MCK.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 17, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.015em" }}>
                  낙찰 결과
                </h2>
                <p style={{ fontSize: 12, color: MCK.textMuted, marginTop: 2 }}>최근 {awards.length}건의 낙찰 결과</p>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: MCK.textSub }}>
                <TrendingUp size={12} style={{ color: MCK.brassDark }} />
                평균 낙찰가율 <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{avgBidRate.toFixed(1)}%</span>
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              {awards.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: MCK.textMuted, fontWeight: 500 }}>낙찰 결과가 아직 없습니다.</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: MCK.paperTint, borderBottom: `1px solid ${MCK.border}` }}>
                      {["매물명", "매각 기관", "담보 유형", "채권 원금", "낙찰 금액", "낙찰가율", "입찰 참여", "낙찰일"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            fontSize: 10,
                            fontWeight: 800,
                            color: MCK.textSub,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                            textAlign: i >= 3 && i <= 5 ? "right" : (i === 6 ? "center" : "left"),
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {awards.map((award) => {
                      const rateColor = award.bidRate >= 80 ? MCK.positive : award.bidRate >= 75 ? MCK.blue : MCK.warning
                      return (
                        <tr key={award.id} style={{ borderBottom: `1px solid ${MCK.border}` }}>
                          <td style={{ padding: "12px 14px", fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 700, color: MCK.ink }}>
                            {award.title}
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: MCK.textSub, whiteSpace: "nowrap" }} title="NDA 체결 후 실명 공개">
                            {maskInstitutionName(award.institution)}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <MckBadge tone="neutral" size="sm" outlined>{award.collateralType}</MckBadge>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: MCK.textSub, fontVariantNumeric: "tabular-nums", fontFamily: MCK_FONTS.mono, whiteSpace: "nowrap" }}>
                            {formatKRW(award.principal)}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: MCK.brassDark, fontVariantNumeric: "tabular-nums", fontFamily: MCK_FONTS.mono, whiteSpace: "nowrap" }}>
                            {formatKRW(award.winningBid)}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                              <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: rateColor, fontVariantNumeric: "tabular-nums" }}>
                                {award.bidRate}%
                              </span>
                              <div style={{ width: 64, height: 2, background: MCK.border, position: "relative" }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    height: "100%",
                                    width: `${award.bidRate}%`,
                                    background: rateColor,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 12, fontWeight: 700, color: MCK.textSub, fontVariantNumeric: "tabular-nums" }}>
                            {award.bidCount}명
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: MCK.textMuted, whiteSpace: "nowrap" }}>
                            {formatDate(award.awardDate)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Bid Dialog */}
      <BidDialog
        item={bidTarget}
        open={bidDialogOpen}
        onClose={() => setBidDialogOpen(false)}
        onSubmitted={() => loadData()}
      />
    </MckPageShell>
  )
}
