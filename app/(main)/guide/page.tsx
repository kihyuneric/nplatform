"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight, BookOpen, Building2, Users, ChevronDown, Sparkles,
  Store, MessageSquare, BarChart3, Users2, UserCircle, Clock, Play,
  Gift, Banknote, Briefcase, TrendingUp, Shield, Crown,
} from "lucide-react"
import DS from "@/lib/design-system"

/* ─────────────────────────────────────────────────────────────
   Guide palette
   ───────────────────────────────────────────────────────────── */
const GUIDE_PALETTE = {
  exchange:  "#10B981",                 // 에메랄드
  dealroom:  "var(--color-brand-mid)",  // 블루
  analysis:  "#8B5CF6",                 // 퍼플
  community: "#F59E0B",                 // 앰버
  my:        "#EC4899",                 // 핑크
  free:      "#64748B",                 // 슬레이트
  seller:    "#F59E0B",                 // 앰버
  general:   "var(--color-brand-mid)",  // 블루
  pro:       "#8B5CF6",                 // 퍼플
} as const

/* ─────────────────────────────────────────────────────────────
   Menu-based guides (5 top navs × sub-sections)
   ───────────────────────────────────────────────────────────── */
const MENU_GUIDES = [
  {
    id: "exchange",
    menu: "거래소",
    tagline: "매물 탐색 · 등록 · 입찰",
    desc: "NPL 매물을 찾고, 등록하고, 입찰하는 모든 과정. 카드/리스트 뷰 필터부터 자동 마스킹 파이프라인까지.",
    href: "/guide/platform-tour",
    color: GUIDE_PALETTE.exchange,
    icon: Store,
    items: [
      { label: "매물 탐색 (카드·리스트 뷰)", href: "/guide/platform-tour" },
      { label: "매물 등록 6단계 위저드", href: "/guide/listing-register" },
      { label: "대량 등록 (Excel/CSV)", href: "/guide/listing-register" },
      { label: "OCR 자동채움", href: "/guide/listing-register" },
      { label: "매수 수요 등록 & AI 매칭", href: "/guide/investor" },
    ],
  },
  {
    id: "dealroom",
    menu: "딜룸",
    tagline: "LOI → NDA → 실사 → 오퍼 → 계약",
    desc: "매수자·매도자가 안전하게 진행하는 5단계 거래. 전자서명·문서함·에스크로가 하나의 딜룸에 통합.",
    href: "/guide/deal-process",
    color: GUIDE_PALETTE.dealroom,
    icon: MessageSquare,
    items: [
      { label: "딜룸 5단계 프로세스", href: "/guide/deal-process" },
      { label: "NDA 전자서명", href: "/guide/deal-process" },
      { label: "AI 매칭으로 매물 추천받기", href: "/guide/investor" },
      { label: "팀 투자 (공동투자 SPV)", href: "/guide/investor" },
      { label: "에스크로 안전결제", href: "/guide/deal-process" },
    ],
  },
  {
    id: "analysis",
    menu: "분석",
    tagline: "AI 분석 · 시뮬레이션 · 실사 리포트",
    desc: "Claude 기반 AI가 등급·리스크·수익률을 자동 분석. 경매 시뮬레이터와 Monte Carlo까지 한 화면에서.",
    href: "/guide/npl-analysis",
    color: GUIDE_PALETTE.analysis,
    icon: BarChart3,
    items: [
      { label: "NPL 분석 (등급 · 리스크)", href: "/guide/npl-analysis" },
      { label: "수익성 분석 4단계", href: "/guide/profitability" },
      { label: "경매 시뮬레이터", href: "/guide/auction-simulator" },
      { label: "실사 리포트 7섹션", href: "/guide/due-diligence" },
      { label: "AI Copilot 자연어 질문", href: "/guide/npl-analysis" },
    ],
  },
  {
    id: "community",
    menu: "커뮤니티",
    tagline: "뉴스 · 토론 · 리더보드",
    desc: "NPL 시장 뉴스와 인사이트, 실전 투자자들의 토론. 월간 랭킹과 추천 프로그램으로 네트워크를 확장.",
    href: "/guide/partner-referral",
    color: GUIDE_PALETTE.community,
    icon: Users2,
    items: [
      { label: "NPL 뉴스 & 시장 인사이트", href: "/guide/npl-basics" },
      { label: "투자자 토론·Q&A", href: "/guide/investor" },
      { label: "파트너 추천 프로그램", href: "/guide/partner-referral" },
      { label: "월간 리더보드 & 보너스", href: "/guide/partner-referral" },
    ],
  },
  {
    id: "my",
    menu: "마이 페이지",
    tagline: "포트폴리오 · 보안 · API",
    desc: "관심 매물, 진행 거래, 알림을 한눈에. 2FA·API 키·결제 정보와 추천 실적 관리까지.",
    href: "/guide/platform-tour",
    color: GUIDE_PALETTE.my,
    icon: UserCircle,
    items: [
      { label: "대시보드 (관심·진행·알림)", href: "/guide/platform-tour" },
      { label: "포트폴리오 리포팅", href: "/guide/institution" },
      { label: "보안 설정 (2FA)", href: "/guide/getting-started" },
      { label: "API 키 발급 & 웹훅", href: "/guide/institution" },
      { label: "결제 정보 & 정산", href: "/guide/institution" },
    ],
  },
] as const

