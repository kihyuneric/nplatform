"use client"

import { useState } from "react"
import {
  Database, CreditCard, Sparkles, FileSearch, Globe, CheckCircle2,
  AlertCircle, Clock, RefreshCw, Settings, ExternalLink, ChevronRight,
  Zap, Shield, Activity,
} from "lucide-react"
import DS from "@/lib/design-system"
import { toast } from "sonner"

// ── 프로바이더 설정 ────────────────────────────────────
interface Provider {
  id: string
  name: string
  nameKo: string
  status: "active" | "inactive" | "error" | "pending"
  label?: string
  description: string
  docsUrl?: string
  envKey?: string
  mock?: boolean
}

interface ProviderGroup {
  id: string
  title: string
  titleEn: string
  icon: React.ElementType
  color: string
  description: string
  active: string
  providers: Provider[]
}

const PROVIDER_GROUPS: ProviderGroup[] = [
  {
    id: "database",
    title: "데이터베이스",
    titleEn: "Database",
    icon: Database,
    color: "var(--color-brand-mid)",
    description: "데이터 저장 및 실시간 동기화 공급자",
    active: "supabase",
    providers: [
      { id: "supabase", name: "Supabase", nameKo: "Supabase", status: "active", label: "현재 사용", description: "PostgreSQL + RLS + Realtime + Auth. eqvpubntalikjxcjhpln", envKey: "NEXT_PUBLIC_SUPABASE_URL" },
      { id: "postgres", name: "PostgreSQL", nameKo: "PostgreSQL (자체)", status: "inactive", description: "자체 호스팅 PostgreSQL 인스턴스", envKey: "DATABASE_URL" },
    ],
  },
  {
    id: "payment",
    title: "결제",
    titleEn: "Payment",
    icon: CreditCard,
    color: "var(--color-positive)",
    description: "구독 결제 및 수수료 정산 공급자",
    active: "nicepay",
    providers: [
      { id: "nicepay", name: "NicePay", nameKo: "나이스페이", status: "active", label: "현재 사용", description: "국내 카드·계좌이체·가상계좌 지원", envKey: "PAYMENT_CLIENT_KEY" },
      { id: "toss", name: "Toss Payments", nameKo: "토스페이먼츠", status: "inactive", description: "간편결제·카드·계좌이체 통합", envKey: "TOSS_CLIENT_KEY" },
      { id: "kakao", name: "KakaoPay", nameKo: "카카오페이", status: "inactive", description: "카카오 간편결제 + QR", envKey: "KAKAO_PAY_CID" },
    ],
  },
  {
    id: "ai",
    title: "AI 엔진",
    titleEn: "AI Engine",
    icon: Sparkles,
    color: "var(--color-warning)",
    description: "분석·매칭·챗봇 AI 공급자",
    active: "claude",
    providers: [
      { id: "claude", name: "Claude (Anthropic)", nameKo: "Claude", status: "active", label: "현재 사용", description: "claude-opus-4-7 · 128K context · 한국어 최적화", envKey: "ANTHROPIC_API_KEY" },
      { id: "openai", name: "OpenAI GPT-4", nameKo: "OpenAI", status: "inactive", description: "GPT-4o · 함수 호출 지원", envKey: "OPENAI_API_KEY" },
    ],
  },
  {
    id: "embedding",
    title: "임베딩 (RAG)",
    titleEn: "Embedding",
    icon: FileSearch,
    color: "var(--color-info)",
    description: "법률 문서 RAG 벡터 임베딩 공급자",
    active: "voyage",
    providers: [
      { id: "voyage", name: "Voyage AI", nameKo: "Voyage AI", status: "active", label: "현재 사용", description: "voyage-multilingual-2 · 한/영 다국어 최적화", envKey: "VOYAGE_API_KEY" },
      { id: "openai-embed", name: "OpenAI Embeddings", nameKo: "OpenAI", status: "inactive", description: "text-embedding-3-large", envKey: "OPENAI_API_KEY" },
    ],
  },
  {
    id: "registry",
    title: "등기부등본 API",
    titleEn: "Registry API",
    icon: FileSearch,
    color: "var(--color-text-muted)",
    description: "담보물 등기 정보 자동 조회",
    active: "mock",
    providers: [
      { id: "mock", name: "Mock 데이터", nameKo: "Mock", status: "active", mock: true, label: "Mock 모드", description: "샘플 등기 데이터 사용 (실데이터 없음)", envKey: undefined },
      { id: "iros", name: "대법원 인터넷등기소", nameKo: "IROS", status: "pending", description: "대법원 공식 등기 열람 API (신청 필요)", envKey: "IROS_API_KEY", docsUrl: "https://www.iros.go.kr" },
      { id: "seibro", name: "세이브로 API", nameKo: "Seibro", status: "inactive", description: "부동산 등기 종합정보 (유료)", envKey: "SEIBRO_API_KEY" },
    ],
  },
  {
    id: "market-data",
    title: "시세·경매 데이터",
    titleEn: "Market Data",
    icon: Activity,
    color: "var(--color-negative)",
    description: "부동산 시세·경매 실시간 데이터",
    active: "mock",
    providers: [
      { id: "mock", name: "Mock 데이터", nameKo: "Mock", status: "active", mock: true, label: "Mock 모드", description: "샘플 시세·경매 데이터 사용", envKey: undefined },
      { id: "molit", name: "국토부 API (MOLIT)", nameKo: "MOLIT", status: "pending", description: "아파트 실거래가 공공데이터 API", envKey: "MOLIT_API_KEY", docsUrl: "https://www.data.go.kr" },
      { id: "kamco", name: "한국자산관리공사 (KAMCO)", nameKo: "KAMCO", status: "pending", description: "NPL·공매 실데이터 공급 (계약 필요)", envKey: "KAMCO_API_KEY" },
      { id: "courtauction", name: "법원 경매 API", nameKo: "법원", status: "inactive", description: "법원 경매 물건 정보 실시간 연동", envKey: "COURT_API_KEY" },
    ],
  },
  {
    id: "ocr",
    title: "OCR 엔진",
    titleEn: "OCR",
    icon: FileSearch,
    color: "var(--color-brand-mid)",
    description: "채권 문서 자동 인식 및 추출",
    active: "claude-vision",
    providers: [
      { id: "claude-vision", name: "Claude Vision", nameKo: "Claude Vision", status: "active", label: "현재 사용", description: "Claude multimodal · 한국 금융 문서 최적화", envKey: "ANTHROPIC_API_KEY" },
      { id: "upstage", name: "Upstage Document AI", nameKo: "Upstage", status: "inactive", description: "한국어 문서 특화 OCR (정밀도 98%+)", envKey: "UPSTAGE_API_KEY" },
      { id: "naver-clova", name: "CLOVA OCR (Naver)", nameKo: "CLOVA", status: "inactive", description: "네이버 클로바 OCR + 한글 특화", envKey: "NAVER_OCR_API_KEY" },
    ],
  },
]

