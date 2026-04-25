"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Brain, ArrowRight, ChevronRight, Search, Map, Gavel,
  Shield, ShieldCheck, Building2, TrendingUp, TrendingDown, CheckCircle2, Sparkles,
  Lock, Star, MessageSquare, Zap, Activity, DollarSign,
  Layers, RefreshCw, ArrowUpRight, Cpu, Globe, MapPin,
  Play, ChevronUp,
} from "lucide-react";
import { TrustBelt } from "./_landing/trust-belt";
import { AIRecommendations } from "./_landing/ai-recommendations";
import { ExchangePreview } from "./_landing/exchange-preview";
import { DealRoomPreview } from "./_landing/dealroom-preview";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS — NQ 재설계 (2026-04-20)
   ▸ 규칙: "라이트모드에 흰색 글씨 절대 금지"
   ▸ 2축 토큰: HERO(항상 네이비+흰톤 텍스트) / ADAPTIVE(레이어+테마반응 텍스트)
═══════════════════════════════════════════════════════════════════════════ */
const C = {
  /* ── HERO Surface: 마케팅 영역 · 항상 네이비 (브랜드 의도) ── */
  bg0: "var(--hero-bg)",           // #0B1F3A
  bg1: "var(--hero-bg)",           // hero section bg
  bg2: "var(--hero-bg-elevated)",  // #0D2448
  bg3: "var(--hero-bg-elevated)",
  bg4: "var(--hero-bg-soft)",      // #12305B

  /* ── HERO Foreground: 항상 흰톤 ── */
  fgh:  "var(--fg-on-hero)",       // rgba(255,255,255,0.96) 18:1
  fghd: "var(--fg-on-hero-dim)",   // rgba(255,255,255,0.72) 12:1
  fghm: "var(--fg-on-hero-muted)", // rgba(255,255,255,0.55) 7:1

  /* ── ADAPTIVE Layer: 본문 섹션 · 라이트/다크 자동 전환 ── */
  light0: "var(--layer-1-bg)",     // 라이트 #FFFFFF · 다크 #0D1525
  light1: "var(--layer-0-bg)",     // 라이트 #F3F5F8 · 다크 #030810 (페이지 바탕)
  light2: "var(--layer-2-bg)",     // 라이트 #F8FAFC · 다크 #162035

  /* ── ADAPTIVE Foreground: WCAG AA+ 자동 확보 ── */
  fg1:  "var(--fg-strong)",        // 15:1 · 헤딩
  fg2:  "var(--fg-default)",       // 10:1 · 본문
  fg3:  "var(--fg-muted)",         // 5.5:1 · 캡션
  fg4:  "var(--fg-subtle)",        // 3.5:1 · 큰 글자/아이콘만

  /* ── Semantic (브랜드 인텐트 · 테마 반응) ── */
  em: "var(--color-positive)",
  emL: "#34D399",
  blue: "var(--color-brand-bright)",
  amber: "var(--color-warning)",
  purple: "#A855F7",
  rose: "var(--color-danger)",
  teal: "#14B8A6",

  /* ── Brand Intent (테마 무관 고정) ── */
  brandHero: "#0A1628",
  textOnBrand: "#FFFFFF",   // 브랜드 컬러/네이비 배경 위에만 사용 (라이트모드 흰바탕에 절대 X)
  onEmerald: "#FFFFFF",     // emerald 그라데이션 버튼 위
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
   DEAL CARD MOCKUP  — 실제 매물 페이지(exchange) 카드 디자인 반영
═══════════════════════════════════════════════════════════════════════════ */
function DealCard() {
  return (
    <motion.div
      animate={{ y: [-6, 6, -6] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-full max-w-[370px] mx-auto select-none"
    >
      {/* Ambient glow */}
      <div className="absolute -inset-8 rounded-3xl blur-3xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />

      <div className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: C.bg3, border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header strip — institution */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ background: C.bg2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: C.bg1 }}>
              <Building2 size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <div>
              <div className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>우리은행</div>
              <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>금융기관 · D-5</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded font-bold"
              style={{ background: 'rgba(16,185,129,0.12)', color: C.em, border: '1px solid rgba(16,185,129,0.25)' }}>
              L0
            </span>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Title row */}
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="flex items-center gap-1 text-[11px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <MapPin size={10} /> 서울 강남구 · 아파트
              </div>
              <div className="text-[13px] font-extrabold" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>
                임의매각 · 아파트 담보
              </div>
              <div className="text-[9px] mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                npl-2026-0412
              </div>
            </div>
            <div className="shrink-0 px-2 py-1 rounded-md text-[10px] font-extrabold"
              style={{ background: 'rgba(16,185,129,0.12)', color: C.em, border: '1px solid rgba(16,185,129,0.3)' }}>
              AI A
            </div>
          </div>

          {/* Key figures */}
          <div className="rounded-xl p-3" style={{ background: C.bg2, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "채권잔액", value: "12.0억", color: 'rgba(255,255,255,0.75)' },
                { label: "매각희망가", value: "8.5억", color: C.em },
                { label: "감정가", value: "10.2억", color: 'rgba(255,255,255,0.75)' },
                { label: "할인율", value: "29.2%", color: C.em, icon: true },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</div>
                  <div className="text-sm font-black tabular-nums flex items-center gap-1" style={{ color: f.color }}>
                    {f.icon && <TrendingDown size={12} style={{ color: C.em }} />}
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2.5 pt-2.5" style={{ borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>예상 절감액</span>
              <span className="text-[10px] font-bold" style={{ color: C.em }}>3.5억</span>
            </div>
          </div>

          {/* Completeness bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Shield size={10} style={{ color: C.em }} />
                <span className="text-[10px] font-bold" style={{ color: C.em }}>9/10</span>
              </div>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>자료 완성도</span>
            </div>
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>자료 5/6</span>
          </div>

          {/* Provided chips */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: "감정평가", ok: true }, { label: "등기", ok: true },
              { label: "권리", ok: true }, { label: "임차", ok: true },
              { label: "사진", ok: true }, { label: "재무", ok: false },
            ].map(c => (
              <span key={c.label} className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: c.ok ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                  color: c.ok ? C.em : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${c.ok ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {c.ok ? "✓" : "·"} {c.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="py-2.5 rounded-xl text-center cursor-pointer font-extrabold text-xs transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
            딜룸 입장 · 상세 <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div className="absolute -top-4 -right-4 rounded-xl px-3 py-2 shadow-xl"
        animate={{ rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: C.bg4, border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}>
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
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>할인율 <strong>29.2%</strong> 실시간</span>
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
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => setIdx(p => (p + 1) % SUGGESTIONS.length), 3200);
    return () => clearInterval(id);
  }, []);
  const submit = () => {
    router.push(`/exchange${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };
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
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder={!focused ? SUGGESTIONS[idx] : "예: 서울 강남 아파트 NPL 수익률 20% 이상 A등급"}
          className="flex-1 bg-transparent text-sm outline-none px-3 py-3.5"
          style={{ color: 'rgba(255,255,255,0.85)', caretColor: C.em }}
          aria-label="NPL 자연어 검색"
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
    {
      icon: <Search size={20} style={{ color: C.em }} />, tag: "거래소", tagColor: C.em,
      title: "NPL 매물 거래소",
      desc: "1,234건의 라이브 NPL 매물. 채권잔액·매각희망가·할인율·담보LTV 30+ 조건 필터 + 자연어 검색으로 즉시 매칭.",
      href: "/exchange", accent: C.em,
      meta: "등록 1,234건 · 신규 매일 ~20건",
    },
    {
      icon: <MessageSquare size={20} style={{ color: C.teal }} />, tag: "딜룸", tagColor: C.teal,
      title: "딜룸 · NDA · 전자계약",
      desc: "매도자·매수자 1:1 보안 채널. NDA 전자서명 → 권리증 공유 → LOI → 매매계약서 자동 생성까지 원스톱 체결.",
      href: "/deals", accent: C.teal,
      meta: "진행 중 딜 68건 · 이번 주 체결 14건",
    },
    {
      icon: <Gavel size={20} style={{ color: C.amber }} />, tag: "경쟁 입찰", tagColor: C.amber,
      title: "실시간 경쟁 입찰",
      desc: "공개 경쟁 입찰 + 프라이빗 협상. 자동 입찰 에이전트로 가격 상한·기준일만 설정하면 조건 맞는 매물 자동 응찰.",
      href: "/exchange/auction", accent: C.amber,
      meta: "진행 중 입찰 42건 · 평균 낙찰 7일",
    },
    {
      icon: <ShieldCheck size={20} style={{ color: C.blue }} />, tag: "체결 보호", tagColor: C.blue,
      title: "에스크로 · PII 마스킹",
      desc: "대금은 에스크로 계좌로, 개인정보는 L0~L3 접근통제로. 안전한 체결을 위한 2중 안전장치.",
      href: "/support", accent: C.blue,
      meta: "자금 보호 · 정보보호 2중 안전장치",
    },
    {
      icon: <Brain size={20} style={{ color: C.purple }} />, tag: "AI 분석", tagColor: C.purple,
      title: "AI 딜 분석 리포트",
      desc: "감정가·배당요구·권리분석·수익률·회수 확률까지 27초 내 자동 리포트. 거래 결정을 빠르게, 리스크를 명확하게.",
      href: "/analysis", accent: C.purple,
      meta: "평균 분석 시간 27초 · 28,391건 분석",
    },
    {
      icon: <Sparkles size={20} style={{ color: C.rose }} />, tag: "AI Copilot", tagColor: C.rose,
      title: "AI Copilot — 거래 어시스턴트",
      desc: "\"이 매물 수익률 15% 가능해?\" 처럼 대화하듯 물어보세요. 매물·시세·판례 DB 를 실시간 조회하는 거래 도우미.",
      href: "/analysis/copilot", accent: C.rose,
      meta: "Claude + 자체 NPL 코퍼스 학습",
    },
  ];

  const steps = [
    { n: "01", t: "매물 등록", d: "매도자(금융기관)가 NPL을 L0 카드 형태로 공개. PII는 자동 마스킹.", icon: <Layers size={16} />, sla: "등록 10분" },
    { n: "02", t: "AI 딜 분석", d: "담보·권리·시세·회수확률을 30초 내 리포트. 투자자가 본인인증(L1)만으로 열람.", icon: <Brain size={16} />, sla: "리포트 30초" },
    { n: "03", t: "경쟁 입찰", d: "공개 경쟁 입찰 또는 NDA(L2) 프라이빗 협상. 자동 입찰 에이전트 지원.", icon: <Gavel size={16} />, sla: "평균 7일" },
    { n: "04", t: "딜룸 · LOI", d: "LOI(L3) 승인 후 채권서류·권리관계 전체 열람. 보안 채널 협상 + 문서 교환.", icon: <MessageSquare size={16} />, sla: "조건 협의 3일" },
    { n: "05", t: "전자계약 · 에스크로", d: "전자계약서 자동 생성 → 서명 → 에스크로 대금 지급 → 채권양도 완결.", icon: <CheckCircle2 size={16} />, sla: "당일 클로징" },
  ];

  return (
    <div style={{ backgroundColor: C.bg1, color: 'var(--color-text-primary)', fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", minHeight: '100vh' }}>

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
                  <span className="text-xs font-semibold" style={{ color: C.fghd, letterSpacing: '0.06em' }}>대한민국 NPL 거래소</span>
                  <span style={{ color: C.fghm }}>·</span>
                  <span className="text-xs font-black" style={{ color: C.em }}>지금 거래 중</span>
                </div>
              </motion.div>

              {/* H1 */}
              <motion.h1 variants={up} custom={1}
                className="font-black leading-[1.08] tracking-tighter mb-5"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: C.fgh }}
              >
                NPL 딜이 모이는 곳,<br />
                거래가 시작되는 곳<br />
                <span style={{
                  background: `linear-gradient(135deg, ${C.em} 0%, ${C.emL} 40%, #6EE7B7 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>‘엔플랫폼’</span>
              </motion.h1>

              {/* Sub */}
              <motion.p variants={up} custom={2} className="text-base leading-relaxed mb-7"
                style={{ color: C.fghm, maxWidth: '440px' }}>
                매각사와 투자자가 직접 만나는 거래소.{" "}
                <span style={{ color: C.fghd, fontWeight: 500 }}>매물 탐색 · 경쟁 입찰 · 딜룸 협상 · 전자계약</span>{" "}
                까지 한 번에 체결합니다.
              </motion.p>

              {/* CTAs — 거래 2-branch */}
              <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/exchange"
                  className="group inline-flex items-center justify-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', padding: '14px 28px', boxShadow: `0 4px 20px rgba(16,185,129,0.3)` }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Search size={15} />
                  매물 탐색하기
                  <ArrowRight size={15} />
                </Link>
                <Link href="/exchange/sell"
                  className="group inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: C.fgh, padding: '14px 28px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Building2 size={13} style={{ color: C.em }} />
                  매물 등록하기
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
                    <span className="text-[10px] font-bold" style={{ color: C.fghm }}>{s.change}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black tabular-nums leading-tight" style={{ color: C.fgh }}>
                      <Counter target={s.val} suffix={s.suffix} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.fghm }}>{s.label}</div>
                  </div>
                  <Sparkline color={s.color} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══ 거래소 매물 예시 (쇼케이스) ═══════════════════════════════════ */}
      <ExchangePreview />

      {/* ══ 딜룸 예시 (쇼케이스) ══════════════════════════════════════════ */}
      <DealRoomPreview />

      {/* ══ AI 추천 (Phase 2-F · 개인화) ═══════════════════════════════════ */}
      <AIRecommendations />

      {/* ══ TRUST BELT (brand tokens 기반) ════════════════════════════════ */}
      <TrustBelt />

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
              {
                icon: <TrendingUp size={24} style={{ color: C.em }} />,
                tag: "거래 효율 3배",
                tagBg: 'rgba(16,185,129,0.08)', tagColor: '#059669', tagBorder: 'rgba(16,185,129,0.2)',
                title: "빠른 거래, 투명한 수수료",
                desc: "평균 딜 클로징 24일 → 7일로 단축. NPL 매수 1.5% · 부동산 0.9% 고정 수수료, 매각사는 첫 6개월 무료. 에스크로·전자계약으로 거래 리스크도 함께 낮춥니다.",
                iconBg: 'rgba(16,185,129,0.06)', borderHover: '#10B981',
                bullets: ["매물 공개 → 낙찰 평균 7일", "NPL 1.5% / 부동산 0.9% · 매각사 6개월 무료", "에스크로 · 전자계약 기본 제공"],
              },
              {
                icon: <Building2 size={24} style={{ color: C.blue }} />,
                tag: "47개 금융기관",
                tagBg: 'rgba(59,130,246,0.08)', tagColor: '#2563EB', tagBorder: 'rgba(59,130,246,0.2)',
                title: "매도자 → 투자자 직거래",
                desc: "은행·저축은행·캐피탈 47개사가 직접 매각. 중간 유통 없이 1차 공급자 가격으로 매입하고, 매도자는 LLR(Loan Loss Reserve) 회수를 극대화합니다.",
                iconBg: 'rgba(59,130,246,0.06)', borderHover: '#3B82F6',
                bullets: ["중간 유통 없는 1차 공급 가격", "기관 KYC · 자격 검증 완료", "실시간 경쟁 입찰 / 프라이빗 협상"],
              },
              {
                icon: <ShieldCheck size={24} style={{ color: C.purple }} />,
                tag: "L0→L3 4단계 접근",
                tagBg: 'rgba(168,85,247,0.08)', tagColor: '#9333EA', tagBorder: 'rgba(168,85,247,0.2)',
                title: "거래 안전 · PII 보호",
                desc: "담보 부동산은 공개, 채무자 개인정보는 가린다. 본인인증(L1) → NDA(L2) → LOI(L3) 단계별로만 권리관계·채권서류에 접근합니다.",
                iconBg: 'rgba(168,85,247,0.06)', borderHover: '#A855F7',
                bullets: ["금감원·신용정보법 가이드 준수", "자동 PII 마스킹 파이프라인", "NDA 전자서명 + 감사로그 영구 보관"],
              },
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
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748B' }}>{r.desc}</p>
                <ul className="space-y-1.5 pt-3 border-t border-slate-100">
                  {r.bullets?.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12.5px]" style={{ color: '#475569' }}>
                      <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: r.borderHover }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
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
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Layers size={12} style={{ color: C.em }} />
              <span className="text-xs font-bold" style={{ color: C.em, letterSpacing: '0.06em' }}>거래 인프라</span>
            </div>
            <h2 className="font-black tracking-tighter mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: C.fgh }}>
              거래를 위한 모든 것
            </h2>
            <p className="text-base" style={{ color: C.fghm, maxWidth: '480px', margin: '0 auto' }}>
              거래소 · 딜룸 · 계약 · 에스크로 · AI 분석 — 체결에 필요한 모든 도구가 NPLatform 하나에.
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
                  <h3 className="font-bold text-sm mb-2 transition-colors" style={{ color: C.fgh }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: C.fghm }}>{f.desc}</p>
                  {f.meta && (
                    <div className="mt-4 pt-3 border-t flex items-center gap-1.5 text-[11px] font-medium tabular-nums"
                      style={{ borderColor: 'rgba(255,255,255,0.05)', color: f.accent }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: f.accent }} />
                      {f.meta}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: C.fghm }}>
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
            {/* Seller – premium (라이트/다크 자동 분기 · Phase H · globals.css 의 .home-seller-premium-card) */}
            <motion.div variants={up} custom={0}
              className="home-seller-premium-card relative rounded-2xl p-8 overflow-hidden"
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)', borderRadius: '50%' }} />
              <div className="home-seller-divider" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px' }} />
              <div className="relative">
                <div className="home-seller-icon-wrap w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                  <Building2 size={22} style={{ color: C.em }} />
                </div>
                <div className="home-seller-eyebrow inline-flex text-[10px] font-bold rounded-full px-3 py-1 mb-4"
                  style={{ letterSpacing: '0.05em' }}>
                  매각사 · 금융기관
                </div>
                <h3 className="home-seller-title font-black text-2xl mb-3">금융기관 (매각사)</h3>
                <p className="home-seller-body text-sm leading-relaxed mb-6">
                  NPL 매물을 디지털로 등록하고 전국 검증된 투자자에게 노출하세요. AI 가격 산정, 입찰 관리, 딜룸 협상까지 자동화합니다.
                </p>
                <ul className="space-y-2.5 mb-7">
                  {["매물 일괄 등록 및 관리", "실시간 입찰 모니터링", "AI 가격 자동 산정", "딜룸 문서 관리", "전자계약 원스톱"].map(item => (
                    <li key={item} className="home-seller-list-item flex items-center gap-2.5 text-sm">
                      <CheckCircle2 size={13} style={{ color: C.em, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
                <Link href="/exchange/sell"
                  className="inline-flex items-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', padding: '12px 24px', boxShadow: `0 4px 16px rgba(16,185,129,0.25)` }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  매물 등록하고 딜룸 시작 <ArrowRight size={14} />
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
                  대부업체 · 투자자
                </div>
                <h3 className="font-black text-2xl mb-3" style={{ color: '#0A1628' }}>대부업체 / 투자자</h3>
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
                <Link href="/exchange"
                  className="inline-flex items-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: C.brandHero, color: C.textOnBrand, padding: '12px 24px' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = '#0F2040'); (e.currentTarget.style.transform = 'translateY(-1px)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = C.brandHero); (e.currentTarget.style.transform = 'translateY(0)'); }}
                >
                  거래소에서 매물 탐색 <ArrowRight size={14} />
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
                <div className="text-xs leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.d}</div>
                {s.sla && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', color: C.em, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <Zap size={9} />{s.sla}
                  </span>
                )}
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-[10px] font-black" style={{ color: C.em }}>{s.n}</div>
                    {s.sla && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', color: C.em, border: '1px solid rgba(16,185,129,0.2)' }}>
                        <Zap size={8} />{s.sla}
                      </span>
                    )}
                  </div>
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
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>지금 거래를 시작하세요</span>
              </div>
            </motion.div>

            <motion.h2 variants={up} custom={1}
              className="font-black tracking-tighter mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: 'rgba(255,255,255,0.95)' }}
            >
              오늘 움직이는{" "}
              <span style={{
                background: `linear-gradient(135deg, ${C.em}, ${C.emL}, #6EE7B7)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>NPL 딜 플로우</span>
            </motion.h2>

            <motion.p variants={up} custom={2} className="text-base mb-8"
              style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
              1,234건의 라이브 매물과 활성 딜룸에서 직접 거래를 시작하세요.<br />
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>회원가입 즉시 · 매물 탐색 · 딜룸 협상 · 전자계약</span>
            </motion.p>

            <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/exchange"
                className="inline-flex items-center justify-center gap-2 font-bold text-base rounded-xl transition-all"
                style={{ background: `linear-gradient(135deg, ${C.em}, #059669)`, color: 'white', padding: '16px 32px', boxShadow: `0 4px 24px rgba(16,185,129,0.25)` }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                매물 탐색하기 <ArrowRight size={17} />
              </Link>
              <Link href="/exchange/sell"
                className="inline-flex items-center justify-center gap-2 font-semibold text-base rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '16px 32px' }}
                onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.10)'); (e.currentTarget.style.transform = 'translateY(-2px)'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.06)'); (e.currentTarget.style.transform = 'translateY(0)'); }}
              >
                매물 등록하기 <ChevronRight size={17} />
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
