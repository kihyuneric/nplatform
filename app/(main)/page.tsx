"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Brain, ArrowRight, ChevronRight, Search, Map, Gavel,
  Shield, Building2, TrendingUp, CheckCircle2, Sparkles,
  Lock, Star, MessageSquare, Zap, Activity, DollarSign,
  Layers, RefreshCw, ArrowUpRight, Cpu, Globe,
  Play, ChevronUp,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════════════ */
const C = {
  bg0: "#030810",   // deepest
  bg1: "#050D1A",   // hero bg
  bg2: "#080F1E",   // section dark
  bg3: "#0A1628",   // card dark
  bg4: "#0F1F35",   // elevated card
  light0: "#FFFFFF",
  light1: "#F8FAFC",
  light2: "#F1F5F9",
  em: "#10B981",    // emerald
  emL: "#34D399",
  blue: "#3B82F6",
  amber: "#F59E0B",
  purple: "#A855F7",
  rose: "#F43F5E",
  teal: "#14B8A6",
};

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
═══════════════════════════════════════════════════════════════════════════ */
const up = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeIn = { hidden: { opacity: 0 }, visible: (i = 0) => ({ opacity: 1, transition: { delay: i * 0.05, duration: 0.4 } }) };

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════════════════════════════════════ */
function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const dur = 2000, start = Date.now();
    const id = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref} className="tabular-nums">{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE TICKER
═══════════════════════════════════════════════════════════════════════════ */
const TICKS = [
  { t: "거래완료", v: "3,847건", c: C.em, icon: "✓" },
  { t: "총 거래액", v: "₩2,847억", c: C.blue, icon: "₩" },
  { t: "AI 분석", v: "28,391건", c: C.purple, icon: "⚡" },
  { t: "등록 매물", v: "1,234건", c: C.amber, icon: "◉" },
  { t: "협력 금융기관", v: "47개사", c: C.em, icon: "🏦" },
  { t: "평균 수익률", v: "18.4%↑", c: C.rose, icon: "%" },
  { t: "거래완료", v: "3,847건", c: C.em, icon: "✓" },
  { t: "총 거래액", v: "₩2,847억", c: C.blue, icon: "₩" },
  { t: "AI 분석", v: "28,391건", c: C.purple, icon: "⚡" },
  { t: "등록 매물", v: "1,234건", c: C.amber, icon: "◉" },
];
function LiveTicker() {
  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: '#F0F4F8', borderTop: '1px solid #DDE3EC' }}>
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10" style={{ background: 'linear-gradient(to right, #F0F4F8, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10" style={{ background: 'linear-gradient(to left, #F0F4F8, transparent)' }} />
      <motion.div
        className="flex gap-10 whitespace-nowrap py-2.5"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {TICKS.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.c }} />
            <span className="text-[11px] font-medium" style={{ color: '#64748B', letterSpacing: '0.06em' }}>{t.t}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: '#1E293B' }}>{t.v}</span>
            <span style={{ color: '#CBD5E1' }}>|</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEAL CARD MOCKUP  (Bloomberg-style)
