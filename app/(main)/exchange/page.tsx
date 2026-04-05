"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  List, LayoutGrid, SlidersHorizontal, Heart, MapPin,
  TrendingUp, BarChart2, ArrowRight, Search, Plus,
  ChevronsUpDown, ChevronUp, ChevronDown, ExternalLink,
  Gavel, Home, Building2, Eye, Brain, Sparkles, Activity,
  Shield, Zap, ChevronRight, CheckCircle2,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS  (주 페이지와 동일)
═══════════════════════════════════════════════════════════ */
const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E",
  bg3: "#0A1628", bg4: "#0F1F35",
  em: "#10B981", emL: "#34D399",
  blue: "#3B82F6", blueL: "#60A5FA",
  amber: "#F59E0B", amberL: "#FCD34D",
  purple: "#A855F7", rose: "#F43F5E",
  teal: "#14B8A6",
  /* light palette */
  l0: "#FFFFFF", l1: "#F8FAFC", l2: "#F1F5F9", l3: "#E2E8F0",
  lt1: "#0F172A", lt2: "#334155", lt3: "#64748B", lt4: "#94A3B8",
}

const up = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type AssetTab = "npl" | "realestate"

interface Listing {
  id: string; institution_name: string; institution_type: "INSTITUTION" | "AMC" | "INDIVIDUAL"
  trust_grade: "S" | "A" | "B" | "C"; principal: number
  location_city: string; location_district: string; collateral_type: string
  ai_estimate_low: number; ai_estimate_high: number
  risk_grade: "A" | "B" | "C" | "D" | "E"; deadline: string
  interest_count: number; deal_stage: string; created_at: string
  ltv?: number; overdue_months?: number
}
interface ReListing {
  id: string; type: string; dealType: string; address: string; price: number
  monthlyRent?: number; area: number; floor: string; direction: string
  viewCount: number; likeCount: number; daysAgo: number
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & MOCK DATA
═══════════════════════════════════════════════════════════ */
const COLLATERAL_CHIPS = ["전체", "아파트", "상가", "토지", "기타"]
const RE_CHIPS_TYPE = ["전체", "아파트", "오피스텔", "상가", "토지"]
const RE_CHIPS_DEAL = ["전체", "매매", "전세", "월세"]

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  A: { label: "A등급", color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.3)", glow: "rgba(16,185,129,0.15)" },
  B: { label: "B등급", color: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", glow: "rgba(59,130,246,0.15)" },
  C: { label: "C등급", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", glow: "rgba(245,158,11,0.15)" },
  D: { label: "D등급", color: "#F97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", glow: "rgba(249,115,22,0.15)" },
  E: { label: "E등급", color: "#F43F5E", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.3)", glow: "rgba(244,63,94,0.15)" },
}

const MOCK_LISTINGS: Listing[] = [
  { id:"1", institution_name:"한국자산관리공사", institution_type:"INSTITUTION", trust_grade:"S", principal:1250000000, location_city:"서울", location_district:"강남구", collateral_type:"아파트", ai_estimate_low:800000000, ai_estimate_high:1100000000, risk_grade:"B", deadline:"2026-04-15", interest_count:12, deal_stage:"공고중", created_at:"2026-03-10", ltv:58.7, overdue_months:14 },
  { id:"2", institution_name:"우리은행", institution_type:"INSTITUTION", trust_grade:"A", principal:3500000000, location_city:"경기", location_district:"성남시", collateral_type:"오피스", ai_estimate_low:2200000000, ai_estimate_high:2800000000, risk_grade:"A", deadline:"2026-04-20", interest_count:8, deal_stage:"공고중", created_at:"2026-03-12", ltv:43.2, overdue_months:8 },
  { id:"3", institution_name:"하나은행", institution_type:"INSTITUTION", trust_grade:"A", principal:780000000, location_city:"부산", location_district:"해운대구", collateral_type:"상가", ai_estimate_low:450000000, ai_estimate_high:600000000, risk_grade:"C", deadline:"2026-04-10", interest_count:5, deal_stage:"관심표명", created_at:"2026-03-08", ltv:72.1, overdue_months:22 },
  { id:"4", institution_name:"신한은행", institution_type:"INSTITUTION", trust_grade:"S", principal:5200000000, location_city:"서울", location_district:"서초구", collateral_type:"오피스", ai_estimate_low:3800000000, ai_estimate_high:4500000000, risk_grade:"A", deadline:"2026-05-01", interest_count:22, deal_stage:"공고중", created_at:"2026-03-15", ltv:39.8, overdue_months:6 },
  { id:"5", institution_name:"대신F&I", institution_type:"AMC", trust_grade:"B", principal:320000000, location_city:"대전", location_district:"유성구", collateral_type:"아파트", ai_estimate_low:200000000, ai_estimate_high:280000000, risk_grade:"D", deadline:"2026-04-05", interest_count:3, deal_stage:"NDA체결", created_at:"2026-03-05", ltv:81.3, overdue_months:31 },
  { id:"6", institution_name:"국민은행", institution_type:"INSTITUTION", trust_grade:"S", principal:1800000000, location_city:"서울", location_district:"마포구", collateral_type:"오피스텔", ai_estimate_low:1200000000, ai_estimate_high:1500000000, risk_grade:"B", deadline:"2026-04-25", interest_count:15, deal_stage:"공고중", created_at:"2026-03-18", ltv:61.5, overdue_months:17 },
  { id:"7", institution_name:"연합자산관리", institution_type:"AMC", trust_grade:"A", principal:950000000, location_city:"인천", location_district:"남동구", collateral_type:"토지", ai_estimate_low:550000000, ai_estimate_high:720000000, risk_grade:"C", deadline:"2026-04-18", interest_count:7, deal_stage:"공고중", created_at:"2026-03-14", ltv:68.4, overdue_months:19 },
  { id:"8", institution_name:"IBK기업은행", institution_type:"INSTITUTION", trust_grade:"A", principal:2100000000, location_city:"경기", location_district:"용인시", collateral_type:"상가", ai_estimate_low:1400000000, ai_estimate_high:1800000000, risk_grade:"B", deadline:"2026-04-30", interest_count:10, deal_stage:"실사진행", created_at:"2026-03-11", ltv:55.2, overdue_months:12 },
  { id:"9", institution_name:"키움캐피탈", institution_type:"AMC", trust_grade:"B", principal:640000000, location_city:"대구", location_district:"수성구", collateral_type:"아파트", ai_estimate_low:390000000, ai_estimate_high:520000000, risk_grade:"C", deadline:"2026-04-22", interest_count:6, deal_stage:"관심표명", created_at:"2026-03-09", ltv:66.8, overdue_months:20 },
  { id:"10", institution_name:"우리금융F&I", institution_type:"AMC", trust_grade:"A", principal:4100000000, location_city:"서울", location_district:"영등포구", collateral_type:"오피스", ai_estimate_low:2900000000, ai_estimate_high:3600000000, risk_grade:"A", deadline:"2026-05-10", interest_count:18, deal_stage:"공고중", created_at:"2026-03-20", ltv:44.6, overdue_months:9 },
]

const POPULAR_REGIONS = [
  { rank:1, name:"서울 강남구", count:412, change:"+8.2%" },
  { rank:2, name:"경기 성남시", count:287, change:"+3.1%" },
  { rank:3, name:"서울 서초구", count:241, change:"+5.7%" },
  { rank:4, name:"부산 해운대구", count:198, change:"+1.4%" },
  { rank:5, name:"경기 용인시", count:176, change:"-0.9%" },
]

const RECENT_BIDS = [
  { property:"서울 송파 아파트", bid_rate:82.4, date:"04/03" },
  { property:"경기 분당 오피스", bid_rate:76.1, date:"04/02" },
  { property:"부산 해운대 상가", bid_rate:71.8, date:"04/01" },
  { property:"서울 강남 오피스텔", bid_rate:88.3, date:"03/31" },
]

const MOCK_RE_LISTINGS: ReListing[] = [
  { id:"r1", type:"아파트", dealType:"매매", address:"서울 마포구 합정동 355-4", price:1280000000, area:84.9, floor:"12층", direction:"남향", viewCount:243, likeCount:18, daysAgo:1 },
  { id:"r2", type:"아파트", dealType:"전세", address:"서울 용산구 이촌동 302-1", price:720000000, area:59.7, floor:"7층", direction:"남동향", viewCount:187, likeCount:12, daysAgo:2 },
  { id:"r3", type:"아파트", dealType:"월세", address:"경기 성남시 분당구 정자동 7", price:30000000, monthlyRent:1800000, area:49.5, floor:"4층", direction:"동향", viewCount:95, likeCount:5, daysAgo:0 },
  { id:"r4", type:"상가", dealType:"매매", address:"서울 강남구 압구정동 429", price:2150000000, area:125.3, floor:"1층", direction:"남향", viewCount:156, likeCount:9, daysAgo:3 },
  { id:"r5", type:"오피스텔", dealType:"월세", address:"서울 서초구 반포동 19-3", price:5000000, monthlyRent:950000, area:33.2, floor:"15층", direction:"남서향", viewCount:78, likeCount:4, daysAgo:1 },
  { id:"r6", type:"토지", dealType:"매매", address:"경기 파주시 운정3동 1486", price:580000000, area:350.0, floor:"—", direction:"—", viewCount:42, likeCount:3, daysAgo:5 },
  { id:"r7", type:"아파트", dealType:"매매", address:"경기 수원시 영통구 이의동 142", price:850000000, area:84.7, floor:"8층", direction:"남향", viewCount:121, likeCount:8, daysAgo:2 },
  { id:"r8", type:"상가", dealType:"월세", address:"부산 해운대구 중동 1418", price:20000000, monthlyRent:3500000, area:89.1, floor:"1층", direction:"동향", viewCount:68, likeCount:6, daysAgo:4 },
  { id:"r9", type:"오피스텔", dealType:"매매", address:"서울 영등포구 여의도동 30", price:680000000, area:57.4, floor:"21층", direction:"서향", viewCount:104, likeCount:7, daysAgo:1 },
  { id:"r10", type:"아파트", dealType:"전세", address:"인천 연수구 송도동 7-3", price:520000000, area:74.3, floor:"5층", direction:"남향", viewCount:89, likeCount:5, daysAgo:3 },
]

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function formatKRW(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`
  return `${n.toLocaleString()}원`
}
function getDaysLeft(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}
function getAIReturn(principal: number, low: number): number {
  if (!low || principal <= 0) return 0
  return Math.round(((principal - low) / low) * 100 * 10) / 10
}
function formatRe(l: ReListing): string {
  const e = (n: number) => n >= 100000000 ? `${(n/100000000).toFixed(1)}억` : `${(n/10000).toFixed(0)}만`
  if (l.dealType === "월세") return `${e(l.price)} / ${((l.monthlyRent ?? 0)/10000).toFixed(0)}만`
  return e(l.price)
}

/* ─── mini sparkline ─── */
function Spark({ color }: { color: string }) {
  const pts = [30, 42, 35, 55, 48, 63, 57, 72, 66, 80]
  const max = Math.max(...pts), min = Math.min(...pts)
  const norm = (v: number) => 100 - ((v - min) / (max - min + 1)) * 80 - 10
  const w = 100 / (pts.length - 1)
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${i * w} ${norm(v)}`).join(" ")
  return (
    <svg viewBox="0 0 100 100" className="w-12 h-6" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L 100 100 L 0 100 Z`} fill={color} opacity="0.07" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   NPL LISTING CARD  — DealCard 스타일 통일 (다크 + 탭)
═══════════════════════════════════════════════════════════ */
function NplCard({ listing, watchlist, onToggle }: {
  listing: Listing; watchlist: Set<string>; onToggle: (id: string) => void
}) {
  const [tab, setTab] = useState(0)
  const daysLeft = getDaysLeft(listing.deadline)
  const aiReturn = getAIReturn(listing.principal, listing.ai_estimate_low)
  const risk = RISK_CONFIG[listing.risk_grade] ?? RISK_CONFIG["C"]
  const isWatched = watchlist.has(listing.id)
  const isUrgent = daysLeft >= 0 && daysLeft <= 3
  const deadlineLabel = daysLeft < 0 ? "마감" : daysLeft === 0 ? "오늘 마감" : `D-${daysLeft}`

  return (
    <motion.div variants={up}>
      <div className="relative select-none">
        {/* Ambient glow */}
        <div className="absolute -inset-3 rounded-3xl blur-2xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${risk.glow} 0%, transparent 70%)` }} />

