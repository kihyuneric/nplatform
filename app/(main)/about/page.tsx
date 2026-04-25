'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import DS from '@/lib/design-system';
import {
  Search,
  Map,
  Gavel,
  Brain,
  Calculator,
  BarChart3,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  Building2,
  Users,
  TrendingUp,
  Shield,
  FileCheck,
  Handshake,
  Lock,
  ClipboardList,
  LineChart,
  FileText,
  Landmark,
  UserPlus,
  MapPin,
  Sparkles,
  ShoppingCart,
  BadgeCheck,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return { count, ref };
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Search,
    title: 'NPL 검색',
    href: '/market/search',
    desc: '전국 NPL 매물을 한눈에 검색. AI 등급, 낙찰가율, 법원정보까지 5개 탭으로 분석',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: Map,
    title: 'NPL 지도',
    href: '/market/map',
    desc: '지도 기반 매물 탐색. 지역별 NPL 분포를 직관적으로 확인',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: Gavel,
    title: 'NPL 입찰',
    href: '/market/bidding',
    desc: '금융기관 NPL 매각 입찰에 참여. 실시간 입찰 현황과 D-day 관리',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: Brain,
    title: 'NPL 분석',
    href: '/npl-analysis',
    desc: 'AI가 분석하는 NPL 투자 리스크와 수익성. A~D등급 자동 평가',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: Calculator,
    title: '경매 수익률 분석',
    href: '/tools/auction-simulator',
    desc: '입찰가별 ROI 시뮬레이션. 세금, 대출, 보유기간 고려한 정밀 분석',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: BarChart3,
    title: '통계 대시보드',
    href: '/statistics',
    desc: 'NPL 시장 동향, 지역별 거래 현황, AI 등급 분포 한눈에',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
];

const processSteps = [
  {
    num: 1,
    title: '회원가입',
    desc: '간편 가입으로 NPLatform 서비스를 시작하세요',
    icon: UserPlus,
  },
  {
    num: 2,
    title: 'NPL 검색 / 지도 탐색',
    desc: '통합 검색과 지도로 원하는 NPL 매물을 탐색하세요',
    icon: MapPin,
  },
  {
    num: 3,
    title: 'AI 분석 확인',
    desc: 'AI가 평가한 투자 등급과 리스크 리포트를 확인하세요',
    icon: Sparkles,
  },
  {
    num: 4,
    title: '입찰 참여',
    desc: 'NDA 서명 후 희망 매입가로 입찰에 참여하세요',
    icon: Gavel,
  },
  {
    num: 5,
    title: '거래 완료',
    desc: '딜룸에서 서류 교환, 계약 체결까지 한 번에 완료하세요',
    icon: CheckCircle,
  },
];

