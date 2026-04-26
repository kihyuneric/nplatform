"use client"

/**
 * components/asset-detail/deal-flow-view.tsx
 *
 * NPL ???곸꽭 ?섏씠吏 ??嫄곕옒?뚰삎 ?꾪솚 以묒떖 UI (McKinsey White Paper 쨌 v9)
 *
 * 5媛??뱀뀡 ?먮쫫??援ъ“:
 *   1. Deal Header (?좊ː + ?듭떖?뺣낫)
 *   2. Deal Screening   (?먯깋 쨌 L0~L1 쨌 臾대즺)
 *   ?? 寃뚯씠??1: NDA ?????????????????????????
 *   3. Deal Validation  (寃利?쨌 媛먯젙/寃쎈ℓ/?ㅺ굅???ъ쭊/梨꾧텒)
 *   ?? 寃뚯씠??2: LOI ?????????????????????????
 *   4. Deal Engagement  (李몄뿬 쨌 梨꾪똿/誘명똿/?ㅼ궗/?묒긽)
 *   ?? 寃뚯씠??3: ESCROW ??????????????????????
 *   5. Deal Execution   (?ㅽ뻾 쨌 寃곗젣/怨꾩빟)
 *
 * ?꾩뿉???꾨옒濡??ъ옄 源딆씠媛 源딆뼱吏??funnel.
 * NDA / LOI ??移대뱶媛 ?꾨땲??媛濡??쇱씤 寃뚯씠??
 * ?좉릿 肄섑뀗痢좊뒗 blur + lock ?꾩씠肄?+ hover tooltip.
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
import { maskInstitutionName } from "@/lib/mask"

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   McKinsey palette (?쇱씠???⑥씪)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
const MCK = {
  ink:        "#0A1628",  // primary text
  inkDeep:    "#051C2C",  // hero deep
  paper:      "#FFFFFF",
  paperTint:  "#FAFBFC",
  brass:      "#2251FF",  // primary accent
  brassDark:  "#1A47CC",  // brass on white (WCAG AA)
  brassLight: "#00A9F4",  // brass on navy
  blue:       "#2558A0",  // brand blue
  blueLight:  "#4F86C7",
  border:     "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub:    "#4A5568",
  textMuted:  "#718096",
  positive:   "#0F766E",  // McKinsey 吏꾪븳 teal (諛앹? green ?뚰뵾)
  warning:    "#92400E",  // McKinsey 吏꾪븳 amber (諛앹? yellow ?뚰뵾)
} as const

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Mock deal data (?ㅼ젣 API ?곌껐??援먯껜)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
type DealStage = "Screening" | "Validation" | "Engagement" | "Execution"

const MOCK_DEAL = {
  id: "npl-2026-0412",
  title: "?쒖슱 媛뺣궓援??꾪뙆??NPL",
  institution: "???,
  region: "?쒖슱 媛뺣궓援?,
  saleType: "?꾩쓽留ㅺ컖",
  // Numbers
  bondBalance: 12.0,    // 梨꾧텒 ?붿븸 (??
  hopePrice: 8.5,       // 留ㅺ컖 ?щ쭩媛 (??
  discountRate: 29.2,   // ?좎씤??(%)
  expectedROI: 12.8,    // ?덉긽 ?섏씡瑜?(%)
  riskScore: 2.1,       // 由ъ뒪???먯닔 / 5
  ltv: 68,              // LTV %
  // Stage progress
  currentStage: "Screening" as DealStage,
  // 沅뚰븳
  hasNDA: false,
  hasLOI: false,
  hasEscrow: false,
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Page
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export interface DealFlowViewProps {
  /** Deal ID (URL ?뚮씪誘명꽣 ???prop ?쇰줈 二쇱엯 媛?? */
  idProp?: string
  /** /deals ?섏씠吏 ?깆뿉??inline ?꾨쿋???????곷떒 utility bar ?④? */
  embedded?: boolean
  /**
   * 醫뚯륫 而щ읆 ?꾩슜 ?⑤꼸 紐⑤뱶 ???몃? grid ??醫뚯륫 ?먮━???ㅼ뼱媛????ъ슜.
   * - 紐⑤뱺 max-w-[1280px] 而⑦뀒?대꼫 ?쒓굅 ??遺紐?grid ??뿉 留욎땄
   * - 醫뚯슦 padding 異뺤냼 (px-6 ??px-0/px-1)
   * - ?곷떒 utility bar ?먮룞 ?④? (embedded ? ?숈씪)
   * - 100vh minHeight ?쒓굅
   */
  panelMode?: boolean
  /** ?몃? 而댄룷?뚰듃媛 蹂댁쑀??deal 硫뷀? override */
  dealOverride?: {
    listing_name?: string
    counterparty?: string
    amount?: number
    asset_type?: string
    location?: string
  }
  /** L0?묹1 ?ъ옄???몄쬆 紐⑤떖 ?몃━嫄?(?놁쑝硫?/login 留곹겕濡??대갚) */
  onVerifyClick?: () => void
  /** L1?묹2 NDA 紐⑤떖 ?몃━嫄?(?놁쑝硫?/exchange/[id]?action=nda 留곹겕濡??대갚) */
  onNdaClick?: () => void
  /** L2?묹3 LOI 紐⑤떖 ?몃━嫄?(?놁쑝硫?/exchange/[id]?action=loi 留곹겕濡??대갚) */
  onLoiClick?: () => void
  /** L3?묹4 ESCROW 紐⑤떖 ?몃━嫄?(?놁쑝硫?/exchange/[id]?action=escrow 留곹겕濡??대갚) */
  onEscrowClick?: () => void
}