/* ─────────────────────────────────────────────────────────────
   Role-based guides (매칭: /select-role · /pricing)
   ───────────────────────────────────────────────────────────── */
const ROLE_GUIDES = [
  {
    id: "free",
    title: "무료 체험",
    audience: "모든 방문자",
    color: GUIDE_PALETTE.free,
    icon: Gift,
    bullets: [
      "L0 공개 정보 무제한 열람",
      "AI Copilot 월 5회 질문",
      "경매 시뮬레이터 기본 시나리오",
    ],
    href: "/guide/getting-started",
  },
  {
    id: "seller-bank",
    title: "매각사 — 금융기관",
    audience: "은행 · 보험사 · 저축은행",
    color: GUIDE_PALETTE.seller,
    icon: Building2,
    bullets: [
      "대량 매물 등록 (Excel/CSV)",
      "자동 마스킹 · DPO 검수 파이프라인",
      "첫 6개월 수수료 면제",
      "API 연동 · 웹훅",
    ],
    href: "/guide/seller",
  },
  {
    id: "seller-loan",
    title: "매각사 — 대부업체",
    audience: "등록 대부업 · NPL 전문 대부",
    color: GUIDE_PALETTE.seller,
    icon: Banknote,
    bullets: [
      "대량 등록 · 포트폴리오 분할",
      "수의계약 · 입찰 컷오프 설정",
      "첫 6개월 수수료 면제",
    ],
    href: "/guide/seller",
  },
  {
    id: "seller-am",
    title: "매각사 — 자산운용사",
    audience: "AMC · 유동화전문회사",
    color: GUIDE_PALETTE.seller,
    icon: Briefcase,
    bullets: [
      "대규모 포트폴리오 일괄 매각",
      "L3 LOI 공개로 대부업체 매칭",
      "전담 딜룸 운영",
    ],
    href: "/guide/seller",
  },
  {
    id: "seller-corp",
    title: "매각사 — 일반 법인",
    audience: "일반 기업 · 특수채권 보유자",
    color: GUIDE_PALETTE.seller,
    icon: Building2,
    bullets: [
      "단건 매물 등록",
      "계약서 AI 검토 · 전자서명",
      "에스크로 안전결제",
    ],
    href: "/guide/seller",
  },
  {
    id: "investor-general",
    title: "일반 투자그룹",
    audience: "일반 기업 · 투자자",
    color: GUIDE_PALETTE.general,
    icon: TrendingUp,
    bullets: [
      "기본 수수료 -0.05%p 할인",
      "AI 분석 · 수익성 도구 무제한",
      "공동투자 SPV 참여",
      "월간 실사 리포트 5건",
    ],
    href: "/guide/investor",
  },
  {
    id: "investor-pro",
    title: "전문 투자그룹",
    audience: "전문 기관 · 인증 전문투자자",
    color: GUIDE_PALETTE.pro,
    icon: Crown,
    bullets: [
      "기본 수수료 -0.1%p 할인",
      "L2 NDA 자동 권한 · L3 LOI 우선",
      "우선협상권(PNR) 옵션",
      "API 무제한 · 전담 매니저",
    ],
    href: "/guide/investor",
  },
] as const

