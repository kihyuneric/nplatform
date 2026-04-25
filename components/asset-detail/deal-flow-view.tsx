"use client"

/**
 * components/asset-detail/deal-flow-view.tsx
 *
 * NPL 딜 상세 페이지 — 거래소형 전환 중심 UI (McKinsey White Paper · v9)
 *
 * 5개 섹션 흐름형 구조:
 *   1. Deal Header (신뢰 + 핵심정보)
 *   2. Deal Screening   (탐색 · L0~L1 · 무료)
 *   ── 게이트 1: NDA ─────────────────────────
 *   3. Deal Validation  (검증 · 감정/경매/실거래/사진/채권)
 *   ── 게이트 2: LOI ─────────────────────────
 *   4. Deal Engagement  (참여 · 채팅/미팅/실사/협상)
 *   ── 게이트 3: ESCROW ──────────────────────
 *   5. Deal Execution   (실행 · 결제/계약)
 *
 * 위에서 아래로 투자 깊이가 깊어지는 funnel.
 * NDA / LOI 는 카드가 아니라 가로 라인 게이트.
 * 잠긴 콘텐츠는 blur + lock 아이콘 + hover tooltip.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Heart, Sparkles, Lock,
  Brain, Scale, FileText, Users, FileSearch,
  Image as ImageIcon, Gavel, BarChart3, ScrollText,
  MessageSquare, MapPin, ClipboardCheck, Banknote,
  Wallet, FileSignature, CheckCircle2,
  Shield, TrendingUp, AlertTriangle,
  ChevronRight, Info,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════════════════════════
   McKinsey palette (라이트 단일)
   ═══════════════════════════════════════════════════════════════════════════ */