═══════════════════════════════════════════════════════════════════════════ */
function DealCard() {
  const [tab, setTab] = useState(0);
  return (
    <motion.div
      animate={{ y: [-6, 6, -6] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-full max-w-[360px] mx-auto select-none"
    >
      {/* Ambient glow layers */}
      <div className="absolute -inset-8 rounded-3xl blur-3xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
      <div className="absolute -inset-4 rounded-2xl blur-2xl" style={{ background: 'rgba(59,130,246,0.04)' }} />

      <div className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(15,31,53,0.9)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
        {/* Top gradient line */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), rgba(59,130,246,0.4), transparent)' }} />

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.em }} />
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>NPL #2024-A-0847</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="text-xs font-black" style={{ color: C.em }}>A+</span>
            <span className="text-[9px] font-medium" style={{ color: 'rgba(16,185,129,0.7)' }}>등급</span>
          </div>
        </div>

        <div className="p-4">
          {/* Property info */}
          <div className="mb-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>서울특별시 강남구 역삼동</div>
            <div className="text-base font-bold leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>역삼 래미안 아파트 101동 1502호</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(59,130,246,0.12)', color: C.blue, border: '1px solid rgba(59,130,246,0.2)' }}>아파트</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: C.amber, border: '1px solid rgba(245,158,11,0.2)' }}>2순위 담보</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: C.emL, border: '1px solid rgba(16,185,129,0.2)' }}>저위험</span>
            </div>
          </div>

          {/* Key metrics - Bloomberg style */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "감정가", val: "12.4억", sub: "기준일 2024.11", color: 'rgba(255,255,255,0.75)' },
              { label: "최저 입찰가", val: "9.1억", sub: "낙찰가율 73.4%", color: C.blue },
              { label: "예상 수익률", val: "+18.4%", sub: "AI 시뮬레이션", color: C.em },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[9px] mb-1 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.label}</div>
                <div className="text-sm font-black tabular-nums" style={{ color: m.color }}>{m.val}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg mb-3 p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {["AI 분석", "권리관계", "입찰 현황"].map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className="flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all"
                style={tab === i ? { background: C.bg4, color: 'rgba(255,255,255,0.85)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } : { color: 'rgba(255,255,255,0.3)' }}
              >{t}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 0 && (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Brain size={11} style={{ color: C.em }} />
                      <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>AI 리스크 스코어</span>
                    </div>
                    <span className="text-[11px] font-black" style={{ color: C.em }}>낮음 · 78/100</span>
                  </div>
                  <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.em}, ${C.emL})` }}
                      initial={{ width: 0 }} animate={{ width: "78%" }} transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }} />
                  </div>
                  <div className="flex gap-2">
                    {[{ l: "담보 충분", ok: true }, { l: "권리 복잡도 낮음", ok: true }, { l: "경매 이력 없음", ok: true }].map(i => (
                      <div key={i.l} className="flex items-center gap-1">
                        <CheckCircle2 size={9} style={{ color: C.em }} />
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{i.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {tab === 1 && (
              <motion.div key="rights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}>
                  {[["1순위", "KB국민은행 근저당", "3.2억", true], ["2순위", "우리은행 근저당", "9.1억", false], ["3순위", "가압류", "없음", true]].map(([r, desc, amt, ok]) => (
                    <div key={String(r)} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] w-8 font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{r}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{desc}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: ok ? C.em : C.blue }}>{amt}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {tab === 2 && (
              <motion.div key="bid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>현재 입찰 현황</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.rose }} />
                      <span className="text-[10px] font-bold" style={{ color: C.rose }}>D-3 마감임박</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-1.5">
                      {["KB", "신한", "현대", "개인", "기타", "+2"].map((b, i) => (
                        <div key={b} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                          style={{ background: C.bg4, border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', zIndex: 6 - i }}>
                          {b}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>입찰자 <strong style={{ color: 'rgba(255,255,255,0.8)' }}>7명</strong></span>
                  </div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>최고 입찰가: <span style={{ color: C.amber }} className="font-bold">9.87억</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="py-2.5 rounded-xl text-center cursor-pointer font-bold text-xs transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', boxShadow: `0 4px 12px rgba(16,185,129,0.25)` }}>
              입찰 참여하기
            </div>
            <div className="py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              딜룸 입장
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div className="absolute -top-4 -right-4 rounded-xl px-3 py-2 shadow-xl"
        animate={{ rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: C.bg4, border: `1px solid rgba(16,185,129,0.3)`, boxShadow: `0 0 20px rgba(16,185,129,0.15)` }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={10} style={{ color: C.em }} />
          <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>AI 분석 완료</span>
        </div>
      </motion.div>

      <motion.div className="absolute -bottom-4 -left-4 rounded-xl px-3 py-2"
        animate={{ y: [0, -4, 0] }} transition={{ duration: 3.5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-1.5">
          <Activity size={10} style={{ color: C.amber }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>입찰자 <strong>7명</strong> 실시간</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI SEARCH BAR
═══════════════════════════════════════════════════════════════════════════ */
const SUGGESTIONS = [
  "서울 강남 아파트 NPL 5억 이하 저위험",
  "수익률 20% 이상 상업용 물건 검색",
  "저축은행 연체 6개월 이상 담보 A등급",
  "경매 2순위 담보 서울·경기 지역",
];
function AISearch() {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setIdx(p => (p + 1) % SUGGESTIONS.length), 3200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Brain size={11} style={{ color: C.em }} />
          <span className="text-[11px] font-bold" style={{ color: C.em, letterSpacing: '0.05em' }}>AI 자연어 검색</span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>원하는 물건을 자유롭게 설명하세요</span>
      </div>

      <div className="relative flex items-center rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          border: focused ? `1px solid rgba(16,185,129,0.5)` : '1px solid rgba(255,255,255,0.08)',
          boxShadow: focused ? `0 0 0 3px rgba(16,185,129,0.08), 0 8px 24px rgba(0,0,0,0.3)` : 'none',
        }}>
        <Search size={15} className="ml-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={!focused ? SUGGESTIONS[idx] : "검색어를 입력하세요..."}
          className="flex-1 bg-transparent text-sm outline-none px-3 py-3.5"
          style={{ color: 'rgba(255,255,255,0.85)', caretColor: C.em }}
          aria-label="NPL 검색"
        />
        <div className="flex items-center gap-1.5 mx-2 px-2.5 py-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Sparkles size={10} style={{ color: C.em }} />
          <span className="text-[10px] font-black" style={{ color: C.em }}>AI</span>
        </div>
        <Link href={`/exchange${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className="text-sm font-bold px-5 py-3.5 flex-shrink-0 transition-all"
          style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white' }}>
          검색
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mt-2.5">
        {["서울 아파트", "수익률 20%+", "1억 이하", "A등급 저위험"].map(tag => (
          <button key={tag} onClick={() => setQ(tag)}
            className="text-[11px] rounded-full px-3 py-1 transition-all"
            style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >{tag}</button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MICRO CHART (Bloomberg-style mini sparkline)
═══════════════════════════════════════════════════════════════════════════ */
function Sparkline({ color = C.em }: { color?: string }) {
  const pts = [30, 45, 38, 52, 48, 61, 55, 70, 65, 78, 72, 85];
  const max = Math.max(...pts), min = Math.min(...pts);
  const norm = (v: number) => 100 - ((v - min) / (max - min)) * 80 - 10;
  const w = 100 / (pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * w} ${norm(v)}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L 100 100 L 0 100 Z`} fill={color} opacity="0.08" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {

  const stats = [
    { label: "등록 매물", val: 1234, suffix: "건", icon: <Layers size={16} style={{ color: C.em }} />, change: "+12%", up: true, color: C.em },
    { label: "협력 금융기관", val: 47, suffix: "개사", icon: <Building2 size={16} style={{ color: C.blue }} />, change: "+4개사", up: true, color: C.blue },
    { label: "누적 거래액", val: 2847, suffix: "억", icon: <DollarSign size={16} style={{ color: C.amber }} />, change: "+24%", up: true, color: C.amber },
    { label: "AI 분석 건수", val: 28391, suffix: "건", icon: <Brain size={16} style={{ color: C.purple }} />, change: "실시간", up: true, color: C.purple },
  ];

  const features = [
    { icon: <Search size={20} style={{ color: C.em }} />, tag: "LIVE", tagColor: C.em, title: "NPL 통합 검색", desc: "전국 매물 30+ 조건 정밀 필터링. 면적, 감정가, 수익률, 지역을 복합 검색.", href: "/exchange", accent: C.em },
    { icon: <Brain size={20} style={{ color: C.purple }} />, tag: "AI", tagColor: C.purple, title: "AI 분석 엔진", desc: "법원 경매 이력, 권리 분석, 수익률 시뮬레이션을 AI가 30초 내 자동 생성.", href: "/analysis", accent: C.purple },
    { icon: <Map size={20} style={{ color: C.blue }} />, tag: "MAP", tagColor: C.blue, title: "NPL 지도", desc: "카카오맵 기반 매물 위치 시각화. 지역별 밀집도, 시세 히트맵으로 투자 지역 파악.", href: "/exchange/map", accent: C.blue },
    { icon: <Gavel size={20} style={{ color: C.amber }} />, tag: "LIVE", tagColor: C.amber, title: "NPL 입찰 장터", desc: "실시간 경쟁 입찰. 자동 입찰 에이전트 설정으로 원하는 조건의 매물을 놓치지 마세요.", href: "/exchange/auction", accent: C.amber },
    { icon: <MessageSquare size={20} style={{ color: C.teal }} />, tag: "SECURE", tagColor: C.teal, title: "딜룸", desc: "매각자-투자자 간 보안 채널. NDA 서명, 문서 공유, 협상, 계약서 생성까지 원스톱 처리.", href: "/deals", accent: C.teal },
    { icon: <Sparkles size={20} style={{ color: C.rose }} />, tag: "GPT-4", tagColor: C.rose, title: "AI Copilot", desc: "자연어로 물어보세요. '강남구 아파트 NPL 중 수익률 15% 이상인 것' 처럼 대화하듯 검색.", href: "/analysis/copilot", accent: C.rose },
  ];

  const steps = [
    { n: "01", t: "매물 등록", d: "금융기관이 NPL 정보를 플랫폼에 업로드", icon: <Layers size={16} /> },
    { n: "02", t: "검색 · 분석", d: "AI가 자동으로 리스크 등급과 수익률 분석", icon: <Search size={16} /> },
    { n: "03", t: "입찰 참여", d: "온라인 경쟁 입찰 또는 직접 협상 진행", icon: <Gavel size={16} /> },
    { n: "04", t: "딜룸 협상", d: "보안 채널에서 조건 협의 및 문서 교환", icon: <MessageSquare size={16} /> },
    { n: "05", t: "전자계약", d: "전자계약서 생성으로 거래를 최종 완결", icon: <CheckCircle2 size={16} /> },
  ];

  return (
    <div style={{ backgroundColor: C.bg1, color: 'white', fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", minHeight: '100vh' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.bg0, minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* Mesh background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* Top line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          {/* Emerald orb */}
          <div style={{ position: 'absolute', top: '15%', left: '20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
          {/* Blue orb */}
          <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
          {/* Purple orb */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(168,85,247,0.03) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)' }} />
          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.022,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '3rem 2rem 2rem', display: 'flex', alignItems: 'center' }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center w-full">

            {/* Left */}
            <motion.div variants={stagger} initial="hidden" animate="visible">

              {/* Eyebrow badge */}
              <motion.div variants={up} custom={0} className="mb-6">
                <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-2"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.em }} />
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.06em' }}>국내 유일 NPL 전문 플랫폼</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <span className="text-xs font-black" style={{ color: C.em }}>LIVE</span>
                </div>
              </motion.div>

              {/* H1 */}
              <motion.h1 variants={up} custom={1}
                className="font-black leading-[1.08] tracking-tighter mb-5"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: 'rgba(255,255,255,0.95)' }}
              >
                AI가 분석하는<br />
                <span style={{
                  background: `linear-gradient(135deg, ${C.em} 0%, ${C.emL} 40%, #6EE7B7 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>NPL 거래</span>의<br />
                새로운 기준
              </motion.h1>

              {/* Sub */}
              <motion.p variants={up} custom={2} className="text-base leading-relaxed mb-7"
                style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '420px' }}>
                금융기관 × 투자자 직거래.{" "}
                <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>검색부터 입찰, 딜룸, 전자계약까지</span>{" "}
                모든 NPL 거래 프로세스를 하나의 플랫폼에서 완결하세요.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/my"
                  className="group inline-flex items-center justify-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', padding: '14px 28px', boxShadow: `0 4px 20px rgba(16,185,129,0.3)` }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  무료로 시작하기
                  <ArrowRight size={15} />
                </Link>
                <Link href="/analysis"
                  className="group inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', padding: '14px 28px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Play size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  데모 보기
                </Link>
              </motion.div>

              {/* AI Search */}
              <motion.div variants={up} custom={4} className="mb-8">
                <AISearch />
              </motion.div>

            </motion.div>

            {/* Right: card */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex justify-center"
            >
              <DealCard />
            </motion.div>
          </div>
        </div>

        {/* Live Ticker */}
        <LiveTicker />
      </section>

      {/* ══ STATS BAR ══════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.bg2, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '2.5rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} variants={up} custom={i}
                className="relative rounded-2xl p-5 overflow-hidden group transition-all duration-300"
                style={{ background: C.bg3, border: '1px solid rgba(255,255,255,0.07)', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = `rgba(${s.color === C.em ? '16,185,129' : s.color === C.blue ? '59,130,246' : s.color === C.amber ? '245,158,11' : '168,85,247'},0.3)`); (e.currentTarget.style.transform = 'translateY(-2px)'); }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'); (e.currentTarget.style.transform = 'translateY(0)'); }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>{s.icon}</div>
                  <div className="flex items-center gap-1">
                    <ChevronUp size={11} style={{ color: C.em }} />
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.change}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black tabular-nums leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <Counter target={s.val} suffix={s.suffix} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                  </div>
                  <Sparkline color={s.color} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══ WHY NPLATFORM ══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.light1, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Sparkles size={12} style={{ color: '#059669' }} />
              <span className="text-xs font-bold" style={{ color: '#059669', letterSpacing: '0.06em' }}>왜 NPLATFORM인가</span>
            </div>
            <h2 className="font-black tracking-tighter mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0A1628' }}>
              NPL 거래, 이제 다르게
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#64748B' }}>
              기존 NPL 거래의 불투명성, 높은 진입장벽, 복잡한 프로세스를 AI로 해결합니다.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Brain size={24} style={{ color: C.em }} />, tag: "GPT-4 기반", tagBg: 'rgba(16,185,129,0.08)', tagColor: '#059669', tagBorder: 'rgba(16,185,129,0.2)', title: "AI 자동 분석", desc: "법원 경매 데이터, 시세, 권리관계를 AI가 실시간으로 분석. 리스크 등급과 예상 수익률을 30초 내 자동 산출합니다.", iconBg: 'rgba(16,185,129,0.06)', borderHover: '#10B981' },
              { icon: <Building2 size={24} style={{ color: C.blue }} />, tag: "47개 기관", tagBg: 'rgba(59,130,246,0.08)', tagColor: '#2563EB', tagBorder: 'rgba(59,130,246,0.2)', title: "금융기관 직거래", desc: "은행, 저축은행, 캐피탈 47개사와 직접 연결. 중개 없이 매각자와 투자자가 1:1로 거래합니다.", iconBg: 'rgba(59,130,246,0.06)', borderHover: '#3B82F6' },
              { icon: <CheckCircle2 size={24} style={{ color: C.purple }} />, tag: "Full-cycle", tagBg: 'rgba(168,85,247,0.08)', tagColor: '#9333EA', tagBorder: 'rgba(168,85,247,0.2)', title: "원스톱 딜클로징", desc: "검색부터 입찰, 딜룸, 계약서 생성까지 모든 거래 프로세스를 하나의 플랫폼에서 완결합니다.", iconBg: 'rgba(168,85,247,0.06)', borderHover: '#A855F7' },
            ].map((r, i) => (
              <motion.div key={r.title} variants={up} custom={i}
                className="rounded-2xl p-7 transition-all duration-300"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                onMouseEnter={e => { (e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.08), 0 0 0 1px ${r.borderHover}22`); (e.currentTarget.style.transform = 'translateY(-4px)'); (e.currentTarget.style.borderColor = `${r.borderHover}44`); }}
                onMouseLeave={e => { (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'); (e.currentTarget.style.transform = 'translateY(0)'); (e.currentTarget.style.borderColor = '#E2E8F0'); }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: r.iconBg }}>{r.icon}</div>
                <div className="inline-flex items-center text-[10px] font-bold rounded-full px-2.5 py-1 mb-3" style={{ background: r.tagBg, color: r.tagColor, border: `1px solid ${r.tagBorder}` }}>{r.tag}</div>
                <h3 className="font-bold text-lg mb-2.5" style={{ color: '#0A1628' }}>{r.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{r.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.bg2, padding: '6rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }} />
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Cpu size={12} style={{ color: C.blue }} />
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>핵심 기능</span>
            </div>
            <h2 className="font-black tracking-tighter mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'rgba(255,255,255,0.95)' }}>
              모든 것이 하나에
            </h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '480px', margin: '0 auto' }}>
              NPL 거래에 필요한 모든 도구를 NPLatform 하나로.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={up} custom={i}>
                <Link href={f.href}
                  className="relative flex flex-col rounded-2xl p-6 group block transition-all duration-300 overflow-hidden"
                  style={{ background: C.bg3, border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = C.bg4); (e.currentTarget.style.borderColor = `${f.accent}30`); (e.currentTarget.style.transform = 'translateY(-3px)'); (e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px ${f.accent}20`); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = C.bg3); (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'); (e.currentTarget.style.transform = 'translateY(0)'); (e.currentTarget.style.boxShadow = 'none'); }}
                >
                  {/* Top gradient border on hover – static */}
                  <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.accent}60, transparent)` }} />

                  <div className="flex items-start justify-between mb-5">
                    <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>{f.icon}</div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: f.accent, color: 'white' }}>{f.tag}</span>
                  </div>
                  <h3 className="font-bold text-sm mb-2 transition-colors" style={{ color: 'rgba(255,255,255,0.9)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    자세히 보기 <ArrowUpRight size={12} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══ USER TYPES ══════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.light1, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              <TrendingUp size={12} style={{ color: '#64748B' }} />
              <span className="text-xs font-bold" style={{ color: '#64748B', letterSpacing: '0.06em' }}>누구를 위한 플랫폼인가</span>
            </div>
            <h2 className="font-black tracking-tighter" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0A1628' }}>
              매각자와 투자자 모두를 위한
            </h2>
          </motion.div>

          <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6">
            {/* Seller – dark premium */}
            <motion.div variants={up} custom={0}
              className="relative rounded-2xl p-8 overflow-hidden"
              style={{ background: `linear-gradient(135deg, #0A1628 0%, #0F2040 100%)`, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, rgba(16,185,129,0.3), transparent)' }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Building2 size={22} style={{ color: C.em }} />
                </div>
                <div className="inline-flex text-[10px] font-bold rounded-full px-3 py-1 mb-4"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
                  매각사 · 금융기관
                </div>
                <h3 className="font-black text-2xl mb-3" style={{ color: 'rgba(255,255,255,0.95)' }}>금융기관 (매각사)</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  NPL 매물을 디지털로 등록하고 전국 검증된 투자자에게 노출하세요. AI 가격 산정, 입찰 관리, 딜룸 협상까지 자동화합니다.
                </p>
                <ul className="space-y-2.5 mb-7">
                  {["매물 일괄 등록 및 관리", "실시간 입찰 모니터링", "AI 가격 자동 산정", "딜룸 문서 관리", "전자계약 원스톱"].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <CheckCircle2 size={13} style={{ color: C.em, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
                <Link href="/my"
                  className="inline-flex items-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', padding: '12px 24px', boxShadow: `0 4px 16px rgba(16,185,129,0.25)` }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  금융기관으로 시작하기 <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>

            {/* Investor – clean light */}
            <motion.div variants={up} custom={1}
              className="relative rounded-2xl p-8 overflow-hidden transition-shadow"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)')}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)', borderRadius: '50%' }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                  <TrendingUp size={22} style={{ color: C.blue }} />
                </div>
                <div className="inline-flex text-[10px] font-bold rounded-full px-3 py-1 mb-4"
                  style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569', letterSpacing: '0.05em' }}>
                  기관 · 개인 투자자
                </div>
                <h3 className="font-black text-2xl mb-3" style={{ color: '#0A1628' }}>기관 / 개인 투자자</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#64748B' }}>
                  전국 NPL 매물을 AI 분석으로 평가하고 수익률을 시뮬레이션하세요. 검증된 매물만, 직거래로 더 높은 수익을 실현합니다.
                </p>
                <ul className="space-y-2.5 mb-7">
                  {["30+ 조건 통합 검색", "AI 리스크 등급 분석", "수익률 시뮬레이션", "실시간 경쟁 입찰", "AI Copilot 상담"].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#475569' }}>
                      <CheckCircle2 size={13} style={{ color: C.blue, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
                <Link href="/my"
                  className="inline-flex items-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: '#0A1628', color: 'white', padding: '12px 24px' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = '#0F2040'); (e.currentTarget.style.transform = 'translateY(-1px)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = '#0A1628'); (e.currentTarget.style.transform = 'translateY(0)'); }}
                >
                  투자자로 시작하기 <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      {/* ══ PROCESS ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.bg2, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <RefreshCw size={12} style={{ color: C.amber }} />
              <span className="text-xs font-bold" style={{ color: C.amber, letterSpacing: '0.06em' }}>거래 프로세스</span>
            </div>
            <h2 className="font-black tracking-tighter mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'rgba(255,255,255,0.95)' }}>
              5단계로 완결되는 거래
            </h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '480px', margin: '0 auto' }}>
              복잡한 NPL 거래를 단순하고 투명하게. 각 단계마다 AI가 함께합니다.
            </p>
          </motion.div>

          {/* Desktop */}
          <motion.div variants={stagger} className="hidden lg:grid grid-cols-5 gap-4 relative">
            <div style={{ position: 'absolute', top: '28px', left: '10%', right: '10%', height: '1px', background: `linear-gradient(90deg, ${C.em}30, ${C.blue}30, ${C.em}30)` }} />
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={up} custom={i} className="relative z-10 flex flex-col items-center text-center px-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${C.bg4}, ${C.bg3})`, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                  {s.icon}
                </div>
                <div className="text-[10px] font-black mb-1" style={{ color: C.em, letterSpacing: '0.08em' }}>{s.n}</div>
                <div className="text-sm font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{s.t}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.d}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Mobile */}
          <motion.div variants={stagger} className="lg:hidden space-y-3">
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={up} custom={i}
                className="flex gap-4 rounded-2xl p-4"
                style={{ background: C.bg3, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                  style={{ background: C.bg4, border: '1px solid rgba(255,255,255,0.08)' }}>{s.icon}</div>
                <div>
                  <div className="text-[10px] font-black mb-0.5" style={{ color: C.em }}>{s.n}</div>
                  <div className="text-sm font-bold mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{s.t}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.d}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══ TRUST ════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.light0, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Star size={12} style={{ color: C.amber }} />
              <span className="text-xs font-bold" style={{ color: '#B45309', letterSpacing: '0.06em' }}>협력 금융기관</span>
            </div>
            <h2 className="font-black tracking-tighter mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0A1628' }}>
              47개 금융기관이 신뢰하는 플랫폼
            </h2>
            <p className="text-base" style={{ color: '#64748B', maxWidth: '480px', margin: '0 auto' }}>
              국내 주요 은행, 저축은행, 캐피탈사와 파트너십을 맺고 있습니다.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-10">
            {["KB국민은행","신한은행","우리은행","하나은행","농협은행","기업은행","국민저축은행","OK저축은행","SBI저축은행","웰컴저축은행","현대캐피탈","롯데캐피탈","KB캐피탈","신한캐피탈","하나캐피탈"].map((inst, i) => (
              <motion.div key={inst} variants={fadeIn} custom={i}
                className="rounded-xl py-4 px-2 flex items-center justify-center transition-all"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                onMouseEnter={e => { (e.currentTarget.style.background = '#F1F5F9'); (e.currentTarget.style.borderColor = '#CBD5E1'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = '#F8FAFC'); (e.currentTarget.style.borderColor = '#E2E8F0'); }}
              >
                <span className="text-xs font-semibold text-center leading-snug" style={{ color: '#475569' }}>{inst}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={stagger} className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <Shield size={15} style={{ color: '#1B3A5C' }} />, label: "금융감독원 준수" },
              { icon: <Lock size={15} style={{ color: '#1B3A5C' }} />, label: "AES-256 암호화" },
              { icon: <Star size={15} style={{ color: '#1B3A5C' }} />, label: "ISO 27001 인증" },
              { icon: <Globe size={15} style={{ color: '#1B3A5C' }} />, label: "개인정보보호법 준수" },
            ].map(b => (
              <motion.div key={b.label} variants={fadeIn}
                className="flex items-center gap-2.5 rounded-xl px-5 py-2.5 transition-all"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F8FAFC' }}>{b.icon}</div>
                <span className="text-sm font-semibold" style={{ color: '#374151' }}>{b.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.bg0, padding: '7rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${C.em}50, transparent)` }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translateY(-50%)', width: '350px', height: '350px', background: `radial-gradient(circle, rgba(16,185,129,0.07), transparent 70%)`, borderRadius: '50%', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: '50%', right: '25%', transform: 'translateY(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        </div>

        <Reveal className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div variants={stagger}>
            <motion.div variants={up} custom={0} className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Zap size={12} style={{ color: C.em }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>지금 바로 시작하세요</span>
              </div>
            </motion.div>

            <motion.h2 variants={up} custom={1}
              className="font-black tracking-tighter mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: 'rgba(255,255,255,0.95)' }}
            >
              NPL 투자의{" "}
              <span style={{
                background: `linear-gradient(135deg, ${C.em}, ${C.emL}, #6EE7B7)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>새로운 기준</span>
            </motion.h2>

            <motion.p variants={up} custom={2} className="text-base mb-8"
              style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
              무료로 회원가입하고 1,234건의 매물과 AI 분석을 지금 바로 경험해보세요.<br />
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>신용카드 불필요 · 즉시 이용 가능</span>
            </motion.p>

            <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/my"
                className="inline-flex items-center justify-center gap-2 font-bold text-base rounded-xl transition-all"
                style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', padding: '16px 32px', boxShadow: `0 4px 24px rgba(16,185,129,0.25)` }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                무료로 시작하기 <ArrowRight size={17} />
              </Link>
              <Link href="/guide"
                className="inline-flex items-center justify-center gap-2 font-semibold text-base rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '16px 32px' }}
                onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.10)'); (e.currentTarget.style.transform = 'translateY(-2px)'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.06)'); (e.currentTarget.style.transform = 'translateY(0)'); }}
              >
                NPL 가이드 <ChevronRight size={17} />
              </Link>
            </motion.div>

            <motion.div variants={up} custom={4} className="flex items-center justify-center gap-3"
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
              <div className="flex -space-x-2">
                {["KB", "신한", "우리", "하나", "기업"].map((b, i) => (
                  <div key={b}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
                    style={{ background: C.bg3, border: `2px solid ${C.bg0}`, color: 'rgba(255,255,255,0.5)', fontSize: '8px', zIndex: 5 - i }}>
                    {b}
                  </div>
                ))}
              </div>
              <span><strong style={{ color: 'rgba(255,255,255,0.55)' }}>47개 금융기관</strong>이 이미 사용 중</span>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>
    </div>
  );
}
