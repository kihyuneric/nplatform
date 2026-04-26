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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   DESIGN TOKENS ??NQ ?ъ꽕怨?(2026-04-20)
   ??洹쒖튃: "?쇱씠?몃え?쒖뿉 ?곗깋 湲???덈? 湲덉?"
   ??2異??좏겙: HERO(??긽 ?ㅼ씠鍮??고넠 ?띿뒪?? / ADAPTIVE(?덉씠???뚮쭏諛섏쓳 ?띿뒪??
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
const C = {
  /* ?? HERO Surface: 留덉????곸뿭 쨌 ??긽 ?ㅼ씠鍮?(釉뚮옖???섎룄) ?? */
  bg0: "var(--hero-bg)",           // #0B1F3A
  bg1: "var(--hero-bg)",           // hero section bg
  bg2: "var(--hero-bg-elevated)",  // #0D2448
  bg3: "var(--hero-bg-elevated)",
  bg4: "var(--hero-bg-soft)",      // #12305B

  /* ?? HERO Foreground: ??긽 ?고넠 ?? */
  fgh:  "var(--fg-on-hero)",       // rgba(255,255,255,0.96) 18:1
  fghd: "var(--fg-on-hero-dim)",   // rgba(255,255,255,0.72) 12:1
  fghm: "var(--fg-on-hero-muted)", // rgba(255,255,255,0.55) 7:1

  /* ?? ADAPTIVE Layer: 蹂몃Ц ?뱀뀡 쨌 ?쇱씠???ㅽ겕 ?먮룞 ?꾪솚 ?? */
  light0: "var(--layer-1-bg)",     // ?쇱씠??#FFFFFF 쨌 ?ㅽ겕 #0D1525
  light1: "var(--layer-0-bg)",     // ?쇱씠??#F3F5F8 쨌 ?ㅽ겕 #030810 (?섏씠吏 諛뷀깢)
  light2: "var(--layer-2-bg)",     // ?쇱씠??#F8FAFC 쨌 ?ㅽ겕 #162035

  /* ?? ADAPTIVE Foreground: WCAG AA+ ?먮룞 ?뺣낫 ?? */
  fg1:  "var(--fg-strong)",        // 15:1 쨌 ?ㅻ뵫
  fg2:  "var(--fg-default)",       // 10:1 쨌 蹂몃Ц
  fg3:  "var(--fg-muted)",         // 5.5:1 쨌 罹≪뀡
  fg4:  "var(--fg-subtle)",        // 3.5:1 쨌 ??湲???꾩씠肄섎쭔

  /* ?? Semantic (釉뚮옖???명뀗??쨌 ?뚮쭏 諛섏쓳) ?? */
  em: "var(--color-positive)",
  emL: "#051C2C",
  blue: "var(--color-brand-bright)",
  amber: "var(--color-warning)",
  purple: "#051C2C",
  rose: "var(--color-danger)",
  teal: "#051C2C",

  /* ?? Brand Intent (?뚮쭏 臾닿? 怨좎젙) ?? */
  brandHero: "#0A1628",
  textOnBrand: "#FFFFFF",   // 釉뚮옖??而щ윭/?ㅼ씠鍮?諛곌꼍 ?꾩뿉留??ъ슜 (?쇱씠?몃え???곕컮?뺤뿉 ?덈? X)
  onEmerald: "#FFFFFF",     // emerald 洹몃씪?곗씠??踰꾪듉 ??};

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   ANIMATION VARIANTS
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   ANIMATED COUNTER
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   LIVE TICKER
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
const TICKS = [
  { t: "嫄곕옒?꾨즺", v: "3,847嫄?, c: C.em, icon: "?? },
  { t: "珥?嫄곕옒??, v: "??,847??, c: C.blue, icon: "?? },
  { t: "AI 遺꾩꽍", v: "28,391嫄?, c: C.purple, icon: "?? },
  { t: "?깅줉 留ㅻЪ", v: "1,234嫄?, c: C.amber, icon: "?? },
  { t: "?묐젰 湲덉쑖湲곌?", v: "47媛쒖궗", c: C.em, icon: "?룱" },
  { t: "?됯퇏 ?섏씡瑜?, v: "18.4%??, c: C.rose, icon: "%" },
  { t: "嫄곕옒?꾨즺", v: "3,847嫄?, c: C.em, icon: "?? },
  { t: "珥?嫄곕옒??, v: "??,847??, c: C.blue, icon: "?? },
  { t: "AI 遺꾩꽍", v: "28,391嫄?, c: C.purple, icon: "?? },
  { t: "?깅줉 留ㅻЪ", v: "1,234嫄?, c: C.amber, icon: "?? },
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   DEAL CARD MOCKUP  ???ㅼ젣 留ㅻЪ ?섏씠吏(exchange) 移대뱶 ?붿옄??諛섏쁺
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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
        McKinsey Editorial Card ??White paper on navy hero
        ?먯튃: ?됱쓣 梨꾩슦吏 ?딄퀬 typography hierarchy 濡??꾧퀎
        - 移대뱶 = ??醫낆씠 (#FFFFFF)
        - 蹂몃Ц = ink (#0A1628) + ?뚯깋 ?④퀎 (#3A4A5C, #6B7280)
        - 媛뺤“ = ink Black + ExtraBold + ???ъ씠利?(????媛뺤“)
        - 1??brass accent (gold) ??醫뚯긽??hairline ?섎굹留?        - CTA = ink 寃???ш컖 + ??湲??(radius 0)
      */}
      <div className="mck-paper relative overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(5, 28, 44, 0.10)',
          borderTop: '2px solid var(--color-editorial-gold, #2251FF)',
          boxShadow: '0 24px 48px -12px rgba(5, 28, 44, 0.30), 0 8px 16px -4px rgba(5, 28, 44, 0.15)',
          borderRadius: 0,
        }}>

        {/* Header strip ??institution */}
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(5, 28, 44, 0.10)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center"
              style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.10)' }}>
              <Building2 size={13} style={{ color: 'rgba(5, 28, 44, 0.55)' }} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-tight" style={{ color: '#0A1628' }}>?곕━???/div>
              <div className="text-[9px] uppercase tracking-[0.10em] mt-0.5" style={{ color: 'rgba(5, 28, 44, 0.50)', fontWeight: 600 }}>湲덉쑖湲곌? 쨌 D-5</div>
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
                <MapPin size={10} /> ?쒖슱 媛뺣궓援?쨌 ?꾪뙆??              </div>
              <div className="text-[15px] font-extrabold" style={{ color: '#0A1628', letterSpacing: '-0.012em', lineHeight: 1.25 }}>
                ?꾩쓽留ㅺ컖 쨌 ?꾪뙆???대낫
              </div>
              <div className="text-[9px] mt-1 font-mono uppercase tracking-[0.06em]" style={{ color: 'rgba(5, 28, 44, 0.40)' }}>
                NPL-2026-0412
              </div>
            </div>
            <div className="shrink-0 px-1.5 py-1 text-[10px] font-extrabold tracking-[0.06em]"
              style={{ background: '#0A1628', color: '#FFFFFF', borderRadius: 0 }}>
              AI 쨌 A
            </div>
          </div>

          {/* Key figures ??留ㅺ컖?щ쭩媛留???媛뺤“, ?섎㉧吏???묎쾶 */}
          <div className="pt-1">
            {/* 留ㅺ컖?щ쭩媛 = HERO ?レ옄 */}
            <div className="mb-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>
                留ㅺ컖?щ쭩媛
              </div>
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: '#0A1628', letterSpacing: '-0.02em', lineHeight: 1 }}>
                8.5<span className="text-xl font-bold" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>??/span>
              </div>
            </div>
            {/* sub-metrics: 梨꾧텒?붿븸 쨌 媛먯젙媛 쨌 ?좎씤??*/}
            <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid rgba(5, 28, 44, 0.10)' }}>
              {[
                { label: "梨꾧텒?붿븸", value: "12.0", unit: "?? },
                { label: "媛먯젙媛", value: "10.2", unit: "?? },
                { label: "?좎씤??, value: "29.2", unit: "%", brass: true },
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
              <span className="text-[10px] font-semibold uppercase tracking-[0.10em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>?덉긽 ?덇컧??/span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: '#0A1628' }}>3.5??/span>
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
              <span className="text-[10px] font-semibold uppercase tracking-[0.10em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>?먮즺 ?꾩꽦??/span>
            </div>
            <span className="text-[10px] font-semibold tabular-nums uppercase tracking-[0.06em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>?먮즺 5/6</span>
          </div>

          {/* Provided chips ??outline only */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: "媛먯젙?됯?", ok: true }, { label: "?깃린", ok: true },
              { label: "沅뚮━", ok: true }, { label: "?꾩감", ok: true },
              { label: "?ъ쭊", ok: true }, { label: "?щТ", ok: false },
            ].map(c => (
              <span key={c.label} className="text-[10px] font-semibold px-1.5 py-0.5"
                style={{
                  background: '#FFFFFF',
                  color: c.ok ? '#0A1628' : 'rgba(5, 28, 44, 0.40)',
                  border: c.ok ? '1px solid rgba(5, 28, 44, 0.30)' : '1px dashed rgba(5, 28, 44, 0.20)',
                  borderRadius: 0,
                  letterSpacing: '0.02em',
                }}>
                {c.ok ? "?? : "쨌"} {c.label}
              </span>
            ))}
          </div>

          {/* CTA ??ink black + sharp edge */}
          <div className="py-2.5 px-4 text-center cursor-pointer font-extrabold text-xs transition-all hover:opacity-90 flex items-center justify-between"
            style={{
              background: '#0A1628',
              color: '#FFFFFF',
              border: '1px solid #0A1628',
              borderRadius: 0,
              letterSpacing: '0.04em',
            }}>
            <span>?쒕８ ?낆옣 쨌 ?곸꽭</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Floating badges ??high contrast on navy hero */}
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
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: '#FFFFFF' }}>AI 遺꾩꽍 ?꾨즺</span>
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
            ?좎씤??<strong style={{ color: '#0A1628', fontWeight: 800 }}>29.2%</strong> ?ㅼ떆媛?          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   AI SEARCH BAR
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
const SUGGESTIONS = [
  "?쒖슱 媛뺣궓 ?꾪뙆??NPL 5???댄븯 ??꾪뿕",
  "?섏씡瑜?20% ?댁긽 ?곸뾽??臾쇨굔 寃??,
  "?異뺤????곗껜 6媛쒖썡 ?댁긽 ?대낫 A?깃툒",
  "寃쎈ℓ 2?쒖쐞 ?대낫 ?쒖슱쨌寃쎄린 吏??,
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
      {/* AI ?쇰꺼 + ?덈궡 ??navy ??brass + ??(吏곸젒 hex) */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1"
          style={{ background: 'transparent', border: '1px solid #2251FF', borderRadius: 0 }}>
          <Brain size={11} style={{ color: '#00A9F4' }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: '#00A9F4' }}>AI ?먯뿰??寃??/span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.78)' }}>?먰븯??臾쇨굔???먯쑀濡?쾶 ?ㅻ챸?섏꽭??/span>
      </div>

      {/* 寃??諛뺤뒪 ????醫낆씠 (navy ??媛뺥븳 contrast) */}
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
          placeholder={!focused ? SUGGESTIONS[idx] : "?? ?쒖슱 媛뺣궓 ?꾪뙆??NPL ?섏씡瑜?20% ?댁긽 A?깃툒"}
          className="flex-1 bg-transparent text-sm outline-none px-3 py-3.5"
          style={{ color: '#0A1628', caretColor: '#2251FF' }}
          aria-label="NPL ?먯뿰??寃??
        />
        <div className="flex items-center gap-1.5 mx-2 px-2.5 py-1.5 flex-shrink-0"
          style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.15)', borderRadius: 0 }}>
          <Sparkles size={10} style={{ color: '#2251FF' }} />
          <span className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: '#0A1628' }}>AI</span>
        </div>
        <Link href={`/exchange${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className="text-sm font-bold px-5 py-3.5 flex-shrink-0 transition-all"
          style={{ background: '#0A1628', color: '#FFFFFF', borderRadius: 0, letterSpacing: '0.04em' }}>
          寃??        </Link>
      </div>

      {/* Quick chips ??navy ????outline + ??湲??*/}
      <div className="flex flex-wrap gap-2 mt-3">
        {["?쒖슱 ?꾪뙆??, "?섏씡瑜?20%+", "1???댄븯", "A?깃툒 ??꾪뿕"].map(tag => (
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   MICRO CHART (Bloomberg-style mini sparkline)
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   MAIN PAGE
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export default function LandingPage() {

  const stats = [
    { label: "?깅줉 留ㅻЪ", val: 1234, suffix: "嫄?, icon: <Layers size={16} style={{ color: C.em }} />, change: "+12%", up: true, color: C.em },
    { label: "?묐젰 湲덉쑖湲곌?", val: 47, suffix: "媛쒖궗", icon: <Building2 size={16} style={{ color: C.blue }} />, change: "+4媛쒖궗", up: true, color: C.blue },
    { label: "?꾩쟻 嫄곕옒??, val: 2847, suffix: "??, icon: <DollarSign size={16} style={{ color: C.amber }} />, change: "+24%", up: true, color: C.amber },
    { label: "AI 遺꾩꽍 嫄댁닔", val: 28391, suffix: "嫄?, icon: <Brain size={16} style={{ color: C.purple }} />, change: "?ㅼ떆媛?, up: true, color: C.purple },
  ];

  // McKinsey mono editorial v4 ??6媛?移대뱶 紐⑤몢 ?숈씪 ??(?ъ슜??5踰?吏?? "?뚮줉?щ줉 X")
  // 李⑤퀎?붾뒗 ?쇰꺼 ?띿뒪??+ ?꾩씠肄?紐⑥뼇 + ?꾩튂濡? color 李⑤퀎??X.
  const MCK_ICON  = "var(--color-mck-blue, #2251FF)"      // 紐⑤뱺 ?꾩씠肄??숈씪 bright blue
  const MCK_TAG_C = "var(--color-mck-blue, #2251FF)"      // 紐⑤뱺 ?쇰꺼 ?숈씪 ??  const features = [
    {
      icon: <Search size={20} style={{ color: MCK_ICON }} />, tag: "嫄곕옒??, tagColor: MCK_TAG_C,
      title: "NPL 留ㅻЪ 嫄곕옒??,
      desc: "1,234嫄댁쓽 ?쇱씠釉?NPL 留ㅻЪ. 梨꾧텒?붿븸쨌留ㅺ컖?щ쭩媛쨌?좎씤?㉱룸떞蹂퀽TV 30+ 議곌굔 ?꾪꽣 + ?먯뿰??寃?됱쑝濡?利됱떆 留ㅼ묶.",
      href: "/exchange", accent: MCK_TAG_C,
      meta: "?깅줉 1,234嫄?쨌 ?좉퇋 留ㅼ씪 ~20嫄?,
    },
    {
      icon: <MessageSquare size={20} style={{ color: MCK_ICON }} />, tag: "?쒕８", tagColor: MCK_TAG_C,
      title: "?쒕８ 쨌 NDA 쨌 ?꾩옄怨꾩빟",
      desc: "留ㅻ룄?먃룸ℓ?섏옄 1:1 蹂댁븞 梨꾨꼸. NDA ?꾩옄?쒕챸 ??沅뚮━利?怨듭쑀 ??LOI ??留ㅻℓ怨꾩빟???먮룞 ?앹꽦源뚯? ?먯뒪??泥닿껐.",
      href: "/deals", accent: MCK_TAG_C,
      meta: "吏꾪뻾 以???68嫄?쨌 ?대쾲 二?泥닿껐 14嫄?,
    },
    {
      icon: <Gavel size={20} style={{ color: MCK_ICON }} />, tag: "寃쎌웳 ?낆같", tagColor: MCK_TAG_C,
      title: "?ㅼ떆媛?寃쎌웳 ?낆같",
      desc: "怨듦컻 寃쎌웳 ?낆같 + ?꾨씪?대퉿 ?묒긽. ?먮룞 ?낆같 ?먯씠?꾪듃濡?媛寃??곹븳쨌湲곗??쇰쭔 ?ㅼ젙?섎㈃ 議곌굔 留욌뒗 留ㅻЪ ?먮룞 ?묒같.",
      href: "/exchange/auction", accent: MCK_TAG_C,
      meta: "吏꾪뻾 以??낆같 42嫄?쨌 ?됯퇏 ?숈같 7??,
    },
    {
      icon: <ShieldCheck size={20} style={{ color: MCK_ICON }} />, tag: "泥닿껐 蹂댄샇", tagColor: MCK_TAG_C,
      title: "?먯뒪?щ줈 쨌 PII 留덉뒪??,
      desc: "?湲덉? ?먯뒪?щ줈 怨꾩쥖濡? 媛쒖씤?뺣낫??L0~L3 ?묎렐?듭젣濡? ?덉쟾??泥닿껐???꾪븳 2以??덉쟾?μ튂.",
      href: "/support", accent: MCK_TAG_C,
      meta: "?먭툑 蹂댄샇 쨌 ?뺣낫蹂댄샇 2以??덉쟾?μ튂",
    },
    {
      icon: <Brain size={20} style={{ color: MCK_ICON }} />, tag: "AI 遺꾩꽍", tagColor: MCK_TAG_C,
      title: "AI ??遺꾩꽍 由ы룷??,
      desc: "媛먯젙媛쨌諛곕떦?붽뎄쨌沅뚮━遺꾩꽍쨌?섏씡瑜졖룻쉶???뺣쪧源뚯? 27珥????먮룞 由ы룷?? 嫄곕옒 寃곗젙??鍮좊Ⅴ寃? 由ъ뒪?щ? 紐낇솗?섍쾶.",
      href: "/analysis", accent: MCK_TAG_C,
      meta: "?됯퇏 遺꾩꽍 ?쒓컙 27珥?쨌 28,391嫄?遺꾩꽍",
    },
    {
      icon: <Sparkles size={20} style={{ color: MCK_ICON }} />, tag: "AI Copilot", tagColor: MCK_TAG_C,
      title: "AI Copilot ??嫄곕옒 ?댁떆?ㅽ꽩??,
      desc: "\"??留ㅻЪ ?섏씡瑜?15% 媛?ν빐?\" 泥섎읆 ??뷀븯??臾쇱뼱蹂댁꽭?? 留ㅻЪ쨌?쒖꽭쨌?먮? DB 瑜??ㅼ떆媛?議고쉶?섎뒗 嫄곕옒 ?꾩슦誘?",
      href: "/analysis/copilot", accent: MCK_TAG_C,
      meta: "Claude + ?먯껜 NPL 肄뷀띁???숈뒿",
    },
  ];

  const steps = [
    { n: "01", t: "留ㅻЪ ?깅줉", d: "留ㅻ룄??湲덉쑖湲곌?)媛 NPL??L0 移대뱶 ?뺥깭濡?怨듦컻. PII???먮룞 留덉뒪??", icon: <Layers size={16} />, sla: "?깅줉 10遺? },
    { n: "02", t: "AI ??遺꾩꽍", d: "?대낫쨌沅뚮━쨌?쒖꽭쨌?뚯닔?뺣쪧??30珥???由ы룷?? ?ъ옄?먭? 蹂몄씤?몄쬆(L1)留뚯쑝濡??대엺.", icon: <Brain size={16} />, sla: "由ы룷??30珥? },
    { n: "03", t: "寃쎌웳 ?낆같", d: "怨듦컻 寃쎌웳 ?낆같 ?먮뒗 NDA(L2) ?꾨씪?대퉿 ?묒긽. ?먮룞 ?낆같 ?먯씠?꾪듃 吏??", icon: <Gavel size={16} />, sla: "?됯퇏 7?? },
    { n: "04", t: "?쒕８ 쨌 LOI", d: "LOI(L3) ?뱀씤 ??梨꾧텒?쒕쪟쨌沅뚮━愿怨??꾩껜 ?대엺. 蹂댁븞 梨꾨꼸 ?묒긽 + 臾몄꽌 援먰솚.", icon: <MessageSquare size={16} />, sla: "議곌굔 ?묒쓽 3?? },
    { n: "05", t: "?꾩옄怨꾩빟 쨌 ?먯뒪?щ줈", d: "?꾩옄怨꾩빟???먮룞 ?앹꽦 ???쒕챸 ???먯뒪?щ줈 ?湲?吏湲???梨꾧텒?묐룄 ?꾧껐.", icon: <CheckCircle2 size={16} />, sla: "?뱀씪 ?대줈吏? },
  ];

  return (
    <div className="mck-l0" style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", minHeight: '100vh' }}>

      {/* ?먥븧 HERO ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <section className="mck-l1" style={{ backgroundColor: C.bg0, minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* Mesh background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* Top line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          {/* Emerald orb */}
          <div style={{ position: 'absolute', top: '15%', left: '20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(5, 28, 44,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
          {/* Blue orb */}
          <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(5, 28, 44,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
          {/* Purple orb */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(5, 28, 44,0.03) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)' }} />
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

              {/* Eyebrow 쨌 吏곸젒 hex (CSS 蹂??fallback X) ??navy ??brass 愿묓깮 */}
              <motion.div variants={up} custom={0} className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="block w-12 h-[2px]" style={{ background: '#00A9F4' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: '#00A9F4' }}>
                    Korea NPL Exchange 쨌 嫄곕옒 吏꾪뻾 以?                  </span>
                </div>
              </motion.div>

              {/* H1 쨌 Editorial display ??蹂몃Ц ?? 釉뚮옖?쒕뒗 brass (吏곸젒 hex) */}
              <motion.h1 variants={up} custom={1}
                className="npl-editorial-display mb-5"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: '#FFFFFF', lineHeight: 1.08, letterSpacing: '-0.02em', fontWeight: 800 }}
              >
                <span style={{ color: '#FFFFFF' }}>NPL ?쒖씠 紐⑥씠??怨?</span><br />
                <span style={{ color: '#FFFFFF' }}>嫄곕옒媛 ?쒖옉?섎뒗 怨?/span><br />
                <span style={{ color: '#00A9F4', fontWeight: 900 }}>?뷀뵆?ロ뤌</span>
              </motion.h1>

              {/* Sub 쨌 ??70%~90% 媛뺥븳 媛?낆꽦 */}
              <motion.p variants={up} custom={2} className="text-base leading-relaxed mb-7"
                style={{ color: 'rgba(255,255,255,0.78)', maxWidth: '440px' }}>
                留ㅺ컖?ъ? ?ъ옄?먭? 吏곸젒 留뚮굹??嫄곕옒??{" "}
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>留ㅻЪ ?먯깋 쨌 寃쎌웳 ?낆같 쨌 ?쒕８ ?묒긽 쨌 ?꾩옄怨꾩빟</span>{" "}
                源뚯? ??踰덉뿉 泥닿껐?⑸땲??
              </motion.p>

              {/* CTAs 쨌 Navy hero ????Primary = ??醫낆씠 + ink, Secondary = brass outline + brass
                  contrast 洹쒖튃: ?대몢??諛곌꼍 ??湲??諛곌꼍? 媛뺥븳 ?鍮?(??brass) */}
              <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/exchange"
                  className="group inline-flex items-center justify-center gap-2 font-bold text-sm transition-all"
                  style={{ background: '#FFFFFF', color: '#0A1628', padding: '14px 28px', border: '1px solid #FFFFFF', borderRadius: 0, letterSpacing: '0.02em' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Search size={15} style={{ color: '#0A1628' }} />
                  <span style={{ color: '#0A1628' }}>留ㅻЪ ?먯깋?섍린</span>
                  <ArrowRight size={15} style={{ color: '#0A1628' }} />
                </Link>
                <Link href="/exchange/sell"
                  className="group inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all"
                  style={{ background: 'transparent', border: '1px solid #2251FF', color: '#00A9F4', padding: '14px 28px', borderRadius: 0, letterSpacing: '0.02em' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184, 146, 75, 0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Building2 size={13} style={{ color: '#00A9F4' }} />
                  <span style={{ color: '#00A9F4' }}>留ㅻЪ ?깅줉?섍린</span>
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

      {/* ?먥븧 STATS BAR 쨌 McKinsey White Paper ?뱀뀡 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??          navy hero 吏곹썑 = ??諛곌꼍 ?뱀뀡?쇰줈 媛뺥븳 contrast.
          4媛?移대뱶 紐⑤몢 White Paper + ink + brass hairline.
      ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid rgba(5, 28, 44, 0.10)', borderBottom: '1px solid rgba(5, 28, 44, 0.10)', padding: '3.5rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'rgba(5, 28, 44, 0.10)' }}>
            {stats.map((s, i) => (
              <motion.div key={s.label} variants={up} custom={i}
                className="relative p-6 overflow-hidden group"
                style={{
                  background: '#FFFFFF',
                  borderTop: '2px solid var(--color-editorial-gold, #2251FF)',
                  borderRadius: 0,
                  cursor: 'default',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  {/* ?꾩씠肄?= ink 寃??(color X) */}
                  <div className="p-2" style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.10)', borderRadius: 0 }}>
                    {s.icon && (
                      <span style={{ display: 'inline-flex', color: '#0A1628' }}>
                        {/* clone icon with ink color */}
                        {s.icon}
                      </span>
                    )}
                  </div>
                  {/* 蹂?붿쑉 = brass small */}
                  <div className="flex items-center gap-1">
                    <ChevronUp size={11} style={{ color: 'var(--color-editorial-gold, #2251FF)' }} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--color-editorial-gold, #2251FF)' }}>{s.change}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    {/* ?レ옄 = HERO ink (size + weight 媛뺤“, ??X) */}
                    <div className="text-3xl font-extrabold tabular-nums leading-tight" style={{ color: '#0A1628', letterSpacing: '-0.02em' }}>
                      <Counter target={s.val} suffix={s.suffix} />
                    </div>
                    {/* ?쇰꺼 = ?묒? ?뚯깋 uppercase */}
                    <div className="text-[10px] mt-2 font-bold uppercase tracking-[0.10em]" style={{ color: 'rgba(5, 28, 44, 0.55)' }}>{s.label}</div>
                  </div>
                  <Sparkline color="#0A1628" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ?먥븧 嫄곕옒??留ㅻЪ ?덉떆 (?쇱??댁뒪) ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <ExchangePreview />

      {/* ?먥븧 ?쒕８ ?덉떆 (?쇱??댁뒪) ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <DealRoomPreview />

      {/* ?먥븧 AI 異붿쿇 (Phase 2-F 쨌 媛쒖씤?? ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <AIRecommendations />

      {/* ?먥븧 TRUST BELT (brand tokens 湲곕컲) ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <TrustBelt />

      {/* ?먥븧 WHY NPLATFORM 쨌 McKinsey Editorial ???먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <section style={{ backgroundColor: C.light1, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            {/* warm gold thin divider ??editorial signature */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="block w-10 h-[2px]" style={{ background: 'var(--color-editorial-gold)' }} />
              <span className="npl-editorial-eyebrow">Why NPLatform</span>
              <span className="block w-10 h-[2px]" style={{ background: 'var(--color-editorial-gold)' }} />
            </div>
            <h2 className="npl-editorial-display mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--fg-strong)' }}>
              NPL 嫄곕옒, ?댁젣 ?ㅻⅤ寃?            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--fg-muted)' }}>
              湲곗〈 NPL 嫄곕옒??遺덊닾紐낆꽦, ?믪? 吏꾩엯?λ꼍, 蹂듭옟???꾨줈?몄뒪瑜?AI濡??닿껐?⑸땲??
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <TrendingUp size={24} style={{ color: C.em }} />,
                tag: "嫄곕옒 ?⑥쑉 3諛?,
                tagBg: 'rgba(5, 28, 44,0.10)', tagColor: 'var(--color-positive)', tagBorder: 'rgba(5, 28, 44,0.25)',
                title: "鍮좊Ⅸ 嫄곕옒, ?щ챸???섏닔猷?,
                desc: "?됯퇏 ???대줈吏?24????7?쇰줈 ?⑥텞. NPL 留ㅼ닔 1.5% 쨌 遺?숈궛 0.9% 怨좎젙 ?섏닔猷? 留ㅺ컖?щ뒗 泥?6媛쒖썡 臾대즺. ?먯뒪?щ줈쨌?꾩옄怨꾩빟?쇰줈 嫄곕옒 由ъ뒪?щ룄 ?④퍡 ??땅?덈떎.",
                iconBg: 'rgba(5, 28, 44,0.08)', borderHover: 'var(--color-positive)',
                bullets: ["留ㅻЪ 怨듦컻 ???숈같 ?됯퇏 7??, "NPL 1.5% / 遺?숈궛 0.9% 쨌 留ㅺ컖??6媛쒖썡 臾대즺", "?먯뒪?щ줈 쨌 ?꾩옄怨꾩빟 湲곕낯 ?쒓났"],
              },
              {
                icon: <Building2 size={24} style={{ color: C.blue }} />,
                tag: "47媛?湲덉쑖湲곌?",
                tagBg: 'rgba(46,117,182,0.10)', tagColor: 'var(--color-brand-bright)', tagBorder: 'rgba(46,117,182,0.25)',
                title: "留ㅻ룄?????ъ옄??吏곴굅??,
                desc: "??됀룹?異뺤??됀룹틦?쇳깉 47媛쒖궗媛 吏곸젒 留ㅺ컖. 以묎컙 ?좏넻 ?놁씠 1李?怨듦툒??媛寃⑹쑝濡?留ㅼ엯?섍퀬, 留ㅻ룄?먮뒗 LLR(Loan Loss Reserve) ?뚯닔瑜?洹밸??뷀빀?덈떎.",
                iconBg: 'rgba(46,117,182,0.08)', borderHover: 'var(--color-brand-bright)',
                bullets: ["以묎컙 ?좏넻 ?녿뒗 1李?怨듦툒 媛寃?, "湲곌? KYC 쨌 ?먭꺽 寃利??꾨즺", "?ㅼ떆媛?寃쎌웳 ?낆같 / ?꾨씪?대퉿 ?묒긽"],
              },
              {
                icon: <ShieldCheck size={24} style={{ color: C.purple }} />,
                tag: "L0?묹3 4?④퀎 ?묎렐",
                tagBg: 'rgba(5, 28, 44,0.10)', tagColor: 'var(--color-purple, #A855F7)', tagBorder: 'rgba(5, 28, 44,0.25)',
                title: "嫄곕옒 ?덉쟾 쨌 PII 蹂댄샇",
                desc: "?대낫 遺?숈궛? 怨듦컻, 梨꾨Т??媛쒖씤?뺣낫??媛由곕떎. 蹂몄씤?몄쬆(L1) ??NDA(L2) ??LOI(L3) ?④퀎蹂꾨줈留?沅뚮━愿怨꽷룹콈沅뚯꽌瑜섏뿉 ?묎렐?⑸땲??",
                iconBg: 'rgba(5, 28, 44,0.08)', borderHover: 'var(--color-purple, #A855F7)',
                bullets: ["湲덇컧?먃룹떊?⑹젙蹂대쾿 媛?대뱶 以??, "?먮룞 PII 留덉뒪???뚯씠?꾨씪??, "NDA ?꾩옄?쒕챸 + 媛먯궗濡쒓렇 ?곴뎄 蹂닿?"],
              },
            ].map((r, i) => (
              <motion.div key={r.title} variants={up} custom={i}
                className="npl-surface-card rounded-2xl p-7 transition-all duration-300"
                onMouseEnter={e => { (e.currentTarget.style.transform = 'translateY(-4px)'); }}
                onMouseLeave={e => { (e.currentTarget.style.transform = 'translateY(0)'); }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: r.iconBg }}>{r.icon}</div>
                <div className="inline-flex items-center text-[10px] font-bold rounded-full px-2.5 py-1 mb-3" style={{ background: r.tagBg, color: r.tagColor, border: `1px solid ${r.tagBorder}` }}>{r.tag}</div>
                {/* Phase L 쨌 ?ㅽ겕紐⑤뱶 媛?낆꽦 fix 쨌 ?섎뱶肄붾뵫 ?됱긽 ?쒓굅 ???좏겙 ?ъ슜 */}
                <h3 className="font-bold text-lg mb-2.5 text-[var(--color-text-primary)]">{r.title}</h3>
                <p className="text-sm leading-relaxed mb-4 text-[var(--color-text-tertiary)]">{r.desc}</p>
                <ul className="space-y-1.5 pt-3 border-t border-[var(--color-border-subtle)]">
                  {r.bullets?.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12.5px] text-[var(--color-text-secondary)]">
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

      {/* ?먥븧 FEATURES 쨌 McKinsey White Paper ?뱀뀡 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??          ??諛곌꼍 ?뱀뀡 + 6媛???醫낆씠 移대뱶 + ink 寃??+ brass hairline
          諭껋? = 寃???ш컖 + ??湲??(multi-color X)
      ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <section style={{ backgroundColor: '#FAFAFA', padding: '6rem 0', position: 'relative' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="block w-10 h-[2px]" style={{ background: 'var(--color-editorial-gold, #2251FF)' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--color-editorial-gold, #2251FF)' }}>Trade Infrastructure 쨌 嫄곕옒 ?명봽??/span>
              <span className="block w-10 h-[2px]" style={{ background: 'var(--color-editorial-gold, #2251FF)' }} />
            </div>
            <h2 className="mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0A1628', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              嫄곕옒瑜??꾪븳 紐⑤뱺 寃?            </h2>
            <p className="text-base" style={{ color: 'rgba(5, 28, 44, 0.65)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              嫄곕옒??쨌 ?쒕８ 쨌 怨꾩빟 쨌 ?먯뒪?щ줈 쨌 AI 遺꾩꽍 ??泥닿껐???꾩슂??紐⑤뱺 ?꾧뎄媛 NPLatform ?섎굹??
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(5, 28, 44, 0.10)' }}>
            {features.map((f, i) => (
              <motion.div key={f.title} variants={up} custom={i}>
                <Link href={f.href}
                  className="relative flex flex-col p-7 group block transition-all duration-300 h-full"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 0,
                    borderTop: '2px solid transparent',
                  }}
                  onMouseEnter={e => { (e.currentTarget.style.borderTop = '2px solid var(--color-editorial-gold, #2251FF)'); (e.currentTarget.style.transform = 'translateY(-2px)'); (e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(5, 28, 44, 0.18)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.borderTop = '2px solid transparent'); (e.currentTarget.style.transform = 'translateY(0)'); (e.currentTarget.style.boxShadow = 'none'); }}
                >
                  <div className="flex items-start justify-between mb-5">
                    {/* ?꾩씠肄?= light gray sq + ink */}
                    <div className="p-2.5" style={{ background: '#F5F5F5', border: '1px solid rgba(5, 28, 44, 0.10)', borderRadius: 0 }}>
                      <span style={{ display: 'inline-flex', color: '#0A1628' }}>{f.icon}</span>
                    </div>
                    {/* 諭껋? = 寃???ш컖 + ??湲??(紐⑤뱺 6媛??숈씪 ?? */}
                    <span className="text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-[0.08em]"
                      style={{ background: '#0A1628', color: '#FFFFFF', borderRadius: 0 }}>{f.tag}</span>
                  </div>
                  <h3 className="font-extrabold text-base mb-2.5" style={{ color: '#0A1628', letterSpacing: '-0.012em' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(5, 28, 44, 0.65)' }}>{f.desc}</p>
                  {f.meta && (
                    <div className="mt-4 pt-3 flex items-center gap-1.5 text-[11px] font-bold tabular-nums uppercase tracking-[0.06em]"
                      style={{ borderTop: '1px solid rgba(5, 28, 44, 0.10)', color: '#0A1628' }}>
                      <span className="w-1 h-1" style={{ background: 'var(--color-editorial-gold, #2251FF)', borderRadius: 0 }} />
                      {f.meta}
                    </div>
                  )}
                  {/* CTA hint = ink + underline on hover */}
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.06em]" style={{ color: '#0A1628' }}>
                    ?먯꽭??蹂닿린 <ArrowUpRight size={12} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ?먥븧 USER TYPES ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <section style={{ backgroundColor: C.light1, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            <div className="npl-surface-sunken inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5">
              <TrendingUp size={12} className="text-[var(--color-text-tertiary)]" />
              <span className="text-xs font-bold text-[var(--color-text-tertiary)]" style={{ letterSpacing: '0.06em' }}>?꾧뎄瑜??꾪븳 ?뚮옯?쇱씤媛</span>
            </div>
            <h2 className="font-black tracking-tighter text-[var(--color-text-primary)]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              留ㅺ컖?먯? ?ъ옄??紐⑤몢瑜??꾪븳
            </h2>
          </motion.div>

          <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6">
            {/* Seller ??premium (?쇱씠???ㅽ겕 ?먮룞 遺꾧린 쨌 Phase H 쨌 globals.css ??.home-seller-premium-card) */}
            <motion.div variants={up} custom={0}
              className="home-seller-premium-card relative rounded-2xl p-8 overflow-hidden"
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(5, 28, 44,0.08), transparent 70%)', borderRadius: '50%' }} />
              <div className="home-seller-divider" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px' }} />
              <div className="relative">
                <div className="home-seller-icon-wrap w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                  <Building2 size={22} style={{ color: C.em }} />
                </div>
                <div className="home-seller-eyebrow inline-flex text-[10px] font-bold rounded-full px-3 py-1 mb-4"
                  style={{ letterSpacing: '0.05em' }}>
                  留ㅺ컖??쨌 湲덉쑖湲곌?
                </div>
                <h3 className="home-seller-title font-black text-2xl mb-3">湲덉쑖湲곌? (留ㅺ컖??</h3>
                <p className="home-seller-body text-sm leading-relaxed mb-6">
                  NPL 留ㅻЪ???붿??몃줈 ?깅줉?섍퀬 ?꾧뎅 寃利앸맂 ?ъ옄?먯뿉寃??몄텧?섏꽭?? AI 媛寃??곗젙, ?낆같 愿由? ?쒕８ ?묒긽源뚯? ?먮룞?뷀빀?덈떎.
                </p>
                <ul className="space-y-2.5 mb-7">
                  {["留ㅻЪ ?쇨큵 ?깅줉 諛?愿由?, "?ㅼ떆媛??낆같 紐⑤땲?곕쭅", "AI 媛寃??먮룞 ?곗젙", "?쒕８ 臾몄꽌 愿由?, "?꾩옄怨꾩빟 ?먯뒪??].map(item => (
                    <li key={item} className="home-seller-list-item flex items-center gap-2.5 text-sm">
                      <CheckCircle2 size={13} style={{ color: C.em, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
                <Link href="/exchange/sell"
                  className="inline-flex items-center gap-2 font-bold text-sm rounded-xl transition-all"
                  style={{ background: 'var(--color-brand-deep)', color: 'white', padding: '12px 24px', border: '1px solid var(--color-brand-deep)' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  留ㅻЪ ?깅줉?섍퀬 ?쒕８ ?쒖옉 <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>

            {/* Investor ??clean light */}
            <motion.div variants={up} custom={1}
              className="npl-surface-card-raised relative rounded-2xl p-8 overflow-hidden transition-shadow"
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(5, 28, 44,0.05), transparent 70%)', borderRadius: '50%' }} />
              <div className="relative">
                <div className="npl-surface-sunken w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                  <TrendingUp size={22} style={{ color: C.blue }} />
                </div>
                <div className="npl-surface-sunken inline-flex text-[10px] font-bold rounded-full px-3 py-1 mb-4 text-[var(--color-text-secondary)]"
                  style={{ letterSpacing: '0.05em' }}>
                  ?遺?낆껜 쨌 ?ъ옄??                </div>
                <h3 className="font-black text-2xl mb-3 text-[var(--color-text-primary)]">?遺?낆껜 / ?ъ옄??/h3>
                <p className="text-sm leading-relaxed mb-6 text-[var(--color-text-tertiary)]">
                  ?꾧뎅 NPL 留ㅻЪ??AI 遺꾩꽍?쇰줈 ?됯??섍퀬 ?섏씡瑜좎쓣 ?쒕??덉씠?섑븯?몄슂. 寃利앸맂 留ㅻЪ留? 吏곴굅?섎줈 ???믪? ?섏씡???ㅽ쁽?⑸땲??
                </p>
                <ul className="space-y-2.5 mb-7">
                  {["30+ 議곌굔 ?듯빀 寃??, "AI 由ъ뒪???깃툒 遺꾩꽍", "?섏씡瑜??쒕??덉씠??, "?ㅼ떆媛?寃쎌웳 ?낆같", "AI Copilot ?곷떞"].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
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
                  嫄곕옒?뚯뿉??留ㅻЪ ?먯깋 <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      {/* ?먥븧 PROCESS 쨌 McKinsey White Paper ?뱀뀡 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??          ??諛곌꼍 + ink 寃??+ 5?④퀎 移대뱶????醫낆씠 + 踰덊샇??brass
          湲곗〈 navy on navy ??contrast ?꾨컲 100% ?댁냼
      ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <section style={{ backgroundColor: '#FFFFFF', padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-14">
            {/* Eyebrow ??寃???ш컖 + ??湲??*/}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5"
              style={{ background: '#0A1628', border: '1px solid #0A1628', borderRadius: 0 }}>
              <RefreshCw size={11} style={{ color: '#FFFFFF' }} />
              <span className="text-[11px] font-bold uppercase" style={{ color: '#FFFFFF', letterSpacing: '0.10em' }}>嫄곕옒 ?꾨줈?몄뒪</span>
            </div>
            <h2 className="font-black tracking-tighter mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0A1628', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              5?④퀎濡??꾧껐?섎뒗 嫄곕옒
            </h2>
            <p className="text-base" style={{ color: 'rgba(5, 28, 44, 0.65)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
              蹂듭옟??NPL 嫄곕옒瑜??⑥닚?섍퀬 ?щ챸?섍쾶. 媛??④퀎留덈떎 AI媛 ?④퍡?⑸땲??
            </p>
          </motion.div>

          {/* Desktop 쨌 ??醫낆씠 5?④퀎 + brass connector */}
          <motion.div variants={stagger} className="hidden lg:grid grid-cols-5 gap-px relative" style={{ background: 'rgba(5, 28, 44, 0.10)' }}>
            {/* connector line ??brass dashed */}
            <div style={{ position: 'absolute', top: '38px', left: '8%', right: '8%', height: '1px', borderTop: '1px dashed rgba(184, 146, 75, 0.50)', zIndex: 0, pointerEvents: 'none' }} />
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={up} custom={i}
                className="relative z-10 flex flex-col items-center text-center p-6"
                style={{ background: '#FFFFFF', borderTop: '2px solid var(--color-editorial-gold, #2251FF)', borderRadius: 0 }}
              >
                {/* ?꾩씠肄?= 寃???ш컖 + ???꾩씠肄?*/}
                <div className="w-14 h-14 flex items-center justify-center mb-4"
                  style={{ background: '#0A1628', borderRadius: 0 }}>
                  <span style={{ display: 'inline-flex', color: '#FFFFFF' }}>{s.icon}</span>
                </div>
                {/* 踰덊샇 = brass small uppercase */}
                <div className="text-[10px] font-black mb-2" style={{ color: '#2251FF', letterSpacing: '0.12em' }}>{s.n}</div>
                {/* ?쒕ぉ = ink + bold */}
                <div className="text-sm font-bold mb-2" style={{ color: '#0A1628', letterSpacing: '-0.01em' }}>{s.t}</div>
                {/* ?ㅻ챸 = ?뚯깋 ink */}
                <div className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(5, 28, 44, 0.65)' }}>{s.d}</div>
                {s.sla && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5"
                    style={{ background: 'transparent', color: '#2251FF', border: '1px solid #2251FF', borderRadius: 0, letterSpacing: '0.04em' }}>
                    <Zap size={9} style={{ color: '#2251FF' }} />{s.sla}
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Mobile 쨌 ??醫낆씠 移대뱶 + brass top */}
          <motion.div variants={stagger} className="lg:hidden space-y-px" style={{ background: 'rgba(5, 28, 44, 0.10)' }}>
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={up} custom={i}
                className="flex gap-4 p-5"
                style={{ background: '#FFFFFF', borderTop: '2px solid var(--color-editorial-gold, #2251FF)', borderRadius: 0 }}>
                <div className="w-11 h-11 flex items-center justify-center flex-shrink-0"
                  style={{ background: '#0A1628', borderRadius: 0 }}>
                  <span style={{ display: 'inline-flex', color: '#FFFFFF' }}>{s.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-[10px] font-black" style={{ color: '#2251FF', letterSpacing: '0.12em' }}>{s.n}</div>
                    {s.sla && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5"
                        style={{ background: 'transparent', color: '#2251FF', border: '1px solid #2251FF', borderRadius: 0 }}>
                        <Zap size={8} style={{ color: '#2251FF' }} />{s.sla}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold mb-1" style={{ color: '#0A1628' }}>{s.t}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'rgba(5, 28, 44, 0.65)' }}>{s.d}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ?먥븧 TRUST ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <section style={{ backgroundColor: C.light0, padding: '6rem 0' }}>
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={up} className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="block w-10 h-[2px]" style={{ background: 'var(--color-editorial-gold)' }} />
              <span className="npl-editorial-eyebrow">Partner Institutions 쨌 ?묐젰 湲덉쑖湲곌?</span>
              <span className="block w-10 h-[2px]" style={{ background: 'var(--color-editorial-gold)' }} />
            </div>
            <h2 className="npl-editorial-display mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--fg-strong)' }}>
              47媛?湲덉쑖湲곌????좊ː?섎뒗 ?뚮옯??            </h2>
            <p className="text-base" style={{ color: 'var(--fg-muted)', maxWidth: '480px', margin: '0 auto' }}>
              援?궡 二쇱슂 ??? ?異뺤??? 罹먰뵾?덉궗? ?뚰듃?덉떗??留브퀬 ?덉뒿?덈떎.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-10">
            {["KB援?????,"?좏븳???,"?곕━???,"?섎굹???,"?랁삊???,"湲곗뾽???,"援???異뺤???,"OK?異뺤???,"SBI?異뺤???,"?곗뺨?異뺤???,"?꾨?罹먰뵾??,"濡?뜲罹먰뵾??,"KB罹먰뵾??,"?좏븳罹먰뵾??,"?섎굹罹먰뵾??].map((inst, i) => (
              <motion.div key={inst} variants={fadeIn} custom={i}
                className="npl-surface-subtle rounded-xl py-4 px-2 flex items-center justify-center transition-all hover:border-[var(--color-border-default)]"
              >
                <span className="text-xs font-semibold text-center leading-snug text-[var(--color-text-secondary)]">{inst}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={stagger} className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <Shield size={15} className="text-[var(--color-brand-dark)]" />, label: "湲덉쑖媛먮룆??以?? },
              { icon: <Lock size={15} className="text-[var(--color-brand-dark)]" />, label: "AES-256 ?뷀샇?? },
              { icon: <Star size={15} className="text-[var(--color-brand-dark)]" />, label: "ISO 27001 ?몄쬆" },
              { icon: <Globe size={15} className="text-[var(--color-brand-dark)]" />, label: "媛쒖씤?뺣낫蹂댄샇踰?以?? },
            ].map(b => (
              <motion.div key={b.label} variants={fadeIn}
                className="npl-surface-card flex items-center gap-2.5 rounded-xl px-5 py-2.5 transition-all"
              >
                <div className="npl-surface-subtle w-7 h-7 rounded-lg flex items-center justify-center">{b.icon}</div>
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{b.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </section>

      {/* ?먥븧 CTA ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <section style={{ backgroundColor: C.bg0, padding: '7rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${C.em}50, transparent)` }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translateY(-50%)', width: '350px', height: '350px', background: `radial-gradient(circle, rgba(5, 28, 44,0.07), transparent 70%)`, borderRadius: '50%', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: '50%', right: '25%', transform: 'translateY(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(5, 28, 44,0.05), transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        </div>

        <Reveal className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div variants={stagger}>
            {/* Eyebrow ??brass outline + brass (吏곸젒 hex) */}
            <motion.div variants={up} custom={0} className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5"
                style={{ background: 'transparent', border: '1px solid #2251FF', borderRadius: 0 }}>
                <Zap size={11} style={{ color: '#00A9F4' }} />
                <span className="text-[11px] font-bold uppercase" style={{ color: '#00A9F4', letterSpacing: '0.10em' }}>吏湲?嫄곕옒瑜??쒖옉?섏꽭??/span>
              </div>
            </motion.div>

            <motion.h2 variants={up} custom={1}
              className="font-black tracking-tighter mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              <span style={{ color: '#FFFFFF' }}>?ㅻ뒛 ?吏곸씠??/span>{" "}
              <span style={{ color: '#00A9F4', fontWeight: 900 }}>NPL ???뚮줈??/span>
            </motion.h2>

            <motion.p variants={up} custom={2} className="text-base mb-8"
              style={{ color: 'rgba(255,255,255,0.78)', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
              1,234嫄댁쓽 ?쇱씠釉?留ㅻЪ怨??쒖꽦 ?쒕８?먯꽌 吏곸젒 嫄곕옒瑜??쒖옉?섏꽭??<br />
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>?뚯썝媛??利됱떆 쨌 留ㅻЪ ?먯깋 쨌 ?쒕８ ?묒긽 쨌 ?꾩옄怨꾩빟</span>
            </motion.p>

            <motion.div variants={up} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link href="/exchange"
                className="inline-flex items-center justify-center gap-2 font-bold text-base transition-all"
                style={{ background: '#FFFFFF', color: '#0A1628', padding: '16px 32px', border: '1px solid #FFFFFF', borderRadius: 0, letterSpacing: '0.02em' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span style={{ color: '#0A1628' }}>留ㅻЪ ?먯깋?섍린</span>
                <ArrowRight size={17} style={{ color: '#0A1628' }} />
              </Link>
              <Link href="/exchange/sell"
                className="inline-flex items-center justify-center gap-2 font-semibold text-base transition-all"
                style={{ background: 'transparent', border: '1px solid #2251FF', color: '#00A9F4', padding: '16px 32px', borderRadius: 0, letterSpacing: '0.02em' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184, 146, 75, 0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ color: '#00A9F4' }}>留ㅻЪ ?깅줉?섍린</span>
                <ChevronRight size={17} style={{ color: '#00A9F4' }} />
              </Link>
            </motion.div>

            {/* 47媛?湲덉쑖湲곌? banner ??chips ??諛곌꼍 + ink, ?띿뒪????媛뺤“ */}
            <motion.div variants={up} custom={4} className="flex items-center justify-center gap-3"
              style={{ color: 'rgba(255,255,255,0.78)', fontSize: '13px' }}>
              <div className="flex -space-x-2">
                {["KB", "?좏븳", "?곕━", "?섎굹", "湲곗뾽"].map((b, i) => (
                  <div key={b}
                    className="w-7 h-7 flex items-center justify-center font-bold"
                    style={{ background: '#FFFFFF', border: '2px solid #0A1628', color: '#0A1628', fontSize: '8px', zIndex: 5 - i, borderRadius: '50%', letterSpacing: '0.02em' }}>
                    {b}
                  </div>
                ))}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.78)' }}>
                <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>47媛?湲덉쑖湲곌?</strong>???대? ?ъ슜 以?              </span>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>
    </div>
  );
}
