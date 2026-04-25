"use client";

import { useState, useMemo, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Landmark,
  TrendingUp,
  Shield,
  ArrowRight,
  Calculator,
  FileCheck,
  Search,
  Handshake,
  BadgeCheck,
  Percent,
  Wallet,
  Building2,
  CreditCard,
  ChevronRight,
  Star,
  Zap,
  Lock,
  Users,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Info,
  AlertCircle,
} from "lucide-react";

/* ─── Design System ─────────────────────────────────────────────── */
const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)", bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)", blue: "var(--color-brand-dark)", blueL: "var(--color-brand-bright)",
  amber: "var(--color-warning)", amber2: "#14161A", purple: "#14161A", rose: "var(--color-danger)", teal: "#14161A",
  l0: "#0D1F38", l1: "#060E1C", l2: "#030910", l3: "#1A2E4A",
  lt1: "#F0F4F8", lt2: "#94A3B8", lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
};

/* ─── Types ─────────────────────────────────────────────────────── */
type InstType = "전체" | "캐피탈" | "저축은행" | "대부업" | "신탁사" | "증권사" | "종금사";

interface LendingProduct {
  id: string;
  institution: string;
  institutionType: Exclude<InstType, "전체">;
  name: string;
  rateMin: number;
  rateMax: number;
  maxLimit: string;
  ltvLimit: string;
  term: string;
  tags: string[];
  highlight?: "인기" | "추천" | "프리미엄" | "신규";
  rating: number;
  approvalDays: number;
  minAmount: string;
}

/* ─── Mock Data ─────────────────────────────────────────────────── */
const PRODUCTS: LendingProduct[] = [
  {
    id: "bridge-1",
    institution: "한국NPL캐피탈",
    institutionType: "캐피탈",
    name: "NPL 전용 브릿지론",
    rateMin: 5.5,
    rateMax: 8.2,
    maxLimit: "100억원",
    ltvLimit: "최대 80%",
    term: "6개월 ~ 2년",
    tags: ["브릿지론", "NPL전용", "빠른승인"],
    highlight: "인기",
    rating: 4.8,
    approvalDays: 2,
    minAmount: "5,000만원",
  },
  {
    id: "mortgage-1",
    institution: "신한저축은행",
    institutionType: "저축은행",
    name: "부동산 담보대출",
    rateMin: 4.2,
    rateMax: 6.5,
    maxLimit: "200억원",
    ltvLimit: "최대 70%",
    term: "1년 ~ 5년",
    tags: ["담보대출", "저금리", "대형물건"],
    highlight: "추천",
    rating: 4.6,
    approvalDays: 3,
    minAmount: "1억원",
  },
  {
    id: "credit-1",
    institution: "NPL파이낸스",
    institutionType: "대부업",
    name: "NPL 투자 신용대출",
    rateMin: 7.0,
    rateMax: 12.0,
    maxLimit: "30억원",
    ltvLimit: "무담보",
    term: "3개월 ~ 1년",
    tags: ["신용대출", "무담보", "소액투자"],
    rating: 4.2,
    approvalDays: 1,
    minAmount: "1,000만원",
  },
  {
    id: "institution-1",
    institution: "KB부동산신탁",
    institutionType: "신탁사",
    name: "기관투자자 대출",
    rateMin: 3.8,
    rateMax: 5.5,
    maxLimit: "500억원",
    ltvLimit: "최대 65%",
    term: "1년 ~ 10년",
    tags: ["기관전용", "대규모", "최저금리"],
    highlight: "프리미엄",
    rating: 4.9,
    approvalDays: 5,
    minAmount: "10억원",
  },
  {
    id: "mezzanine-1",
    institution: "하나대체투자",
    institutionType: "증권사",
    name: "메자닌 파이낸싱",
    rateMin: 6.0,
    rateMax: 9.5,
    maxLimit: "150억원",
    ltvLimit: "최대 85%",
    term: "1년 ~ 3년",
    tags: ["메자닌", "고LTV", "유연구조"],
    rating: 4.5,
    approvalDays: 4,
    minAmount: "3억원",
  },
  {
    id: "pf-1",
    institution: "우리종합금융",
    institutionType: "종금사",
    name: "NPL PF 대출",
    rateMin: 4.5,
    rateMax: 7.0,
    maxLimit: "300억원",
    ltvLimit: "최대 75%",
    term: "2년 ~ 5년",
    tags: ["PF대출", "개발연계", "중대형"],
    highlight: "신규",
    rating: 4.4,
    approvalDays: 5,
    minAmount: "5억원",
  },
  {
    id: "rapid-1",
    institution: "드림캐피탈",
    institutionType: "캐피탈",
    name: "당일 실행 브릿지",
    rateMin: 8.0,
    rateMax: 14.0,
    maxLimit: "50억원",
    ltvLimit: "최대 75%",
    term: "3개월 ~ 1년",
    tags: ["당일실행", "긴급자금", "소형물건"],
    rating: 4.3,
    approvalDays: 1,
    minAmount: "2,000만원",
  },
  {
    id: "regional-1",
    institution: "OK저축은행",
    institutionType: "저축은행",
    name: "지방 NPL 담보론",
    rateMin: 5.0,
    rateMax: 8.5,
    maxLimit: "80억원",
    ltvLimit: "최대 70%",
    term: "1년 ~ 3년",
    tags: ["지방물건", "담보대출", "중금리"],
    rating: 4.1,
    approvalDays: 3,
    minAmount: "5,000만원",
  },
];

