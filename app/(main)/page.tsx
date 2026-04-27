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
  emL: "#051C2C",
  blue: "var(--color-brand-bright)",
  amber: "var(--color-warning)",
  purple: "#051C2C",
  rose: "var(--color-danger)",
  teal: "#051C2C",

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
// McKinsey 4-color tick (electric blue 단일 dot — rainbow X)
const TICKS = [
  { t: "거래완료", v: "3,847건", c: '#2251FF', icon: "✓" },
  { t: "총 거래액", v: "₩2,847억", c: '#2251FF', icon: "₩" },
  { t: "AI 분석", v: "28,391건", c: '#2251FF', icon: "⚡" },
  { t: "등록 매물", v: "1,234건", c: '#2251FF', icon: "◉" },
  { t: "협력 금융기관", v: "47개사", c: '#2251FF', icon: "🏦" },
  { t: "평균 수익률", v: "18.4%↑", c: '#2251FF', icon: "%" },
  { t: "거래완료", v: "3,847건", c: '#2251FF', icon: "✓" },
  { t: "총 거래액", v: "₩2,847억", c: '#2251FF', icon: "₩" },
  { t: "AI 분석", v: "28,391건", c: '#2251FF', icon: "⚡" },
  { t: "등록 매물", v: "1,234건", c: '#2251FF', icon: "◉" },
];
function LiveTicker() {
  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: 'var(--layer-2-bg)', borderTop: '1px solid var(--layer-border)' }}>
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
            <span className="text-[11px] font-medium" style={{ color: 'var(--fg-muted)', letterSpacing: '0.06em' }}>{t.t}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--fg-strong)' }}>{t.v}</span>
            <span style={{ color: 'var(--color-border-default)' }}>|</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE CAROUSEL · 자발적 경매 ↔ NPL 분석 보고서
   - 단순 opacity crossfade (no float animation, no AnimatePresence wait mode)
   - 두 카드 항상 stack 렌더 → 하나는 absolute positioning + opacity 토글
   - 안정적 가시성 보장