const financialCards = [
  {
    icon: ClipboardList,
    title: '간편한 입찰 등록',
    desc: '4단계 위자드로 채권 정보부터 입찰 조건까지 간편하게 등록. 복잡한 매각 절차를 시스템이 자동 관리합니다.',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: Users,
    title: '투자자 매칭',
    desc: 'AI 기반으로 적합한 투자자를 자동 매칭. 채권 유형과 투자자 성향을 분석하여 최적의 매수자를 추천합니다.',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: Lock,
    title: '안전한 거래',
    desc: 'NDA 전자 서명과 전용 딜룸으로 거래 정보를 철저히 보호. 양측 모두 신뢰할 수 있는 거래 환경을 제공합니다.',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
];

const investorCards = [
  {
    icon: Search,
    title: '통합 검색',
    desc: '기본 정보, AI 분석, 경매 정보, 법원 정보, 등기 정보까지 5개 탭에서 모든 매물 정보를 한 번에 확인하세요.',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: FileText,
    title: 'AI 분석 리포트',
    desc: '채권별 투자 리스크, 예상 수익률, 시장 비교 분석을 A~D 등급으로 한눈에 파악할 수 있습니다.',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
  {
    icon: LineChart,
    title: '수익률 시뮬레이터',
    desc: '입찰가, 세금, 대출 조건, 보유 기간을 입력하면 예상 ROI를 자동으로 계산해 드립니다.',
    iconBg: 'bg-stone-100/10',
    iconColor: 'text-stone-900',
  },
];

const nplFlowSteps = [
  { label: '금융기관 대출', icon: Landmark, iconBg: 'bg-stone-100/10', iconColor: 'text-stone-900' },
  { label: '부실 발생', icon: TrendingUp, iconBg: 'bg-stone-100/10', iconColor: 'text-stone-900' },
  { label: 'NPL 매각', icon: ShoppingCart, iconBg: 'bg-stone-100/10', iconColor: 'text-stone-900' },
  { label: '투자자 매입', icon: Users, iconBg: 'bg-stone-100/10', iconColor: 'text-stone-900' },
  { label: '담보 처분/회수', icon: BadgeCheck, iconBg: 'bg-stone-100/10', iconColor: 'text-stone-900' },
];

const nplTerms = [
  {
    term: '감정가',
    desc: '법원이 선임한 감정인이 평가한 부동산의 시장 가치. NPL 투자 시 기준 가격으로 활용됩니다.',
  },
  {
    term: '낙찰가율',
    desc: '감정가 대비 실제 낙찰된 가격의 비율. 낙찰가율이 낮을수록 투자자에게 유리합니다.',
  },
  {
    term: 'LTV',
    desc: 'Loan to Value. 담보 가치 대비 대출 비율로, NPL 채권의 안전성을 판단하는 핵심 지표입니다.',
  },
  {
    term: '할인율',
    desc: '채권의 원금 대비 실제 매입 가격의 할인 비율. 높은 할인율은 높은 수익 가능성을 의미합니다.',
  },
];

const stats = [
  { label: '등록 매물', value: 500, suffix: '+건' },
  { label: '참여 금융기관', value: 15, suffix: '+개' },
  { label: '누적 거래액', value: 1200, suffix: '+억' },
  { label: 'AI 분석 완료', value: 2000, suffix: '+건' },
];

const partners = [
  'KB금융',
  '신한금융',
  '우리금융',
  '하나금융',
  'IBK기업은행',
  'NH농협',
  '한국자산관리공사(캠코)',
];

const faqs = [
  {
    q: 'NPL 투자란 무엇인가요?',
    a: 'NPL(Non-Performing Loan) 투자는 금융기관의 부실채권을 할인된 가격에 매입하여, 담보물 처분이나 채권 회수를 통해 수익을 실현하는 투자 방식입니다. 채권 원금보다 낮은 가격에 매입하므로 매입가와 회수액의 차이가 투자 수익이 됩니다.',
  },
  {
    q: '누구나 NPL 투자를 할 수 있나요?',
    a: '네, 개인과 법인 모두 NPL 투자가 가능합니다. 다만, 금융기관별로 입찰 참여 조건이 다를 수 있으며, 일부 대형 채권은 법인 투자자만 참여 가능한 경우도 있습니다. NPLatform에서는 투자자도 참여 가능한 매물을 별도로 안내해 드립니다.',
  },
  {
    q: 'NPLatform은 어떤 서비스인가요?',
    a: 'NPLatform은 국내 최초 AI 기반 NPL 투자 분석 및 거래 플랫폼입니다. NPL 매물 검색, 지도 탐색, AI 투자 분석, 경매 수익률 시뮬레이션, 입찰 참여, 통계 대시보드까지 NPL 투자에 필요한 모든 서비스를 한 곳에서 제공합니다.',
  },
  {
    q: '금융기관은 어떻게 입찰을 등록하나요?',
    a: '금융기관 회원으로 가입 후, 4단계 입찰 등록 위자드를 통해 간편하게 채권 정보와 입찰 조건을 등록할 수 있습니다. 채권 기본 정보, 담보물 정보, 입찰 조건, 최종 확인 단계를 거치면 매각 공고가 자동으로 게시됩니다.',
  },
  {
    q: '거래 시 정보 보안은 어떻게 보장되나요?',
    a: 'NPLatform은 NDA(비밀유지계약) 전자 서명 시스템과 전용 딜룸을 운영하고 있습니다. 채무자 개인정보, 담보물 상세 정보 등 민감한 데이터는 NDA 서명 후에만 열람할 수 있으며, 딜룸 내 모든 커뮤니케이션은 암호화되어 보호됩니다.',
  },
  {
    q: '수수료는 어떻게 되나요?',
    a: '기본 매물 검색 및 AI 분석 기능은 무료로 제공됩니다. 입찰 참여, 심층 분석 리포트, 딜룸 이용 등 프리미엄 기능은 요금제에 따라 차등 적용됩니다. 자세한 요금 안내는 고객센터 또는 서비스 내 요금 페이지를 참고해 주세요.',
  },
];

/* ------------------------------------------------------------------ */
/*  Stat counter component                                             */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  const { count, ref } = useCounter(value);
  return (
    <motion.div variants={fadeUp} className="text-center">
      <span
        ref={ref}
        className={DS.text.metricHero}
      >
        {count.toLocaleString()}
        <span className="text-stone-900">{suffix}</span>
      </span>
      <span className={`mt-2 block ${DS.text.caption}`}>{label}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function AboutPage() {
  return (
    <div className={DS.page.wrapper}>
      {/* ============================================================ */}
      {/*  1. Hero Section                                              */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden px-4 py-24 md:py-36 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeUp}>
            <span className={`${DS.text.label} text-[var(--color-brand-mid)] inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] mb-6`}>
              국내 최초 AI 기반 NPL 종합 플랫폼
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className={DS.text.pageTitle}
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            <span className="text-stone-900">NPLatform</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className={`mx-auto mt-6 max-w-2xl ${DS.text.body}`}
            style={{ fontSize: "1.125rem" }}
          >
            국내 최초 AI 기반 NPL 투자 분석 및 거래 플랫폼
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/signup" className={DS.button.accent}>
              회원가입 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/market/search" className={DS.button.secondary}>
              서비스 둘러보기 <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  1-B. 서비스 소개 영상                                          */}
      {/* ============================================================ */}
      <section className="px-4 py-16 md:py-20 bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center mb-10"
          >
            <motion.div variants={fadeUp}>
              <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>서비스 소개 영상</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              NPLatform을 영상으로 만나보세요
            </motion.h2>
            <motion.p variants={fadeUp} className={`mx-auto mt-3 max-w-xl ${DS.text.body}`}>
              AI 기반 NPL 투자 분석부터 거래 완결까지, 3분으로 정리한 서비스 소개 영상입니다.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={fadeUp}
          >
            <div className={`relative overflow-hidden rounded-2xl shadow-[var(--shadow-xl)] bg-black aspect-video`}>
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&color=white"
                title="NPLatform 서비스 소개 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
              />
            </div>
            <p className={`mt-3 text-center ${DS.text.captionLight}`}>
              영상이 재생되지 않으면{' '}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className={DS.text.link}
              >
                YouTube에서 보기
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. 서비스 개요 - 6 Feature Cards                              */}
      {/* ============================================================ */}
      <section className="px-4 py-20 md:py-28 bg-[var(--color-surface-elevated)]">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={DS.header.eyebrow}>서비스 개요</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              NPL 거래에 필요한 모든 것
            </motion.h2>
            <motion.p variants={fadeUp} className={`mx-auto mt-3 max-w-xl ${DS.text.body}`}>
              검색부터 분석, 입찰까지 하나의 플랫폼에서 완결하세요
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={scaleIn}>
                <Link href={f.href} className="block h-full">
                  <div className={`${DS.card.interactive} ${DS.card.padding} h-full group`}>
                    <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.iconBg} shadow-[var(--shadow-sm)]`}>
                      <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                    </div>
                    <h3 className={DS.text.cardTitle}>{f.title}</h3>
                    <p className={`${DS.text.body} mt-2`}>{f.desc}</p>
                    <span className={`mt-3 inline-flex items-center ${DS.text.link} opacity-0 transition-opacity group-hover:opacity-100`}>
                      자세히 보기 <ChevronRight className="ml-0.5 h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. 이용 프로세스 - 5 Step Flow                                */}
      {/* ============================================================ */}
      <section className="bg-[var(--color-surface-sunken)] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={DS.header.eyebrow}>이용 프로세스</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              5단계로 완성하는 NPL 투자
            </motion.h2>
          </motion.div>

          {/* Desktop: horizontal flow */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mt-16 hidden lg:block"
          >
            <div className="flex items-start justify-between">
              {processSteps.map((s, idx) => (
                <motion.div
                  key={s.num}
                  variants={fadeUp}
                  custom={idx}
                  className="flex flex-1 items-start"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100/10 border border-stone-300/20 shadow-[var(--shadow-sm)]">
                      <s.icon className="h-7 w-7 text-[var(--color-brand-mid)]" />
                    </div>
                    <div className="mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-[0.6875rem] font-bold text-white">
                      {s.num}
                    </div>
                    <h3 className={`mt-3 ${DS.text.bodyBold}`}>{s.title}</h3>
                    <p className={`mt-1 max-w-[140px] ${DS.text.caption}`}>
                      {s.desc}
                    </p>
                  </div>
                  {idx < processSteps.length - 1 && (
                    <div className="mt-7 flex flex-1 items-center justify-center px-2">
                      <div className="h-0.5 flex-1 bg-[var(--color-border-default)]" />
                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-900" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Mobile: vertical flow */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="relative mt-14 lg:hidden"
          >
            <div className="absolute left-6 top-0 h-full w-0.5 bg-[var(--color-border-default)]" />
            <div className="space-y-10">
              {processSteps.map((s, idx) => (
                <motion.div
                  key={s.num}
                  variants={fadeUp}
                  custom={idx}
                  className="relative flex items-start gap-5"
                >
                  <div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[var(--color-surface-sunken)] bg-stone-100/10 text-[0.8125rem] font-bold text-[var(--color-brand-mid)] shadow-[var(--shadow-sm)]">
                    {s.num}
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 text-[var(--color-brand-mid)]" />
                      <h3 className={DS.text.bodyBold}>{s.title}</h3>
                    </div>
                    <p className={`mt-1 ${DS.text.body}`}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  4. 금융기관을 위한 서비스                                       */}
      {/* ============================================================ */}
      <section className="px-4 py-20 md:py-28 bg-[var(--color-surface-elevated)]">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={`${DS.header.eyebrow} inline-flex items-center gap-1`}>
                <Building2 className="h-3 w-3" /> 금융기관
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              금융기관을 위한 서비스
            </motion.h2>
            <motion.p variants={fadeUp} className={`mx-auto mt-3 max-w-xl ${DS.text.body}`}>
              NPL 매각을 위한 최적의 플랫폼
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mt-14 grid gap-6 sm:grid-cols-3"
          >
            {financialCards.map((c) => (
              <motion.div key={c.title} variants={scaleIn}>
                <div className={`${DS.card.interactive} ${DS.card.padding} h-full`}>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg} shadow-[var(--shadow-sm)]`}>
                    <c.icon className={`h-6 w-6 ${c.iconColor}`} />
                  </div>
                  <h3 className={`mt-4 ${DS.text.cardTitle}`}>{c.title}</h3>
                  <p className={`mt-2 ${DS.text.body}`}>{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mt-10 text-center"
          >
            <Link href="/market/bidding/new" className={DS.button.primary}>
              금융기관 입찰 등록 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. 투자자를 위한 서비스                                        */}
      {/* ============================================================ */}
      <section className="bg-[var(--color-surface-sunken)] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={`${DS.header.eyebrow} inline-flex items-center gap-1`}>
                <TrendingUp className="h-3 w-3" /> 투자자
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              투자자를 위한 서비스
            </motion.h2>
            <motion.p variants={fadeUp} className={`mx-auto mt-3 max-w-xl ${DS.text.body}`}>
              데이터 기반의 스마트한 NPL 투자
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mt-14 grid gap-6 sm:grid-cols-3"
          >
            {investorCards.map((c) => (
              <motion.div key={c.title} variants={scaleIn}>
                <div className={`${DS.card.interactive} ${DS.card.padding} h-full`}>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg} shadow-[var(--shadow-sm)]`}>
                    <c.icon className={`h-6 w-6 ${c.iconColor}`} />
                  </div>
                  <h3 className={`mt-4 ${DS.text.cardTitle}`}>{c.title}</h3>
                  <p className={`mt-2 ${DS.text.body}`}>{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mt-10 text-center"
          >
            <Link href="/market/search" className={DS.button.accent}>
              NPL 검색 시작 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. NPL이란? 교육 섹션                                         */}
      {/* ============================================================ */}
      <section className="px-4 py-20 md:py-28 bg-[var(--color-surface-elevated)]">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={DS.header.eyebrow}>NPL 가이드</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              부실채권(Non-Performing Loan)이란?
            </motion.h2>
            <motion.p variants={fadeUp} className={`mx-auto mt-3 max-w-2xl ${DS.text.body}`}>
              금융기관이 실행한 대출 중 원리금 상환이 일정 기간 이상 연체된
              채권을 말합니다. 투자자는 이를 할인된 가격에 매입하여 수익을
              실현합니다.
            </motion.p>
          </motion.div>

          {/* NPL Flow Infographic */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mt-14"
          >
            {/* Desktop horizontal */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between">
                {nplFlowSteps.map((step, idx) => (
                  <motion.div
                    key={step.label}
                    variants={fadeUp}
                    custom={idx}
                    className="flex flex-1 items-center"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${step.iconBg} shadow-[var(--shadow-sm)]`}>
                        <step.icon className={`h-6 w-6 ${step.iconColor}`} />
                      </div>
                      <span className={`mt-3 ${DS.text.bodyMedium}`}>{step.label}</span>
                    </div>
                    {idx < nplFlowSteps.length - 1 && (
                      <div className="flex flex-1 items-center justify-center px-2">
                        <div className="h-0.5 flex-1 bg-[var(--color-border-default)]" />
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile vertical */}
            <div className="md:hidden">
              <div className="relative ml-6 border-l-2 border-[var(--color-border-default)] pl-8">
                {nplFlowSteps.map((step, idx) => (
                  <motion.div
                    key={step.label}
                    variants={fadeUp}
                    custom={idx}
                    className="relative mb-8 last:mb-0"
                  >
                    <div className={`absolute -left-[2.6rem] flex h-10 w-10 items-center justify-center rounded-full ${step.iconBg} shadow-[var(--shadow-sm)]`}>
                      <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                    </div>
                    <span className={DS.text.bodyMedium}>{step.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Key Terms */}
          <div className={`my-12 ${DS.divider.default}`} />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            <motion.h3
              variants={fadeUp}
              className={`mb-8 text-center ${DS.text.sectionSubtitle}`}
            >
              NPL 핵심 용어
            </motion.h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {nplTerms.map((t, idx) => (
                <motion.div key={t.term} variants={fadeUp} custom={idx}>
                  <div className={`${DS.card.base} ${DS.card.padding} h-full`}>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[0.6875rem] font-bold bg-[var(--color-brand-dark)] text-white mb-2">
                      {t.term}
                    </span>
                    <p className={`mt-2 ${DS.text.body}`}>{t.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. 숫자로 보는 NPLatform - Animated Counters                  */}
      {/* ============================================================ */}
      <section className="px-4 py-20 bg-[var(--color-surface-sunken)] border-y border-[var(--color-border-subtle)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
          className="mx-auto max-w-5xl"
        >
          <motion.h2
            variants={fadeUp}
            className={`mb-12 text-center ${DS.text.sectionTitle}`}
          >
            숫자로 보는 NPLatform
          </motion.h2>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                suffix={s.suffix}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  8. 파트너사                                                   */}
      {/* ============================================================ */}
      <section className="bg-[var(--color-surface-elevated)] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={`${DS.header.eyebrow} inline-flex items-center gap-1`}>
                <Handshake className="h-3 w-3" /> 파트너
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              함께하는 파트너사
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            {partners.map((name) => (
              <motion.div key={name} variants={scaleIn}>
                <span className={`inline-flex items-center gap-2 px-5 py-3 ${DS.card.base} ${DS.text.bodyMedium}`}>
                  <Landmark className="h-4 w-4 text-[var(--color-brand-mid)]" />
                  {name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  9. FAQ                                                       */}
      {/* ============================================================ */}
      <section className="px-4 py-20 md:py-28 bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeUp}>
              <span className={`${DS.header.eyebrow} inline-flex items-center gap-1`}>
                <Shield className="h-3 w-3" /> FAQ
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className={`${DS.text.sectionTitle} mt-4`}>
              자주 묻는 질문
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={fadeUp}
            className="mt-12"
          >
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`} className={`${DS.card.base} border px-0 overflow-hidden`}>
                  <AccordionTrigger className={`text-left px-6 py-4 ${DS.text.bodyBold} hover:no-underline`}>
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className={`px-6 pb-4 ${DS.text.body}`}>
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  10. Bottom CTA                                               */}
      {/* ============================================================ */}
      <section className="px-4 py-20 md:py-28 bg-[var(--color-surface-elevated)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2
            variants={fadeUp}
            className={DS.text.sectionTitle}
          >
            지금 NPLatform과 함께 시작하세요
          </motion.h2>
          <motion.p variants={fadeUp} className={`mt-4 ${DS.text.body}`}>
            NPL 투자의 시작과 끝, NPLatform이 함께합니다
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8">
            <Link href="/signup" className={DS.button.accent}>
              회원가입 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