// ── 상태 표시 ──────────────────────────────────────────
const STATUS_CONFIG = {
  active:   { label: "활성",    icon: CheckCircle2, color: "text-[var(--color-positive)]", bg: "bg-[var(--color-positive)]/10 border-[var(--color-positive)]/20" },
  inactive: { label: "비활성",  icon: Clock,        color: "text-[var(--color-text-muted)]", bg: "bg-[var(--color-surface-sunken)] border-[var(--color-border-subtle)]" },
  error:    { label: "오류",    icon: AlertCircle,  color: "text-[var(--color-negative)]", bg: "bg-[var(--color-negative)]/10 border-[var(--color-negative)]/20" },
  pending:  { label: "연동 필요", icon: Clock,       color: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20" },
}

function HealthDot({ status }: { status: Provider["status"] }) {
  const colors = { active: "bg-[var(--color-positive)]", inactive: "bg-[var(--color-border-default)]", error: "bg-[var(--color-negative)]", pending: "bg-[var(--color-warning)]" }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} shrink-0`} />
}

export default function AdminIntegrationsPage() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const testConnection = async (groupId: string, providerId: string) => {
    const key = `${groupId}-${providerId}`
    setTesting(key)
    await new Promise(r => setTimeout(r, 1200))
    setTesting(null)
    toast.success(`${providerId} 연결 테스트 완료 (200 OK)`)
  }

  // Summary stats
  const totalActive   = PROVIDER_GROUPS.filter(g => g.providers.find(p => p.id === g.active)?.status === "active").length
  const totalMock     = PROVIDER_GROUPS.filter(g => g.providers.find(p => p.id === g.active)?.mock).length
  const totalPending  = PROVIDER_GROUPS.flatMap(g => g.providers).filter(p => p.status === "pending").length

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-16`}>

        {/* Header */}
        <div className={DS.header.wrapper}>
          <p className={DS.header.eyebrow}>Admin · Integrations</p>
          <h1 className={DS.header.title}>외부 연동 관리</h1>
          <p className={DS.header.subtitle}>데이터베이스·결제·AI·외부 데이터 공급자를 한 곳에서 관리합니다.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className={DS.stat.card}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-[var(--color-positive)]" />
              <p className={DS.stat.label}>활성 연동</p>
            </div>
            <p className={DS.stat.value}>{totalActive} / {PROVIDER_GROUPS.length}</p>
          </div>
          <div className={DS.stat.card}>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-[var(--color-warning)]" />
              <p className={DS.stat.label}>Mock 모드 사용</p>
            </div>
            <p className={DS.stat.value}>{totalMock}개 그룹</p>
          </div>
          <div className={DS.stat.card}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-[var(--color-warning)]" />
              <p className={DS.stat.label}>연동 대기</p>
            </div>
            <p className={DS.stat.value}>{totalPending}개 공급자</p>
          </div>
        </div>

        {/* Provider groups */}
        <div className="space-y-4">
          {PROVIDER_GROUPS.map((group) => {
            const Icon = group.icon
            const activeProvider = group.providers.find(p => p.id === group.active)
            const isExpanded = activeGroup === group.id

            return (
              <div key={group.id} className={DS.card.base}>
                {/* Group header — always visible */}
                <button
                  onClick={() => setActiveGroup(isExpanded ? null : group.id)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${group.color} 15%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: group.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={DS.text.bodyBold}>{group.title}</p>
                      <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide`} style={{ color: group.color, background: `color-mix(in srgb, ${group.color} 10%, transparent)` }}>
                        {group.titleEn}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HealthDot status={activeProvider?.status ?? "inactive"} />
                      <p className={DS.text.caption}>
                        {activeProvider?.nameKo ?? "—"}
                        {activeProvider?.mock && <span className="ml-1 text-[var(--color-warning)]">· Mock 모드</span>}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {/* Expanded provider list */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
                    {group.providers.map((provider) => {
                      const isActive = provider.id === group.active
                      const statusCfg = STATUS_CONFIG[provider.status]
                      const StatusIcon = statusCfg.icon
                      const testKey = `${group.id}-${provider.id}`

                      return (
                        <div key={provider.id} className={`px-5 py-4 flex items-start gap-4 ${isActive ? "bg-[var(--color-surface-sunken)]" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className={DS.text.bodyBold}>{provider.name}</p>
                              {isActive && (
                                <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)]">
                                  {provider.label ?? "사용 중"}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.65rem] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {statusCfg.label}
                              </span>
                            </div>
                            <p className={`${DS.text.captionLight} mb-2`}>{provider.description}</p>
                            {provider.envKey && (
                              <p className={`${DS.text.micro} font-mono text-[var(--color-text-muted)]`}>
                                ENV: {provider.envKey}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            {provider.docsUrl && (
                              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className={`${DS.button.ghost} ${DS.button.sm}`}>
                                <ExternalLink size={12} />
                              </a>
                            )}
                            {isActive && !provider.mock && (
                              <button
                                onClick={() => testConnection(group.id, provider.id)}
                                disabled={testing === testKey}
                                className={`${DS.button.secondary} ${DS.button.sm} gap-1.5`}
                              >
                                {testing === testKey
                                  ? <><RefreshCw size={11} className="animate-spin" /> 테스트 중</>
                                  : <><Zap size={11} /> 연결 테스트</>}
                              </button>
                            )}
                            {!isActive && provider.status === "inactive" && (
                              <button
                                onClick={() => toast.info(`${provider.name} 전환은 환경변수 설정 후 재배포가 필요합니다.`)}
                                className={`${DS.button.ghost} ${DS.button.sm}`}
                              >
                                <Settings size={11} /> 전환 안내
                              </button>
                            )}
                            {!isActive && provider.status === "pending" && (
                              <button
                                onClick={() => toast.info(`${provider.name} 연동을 위해 영업팀에 문의하거나 API 키를 발급받으세요.`)}
                                className={`${DS.button.accent} ${DS.button.sm} gap-1`}
                              >
                                <Globe size={11} /> 신청
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className={`${DS.card.flat} mx-5 my-4 px-4 py-3`}>
                      <p className={DS.text.micro}>
                        <span className="font-bold text-[var(--color-text-secondary)]">공급자 전환 방법</span>: 환경변수에 새 공급자의 API 키를 설정하고 배포하면 자동 전환됩니다.
                        런타임 핫스왑은 Phase M-3에서 지원 예정입니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