═══════════════════════════════════════════════════════════════════════════ */
function LiveCarousel() {
  const [slide, setSlide] = useState<0 | 1>(0)

  // Auto-rotate every 8s
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s === 0 ? 1 : 0)), 8000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative w-full max-w-[440px] mx-auto select-none">
      {/* Carousel container — CSS Grid stack (active 카드 높이만큼만 차지, gap 제거) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }}>
        {/* Slide 1 — 자발적 경매 */}
        <div
          style={{
            gridArea: '1 / 1 / 2 / 2',
            opacity: slide === 0 ? 1 : 0,
            visibility: slide === 0 ? 'visible' : 'hidden',
            pointerEvents: slide === 0 ? 'auto' : 'none',
            transition: 'opacity 0.45s ease, visibility 0.45s',
            zIndex: slide === 0 ? 2 : 1,
          }}
        >
          <LiveAuctionCard />
        </div>
        {/* Slide 2 — NPL 분석 보고서 */}
        <div
          style={{
            gridArea: '1 / 1 / 2 / 2',
            opacity: slide === 1 ? 1 : 0,
            visibility: slide === 1 ? 'visible' : 'hidden',
            pointerEvents: slide === 1 ? 'auto' : 'none',
            transition: 'opacity 0.45s ease, visibility 0.45s',
            zIndex: slide === 1 ? 2 : 1,
          }}
        >
          <LiveAnalysisCard />
        </div>
      </div>

      {/* Carousel controls — 카드 바로 아래 (mt-3 으로 gap 최소화) */}
      <div className="flex items-center justify-center gap-3" style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setSlide(0)}
          className="w-9 h-9 inline-flex items-center justify-center transition-all"
          style={{
            background: slide === 0 ? '#FFFFFF' : 'transparent',
            border: '1px solid #FFFFFF',
            color: slide === 0 ? '#0A1628' : '#FFFFFF',
            cursor: 'pointer',
          }}
          aria-label="이전 슬라이드"
        >
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSlide(0)}
            className="transition-all"
            style={{
              width: slide === 0 ? 32 : 8,
              height: 8,
              background: slide === 0 ? '#00A9F4' : 'rgba(255,255,255,0.40)',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="자발적 경매 슬라이드"
          />
          <button
            type="button"
            onClick={() => setSlide(1)}
            className="transition-all"
            style={{
              width: slide === 1 ? 32 : 8,
              height: 8,
              background: slide === 1 ? '#00A9F4' : 'rgba(255,255,255,0.40)',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="NPL 분석 보고서 슬라이드"
          />
        </div>

        <button
          type="button"
          onClick={() => setSlide(1)}
          className="w-9 h-9 inline-flex items-center justify-center transition-all"
          style={{
            background: slide === 1 ? '#FFFFFF' : 'transparent',
            border: '1px solid #FFFFFF',
            color: slide === 1 ? '#0A1628' : '#FFFFFF',
            cursor: 'pointer',
          }}
          aria-label="다음 슬라이드"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Slide title indicator — 컨트롤 바로 아래 */}
      <div className="flex items-center justify-center" style={{ marginTop: 8 }}>
        <span
          className="text-[10px] uppercase tracking-[0.16em] font-bold"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {slide === 0 ? "01 / 02 · 자발적 경매" : "02 / 02 · NPL 분석 보고서"}
        </span>
      </div>
    </div>
  )
}

/* ─── LIVE 자발적 경매 카드 ────────────────────────────────────────────── */
function LiveAuctionCard() {
  const [bidCount, setBidCount] = useState(7)
  const [topBid, setTopBid] = useState(852)

  // Simulate live bid increments
  useEffect(() => {
    const id = setInterval(() => {
      setBidCount(prev => prev + 1)
      setTopBid(prev => prev + Math.floor(Math.random() * 5) + 1)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="mck-paper relative overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(5, 28, 44, 0.10)',
        borderTop: '3px solid #00A9F4',
        boxShadow: '0 24px 48px -12px rgba(5, 28, 44, 0.30), 0 8px 16px -4px rgba(5, 28, 44, 0.15)',
        borderRadius: 0,
      }}
    >
      {/* LIVE badge — pulsing cyan */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(5, 28, 44, 0.10)', backgroundColor: '#FAFBFC' }}>
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: '#00A9F4' }}
          />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: '#00A9F4' }}>
            LIVE · 실시간 입찰
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.10em] tabular-nums" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>
          남은 시간 · 02:14:08
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Eyebrow + Title */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.10em] mb-1.5 font-bold" style={{ color: '#2251FF' }}>
            VOLUNTARY AUCTION · 자발적 경매
          </div>
          <h3
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 18,
              fontWeight: 800,
              color: '#0A1628',
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            서울 강남구 아파트 NPL
          </h3>
          <div className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(5, 28, 44, 0.55)', fontWeight: 600 }}>
            <MapPin size={11} /> 강남구 역삼동 · 84.9㎡ · 감정가 12.0억
          </div>
        </div>

        {/* Hero metrics — Deep Navy 3-col panel (mck-cta-dark 으로 children white text 강제) */}
        <div
          className="mck-cta-dark"
          style={{
            backgroundColor: '#051C2C',
            borderTop: '3px solid #2251FF',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
          }}
        >
          <div style={{ padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>최저가</div>
            <div className="text-base font-extrabold tabular-nums" style={{ color: '#FFFFFF', fontFamily: 'Georgia, serif', letterSpacing: '-0.015em' }}>
              <span style={{ color: '#FFFFFF' }}>8.50</span><span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>억</span>
            </div>
          </div>
          <div style={{ padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>현재 입찰가</div>
            <motion.div
              key={topBid}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-base font-extrabold tabular-nums"
              style={{ color: '#FFFFFF', fontFamily: 'Georgia, serif', letterSpacing: '-0.015em' }}
            >
              <span style={{ color: '#FFFFFF' }}>{(topBid / 100).toFixed(2)}</span><span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>억</span>
            </motion.div>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: '#00A9F4' }}>입찰 참여</div>
            <motion.div
              key={bidCount}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-base font-extrabold tabular-nums"
              style={{ color: '#00A9F4', fontFamily: 'Georgia, serif', letterSpacing: '-0.015em' }}
            >
              <span style={{ color: '#00A9F4' }}>{bidCount}</span><span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>건</span>
            </motion.div>
          </div>
        </div>

        {/* Recent bid timeline */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-2" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>최근 입찰 내역</div>
          <div className="space-y-1.5">
            {[
              { name: 'oo자산운용', amount: `${(topBid / 100).toFixed(2)}억`, time: '방금 전', highlight: true },
              { name: 'oooo캐피탈', amount: `${((topBid - 3) / 100).toFixed(2)}억`, time: '32초 전' },
              { name: 'oo NPL 펀드', amount: `${((topBid - 8) / 100).toFixed(2)}억`, time: '1분 전' },
            ].map((bid, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2"
                style={{
                  backgroundColor: bid.highlight ? 'rgba(0, 169, 244, 0.08)' : '#FAFBFC',
                  border: `1px solid ${bid.highlight ? 'rgba(0, 169, 244, 0.30)' : 'rgba(5, 28, 44, 0.06)'}`,
                  borderLeft: bid.highlight ? '2px solid #00A9F4' : '1px solid rgba(5, 28, 44, 0.06)',
                }}
              >
                <span className="text-[11px] font-semibold" style={{ color: '#0A1628' }}>{bid.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-extrabold tabular-nums" style={{ color: bid.highlight ? '#1A47CC' : '#0A1628', fontFamily: 'Georgia, serif' }}>{bid.amount}</span>
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(5, 28, 44, 0.45)' }}>{bid.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/exchange/auction"
          className="mck-cta-dark py-3 px-4 text-center font-extrabold text-xs transition-all hover:opacity-90 flex items-center justify-between"
          style={{
            backgroundColor: '#0A1628',
            color: '#FFFFFF',
            border: '1px solid #0A1628',
            borderTop: '2px solid #00A9F4',
            borderRadius: 0,
            letterSpacing: '0.04em',
            textDecoration: 'none',
          }}
        >
          <span style={{ color: '#FFFFFF' }}>입찰 참여 · 실시간 경매</span>
          <ArrowRight size={13} style={{ color: '#FFFFFF' }} />
        </Link>
      </div>
    </div>
  )
}

/* ─── LIVE NPL 분석 보고서 카드 ────────────────────────────────────────── */
function LiveAnalysisCard() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="mck-paper relative overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(5, 28, 44, 0.10)',
        borderTop: '3px solid #2251FF',
        boxShadow: '0 24px 48px -12px rgba(5, 28, 44, 0.30), 0 8px 16px -4px rgba(5, 28, 44, 0.15)',
        borderRadius: 0,
      }}
    >
      {/* LIVE 분석 banner */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(5, 28, 44, 0.10)', backgroundColor: '#FAFBFC' }}>
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <Brain size={11} style={{ color: '#2251FF' }} />
          </motion.span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: '#2251FF' }}>
            LIVE · 실시간 AI 분석
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.10em] tabular-nums" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>
          27초 만에 완료
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3.5">
        {/* Eyebrow + Title */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.10em] mb-1.5 font-bold" style={{ color: '#2251FF' }}>
            INVESTMENT MEMORANDUM · 분석 보고서
          </div>
          <h3
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 16,
              fontWeight: 800,
              color: '#0A1628',
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }}
          >
            서울 강남구 오피스텔 NPL · ○○은행
          </h3>
        </div>

        {/* AI Grade hero */}
        <div className="flex items-center gap-3" style={{ padding: '12px 14px', backgroundColor: 'rgba(34, 81, 255, 0.05)', border: '1px solid rgba(34, 81, 255, 0.20)', borderTop: '2px solid #2251FF' }}>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: '#1A47CC' }}>AI 투자 등급</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 800, color: '#1A47CC', lineHeight: 1, letterSpacing: '-0.02em' }}>
              A
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(5, 28, 44, 0.15)' }} />
          <div className="flex-1">
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>투자 의견</div>
            <div className="text-sm font-extrabold" style={{ color: '#0A1628', fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
              BUY <span className="text-xs font-bold" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>· 89.0점</span>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div style={{ padding: '10px 12px', backgroundColor: '#FAFBFC', border: '1px solid rgba(5, 28, 44, 0.06)', borderTop: '2px solid #00A9F4' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>예측 회수율</div>
            <div className="text-base font-extrabold tabular-nums" style={{ color: '#0A1628', fontFamily: 'Georgia, serif' }}>92.5%</div>
          </div>
          <div style={{ padding: '10px 12px', backgroundColor: '#FAFBFC', border: '1px solid rgba(5, 28, 44, 0.06)', borderTop: '2px solid #00A9F4' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>예상 ROI</div>
            <div className="text-base font-extrabold tabular-nums" style={{ color: '#0A1628', fontFamily: 'Georgia, serif' }}>18.4%</div>
          </div>
        </div>

        {/* Live calc progress (4 factors) */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.10em] mb-2" style={{ color: '#2251FF' }}>매칭 요인 분석 (실시간 계산)</div>
          <div className="space-y-1.5">
            {[
              { name: '담보유형 · 가중치 40%', score: 100, contribution: 40 },
              { name: '지역 · 가중치 25%', score: 88, contribution: 22 },
              { name: '금액대 · 가중치 20%', score: 80, contribution: 16 },
              { name: '할인율 · 가중치 15%', score: 73, contribution: 11 },
            ].map((f, i) => {
              const showProgress = i <= (tick % 5)
              return (
                <div key={f.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: '#0A1628' }}>{f.name}</span>
                    <span className="text-[10px] font-extrabold tabular-nums" style={{ color: '#1A47CC', fontFamily: 'Georgia, serif' }}>
                      {f.contribution}점
                    </span>
                  </div>
                  <div style={{ height: 3, backgroundColor: '#F4F6F9', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: showProgress ? `${f.score}%` : 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', backgroundColor: '#2251FF' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/analysis/report"
          className="mck-cta-dark py-3 px-4 text-center font-extrabold text-xs transition-all hover:opacity-90 flex items-center justify-between"
          style={{
            backgroundColor: '#0A1628',
            color: '#FFFFFF',
            border: '1px solid #0A1628',
            borderTop: '2px solid #2251FF',
            borderRadius: 0,
            letterSpacing: '0.04em',
            textDecoration: 'none',
          }}
        >
          <span style={{ color: '#FFFFFF' }}>분석 보고서 전체 보기</span>
          <ArrowRight size={13} style={{ color: '#FFFFFF' }} />
        </Link>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEAL CARD MOCKUP  — (legacy, no longer rendered in hero)
═══════════════════════════════════════════════════════════════════════════ */
function DealCard() {
  return (
    <motion.div
      animate={{ y: [-6, 6, -6] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-full max-w-[370px] mx-auto select-none"
    >
      {/* Ambient glow */}
      <div className="absolute -inset-8 rounded-3xl blur-3xl" style={{ background: 'radial-gradient(circle, rgba(5, 28, 44,0.12) 0%, transparent 70%)' }} />

      {/*
        McKinsey Editorial Card — White paper on navy hero
        원칙: 색을 채우지 않고 typography hierarchy 로 위계
        - 카드 = 흰 종이 (#FFFFFF)
        - 본문 = ink (#0A1628) + 회색 단계 (#3A4A5C, #6B7280)
        - 강조 = ink Black + ExtraBold + 큰 사이즈 (색 ≠ 강조)
        - 1점 brass accent (gold) — 좌상단 hairline 하나만
        - CTA = ink 검정 사각 + 흰 글씨 (radius 0)
      */}
      <div className="mck-paper relative overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(5, 28, 44, 0.10)',
          borderTop: '2px solid var(--color-editorial-gold, #2251FF)',
          boxShadow: '0 24px 48px -12px rgba(5, 28, 44, 0.30), 0 8px 16px -4px rgba(5, 28, 44, 0.15)',
          borderRadius: 0,
        }}>

        {/* Header strip — institution */}
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(5, 28, 44, 0.10)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center"
              style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.10)' }}>
              <Building2 size={13} style={{ color: 'rgba(5, 28, 44, 0.55)' }} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-tight" style={{ color: '#0A1628' }}>우리은행</div>
              <div className="text-[9px] uppercase tracking-[0.10em] mt-0.5" style={{ color: 'rgba(5, 28, 44, 0.50)', fontWeight: 600 }}>금융기관 · D-5</div>
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-[0.10em]"
            style={{ background: '#0A1628', color: '#FFFFFF', borderRadius: 0 }}>
            NPL
          </span>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Title row */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.10em] mb-1.5" style={{ color: 'rgba(5, 28, 44, 0.55)', fontWeight: 600 }}>
                <MapPin size={10} /> 서울 강남구 · 아파트
              </div>
              <div className="text-[15px] font-extrabold" style={{ color: '#0A1628', letterSpacing: '-0.012em', lineHeight: 1.25 }}>
                임의매각 · 아파트 담보
              </div>
              <div className="text-[9px] mt-1 font-mono uppercase tracking-[0.06em]" style={{ color: 'rgba(5, 28, 44, 0.40)' }}>
                NPL-2026-0412
              </div>
            </div>
            <div className="shrink-0 px-1.5 py-1 text-[10px] font-extrabold tracking-[0.06em]"
              style={{ background: '#0A1628', color: '#FFFFFF', borderRadius: 0 }}>
              AI · A
            </div>
          </div>

          {/* Key figures — 매각희망가만 큰 강조, 나머지는 작게 */}
          <div className="pt-1">
            {/* 매각희망가 = HERO 숫자 */}
            <div className="mb-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>
                매각희망가
              </div>
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: '#0A1628', letterSpacing: '-0.02em', lineHeight: 1 }}>
                8.5<span className="text-xl font-bold" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>억</span>
              </div>
            </div>
            {/* sub-metrics: 채권잔액 · 감정가 · 할인율 */}
            <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid rgba(5, 28, 44, 0.10)' }}>
              {[
                { label: "채권잔액", value: "12.0", unit: "억" },
                { label: "감정가", value: "10.2", unit: "억" },
                { label: "할인율", value: "29.2", unit: "%", brass: true },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>{f.label}</div>
                  <div className="text-sm font-bold tabular-nums" style={{ color: f.brass ? 'var(--color-editorial-gold, #2251FF)' : '#0A1628', letterSpacing: '-0.01em' }}>
                    {f.value}<span className="text-[10px] font-semibold ml-0.5" style={{ color: 'rgba(5, 28, 44, 0.45)' }}>{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2.5" style={{ borderTop: '1px dashed rgba(5, 28, 44, 0.10)' }}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.10em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>예상 절감액</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: '#0A1628' }}>3.5억</span>
            </div>
          </div>

          {/* Completeness bar */}
          <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(5, 28, 44, 0.10)', paddingTop: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-0.5"
                style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.20)', borderRadius: 0 }}>
                <Shield size={10} style={{ color: '#0A1628' }} />
                <span className="text-[10px] font-extrabold tabular-nums" style={{ color: '#0A1628' }}>9/10</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.10em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>자료 완성도</span>
            </div>
            <span className="text-[10px] font-semibold tabular-nums uppercase tracking-[0.06em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>자료 5/6</span>
          </div>

          {/* Provided chips — outline only */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: "감정평가", ok: true }, { label: "등기", ok: true },
              { label: "권리", ok: true }, { label: "임차", ok: true },
              { label: "사진", ok: true }, { label: "재무", ok: false },
            ].map(c => (
              <span key={c.label} className="text-[10px] font-semibold px-1.5 py-0.5"
                style={{
                  background: '#FFFFFF',
                  color: c.ok ? '#0A1628' : 'rgba(5, 28, 44, 0.40)',
                  border: c.ok ? '1px solid rgba(5, 28, 44, 0.30)' : '1px dashed rgba(5, 28, 44, 0.20)',
                  borderRadius: 0,
                  letterSpacing: '0.02em',
                }}>
                {c.ok ? "✓" : "·"} {c.label}
              </span>
            ))}
          </div>

          {/* CTA — ink black + sharp edge */}
          <div className="py-2.5 px-4 text-center cursor-pointer font-extrabold text-xs transition-all hover:opacity-90 flex items-center justify-between"
            style={{
              background: '#0A1628',
              color: '#FFFFFF',
              border: '1px solid #0A1628',
              borderRadius: 0,
              letterSpacing: '0.04em',
            }}>
            <span>딜룸 입장 · 상세</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Floating badges — high contrast on navy hero */}
      <motion.div className="absolute -top-4 -right-4 px-3 py-2"
        animate={{ rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: 'var(--color-editorial-gold, #2251FF)',
          color: '#FFFFFF',
          borderRadius: 0,
          boxShadow: '0 8px 24px -4px rgba(5, 28, 44, 0.40)',
        }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} style={{ color: '#FFFFFF' }} />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: '#FFFFFF' }}>AI 분석 완료</span>
        </div>
      </motion.div>

      <motion.div className="absolute -bottom-4 -left-4 px-3 py-2"
        animate={{ y: [0, -4, 0] }} transition={{ duration: 3.5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(5, 28, 44, 0.20)',
          borderRadius: 0,
          boxShadow: '0 8px 24px -4px rgba(5, 28, 44, 0.30)',
        }}>
        <div className="flex items-center gap-1.5">
          <Activity size={11} style={{ color: '#0A1628' }} />
          <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'rgba(5, 28, 44, 0.65)', fontWeight: 600 }}>
            할인율 <strong style={{ color: '#0A1628', fontWeight: 800 }}>29.2%</strong> 실시간
          </span>
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
      {/* AI 라벨 + 안내 — navy 위 brass + 흰 (직접 hex) */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1"
          style={{ background: 'transparent', border: '1px solid #2251FF', borderRadius: 0 }}>
          <Brain size={11} style={{ color: '#00A9F4' }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: '#00A9F4' }}>AI 자연어 검색</span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.78)' }}>원하는 물건을 자유롭게 설명하세요</span>
      </div>

      {/* 검색 박스 — 흰 종이 (navy 위 강한 contrast) */}
      <div className="relative flex items-center overflow-hidden transition-all duration-300"
        style={{
          background: '#FFFFFF',
          border: focused ? '1px solid #0A1628' : '1px solid rgba(5, 28, 44, 0.20)',
          borderRadius: 0,
          boxShadow: focused ? '0 0 0 2px rgba(184,146,75,0.35), 0 8px 24px rgba(0,0,0,0.3)' : '0 6px 18px -4px rgba(0,0,0,0.2)',
        }}>
        <Search size={15} className="ml-4 flex-shrink-0" style={{ color: 'rgba(5, 28, 44, 0.55)' }} />
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder={!focused ? SUGGESTIONS[idx] : "예: 서울 강남 아파트 NPL 수익률 20% 이상 A등급"}
          className="flex-1 bg-transparent text-sm outline-none px-3 py-3.5"
          style={{ color: '#0A1628', caretColor: '#2251FF' }}
          aria-label="NPL 자연어 검색"
        />
        <div className="flex items-center gap-1.5 mx-2 px-2.5 py-1.5 flex-shrink-0"
          style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.15)', borderRadius: 0 }}>
          <Sparkles size={10} style={{ color: '#2251FF' }} />
          <span className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: '#0A1628' }}>AI</span>
        </div>
        <Link href={`/exchange${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className="text-sm font-bold px-5 py-3.5 flex-shrink-0 transition-all"
          style={{ background: '#0A1628', color: '#FFFFFF', borderRadius: 0, letterSpacing: '0.04em' }}>
          검색
        </Link>
      </div>

      {/* Quick chips — navy 위 흰 outline + 흰 글씨 */}
      <div className="flex flex-wrap gap-2 mt-3">
        {["서울 아파트", "수익률 20%+", "1억 이하", "A등급 저위험"].map(tag => (
          <button key={tag} onClick={() => setQ(tag)}
            className="text-[11px] px-3 py-1.5 transition-all font-medium"
            style={{ color: '#FFFFFF', background: 'transparent', border: '1px solid rgba(255,255,255,0.40)', borderRadius: 0, letterSpacing: '0.02em' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.color = '#0A1628'; (e.currentTarget as HTMLElement).style.borderColor = '#FFFFFF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.40)'; }}
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

  // McKinsey monochrome — 모든 stats 동일 ink + electric tone (4색 제한 준수)
  const stats = [
    { label: "등록 매물", val: 1234, suffix: "건", icon: <Layers size={16} style={{ color: '#0A1628' }} />, change: "+12%", up: true, color: '#2251FF' },
    { label: "협력 금융기관", val: 47, suffix: "개사", icon: <Building2 size={16} style={{ color: '#0A1628' }} />, change: "+4개사", up: true, color: '#2251FF' },
    { label: "누적 거래액", val: 2847, suffix: "억", icon: <DollarSign size={16} style={{ color: '#0A1628' }} />, change: "+24%", up: true, color: '#2251FF' },
    { label: "AI 분석 건수", val: 28391, suffix: "건", icon: <Brain size={16} style={{ color: '#0A1628' }} />, change: "실시간", up: true, color: '#2251FF' },
  ];

  // McKinsey mono editorial v4 — 6개 카드 모두 동일 톤 (사용자 5번 지적: "알록달록 X")
  // 차별화는 라벨 텍스트 + 아이콘 모양 + 위치로. color 차별화 X.
  const MCK_ICON  = "var(--color-mck-blue, #2251FF)"      // 모든 아이콘 동일 bright blue
  const MCK_TAG_C = "var(--color-mck-blue, #2251FF)"      // 모든 라벨 동일 색
  const features = [
    {
      icon: <Search size={20} style={{ color: MCK_ICON }} />, tag: "거래소", tagColor: MCK_TAG_C,
      title: "NPL 매물 거래소",
      desc: "1,234건의 라이브 NPL 매물. 채권잔액·매각희망가·할인율·담보LTV 30+ 조건 필터 + 자연어 검색으로 즉시 매칭.",
      href: "/exchange", accent: MCK_TAG_C,
      meta: "등록 1,234건 · 신규 매일 ~20건",
    },
    {
      icon: <MessageSquare size={20} style={{ color: MCK_ICON }} />, tag: "딜룸", tagColor: MCK_TAG_C,
      title: "딜룸 · NDA · 전자계약",
      desc: "매도자·매수자 1:1 보안 채널. NDA 전자서명 → 권리증 공유 → LOI → 매매계약서 자동 생성까지 원스톱 체결.",
      href: "/deals", accent: MCK_TAG_C,
      meta: "진행 중 딜 68건 · 이번 주 체결 14건",
    },
    {
      icon: <Gavel size={20} style={{ color: MCK_ICON }} />, tag: "경쟁 입찰", tagColor: MCK_TAG_C,
      title: "실시간 경쟁 입찰",
      desc: "공개 경쟁 입찰 + 프라이빗 협상. 자동 입찰 에이전트로 가격 상한·기준일만 설정하면 조건 맞는 매물 자동 응찰.",
      href: "/exchange/auction", accent: MCK_TAG_C,
      meta: "진행 중 입찰 42건 · 평균 낙찰 7일",
    },
    {
      icon: <ShieldCheck size={20} style={{ color: MCK_ICON }} />, tag: "체결 보호", tagColor: MCK_TAG_C,
      title: "에스크로 · PII 마스킹",
      desc: "대금은 에스크로 계좌로, 개인정보는 L0~L3 접근통제로. 안전한 체결을 위한 2중 안전장치.",
      href: "/support", accent: MCK_TAG_C,
      meta: "자금 보호 · 정보보호 2중 안전장치",
    },
    {
      icon: <Brain size={20} style={{ color: MCK_ICON }} />, tag: "AI 분석", tagColor: MCK_TAG_C,
      title: "AI 딜 분석 리포트",
      desc: "감정가·배당요구·권리분석·수익률·회수 확률까지 27초 내 자동 리포트. 거래 결정을 빠르게, 리스크를 명확하게.",
      href: "/analysis", accent: MCK_TAG_C,
      meta: "평균 분석 시간 27초 · 28,391건 분석",
    },
    {
      icon: <Sparkles size={20} style={{ color: MCK_ICON }} />, tag: "AI Copilot", tagColor: MCK_TAG_C,
      title: "AI Copilot — 거래 어시스턴트",
      desc: "\"이 매물 수익률 15% 가능해?\" 처럼 대화하듯 물어보세요. 매물·시세·판례 DB 를 실시간 조회하는 거래 도우미.",
      href: "/analysis/copilot", accent: MCK_TAG_C,
      meta: "Claude + 자체 NPL 코퍼스 학습",
    },
  ];

  // McKinsey · 4-step deal flow (탐색 → 협상 → 계약 → 정산)
  const steps = [
    {
      n: "01", t: "탐색 · 발견",
      d: "매물 공개 + AI 자동 분석. 본인인증(L1)으로 매물·리포트 즉시 열람.",
      icon: <Search size={16} />, sla: "리포트 30초",
    },
    {
      n: "02", t: "NDA · 실사",
      d: "NDA 전자서명(L2) 후 채권자료·권리관계 열람. 딜룸 채팅으로 보안 협상.",
      icon: <Shield size={16} />, sla: "실사 3일",
    },
    {
      n: "03", t: "오퍼 · 계약",
      d: "오퍼 제출(L3) → 협상 → 전자계약서 자동 생성 → 양 당사자 서명.",
      icon: <MessageSquare size={16} />, sla: "협상 5일",
    },
    {
      n: "04", t: "에스크로 · 정산",
      d: "에스크로 대금 지급 → 채권양도 등기 → 정산 완결. 분쟁 시 중재 지원.",
      icon: <CheckCircle2 size={16} />, sla: "당일 클로징",
    },
  ];

  return (
    <div className="mck-l0" style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", minHeight: '100vh' }}>

      {/* ══ HERO · McKinsey editorial · 정통 ════════════════════════════════
          - 단일 deep navy bg (#051C2C)
          - 단일 cyan eyebrow line (다른 orbs/mesh 제거)
          - Georgia serif H1 (강한 editorial 위계)
          - Editorial pull-quote subtitle
          - 직각 CTA 버튼 (paper primary + cyan outline secondary)
          - 우측: 항상 보이는 carousel (white card on navy)
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: '#051C2C',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 4rem)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 1px hairline top accent — Cyan editorial signature */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0, 169, 244, 0.45), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Subtle dot grid — McKinsey editorial texture (very low opacity) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            maxWidth: 1280,
            margin: '0 auto',
            width: '100%',
            padding: '4rem 2rem 3rem',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div className="grid lg:grid-cols-[1fr_460px] gap-16 items-center w-full">
            {/* ── LEFT — Editorial Headline ─────────────────────────── */}
            <motion.div variants={stagger} initial="hidden" animate="visible">
              {/* Eyebrow — Cyan thin rule + small caps */}
              <motion.div variants={up} custom={0} className="mb-7">
                <div className="flex items-center gap-3">
                  <span style={{ display: 'inline-block', width: 28, height: 1.5, background: '#00A9F4' }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.20em',
                      textTransform: 'uppercase',
                      color: '#00A9F4',
                    }}
                  >
                    Korea NPL Exchange · LIVE
                  </span>
                </div>
              </motion.div>

              {/* H1 — Georgia serif editorial display */}
              <motion.h1
                variants={up}
                custom={1}
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 'clamp(2.6rem, 5.6vw, 4rem)',
                  color: '#FFFFFF',
                  lineHeight: 1.05,
                  letterSpacing: '-0.025em',
                  fontWeight: 800,
                  marginBottom: '1.5rem',
                }}
              >
                NPL 딜이 모이는 곳
                <br />
                거래가 시작되는 곳
              </motion.h1>

              {/* Subtitle — single sentence, McKinsey concise (마침표/쉼표 제거) */}
              <motion.p
                variants={up}
                custom={2}
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: 'rgba(255, 255, 255, 0.78)',
                  fontWeight: 500,
                  marginBottom: '2.25rem',
                  maxWidth: 480,
                  letterSpacing: '-0.005em',
                }}
              >
                매각사와 투자자가 직접 만나는 NPL 거래소
                <br />
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                  탐색 · 실사 · 계약 · 정산
                </span>
                {' '}을 한 플랫폼에서
              </motion.p>

              {/* CTAs — Paper primary + Cyan outline secondary */}
              <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-3" style={{ marginBottom: '2rem' }}>
                <Link
                  href="/exchange"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#FFFFFF',
                    color: '#0A1628',
                    padding: '15px 28px',
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: '-0.005em',
                    borderRadius: 0,
                    border: '1px solid #FFFFFF',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.45)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <Search size={15} style={{ color: '#0A1628' }} />
                  <span style={{ color: '#0A1628' }}>매물 탐색하기</span>
                  <ArrowRight size={15} style={{ color: '#0A1628' }} />
                </Link>
                <Link
                  href="/exchange/sell"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'transparent',
                    color: '#00A9F4',
                    padding: '15px 28px',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '-0.005em',
                    borderRadius: 0,
                    border: '1px solid #00A9F4',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(0, 169, 244, 0.10)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <Building2 size={14} style={{ color: '#00A9F4' }} />
                  <span style={{ color: '#00A9F4' }}>매물 등록하기</span>
                </Link>
              </motion.div>

              {/* AI Search */}
              <motion.div variants={up} custom={4}>
                <AISearch />
              </motion.div>
            </motion.div>

            {/* ── RIGHT — LIVE Carousel (자발적 경매 ↔ NPL 분석) ──────── */}
            <div className="hidden lg:flex justify-center w-full">
              <LiveCarousel />
            </div>
          </div>
        </div>

        {/* Live Ticker */}
        <LiveTicker />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS BAR · 4개 핵심 지표 (1,234 등록 / 47 금융기관 / 2,847억 / 28,391 AI)
          McKinsey White Paper · 4-card grid · electric blue 액센트
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid rgba(5, 28, 44, 0.10)', borderBottom: '1px solid rgba(5, 28, 44, 0.10)', padding: '3.5rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'rgba(5, 28, 44, 0.10)' }}>
            {[
              { label: '등록 매물',       value: '1,234건',   delta: '+12%',    icon: <Layers size={16} style={{ color: '#0A1628' }} /> },
              { label: '협력 금융기관',   value: '47개사',    delta: '+4개사',  icon: <Building2 size={16} style={{ color: '#0A1628' }} /> },
              { label: '누적 거래액',     value: '2,847억',   delta: '+24%',    icon: <DollarSign size={16} style={{ color: '#0A1628' }} /> },
              { label: 'AI 분석 건수',    value: '28,391건',  delta: '실시간',  icon: <Brain size={16} style={{ color: '#0A1628' }} /> },
            ].map((s, i) => (
              <motion.div key={s.label} variants={up} custom={i} className="relative p-6"
                style={{
                  background: '#FFFFFF',
                  borderTop: '2px solid #2251FF',
                  borderRadius: 0,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2" style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.10)' }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#2251FF', letterSpacing: '0.06em' }}>
                    {s.delta}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 28, fontWeight: 800, color: '#0A1628',
                  letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 6,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(5, 28, 44, 0.55)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          EXCHANGE PREVIEW · 거래소 미리보기 (4 listing cards)
          기존 _landing/exchange-preview.tsx 컴포넌트 재사용
      ══════════════════════════════════════════════════════════════════ */}
      <ExchangePreview />

      {/* ══════════════════════════════════════════════════════════════════
          PROCESS · 4단계로 완결되는 거래 (탐색 → NDA·실사 → 오퍼·계약 → 정산)
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '6rem 0', borderTop: '1px solid rgba(5, 28, 44, 0.10)' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger}>
            <motion.header variants={up} custom={0} className="mb-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ width: 18, height: 1.5, background: '#2251FF', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  거래 프로세스
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800, color: '#0A1628',
                letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 12,
              }}>
                4단계로 완결되는 거래
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(5, 28, 44, 0.65)', fontWeight: 500, maxWidth: 720, margin: '0 auto', lineHeight: 1.55 }}>
                탐색 · 실사 · 계약 · 정산. AI 가 각 단계를 자동화합니다.
              </p>
            </motion.header>

            {/* Timeline — 4 steps with connector line + electric blue active state */}
            <motion.div variants={up} custom={1}
              className="grid grid-cols-2 md:grid-cols-4 mb-12"
              style={{ gap: 0, position: 'relative', maxWidth: 980, margin: '0 auto 3rem' }}
            >
              {/* connector line — McKinsey 남색 단일 라인 (전체 연결) */}
              <div className="hidden md:block" style={{ position: 'absolute', top: 24, left: '12.5%', right: '12.5%', height: 2, background: '#0A1628', zIndex: 0 }} />

              {[
                { n: '01', en: 'SCREENING' },
                { n: '02', en: 'VALIDATION' },
                { n: '03', en: 'ENGAGEMENT' },
                { n: '04', en: 'EXECUTION' },
              ].map((s) => (
                <div key={s.n} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  padding: '0 16px', position: 'relative', zIndex: 1,
                }}>
                  <div className="mck-cta-dark" style={{
                    width: 48, height: 48,
                    background: '#0A1628',
                    border: 'none',
                    borderTop: '2px solid #2251FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                    boxShadow: '0 4px 12px rgba(5, 28, 44, 0.18)',
                  }}>
                    <span style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: 16, fontWeight: 800,
                      color: '#FFFFFF',
                      letterSpacing: '-0.02em',
                    }}>
                      {s.n}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 800,
                    color: '#0A1628',
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                  }}>
                    {s.en}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Step description cards (smaller, beneath timeline) */}
            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { en: 'SCREENING',   t: '탐색 · 발견',     d: '매물 공개 + AI 자동 분석. 본인인증으로 매물·리포트 즉시 열람.',           meta: '리포트 30초' },
                { en: 'VALIDATION',  t: 'NDA · 실사',      d: 'NDA 전자서명 후 채권자료·권리관계 열람. 딜룸 채팅으로 보안 협상.',       meta: '실사 3일' },
                { en: 'ENGAGEMENT',  t: '오퍼 · 계약',     d: '오퍼 제출 → 협상 → 전자계약서 자동 생성 → 양 당사자 서명.',              meta: '협상 5일' },
                { en: 'EXECUTION',   t: '에스크로 · 정산', d: '에스크로 대금 지급 → 채권양도 등기 → 정산 완결. 분쟁 시 중재 지원.',     meta: '당일 클로징' },
              ].map((s, i) => (
                <motion.article key={s.en} variants={up} custom={i}
                  className="mck-paper"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(5, 28, 44, 0.10)',
                    borderTop: '2px solid #2251FF',
                    borderRadius: 0,
                    padding: '20px 18px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em' }}>
                    {s.en}
                  </div>
                  <h4 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    {s.t}
                  </h4>
                  <p style={{ fontSize: 11, color: 'rgba(5, 28, 44, 0.65)', lineHeight: 1.55, fontWeight: 500, flex: 1 }}>
                    {s.d}
                  </p>
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
                      background: 'rgba(34, 81, 255, 0.10)', color: '#1A47CC',
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                    }}>
                      {s.meta}
                    </span>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          DEAL ROOM PREVIEW · 보안 협상 채널 미리보기
          기존 _landing/dealroom-preview.tsx 컴포넌트 재사용
      ══════════════════════════════════════════════════════════════════ */}
      <DealRoomPreview />

      {/* ══════════════════════════════════════════════════════════════════
          ① USER TYPES · 누구를 위한 플랫폼인가
          매각사 + 투자자 2-col McKinsey editorial
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid rgba(5, 28, 44, 0.10)', padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger}>
            {/* Section header */}
            <motion.header variants={up} custom={0} className="mb-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ width: 18, height: 1.5, background: '#2251FF', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  누구를 위한 플랫폼인가
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                color: '#0A1628',
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                marginBottom: 12,
              }}>
                매각사와 투자자 모두를 위한
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(5, 28, 44, 0.65)', fontWeight: 500, maxWidth: 720, margin: '0 auto', lineHeight: 1.55 }}>
                4단계 통합 워크플로 — 탐색·실사·계약·정산이 하나의 프로세스로.
              </p>
            </motion.header>

            <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  eyebrow: '매각사 · 금융기관',
                  title: '금융기관 (매각사)',
                  desc: 'NPL 매물을 디지털로 등록하고 전국 검증된 투자자에게 노출하세요. AI 가격 산정, 입찰 관리, 딜룸 협상까지 자동화합니다.',
                  bullets: [
                    '매물 일괄 등록 및 관리',
                    '실시간 입찰 모니터링',
                    'AI 가격 자동 산정',
                    '딜룸 문서 관리',
                    '전자계약 원스톱',
                  ],
                  cta: '매물 등록하고 딜룸 시작',
                  href: '/exchange/sell',
                  icon: <Building2 size={18} style={{ color: '#2251FF' }} />,
                },
                {
                  eyebrow: '대부업체 · 투자자',
                  title: '대부업체 / 투자자',
                  desc: '전국 NPL 매물을 AI 분석으로 평가하고 수익률을 시뮬레이션하세요. 검증된 매물만, 직거래로 더 높은 수익을 실현합니다.',
                  bullets: [
                    '30+ 조건 통합 검색',
                    'AI 리스크 등급 분석',
                    '수익률 시뮬레이션',
                    '실시간 경쟁 입찰',
                    'AI 컨설턴트 상담',
                  ],
                  cta: '거래소에서 매물 탐색',
                  href: '/exchange',
                  icon: <Search size={18} style={{ color: '#2251FF' }} />,
                },
              ].map((c, i) => (
                <motion.article
                  key={c.title}
                  variants={up}
                  custom={i}
                  className="mck-paper"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(5, 28, 44, 0.10)',
                    borderTop: '2px solid #2251FF',
                    borderRadius: 0,
                    padding: '32px 32px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    boxShadow: '0 12px 24px -8px rgba(5, 28, 44, 0.10), 0 4px 8px -2px rgba(5, 28, 44, 0.05)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 40, height: 40, background: 'rgba(34, 81, 255, 0.08)', border: '1px solid rgba(34, 81, 255, 0.20)',
                    }}>
                      {c.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 3 }}>
                        {c.eyebrow}
                      </div>
                      <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                        {c.title}
                      </h3>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(5, 28, 44, 0.65)', lineHeight: 1.6, fontWeight: 500 }}>
                    {c.desc}
                  </p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderTop: '1px solid rgba(5, 28, 44, 0.08)', borderBottom: '1px solid rgba(5, 28, 44, 0.08)' }}>
                    {c.bullets.map(b => (
                      <li key={b} className="flex items-center gap-2" style={{ fontSize: 13, color: '#0A1628', fontWeight: 600 }}>
                        <CheckCircle2 size={14} style={{ color: '#2251FF', flexShrink: 0 }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link href={c.href} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 18px',
                    background: '#0A1628', color: '#FFFFFF',
                    borderTop: '2px solid #2251FF',
                    fontSize: 13, fontWeight: 800, letterSpacing: '-0.005em',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px -2px rgba(10, 22, 40, 0.20)',
                  }} className="mck-cta-dark">
                    <span style={{ color: '#FFFFFF' }}>{c.cta}</span>
                    <ArrowRight size={14} style={{ color: '#FFFFFF' }} />
                  </Link>
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ② WHY NPLATFORM (1차) · NPL 거래의 새로운 표준
          3-card editorial: 거래 효율 · 47개 금융기관 · 보안 PII
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#F8FAFC', padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger}>
            <motion.header variants={up} custom={0} className="mb-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ width: 18, height: 1.5, background: '#2251FF', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  Why NPLatform
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                color: '#0A1628',
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                marginBottom: 12,
              }}>
                NPL 거래의 새로운 표준
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(5, 28, 44, 0.65)', fontWeight: 500, maxWidth: 720, margin: '0 auto', lineHeight: 1.55 }}>
                데이터 · AI · 컴플라이언스. 한 플랫폼에서.
              </p>
            </motion.header>

            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  eyebrow: '거래 효율',
                  title: '더 빠른 클로징',
                  desc: '평균 6개월 → 2주 이내. AI 분석·자동 매칭·전자계약으로 거래 마찰 제거.',
                  stats: [
                    '평균 14일 낙찰',
                    'NPL 수수료 (0.3~1.5%) / 부동산 수수료 (~0.9% 이내)',
                    '매각사 NPL 등록비 6개월 무료',
                  ],
                  icon: <Zap size={18} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: '100여개 금융기관',
                  title: '금융기관 NPL 직거래',
                  desc: '100여개 기관이 직접 매각. 중간 유통 없이 LLR 회수율 극대화.',
                  stats: ['중간 유통 0', '기관 KYC 완료', '공개 입찰 + 프라이빗 협상'],
                  icon: <Building2 size={18} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: '보안 · PII',
                  title: '기관급 컴플라이언스',
                  desc: 'NDA / LOI 단계별 접근통제. 담보 및 개인정보는 자동 마스킹.',
                  stats: ['금감원·신용정보법 준수', '자동 PII 마스킹', '감사로그 영구 보관'],
                  icon: <ShieldCheck size={18} style={{ color: '#0A1628' }} />,
                },
              ].map((c, i) => (
                <motion.article
                  key={c.title}
                  variants={up}
                  custom={i}
                  className="mck-paper"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(5, 28, 44, 0.10)',
                    borderTop: '2px solid #2251FF',
                    borderRadius: 0,
                    padding: '28px 26px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    boxShadow: '0 8px 18px -6px rgba(5, 28, 44, 0.10)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Sky blue 칩 (첨부 2 스타일) — #A8CDE8 + ink 검정 아이콘 + 1px 7FA8C8 border */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 38, height: 38,
                      background: '#A8CDE8',
                      border: '1px solid #7FA8C8',
                      borderTop: '2px solid #2251FF',
                    }}>
                      {c.icon}
                    </span>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1A47CC', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                      {c.eyebrow}
                    </div>
                  </div>
                  <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 20, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                    {c.title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(5, 28, 44, 0.65)', lineHeight: 1.6, fontWeight: 500 }}>
                    {c.desc}
                  </p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px dashed rgba(5, 28, 44, 0.14)' }}>
                    {c.stats.map(s => (
                      <li key={s} className="flex items-center gap-2" style={{ fontSize: 12, color: '#0A1628', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ width: 4, height: 4, background: '#2251FF', flexShrink: 0 }} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ③ TRADE INFRASTRUCTURE · 거래의 모든 것, 한 곳에
          6-card editorial: 거래소·딜룸·경쟁 입찰·체결 보호·AI 분석·AI Copilot
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger}>
            <motion.header variants={up} custom={0} className="mb-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ width: 18, height: 1.5, background: '#2251FF', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  Trade Infrastructure · 거래 인프라
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                color: '#0A1628',
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                marginBottom: 12,
              }}>
                거래의 모든 것, 한 곳에
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(5, 28, 44, 0.65)', fontWeight: 500, maxWidth: 720, margin: '0 auto', lineHeight: 1.55 }}>
                거래소 · 딜룸 · 계약 · 에스크로 · AI 분석.
              </p>
            </motion.header>

            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  eyebrow: '거래소',
                  title: 'NPL 매물 거래소',
                  desc: '금융기관의 라이브 NPL 매물. 채권잔액·매각희망가·할인율·담보LTV 30+ 조건 필터 + 자연어 검색으로 즉시 매칭',
                  href: '/exchange',
                  icon: <Search size={16} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: '딜룸',
                  title: '딜룸 · NDA · 전자계약',
                  desc: '매도자·매수자 1:1 보안 채널. NDA 전자서명 → LOI → 에스크로 계약까지 원스톱 체결',
                  href: '/deals',
                  icon: <MessageSquare size={16} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: '자발적 경매',
                  title: '실시간 경쟁 입찰 (NPL/부동산)',
                  desc: '공개 경쟁 입찰 + 프라이빗 협상. 자동 입찰 에이전트로 가격 상한·기준일만 설정하면 조건 맞는 매물 자동 응찰',
                  href: '/exchange/auction',
                  icon: <Gavel size={16} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: '체결 보호',
                  title: '에스크로 · PII 마스킹',
                  desc: '대금은 에스크로 계좌로, 개인정보는 접근통제로. 안전한 체결을 위한 2중 안전장치',
                  href: '/deals',
                  icon: <Shield size={16} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: 'NPL 분석',
                  title: 'AI 딜 분석 리포트',
                  desc: '감정가·배당요구·권리분석·수익률·회수 확률까지 27초 내 자동 리포트. 거래 결정을 빠르게, 리스크를 명확하게',
                  href: '/analysis/report',
                  icon: <Brain size={16} style={{ color: '#0A1628' }} />,
                },
                {
                  eyebrow: 'AI 컨설턴트',
                  title: 'AI 거래 어시스턴트',
                  desc: '"이 매물 수익률 15% 가능해?" 처럼 대화하듯 물어보세요. 매물·시세·판례 DB 를 실시간 조회하는 거래 도우미',
                  href: '/analysis',
                  icon: <Sparkles size={16} style={{ color: '#0A1628' }} />,
                },
              ].map((c, i) => (
                <motion.article key={c.title} variants={up} custom={i}
                  className="mck-paper"
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 12,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(5, 28, 44, 0.10)',
                    borderTop: '2px solid #2251FF',
                    borderRadius: 0,
                    padding: '22px 22px 0',
                    boxShadow: '0 6px 14px -4px rgba(5, 28, 44, 0.08)',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Sky blue chip — 첨부 2 톤 일치 */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36,
                      background: '#A8CDE8', border: '1px solid #7FA8C8',
                      borderTop: '2px solid #2251FF',
                    }}>
                      {c.icon}
                    </span>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1A47CC', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                      {c.eyebrow}
                    </div>
                  </div>
                  <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                    {c.title}
                  </h3>
                  <p style={{ fontSize: 12, color: 'rgba(5, 28, 44, 0.65)', lineHeight: 1.55, fontWeight: 500, flex: 1, paddingBottom: 14 }}>
                    {c.desc}
                  </p>
                  {/* Deep Navy CTA — 첨부 색 (매물 등록하고 딜룸 시작 동일 톤) */}
                  <Link
                    href={c.href}
                    className="mck-cta-dark"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                      margin: '0 -22px',
                      padding: '14px 22px',
                      background: '#0A1628', color: '#FFFFFF',
                      borderTop: '2px solid #2251FF',
                      fontSize: 12, fontWeight: 800, letterSpacing: '-0.005em',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ color: '#FFFFFF' }}>자세히 보기</span>
                    <ArrowRight size={13} style={{ color: '#FFFFFF' }} />
                  </Link>
                </motion.article>
              ))}
            </motion.div>

            {/* CTA 2버튼 — AI 분석 체험 + 요금제 보기 (Why 2차에서 이동) */}
            <motion.div variants={up} custom={6} className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 36 }}>
              <Link href="/analysis/report" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 22px',
                background: '#0A1628', color: '#FFFFFF',
                borderTop: '2px solid #2251FF',
                fontSize: 13, fontWeight: 800, letterSpacing: '-0.005em',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(10, 22, 40, 0.20)',
              }} className="mck-cta-dark">
                <Brain size={14} style={{ color: '#FFFFFF' }} />
                <span style={{ color: '#FFFFFF' }}>AI 분석 체험</span>
                <ArrowRight size={13} style={{ color: '#FFFFFF' }} />
              </Link>
              <Link href="/pricing" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 22px',
                background: '#FFFFFF', color: '#0A1628',
                border: '1px solid #0A1628',
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em',
                textDecoration: 'none',
              }}>
                요금제 보기 <ArrowRight size={13} />
              </Link>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
          PARTNER INSTITUTIONS · 47개 금융기관이 신뢰하는 플랫폼
          McKinsey light section · bank logos + compliance badges
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '6rem 0', borderTop: '1px solid rgba(5, 28, 44, 0.10)', borderBottom: '1px solid rgba(5, 28, 44, 0.10)' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger}>
            <motion.header variants={up} custom={0} className="mb-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ width: 18, height: 1.5, background: '#2251FF', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2251FF', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  Partner Institutions · 협력 금융기관
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800, color: '#0A1628',
                letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 12,
              }}>
                47개 금융기관이 신뢰하는 플랫폼
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(5, 28, 44, 0.65)', fontWeight: 500, maxWidth: 720, margin: '0 auto', lineHeight: 1.55 }}>
                국내 주요 은행, 저축은행, 캐피탈사와 파트너십을 맺고 있습니다.
              </p>
            </motion.header>

            {/* Bank logo grid */}
            <motion.div variants={up} custom={1} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px mb-10"
              style={{ background: 'rgba(5, 28, 44, 0.10)' }}
            >
              {[
                'KB국민은행', '신한은행', '우리은행', '하나은행', '농협은행',
                '기업은행', '국민저축은행', 'OK저축은행', 'SBI저축은행', '웰컴저축은행',
                '현대캐피탈', '롯데캐피탈', 'KB캐피탈', '신한캐피탈', '하나캐피탈',
              ].map(name => (
                <div key={name} style={{
                  background: '#FFFFFF',
                  padding: '20px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#0A1628',
                  letterSpacing: '-0.005em',
                  textAlign: 'center',
                  minHeight: 64,
                }}>
                  {name}
                </div>
              ))}
            </motion.div>

            {/* Compliance badges */}
            <motion.div variants={up} custom={2} className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: <ShieldCheck size={13} />, label: '금융감독원 준수' },
                { icon: <Lock size={13} />,        label: 'AES-256 암호화' },
                { icon: <CheckCircle2 size={13} />, label: 'ISO 27001 인증' },
                { icon: <Shield size={13} />,      label: '개인정보보호법 준수' },
              ].map(b => (
                <span key={b.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  background: 'rgba(34, 81, 255, 0.05)',
                  border: '1px solid rgba(34, 81, 255, 0.20)',
                  fontSize: 12, fontWeight: 700, color: '#1A47CC',
                  letterSpacing: '-0.005em',
                }}>
                  <span style={{ color: '#2251FF' }}>{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ⑤ FINAL CTA · 지금 거래를 시작하세요
          Deep Navy + electric accent + dual CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#0A1628', padding: '4rem 0', position: 'relative', overflow: 'hidden' }}>
        {/* electric blue top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#2251FF' }} />

        <Reveal className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div variants={stagger}>
            <motion.div variants={up} custom={0} className="flex items-center justify-center gap-2 mb-3">
              <span style={{ width: 18, height: 1.5, background: '#00A9F4', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#00A9F4', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                지금 거래를 시작하세요
              </span>
            </motion.div>

            <motion.h2 variants={up} custom={1} style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              marginBottom: 8,
            }} className="mck-cta-dark">
              <span style={{ color: '#FFFFFF' }}>오늘 움직이는 NPL 딜 플로우</span>
            </motion.h2>

            <motion.p variants={up} custom={2} style={{
              fontSize: 15, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500, lineHeight: 1.5,
              marginBottom: 4, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto',
            }} className="mck-cta-dark">
              <span style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                금융기관의 라이브 매물과 활성 딜룸에서 직접 거래를 시작하세요.
              </span>
            </motion.p>
            <motion.p variants={up} custom={3} style={{
              fontSize: 12, color: '#00A9F4', fontWeight: 700, letterSpacing: '0.04em',
              marginBottom: 20,
            }} className="mck-cta-dark">
              <span style={{ color: '#00A9F4' }}>
                회원가입 즉시 · 매물 탐색 · 딜룸 협상 · 전자계약
              </span>
            </motion.p>

            <motion.div variants={up} custom={4} className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/exchange" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px',
                background: '#2251FF', color: '#FFFFFF',
                border: '1px solid #2251FF',
                fontSize: 14, fontWeight: 800, letterSpacing: '-0.005em',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(34, 81, 255, 0.45)',
              }} className="mck-cta-dark">
                <Search size={15} style={{ color: '#FFFFFF' }} />
                <span style={{ color: '#FFFFFF' }}>매물 탐색하기</span>
                <ArrowRight size={15} style={{ color: '#FFFFFF' }} />
              </Link>
              <Link href="/exchange/sell" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px',
                background: 'transparent', color: '#FFFFFF',
                border: '1px solid #FFFFFF',
                fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em',
                textDecoration: 'none',
              }} className="mck-cta-dark">
                <Building2 size={15} style={{ color: '#FFFFFF' }} />
                <span style={{ color: '#FFFFFF' }}>매물 등록하기</span>
              </Link>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>
    </div>
  );
}