const PROCESS_STEPS = [
  {
    step: 1,
    title: "대출 상담 신청",
    desc: "투자 물건 정보와 필요 자금을 입력하고 맞춤 상담을 신청합니다.",
    icon: Search,
    color: C.blue,
    bg: "rgba(20,22,26,.12)",
  },
  {
    step: 2,
    title: "금융사 AI 매칭",
    desc: "AI가 조건에 최적화된 금융 상품과 금융사를 자동으로 매칭합니다.",
    icon: Handshake,
    color: C.em,
    bg: "rgba(20,22,26,.12)",
  },
  {
    step: 3,
    title: "심사 및 승인",
    desc: "제출 서류를 바탕으로 신속한 심사가 진행됩니다.",
    icon: FileCheck,
    color: C.amber,
    bg: "rgba(20,22,26,.12)",
  },
  {
    step: 4,
    title: "대출 실행",
    desc: "승인 후 빠르게 자금이 집행되어 즉시 투자에 활용 가능합니다.",
    icon: BadgeCheck,
    color: C.teal,
    bg: "rgba(20,22,26,.12)",
  },
];

const INST_FILTERS: InstType[] = ["전체", "캐피탈", "저축은행", "대부업", "신탁사", "증권사", "종금사"];

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

const HIGHLIGHT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  인기:     { bg: "rgba(27,27,31,.12)",   color: C.rose,   border: "rgba(27,27,31,.25)" },
  추천:     { bg: "rgba(20,22,26,.12)",  color: C.em,     border: "rgba(20,22,26,.25)" },
  프리미엄: { bg: "rgba(20,22,26,.12)",  color: C.amber,  border: "rgba(20,22,26,.25)" },
  신규:     { bg: "rgba(20,22,26,.12)",  color: C.blue,   border: "rgba(20,22,26,.25)" },
};

const INST_ACCENT: Record<Exclude<InstType, "전체">, string> = {
  캐피탈:  C.blue,
  저축은행: C.em,
  대부업:  C.rose,
  신탁사:  C.purple,
  증권사:  C.amber,
  종금사:  C.teal,
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} style={{ color: s <= Math.round(rating) ? C.amber : 'rgba(255,255,255,0.2)', fill: s <= Math.round(rating) ? C.amber : 'rgba(255,255,255,0.2)' }} />
      ))}
      <span style={{ marginLeft: 4, fontSize: '0.6875rem', fontWeight: 700, color: C.amber }}>{rating}</span>
    </div>
  );
}