        <div className="relative rounded-2xl overflow-hidden"
          style={{
            background: "rgba(10,22,40,0.95)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
            backdropFilter: "blur(20px)",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${risk.border}`; e.currentTarget.style.transform = "translateY(-3px)" }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)"; e.currentTarget.style.transform = "translateY(0)" }}
        >
          {/* Top gradient line (risk color) */}
          <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${risk.color}90, transparent)` }} />

          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.em }} />
              <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.07em" }}>
                NPL #{listing.id.padStart(4, "0")}-A-{(parseInt(listing.id) * 847).toString().slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* D-day badge */}
              {isUrgent && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
                  style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.rose }} />
                  <span className="text-[10px] font-bold" style={{ color: C.rose }}>{deadlineLabel}</span>
                </div>
              )}
              {/* Risk grade */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: risk.bg, border: `1px solid ${risk.border}` }}>
                <span className="text-xs font-black" style={{ color: risk.color }}>{listing.risk_grade}+</span>
                <span className="text-[9px] font-medium" style={{ color: `${risk.color}99` }}>등급</span>
              </div>
              {/* Watchlist */}
              <button onClick={() => onToggle(listing.id)}
                className="p-1 rounded-lg transition-all"
                style={isWatched ? { color: C.rose } : { color: "rgba(255,255,255,0.25)" }}>
                <Heart size={12} fill={isWatched ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Institution + location */}
            <div className="mb-3">
              <div className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                {listing.institution_name} · {listing.location_city} {listing.location_district}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(59,130,246,0.12)", color: C.blue, border: "1px solid rgba(59,130,246,0.2)" }}>
                  {listing.collateral_type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(245,158,11,0.12)", color: C.amber, border: "1px solid rgba(245,158,11,0.2)" }}>
                  2순위 담보
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
                  {listing.risk_grade === "A" || listing.risk_grade === "B" ? "저위험" : listing.risk_grade === "C" ? "중위험" : "고위험"}
                </span>
              </div>
            </div>

            {/* Bloomberg 3-metric grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label:"감정가", val:`${formatKRW(listing.ai_estimate_high)}`, sub:`LTV ${listing.ltv}%`, color:"rgba(255,255,255,0.75)" },
                { label:"최저 입찰가", val:`${formatKRW(listing.ai_estimate_low)}`, sub:`낙찰가율 ${listing.ltv ? (100 - listing.ltv + 40).toFixed(1) : "—"}%`, color: C.blue },
                { label:"예상 수익률", val:`+${aiReturn}%`, sub:"AI 시뮬레이션", color: C.em },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[9px] mb-1 font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>{m.label}</div>
                  <div className="text-sm font-black tabular-nums" style={{ color: m.color }}>{m.val}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-lg mb-3 p-0.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {["AI 분석", "권리관계", "입찰 현황"].map((t, i) => (
                <button key={t} onClick={() => setTab(i)}
                  className="flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all"
                  style={tab === i
                    ? { background: C.bg4, color: "rgba(255,255,255,0.85)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
                    : { color: "rgba(255,255,255,0.3)" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {tab === 0 && (
                <motion.div key="ai" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
                  <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Brain size={11} style={{ color: C.em }} />
                        <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>AI 리스크 스코어</span>
                      </div>
                      <span className="text-[11px] font-black" style={{ color: C.em }}>
                        {listing.risk_grade === "A" ? "낮음 · 88/100" : listing.risk_grade === "B" ? "낮음 · 74/100" : listing.risk_grade === "C" ? "중간 · 58/100" : "높음 · 40/100"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${C.em}, ${C.emL})` }}
                        initial={{ width:0 }}
                        animate={{ width: listing.risk_grade === "A" ? "88%" : listing.risk_grade === "B" ? "74%" : listing.risk_grade === "C" ? "58%" : "40%" }}
                        transition={{ delay:0.3, duration:1, ease:"easeOut" }} />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {["담보 충분", "권리 복잡도 낮음", "경매 이력 없음"].map(txt => (
                        <div key={txt} className="flex items-center gap-1">
                          <CheckCircle2 size={9} style={{ color: C.em }} />
                          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{txt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {tab === 1 && (
                <motion.div key="rights" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
                  <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}>
                    {[
                      ["1순위", `${listing.institution_name} 근저당`, `${formatKRW(listing.ai_estimate_low * 0.3)}`, true],
                      ["2순위", "담보 채권", `${formatKRW(listing.principal)}`, false],
                      ["가압류", "해당없음", "—", true],
                    ].map(([rank, desc, amt, ok]) => (
                      <div key={String(rank)} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] w-8 font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{rank}</span>
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{desc}</span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: ok ? C.em : C.blue }}>{amt}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {tab === 2 && (
                <motion.div key="bid" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}>
                  <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>현재 입찰 현황</span>
                      <div className="flex items-center gap-1">
                        {!isUrgent && (
                          <span className="text-[10px] font-bold" style={{ color: C.amber }}>{deadlineLabel}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {Array.from({ length: Math.min(listing.interest_count, 5) }).map((_, i) => (
                          <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{ background: C.bg4, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", zIndex: 5 - i }}>
                            {["KB","신한","하나","우리","기타"][i]}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        입찰자 <strong style={{ color: "rgba(255,255,255,0.85)" }}>{listing.interest_count}명</strong>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link href={`/exchange/${listing.id}`}
                className="py-2.5 rounded-xl text-center font-bold text-xs transition-all"
                style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: "white", boxShadow: `0 4px 12px rgba(16,185,129,0.25)` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1)" }}>
                입찰 참여하기
              </Link>
              <Link href={`/deals`}
                className="py-2.5 rounded-xl text-center text-xs font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}>
                딜룸 입장
              </Link>
            </div>
          </div>

          {/* Live badge bottom */}
          <div className="flex items-center justify-between px-4 py-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
            <div className="flex items-center gap-1.5">
              <Activity size={10} style={{ color: C.amber }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                입찰자 <span style={{ color: "rgba(255,255,255,0.75)", fontWeight:700 }}>{listing.interest_count}명</span> 실시간
              </span>
            </div>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              {listing.overdue_months}개월 연체
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   RE CARD
═══════════════════════════════════════════════════════════ */
function ReCard({ l }: { l: ReListing }) {
  const dealColor = l.dealType === "매매" ? C.blue : l.dealType === "전세" ? C.amber : C.rose
  const typeColor = l.type === "아파트" ? C.blue : l.type === "상가" ? C.amber : l.type === "오피스텔" ? C.purple : C.em
  return (
    <motion.div variants={up}>
      <div className="group rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
        style={{ background: C.l0, border: `1px solid ${C.l3}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-3px)" }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)" }}
      >
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${typeColor}, transparent)` }} />
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-1 rounded-lg text-xs font-bold"
                style={{ background: `${typeColor}12`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                {l.type}
              </span>
              <span className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${dealColor}10`, color: dealColor, border: `1px solid ${dealColor}28` }}>
                {l.dealType}
              </span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: C.l2, color: C.lt4 }}>
              {l.daysAgo === 0 ? "오늘" : `${l.daysAgo}일 전`}
            </span>
          </div>
          <div className="flex items-start gap-1.5 mb-3">
            <MapPin size={12} style={{ color: C.em, marginTop: 2, flexShrink: 0 }} />
            <span className="text-sm leading-snug" style={{ color: C.lt2 }}>{l.address}</span>
          </div>
          <div className="mb-3">
            <div className="text-[10px] mb-0.5 font-medium" style={{ color: C.lt4 }}>
              {l.dealType === "매매" ? "매매가" : l.dealType === "전세" ? "전세금" : "보증금 / 월세"}
            </div>
            <div className="text-xl font-black tabular-nums" style={{ color: C.lt1 }}>{formatRe(l)}</div>
          </div>
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: C.lt3 }}>
            <span>{l.area}㎡</span>
            <span style={{ color: C.l3 }}>·</span>
            <span>{l.floor}</span>
            <span style={{ color: C.l3 }}>·</span>
            <span>{l.direction}</span>
          </div>
          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: `1px solid ${C.l2}` }}>
            <div className="flex items-center gap-3 text-xs" style={{ color: C.lt4 }}>
              <span className="flex items-center gap-1"><Eye size={11} />{l.viewCount}</span>
              <span className="flex items-center gap-1"><Heart size={11} />{l.likeCount}</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: C.blue }}>상세보기 →</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function ExchangePage() {
  const [tabMode, setTabMode] = useState<AssetTab>("npl")
  const [viewMode, setViewMode] = useState<"list" | "card">("card")
  const [sortKey, setSortKey] = useState<keyof Listing | "">("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [activeChip, setActiveChip] = useState("전체")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [reTypeChip, setReTypeChip] = useState("전체")
  const [reDealChip, setReDealChip] = useState("전체")
  const [reSearchQuery, setReSearchQuery] = useState("")
  const [rePage, setRePage] = useState(1)
  const PER_PAGE = 6; const RE_PER_PAGE = 6

  const headerRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true })

  const filtered = MOCK_LISTINGS.filter(l => {
    const matchChip = activeChip === "전체" || l.collateral_type === activeChip
    const matchSearch = !searchQuery || l.institution_name.includes(searchQuery) ||
      l.location_city.includes(searchQuery) || l.location_district.includes(searchQuery) || l.collateral_type.includes(searchQuery)
    return matchChip && matchSearch
  })
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const filteredRe = MOCK_RE_LISTINGS.filter(l => {
    if (reTypeChip !== "전체" && l.type !== reTypeChip) return false
    if (reDealChip !== "전체" && l.dealType !== reDealChip) return false
    if (reSearchQuery && !l.address.includes(reSearchQuery) && !l.type.includes(reSearchQuery)) return false
    return true
  })
  const reTotalPages = Math.ceil(filteredRe.length / RE_PER_PAGE)
  const rePaginated = filteredRe.slice((rePage - 1) * RE_PER_PAGE, rePage * RE_PER_PAGE)

  function toggleWatch(id: string) {
    setWatchlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function handleSort(key: keyof Listing) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const TABLE_COLS: { key: keyof Listing | ""; label: string; sortable?: boolean; right?: boolean }[] = [
    { key:"risk_grade", label:"등급", sortable:true },
    { key:"institution_name", label:"기관명", sortable:true },
    { key:"collateral_type", label:"담보", sortable:true },
    { key:"location_city", label:"지역", sortable:true },
    { key:"principal", label:"채권원금", sortable:true, right:true },
    { key:"ltv", label:"LTV", sortable:true, right:true },
    { key:"interest_count", label:"관심", sortable:true, right:true },
    { key:"deadline", label:"D-day", sortable:true, right:true },
    { key:"", label:"" },
  ]

  const nplStats = [
    { label:"총 NPL 매물", value:"3,240건", color: C.em, icon: <BarChart2 size={14} /> },
    { label:"이번 주 신규", value:"142건",  color: C.blue, icon: <TrendingUp size={14} /> },
    { label:"평균 낙찰가율", value:"78.3%", color: C.amber, icon: <Activity size={14} /> },
    { label:"AI 분석완료", value:"2,891건", color: C.purple, icon: <Brain size={14} /> },
  ]
  const reStats = [
    { label:"총 부동산 매물", value:"1,840건", color: C.em, icon: <Building2 size={14} /> },
    { label:"오늘 신규", value:"36건",         color: C.blue, icon: <TrendingUp size={14} /> },
    { label:"평균 매매가", value:"9.4억원",     color: C.amber, icon: <Activity size={14} /> },
    { label:"이번 주 거래", value:"124건",      color: C.purple, icon: <Zap size={14} /> },
  ]
  const currentStats = tabMode === "npl" ? nplStats : reStats

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.l2, fontFamily: "'Pretendard Variable','Pretendard',sans-serif" }}>

      {/* ══════════════════════════════════════════════════════
          DARK HERO HEADER
      ══════════════════════════════════════════════════════ */}
      <div ref={headerRef} style={{ backgroundColor: C.bg1, position: "relative", overflow: "hidden" }}>
        {/* Background orbs */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"-40%", left:"5%", width:"500px", height:"300px", background:"radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", borderRadius:"50%", filter:"blur(60px)" }} />
          <div style={{ position:"absolute", top:"-20%", right:"10%", width:"400px", height:"250px", background:"radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", borderRadius:"50%", filter:"blur(60px)" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }} />
        </div>

        <div style={{ maxWidth:"1440px", margin:"0 auto", padding:"1.5rem 1.5rem 0" }}>
          {/* Breadcrumb */}
          <motion.div initial={{ opacity:0 }} animate={headerInView ? { opacity:1 } : {}} transition={{ duration:0.4 }}
            className="flex items-center gap-1.5 mb-4" style={{ color:"rgba(255,255,255,0.3)", fontSize:"12px" }}>
            <span>홈</span>
            <ChevronRight size={12} />
            <span style={{ color:"rgba(255,255,255,0.6)" }}>매물 허브</span>
          </motion.div>

          {/* Title row */}
          <motion.div initial={{ opacity:0, y:12 }} animate={headerInView ? { opacity:1, y:0 } : {}} transition={{ duration:0.5 }}
            className="flex items-start justify-between mb-5 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.em }} />
                <span className="text-xs font-bold" style={{ color: C.em, letterSpacing:"0.08em" }}>LIVE · 실시간 매물</span>
              </div>
              <h1 className="font-black leading-tight" style={{ fontSize:"clamp(1.5rem, 3vw, 2rem)", color:"rgba(255,255,255,0.95)" }}>
                {tabMode === "npl" ? "NPL 채권 거래소" : "부동산 직거래 매물"}
              </h1>
              <p className="text-sm mt-1" style={{ color:"rgba(255,255,255,0.4)" }}>
                {tabMode === "npl" ? "금융기관 직판 NPL 채권 · AI 리스크 분석 · 실시간 입찰" : "아파트 · 상가 · 오피스텔 · 토지 직거래 매물"}
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <Link href="/exchange/map"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all"
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.65)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
              >
                <MapPin size={13} /> 지도 보기
              </Link>
              <Link href="/exchange/sell"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all"
                style={{ background:`linear-gradient(135deg, ${C.em}, #059669)`, color:"white", boxShadow:`0 4px 16px rgba(16,185,129,0.25)` }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)" }}
              >
                <Plus size={14} /> 매물 등록
              </Link>
            </div>
          </motion.div>

          {/* Asset type tabs */}
          <div className="flex items-center gap-1">
            {[
              { key:"npl" as AssetTab, label:"NPL 채권", icon:<Gavel size={13} />, color: C.em },
              { key:"realestate" as AssetTab, label:"부동산 매물", icon:<Home size={13} />, color: C.blue },
            ].map(t => (
              <button key={t.key} onClick={() => setTabMode(t.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all relative"
                style={tabMode === t.key ? { color: t.color } : { color:"rgba(255,255,255,0.4)" }}
              >
                {t.icon} {t.label}
                {tabMode === t.key && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: t.color }} />
                )}
              </button>
            ))}
            <Link href="/exchange/auction"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all"
              style={{ color:"rgba(255,255,255,0.35)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.65)" }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)" }}
            >
              <Gavel size={13} /> 법원경매
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: C.blue, color:"white" }}>AI</span>
            </Link>
          </div>
        </div>

        {/* ── Dark KPI strip ── */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", backgroundColor: C.bg2 }}>
          <div style={{ maxWidth:"1440px", margin:"0 auto", padding:"0.75rem 1.5rem" }}>
            <motion.div variants={stagger} initial="hidden" animate={headerInView ? "visible" : "hidden"}
              className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {currentStats.map((s, i) => (
                <motion.div key={s.label} variants={up} custom={i}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div className="p-1.5 rounded-lg" style={{ background:"rgba(255,255,255,0.04)", color: s.color }}>{s.icon}</div>
                  <div>
                    <div className="text-[10px] font-medium" style={{ color:"rgba(255,255,255,0.35)" }}>{s.label}</div>
                    <div className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
                  </div>
                  <Spark color={s.color} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          LIGHT FILTER BAR
      ══════════════════════════════════════════════════════ */}
      <div style={{ backgroundColor: C.l0, borderBottom:`1px solid ${C.l3}`, position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth:"1440px", margin:"0 auto", padding:"0.75rem 1.5rem" }}>
          <div className="flex items-center gap-3 flex-wrap">

            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.lt4 }} />
              <input
                type="text"
                placeholder={tabMode === "npl" ? "기관명, 지역, 담보 유형 검색" : "주소, 매물유형 검색"}
                value={tabMode === "npl" ? searchQuery : reSearchQuery}
                onChange={e => { tabMode === "npl" ? (setSearchQuery(e.target.value), setPage(1)) : (setReSearchQuery(e.target.value), setRePage(1)) }}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                style={{ background: C.l1, border:`1px solid ${C.l3}`, color: C.lt1 }}
                onFocus={e => { e.currentTarget.style.border = `1px solid ${C.em}`; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(16,185,129,0.08)` }}
                onBlur={e => { e.currentTarget.style.border = `1px solid ${C.l3}`; e.currentTarget.style.boxShadow = "none" }}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.15)" }}>
                <Sparkles size={9} style={{ color: C.em }} />
                <span className="text-[9px] font-black" style={{ color: C.em }}>AI</span>
              </div>
            </div>

            {/* Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(tabMode === "npl" ? COLLATERAL_CHIPS : RE_CHIPS_TYPE).map(chip => {
                const active = tabMode === "npl" ? activeChip === chip : reTypeChip === chip
                return (
                  <button key={chip} onClick={() => tabMode === "npl" ? (setActiveChip(chip), setPage(1)) : (setReTypeChip(chip), setRePage(1))}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={active
                      ? { background: C.lt1, color: C.l0, border:`1px solid ${C.lt1}` }
                      : { background: C.l1, color: C.lt2, border:`1px solid ${C.l3}` }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = C.lt3 }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = C.l3 }}
                  >{chip}</button>
                )
              })}
              {tabMode === "realestate" && (
                <>
                  <div style={{ width:"1px", height:"20px", background: C.l3, margin:"0 4px" }} />
                  {RE_CHIPS_DEAL.map(chip => {
                    const active = reDealChip === chip
                    const color = chip === "매매" ? C.blue : chip === "전세" ? C.amber : chip === "월세" ? C.rose : C.lt2
                    return (
                      <button key={chip} onClick={() => { setReDealChip(chip); setRePage(1) }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={active
                          ? { background: `${color}15`, color, border:`1px solid ${color}40` }
                          : { background: C.l1, color: C.lt2, border:`1px solid ${C.l3}` }}
                      >{chip}</button>
                    )
                  })}
                </>
              )}
            </div>

            {/* Divider */}
            <div style={{ width:"1px", height:"24px", background: C.l3 }} />

            {/* View toggle */}
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border:`1px solid ${C.l3}` }}>
              <button onClick={() => setViewMode("list")} className="p-2 transition-all"
                style={viewMode === "list" ? { background: C.lt1, color: C.l0 } : { background: C.l0, color: C.lt3 }}>
                <List size={14} />
              </button>
              <button onClick={() => setViewMode("card")} className="p-2 transition-all"
                style={viewMode === "card" ? { background: C.lt1, color: C.l0 } : { background: C.l0, color: C.lt3 }}>
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={showFilters
                ? { background: C.lt1, color: C.l0, border:`1px solid ${C.lt1}` }
                : { background: C.l0, color: C.lt2, border:`1px solid ${C.l3}` }}>
              <SlidersHorizontal size={13} /> 필터
              {showFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.em }} />}
            </button>
          </div>

          {/* Extended filter panel */}
          {showFilters && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 mt-3"
              style={{ borderTop:`1px solid ${C.l2}` }}>
              {[
                { label:"지역", options:["전체","서울","경기","부산","대구","인천"] },
                { label:"금액범위", options:["전체","1억 미만","1~5억","5~10억","10억 이상"] },
                { label:"경매단계", options:["전체","공고중","관심표명","NDA체결","실사진행"] },
                { label:"AI등급", options:["전체","A","B","C","D","E"] },
              ].map(({ label, options }) => (
                <select key={label}
                  className="px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all"
                  style={{ border:`1px solid ${C.l3}`, background: C.l0, color: C.lt1 }}
                  defaultValue="전체">
                  <option value="전체">{label}: 전체</option>
                  {options.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT (LIGHT)
      ══════════════════════════════════════════════════════ */}
      <main style={{ maxWidth:"1440px", margin:"0 auto", padding:"1.5rem" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

          {/* ── LEFT: listing grid / table ── */}
          <div>
            {/* Result meta row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: C.lt1 }}>
                  {tabMode === "npl" ? filtered.length : filteredRe.length}건
                </span>
                <span className="text-sm" style={{ color: C.lt3 }}>검색됨</span>
                {(activeChip !== "전체" || searchQuery) && (
                  <button onClick={() => { setActiveChip("전체"); setSearchQuery(""); setPage(1) }}
                    className="text-xs px-2 py-0.5 rounded-lg font-medium"
                    style={{ background:"rgba(244,63,94,0.08)", color: C.rose, border:"1px solid rgba(244,63,94,0.2)" }}>
                    필터 초기화 ×
                  </button>
                )}
              </div>
              <select className="text-xs rounded-xl px-3 py-2 outline-none font-medium"
                style={{ border:`1px solid ${C.l3}`, background: C.l0, color: C.lt1 }}>
                <option>최신순</option>
                <option>원금 높은순</option>
                <option>마감임박순</option>
                <option>수익률 높은순</option>
              </select>
            </div>

            {tabMode === "realestate" ? (
              /* ─ 부동산 카드 그리드 ─ */
              <>
                {filteredRe.length === 0 ? (
                  <div className="flex flex-col items-center py-24 text-center">
                    <Home size={40} style={{ color: C.lt4 }} />
                    <p className="mt-3 text-sm" style={{ color: C.lt3 }}>검색 결과가 없습니다</p>
                    <button onClick={() => { setReSearchQuery(""); setReTypeChip("전체"); setReDealChip("전체") }}
                      className="mt-3 text-xs font-semibold" style={{ color: C.em }}>필터 초기화</button>
                  </div>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rePaginated.map(l => <ReCard key={l.id} l={l} />)}
                  </motion.div>
                )}
                {reTotalPages > 1 && <Pagination page={rePage} total={reTotalPages} onPage={setRePage} />}
              </>

            ) : viewMode === "card" ? (
              /* ─ NPL 카드 그리드 ─ */
              <>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-24 text-center">
                    <Search size={40} style={{ color: C.lt4 }} />
                    <p className="mt-3 text-sm" style={{ color: C.lt3 }}>검색 결과가 없습니다</p>
                  </div>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginated.map(l => <NplCard key={l.id} listing={l} watchlist={watchlist} onToggle={toggleWatch} />)}
                  </motion.div>
                )}
                {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
              </>

            ) : (
              /* ─ Bloomberg 테이블 뷰 ─ */
              <div className="rounded-2xl overflow-hidden" style={{ background: C.l0, border:`1px solid ${C.l3}`, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: C.l1, borderBottom:`1px solid ${C.l2}` }}>
                        {TABLE_COLS.map(col => (
                          <th key={col.label}
                            onClick={() => col.sortable && col.key && handleSort(col.key as keyof Listing)}
                            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap select-none transition-colors ${col.right ? "text-right" : "text-left"} ${col.sortable ? "cursor-pointer" : ""}`}
                            style={{ color: C.lt3 }}
                            onMouseEnter={e => { if (col.sortable) (e.currentTarget as HTMLElement).style.color = C.lt1 }}
                            onMouseLeave={e => { if (col.sortable) (e.currentTarget as HTMLElement).style.color = C.lt3 }}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              {col.sortable && col.key && (
                                sortKey === col.key
                                  ? (sortDir === "asc" ? <ChevronUp size={11} style={{ color: C.blue }} /> : <ChevronDown size={11} style={{ color: C.blue }} />)
                                  : <ChevronsUpDown size={11} style={{ opacity:0.3 }} />
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(sortKey ? [...paginated].sort((a, b) => {
                        const va = (a as unknown as Record<string, unknown>)[sortKey]
                        const vb = (b as unknown as Record<string, unknown>)[sortKey]
                        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va ?? "").localeCompare(String(vb ?? ""))
                        return sortDir === "asc" ? cmp : -cmp
                      }) : paginated).map(l => {
                        const risk = RISK_CONFIG[l.risk_grade] ?? RISK_CONFIG["C"]
                        const daysLeft = getDaysLeft(l.deadline)
                        const deadlineLabel = daysLeft < 0 ? "마감" : daysLeft === 0 ? "오늘" : `D-${daysLeft}`
                        const deadlineColor = daysLeft < 0 ? C.lt4 : daysLeft <= 3 ? C.rose : daysLeft <= 7 ? C.amber : C.lt1
                        return (
                          <tr key={l.id} className="group transition-colors"
                            style={{ borderBottom:`1px solid ${C.l2}` }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.l1 }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black"
                                style={{ background: risk.bg, color: risk.color, border:`1px solid ${risk.border}` }}>
                                {l.risk_grade}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold" style={{ color: C.lt1 }}>{l.institution_name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: C.l2, color: C.lt2 }}>{l.collateral_type}</span>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: C.lt2 }}>{l.location_city} {l.location_district}</td>
                            <td className="px-4 py-3 text-right font-black text-xs tabular-nums" style={{ color: C.lt1 }}>{formatKRW(l.principal)}</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums"
                              style={{ color: (l.ltv ?? 0) > 75 ? C.rose : (l.ltv ?? 0) > 60 ? C.amber : C.em }}>
                              {l.ltv != null ? `${l.ltv}%` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: C.lt3 }}>{l.interest_count}명</td>
                            <td className="px-4 py-3 text-right text-xs font-bold tabular-nums" style={{ color: deadlineColor }}>{deadlineLabel}</td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/exchange/${l.id}`}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: C.blue }}>
                                상세 <ExternalLink size={10} />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="space-y-4">

            {/* AI 시장 인사이트 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: C.bg2, border:"1px solid rgba(255,255,255,0.06)" }}>
              {/* Dark header */}
              <div className="px-4 pt-4 pb-3" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Brain size={12} style={{ color: C.purple }} />
                  <span className="text-[10px] font-bold" style={{ color: C.purple, letterSpacing:"0.08em" }}>AI 시장 인사이트</span>
                </div>
                <h3 className="text-sm font-bold" style={{ color:"rgba(255,255,255,0.9)" }}>현재 시장 동향</h3>
              </div>
              {/* Light body */}
              <div className="p-4" style={{ background: C.l0 }}>
                <ul className="space-y-3">
                  {[
                    { icon:"↑", color: C.em, text:"강남권 NPL 낙찰가율 전주 대비 +2.1%p 상승" },
                    { icon:"→", color: C.amber, text:"상가 물건 공급 증가, 경쟁 심화 예상" },
                    { icon:"↓", color: C.blue, text:"LTV 60% 이하 우량 물건 수요 집중" },
                    { icon:"●", color: C.lt3, text:"4월 경매 일정 집중 — 빠른 의사결정 권장" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-xs font-black mt-0.5 flex-shrink-0 w-4 text-center" style={{ color: item.color }}>{item.icon}</span>
                      <span className="text-xs leading-relaxed" style={{ color: C.lt2 }}>{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/analysis/npl-index"
                  className="flex items-center gap-1 mt-4 text-xs font-semibold"
                  style={{ color: C.blue }}>
                  NPL 가격지수 보기 <ArrowRight size={11} />
                </Link>
              </div>
            </div>

            {/* 인기 지역 Top 5 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: C.l0, border:`1px solid ${C.l3}`, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="px-4 py-3" style={{ borderBottom:`1px solid ${C.l2}`, background: C.l1 }}>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={12} style={{ color: C.em }} />
                  <span className="text-xs font-bold" style={{ color: C.lt2 }}>인기 지역 Top 5</span>
                </div>
              </div>
              <div className="p-4">
                <ol className="space-y-3">
                  {POPULAR_REGIONS.map(r => (
                    <li key={r.rank} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={r.rank === 1
                          ? { background: C.lt1, color: C.l0 }
                          : { background: C.l2, color: C.lt3 }}>
                        {r.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="h-1 rounded-full mb-1.5" style={{ background: C.l2 }}>
                          <div className="h-full rounded-full" style={{ width:`${(r.count / 412) * 100}%`, background: r.rank === 1 ? `linear-gradient(90deg, ${C.em}, ${C.emL})` : `${C.blue}70` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: C.lt1 }}>{r.name}</span>
                          <span className="text-[10px]" style={{ color: C.lt4 }}>{r.count}건</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold flex-shrink-0"
                        style={{ color: r.change.startsWith("+") ? C.em : C.rose }}>
                        {r.change}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* 최근 낙찰 현황 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: C.l0, border:`1px solid ${C.l3}`, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="px-4 py-3" style={{ borderBottom:`1px solid ${C.l2}`, background: C.l1 }}>
                <div className="flex items-center gap-1.5">
                  <Gavel size={12} style={{ color: C.amber }} />
                  <span className="text-xs font-bold" style={{ color: C.lt2 }}>최근 낙찰 현황</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {RECENT_BIDS.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: i < RECENT_BIDS.length - 1 ? `1px solid ${C.l2}` : "none" }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: C.lt1 }}>{b.property}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: C.lt4 }}>{b.date}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Spark color={b.bid_rate >= 80 ? C.em : b.bid_rate >= 70 ? C.amber : C.rose} />
                      <span className="text-xs font-black tabular-nums"
                        style={{ color: b.bid_rate >= 80 ? C.em : b.bid_rate >= 70 ? C.amber : C.rose }}>
                        {b.bid_rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════════════════════ */
function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (n: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all"
        style={{ border:`1px solid ${C.l3}`, background: C.l0, color: C.lt2 }}>이전</button>
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onPage(n)}
          className="w-8 h-8 rounded-xl text-xs font-semibold transition-all"
          style={n === page
            ? { background: C.lt1, color: C.l0, border:`1px solid ${C.lt1}` }
            : { border:`1px solid ${C.l3}`, background: C.l0, color: C.lt2 }}>
          {n}
        </button>
      ))}
      <button onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all"
        style={{ border:`1px solid ${C.l3}`, background: C.l0, color: C.lt2 }}>다음</button>
    </div>
  )
}
