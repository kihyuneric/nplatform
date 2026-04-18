"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight, BookOpen, Building2, Briefcase, Users, Clock, Play,
  ChevronDown, Scale, Calculator, FileText, ShieldCheck, Banknote,
  Gavel, TrendingUp, Sparkles, FileUp,
} from "lucide-react"
import DS from "@/lib/design-system"

/* ─────────────────────────────────────────────────────────────
   Content
   ───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    icon: BookOpen,
    title: "초보자",
    tagline: "NPL이 뭐야? 5분 완성",
    desc: "용어 · 구조 · 수익 메커니즘을 차근차근 익힙니다. 경매·공매와 NPL의 차이부터 배당까지.",
    href: "/guide/getting-started",
    color: "#10B981",
  },
  {
    icon: Briefcase,
    title: "투자자",
    tagline: "첫 NPL 투자 체크리스트 12개",
    desc: "매물 고르는 기준 · 함정 피하기 · IRR 역산 방법. 실패 사례 12가지로 배우는 리스크 관리.",
    href: "/guide/investor",
    color: "#8B5CF6",
  },
  {
    icon: Building2,
    title: "매도자 (기관)",
    tagline: "매각 효율 극대화 가이드",
    desc: "등록 · 가격 책정 · 입찰 전략. 대량 매각 시 포트폴리오 분할과 입찰 컷오프 설정 요령.",
    href: "/guide/seller",
    color: "#F59E0B",
  },
  {
    icon: Users,
    title: "전문가 · 파트너",
    tagline: "감정평가·법무·컨설팅 파트너십",
    desc: "API 연동 · 수익 분배 · 전문가 프로필 노출. 파트너 등급별 혜택과 리퍼럴 커미션 체계.",
    href: "/guide/institution",
    color: "#2E75B6",
  },
]

const CORE_GUIDES = [
  // 플랫폼 기능 (2026-04 업데이트 — 신규 OCR 자동채움·AI 컨설턴트·경매 수익률 분석기 반영)
  { title: "OCR 자동채움 — 서류 업로드로 NPL 분석 시작", desc: "채권 소개서·경매 물건 명세서·감정평가서 PDF를 올리면 AI가 사건번호·주소·평가액·담보유형을 자동 입력. NPL 분석 새로 만들기와 매물 일괄 등록 모두 지원.", time: "4분", cat: "플랫폼", icon: Sparkles },
  { title: "AI 컨설턴트 활용법", desc: "자연어로 매물·수익구조·리스크에 대해 질문. Claude 기반 분석 엔진이 플랫폼 데이터와 연결해 근거 있는 답변을 제공합니다.", time: "6분", cat: "플랫폼", icon: Sparkles },
  { title: "경매 수익률 분석기", desc: "낙찰가·배당금·세금·회수기간을 단일 화면에서 시뮬레이션. 여러 시나리오(보수/중립/낙관) 동시 비교.", time: "7분", cat: "플랫폼", icon: Calculator },
  { title: "계약서 자동 생성", desc: "채권양도·NDA·LOI 템플릿에 변수를 채워 전자계약으로 바로 송부. 분쟁시 공증 연계.", time: "5분", cat: "플랫폼", icon: FileText },
  { title: "매물 일괄 등록 (1~5건 OCR)", desc: "/exchange/ocr-register 페이지에서 서류별로 OCR → 자동 매핑 → 한 번에 1~5건 등록. 부분 실패 허용(207 응답).", time: "6분", cat: "플랫폼", icon: FileUp },
  // 실무 (기존)
  { title: "배당표 읽는 법", desc: "경매 배당순위, 말소기준권리 이전/이후, 체납공과금 우선변제 구조를 한눈에.", time: "7분", cat: "배당", icon: FileText },
  { title: "말소기준권리란", desc: "저당권·근저당권·가압류·담보가등기 중 최선순위. 이후 권리는 전부 소멸된다는 의미.", time: "5분", cat: "권리분석", icon: Scale },
  { title: "방어입찰 전략", desc: "자기 채권을 보호하기 위한 응찰. 예상낙찰가·배당예상액·상계신청 타이밍.", time: "10분", cat: "입찰", icon: Gavel },
  { title: "NPL 세금: 금투세·대손금", desc: "금융투자소득세 대상 여부, 대손금 처리, 양도·매각차익과 이자수익 구분.", time: "8분", cat: "세무", icon: Banknote },
  { title: "권리분석 체크리스트", desc: "등기부·건축물대장·전입세대 열람, 유치권·법정지상권 점검 10단계.", time: "12분", cat: "실사", icon: ShieldCheck },
  { title: "경매 vs 임의매각 선택법", desc: "회수 속도, 할인율, 소송 리스크 비교. 케이스별 권장 루트 플로우차트.", time: "6분", cat: "전략", icon: TrendingUp },
  { title: "채권양도 통지 실무", desc: "양도양수 계약 · 확정일자 · 내용증명. 제3채무자 대항요건 갖추는 법.", time: "9분", cat: "법무", icon: FileText },
  { title: "AMC vs 금융기관 차이", desc: "매각 목적·가격 · 자료 완성도 차이. 어느 쪽에서 사는 게 유리한가.", time: "5분", cat: "시장구조", icon: Building2 },
  { title: "IRR vs ROI 올바른 해석", desc: "기간 고려 여부, 재투자 가정, NPL 특유의 현금흐름 패턴에서 어떤 지표를 볼지.", time: "8분", cat: "분석", icon: Calculator },
  { title: "자금 조달 (펀드·공동투자)", desc: "NPL 전문펀드 LP 참여, 공동투자 SPV 구성, 레버리지 한도와 금리 밴드.", time: "10분", cat: "펀딩", icon: Banknote },
  { title: "담보부동산 명도 실무", desc: "인도명령 신청 · 강제집행 · 이사비 협상. 임차인 대항력과 우선변제권.", time: "11분", cat: "실무", icon: ShieldCheck },
  { title: "연체이자·지연배당 계산", desc: "약정이율, 상사법정이율, 배당 지연 시 지연손해금 가산 방법.", time: "6분", cat: "계산", icon: Calculator },
]

const GLOSSARY = [
  { term: "NPL", def: "Non-Performing Loan. 3개월 이상 연체된 부실채권. 원리금 회수가 정상적으로 이루어지지 않는 대출." },
  { term: "LTV", def: "Loan To Value. 담보가치 대비 대출잔액 비율. 낮을수록 안전, 높을수록 회수 리스크 증가." },
  { term: "채권잔액", def: "원금 + 연체이자 + 법적비용의 총합. 매각 가격의 기준이 되는 숫자." },
  { term: "매각희망가", def: "매도자가 제시하는 최저 수용 가격. 플랫폼에서는 공개·비공개 설정 가능." },
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
  { q: "최소 투자금액은?", a: "A등급 매물 기준 5천만원부터 참여 가능합니다. 공동투자 SPV 방식으로는 1천만원부터 진입할 수 있으며, 펀드 LP 참여 시 최소 3천만원입니다." },
  { q: "세금은 어떻게 되나요?", a: "양도차익은 금융투자소득세 대상이며, 채권 원금 손실분은 대손금으로 처리 가능합니다. 이자수익은 15.4% 원천징수되고, 종합과세 합산 여부는 금액에 따라 달라집니다." },
  { q: "유동성이 낮다는데 괜찮은가요?", a: "NPL은 기본적으로 중장기 상품이지만, NPLatform은 2차 유통시장을 운영해 중도 매각이 가능합니다. 또한 배당 회수 전에도 이자 청구권 양도로 현금흐름을 만들 수 있습니다." },
  { q: "개인도 투자가 가능한가요?", a: "본인인증 L1 이상 회원은 일정 매물에 한해 개인 투자가 가능합니다. 대형 포트폴리오(50억 초과)는 기관·전문투자자만 접근 가능하며, L0 단계에서는 요약정보만 열람됩니다." },
  { q: "위험 대비책은 무엇인가요?", a: "L0~L3 계층형 접근통제, 자금 에스크로 보관, 전자계약·NDA 자동 체결, AI 리스크 스코어링(28,391건 학습)으로 리스크를 사전 통제합니다. 분쟁 발생 시 법무 파트너 연계 지원." },
  { q: "수수료는 어떻게 되나요?", a: "투자자는 거래금액의 0.9%를 상한으로 합니다(100억 초과 구간 0.5%). 매도자에게는 0%이며, 프리미엄 매물 리스팅·전용 딜룸 등 옵션 서비스만 유료입니다." },
]

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className={DS.page.wrapper}>
      {/* ══════════ 1. HERO (dark) ══════════ */}
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
            NPL 완벽 가이드
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            NPL 투자, <span style={{ color: "#34D399" }}>이론이 아니라 실전</span>으로
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
            매입 전 실사부터 배당 회수까지 — 현장 실무자가 검증한 가이드입니다.
          </p>
        </div>
      </section>

      <div className={`${DS.page.container} max-w-6xl py-14`}>
        {/* ══════════ 2. 역할별 가이드 ══════════ */}
        <section className="mb-16">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>역할별 가이드</h2>
          <p className={`${DS.text.caption} mb-6`}>당신의 목적에 맞는 루트를 선택하세요</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.title} href={cat.href} className={`${DS.card.interactive} group block ${DS.card.padding}`}>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                >
                  <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <p className="text-[0.65rem] font-bold tracking-wider mb-1" style={{ color: cat.color }}>
                  {cat.title.toUpperCase()}
                </p>
                <h3 className={`${DS.text.bodyBold} mb-2`}>{cat.tagline}</h3>
                <p className={`${DS.text.caption} leading-relaxed mb-4`}>{cat.desc}</p>
                <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold" style={{ color: cat.color }}>
                  바로가기 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════ 3. 핵심 실무 가이드 ══════════ */}
        <section className="mb-16">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>핵심 실무 가이드</h2>
          <p className={`${DS.text.caption} mb-6`}>
            실제 거래 현장에서 반드시 알아야 할 12가지 핵심 주제
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CORE_GUIDES.map((g, i) => (
              <Link
                key={i}
                href={`/guide/${encodeURIComponent(g.title)}`}
                className={`${DS.card.interactive} group block ${DS.card.padding}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#10B98110", border: "1px solid #10B98130" }}
                  >
                    <g.icon className="w-4 h-4" style={{ color: "#10B981" }} />
                  </div>
                  <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)]">
                    {g.cat}
                  </span>
                </div>
                <h3 className={`${DS.text.bodyBold} mb-2 group-hover:text-[var(--color-brand-mid)] transition-colors`}>
                  {g.title}
                </h3>
                <p className={`${DS.text.caption} leading-relaxed mb-3 line-clamp-3`}>{g.desc}</p>
                <span className={`flex items-center gap-1 ${DS.text.micro}`}>
                  <Clock className="w-3 h-3" /> 읽기 {g.time}
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
          <p className={`${DS.text.caption} mb-6`}>실제 투자자들이 가장 많이 물어본 6가지</p>
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
