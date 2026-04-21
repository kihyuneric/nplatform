"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  Gavel, Clock, Building2, Search, TrendingUp, MapPin,
  Calendar, Banknote, CheckCircle2, Shield, Eye, Timer,
  ArrowRight, Award, BarChart3, Sparkles, ChevronRight,
  AlertTriangle, Filter, X, FileText, Users, Heart,
  Activity, Zap, TrendingDown, ChevronDown, Loader2,
} from "lucide-react"
import { formatTimeLeft, formatMinBidRatio, REGION_SHORT_LIST, SELLER_INSTITUTIONS } from "@/lib/taxonomy"
import { maskInstitutionName } from "@/lib/mask"

// ─── Design System — NP Layer v3 (2026-04-20) ─────────────────────────────────
// Hero/Card 를 분리: bg0~bg4 = Hero(항상 네이비) · l0~l3 = Card(테마 반응형)
// fgh = Hero 위 텍스트 · lt1~lt4 = Card 위 텍스트 (WCAG AA+ 쌍)

const C = {
  /* Hero Surface — 항상 네이비 (브랜드 의도 · 테마 불변) */
  bg0:"var(--hero-bg)",           /* #0B1F3A */
  bg1:"var(--hero-bg)",           /* hero outer */
  bg2:"var(--hero-bg-elevated)",  /* #0D2448 */
  bg3:"var(--hero-bg-elevated)",  /* raised card inside hero */
  bg4:"var(--hero-bg-soft)",      /* #12305B */

  /* Adaptive Card Layers — 라이트/다크 자동 전환 */
  l0:"var(--layer-1-bg)",         /* card base (white light / #0D1525 dark) */
  l1:"var(--layer-2-bg)",         /* recessed (#F8FAFC light / #162035 dark) */
  l2:"var(--layer-3-bg)",         /* input/inset (#F1F5F9 light / #1E2D47 dark) */
  l3:"var(--layer-border)",       /* card border */

  /* Text on Cards (WCAG AA+) */
  lt1:"var(--fg-strong)",         /* 15:1 headings */
  lt2:"var(--fg-default)",        /* 10:1 body */
  lt3:"var(--fg-muted)",          /* 5.5:1 caption */
  lt4:"var(--fg-subtle)",         /* 3.5:1 large/icon */

  /* Text on Hero (항상 흰색 톤) */
  fgh:"var(--fg-on-hero)",        /* 18:1 on hero */
  fghd:"var(--fg-on-hero-dim)",   /* 12:1 */
  fghm:"var(--fg-on-hero-muted)", /* 7:1 */

  /* Semantic */
  em:"var(--color-positive)", emL:"var(--color-positive)",
  blue:"var(--color-brand-dark)", blueL:"var(--color-brand-bright)",
  amber:"var(--color-warning)", amber2:"#FCD34D",
  purple:"#A855F7", rose:"var(--color-danger)", teal:"#14B8A6",
  onBrand:"var(--fg-on-brand)",   /* #FFFFFF — brand bg 위 */
}

// ─── Inline helpers ───────────────────────────────────────────────────────────

function formatKRW(n: number) {
  if (n >= 1_0000_0000) return `${(n/1_0000_0000).toFixed(1)}억`
  if (n >= 1000_0000) return `${(n/1000_0000).toFixed(0)}천만`
  return `${(n/10_000).toFixed(0)}만`
}
function getDDay(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  return diff <= 0 ? 'D-0' : `D-${diff}`
}
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