/* ─── Product Card ──────────────────────────────────────────────── */
const MARKET_MIN = 3.8;
const MARKET_MAX = 14.0;

function ProductCard({ p }: { p: LendingProduct }) {
  const accent = INST_ACCENT[p.institutionType];
  const hlStyle = p.highlight ? HIGHLIGHT_STYLES[p.highlight] : null;
  const initials = p.institution.slice(0, 2);
  const ratePos = Math.max(0, Math.min(100, ((p.rateMin - MARKET_MIN) / (MARKET_MAX - MARKET_MIN)) * 100));
  const ratePosMax = Math.max(0, Math.min(100, ((p.rateMax - MARKET_MIN) / (MARKET_MAX - MARKET_MIN)) * 100));
  const speedColor = p.approvalDays <= 1 ? C.em : p.approvalDays <= 2 ? C.blue : p.approvalDays <= 3 ? C.amber : C.lt4;
  const speedLabel = p.approvalDays <= 1 ? "당일" : `${p.approvalDays}일`;
  const rateLabel = p.rateMin <= 5.5 ? "★ 저금리" : p.rateMin <= 8.0 ? "보통 수준" : "고금리";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      style={{
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid rgba(255,255,255,0.07)`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}
      whileHover={{ y: -5, boxShadow: `0 20px 48px rgba(0,0,0,0.28), 0 0 0 1px ${accent}50` }}
    >
      {/* ── DARK HEADER ── */}
      <div style={{ backgroundColor: C.bg3, padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -50, right: -40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Logo + Name row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            backgroundColor: `${accent}22`, border: `1.5px solid ${accent}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9375rem', fontWeight: 800, color: accent, letterSpacing: '-0.02em',
          }}>{initials}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: `${accent}22`, color: accent, border: `1px solid ${accent}35`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.institutionType}</span>
              {hlStyle && <span style={{ fontSize: '0.5625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: hlStyle.bg, color: hlStyle.color, border: `1px solid ${hlStyle.border}` }}>{p.highlight}</span>}
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: C.l0, marginBottom: 2, lineHeight: 1.2 }}>{p.institution}</h3>
            <p style={{ fontSize: '0.75rem', color: C.lt4 }}>{p.name}</p>
          </div>
        </div>

        {/* Rating + Speed row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StarRating rating={p.rating} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: speedColor, boxShadow: `0 0 8px ${speedColor}90` }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: speedColor }}>{speedLabel} 실행</span>
          </div>
        </div>
      </div>

      {/* ── LIGHT BODY ── */}
      <div style={{ backgroundColor: C.l0, padding: '18px 20px 16px' }}>

        {/* Rate Hero */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10 }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>{p.rateMin}%</span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: C.lt4 }}>~</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: C.lt2, letterSpacing: '-0.02em', lineHeight: 1 }}>{p.rateMax}%</span>
            <span style={{ fontSize: '0.6875rem', color: C.lt4, paddingBottom: 2 }}>연이율</span>
          </div>

          {/* Market position bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.5625rem', color: C.lt4 }}>시장최저 3.8%</span>
              <span style={{ fontSize: '0.5625rem', color: accent, fontWeight: 700 }}>{rateLabel}</span>
              <span style={{ fontSize: '0.5625rem', color: C.lt4 }}>시장최고 14.0%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, backgroundColor: C.l2, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', height: '100%', borderRadius: 999,
                left: `${ratePos}%`, right: `${100 - ratePosMax}%`,
                background: `linear-gradient(90deg, ${accent}80 0%, ${accent} 100%)`,
              }} />
            </div>
          </div>
        </div>

        {/* 4-metric grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[
            { label: '최대 한도', value: p.maxLimit },
            { label: '최대 LTV', value: p.ltvLimit },
            { label: '대출 기간', value: p.term },
            { label: '최소 금액', value: p.minAmount },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: C.l1, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.l3}` }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{m.label}</p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: C.lt1 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Feature tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {p.tags.map(t => (
            <span key={t} style={{ fontSize: '0.625rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, backgroundColor: `${accent}10`, color: accent, border: `1px solid ${accent}28` }}>{t}</span>
          ))}
        </div>

        {/* Dual CTA */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, padding: '9px 0', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 700,
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`,
            color: '#FFFFFF', border: 'none', cursor: 'pointer',
            boxShadow: `0 4px 14px ${accent}35`,
          }}>
            대출 신청
          </button>
          <button
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 700,
              backgroundColor: 'transparent', color: C.lt2,
              border: `1.5px solid ${C.l3}`, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = accent;
              (e.currentTarget as HTMLElement).style.color = accent;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = C.l3;
              (e.currentTarget as HTMLElement).style.color = C.lt2;
            }}
          >
            상담 문의
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function LenderPage() {
  const [instFilter, setInstFilter] = useState<InstType>("전체");
  const [investAmt, setInvestAmt] = useState(500_000_000);
  const [loanRatio, setLoanRatio] = useState(60);
  const [rate, setRate] = useState(5.5);
  const [months, setMonths] = useState(12);

  const heroRef = useRef(null);
  const processRef = useRef(null);
  const processInView = useInView(processRef, { once: true, margin: "-50px" });
  const cardsRef = useRef(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-50px" });

  const sim = useMemo(() => {
    const loanAmt = investAmt * (loanRatio / 100);
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment =
      monthlyRate > 0
        ? (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1)
        : loanAmt / months;
    const totalInterest = monthlyPayment * months - loanAmt;
    return { loanAmt, monthlyPayment, totalInterest };
  }, [investAmt, loanRatio, rate, months]);

  const filtered = useMemo(() => {
    if (instFilter === "전체") return PRODUCTS;
    return PRODUCTS.filter((p) => p.institutionType === instFilter);
  }, [instFilter]);

  const avgRate = (PRODUCTS.reduce((s, p) => s + (p.rateMin + p.rateMax) / 2, 0) / PRODUCTS.length).toFixed(1);

  const KPI_STRIP = [
    { label: "평균 금리", value: `${avgRate}%`, sub: "제휴사 평균", icon: Percent, color: C.emL },
    { label: "최대 LTV", value: "85%", sub: "메자닌 기준", icon: BarChart3, color: C.blueL },
    { label: "대출 실행일", value: "1일~", sub: "최소 실행 기간", icon: Zap, color: C.amber2 },
    { label: "제휴 금융사", value: "24개사", sub: "엄선된 파트너", icon: Building2, color: "#C084FC" },
  ];

  return (
    <div style={{ background: C.l1, minHeight: "100vh" }}>

      {/* ══ DARK HERO ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden" style={{ backgroundColor: C.bg1 }}>
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,22,26,.20) 0%, transparent 70%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 pb-0 pt-14 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(20,22,26,.12)", color: C.blueL, border: `1px solid rgba(20,22,26,.25)` }}>
              <Landmark size={11} /> Lending Connect
            </div>
            <h1 className="text-[36px] font-black leading-tight tracking-tight lg:text-[48px]" style={{ color: C.l0 }}>
              NPL 담보 대출
            </h1>
            <p className="mt-2 text-[16px] font-medium" style={{ color: C.lt4 }}>
              낙찰 후 즉시 실행 가능한 브릿지 대출 · AI 자동 매칭
            </p>
            <p className="mt-3 max-w-xl text-[14px]" style={{ color: C.lt3 }}>
              NPLatform이 엄선한 제휴 금융사의 NPL 전용 상품을 한눈에 비교하고,
              최적의 조건으로 투자 자금을 즉시 확보하세요.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold"
                style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueL})`, color: C.l0 }}
              >
                <CreditCard size={14} /> 대출 상담 신청
              </button>
              <Link
                href="/exchange"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium transition-colors"
                style={{ background: "rgba(255,255,255,.07)", color: C.lt3, border: `1px solid rgba(255,255,255,.1)` }}
              >
                거래소 돌아가기 <ArrowRight size={13} />
              </Link>
            </div>
          </motion.div>

          {/* KPI Strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl lg:grid-cols-4"
            style={{ background: "rgba(255,255,255,.05)", border: `1px solid rgba(255,255,255,.07)` }}
          >
            {KPI_STRIP.map((k, i) => (
              <div key={k.label} className="flex items-center gap-3 px-5 py-5"
                style={{ background: i % 2 === 0 ? "rgba(255,255,255,.02)" : "transparent" }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `rgba(${k.color === C.blueL ? "96,165,250" : k.color === C.emL ? "52,211,153" : k.color === C.amber2 ? "252,211,77" : "192,132,252"},.15)` }}>
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-[22px] font-black tabular-nums leading-none" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.lt4 }}>{k.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center gap-5 py-5">
            {[
              { icon: Shield, text: "금융위원회 인가" },
              { icon: Lock, text: "256-bit SSL 암호화" },
              { icon: Users, text: "누적 이용자 12,000+" },
              { icon: BarChart3, text: "대출 실행 총액 1.2조원" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.lt4 }}>
                <b.icon size={12} style={{ color: C.lt3 }} />
                {b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FILTER + PRODUCT CARDS ══════════════════════════════════ */}
      <div style={{ background: C.l2 }}>
        {/* Filter bar */}
        <div className="sticky top-0 z-30 border-b" style={{ background: C.l0, borderColor: C.l3 }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
              {INST_FILTERS.map((f) => {
                const active = instFilter === f;
                const accent = f !== "전체" ? INST_ACCENT[f as Exclude<InstType, "전체">] : C.lt1;
                return (
                  <button
                    key={f}
                    onClick={() => setInstFilter(f)}
                    className="shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all whitespace-nowrap"
                    style={{
                      background: active ? accent : C.l2,
                      color: active ? C.l0 : C.lt3,
                      border: `1px solid ${active ? accent : C.l3}`,
                    }}
                  >
                    {f}
                    {f !== "전체" && (
                      <span className="ml-1 opacity-70 text-[10px]">
                        {PRODUCTS.filter((p) => p.institutionType === f).length}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="ml-auto shrink-0 text-[11px]" style={{ color: C.lt4 }}>
                {filtered.length}개 상품
              </div>
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div ref={cardsRef} className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-[20px] font-black" style={{ color: C.lt1 }}>금융 상품 비교</h2>
              <p className="text-[13px] mt-0.5" style={{ color: C.lt3 }}>
                NPL 투자에 최적화된 금융 상품을 한눈에 비교해 보세요
              </p>
            </div>
            <button className="hidden sm:flex items-center gap-1 text-[12px] font-semibold" style={{ color: C.blue }}>
              전체 상품 보기 <ArrowRight size={13} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-20 rounded-2xl"
                style={{ background: C.l0, border: `1px solid ${C.l3}` }}
              >
                <BarChart3 size={28} style={{ color: C.lt4 }} className="mb-2" />
                <p className="text-[14px] font-semibold" style={{ color: C.lt2 }}>해당 유형의 상품이 없습니다</p>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                  >
                    <ProductCard p={p} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══ LOAN SIMULATOR ═══════════════════════════════════════════ */}
      <section className="border-y px-6 py-14 lg:px-8" style={{ borderColor: C.l3, background: C.l0 }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(20,22,26,.1)", color: C.em, border: `1px solid rgba(20,22,26,.2)` }}>
              <Calculator size={12} /> 시뮬레이터
            </div>
            <h2 className="text-[24px] font-black" style={{ color: C.lt1 }}>대출 시뮬레이터</h2>
            <p className="mt-1 text-[13px]" style={{ color: C.lt3 }}>
              투자 규모와 조건을 입력하면 예상 대출 비용을 즉시 확인할 수 있습니다
            </p>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-2">
            {/* Inputs */}
            <div className="rounded-2xl p-6 space-y-6" style={{ background: C.l2, border: `1px solid ${C.l3}` }}>
              {[
                {
                  label: "투자 금액",
                  display: formatKRW(investAmt),
                  min: 100_000_000, max: 10_000_000_000, step: 100_000_000,
                  value: investAmt, onChange: setInvestAmt,
                  minLabel: "1억", maxLabel: "100억",
                  color: C.blue,
                },
                {
                  label: "대출 비율 (LTV)",
                  display: `${loanRatio}%`,
                  min: 10, max: 90, step: 5,
                  value: loanRatio, onChange: setLoanRatio,
                  minLabel: "10%", maxLabel: "90%",
                  color: C.blue,
                },
                {
                  label: "예상 금리",
                  display: `${rate}%`,
                  min: 2, max: 15, step: 0.1,
                  value: rate, onChange: setRate,
                  minLabel: "2%", maxLabel: "15%",
                  color: C.em,
                  displayColor: C.em,
                },
                {
                  label: "대출 기간",
                  display: `${months}개월`,
                  min: 3, max: 60, step: 3,
                  value: months, onChange: setMonths,
                  minLabel: "3개월", maxLabel: "60개월",
                  color: C.blue,
                },
              ].map((field) => (
                <div key={field.label}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-semibold" style={{ color: C.lt2 }}>{field.label}</label>
                    <span className="text-[14px] font-black" style={{ color: (field as { displayColor?: string }).displayColor ?? C.lt1 }}>
                      {field.display}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: field.color }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px]" style={{ color: C.lt4 }}>{field.minLabel}</span>
                    <span className="text-[10px]" style={{ color: C.lt4 }}>{field.maxLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.l3}` }}>
                {/* Dark result header */}
                <div className="px-6 py-4" style={{ backgroundColor: C.bg3 }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: C.lt4 }}>시뮬레이션 결과</p>
                  <p className="text-[28px] font-black tabular-nums" style={{ color: C.blueL }}>
                    {formatKRW(Math.round(sim.loanAmt))}
                  </p>
                  <p className="text-[12px]" style={{ color: C.lt4 }}>대출 금액 ({loanRatio}% LTV)</p>
                </div>
                {/* Light result body */}
                <div className="px-6 py-5 space-y-4" style={{ background: C.l0 }}>
                  {[
                    { label: "월 상환액", value: formatKRW(Math.round(sim.monthlyPayment)), color: C.blue, bold: true },
                    { label: "총 이자 비용", value: formatKRW(Math.round(sim.totalInterest)), color: C.rose, bold: true },
                    { label: "총 상환 금액", value: formatKRW(Math.round(sim.loanAmt + sim.totalInterest)), color: C.lt1, bold: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between pb-3 border-b last:border-0 last:pb-0"
                      style={{ borderColor: C.l3 }}>
                      <span className="text-[13px]" style={{ color: C.lt3 }}>{row.label}</span>
                      <span className="text-[16px] font-black tabular-nums" style={{ color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommendation */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(20,22,26,.06)", border: `1px solid rgba(20,22,26,.2)` }}>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(20,22,26,.15)" }}>
                    <Zap size={14} style={{ color: C.em }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: C.em }}>AI 추천 금융 상품</p>
                    <p className="text-[12px] mt-1" style={{ color: C.lt2 }}>
                      입력하신 조건 기준,{" "}
                      <strong style={{ color: C.lt1 }}>한국NPL캐피탈의 NPL 전용 브릿지론</strong>이 최적입니다.
                      예상 금리 5.5%~8.2%, 최대 LTV 80% 가능.
                    </p>
                    <button className="mt-2 text-[11px] font-bold" style={{ color: C.em }}>
                      바로 신청 <ArrowRight size={10} className="inline" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROCESS STEPS ════════════════════════════════════════════ */}
      <section ref={processRef} className="px-6 py-14 lg:px-8" style={{ backgroundColor: C.bg3 }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,.07)", color: C.lt3, border: `1px solid rgba(255,255,255,.1)` }}>
              <Info size={11} /> 대출 절차
            </div>
            <h2 className="text-[24px] font-black" style={{ color: C.l0 }}>대출 신청 프로세스</h2>
            <p className="mt-1 text-[13px]" style={{ color: C.lt4 }}>
              4단계 간편 프로세스로 빠르게 투자 자금을 확보하세요
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                animate={processInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.35, delay: i * 0.1 }}
                className="relative rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,.04)", border: `1px solid rgba(255,255,255,.07)` }}
              >
                {/* Connector arrow */}
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                    <ChevronRight size={16} style={{ color: C.lt3 }} />
                  </div>
                )}

                <div className="flex h-11 w-11 items-center justify-center rounded-xl mb-4"
                  style={{ background: s.bg }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.color }}>
                  STEP {s.step}
                </span>
                <h3 className="text-[14px] font-bold mt-1 mb-2" style={{ color: C.l1 }}>{s.title}</h3>
                <p className="text-[12px]" style={{ color: C.lt4 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Required docs */}
          <div className="mt-8 rounded-2xl p-6" style={{ background: "rgba(255,255,255,.03)", border: `1px solid rgba(255,255,255,.06)` }}>
            <div className="flex items-center gap-2 mb-4">
              <FileCheck size={14} style={{ color: C.blueL }} />
              <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: C.blueL }}>필요 서류 안내</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {["경매 낙찰 영수증", "신분증 사본", "법인등기부등본", "재무제표 최근 2년", "담보물 감정평가서", "사업자등록증"].map((doc) => (
                <div key={doc} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.lt4 }}>
                  <CheckCircle2 size={11} style={{ color: C.em }} />
                  {doc}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════ */}
      <section className="px-6 py-14 lg:px-8" style={{ background: C.l1 }}>
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.l3}` }}>
            <div className="px-8 py-10" style={{ backgroundColor: C.bg2 }}>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(20,22,26,.15)", border: `1px solid rgba(20,22,26,.25)` }}>
                <TrendingUp size={28} style={{ color: C.blueL }} />
              </div>
              <h2 className="text-[22px] font-black" style={{ color: C.l0 }}>
                지금 바로 최적의 투자 자금을 확보하세요
              </h2>
              <p className="mt-3 text-[13px] max-w-md mx-auto" style={{ color: C.lt4 }}>
                NPLatform의 AI 매칭 시스템이 투자 조건에 맞는 최적의 금융 상품을
                추천해 드립니다. 평균 3.2영업일 내 승인, 업계 최저 수준의 금리.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold"
                  style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueL})`, color: C.l0 }}
                >
                  <CreditCard size={15} />
                  무료 대출 상담 신청
                </button>
                <Link
                  href="/exchange"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-medium"
                  style={{ background: "rgba(255,255,255,.07)", color: C.lt3, border: `1px solid rgba(255,255,255,.1)` }}
                >
                  NPL 매물 둘러보기 <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ DISCLAIMER ════════════════════════════════════════════ */}
      <div className="border-t px-6 py-5 lg:px-8" style={{ borderColor: C.l3, background: C.l1 }}>
        <div className="mx-auto max-w-7xl flex items-start gap-2">
          <AlertCircle size={12} className="mt-0.5 shrink-0" style={{ color: C.lt4 }} />
          <p className="text-[11px]" style={{ color: C.lt4 }}>
            <span className="font-semibold" style={{ color: C.lt3 }}>대출 유의사항:</span>{" "}
            대출 상품은 원금 및 이자 상환 의무가 있으며, 신용등급에 따라 금리가 달라질 수 있습니다.
            금리 및 한도는 실제 심사 결과에 따라 변경될 수 있습니다. 본 서비스는 정보 제공 목적이며 대출 권유가 아닙니다.
          </p>
        </div>
      </div>
    </div>
  );
}