export function DealFlowView({
  idProp,
  embedded = false,
  panelMode = false,
  dealOverride,
  onVerifyClick,
  onNdaClick,
  onLoiClick,
  onEscrowClick,
}: DealFlowViewProps = {}) {
  // panelMode ??embedded ??superset (utility bar ??chrome ?④? ?ы븿)
  const inEmbed = embedded || panelMode
  const params = useParams()
  const router = useRouter()
  const dealId = idProp || (params?.id as string) || MOCK_DEAL.id

  // dealOverride 媛 ?덉쑝硫?mock ?꾩뿉 ??뼱?곌린
  const deal = useMemo(() => {
    if (!dealOverride) return MOCK_DEAL
    return {
      ...MOCK_DEAL,
      title: dealOverride.listing_name ?? MOCK_DEAL.title,
      institution: maskInstitutionName(dealOverride.counterparty ?? MOCK_DEAL.institution),
      region: dealOverride.location ?? MOCK_DEAL.region,
      // 湲덉븸(?? ?????⑥쐞 蹂??      bondBalance: dealOverride.amount ? dealOverride.amount / 100_000_000 : MOCK_DEAL.bondBalance,
    }
  }, [dealOverride])

  const [favorited, setFavorited] = useState(false)

  return (
    <div style={{ background: panelMode ? "transparent" : MCK.paperTint, minHeight: inEmbed ? "auto" : "100vh" }}>
      {/* ?먥븧??Top utility bar (embedded/panel 紐⑤뱶?먯꽑 ?④?) ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      {!inEmbed && (
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
            <span style={{ color: MCK.ink }}>留ㅻЪ 紐⑸줉</span>
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
              {favorited ? "愿???댁쓬" : "愿???닿린"}
            </span>
          </button>
        </div>
      </div>
      )}

      {/* ?먥븧??1. DEAL HEADER ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <DealHeader deal={deal} panelMode={panelMode} />

      {/* ?먥븧??2. DEAL SCREENING ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <DealSection
        eyebrow="Section 01 쨌 Free preview"
        title="Deal Screening"
        subtitle="???쒖씠 寃?좏븷 媛移섍? ?덈뒗吏 3遺??덉뿉 ?먮떒"
        panelMode={panelMode}
      >
        <DealScreening />
        <DealCTA
          label="?ъ옄???몄쬆?섍퀬 愿???쒖떆"
          subtext="10珥?쨌 ?ъ뾽?먮벑濡앹쬆/紐낇븿 ?ъ옄???몄쬆"
          href={onVerifyClick ? undefined : "/login"}
          onClick={onVerifyClick}
        />
      </DealSection>

      {/* ?먥븧??Gate 1 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <DealGate
        icon={Lock}
        title="NDA 泥닿껐 ???대엺 媛??
        subtitle="湲곌? 寃利??곗씠??쨌 媛먯젙?됯???쨌 ?ㅺ굅??쨌 梨꾧텒 ?뺣낫"
        panelMode={panelMode}
        ctaLabel={onNdaClick ? "NDA 泥닿껐?붾㈃ ?닿린" : undefined}
        onCtaClick={onNdaClick}
      />

      {/* ?먥븧??3. DEAL VALIDATION ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <DealSection
        eyebrow="Section 02 쨌 NDA required"
        title="Deal Validation"
        subtitle="寃利??곗씠?????섏궗寃곗젙???듭떖 洹쇨굅"
        locked={!deal.hasNDA}
        panelMode={panelMode}
      >
        <DealValidation locked={!deal.hasNDA} />
        {!deal.hasNDA && (
          <DealCTA
            label="NDA 泥닿껐?섍퀬 ?꾩껜 ?곗씠??蹂닿린"
            subtext="?꾩옄?쒕챸 쨌 ??2遺??뚯슂 쨌 利됱떆 ?좉툑 ?댁젣"
            href={onNdaClick ? undefined : `/exchange/${dealId}?action=nda`}
            onClick={onNdaClick}
            emphasis
          />
        )}
      </DealSection>

      {/* ?먥븧??Gate 2 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <DealGate
        icon={Lock}
        title="LOI ?쒖텧 ??李몄뿬 媛??
        subtitle="梨꾪똿 쨌 ?ㅽ봽?쇱씤 誘명똿 쨌 ?ㅼ궗 쨌 媛寃??묒긽"
        panelMode={panelMode}
        ctaLabel={onLoiClick ? "LOI ?쒖텧?붾㈃ ?닿린" : undefined}
        onCtaClick={onLoiClick}
      />

      {/* ?먥븧??4. DEAL ENGAGEMENT ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <DealSection
        eyebrow="Section 03 쨌 LOI required"
        title="Deal Engagement"
        subtitle="??李몄뿬 ??留ㅻ룄?먯? 吏곸젒 ?묒긽"
        locked={!deal.hasLOI}
        panelMode={panelMode}
      >
        <DealEngagement locked={!deal.hasLOI} />
        {!deal.hasLOI && (
          <DealCTA
            label="LOI ?쒖텧?섍퀬 ?묒긽 李몄뿬"
            subtext="援ъ냽???녿뒗 ?섑뼢??쨌 留ㅻ룄???숈쓽 ???쒕８ ?ㅽ뵂"
            href={onLoiClick ? undefined : `/exchange/${dealId}?action=loi`}
            onClick={onLoiClick}
            emphasis
          />
        )}
      </DealSection>

      {/* ?먥븧??Gate 3 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <DealGate
        icon={Lock}
        title="ESCROW 寃곗젣 ???ㅽ뻾"
        subtitle="?덉쟾寃곗젣 쨌 怨꾩빟???먮룞?앹꽦 쨌 ?꾩옣 ?대줈吏?
        panelMode={panelMode}
        ctaLabel={onEscrowClick ? "ESCROW 寃곗젣?붾㈃ ?닿린" : undefined}
        onCtaClick={onEscrowClick}
      />

      {/* ?먥븧??5. DEAL EXECUTION ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/}
      <DealSection
        eyebrow="Section 04 쨌 Closing"
        title="Deal Execution"
        subtitle="嫄곕옒 ?ㅽ뻾 ??30遺????대줈吏?
        locked={!deal.hasEscrow}
        panelMode={panelMode}
      >
        <DealExecution locked={!deal.hasEscrow} />
        {!deal.hasEscrow && (
          <DealCTA
            label="寃곗젣 吏꾪뻾"
            subtext="?먯뒪?щ줈 ?덉쟾寃곗젣 쨌 KB援??????묐젰"
            href={onEscrowClick ? undefined : `/exchange/${dealId}?action=escrow`}
            onClick={onEscrowClick}
            emphasis
          />
        )}
      </DealSection>

      <div style={{ height: panelMode ? 24 : 80 }} />
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Deal Header ???좊ː + ?듭떖?뺣낫 3珥??먮떒
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
/**
 * DealHeader (export ?? ???몃? 而댄룷?뚰듃(AssetDetailView ???먯꽌 ?⑤룆 ?ъ슜 媛??
 * - hideKpiGrid: ?몃????대? KpiRow 媛 ?덉쓣 ??KPI 6移?洹몃━???④? (以묐났 諛⑹?)
 * - currentStage: 4-step funnel 吏꾪뻾 ?쒖떆 (Screening / Validation / Engagement / Execution)
 */
export interface DealHeaderStandaloneProps {
  title: string
  institution?: string
  region?: string
  saleType?: string
  dealId?: string
  aiGradeBadge?: string  // ?? "AI ?깃툒 A 쨌 留ㅼ닔 ?곹빀"
  currentStage?: DealStage
  hideKpiGrid?: boolean
  hideMetaRow?: boolean
  hideTitle?: boolean
  panelMode?: boolean
  // KPI 媛?(hideKpiGrid=false ???뚮쭔 ?ъ슜)
  kpis?: { bondBalance: number; hopePrice: number; discountRate: number; expectedROI: number; riskScore: number; ltv: number }
}

export function DealHeaderStandalone(props: DealHeaderStandaloneProps) {
  const deal = {
    ...MOCK_DEAL,
    title: props.title,
    institution: maskInstitutionName(props.institution ?? MOCK_DEAL.institution),
    region: props.region ?? MOCK_DEAL.region,
    saleType: props.saleType ?? MOCK_DEAL.saleType,
    id: props.dealId ?? MOCK_DEAL.id,
    currentStage: props.currentStage ?? MOCK_DEAL.currentStage,
    bondBalance: props.kpis?.bondBalance ?? MOCK_DEAL.bondBalance,
    hopePrice: props.kpis?.hopePrice ?? MOCK_DEAL.hopePrice,
    discountRate: props.kpis?.discountRate ?? MOCK_DEAL.discountRate,
    expectedROI: props.kpis?.expectedROI ?? MOCK_DEAL.expectedROI,
    riskScore: props.kpis?.riskScore ?? MOCK_DEAL.riskScore,
    ltv: props.kpis?.ltv ?? MOCK_DEAL.ltv,
  }
  return (
    <DealHeader
      deal={deal}
      panelMode={props.panelMode}
      hideKpiGrid={props.hideKpiGrid}
      hideMetaRow={props.hideMetaRow}
      hideTitle={props.hideTitle}
      aiGradeBadge={props.aiGradeBadge}
    />
  )
}

function DealHeader({
  deal, panelMode = false, hideKpiGrid = false, hideMetaRow = false, hideTitle = false, aiGradeBadge = "AI ?깃툒 A 쨌 留ㅼ닔 ?곹빀",
}: {
  deal: typeof MOCK_DEAL
  panelMode?: boolean
  hideKpiGrid?: boolean
  hideMetaRow?: boolean
  hideTitle?: boolean
  aiGradeBadge?: string
}) {
  const stages: { key: DealStage; label: string; korean: string }[] = [
    { key: "Screening",  label: "Screening",  korean: "?먯깋" },
    { key: "Validation", label: "Validation", korean: "寃利? },
    { key: "Engagement", label: "Engagement", korean: "??李몄뿬" },
    { key: "Execution",  label: "Execution",  korean: "嫄곕옒 ?ㅽ뻾" },
  ]
  const currentIdx = stages.findIndex(s => s.key === deal.currentStage)

  return (
    <section
      style={{
        background: MCK.paper,
        borderBottom: `2px solid ${MCK.brass}`,
        boxShadow: panelMode ? "none" : "0 1px 3px rgba(10,22,40,0.04)",
        borderTop: panelMode ? `1px solid ${MCK.border}` : undefined,
        borderLeft: panelMode ? `1px solid ${MCK.border}` : undefined,
        borderRight: panelMode ? `1px solid ${MCK.border}` : undefined,
      }}
    >
      <div className={panelMode ? "px-7 py-9" : "max-w-[1280px] mx-auto px-6 py-10"}>
        {/* meta row ??enlarged: 梨꾧텒??吏??留ㅺ컖諛⑹떇/?쏧D ?쇰꺼 媛뺤“ */}
        {!hideMetaRow && (
        <div className="flex items-center gap-2 mb-5" style={{ flexWrap: "wrap" }}>
          {[deal.institution, deal.region, deal.saleType, deal.id].map((m, i) => (
            <span
              key={m}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: MCK.textSub,
                letterSpacing: "0.02em",
              }}
            >
              {i > 0 && <span style={{ color: MCK.border, marginRight: 10 }}>쨌</span>}
              {m}
            </span>
          ))}
        </div>
        )}

        {/* title + AI badge ??enlarged */}
        {!hideTitle && (
        <div className="flex items-start justify-between gap-6 mb-8" style={{ flexWrap: "wrap" }}>
          <h1
            style={{
              color: MCK.ink,
              fontSize: "clamp(2.25rem, 4.2vw, 3.25rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              flex: "1 1 auto",
              wordBreak: "keep-all",
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {deal.title}
          </h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: MCK.paper,
              border: `2px solid ${MCK.brass}`,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 800,
              color: MCK.brassDark,
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(184, 146, 75, 0.15)",
            }}
          >
            <Sparkles size={16} style={{ color: MCK.brass }} />
            <span style={{ color: MCK.brassDark }}>{aiGradeBadge}</span>
          </div>
        </div>
        )}

        {/* KPI row (?몃???KpiRow 媛 ?덉쑝硫?hideKpiGrid 濡?以묐났 ?쒓굅) */}
        {!hideKpiGrid && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 0,
            border: `1px solid ${MCK.border}`,
            background: MCK.paperTint,
          }}
        >
          <KPI label="梨꾧텒 ?붿븸"   value={`${deal.bondBalance.toFixed(1)}??} />
          <KPI label="留ㅺ컖 ?щ쭩媛" value={`${deal.hopePrice.toFixed(1)}??} />
          <KPI label="?좎씤??      value={`${deal.discountRate}%`} accent />
          <KPI label="?덉긽 ?섏씡瑜? value={`${deal.expectedROI}%`} accent />
          <KPI label="由ъ뒪???먯닔" value={`${deal.riskScore} / 5`} />
          <KPI label="LTV"         value={`${deal.ltv}%`} />
        </div>
        )}

        {/* Deal Stage progress ??enlarged */}
        <div className={hideKpiGrid && hideMetaRow && hideTitle ? "" : "mt-10"}>
          <div className="flex items-center gap-2.5 mb-5">
            <span
              style={{
                width: 24, height: 2, background: MCK.brass, display: "inline-block",
              }}
            />
            <span
              style={{
                color: MCK.brassDark,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Deal Stage 쨌 4-step funnel
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
                        width: 52, height: 52,
                        background: current ? MCK.ink : (done ? MCK.brass : MCK.paper),
                        border: `2.5px solid ${current ? MCK.ink : (done ? MCK.brass : MCK.border)}`,
                        color: current || done ? MCK.paper : MCK.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        fontWeight: 800,
                        borderRadius: 999,
                        boxShadow: current ? "0 2px 8px rgba(10,22,40,0.18)" : "none",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="mt-3 text-center" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: current ? MCK.ink : MCK.textSub,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: MCK.textMuted,
                          marginTop: 4,
                        }}
                      >
                        {s.korean}
                      </div>
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div
                      style={{
                        height: 2,
                        flex: 1,
                        background: done ? MCK.brass : MCK.border,
                        marginTop: -46,
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Section wrapper ??eyebrow + title + content + (locked overlay)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export function DealSection({
  eyebrow, title, subtitle, locked = false, children, panelMode = false,
}: {
  eyebrow: string
  title: string
  subtitle: string
  locked?: boolean
  children: React.ReactNode
  panelMode?: boolean
}) {
  return (
    <section className={panelMode ? "px-5 py-8" : "max-w-[1280px] mx-auto px-6 py-12"}>
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Section 1 ??DEAL SCREENING (free preview)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function DealScreening() {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      {/* AI 遺꾩꽍 由ы룷??*/}
      <PaperCard
        accent={MCK.brass}
        eyebrow="L0 쨌 AI Insights"
        icon={Brain}
        title="AI 遺꾩꽍 由ы룷??
      >
        <DataRow label="?덉긽 ?숈같媛" value="9.2 ~ 10.4?? emphasis />
        <DataRow label="?덉긽 ?뚯닔?? value="86%" />
        <DataRow label="諛곕떦 ?쒕굹由ъ삤" value="3醫?(媛뺤꽭쨌湲곗?쨌?쎌꽭)" />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${MCK.border}` }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            ?듭떖 由ъ뒪??          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <RiskItem level="low"  text="沅뚮━愿怨??⑥닚 (?좎닚??1嫄?" />
            <RiskItem level="med"  text="?꾩감??1?몃? 쨌 ???젰 寃???꾩슂" />
            <RiskItem level="low"  text="?쒖꽭 蹂?숈꽦 ??쓬 (媛뺣궓援??됯퇏 + 4%)" />
          </ul>
        </div>
      </PaperCard>

      {/* 沅뚮━愿怨??붿빟 */}
      <PaperCard
        accent={MCK.blue}
        eyebrow="L0 쨌 Title summary"
        icon={Scale}
        title="沅뚮━愿怨??붿빟"
      >
        <DataRow label="?좎닚??沅뚮━" value="洹쇱???1嫄?(KB援?????" />
        <DataRow label="梨꾧텒理쒓퀬??  value="14.4??(留먯냼湲곗?)" />
        <DataRow label="媛?뺣쪟"      value="?놁쓬" positive />
        <DataRow label="媛泥섎텇"      value="?놁쓬" positive />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${MCK.border}` }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            ?꾩감???꾪솴
          </div>
          <DataRow label="?꾩엯?몃?" value="1?몃?" />
          <DataRow label="?뺤젙?쇱옄" value="?덉쓬 (???젰 O)" warning />
        </div>
      </PaperCard>

      {/* ?붿빟 ?뺣낫 */}
      <PaperCard
        accent={MCK.brass}
        eyebrow="L1 쨌 Document digest"
        icon={FileText}
        title="?붿빟 ?뺣낫"
      >
        <div
          style={{
            fontSize: 11, fontWeight: 700, color: MCK.brassDark,
            letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
          }}
        >
          ?깃린 ?붿빟
        </div>
        <DataRow label="?좏삎"     value="?꾪뙆?? />
        <DataRow label="?꾩슜硫댁쟻" value="84.99??(25.7??" />
        <DataRow label="痢?援ъ“"  value="14痢?/ RC議? />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${MCK.border}` }}>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            ?꾨?李??붿빟
          </div>
          <DataRow label="蹂댁쬆湲?   value="3.5?? />
          <DataRow label="?붿꽭"     value="?놁쓬" />
          <DataRow label="怨꾩빟 醫낅즺" value="2027-03-15" />
        </div>
      </PaperCard>
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Section 2 ??DEAL VALIDATION (NDA gated)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function DealValidation({ locked }: { locked: boolean }) {
  const items = [
    { icon: ScrollText, title: "媛먯젙?됯???,   desc: "怨듭씤 媛먯젙?됯?踰뺤씤 v.2026.03",     meta: "PDF 28p" },
    { icon: Gavel,      title: "寃쎈ℓ ?뺣낫",    desc: "?섏썝吏諛⑸쾿??蹂몄썝 2026?寃?1234",   meta: "?꾩옱媛 8.7?? },
    { icon: BarChart3,  title: "怨듬ℓ ?뺣낫",    desc: "?쒓뎅?먯궛愿由ш났??罹좎퐫 留ㅻЪ",        meta: "怨듬ℓ媛 9.1?? },
    { icon: TrendingUp, title: "?ㅺ굅???듦퀎",  desc: "?숈씪 ?⑥? 理쒓렐 12媛쒖썡 27嫄?,        meta: "?됯퇏 11.2?? },
    { icon: ImageIcon,  title: "?꾩옣 ?ъ쭊",    desc: "?꾨Ц ?몄뒪?숉꽣 珥ъ쁺 v.2026.04",     meta: "?ъ쭊 24?? },
    { icon: Banknote,   title: "梨꾧텒 ?뺣낫",    desc: "?먭툑쨌?댁옄쨌?곗껜?댁옄 遺꾪븷 ?곗씠??,     meta: "Excel" },
  ]
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {items.map(it => (
        <DataTileLocked key={it.title} icon={it.icon} title={it.title} desc={it.desc} meta={it.meta} locked={locked} />
      ))}
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Section 3 ??DEAL ENGAGEMENT (LOI gated)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function DealEngagement({ locked }: { locked: boolean }) {
  const items = [
    { icon: MessageSquare,  title: "梨꾪똿 臾몄쓽",     desc: "留ㅻ룄 ?대떦??吏곸젒 ?곌껐",            meta: "?묐떟 ?됯퇏 18遺? },
    { icon: MapPin,         title: "?ㅽ봽?쇱씤 誘명똿", desc: "媛뺣궓 蹂몄궗 ?뚯쓽???덉빟",            meta: "二쇱쨷 媛?? },
    { icon: ClipboardCheck, title: "?ㅼ궗 吏꾪뻾",     desc: "媛먯젙?됯????숉뻾 ?꾩옣 ?ㅼ궗",         meta: "1.5???뚯슂" },
    { icon: Banknote,       title: "媛寃??묒긽",     desc: "援ъ냽???녿뒗 媛寃??ㅽ띁 ?쒖떆",        meta: "理쒕? 3?? },
  ]
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {items.map(it => (
        <DataTileLocked key={it.title} icon={it.icon} title={it.title} desc={it.desc} meta={it.meta} locked={locked} />
      ))}
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Section 4 ??DEAL EXECUTION (Escrow gated)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function DealExecution({ locked }: { locked: boolean }) {
  const items = [
    { icon: Wallet,         title: "?먯뒪?щ줈 寃곗젣", desc: "KB援??????덉쟾寃곗젣 쨌 遺꾪븷?⑹엯",   meta: "理쒕? 12媛쒖썡" },
    { icon: FileSignature,  title: "?꾩옄 怨꾩빟",     desc: "?꾩옄?쒕챸 + ?뺤젙?쇱옄 ?먮룞",          meta: "10遺??뚯슂" },
    { icon: CheckCircle2,   title: "?꾩옣 ?대줈吏?,   desc: "踰뺣Т???숉뻾 ?깃린?댁쟾 + ?붽툑泥섎━",    meta: "1???대줈吏? },
  ]
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {items.map(it => (
        <DataTileLocked key={it.title} icon={it.icon} title={it.title} desc={it.desc} meta={it.meta} locked={locked} />
      ))}
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Reusable: Paper card (free preview)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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
  const label = level === "low" ? "??쓬" : level === "med" ? "蹂댄넻" : "?믪쓬"
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Locked data tile (Validation/Engagement/Execution)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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
      title={locked ? "?좉툑 ?댁젣 ???ㅼ슫濡쒕뱶 媛?? : ""}
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
            <span style={{ color: MCK.textSub }}>?좉툑</span>
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
          ?좉툑 ?댁젣 ???대엺 媛??        </div>
      )}
    </article>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Deal Gate ??移대뱶媛 ?꾨땲??媛濡??쇱씤 寃뚯씠??   ctaLabel/onCtaClick 媛 ?쒓났?섎㈃ 寃뚯씠???쇰꺼 ?꾨옒 醫뚯륫 CTA 踰꾪듉 ?몄텧.
   (DR-24: ?쒕８ 醫뚯륫 寃뚯씠??紐⑤떖 ?몃━嫄???"?ъ옄???몄쬆?섍퀬 ?대엺" / "NDA 泥닿껐?붾㈃ ?닿린" / "LOI ?쒖텧?붾㈃ ?닿린")
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export function DealGate({
  icon: Icon, title, subtitle, panelMode = false, ctaLabel, onCtaClick,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  subtitle: string
  panelMode?: boolean
  /** 醫뚯륫 寃뚯씠??CTA ?쇰꺼 (?? "NDA 泥닿껐?붾㈃ ?닿린"). ?덉쓣 ?뚮쭔 踰꾪듉 ?몄텧. */
  ctaLabel?: string
  /** ctaLabel ?대┃ ??紐⑤떖 ?닿린 肄쒕갚 */
  onCtaClick?: () => void
}) {
  return (
    <div className={panelMode ? "px-5" : "max-w-[1280px] mx-auto px-6"}>
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

      {/* 醫뚯륫 CTA 踰꾪듉 ??紐⑤떖 ?몃━嫄?(ctaLabel 媛 ?덉쓣 ?뚮쭔) */}
      {ctaLabel && onCtaClick && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: -4,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={onCtaClick}
            className="mck-cta-dark"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 22px",
              background: MCK.paper,
              border: `1.5px solid ${MCK.ink}`,
              borderTop: `2px solid ${MCK.brass}`,
              color: MCK.ink,
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(10,22,40,0.08)",
            }}
          >
            <span style={{ color: MCK.ink }}>{ctaLabel}</span>
            <ChevronRight size={14} style={{ color: MCK.ink }} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Deal CTA ??寃??諛뺤뒪 + brass top + ??湲??(mck-cta-dark)
   onClick 媛 ?쒓났?섎㈃ 踰꾪듉?쇰줈 ?뚮뜑 (紐⑤떖 ?몃━嫄?, ?꾨땲硫?Link 濡??대갚.
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export function DealCTA({
  label, subtext, href, emphasis, onClick,
}: {
  label: string
  subtext: string
  href?: string
  emphasis?: boolean
  onClick?: () => void
}) {
  const inner = (
    <>
      <span style={{ color: emphasis ? MCK.paper : MCK.ink }}>{label}</span>
      <ChevronRight size={16} style={{ color: emphasis ? MCK.paper : MCK.ink }} />
    </>
  )
  const baseStyle: React.CSSProperties = {
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
    cursor: "pointer",
  }
  return (
    <div className="mt-10 flex flex-col items-center" style={{ gap: 10 }}>
      {onClick ? (
        <button type="button" onClick={onClick} className="mck-cta-dark" style={baseStyle}>
          {inner}
        </button>
      ) : (
        <Link href={href ?? "#"} className="mck-cta-dark" style={baseStyle}>
          {inner}
        </Link>
      )}
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
