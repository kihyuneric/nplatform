"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  Gavel, Clock, Building2, Search, TrendingUp, MapPin,
  Calendar, Banknote, CheckCircle2, Shield, Eye, Timer,
  ArrowRight, Award, BarChart3, Sparkles, ChevronRight,
  AlertTriangle, Filter, X, FileText, Users, Heart,
  Activity, Zap, TrendingDown, ChevronDown,
} from "lucide-react"

// ─── Design System ────────────────────────────────────────────────────────────

const C = {
  bg0:"#030810", bg1:"#050D1A", bg2:"#080F1E", bg3:"#0A1628", bg4:"#0F1F35",
  em:"#10B981", emL:"#34D399", blue:"#3B82F6", blueL:"#60A5FA",
  amber:"#F59E0B", amber2:"#FCD34D", purple:"#A855F7", rose:"#F43F5E", teal:"#14B8A6",
  l0:"#FFFFFF", l1:"#F8FAFC", l2:"#F1F5F9", l3:"#E2E8F0",
  lt1:"#0F172A", lt2:"#334155", lt3:"#64748B", lt4:"#94A3B8",
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_BIDS: BidItem[] = [
  { id: "bid-1", title: "강남 역삼동 아파트 담보 채권", institution: "한국자산관리공사", collateralType: "아파트", location: "서울 강남구", principal: 1250000000, minimumBid: 875000000, aiEstimate: 980000000, deadline: "2026-04-12", bidCount: 8, viewCount: 234, riskGrade: "A", status: "진행중" },
  { id: "bid-2", title: "분당 정자동 오피스텔 담보 채권", institution: "우리금융에프앤아이", collateralType: "오피스텔", location: "경기 성남시", principal: 450000000, minimumBid: 315000000, aiEstimate: 370000000, deadline: "2026-04-08", bidCount: 15, viewCount: 412, riskGrade: "B", status: "마감임박" },
  { id: "bid-3", title: "해운대 마린시티 상가 담보 채권", institution: "하나에프앤아이", collateralType: "상가", location: "부산 해운대구", principal: 2800000000, minimumBid: 1960000000, aiEstimate: 2200000000, deadline: "2026-04-18", bidCount: 3, viewCount: 89, riskGrade: "B", status: "진행중" },
  { id: "bid-4", title: "용인 수지구 빌라 담보 채권", institution: "대신에프앤아이", collateralType: "빌라", location: "경기 용인시", principal: 320000000, minimumBid: 224000000, aiEstimate: 260000000, deadline: "2026-04-07", bidCount: 22, viewCount: 567, riskGrade: "C", status: "마감임박" },
  { id: "bid-5", title: "제주 서귀포 토지 담보 채권", institution: "한국자산관리공사", collateralType: "토지", location: "제주 서귀포시", principal: 890000000, minimumBid: 623000000, aiEstimate: 720000000, deadline: "2026-04-20", bidCount: 5, viewCount: 145, riskGrade: "C", status: "진행중" },
  { id: "bid-6", title: "마포 공덕동 아파트 담보 채권", institution: "신한캐피탈", collateralType: "아파트", location: "서울 마포구", principal: 980000000, minimumBid: 686000000, aiEstimate: 810000000, deadline: "2026-04-15", bidCount: 11, viewCount: 298, riskGrade: "A", status: "진행중" },
  { id: "bid-7", title: "대전 유성구 상가 담보 채권", institution: "키움에프앤아이", collateralType: "상가", location: "대전 유성구", principal: 560000000, minimumBid: 392000000, aiEstimate: 450000000, deadline: "2026-04-09", bidCount: 7, viewCount: 178, riskGrade: "B", status: "마감임박" },
  { id: "bid-8", title: "인천 송도 아파트 담보 채권", institution: "우리금융에프앤아이", collateralType: "아파트", location: "인천 연수구", principal: 1680000000, minimumBid: 1176000000, aiEstimate: 1350000000, deadline: "2026-04-22", bidCount: 4, viewCount: 112, riskGrade: "A", status: "진행중" },
  { id: "bid-9", title: "수원 영통구 빌라 담보 채권", institution: "하나에프앤아이", collateralType: "빌라", location: "경기 수원시", principal: 280000000, minimumBid: 196000000, aiEstimate: 230000000, deadline: "2026-04-06", bidCount: 18, viewCount: 489, riskGrade: "D", status: "마감임박" },
  { id: "bid-10", title: "강서 마곡동 오피스텔 담보 채권", institution: "대신에프앤아이", collateralType: "오피스텔", location: "서울 강서구", principal: 520000000, minimumBid: 364000000, aiEstimate: 420000000, deadline: "2026-04-25", bidCount: 2, viewCount: 67, riskGrade: "B", status: "진행중" },
  { id: "bid-11", title: "일산 킨텍스 상가 담보 채권", institution: "한국자산관리공사", collateralType: "상가", location: "경기 고양시", principal: 1450000000, minimumBid: 1015000000, aiEstimate: 1180000000, deadline: "2026-04-16", bidCount: 6, viewCount: 201, riskGrade: "B", status: "진행중" },
  { id: "bid-12", title: "평택 고덕동 토지 담보 채권", institution: "키움에프앤아이", collateralType: "토지", location: "경기 평택시", principal: 750000000, minimumBid: 525000000, aiEstimate: 610000000, deadline: "2026-04-11", bidCount: 9, viewCount: 256, riskGrade: "C", status: "진행중" },
]

const MOCK_MY_BIDS: MyBid[] = [
  { id: "bid-1", title: "강남 역삼동 아파트 담보 채권", institution: "한국자산관리공사", bidAmount: 920000000, principal: 1250000000, bidDate: "2026-03-28", status: "진행중" },
  { id: "bid-13", title: "서초 반포동 아파트 담보 채권", institution: "우리금융에프앤아이", bidAmount: 1450000000, principal: 1800000000, bidDate: "2026-03-20", status: "낙찰", resultDate: "2026-03-25" },
  { id: "bid-14", title: "논현동 상가 담보 채권", institution: "하나에프앤아이", bidAmount: 680000000, principal: 950000000, bidDate: "2026-03-15", status: "유찰", resultDate: "2026-03-22" },
  { id: "bid-4", title: "용인 수지구 빌라 담보 채권", institution: "대신에프앤아이", bidAmount: 240000000, principal: 320000000, bidDate: "2026-04-01", status: "진행중" },
  { id: "bid-15", title: "종로구 오피스텔 담보 채권", institution: "신한캐피탈", bidAmount: 310000000, principal: 420000000, bidDate: "2026-02-28", status: "철회", resultDate: "2026-03-01" },
]

const MOCK_AWARDS: AwardResult[] = [
  { id: "aw-1", title: "서초 반포동 아파트 담보 채권", institution: "우리금융에프앤아이", principal: 1800000000, winningBid: 1450000000, bidRate: 80.6, bidCount: 12, awardDate: "2026-03-25", collateralType: "아파트" },
  { id: "aw-2", title: "역삼동 오피스텔 담보 채권", institution: "한국자산관리공사", principal: 650000000, winningBid: 490000000, bidRate: 75.4, bidCount: 8, awardDate: "2026-03-20", collateralType: "오피스텔" },
  { id: "aw-3", title: "판교 상가 담보 채권", institution: "키움에프앤아이", principal: 1200000000, winningBid: 876000000, bidRate: 73.0, bidCount: 15, awardDate: "2026-03-18", collateralType: "상가" },
  { id: "aw-4", title: "잠실 아파트 담보 채권", institution: "하나에프앤아이", principal: 2100000000, winningBid: 1722000000, bidRate: 82.0, bidCount: 20, awardDate: "2026-03-15", collateralType: "아파트" },
  { id: "aw-5", title: "세종시 토지 담보 채권", institution: "대신에프앤아이", principal: 430000000, winningBid: 301000000, bidRate: 70.0, bidCount: 6, awardDate: "2026-03-12", collateralType: "토지" },
  { id: "aw-6", title: "청담동 빌라 담보 채권", institution: "신한캐피탈", principal: 580000000, winningBid: 452000000, bidRate: 77.9, bidCount: 9, awardDate: "2026-03-10", collateralType: "빌라" },
  { id: "aw-7", title: "김포 아파트 담보 채권", institution: "우리금융에프앤아이", principal: 380000000, winningBid: 281000000, bidRate: 73.9, bidCount: 11, awardDate: "2026-03-08", collateralType: "아파트" },
  { id: "aw-8", title: "동탄 상가 담보 채권", institution: "한국자산관리공사", principal: 920000000, winningBid: 690000000, bidRate: 75.0, bidCount: 14, awardDate: "2026-03-05", collateralType: "상가" },
]

const COLLATERAL_FILTERS = ["전체", "아파트", "오피스텔", "상가", "토지", "빌라"]

// ─── Risk Grade config (dark card variant) ────────────────────────────────────

const RISK_DARK: Record<string, { accent: string; glowColor: string; badgeBg: string; badgeText: string; label: string }> = {
  A: { accent: C.em,     glowColor: C.em,     badgeBg: `${C.em}22`,   badgeText: C.emL,   label: "A등급" },
  B: { accent: C.blue,   glowColor: C.blue,   badgeBg: `${C.blue}22`, badgeText: C.blueL, label: "B등급" },
  C: { accent: C.amber,  glowColor: C.amber,  badgeBg: `${C.amber}22`,badgeText: C.amber2,label: "C등급" },
  D: { accent: C.rose,   glowColor: C.rose,   badgeBg: `${C.rose}22`, badgeText: "#FDA4AF",label: "D등급" },
}

// ─── BidDialog ────────────────────────────────────────────────────────────────

function BidDialog({ item, open, onClose }: { item: BidItem | null; open: boolean; onClose: () => void }) {
  const [bidAmount, setBidAmount] = useState("")
  const [agreed1, setAgreed1] = useState(false)
  const [agreed2, setAgreed2] = useState(false)

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
                disabled={!isValid}
                onClick={() => { alert(`${formatKRW(numAmount)} 입찰이 접수되었습니다.`); onClose() }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[0.9375rem] font-bold transition-all"
                style={{
                  background: isValid ? `linear-gradient(135deg, ${C.em}, ${C.emL})` : C.l3,
                  color: isValid ? "#fff" : C.lt4,
                  cursor: isValid ? "pointer" : "not-allowed",
                  boxShadow: isValid ? `0 4px 14px ${C.em}40` : "none",
                }}
              >
                <Gavel className="w-4 h-4" />
                입찰 제출
              </button>
            </div>
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
              color: C.lt4,
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

        {/* Institution */}
        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest mb-1.5" style={{ color: C.lt4 }}>
          {item.institution}
        </p>

        {/* Title */}
        <Link href={`/exchange/${item.id}`}>
          <h3
            className="text-[1rem] font-bold leading-snug mb-2.5 transition-opacity hover:opacity-80"
            style={{ color: C.l0 }}
          >
            {item.title}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-4">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.lt4 }} />
          <span className="text-[0.75rem]" style={{ color: C.lt4 }}>{item.location}</span>
        </div>

        {/* Metrics 3-col — dark bg3 panel */}
        <div
          className="grid grid-cols-3 gap-0 mb-4 rounded-xl overflow-hidden"
          style={{ backgroundColor: C.bg3, border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-3 py-3" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[0.5625rem] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.lt4 }}>채권원금</p>
            <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: C.l0 }}>{formatKRW(item.principal)}</p>
          </div>
          <div className="px-3 py-3" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[0.5625rem] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.lt4 }}>최저입찰가</p>
            <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: C.blue }}>{formatKRW(item.minimumBid)}</p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[0.5625rem] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-0.5" style={{ color: C.lt4 }}>
              <Sparkles className="w-2.5 h-2.5" style={{ color: C.em }} />AI예가
            </p>
            <p className="text-[0.875rem] font-bold tabular-nums" style={{ color: C.em }}>{formatKRW(item.aiEstimate)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.625rem] font-semibold uppercase tracking-wide" style={{ color: C.lt4 }}>최저입찰 비율</span>
            <span className="text-[0.6875rem] font-bold tabular-nums" style={{ color: C.lt4 }}>{bidRatePct}%</span>
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
          className="flex items-center gap-4 pb-4 mb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span
            className="flex items-center gap-1.5 text-[0.75rem] font-bold"
            style={{ color: ddayUrgent ? C.rose : C.lt4 }}
          >
            <Timer className="w-3.5 h-3.5" />
            {dday}
          </span>
          <span className="flex items-center gap-1 text-[0.75rem]" style={{ color: C.lt4 }}>
            <Users className="w-3.5 h-3.5" /> {item.bidCount}명
          </span>
          <span className="flex items-center gap-1 text-[0.75rem]" style={{ color: C.lt4 }}>
            <Eye className="w-3.5 h-3.5" /> {item.viewCount}
          </span>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Link
            href={`/exchange/${item.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              color: C.lt4,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Eye className="w-3.5 h-3.5" /> 상세보기
          </Link>
          <button
            onClick={() => onBid(item)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.8125rem] font-bold transition-all"
            style={{
              background: `linear-gradient(135deg, ${C.em}, ${C.emL})`,
              color: "#fff",
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
  const [collateral, setCollateral] = useState("전체")
  const [sortBy, setSortBy] = useState("마감임박순")
  const [bidTarget, setBidTarget] = useState<BidItem | null>(null)
  const [bidDialogOpen, setBidDialogOpen] = useState(false)

  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true })

  const filteredBids = useMemo(() => {
    const filtered = MOCK_BIDS.filter((b) => {
      if (collateral !== "전체" && b.collateralType !== collateral) return false
      if (search && !b.title.includes(search) && !b.institution.includes(search) && !b.location.includes(search)) return false
      return true
    })
    if (sortBy === "마감임박순") return [...filtered].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    if (sortBy === "원금높은순") return [...filtered].sort((a, b) => b.principal - a.principal)
    if (sortBy === "입찰많은순") return [...filtered].sort((a, b) => b.bidCount - a.bidCount)
    return filtered
  }, [search, collateral, sortBy])

  const activeBids = MOCK_BIDS.filter((b) => b.status !== "마감").length
  const urgentBids = MOCK_BIDS.filter((b) => b.status === "마감임박").length
  const totalPrincipal = MOCK_BIDS.reduce((s, b) => s + b.principal, 0)
  const avgBidRate = MOCK_AWARDS.reduce((s, a) => s + a.bidRate, 0) / MOCK_AWARDS.length

  function handleBid(item: BidItem) {
    setBidTarget(item)
    setBidDialogOpen(true)
  }

  const TABS = [
    { key: "bidding", label: "진행중 입찰", icon: Gavel, count: activeBids },
    { key: "my", label: "내 입찰 현황", icon: FileText, count: MOCK_MY_BIDS.length },
    { key: "awards", label: "낙찰 결과", icon: Award, count: MOCK_AWARDS.length },
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
              <span className="text-[0.75rem]" style={{ color: C.lt4 }}>실시간 입찰 현황</span>
            </div>

            <h1 className="text-[2.5rem] sm:text-[3rem] font-black tracking-tight leading-none mb-3" style={{ color: C.l0 }}>
              NPL 입찰
            </h1>
            <p className="text-[1rem] max-w-xl mb-8" style={{ color: C.lt4 }}>
              금융기관이 등록한 부실채권에 직접 입찰하세요. AI가 적정 입찰가를 실시간으로 분석합니다.
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
              { label: "총 입찰", value: `${MOCK_BIDS.length}건`, icon: Gavel, color: C.em },
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
                  <p className="text-[0.6875rem] font-medium uppercase tracking-wide" style={{ color: C.lt4 }}>{label}</p>
                  <p className="text-[1.0625rem] font-black tabular-nums mt-0.5" style={{ color: C.l0 }}>{value}</p>
                </div>
              </div>
            ))}
          </motion.div>

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
                          color: C.lt4,
                        }
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold"
                    style={
                      isActive
                        ? { backgroundColor: C.em, color: "#fff" }
                        : { backgroundColor: "rgba(255,255,255,0.10)", color: C.lt4 }
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

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLLATERAL_FILTERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCollateral(c)}
                  className="px-3 py-1.5 rounded-full text-[0.8125rem] font-semibold transition-all"
                  style={{
                    backgroundColor: collateral === c ? C.lt1 : C.l2,
                    color: collateral === c ? C.l0 : C.lt2,
                    border: `1px solid ${collateral === c ? C.lt1 : C.l3}`,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

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
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: C.lt4 }} />
            </div>
          </div>
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
                  { label: "전체", count: MOCK_MY_BIDS.length, color: C.lt2 },
                  { label: "진행중", count: MOCK_MY_BIDS.filter(b => b.status === "진행중").length, color: C.em },
                  { label: "낙찰", count: MOCK_MY_BIDS.filter(b => b.status === "낙찰").length, color: C.blue },
                  { label: "유찰/철회", count: MOCK_MY_BIDS.filter(b => b.status === "유찰" || b.status === "철회").length, color: C.rose },
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
                  <p className="text-[0.8125rem] mt-0.5" style={{ color: C.lt4 }}>총 {MOCK_MY_BIDS.length}건의 입찰 내역</p>
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
                      {MOCK_MY_BIDS.map((bid, idx) => {
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
                            <td className="px-4 py-3.5 text-[0.875rem] whitespace-nowrap" style={{ color: C.lt3 }}>{bid.institution}</td>
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
                  <p className="text-[0.8125rem] mt-0.5" style={{ color: C.lt4 }}>최근 {MOCK_AWARDS.length}건의 낙찰 결과</p>
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
                      {MOCK_AWARDS.map((award, idx) => {
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
                            <td className="px-4 py-3.5 text-[0.875rem] whitespace-nowrap" style={{ color: C.lt3 }}>{award.institution}</td>
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
      <BidDialog item={bidTarget} open={bidDialogOpen} onClose={() => setBidDialogOpen(false)} />
    </div>
  )
}
