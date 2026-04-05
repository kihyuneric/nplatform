"use client"

import { useState } from "react"
import Link from "next/link"
import DS from "@/lib/design-system"
import {
  Code2,
  BarChart3,
  Gavel,
  Handshake,
  ScanText,
  Bell,
  Zap,
  Users,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  BookOpen,
  Key,
  Download,
  Globe,
  Lock,
  Cpu,
} from "lucide-react"

const stats = [
  { label: "API 호출 수/월", value: "12.8M+", icon: Zap, color: "text-emerald-600" },
  { label: "등록 개발자", value: "2,340+", icon: Users, color: "text-blue-600" },
  { label: "평균 응답시간", value: "45ms", icon: Clock, color: "text-amber-600" },
  { label: "API 가용률", value: "99.97%", icon: Shield, color: "text-emerald-600" },
]

const apiFeatures = [
  {
    icon: Code2,
    title: "매물 조회 API",
    description: "NPL 매물 목록 조회, 상세 정보, 필터링 및 정렬 기능을 제공합니다. 지역, 채권 유형, 가격대 등 다양한 조건으로 검색할 수 있습니다.",
    endpoint: "GET /api/v1/listings",
    pricing: "무료 100회/일",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: BarChart3,
    title: "시세 분석 API",
    description: "부동산 시세 데이터, 추이 분석, 감정가 대비 낙찰률 등 심층 분석 데이터를 실시간으로 제공합니다.",
    endpoint: "GET /api/v1/analytics/pricing",
    pricing: "Pro 이상",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Gavel,
    title: "경매 데이터 API",
    description: "전국 법원 경매 정보, 입찰 내역, 낙찰 통계를 조회합니다. 실시간 경매 일정 및 결과를 확인할 수 있습니다.",
    endpoint: "GET /api/v1/auctions",
    pricing: "무료 50회/일",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: Handshake,
    title: "거래 매칭 API",
    description: "매수자-매도자 자동 매칭, 거래 조건 비교, 최적 거래 상대방 추천 기능을 제공합니다.",
    endpoint: "POST /api/v1/matching",
    pricing: "Pro 이상",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    icon: ScanText,
    title: "OCR 문서인식 API",
    description: "등기부등본, 감정평가서, 채권양도계약서 등 부동산 관련 문서를 자동으로 인식하고 구조화된 데이터로 변환합니다.",
    endpoint: "POST /api/v1/ocr/extract",
    pricing: "건당 50 크레딧",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: Bell,
    title: "알림 Webhook",
    description: "관심 매물 상태 변경, 새로운 매물 등록, 가격 변동 등의 이벤트를 실시간으로 수신할 수 있는 Webhook을 설정합니다.",
    endpoint: "POST /api/v1/webhooks",
    pricing: "무료 5개 / Pro 무제한",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
]

const pricingTiers = [
  {
    name: "Free",
    price: "0",
    unit: "원/월",
    description: "개인 개발자 및 테스트용",
    features: [
      "API 호출 1,000회/일",
      "매물 조회 API",
      "경매 데이터 API (50회/일)",
      "기본 Webhook 5개",
      "커뮤니티 지원",
      "Sandbox 환경",
    ],
    cta: "무료로 시작하기",
    highlight: false,
  },
  {
    name: "Pro",
    price: "99,000",
    unit: "원/월",
    description: "스타트업 및 중소기업",
    features: [
      "API 호출 50,000회/일",
      "모든 API 엔드포인트 접근",
      "시세 분석 API",
      "거래 매칭 API",
      "무제한 Webhook",
      "OCR 월 500건 포함",
      "우선 기술 지원",
      "프로덕션 환경",
    ],
    cta: "Pro 시작하기",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "별도 문의",
    unit: "",
    description: "대기업 및 금융기관",
    features: [
      "무제한 API 호출",
      "전용 인프라 제공",
      "커스텀 엔드포인트 개발",
      "SLA 99.99% 보장",
      "OCR 무제한",
      "전담 기술 매니저",
      "온프레미스 배포 옵션",
      "보안 감사 보고서",
    ],
    cta: "영업팀 문의",
    highlight: false,
  },
]

const faqItems = [
  {
    question: "API 키는 어떻게 발급받나요?",
    answer:
      "NPLatform 계정에 로그인 후 개발자 대시보드에서 즉시 API 키를 발급받을 수 있습니다. Free 플랜은 가입 즉시 사용 가능하며, Pro 이상은 결제 완료 후 활성화됩니다.",
  },
  {
    question: "Rate Limit을 초과하면 어떻게 되나요?",
    answer:
      "Rate Limit 초과 시 429 Too Many Requests 응답이 반환됩니다. 응답 헤더의 X-RateLimit-Reset 값을 확인하여 재시도 시점을 파악할 수 있습니다. 지속적으로 한도가 부족하다면 상위 플랜으로 업그레이드를 권장합니다.",
  },
  {
    question: "테스트 환경(Sandbox)을 제공하나요?",
    answer:
      "네, 모든 플랜에서 Sandbox 환경을 제공합니다. Sandbox에서는 실제 데이터와 동일한 구조의 테스트 데이터로 API를 자유롭게 테스트할 수 있으며, 호출 횟수에 제한이 없습니다.",
  },
  {
    question: "기존 시스템과의 연동 지원을 받을 수 있나요?",
    answer:
      "Pro 플랜 이상에서는 기술 지원 팀의 연동 가이드를 제공하며, Enterprise 플랜에서는 전담 기술 매니저가 직접 연동을 지원합니다. REST API 외에도 GraphQL, gRPC 엔드포인트를 제공합니다.",
  },
]

const codeExample = `// NPLatform API - 매물 조회 예시
const response = await fetch("https://api.nplatform.co.kr/v1/listings", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  // 서울 지역, 10억 이하 NPL 매물 조회
  body: JSON.stringify({
    region: "서울",
    max_price: 1000000000,
    asset_type: "apartment",
    status: "active",
    page: 1,
    limit: 20,
  }),
});

const data = await response.json();

// 응답 예시
// {
//   "success": true,
//   "total": 142,
//   "page": 1,
//   "data": [
//     {
//       "id": "NPL-2026-00483",
//       "title": "서울 강남구 아파트 NPL 채권",
//       "claim_amount": 820000000,
//       "appraised_value": 1150000000,
//       "discount_rate": 28.7,
//       "status": "active",
//       "court": "서울중앙지방법원"
//     },
//     ...
//   ]
// }`

export default function DeveloperPortalPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Hero Section */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className={`${DS.page.container} pt-20 pb-16`}>
          <div className="text-center max-w-3xl mx-auto">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] mb-6`}>
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span className={DS.text.caption}>Developer API v2.0</span>
            </div>
            <h1 className={DS.text.pageTitle}>
              NPLatform
              <br />
              <span className="text-[var(--color-brand-mid)]">
                개발자 API
              </span>
            </h1>
            <p className={`${DS.text.body} mt-6 mb-10 max-w-2xl mx-auto`}>
              국내 최대 NPL 데이터를 귀사의 시스템에 직접 통합하세요.
              매물 조회, 시세 분석, 경매 데이터, 문서 OCR까지 —
              단 몇 줄의 코드로 부실채권 시장의 모든 데이터에 접근할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/my/developer" className={DS.button.primary}>
                <Key className="w-5 h-5" />
                API 키 발급받기
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#quick-start" className={DS.button.secondary}>
                <BookOpen className="w-5 h-5" />
                빠른 시작 가이드
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`${DS.page.container} py-12`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${DS.stat.card} text-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-3`} />
              <p className={DS.text.metricLarge}>{stat.value}</p>
              <p className={`${DS.text.caption} mt-1`}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Features Section */}
      <section className={`${DS.page.container} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={DS.text.sectionTitle}>API 주요 기능</h2>
          <p className={`${DS.text.body} mt-3 max-w-xl mx-auto`}>
            NPL 거래에 필요한 모든 데이터를 RESTful API로 제공합니다
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apiFeatures.map((feature) => (
            <div key={feature.title} className={`${DS.card.interactive} ${DS.card.padding}`}>
              <div className={`w-12 h-12 rounded-lg ${feature.iconBg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className={DS.text.cardTitle}>{feature.title}</h3>
              <p className={`${DS.text.body} mt-2 mb-4`}>
                {feature.description}
              </p>
              <div className={`flex items-center justify-between pt-4 ${DS.divider.default}`}>
                <code className="text-[0.75rem] text-emerald-700 font-mono bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  {feature.endpoint}
                </code>
                <span className={DS.text.captionLight}>{feature.pricing}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className={`${DS.page.container} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={DS.text.sectionTitle}>요금제</h2>
          <p className={`${DS.text.body} mt-3 max-w-xl mx-auto`}>
            프로젝트 규모에 맞는 요금제를 선택하세요
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`${DS.card.elevated} p-8 relative ${
                tier.highlight
                  ? "border-[var(--color-brand-mid)] shadow-[var(--shadow-lg)]"
                  : ""
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[0.6875rem] font-bold text-white bg-[var(--color-brand-mid)]">
                  가장 인기
                </div>
              )}
              <h3 className={DS.text.cardTitle}>{tier.name}</h3>
              <p className={`${DS.text.caption} mb-6`}>{tier.description}</p>
              <div className="mb-6">
                <span className={DS.text.metricLarge}>{tier.price}</span>
                {tier.unit && (
                  <span className={`${DS.text.caption} ml-1`}>{tier.unit}</span>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className={`flex items-start gap-2 ${DS.text.body}`}>
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/my/developer"
                className={`block text-center ${tier.highlight ? DS.button.primary : DS.button.secondary} w-full`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Start Section */}
      <section id="quick-start" className={`${DS.page.container} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={DS.text.sectionTitle}>Quick Start</h2>
          <p className={`${DS.text.body} mt-3 max-w-xl mx-auto`}>
            5분 안에 첫 번째 API 호출을 완료하세요
          </p>
        </div>
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {[
              { n: "1", title: "계정 생성", desc: "NPLatform에 가입하고 개발자 대시보드에 접속합니다." },
              { n: "2", title: "API 키 발급", desc: "대시보드에서 API 키를 생성합니다. 테스트용 Sandbox 키가 기본 제공됩니다." },
              { n: "3", title: "API 호출", desc: "오른쪽 예시 코드를 참고하여 첫 번째 요청을 보내보세요." },
              { n: "4", title: "프로덕션 배포", desc: "테스트가 완료되면 프로덕션 키로 전환하여 실서비스에 적용합니다." },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.8125rem] font-bold text-white bg-[var(--color-brand-dark)] flex-shrink-0">
                  {step.n}
                </div>
                <div>
                  <h4 className={DS.text.cardSubtitle}>{step.title}</h4>
                  <p className={`${DS.text.body} mt-1`}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={`lg:col-span-3 ${DS.card.elevated} overflow-hidden`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className={`${DS.text.micro} ml-2 font-mono`}>listings.js</span>
              </div>
              <button
                onClick={handleCopy}
                className={DS.button.ghost}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    복사
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-[0.8125rem] text-[var(--color-text-secondary)] font-mono overflow-x-auto leading-relaxed bg-[var(--color-surface-elevated)]">
              <code>{codeExample}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`${DS.page.container} pb-20`}>
        <div className={`${DS.card.hero} text-center`}>
          <h2 className={DS.text.sectionTitle}>지금 바로 시작하세요</h2>
          <p className={`${DS.text.body} mt-3 mb-8 max-w-lg mx-auto`}>
            API 문서를 확인하고, SDK를 다운로드하고, 키를 발급받아 NPL 데이터를 활용하세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/my/developer" className={DS.button.primary}>
              <BookOpen className="w-5 h-5" />
              API 문서 보기
            </Link>
            <Link href="/my/developer" className={DS.button.secondary}>
              <Download className="w-5 h-5" />
              SDK 다운로드
            </Link>
            <Link href="/my/developer" className={DS.button.secondary}>
              <Key className="w-5 h-5" />
              키 발급하기
            </Link>
          </div>
        </div>
      </section>

      {/* Supported Features Bar */}
      <section className={`${DS.page.container} pb-20`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Globe, label: "REST & GraphQL", desc: "다양한 프로토콜 지원" },
            { icon: Lock, label: "OAuth 2.0", desc: "안전한 인증 체계" },
            { icon: Cpu, label: "실시간 스트리밍", desc: "WebSocket & SSE" },
            { icon: Shield, label: "엔드투엔드 암호화", desc: "TLS 1.3 적용" },
          ].map((item) => (
            <div key={item.label} className={`${DS.stat.card} text-center`}>
              <item.icon className="w-5 h-5 text-[var(--color-brand-mid)] mx-auto mb-2" />
              <p className={DS.text.cardSubtitle}>{item.label}</p>
              <p className={DS.text.captionLight}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className={DS.text.sectionTitle}>자주 묻는 질문</h2>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div key={index} className={`${DS.card.base} overflow-hidden`}>
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                <span className={`${DS.text.bodyBold} pr-4`}>
                  {item.question}
                </span>
                {openFaq === index ? (
                  <ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                )}
              </button>
              {openFaq === index && (
                <div className="px-6 pb-4">
                  <p className={DS.text.body}>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