const GLOSSARY = [
  { term: "NPL", def: "Non-Performing Loan. 3개월 이상 연체된 부실채권. 원리금 회수가 정상적으로 이루어지지 않는 대출." },
  { term: "LTV", def: "Loan To Value. 담보가치 대비 대출잔액 비율. 낮을수록 안전, 높을수록 회수 리스크 증가." },
  { term: "채권잔액", def: "원금 + 연체이자 + 법적비용의 총합. 매각 가격의 기준이 되는 숫자." },
  { term: "PNR", def: "Priority Negotiation Right. 우선협상권. 동일 조건 오퍼에서 우선 매수권을 확보하는 옵션 (+0.3%p)." },
  { term: "할인율", def: "채권잔액 대비 매각가의 차감율. 높을수록 수익 여력이 크지만 리스크도 함께 커짐." },
  { term: "자료완성도 (0-10)", def: "등기부·감정평가서·세입자현황 등 실사자료 구비도 점수. 8점 이상이 표준 거래 가능권." },
]

const VIDEOS = [
  { title: "5분 빠른 시작 — 회원가입부터 첫 매물 탐색", duration: "5:12", thumb: "입문" },
  { title: "AI 수익성 분석 보고서 읽는 법", duration: "8:44", thumb: "AI 분석" },
  { title: "딜룸으로 안전하게 거래하기", duration: "11:30", thumb: "딜룸" },
  { title: "실제 매물로 AI 리포트 만들어보기", duration: "14:20", thumb: "실전 워크스루" },
]