const MCK = {
  ink:        "#0A1628",  // primary text
  inkDeep:    "#051C2C",  // hero deep
  paper:      "#FFFFFF",
  paperTint:  "#FAFBFC",
  brass:      "#B8924B",  // primary accent
  brassDark:  "#8B6F2F",  // brass on white (WCAG AA)
  brassLight: "#E5C77A",  // brass on navy
  blue:       "#2558A0",  // brand blue
  blueLight:  "#4F86C7",
  border:     "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub:    "#4A5568",
  textMuted:  "#718096",
  positive:   "#0F766E",  // McKinsey 진한 teal (밝은 green 회피)
  warning:    "#92400E",  // McKinsey 진한 amber (밝은 yellow 회피)
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   Mock deal data (실제 API 연결시 교체)
   ═══════════════════════════════════════════════════════════════════════════ */
type DealStage = "Screening" | "Validation" | "Engagement" | "Execution"

const MOCK_DEAL = {
  id: "npl-2026-0412",
  title: "서울 강남구 아파트 NPL",
  institution: "은행",
  region: "서울 강남구",
  saleType: "임의매각",
  // Numbers
  bondBalance: 12.0,    // 채권 잔액 (억)
  hopePrice: 8.5,       // 매각 희망가 (억)
  discountRate: 29.2,   // 할인율 (%)
  expectedROI: 12.8,    // 예상 수익률 (%)
  riskScore: 2.1,       // 리스크 점수 / 5
  ltv: 68,              // LTV %
  // Stage progress
  currentStage: "Screening" as DealStage,
  // 권한
  hasNDA: false,
  hasLOI: false,
  hasEscrow: false,
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════════ */
export interface DealFlowViewProps {
  /** Deal ID (URL 파라미터 대신 prop 으로 주입 가능) */
  idProp?: string
  /** /deals 페이지 등에서 inline 임베드 시 — 상단 utility bar 숨김 */
  embedded?: boolean
  /** 외부 컴포넌트가 보유한 deal 메타 override */
  dealOverride?: {
    listing_name?: string
    counterparty?: string
    amount?: number
    asset_type?: string
    location?: string
  }
}

export function DealFlowView({ idProp, embedded = false, dealOverride }: DealFlowViewProps = {}) {
  const params = useParams()
  const router = useRouter()
  const dealId = idProp || (params?.id as string) || MOCK_DEAL.id

  // dealOverride 가 있으면 mock 위에 덮어쓰기
  const deal = useMemo(() => {
    if (!dealOverride) return MOCK_DEAL
    return {
      ...MOCK_DEAL,
      title: dealOverride.listing_name ?? MOCK_DEAL.title,
      institution: dealOverride.counterparty ?? MOCK_DEAL.institution,
      region: dealOverride.location ?? MOCK_DEAL.region,
      // 금액(원) → 억 단위 변환
      bondBalance: dealOverride.amount ? dealOverride.amount / 100_000_000 : MOCK_DEAL.bondBalance,
    }
  }, [dealOverride])

  const [favorited, setFavorited] = useState(false)

  return (
    <div style={{ background: MCK.paperTint, minHeight: embedded ? "auto" : "100vh" }}>
      {/* ═══ Top utility bar (embedded 모드에선 숨김) ═══════════════════ */}
      {!embedded && (
      <div
        style={{
          background: MCK.paper,
          borderBottom: `1px solid ${MCK.border}`,
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: MCK.ink,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px 8px",
            }}
          >
            <ArrowLeft size={16} style={{ color: MCK.ink }} />
            <span style={{ color: MCK.ink }}>매물 목록</span>
          </button>
          <button
            onClick={() => setFavorited(v => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: favorited ? MCK.brassDark : MCK.ink,
              background: MCK.paper,
              border: `1px solid ${favorited ? MCK.brass : MCK.border}`,
              padding: "6px 14px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            <Heart
              size={14}
              fill={favorited ? MCK.brass : "transparent"}
              style={{ color: favorited ? MCK.brass : MCK.ink }}
            />
            <span style={{ color: favorited ? MCK.brassDark : MCK.ink }}>
              {favorited ? "관심 담음" : "관심 담기"}
            </span>
          </button>
        </div>
      </div>
      )}

      {/* ═══ 1. DEAL HEADER ════════════════════════════════════════════════ */}
      <DealHeader deal={deal} />

      {/* ═══ 2. DEAL SCREENING ═════════════════════════════════════════════ */}
      <DealSection
        eyebrow="Section 01 · Free preview"
        title="Deal Screening"
        subtitle="이 딜이 검토할 가치가 있는지 3분 안에 판단"
      >
        <DealScreening />
        <DealCTA
          label="로그인하고 상세 보기"
          subtext="회원가입 30초 · 무료 · 카드 등록 불필요"
          href="/login"
        />
      </DealSection>

      {/* ═══ Gate 1 ═══════════════════════════════════════════════════════ */}
      <DealGate
        icon={Lock}
        title="NDA 체결 시 열람 가능"
        subtitle="기관 검증 데이터 · 감정평가서 · 실거래 · 채권 정보"
      />

      {/* ═══ 3. DEAL VALIDATION ════════════════════════════════════════════ */}
      <DealSection
        eyebrow="Section 02 · NDA required"
        title="Deal Validation"
        subtitle="검증 데이터 — 의사결정의 핵심 근거"
        locked={!deal.hasNDA}
      >
        <DealValidation locked={!deal.hasNDA} />
        {!deal.hasNDA && (
          <DealCTA
            label="NDA 체결하고 전체 데이터 보기"
            subtext="전자서명 · 약 2분 소요 · 즉시 잠금 해제"
            href={`/exchange/${dealId}?action=nda`}
            emphasis
          />
        )}
      </DealSection>

      {/* ═══ Gate 2 ═══════════════════════════════════════════════════════ */}
      <DealGate
        icon={Lock}
        title="LOI 제출 시 참여 가능"
        subtitle="채팅 · 오프라인 미팅 · 실사 · 가격 협상"
      />

      {/* ═══ 4. DEAL ENGAGEMENT ════════════════════════════════════════════ */}
      <DealSection
        eyebrow="Section 03 · LOI required"
        title="Deal Engagement"
        subtitle="딜 참여 — 매도자와 직접 협상"
        locked={!deal.hasLOI}
      >
        <DealEngagement locked={!deal.hasLOI} />
        {!deal.hasLOI && (
          <DealCTA
            label="LOI 제출하고 협상 참여"
            subtext="구속력 없는 의향서 · 매도자 동의 후 딜룸 오픈"
            href={`/exchange/${dealId}?action=loi`}
            emphasis
          />
        )}
      </DealSection>

      {/* ═══ Gate 3 ═══════════════════════════════════════════════════════ */}
      <DealGate
        icon={Lock}
        title="ESCROW 결제 후 실행"
        subtitle="안전결제 · 계약서 자동생성 · 현장 클로징"
      />

      {/* ═══ 5. DEAL EXECUTION ═════════════════════════════════════════════ */}
      <DealSection
        eyebrow="Section 04 · Closing"
        title="Deal Execution"
        subtitle="거래 실행 — 30분 내 클로징"
        locked={!deal.hasEscrow}
      >
        <DealExecution locked={!deal.hasEscrow} />
        {!deal.hasEscrow && (
          <DealCTA
            label="결제 진행"
            subtext="에스크로 안전결제 · KB국민은행 협력"
            href={`/exchange/${dealId}?action=escrow`}
            emphasis
          />
        )}
      </DealSection>

      <div style={{ height: 80 }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Deal Header — 신뢰 + 핵심정보 3초 판단
   ═══════════════════════════════════════════════════════════════════════════ */
function DealHeader({ deal }: { deal: typeof MOCK_DEAL }) {
  const stages: { key: DealStage; label: string; korean: string }[] = [
    { key: "Screening",  label: "Screening",  korean: "탐색" },
    { key: "Validation", label: "Validation", korean: "검증" },
    { key: "Engagement", label: "Engagement", korean: "딜 참여" },
    { key: "Execution",  label: "Execution",  korean: "거래 실행" },
  ]
  const currentIdx = stages.findIndex(s => s.key === deal.currentStage)

  return (
    <section
      style={{
        background: MCK.paper,
        borderBottom: `2px solid ${MCK.brass}`,
        boxShadow: "0 1px 3px rgba(10,22,40,0.04)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* meta row */}
        <div className="flex items-center gap-2 mb-3" style={{ flexWrap: "wrap" }}>
          {[deal.institution, deal.region, deal.saleType, deal.id].map((m, i) => (
            <span
              key={m}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: MCK.textSub,
                letterSpacing: "0.02em",
              }}
            >
              {i > 0 && <span style={{ color: MCK.border, marginRight: 8 }}>·</span>}
              {m}
            </span>
          ))}
        </div>

        {/* title + AI badge */}
        <div className="flex items-start justify-between gap-6 mb-6" style={{ flexWrap: "wrap" }}>
          <h1
            style={{
              color: MCK.ink,
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              flex: "1 1 auto",
              wordBreak: "keep-all",
            }}
          >
            {deal.title}
          </h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: MCK.paper,
              border: `1.5px solid ${MCK.brass}`,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: MCK.brassDark,
              flexShrink: 0,
            }}
          >
            <Sparkles size={13} style={{ color: MCK.brass }} />
            <span style={{ color: MCK.brassDark }}>AI 등급 A · 매수 적합</span>
          </div>
        </div>

        {/* KPI row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 0,
            border: `1px solid ${MCK.border}`,
            background: MCK.paperTint,
          }}
        >
          <KPI label="채권 잔액"   value={`${deal.bondBalance.toFixed(1)}억`} />
          <KPI label="매각 희망가" value={`${deal.hopePrice.toFixed(1)}억`} />
          <KPI label="할인율"      value={`${deal.discountRate}%`} accent />
          <KPI label="예상 수익률" value={`${deal.expectedROI}%`} accent />
          <KPI label="리스크 점수" value={`${deal.riskScore} / 5`} />
          <KPI label="LTV"         value={`${deal.ltv}%`} />
        </div>

        {/* Deal Stage progress */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              style={{
                width: 16, height: 1.5, background: MCK.brass, display: "inline-block",
              }}
            />
            <span
              style={{
                color: MCK.brassDark,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              Deal Stage · 4-step funnel
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 0 }}>
            {stages.map((s, i) => {
              const done = i < currentIdx
              const current = i === currentIdx
              return (
                <div key={s.key} className="flex items-center" style={{ flex: 1 }}>
                  <div className="flex flex-col items-center" style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36, height: 36,
                        background: current ? MCK.ink : (done ? MCK.brass : MCK.paper),
                        border: `2px solid ${current ? MCK.ink : (done ? MCK.brass : MCK.border)}`,
                        color: current || done ? MCK.paper : MCK.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        borderRadius: 999,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="mt-2 text-center" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: current ? MCK.ink : MCK.textSub,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: MCK.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {s.korean}
                      </div>
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div
                      style={{
                        height: 1.5,
                        flex: 1,
                        background: done ? MCK.brass : MCK.border,
                        marginTop: -32,
                        marginLeft: -8, marginRight: -8,
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRight: `1px solid ${MCK.border}`,
        background: MCK.paper,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: MCK.textSub,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: accent ? MCK.brassDark : MCK.ink,
          letterSpacing: "-0.025em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section wrapper — eyebrow + title + content + (locked overlay)
   ═══════════════════════════════════════════════════════════════════════════ */
function DealSection({
  eyebrow, title, subtitle, locked = false, children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  locked?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="max-w-[1280px] mx-auto px-6 py-12">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span
            style={{
              width: 18, height: 1.5, background: MCK.brass, display: "inline-block",
            }}
          />
          <span
            style={{
              color: MCK.brassDark,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </span>
        </div>
        <h2
          style={{
            color: MCK.ink,
            fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            color: MCK.textSub,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.55,
            maxWidth: 640,
          }}
        >
          {subtitle}
        </p>
      </header>

      <div style={{ position: "relative" }}>
        {children}
        {locked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              background: "rgba(250, 251, 252, 0.55)",
              pointerEvents: "none",
              borderRadius: 0,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 1 — DEAL SCREENING (free preview)
   ═══════════════════════════════════════════════════════════════════════════ */
function DealScreening() {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      {/* AI 분석 리포트 */}
      <PaperCard
        accent={MCK.brass}
        eyebrow="L0 · AI Insights"
        icon={Brain}
        title="AI 분석 리포트"
      >
        <DataRow label="예상 낙찰가" value="9.2 ~ 10.4억" emphasis />
        <DataRow label="예상 회수율" value="86%" />
        <DataRow label="배당 시나리오" value="3종 (강세·기준·약세)" />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${MCK.border}` }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            핵심 리스크
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <RiskItem level="low"  text="권리관계 단순 (선순위 1건)" />
            <RiskItem level="med"  text="임차인 1세대 · 대항력 검토 필요" />
            <RiskItem level="low"  text="시세 변동성 낮음 (강남구 평균 + 4%)" />
          </ul>
        </div>
      </PaperCard>

      {/* 권리관계 요약 */}
      <PaperCard
        accent={MCK.blue}
        eyebrow="L0 · Title summary"
        icon={Scale}
        title="권리관계 요약"
      >
        <DataRow label="선순위 권리" value="근저당 1건 (KB국민은행)" />
        <DataRow label="채권최고액"  value="14.4억 (말소기준)" />
        <DataRow label="가압류"      value="없음" positive />
        <DataRow label="가처분"      value="없음" positive />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${MCK.border}` }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            임차인 현황
          </div>
          <DataRow label="전입세대" value="1세대" />
          <DataRow label="확정일자" value="있음 (대항력 O)" warning />
        </div>
      </PaperCard>

      {/* 요약 정보 */}
      <PaperCard
        accent={MCK.brass}
        eyebrow="L1 · Document digest"
        icon={FileText}
        title="요약 정보"
      >
        <div
          style={{
            fontSize: 11, fontWeight: 700, color: MCK.brassDark,
            letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
          }}
        >
          등기 요약
        </div>
        <DataRow label="유형"     value="아파트" />
        <DataRow label="전용면적" value="84.99㎡ (25.7평)" />
        <DataRow label="층/구조"  value="14층 / RC조" />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${MCK.border}` }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            임대차 요약
          </div>
          <DataRow label="보증금"   value="3.5억" />
          <DataRow label="월세"     value="없음" />
          <DataRow label="계약 종료" value="2027-03-15" />
        </div>
      </PaperCard>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 2 — DEAL VALIDATION (NDA gated)
   ═══════════════════════════════════════════════════════════════════════════ */
function DealValidation({ locked }: { locked: boolean }) {
  const items = [
    { icon: ScrollText, title: "감정평가서",   desc: "공인 감정평가법인 v.2026.03",     meta: "PDF 28p" },
    { icon: Gavel,      title: "경매 정보",    desc: "수원지방법원 본원 2026타경 1234",   meta: "현재가 8.7억" },
    { icon: BarChart3,  title: "공매 정보",    desc: "한국자산관리공사 캠코 매물",        meta: "공매가 9.1억" },
    { icon: TrendingUp, title: "실거래 통계",  desc: "동일 단지 최근 12개월 27건",        meta: "평균 11.2억" },
    { icon: ImageIcon,  title: "현장 사진",    desc: "전문 인스펙터 촬영 v.2026.04",     meta: "사진 24장" },
    { icon: Banknote,   title: "채권 정보",    desc: "원금·이자·연체이자 분할 데이터",     meta: "Excel" },
  ]
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {items.map(it => (
        <DataTileLocked key={it.title} icon={it.icon} title={it.title} desc={it.desc} meta={it.meta} locked={locked} />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 3 — DEAL ENGAGEMENT (LOI gated)
   ═══════════════════════════════════════════════════════════════════════════ */
function DealEngagement({ locked }: { locked: boolean }) {
  const items = [
    { icon: MessageSquare,  title: "채팅 문의",     desc: "매도 담당자 직접 연결",            meta: "응답 평균 18분" },
    { icon: MapPin,         title: "오프라인 미팅", desc: "강남 본사 회의실 예약",            meta: "주중 가능" },
    { icon: ClipboardCheck, title: "실사 진행",     desc: "감정평가사 동행 현장 실사",         meta: "1.5일 소요" },
    { icon: Banknote,       title: "가격 협상",     desc: "구속력 없는 가격 오퍼 제시",        meta: "최대 3회" },
  ]
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {items.map(it => (
        <DataTileLocked key={it.title} icon={it.icon} title={it.title} desc={it.desc} meta={it.meta} locked={locked} />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section 4 — DEAL EXECUTION (Escrow gated)
   ═══════════════════════════════════════════════════════════════════════════ */
function DealExecution({ locked }: { locked: boolean }) {
  const items = [
    { icon: Wallet,         title: "에스크로 결제", desc: "KB국민은행 안전결제 · 분할납입",   meta: "최대 12개월" },
    { icon: FileSignature,  title: "전자 계약",     desc: "전자서명 + 확정일자 자동",          meta: "10분 소요" },
    { icon: CheckCircle2,   title: "현장 클로징",   desc: "법무사 동행 등기이전 + 잔금처리",    meta: "1일 클로징" },
  ]
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {items.map(it => (
        <DataTileLocked key={it.title} icon={it.icon} title={it.title} desc={it.desc} meta={it.meta} locked={locked} />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable: Paper card (free preview)
   ═══════════════════════════════════════════════════════════════════════════ */
function PaperCard({
  accent, eyebrow, icon: Icon, title, children,
}: {
  accent: string
  eyebrow: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  children: React.ReactNode
}) {
  return (
    <article
      style={{
        background: MCK.paper,
        borderTop: `2px solid ${accent}`,
        border: `1px solid ${MCK.border}`,
        borderTopWidth: 2,
        borderTopColor: accent,
        padding: 22,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          style={{
            width: 14, height: 1.5, background: accent, display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: 10, fontWeight: 700,
            color: accent === MCK.brass ? MCK.brassDark : accent,
            letterSpacing: "0.10em", textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div
          style={{
            width: 32, height: 32, background: MCK.ink,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} style={{ color: MCK.paper }} />
        </div>
        <h3
          style={{
            color: MCK.ink,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.015em",
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </article>
  )
}

function DataRow({
  label, value, emphasis, positive, warning,
}: {
  label: string
  value: string
  emphasis?: boolean
  positive?: boolean
  warning?: boolean
}) {
  const valueColor = emphasis ? MCK.brassDark
                  : positive ? MCK.positive
                  : warning ? MCK.warning
                  : MCK.ink
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 12 }}>
      <span style={{ fontSize: 12, color: MCK.textSub, fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: emphasis ? 15 : 13,
          fontWeight: emphasis ? 800 : 600,
          color: valueColor,
          letterSpacing: "-0.005em",
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function RiskItem({ level, text }: { level: "low" | "med" | "high"; text: string }) {
  const color = level === "low" ? MCK.positive : level === "med" ? MCK.warning : MCK.brassDark
  const label = level === "low" ? "낮음" : level === "med" ? "보통" : "높음"
  return (
    <li className="flex items-center gap-2" style={{ fontSize: 12, color: MCK.ink }}>
      <span
        style={{
          fontSize: 9, fontWeight: 800,
          color, letterSpacing: "0.04em",
          padding: "2px 6px",
          border: `1px solid ${color}`,
          minWidth: 30, textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12, color: MCK.ink, fontWeight: 500 }}>{text}</span>
    </li>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Locked data tile (Validation/Engagement/Execution)
   ═══════════════════════════════════════════════════════════════════════════ */
function DataTileLocked({
  icon: Icon, title, desc, meta, locked,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  desc: string
  meta: string
  locked: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        padding: 18,
        position: "relative",
        cursor: locked ? "help" : "pointer",
        transition: "border-color 0.18s ease",
        borderColor: hover ? MCK.brass : MCK.border,
      }}
      title={locked ? "잠금 해제 시 다운로드 가능" : ""}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          style={{
            width: 32, height: 32, background: MCK.ink,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} style={{ color: MCK.paper }} />
        </div>
        {locked && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 700,
              color: MCK.textSub,
              padding: "3px 8px",
              border: `1px solid ${MCK.border}`,
              background: MCK.paperTint,
            }}
          >
            <Lock size={11} style={{ color: MCK.textSub }} />
            <span style={{ color: MCK.textSub }}>잠금</span>
          </div>
        )}
      </div>
      <h4
        style={{
          color: MCK.ink,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          marginBottom: 4,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          color: MCK.textSub,
          fontSize: 12,
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {desc}
      </p>
      <div
        style={{
          fontSize: 11, fontWeight: 700,
          color: MCK.brassDark,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          paddingTop: 10,
          borderTop: `1px dashed ${MCK.border}`,
        }}
      >
        {meta}
      </div>
      {hover && locked && (
        <div
          style={{
            position: "absolute",
            top: -34, left: 12,
            background: MCK.ink,
            color: MCK.paper,
            fontSize: 11, fontWeight: 600,
            padding: "6px 10px",
            whiteSpace: "nowrap",
            zIndex: 10,
            borderTop: `1.5px solid ${MCK.brass}`,
            boxShadow: "0 4px 12px rgba(10,22,40,0.15)",
          }}
        >
          잠금 해제 후 열람 가능
        </div>
      )}
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Deal Gate — 카드가 아니라 가로 라인 게이트
   ═══════════════════════════════════════════════════════════════════════════ */
function DealGate({
  icon: Icon, title, subtitle,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  subtitle: string
}) {
  return (
    <div className="max-w-[1280px] mx-auto px-6">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "28px 0",
        }}
      >
        <div style={{ flex: 1, height: 1.5, background: MCK.brass }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 22px",
            background: MCK.ink,
            borderTop: `2px solid ${MCK.brass}`,
            color: MCK.paper,
            flexShrink: 0,
          }}
        >
          <Icon size={16} style={{ color: MCK.brassLight }} />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: MCK.paper,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,0.72)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, height: 1.5, background: MCK.brass }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Deal CTA — 검정 박스 + brass top + 흰 글씨 (mck-cta-dark)
   ═══════════════════════════════════════════════════════════════════════════ */
function DealCTA({
  label, subtext, href, emphasis,
}: {
  label: string
  subtext: string
  href: string
  emphasis?: boolean
}) {
  return (
    <div className="mt-10 flex flex-col items-center" style={{ gap: 10 }}>
      <Link
        href={href}
        className="mck-cta-dark"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 36px",
          background: emphasis ? MCK.ink : MCK.paper,
          borderTop: `2.5px solid ${MCK.brass}`,
          border: emphasis ? "none" : `1px solid ${MCK.ink}`,
          color: emphasis ? MCK.paper : MCK.ink,
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "-0.015em",
          textTransform: "none",
          minWidth: 280,
          justifyContent: "center",
          boxShadow: emphasis ? "0 6px 24px rgba(10,22,40,0.20)" : "none",
        }}
      >
        <span style={{ color: emphasis ? MCK.paper : MCK.ink }}>{label}</span>
        <ChevronRight size={16} style={{ color: emphasis ? MCK.paper : MCK.ink }} />
      </Link>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: MCK.textMuted,
          letterSpacing: "0.01em",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Info size={12} style={{ color: MCK.textMuted }} />
        {subtext}
      </div>
    </div>
  )
}

export default DealFlowView