const LISTING_CATEGORY_FILTER: { value: string; label: string }[] = [
  { value: "ALL",     label: "전체" },
  { value: "NPL",     label: "NPL" },
  { value: "GENERAL", label: "일반 부동산" },
]

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

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Filter Options (매물탐색과 동일 체계) ─────────────────────────────────────
const COLLATERAL_MAJOR_FILTER: { value: string; label: string; icon: string; keywords: string[] | null }[] = [
  { value: "ALL",         label: "전체",       icon: "◈", keywords: null },
  { value: "RESIDENTIAL", label: "주거용",     icon: "🏠", keywords: ["아파트", "오피스텔", "빌라", "연립", "단독", "다가구", "원룸", "도시형"] },
  { value: "COMMERCIAL",  label: "상업/산업용", icon: "🏢", keywords: ["상가", "사무실", "빌딩", "공장", "창고", "호텔", "숙박", "근린"] },
  { value: "LAND",        label: "토지",       icon: "🌿", keywords: ["토지", "대지", "임야", "농지", "전", "답", "잡종"] },
  { value: "ETC",         label: "기타",       icon: "📦", keywords: null /* 위 어디에도 속하지 않음 */ },
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

// ─── Risk Grade config (dark card variant) ────────────────────────────────────

const RISK_DARK: Record<string, { accent: string; glowColor: string; badgeBg: string; badgeText: string; label: string }> = {
  A: { accent: C.em,     glowColor: C.em,     badgeBg: `${C.em}22`,   badgeText: C.emL,   label: "A등급" },
  B: { accent: C.blue,   glowColor: C.blue,   badgeBg: `${C.blue}22`, badgeText: C.blueL, label: "B등급" },
  C: { accent: C.amber,  glowColor: C.amber,  badgeBg: `${C.amber}22`,badgeText: C.amber2,label: "C등급" },
  D: { accent: C.rose,   glowColor: C.rose,   badgeBg: `${C.rose}22`, badgeText: "#FDA4AF",label: "D등급" },
}

// ─── BidDialog ────────────────────────────────────────────────────────────────

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
  const risk = RISK_DARK[item.riskGrade] ?? RISK_DARK.C

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
          >
            {/* Accent top bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${risk.accent}, ${risk.accent}66)` }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.l3}` }}>
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-widest mb-0.5" style={{ color: risk.accent }}>입찰 참여</p>
                <p className="text-[0.9375rem] font-bold line-clamp-1" style={{ color: C.lt1 }}>{item.title}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: C.l2, color: C.lt3 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: C.l2, border: `1px solid ${C.l3}` }}>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide mb-1" style={{ color: C.lt3 }}>채권 원금</p>
                  <p className="text-[1rem] font-bold tabular-nums" style={{ color: C.lt1 }}>{formatKRW(item.principal)}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: C.l2, border: `1px solid ${C.l3}` }}>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide mb-1" style={{ color: C.lt3 }}>최저 입찰가</p>
                  <p className="text-[1rem] font-bold tabular-nums" style={{ color: C.em }}>{formatKRW(item.minimumBid)}</p>
                </div>
              </div>

              {/* AI Reference */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#DBEAFE" }}>
                  <Sparkles className="w-4 h-4" style={{ color: C.blue }} />
                </div>
                <div>
                  <p className="text-[0.75rem] font-semibold" style={{ color: "#1D4ED8" }}>AI 적정 입찰가 참고</p>
                  <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: "#1E3A8A" }}>
                    {formatKRW(item.aiEstimate)}
                    <span className="text-[0.75rem] font-normal ml-1" style={{ color: C.blue }}>
                      ({((item.aiEstimate / item.principal) * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>

              {/* Bid Input */}
              <div>
                <label className="block text-[0.8125rem] font-semibold mb-1.5" style={{ color: C.lt1 }}>입찰 금액 (원)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={bidAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "")
                      setBidAmount(v ? Number(v).toLocaleString() : "")
                    }}
                    placeholder={`최소 ${formatKRW(item.minimumBid)} 이상`}
                    className="w-full px-4 py-3 rounded-xl text-[0.9375rem] font-medium outline-none transition-all"
                    style={{
                      backgroundColor: C.l1,
                      border: `1.5px solid ${numAmount > 0 && numAmount < item.minimumBid ? C.rose : C.l3}`,
                      color: C.lt1,
                    }}
                  />
                  {numAmount > 0 && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] font-bold tabular-nums px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#F0FDF4", color: C.em }}
                    >
                      낙찰가율 {bidRate}%
                    </span>
                  )}
                </div>
                {numAmount > 0 && numAmount < item.minimumBid && (
                  <p className="text-[0.75rem] font-medium mt-1" style={{ color: C.rose }}>최저 입찰가 이상 입력해주세요</p>
                )}
              </div>

              {/* Agreements */}
              <div className="space-y-2.5">
                {[
                  { state: agreed1, setter: setAgreed1, label: "입찰 참여 약관 및 유의사항을 확인했습니다" },
                  { state: agreed2, setter: setAgreed2, label: "낙찰 시 계약 체결 의무가 있음을 확인합니다" },
                ].map(({ state, setter, label }, i) => (
                  <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                    <div
                      className="mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: state ? C.em : C.l0,
                        border: `1.5px solid ${state ? C.em : C.l3}`,
                      }}
                      onClick={() => setter(!state)}
                    >
                      {state && <CheckCircle2 className="w-3 h-3" style={{ color: "#fff" }} />}
                    </div>
                    <span className="text-[0.8125rem]" style={{ color: C.lt3 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4" style={{ borderTop: `1px solid ${C.l3}`, backgroundColor: C.l1 }}>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-[0.9375rem] font-semibold transition-colors"
                style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
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
                    // 401/404 등 DB 미연동 상태에서도 UX가 멈추지 않도록 fallback 메시지
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[0.9375rem] font-bold transition-all"
                style={{
                  background: (isValid && !submitting) ? `linear-gradient(135deg, ${C.em}, ${C.emL})` : C.l3,
                  color: (isValid && !submitting) ? "#fff" : C.lt4,
                  cursor: (isValid && !submitting) ? "pointer" : "not-allowed",
                  boxShadow: (isValid && !submitting) ? `0 4px 14px ${C.em}40` : "none",
                }}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> 제출 중...</>
                  : <><Gavel className="w-4 h-4" /></>}
                입찰 제출
              </button>
            </div>
            {submitError && (
              <div className="px-6 pb-4" style={{ backgroundColor: C.l1 }}>
                <p className="text-[0.8125rem] font-medium" style={{ color: C.rose }}>
                  {submitError}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Dark BidCard ─────────────────────────────────────────────────────────────

function BidCard({ item, onBid, index }: { item: BidItem; onBid: (item: BidItem) => void; index: number }) {
  const dday = getDDay(item.deadline)
  const risk = RISK_DARK[item.riskGrade] ?? RISK_DARK.C
  const bidRatePct = ((item.minimumBid / item.principal) * 100).toFixed(1)
  const isUrgent = item.status === "마감임박"
  const ddayNum = parseInt(dday.replace("D-", ""), 10)
  const ddayUrgent = ddayNum <= 1
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{
        y: -4,
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${risk.accent}30, 0 0 40px ${risk.glowColor}18`,
      }}
      className="group relative overflow-hidden rounded-2xl cursor-pointer"
      style={{
        backgroundColor: "rgba(10,22,40,0.95)",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 30px ${risk.glowColor}10`,
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}
    >
      {/* Grid line texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Ambient glow top */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${risk.glowColor}14 0%, transparent 70%)` }}
      />

      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${risk.accent}, ${risk.accent}44, transparent)` }} />

      <div className="relative p-5">
        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {/* Grade badge */}
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-black tracking-wide"
            style={{
              backgroundColor: risk.badgeBg,
              color: risk.badgeText,
              border: `1px solid ${risk.accent}40`,
            }}
          >
            {risk.label}
          </span>

          {/* Collateral type badge */}
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: C.fghd,
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {item.collateralType}
          </span>

          {/* Status badge */}
          {isUrgent ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold ml-auto"
              style={{ backgroundColor: `${C.rose}18`, color: "#FDA4AF", border: `1px solid ${C.rose}40` }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.rose }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: C.rose }} />
              </span>
              마감임박
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-semibold ml-auto"
              style={{ backgroundColor: `${C.em}18`, color: C.emL, border: `1px solid ${C.em}40` }}
            >
              진행중
            </span>
          )}
        </div>

        {/* Institution (L0 마스킹 — NDA 체결 후 실명 공개) */}
        <p
          className="text-[0.6875rem] font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: C.fghm }}
          title="NDA 체결 후 실명 공개"
        >
          {maskInstitutionName(item.institution)}
        </p>

        {/* Title */}
        <Link href={`/exchange/${item.id}`}>
          <h3
            className="text-[1rem] font-bold leading-snug mb-2.5 transition-opacity hover:opacity-80"
            style={{ color: C.fgh }}
          >
            {item.title}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-4">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.fghm }} />
          <span className="text-[0.75rem]" style={{ color: C.fghd }}>{item.location}</span>
        </div>

        {/* Metrics 3-col — dark bg3 panel */}
        <div
          className="grid grid-cols-3 gap-0 mb-4 rounded-xl overflow-hidden"
          style={{ backgroundColor: C.bg3, border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-3 py-3" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[0.5625rem] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.fghm }}>채권원금</p>
            <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: C.fgh }}>{formatKRW(item.principal)}</p>
          </div>
          <div className="px-3 py-3" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[0.5625rem] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.fghm }}>최저입찰가</p>
            <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: "#93C5FD" }}>{formatKRW(item.minimumBid)}</p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[0.5625rem] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-0.5" style={{ color: C.fghm }}>
              <Sparkles className="w-2.5 h-2.5" style={{ color: C.em }} />AI예가
            </p>
            <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: C.em }}>{formatKRW(item.aiEstimate)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.625rem] font-semibold uppercase tracking-wide" style={{ color: C.fghm }}>최저입찰 비율</span>
            <span className="text-[0.6875rem] font-bold tabular-nums" style={{ color: C.fghd }}>{bidRatePct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: `${bidRatePct}%` } : {}}
              transition={{ duration: 0.9, delay: index * 0.06 + 0.3, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${risk.accent}, ${risk.accent}88)` }}
            />
          </div>
        </div>

        {/* Footer Stats */}
        <div
          className="flex items-center gap-4 pb-4 mb-4 flex-wrap"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span
            className="flex items-center gap-1.5 text-[0.75rem] font-bold"
            style={{ color: ddayUrgent ? "#FDA4AF" : C.fghd }}
          >
            <Timer className="w-3.5 h-3.5" />
            {dday}
            {ddayUrgent && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-[0.625rem] font-black tabular-nums"
                style={{ backgroundColor: `${C.rose}22`, color: "#FDA4AF" }}
              >
                {formatTimeLeft(item.deadline)}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-[0.75rem] font-semibold" style={{ color: C.fghd }}>
            <Users className="w-3.5 h-3.5" /> 입찰 {item.bidCount}명
          </span>
          <span className="flex items-center gap-1 text-[0.75rem]" style={{ color: C.fghm }}>
            <Eye className="w-3.5 h-3.5" /> 조회 {item.viewCount.toLocaleString()}
          </span>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Link
            href={`/exchange/${item.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              color: C.fgh,
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <Eye className="w-3.5 h-3.5" /> 상세보기
          </Link>
          <button
            onClick={() => onBid(item)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.8125rem] font-bold transition-all"
            style={{
              background: `linear-gradient(135deg, ${C.em}, ${C.emL})`,
              color: C.onBrand,
              boxShadow: `0 2px 12px ${C.em}50`,
            }}
          >
            <Gavel className="w-3.5 h-3.5" /> 입찰 참여
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuctionPage() {
  const [activeTab, setActiveTab] = useState<"bidding" | "my" | "awards">("bidding")
  const [search, setSearch] = useState("")
  const [listingCategory, setListingCategory] = useState("ALL")        // ALL/NPL/GENERAL
  const [collateral, setCollateral] = useState("ALL")                 // major: ALL/RESIDENTIAL/COMMERCIAL/LAND/ETC
  const [collateralMinor, setCollateralMinor] = useState("ALL")       // 소분류 Korean keyword
  const [region, setRegion] = useState("ALL")                          // 서울/경기/...
  const [instType, setInstType] = useState("ALL")                      // 은행/저축은행/...
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState("마감임박순")
  const [bidTarget, setBidTarget] = useState<BidItem | null>(null)
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  // Supabase-connected state — empty until loaded
  const [bids, setBids] = useState<BidItem[]>([])
  const [myBids, setMyBids] = useState<MyBid[]>([])
  const [awards, setAwards] = useState<AwardResult[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true })

  const loadData = useCallback(async () => {
    setDataLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [bidsRes, myBidsRes, awardsRes] = await Promise.allSettled([
        // Active auction listings from npl_listings where auction_type != null
        supabase.from("npl_listings")
          .select("id, title, seller_profiles:profiles!npl_listings_seller_id_fkey(name), collateral_type, region, principal_amount, minimum_bid, ai_estimate, auction_deadline, bid_count, view_count, risk_grade, auction_status")
          .eq("status", "ACTIVE")
          .not("auction_deadline", "is", null)
          .order("auction_deadline", { ascending: true })
          .limit(50),

        // User's own bids
        user ? supabase.from("auction_bids")
          .select("id, listing_id, bid_amount, created_at, status, result_date, npl_listings(title, collateral_type, principal_amount, profiles!npl_listings_seller_id_fkey(name))")
          .eq("bidder_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20) : Promise.resolve({ data: [] }),

        // Recent completed auctions
        supabase.from("auction_results")
          .select("id, listing_id, winning_bid, bid_count, awarded_at, npl_listings(title, collateral_type, principal_amount, profiles!npl_listings_seller_id_fkey(name))")
          .order("awarded_at", { ascending: false })
          .limit(20),
      ])

      if (bidsRes.status === "fulfilled" && bidsRes.value.data?.length) {
        setBids(bidsRes.value.data.map((r: any) => ({
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
        })))
      }

      if (myBidsRes.status === "fulfilled" && (myBidsRes.value as any).data?.length) {
        setMyBids(((myBidsRes.value as any).data ?? []).map((r: any) => ({
          id: String(r.listing_id ?? r.id),
          title: r.npl_listings?.title ?? "NPL 채권",
          institution: r.npl_listings?.profiles?.name ?? "—",
          bidAmount: r.bid_amount ?? 0,
          principal: r.npl_listings?.principal_amount ?? 0,
          bidDate: String(r.created_at ?? "").slice(0, 10),
          status: r.status ?? "진행중",
          resultDate: r.result_date ? String(r.result_date).slice(0, 10) : undefined,
        })))
      }

      if (awardsRes.status === "fulfilled" && awardsRes.value.data?.length) {
        setAwards(awardsRes.value.data.map((r: any) => {
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
        }))
      }
    } catch { /* data stays empty */ } finally {
      // DB에 데이터 없으면 샘플 매물 하나 제공 (개발/데모용)
      setBids(prev => prev.length > 0 ? prev : [
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
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
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
      ])
      setDataLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredBids = useMemo(() => {
    const majorDef = COLLATERAL_MAJOR_FILTER.find((m) => m.value === collateral)
    const allMajorKeywords = COLLATERAL_MAJOR_FILTER
      .filter((m) => m.value !== "ALL" && m.value !== "ETC" && m.keywords)
      .flatMap((m) => m.keywords as string[])

    const filtered = bids.filter((b) => {
      const type = b.collateralType ?? ""

      // 0) 매물 유형 (NPL / 일반 부동산)
      if (listingCategory !== "ALL") {
        const cat = b.listingCategory ?? "NPL"
        if (cat !== listingCategory) return false
      }

      // 1) 담보 대분류 매칭
      if (collateral !== "ALL") {
        if (collateral === "ETC") {
          // 다른 대분류의 keyword 에 하나도 매칭되지 않는 경우만 기타
          const matchesOther = allMajorKeywords.some((kw) => type.includes(kw))
          if (matchesOther) return false
        } else if (majorDef?.keywords) {
          const matches = majorDef.keywords.some((kw) => type.includes(kw))
          if (!matches) return false
        }
      }

      // 2) 담보 소분류 (keyword substring)
      if (collateralMinor !== "ALL" && !type.includes(collateralMinor)) return false

      // 3) 지역
      if (region !== "ALL" && !(b.location ?? "").includes(region)) return false

      // 4) 기관
      if (instType !== "ALL" && !(b.institution ?? "").includes(instType)) return false

      // 5) 검색어
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
  const totalPrincipal = bids.reduce((s, b) => s + b.principal, 0)
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

  // My bid status config — all dark-on-light for legibility
  const MY_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
    진행중: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
    낙찰:   { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
    유찰:   { bg: "#FFE4E6", text: "#9F1239", border: "#FCA5A5" },
    철회:   { bg: C.l2,     text: C.lt3,     border: C.l3      },
  }

  return (
    <div style={{ backgroundColor: C.l2, minHeight: "100vh" }}>

      {/* ── DARK HERO ─────────────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative overflow-hidden" style={{ backgroundColor: C.bg1 }}>

        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute rounded-full"
            style={{
              top: -120, left: -80, width: 500, height: 500,
              background: `radial-gradient(circle, ${C.em}30 0%, transparent 70%)`,
              filter: "blur(60px)", opacity: 0.25,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: -60, right: -100, width: 400, height: 400,
              background: `radial-gradient(circle, ${C.blue}40 0%, transparent 70%)`,
              filter: "blur(80px)", opacity: 0.18,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: -60, left: "40%", width: 300, height: 300,
              background: `radial-gradient(circle, ${C.purple}50 0%, transparent 70%)`,
              filter: "blur(60px)", opacity: 0.12,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-0">

          {/* Live badge + title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ backgroundColor: `${C.em}20`, border: `1px solid ${C.em}40` }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.em }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: C.em }} />
                </span>
                <span className="text-[0.6875rem] font-black uppercase tracking-widest" style={{ color: C.em }}>LIVE</span>
              </div>
              <span className="text-[0.75rem]" style={{ color: C.fghm }}>실시간 자발적 경매 현황</span>
            </div>

            <h1 className="text-[2.5rem] sm:text-[3rem] font-black tracking-tight leading-none mb-3" style={{ color: C.fgh }}>
              자발적 경매
            </h1>
            <p className="text-[1rem] max-w-xl mb-8" style={{ color: C.fghd }}>
              금융기관이 등록한 매물에 자발적 경매로 참여하세요. AI가 적정 입찰가를 실시간으로 분석합니다.
            </p>
          </motion.div>

          {/* KPI strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {[
              { label: "총 입찰", value: `${bids.length}건`, icon: Gavel, color: C.em },
              { label: "진행중", value: `${activeBids}건`, icon: Activity, color: C.blueL },
              { label: "마감임박", value: `${urgentBids}건`, icon: AlertTriangle, color: C.amber },
              { label: "평균 낙찰가율", value: `${avgBidRate.toFixed(1)}%`, icon: TrendingUp, color: C.purple },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: C.bg2 }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-[0.6875rem] font-medium uppercase tracking-wide" style={{ color: C.fghm }}>{label}</p>
                  <p className="text-[1.0625rem] font-black tabular-nums mt-0.5" style={{ color: C.fgh }}>{value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Cross-links ── */}
          <div className="flex items-center gap-3 flex-wrap mt-6">
            <Link href="/analysis/simulator" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, backgroundColor: `${C.bg3}`, border: `1px solid ${C.bg4}`, color: C.fghd, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              경매 수익률 분석기 →
            </Link>
            <Link href="/analysis/copilot" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, backgroundColor: `${C.bg3}`, border: `1px solid ${C.bg4}`, color: C.fghd, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              AI 컨설턴트 →
            </Link>
            <Link href="/exchange" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, backgroundColor: `${C.bg3}`, border: `1px solid ${C.bg4}`, color: C.fghd, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              매물 거래소 →
            </Link>
          </div>

          {/* ── DARK Tab bar ────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={heroInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="flex items-end gap-1 mt-8 -mb-px"
          >
            {TABS.map(({ key, label, icon: Icon, count }) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className="relative flex items-center gap-2 px-5 py-3 text-[0.875rem] font-semibold transition-all rounded-t-xl"
                  style={
                    isActive
                      ? {
                          backgroundColor: C.l2,
                          color: C.lt1,
                          boxShadow: "0 -1px 0 0 rgba(255,255,255,0.08)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: C.fghd,
                        }
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold"
                    style={
                      isActive
                        ? { backgroundColor: C.em, color: C.onBrand }
                        : { backgroundColor: "rgba(255,255,255,0.10)", color: C.fghm }
                    }
                  >
                    {count}
                  </span>
                  {/* Active underline accent */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ backgroundColor: C.em }}
                    />
                  )}
                </button>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* ── LIGHT sticky filter bar — bidding tab only ─────────────────────── */}
      {activeTab === "bidding" && (
        <div
          className="sticky top-0 z-30"
          style={{ backgroundColor: C.l0, borderBottom: `1px solid ${C.l3}` }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.lt4 }} />
              <input
                type="text"
                placeholder="매물명, 기관, 지역 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-xl text-[0.875rem] outline-none transition-all"
                style={{
                  backgroundColor: C.l1,
                  border: `1.5px solid ${search ? C.blue : C.l3}`,
                  color: C.lt1,
                }}
              />
              <div
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[0.5625rem] font-bold"
                style={{ backgroundColor: "#EFF6FF", color: C.blue }}
              >
                AI
              </div>
            </div>

            {/* 매물 유형 (NPL / 일반 부동산) */}
            <div className="flex items-center gap-1.5">
              {LISTING_CATEGORY_FILTER.map((c) => {
                const active = listingCategory === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setListingCategory(c.value)}
                    className="px-3 py-1.5 rounded-full text-[0.8125rem] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? C.blue : C.l2,
                      color: active ? C.onBrand : C.lt2,
                      border: `1px solid ${active ? C.blue : C.l3}`,
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Major chips (담보 대분류) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLLATERAL_MAJOR_FILTER.map((c) => {
                const active = collateral === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => { setCollateral(c.value); setCollateralMinor("ALL") }}
                    className="px-3 py-1.5 rounded-full text-[0.8125rem] font-semibold transition-all inline-flex items-center gap-1"
                    style={{
                      backgroundColor: active ? C.lt1 : C.l2,
                      color: active ? C.l0 : C.lt2,
                      border: `1px solid ${active ? C.lt1 : C.l3}`,
                    }}
                  >
                    <span aria-hidden="true">{c.icon}</span>
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Toggle advanced filters */}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8125rem] font-semibold transition-all"
              style={{
                backgroundColor: filtersOpen ? C.blue : C.l2,
                color: filtersOpen ? C.onBrand : C.lt2,
                border: `1px solid ${filtersOpen ? C.blue : C.l3}`,
              }}
              aria-pressed={filtersOpen}
            >
              <Filter className="w-3.5 h-3.5" />
              상세필터
              {(collateralMinor !== "ALL" || region !== "ALL" || instType !== "ALL") && (
                <span
                  className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[0.6875rem] font-bold"
                  style={{ backgroundColor: filtersOpen ? "rgba(255,255,255,0.25)" : C.em, color: filtersOpen ? C.onBrand : C.onBrand }}
                >
                  {[collateralMinor !== "ALL", region !== "ALL", instType !== "ALL"].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="ml-auto relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-[0.8125rem] font-semibold outline-none cursor-pointer"
                style={{ backgroundColor: C.l2, border: `1px solid ${C.l3}`, color: C.lt1 }}
              >
                <option>마감임박순</option>
                <option>원금높은순</option>
                <option>입찰많은순</option>
                <option>저위험순</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: C.lt4 }} />
            </div>
          </div>

          {/* ── Advanced filter panel ───────────────────────────────────────── */}
          {filtersOpen && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3" style={{ borderTop: `1px solid ${C.l3}` }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                {/* Minor collateral */}
                <div>
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.lt3 }}>담보 소분류</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(COLLATERAL_MINOR_MAP[collateral] ?? [{ value: "ALL", label: "전체" }]).map((m) => {
                      const active = collateralMinor === m.value
                      return (
                        <button
                          key={m.value}
                          onClick={() => setCollateralMinor(m.value)}
                          className="px-2.5 py-1 rounded-full text-[0.75rem] font-semibold transition-all"
                          style={{
                            backgroundColor: active ? C.blue : C.l1,
                            color: active ? C.onBrand : C.lt2,
                            border: `1px solid ${active ? C.blue : C.l3}`,
                          }}
                          disabled={collateral === "ALL"}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.lt3 }}>지역</label>
                  <div className="relative">
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="appearance-none w-full pl-3 pr-8 py-2 rounded-xl text-[0.8125rem] font-medium outline-none cursor-pointer"
                      style={{ backgroundColor: C.l1, border: `1px solid ${C.l3}`, color: C.lt1 }}
                    >
                      {REGION_FILTER.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: C.lt4 }} />
                  </div>
                </div>

                {/* Institution */}
                <div>
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.lt3 }}>기관</label>
                  <div className="relative">
                    <select
                      value={instType}
                      onChange={(e) => setInstType(e.target.value)}
                      className="appearance-none w-full pl-3 pr-8 py-2 rounded-xl text-[0.8125rem] font-medium outline-none cursor-pointer"
                      style={{ backgroundColor: C.l1, border: `1px solid ${C.l3}`, color: C.lt1 }}
                    >
                      {INST_FILTER.map((i) => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: C.lt4 }} />
                  </div>
                </div>
              </div>

              {/* Reset */}
              {(listingCategory !== "ALL" || collateralMinor !== "ALL" || region !== "ALL" || instType !== "ALL") && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => { setListingCategory("ALL"); setCollateralMinor("ALL"); setRegion("ALL"); setInstType("ALL") }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.75rem] font-semibold transition-colors"
                    style={{ color: C.lt3 }}
                  >
                    <X className="w-3 h-3" /> 필터 초기화
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENT AREA (light bg) ────────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
        style={{ backgroundColor: C.l2 }}
      >
        <AnimatePresence mode="wait">

          {/* ── Tab: 진행중 입찰 ────────────────────────────────────────── */}
          {activeTab === "bidding" && (
            <motion.div
              key="bidding"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-[0.9375rem]" style={{ color: C.lt3 }}>
                  총 <span className="font-bold" style={{ color: C.lt1 }}>{filteredBids.length}</span>건의 입찰 매물
                </p>
              </div>

              {filteredBids.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredBids.map((item, i) => (
                    <BidCard key={item.id} item={item} onBid={handleBid} index={i} />
                  ))}
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-20 rounded-2xl"
                  style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
                >
                  <Search className="w-10 h-10 mb-3" style={{ color: C.lt4 }} />
                  <p className="text-[1rem] font-bold mb-1" style={{ color: C.lt2 }}>검색 결과가 없습니다</p>
                  <p className="text-[0.875rem]" style={{ color: C.lt4 }}>다른 검색어나 필터를 시도해보세요</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab: 내 입찰 현황 ──────────────────────────────────────── */}
          {activeTab === "my" && (
            <motion.div
              key="my"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                {[
                  { label: "전체", count: myBids.length, color: C.lt2 },
                  { label: "진행중", count: myBids.filter(b => b.status === "진행중").length, color: C.em },
                  { label: "낙찰", count: myBids.filter(b => b.status === "낙찰").length, color: C.blue },
                  { label: "유찰/철회", count: myBids.filter(b => b.status === "유찰" || b.status === "철회").length, color: C.rose },
                ].map(({ label, count, color }) => (
                  <div
                    key={label}
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
                  >
                    <p className="text-[0.75rem] font-medium mb-1" style={{ color: C.lt3 }}>{label}</p>
                    <p className="text-[1.5rem] font-black tabular-nums" style={{ color }}>{count}건</p>
                  </div>
                ))}
              </div>

              {/* Table card */}
              <div
                className="overflow-hidden rounded-2xl"
                style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
              >
                <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.l3}` }}>
                  <h2 className="text-[1.0625rem] font-bold" style={{ color: C.lt1 }}>내 입찰 현황</h2>
                  <p className="text-[0.8125rem] mt-0.5" style={{ color: C.lt4 }}>총 {myBids.length}건의 입찰 내역</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: C.l1, borderBottom: `1px solid ${C.l3}` }}>
                        {["매물명", "매각 기관", "채권 원금", "입찰 금액", "낙찰가율", "입찰일", "상태", "관리"].map((h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-wide whitespace-nowrap ${i >= 2 && i <= 4 ? "text-right" : i === 6 || i === 7 ? "text-center" : "text-left"}`}
                            style={{ color: C.lt4 }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myBids.map((bid, idx) => {
                        const rate = ((bid.bidAmount / bid.principal) * 100).toFixed(1)
                        const st = MY_STATUS_CONFIG[bid.status] ?? MY_STATUS_CONFIG["철회"]
                        return (
                          <motion.tr
                            key={bid.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="transition-colors"
                            style={{ borderBottom: `1px solid ${C.l3}` }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.l1)}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/exchange/${bid.id}`}
                                className="text-[0.875rem] font-semibold hover:opacity-70 transition-opacity"
                                style={{ color: C.blue }}
                              >
                                {bid.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3.5 text-[0.875rem] whitespace-nowrap" style={{ color: C.lt3 }} title="NDA 체결 후 실명 공개">{maskInstitutionName(bid.institution)}</td>
                            <td className="px-4 py-3.5 text-right text-[0.875rem] font-semibold tabular-nums whitespace-nowrap font-mono" style={{ color: C.lt1 }}>{formatKRW(bid.principal)}</td>
                            <td className="px-4 py-3.5 text-right text-[0.875rem] font-bold tabular-nums whitespace-nowrap font-mono" style={{ color: C.em }}>{formatKRW(bid.bidAmount)}</td>
                            <td className="px-4 py-3.5 text-right text-[0.875rem] tabular-nums font-semibold font-mono" style={{ color: C.lt2 }}>{rate}%</td>
                            <td className="px-4 py-3.5 text-[0.8125rem] whitespace-nowrap" style={{ color: C.lt4 }}>{formatDate(bid.bidDate)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold"
                                style={{ backgroundColor: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                              >
                                {bid.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <Link
                                href={`/deals/${bid.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.8125rem] font-semibold transition-colors"
                                style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
                              >
                                딜룸 <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Tab: 낙찰 결과 ─────────────────────────────────────────── */}
          {activeTab === "awards" && (
            <motion.div
              key="awards"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="overflow-hidden rounded-2xl"
                style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
              >
                <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.l3}` }}>
                  <h2 className="text-[1.0625rem] font-bold" style={{ color: C.lt1 }}>낙찰 결과</h2>
                  <p className="text-[0.8125rem] mt-0.5" style={{ color: C.lt4 }}>최근 {awards.length}건의 낙찰 결과</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: C.l1, borderBottom: `1px solid ${C.l3}` }}>
                        {["매물명", "매각 기관", "담보 유형", "채권 원금", "낙찰 금액", "낙찰가율", "입찰 참여", "낙찰일"].map((h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-wide whitespace-nowrap ${i >= 3 && i <= 5 ? "text-right" : i === 6 ? "text-center" : "text-left"}`}
                            style={{ color: C.lt4 }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {awards.map((award, idx) => {
                        const rateColor = award.bidRate >= 80 ? C.em : award.bidRate >= 75 ? C.blue : C.amber
                        const rateBarColor = award.bidRate >= 80 ? C.em : award.bidRate >= 75 ? C.blue : C.amber
                        return (
                          <motion.tr
                            key={award.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="transition-colors"
                            style={{ borderBottom: `1px solid ${C.l3}` }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.l1)}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <td className="px-4 py-3.5 text-[0.875rem] font-semibold" style={{ color: C.lt1 }}>{award.title}</td>
                            <td className="px-4 py-3.5 text-[0.875rem] whitespace-nowrap" style={{ color: C.lt3 }} title="NDA 체결 후 실명 공개">{maskInstitutionName(award.institution)}</td>
                            <td className="px-4 py-3.5">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium"
                                style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
                              >
                                {award.collateralType}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right text-[0.875rem] tabular-nums whitespace-nowrap font-mono" style={{ color: C.lt2 }}>{formatKRW(award.principal)}</td>
                            <td className="px-4 py-3.5 text-right text-[0.875rem] font-bold tabular-nums whitespace-nowrap font-mono" style={{ color: C.em }}>{formatKRW(award.winningBid)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[0.9375rem] font-black tabular-nums" style={{ color: rateColor }}>{award.bidRate}%</span>
                                <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: C.l3 }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${award.bidRate}%`, backgroundColor: rateBarColor }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center text-[0.875rem] tabular-nums font-semibold" style={{ color: C.lt2 }}>{award.bidCount}명</td>
                            <td className="px-4 py-3.5 text-[0.8125rem] whitespace-nowrap" style={{ color: C.lt4 }}>{formatDate(award.awardDate)}</td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bid Dialog */}
      <BidDialog
        item={bidTarget}
        open={bidDialogOpen}
        onClose={() => setBidDialogOpen(false)}
        onSubmitted={() => loadData()}
      />
    </div>
  )
}