const FAQ = [
  { q: "수수료는 어떻게 되나요?", a: "매수자 기본 수수료는 NPL 1.5%, 부동산 0.9%이며, 우선협상권(PNR) 선택 시 +0.3%p 가산됩니다. 일반 투자그룹은 -0.05%p, 전문 투자그룹은 -0.1%p 할인이 적용됩니다. 매각사는 첫 6개월 수수료가 무료입니다." },
  { q: "최소 투자금액은?", a: "A등급 매물 기준 5천만원부터 참여 가능합니다. 공동투자 SPV 방식으로는 1천만원부터 진입할 수 있으며, 펀드 LP 참여 시 최소 3천만원입니다." },
  { q: "세금은 어떻게 되나요?", a: "양도차익은 금융투자소득세 대상이며, 채권 원금 손실분은 대손금으로 처리 가능합니다. 이자수익은 15.4% 원천징수되고, 종합과세 합산 여부는 금액에 따라 달라집니다." },
  { q: "개인도 투자가 가능한가요?", a: "회원가입 시 역할 선택에서 「투자그룹 → 일반 · 개인」 또는 「전문 · 개인」을 선택하면 투자자로 가입할 수 있습니다. 전문투자자 인증이 없는 개인은 L0~L1 매물에 접근 가능하며, L2 이상은 NDA 체결이 필요합니다." },
  { q: "매각사 가입은 어떻게 하나요?", a: "회원가입 시 역할 선택에서 「매각사」를 고르고 금융기관/대부업체/자산운용사/일반 법인 중 세부 유형을 선택합니다. 담당자 이메일 인증 후 관리자 승인이 완료되면 대량 등록·API 연동이 활성화됩니다." },
  { q: "위험 대비책은 무엇인가요?", a: "L0~L3 계층형 접근통제, 자금 에스크로 보관, 전자계약·NDA 자동 체결, AI 리스크 스코어링(28,391건 학습)으로 리스크를 사전 통제합니다. 분쟁 발생 시 법무 파트너 연계 지원." },
]

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [activeMenu, setActiveMenu] = useState<string>(MENU_GUIDES[0].id)
  const current = MENU_GUIDES.find((m) => m.id === activeMenu) ?? MENU_GUIDES[0]

  return (
    <div className={DS.page.wrapper}>
      {/* ══════════ 1. HERO ══════════ */}
      <section
        className="relative overflow-hidden px-6 py-20"
        style={{ backgroundColor: "#050D1A" }}
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px at 30% 30%, #10B98122, transparent), radial-gradient(500px at 75% 70%, #8B5CF622, transparent)",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <span
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-widest"
            style={{
              backgroundColor: "#10B98115",
              border: "1px solid #10B98140",
              color: "#34D399",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            NPLatform 사용 가이드
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            <span style={{ color: "#34D399" }}>메뉴별 · 역할별</span>로 찾는<br />NPL 플랫폼 완벽 가이드
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
            거래소 · 딜룸 · 분석 · 커뮤니티 · 마이 페이지 — 메뉴 그대로, 하위 기능까지 단계별로 안내합니다.
          </p>
        </div>
      </section>

      <div className={`${DS.page.container} max-w-6xl py-14`}>
        {/* ══════════ 2. 메뉴별 가이드 (Tab UI) ══════════ */}
        <section className="mb-16">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>메뉴별 사용 가이드</h2>
          <p className={`${DS.text.caption} mb-6`}>
            상단 네비게이션 5개 메뉴와 하위 기능을 그대로 따라가며 배웁니다.
          </p>

          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-6">
            {MENU_GUIDES.map((m) => {
              const active = m.id === activeMenu
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMenu(m.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: active ? `${m.color}20` : "var(--color-surface-sunken)",
                    border: `1px solid ${active ? `${m.color}60` : "var(--color-border-subtle)"}`,
                    color: active ? m.color : "var(--color-text-secondary)",
                  }}
                >
                  <m.icon className="w-4 h-4" />
                  {m.menu}
                </button>
              )
            })}
          </div>

          {/* Active menu detail */}
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <div className="grid md:grid-cols-[1fr_1.5fr] gap-8">
              <div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${current.color}15`, border: `1px solid ${current.color}30` }}
                >
                  <current.icon className="w-6 h-6" style={{ color: current.color }} />
                </div>
                <p className="text-[0.65rem] font-bold tracking-wider mb-1" style={{ color: current.color }}>
                  MENU · {current.menu.toUpperCase()}
                </p>
                <h3 className={`${DS.text.cardTitle} mb-3`}>{current.tagline}</h3>
                <p className={`${DS.text.caption} leading-relaxed mb-5`}>{current.desc}</p>
                <Link
                  href={current.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: current.color }}
                >
                  전체 가이드 바로가기 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div>
                <p className={`${DS.text.label} mb-3`}>하위 기능 단계</p>
                <ol className="space-y-2">
                  {current.items.map((it, i) => (
                    <li key={`${current.id}-${i}`}>
                      <Link
                        href={it.href}
                        className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[var(--color-surface-sunken)]"
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[0.7rem] font-bold shrink-0"
                          style={{
                            backgroundColor: `${current.color}15`,
                            border: `1px solid ${current.color}40`,
                            color: current.color,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className={`${DS.text.body} flex-1`}>{it.label}</span>
                        <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ 3. 역할별 가이드 ══════════ */}
        <section className="mb-16">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>역할별 사용 가이드</h2>
          <p className={`${DS.text.caption} mb-6`}>
            무료 체험 · 매각사 4종 · 일반/전문 투자그룹 — 당신의 역할에 맞춘 핵심 기능 요약.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_GUIDES.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className={`${DS.card.interactive} group block ${DS.card.padding}`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${r.color}15`, border: `1px solid ${r.color}30` }}
                >
                  <r.icon className="w-5 h-5" style={{ color: r.color }} />
                </div>
                <p className="text-[0.65rem] font-bold tracking-wider mb-1" style={{ color: r.color }}>
                  {r.audience}
                </p>
                <h3 className={`${DS.text.bodyBold} mb-3`}>{r.title}</h3>
                <ul className="space-y-1.5 mb-4">
                  {r.bullets.map((b, i) => (
                    <li key={i} className={`${DS.text.caption} flex items-start gap-2`}>
                      <span className="shrink-0 mt-[6px] w-1 h-1 rounded-full" style={{ backgroundColor: r.color }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold" style={{ color: r.color }}>
                  이 역할 가이드 보기 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════ 4. 용어 사전 프리뷰 ══════════ */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className={`${DS.text.sectionTitle} mb-2`}>NPL 용어 사전</h2>
              <p className={DS.text.caption}>핵심 6개 용어만 미리 확인하세요</p>
            </div>
            <Link
              href="/guide/glossary"
              className="text-xs font-semibold inline-flex items-center gap-1"
              style={{ color: "#10B981" }}
            >
              전체 사전 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLOSSARY.map((g, i) => (
              <div key={i} className={`${DS.card.base} ${DS.card.padding}`}>
                <p className="text-lg font-extrabold mb-2" style={{ color: "#10B981" }}>
                  {g.term}
                </p>
                <p className={`${DS.text.caption} leading-relaxed`}>{g.def}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ 5. 영상 튜토리얼 ══════════ */}
        <section className="mb-16">
          <h2 className={`${DS.text.sectionTitle} mb-6`}>영상 튜토리얼</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VIDEOS.map((v, i) => (
              <div key={i} className={`${DS.card.interactive} overflow-hidden group cursor-pointer`}>
                <div className="bg-[var(--color-brand-dark)] h-36 flex flex-col items-center justify-center relative">
                  <span className="text-[0.75rem] text-blue-300/60 mb-2">{v.thumb}</span>
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                  <span className="absolute bottom-3 right-3 text-[0.6875rem] bg-black/60 text-white px-2 py-0.5 rounded">
                    {v.duration}
                  </span>
                </div>
                <div className="p-4">
                  <p className={`${DS.text.bodyBold} leading-snug`}>{v.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ 6. FAQ ══════════ */}
        <section className="mb-16">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>자주 묻는 질문</h2>
          <p className={`${DS.text.caption} mb-6`}>가장 많이 물어본 6가지</p>
          <div className={`${DS.card.base} divide-y divide-[var(--color-border-subtle)]`}>
            {FAQ.map((f, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`${DS.text.bodyBold} flex-1`}>Q. {f.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--color-text-tertiary)] shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </div>
                {openFaq === i && (
                  <p className={`${DS.text.body} mt-3 leading-relaxed text-[var(--color-text-secondary)]`}>
                    A. {f.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ══════════ 7. CTA ══════════ */}
        <div className={`${DS.card.elevated} p-8 text-center`}>
          <p className={`${DS.text.label} mb-3`}>SUPPORT</p>
          <h3 className={`${DS.text.sectionSubtitle} mb-2`}>아직 해결되지 않은 질문이 있나요?</h3>
          <p className={`${DS.text.body} mb-6`}>
            NPL 전문 상담사가 1:1로 응답해드립니다 — 평균 응답 시간 12분.
          </p>
          <Link href="/support" className={DS.button.primary}>
            고객센터 바로가기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
