"use client"

/**
 * AssetDetailView ??/exchange/[id] ?먯궛 ?곸꽭 蹂몃Ц (DR-15 쨌 2026-04-21)
 *
 * ??而댄룷?뚰듃??/exchange/[id] ?섏씠吏??臾쇰줎 /deals ?쒕８?먯꽌 ?좏깮???쒖쓽
 * ?곸꽭 ?붾㈃??iframe ?놁씠 吏곸젒 ?뚮뜑留곹븷 ?뚯뿉???ъ궗?⑸맗?덈떎.
 * - idProp 媛 二쇱뼱吏硫?洹멸쾬???곗꽑 ?ъ슜?섍퀬, ?놁쑝硫?useParams() ??[id] 濡?fallback
 * - Next.js page.tsx ??whitelist ??named export 留??덉슜?섎?濡????뚯씪? components/ ?섏쐞???꾩튂
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  FileText, MapPin, Building2, Gavel,
  CheckCircle2, ShieldCheck, Scale, Images,
  Banknote, ScrollText, TrendingUp, Calculator, Brain, ArrowRight,
  Pencil, X, Save, FileDown, Eye, EyeOff, HandCoins, BarChart2, FileCheck,
  FileSignature,
} from "lucide-react"
import { toast } from "sonner"
import { TierGate } from "@/components/tier/tier-gate"
import { OfferForm, OfferCard, type OfferData } from "@/components/deal-room/offer-card"
import type { AccessTier } from "@/lib/access-tier"
import { getUserTier, tierGte } from "@/lib/access-tier"
import { createClient } from "@/lib/supabase/client"
import { maskInstitutionName } from "@/lib/mask"

// DR-4/5: ?좉퇋 ?⑥닚??而댄룷?뚰듃
import {
  AssetHeroSummary,
  KpiRow,
  PrimaryActionCard,
  ActionSheet,
  AssetSidebar,
  AiReportCard,
  InlineDealRoom,
  DealCompletionStages,
  TierNav,
  InvestorVerifyModal,
  NdaModal,
  LoiModal,
  type InlineDealRoomCounterpart,
  type InvestorVerifyState,
  type NdaState,
  type LoiState,
} from "@/components/asset-detail"
// DR-19: ?쒕８ 醫뚯륫 硫붿씤 funnel 而댄룷?뚰듃 (primitives ??湲곗〈 ?뱀뀡 ?ъ씠??stage gate ?쎌엯??
import {
  DealHeaderStandalone,
  DealSection,
  DealGate,
} from "@/components/asset-detail/deal-flow-view"
import { Lock as DealLockIcon } from "lucide-react"
import { useAssetTier } from "@/hooks/use-asset-tier"
import type { AssetTier } from "@/hooks/use-asset-tier"

/* ?먥븧?먥븧??Mock 吏꾪뻾 ?쒕??덉씠??(API 誘몄뿰?????ъ슜) ?먥븧?먥븧??*/
const MOCK_STORAGE_KEY = (id: string) => `asset-mock-tier:${id}`
const TIER_ORDER: AssetTier[] = ["L0", "L1", "L2", "L3", "L4", "L5"]
const TIER_TRANSITION_MSG: Record<AssetTier, string> = {
  L0: "愿???쒖떆 ?꾨즺 쨌 留ㅼ묶 ?④퀎 ?쒖옉",
  L1: "媛쒖씤?몄쬆 ?꾨즺 쨌 AI 由ы룷??쨌 梨꾪똿 ?몃씫 (留ㅼ묶 ?④퀎 ?꾨즺)",
  L2: "NDA 泥닿껐 ?꾨즺 쨌 ?깃린?먮낯 쨌 ?꾩옣?ъ쭊 쨌 留ㅺ컖??湲곌??뺣낫 ?대엺",
  L3: "LOI ?쒖텧 ?꾨즺 쨌 留ㅻ룄???뱀씤 ?湲????ㅼ궗 ?먮즺 ?ㅽ뵂",
  L4: "怨꾩빟 珥덉븞 ?뱀씤 쨌 ?꾩옄?쒕챸 쨌 ?먯뒪?щ줈 ?④퀎 吏꾩엯",
  L5: "?뺤궛 ?꾨즺 쨌 嫄곕옒媛 醫낃껐?섏뿀?듬땲???럦",
}

/* ?먥븧?먥븧??Design tokens ?먥븧?먥븧??*/
const C = {
  bg0: "var(--layer-0-bg)",
  bg1: "var(--layer-1-bg)",
  bg3: "var(--layer-2-bg)",
  bg4: "var(--layer-border-strong)",
  em: "var(--color-positive)",
  blue: "var(--color-brand-dark)",
  amber: "var(--color-warning)",
  lt1: "var(--fg-strong)",
  lt2: "var(--fg-default)",
  lt3: "var(--fg-muted)",
  lt4: "var(--fg-subtle)",
}

/* ?먥븧?먥븧??Data types ?먥븧?먥븧??*/
interface ListingDetail {
  id: string
  institution: string
  inst_type: string
  region_city: string
  region_district: string
  collateral: string
  outstanding_principal: number
  asking_price: number
  appraisal_value: number
  discount_rate: number
  ai_grade: "S" | "A" | "B" | "C"
  data_completeness: number
  debtor_type: "INDIVIDUAL" | "CORPORATE"
  auction_stage: string
  court_case_masked: string
  published_at: string
  rights_summary: { senior_total: number; junior_total: number; deposit_total: number }
  registry_summary_items: Array<{ order: number; order_code?: string; type: string; amount: number; holder_masked: string; receipt_date?: string; deed_type?: "land" | "building" }>
  /** ?깃린遺?깅낯 ?꾩껜 ??(L2 怨듦컻) ???좎?/嫄대Ъ 援щ텇 */
  registry_land_full_items?: Array<{
    order: number
    order_code: string        // ?? "媛?0", "??1"
    receipt_date: string
    type: string
    holder: string            // 沅뚮━??(UI?먯꽌 maskHolderDisplay ?곸슜)
    amount: number | null
    amount_label?: string
  }>
  registry_building_full_items?: Array<{
    order: number
    order_code: string
    receipt_date: string
    type: string
    holder: string
    amount: number | null
    amount_label?: string
  }>
  /** 媛먯젙?됯???遺???뺣낫 */
  appraisal_area?: number     // 硫댁쟻 (m짼)
  appraisal_date?: string     // 媛먯젙 湲곗??쒖젏 (ISO, ?? "2026-05-23")
  lease_summary: { total_deposit: number; monthly_rent: number; tenant_count: number }
  site_photos: string[]
  debtor_name_masked: string
  court_case_full: string
  claim_info: {
    balance: number
    principal: number
    accrued_interest: number
    contract_rate: number
    delinquent_rate: number
    delinquent_since: string
    /**
     * ?섏씡沅?湲덉븸 (怨듬???梨꾧텒理쒓퀬?? ??1李?洹쇱??뱀쓽 梨꾧텒理쒓퀬??
     * ?쒓뎅 ?쒖?? ?異쒖썝湲?횞 110~140% (愿??1.2x). 誘몄엯?????먭툑 횞 1.2 湲곕낯 ?곸슜.
     */
    maximum_bond_amount?: number
  }
  /** 寃쎈ℓ ?뺣낫 (?놁쑝硫?null) */
  auction_info: {
    case_no: string           // ?ш굔踰덊샇
    court: string             // 愿?좊쾿??    filed_date: string        // 寃쎈ℓ?묒닔??(ISO)
    estimated_start: string   // ?덉긽 寃쎈ℓ 媛쒖떆??(ISO)
  } | null
  /** 怨듬ℓ ?뺣낫 (?놁쑝硫?null) */
  public_sale_info: {
    mgmt_no: string           // 愿由щ쾲??    filed_date: string        // 怨듬ℓ?좎껌??(ISO)
    estimated_start: string   // ?덉긽 怨듬ℓ ?쒖옉??(ISO)
  } | null
  /** 愿由ъ옄 ?뺤씤 ?곹깭 */
  escrow_confirmed: boolean   // ?먯뒪?щ줈 寃곗젣 ?⑹엯 ?뺤씤
  contract_confirmed: boolean // ?꾩옣 怨꾩빟 ?꾨즺 ?뺤씤
}

function buildMock(id: string): ListingDetail {
  /**
   * NPL 遺꾩꽍 蹂닿퀬??lib/npl/unified-report/sample.ts) ? ?숆린??(2026-04-26)
   * 쨌 梨꾧텒?붿븸 21.8??= ?먭툑 19.6??+ ?곗껜?댁옄 2.2??   * 쨌 媛먯젙媛 28.0??/ AI ?쒖꽭 25.5??/ ?좎씤??8.9%
   * 쨌 ?뺤긽湲덈━ 6.9% / ?곗껜湲덈━ 8.9% / ?곗껜?쒖옉 2025-07-23
   * 쨌 AI ?깃툒 A 쨌 留ㅼ닔 ?곹빀
   */
  return {
    id,
    institution: "?섎굹?異뺤???,
    inst_type: "?異뺤???,
    region_city: "?쒖슱",
    region_district: "媛뺣궓援?,
    collateral: "?꾪뙆??,
    outstanding_principal: 1_960_000_000,
    asking_price: 2_550_000_000,
    appraisal_value: 2_800_000_000,
    discount_rate: 8.9,
    ai_grade: "A",
    data_completeness: 9,
    debtor_type: "INDIVIDUAL",
    auction_stage: "?꾩쓽留ㅺ컖",
    court_case_masked: "?쒖슱以묒븰吏踰?2025?寃썩뿈?뤴뿈??,
    published_at: "2026-04-05",
    rights_summary: {
      senior_total: 780_000_000,
      junior_total: 140_000_000,
      deposit_total: 60_000_000,
    },
    registry_summary_items: [
      { order: 1, order_code: "??1", type: "洹쇱??밴텒", amount: 3_600_000_000, holder_masked: "以묒냼湲곗뾽???遺泥쒗뀒?щ끂吏??", receipt_date: "2021.06.18", deed_type: "land" },
      { order: 2, order_code: "??3", type: "洹쇱??밴텒", amount: 960_000_000,   holder_masked: "(二??쇰퉬?ㅽ?(?≫뙆???꾨??덉씠?щ퉴)", receipt_date: "2024.10.25", deed_type: "land" },
      { order: 3, order_code: "媛?1", type: "媛?뺣쪟",   amount: 654_000_000,   holder_masked: "(二?由곗젙(怨좎옍???쒕궓踰뺤“鍮뚮뵫)", receipt_date: "2024.10.15", deed_type: "building" },
    ],
    registry_land_full_items: [
      { order: 1, order_code: "媛?0", receipt_date: "2021.06.18", type: "?뚯쑀沅뚯씠??留ㅻℓ)",   holder: "?좏븳?뚯궗?쒖씠?먰띁?ㅽ듃(?뚯쑀??",         amount: null },
      { order: 2, order_code: "??1", receipt_date: "2021.06.18", type: "洹쇱??밴텒?ㅼ젙",       holder: "以묒냼湲곗뾽???遺泥쒗뀒?щ끂吏??",          amount: 3_600_000_000 },
      { order: 3, order_code: "媛?1", receipt_date: "2024.10.15", type: "媛?뺣쪟",             holder: "(二?由곗젙(怨좎옍???쒕궓踰뺤“鍮뚮뵫)",        amount: 654_000_000 },
      { order: 4, order_code: "媛?2", receipt_date: "2024.10.23", type: "?뺣쪟",               holder: "?곷벑?ш뎄(?쒖슱?밸퀎??",                 amount: null },
      { order: 5, order_code: "??3", receipt_date: "2024.10.25", type: "洹쇱??밴텒?ㅼ젙",       holder: "(二??쇰퉬?ㅽ?(?≫뙆???꾨??덉씠?щ퉴)",    amount: 960_000_000 },
      { order: 6, order_code: "媛?3", receipt_date: "2025.01.08", type: "?뺣쪟",               holder: "援?湲덉쿇?몃Т?쒖옣",                      amount: null },
      { order: 7, order_code: "媛?4", receipt_date: "2025.05.09", type: "?꾩쓽寃쎈ℓ媛쒖떆寃곗젙",   holder: "以묒냼湲곗뾽????ъ떊愿由щ?)",             amount: 3_086_117_337, amount_label: "泥?뎄湲덉븸" },
    ],
    registry_building_full_items: [
      { order: 1, order_code: "媛?",  receipt_date: "2021.06.18", type: "?뚯쑀沅뚯씠??留ㅻℓ)",   holder: "?좏븳?뚯궗?쒖씠?먰띁?ㅽ듃(?뚯쑀??",         amount: null },
      { order: 2, order_code: "??",  receipt_date: "2021.06.18", type: "洹쇱??밴텒?ㅼ젙",       holder: "以묒냼湲곗뾽???遺泥쒗뀒?щ끂吏??",          amount: 3_600_000_000 },
      { order: 3, order_code: "媛?",  receipt_date: "2024.10.15", type: "媛?뺣쪟",             holder: "(二?由곗젙(怨좎옍???쒕궓踰뺤“鍮뚮뵫)",        amount: 654_000_000 },
      { order: 4, order_code: "媛?",  receipt_date: "2025.05.09", type: "?꾩쓽寃쎈ℓ媛쒖떆寃곗젙",   holder: "以묒냼湲곗뾽????ъ떊愿由щ?)",             amount: 3_086_117_337, amount_label: "泥?뎄湲덉븸" },
    ],
    appraisal_area: 3333,
    appraisal_date: "2026-05-23",
    lease_summary: { total_deposit: 60_000_000, monthly_rent: 0, tenant_count: 1 },
    site_photos: ["photo1", "photo2", "photo3"],
    debtor_name_masked: "源?뤴뿈",
    court_case_full: "?쒖슱以묒븰吏踰?2025?寃?2345",
    claim_info: {
      balance: 2_180_000_000,         // 梨꾧텒?붿븸 21.80??(NPL 蹂닿퀬???숆린??
      principal: 1_960_000_000,       // ?異쒖썝湲?19.60??      accrued_interest: 220_000_000,  // ?곗껜?댁옄 2.20??      contract_rate: 6.9,             // ?뺤긽湲덈━
      delinquent_rate: 8.9,           // ?곗껜湲덈━
      delinquent_since: "2025-07-23",
    },
    auction_info: {
      case_no: "?쒖슱以묒븰吏踰?2025?寃?2345",
      court: "?쒖슱以묒븰吏諛⑸쾿??,
      filed_date: "2025-08-15",
      estimated_start: "2026-05-20",
    },
    public_sale_info: null,
    escrow_confirmed: false,
    contract_confirmed: false,
  }
}

function formatKRW(n: number | null | undefined): string {
  if (!n) return "??
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}??
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}留?
  return n.toLocaleString("ko-KR")
}

function formatDateKo(iso: string | null | undefined): string {
  if (!iso) return "??
  try { return iso.slice(0, 10) } catch { return "?? }
}

/** 沅뚮━???쒖떆??留덉뒪?? 愿꾪샇 遺遺??쒓굅 + ??5湲????泥섎━ */
function maskHolderDisplay(raw: string): string {
  const stripped = raw.replace(/\(.*?\)/g, '').replace(/竊?*?竊?g, '').trim()
  if (!stripped) return '?뤴뿈?뤴뿈??
  const chars = [...stripped]
  return chars.map((c, i) => i < 5 ? '?? : c).join('')
}

/** 援щ텇 肄붾뱶 ?щ㎎: order + optional code ??"1(媛?0)" */
function fmtOrderCode(order: number, code?: string): string {
  return code ? `${order}(${code})` : String(order)
}

/** m짼 ????蹂??*/
const M2_PER_PYEONG = 3.3058
function fmtArea(m2: number, unit: "m2" | "??): string {
  if (unit === "m2") return `${m2.toLocaleString("ko-KR")}m짼`
  return `${(m2 / M2_PER_PYEONG).toFixed(1)}??
}
function fmtPricePerArea(price: number, m2: number, unit: "m2" | "??): string {
  if (!m2) return "??
  if (unit === "m2") {
    const v = Math.round(price / m2)
    return v >= 10_000 ? `${(v / 10_000).toFixed(0)}留뚯썝/m짼` : `${v.toLocaleString()}??m짼`
  }
  const pyeong = m2 / M2_PER_PYEONG
  const v = Math.round(price / pyeong)
  return v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}???? :
    v >= 10_000 ? `${(v / 10_000).toFixed(0)}留뚯썝/?? : `${v.toLocaleString()}????
}

function computeDataCompleteness(row: Record<string, unknown>): number {
  const checks = [
    !!row.title, !!row.collateral_type, !!row.sido,
    !!row.address, !!row.claim_amount, !!row.appraised_value,
    !!row.discount_rate, !!row.ai_grade,
    Array.isArray(row.image_urls) && (row.image_urls as unknown[]).length > 0,
    !!row.description,
  ]
  return checks.filter(Boolean).length
}

function mapNplListingToDetail(row: Record<string, unknown>, id: string): ListingDetail {
  const claimAmt = (row.claim_amount as number) ?? 0
  const appraisedVal = (row.appraised_value as number) ?? claimAmt
  const discountRaw = (row.discount_rate as number) ?? 0
  const askingPrice = discountRaw > 0
    ? Math.round(appraisedVal * (1 - discountRaw / 100))
    : claimAmt
  const seniorClaim = (row.senior_claim as number) ?? 0
  const imageUrls = Array.isArray(row.image_urls) ? (row.image_urls as string[]) : []
  return {
    id: (row.id as string) ?? id,
    institution: (row.creditor_institution as string) ?? "留ㅺ컖湲곌?",
    inst_type: "湲덉쑖湲곌?",
    region_city: (row.sido as string) ?? "吏??誘몄긽",
    region_district: (row.sigungu as string) ?? "",
    collateral: (row.collateral_type as string) ?? "湲고?",
    outstanding_principal: claimAmt,
    asking_price: askingPrice,
    appraisal_value: appraisedVal,
    discount_rate: discountRaw,
    ai_grade: (row.ai_grade as "S" | "A" | "B" | "C") ?? "C",
    data_completeness: computeDataCompleteness(row),
    debtor_type: (row.debtor_type as "INDIVIDUAL" | "CORPORATE") ?? "INDIVIDUAL",
    auction_stage: (row.listing_type as string) ?? "?꾩쓽留ㅺ컖",
    court_case_masked: "?뤴뿈吏踰??뤴뿈?寃썩뿈?뤴뿈??,
    published_at: formatDateKo(row.created_at as string),
    rights_summary: { senior_total: seniorClaim, junior_total: 0, deposit_total: 0 },
    registry_summary_items: [],
    lease_summary: { total_deposit: 0, monthly_rent: 0, tenant_count: 0 },
    site_photos: imageUrls,
    debtor_name_masked: "?뤴뿈??,
    court_case_full: "?뤴뿈吏踰??뤴뿈?寃썩뿈?뤴뿈??,
    claim_info: {
      balance: ((row.claim_balance as number) ?? 0) || (claimAmt + Math.round(claimAmt * 0.04)),
      principal: claimAmt,
      accrued_interest: (row.accrued_interest as number) ?? Math.round(claimAmt * 0.04),
      contract_rate: (row.contract_rate as number) ?? 4.8,
      delinquent_rate: (row.delinquent_rate as number) ?? 18.0,
      delinquent_since: (row.delinquent_since as string) ?? "2025-10-14",
    },
    auction_info: row.auction_case_no
      ? {
          case_no: (row.auction_case_no as string),
          court: (row.auction_court as string) ?? "??,
          filed_date: (row.auction_filed_date as string) ?? "",
          estimated_start: (row.auction_start_date as string) ?? "",
        }
      : null,
    public_sale_info: row.public_sale_mgmt_no
      ? {
          mgmt_no: (row.public_sale_mgmt_no as string),
          filed_date: (row.public_sale_filed_date as string) ?? "",
          estimated_start: (row.public_sale_start_date as string) ?? "",
        }
      : null,
    escrow_confirmed: !!(row.escrow_confirmed_at),
    contract_confirmed: !!(row.contract_confirmed_at),
  }
}

function useUserTier(): [AccessTier, (t: AccessTier) => void] {
  const [tier, setTier] = useState<AccessTier>("L0")
  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from("users")
          .select("identity_verified, qualified_investor")
          .eq("id", user.id)
          .single()
        if (profile) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setTier(getUserTier(profile as any))
        }
      } catch {
        /* stay L0 */
      }
    })()
  }, [])
  return [tier, setTier]
}

interface AIAnalysisResult {
  recoveryRate: { predicted: number; confidence: number; range: [number, number]; grade: string } | null
  priceGuide: { recommended: number; min: number; max: number; marketOutlook: string } | null
  anomaly: { verdict: string; score: number; flags: string[] } | null
  loading: boolean
  error: string | null
}

/**
 * /deals ?쒕８ 移대뱶/由ъ뒪?몄뿉???좏깮?????뺣낫瑜?AssetDetailView ???꾨떖???? * ?섎뱶肄붾뵫??mock ?곗씠?곕? ??뼱?뚯슦湲??꾪븳 ?뺤? overlay ???
 */
export interface AssetDetailDealOverride {
  /** 留ㅻЪ紐?(?? "媛뺣궓援??꾪뙆??NPL 梨꾧텒") ???쒖떆??*/
  listing_name?: string
  /** ?곷?諛?留ㅺ컖湲곌? (?? "?섎굹?異뺤???) ??listing.institution */
  counterparty?: string
  /** 梨꾧텒 湲덉븸 (?? ??outstanding_principal 쨌 claim_info 쨌 ?щ쭩媛쨌媛먯젙媛 ?ъ궛??*/
  amount?: number
  /** ?대낫 醫낅쪟 (?? "?꾪뙆??) ??listing.collateral */
  asset_type?: string
  /** 吏??(?? "?쒖슱 媛뺣궓援?) ??region_city + region_district 濡?遺꾨━ */
  location?: string
}

/**
 * Deal override 瑜?base ListingDetail ???뺢쾶 ?⑹꽦.
 * 湲덉븸??二쇱뼱吏硫?沅뚮━쨌?щ쭩媛쨌媛먯젙媛쨌梨꾧텒?뺣낫??鍮꾨? ?곗젙.
 */
function applyDealOverride(
  base: ListingDetail,
  override?: AssetDetailDealOverride,
): ListingDetail {
  if (!override) return base
  const next: ListingDetail = { ...base, rights_summary: { ...base.rights_summary }, claim_info: { ...base.claim_info } }
  if (override.counterparty) next.institution = override.counterparty
  if (override.asset_type) next.collateral = override.asset_type
  if (override.location) {
    const parts = override.location.trim().split(/\s+/)
    next.region_city = parts[0] ?? base.region_city
    next.region_district = parts.slice(1).join(" ") || base.region_district
  }
  if (override.amount && override.amount > 0) {
    const amount = override.amount
    next.outstanding_principal = amount
    next.asking_price = Math.round(amount * (1 - base.discount_rate / 100))
    next.appraisal_value = Math.round(amount * 1.18) // 媛먯젙媛 ???먭툑 ?鍮?18% ?곹쉶 媛??    next.claim_info = {
      ...next.claim_info,
      principal: amount,
      accrued_interest: Math.round(amount * 0.04),
      balance: amount + Math.round(amount * 0.04),
    }
    next.rights_summary = {
      senior_total: Math.round(amount * 0.65),
      junior_total: Math.round(amount * 0.12),
      deposit_total: Math.round(amount * 0.05),
    }
  }
  return next
}

export interface AssetDetailViewProps {
  /** URL param ???吏곸젒 id 二쇱엯 ???놁쑝硫?useParams() fallback */
  idProp?: string
  /** ?몃? ?섏씠吏(/deals ?? ?먯꽌 ?좏깮???쒖쓽 ?숈쟻 ?곗씠?곕줈 mock overlay */
  dealOverride?: AssetDetailDealOverride
  /**
   * ?몃? 而⑦뀒?대꼫???꾨쿋?????곹깭. true 硫?
   *  쨌 min-h-screen ?쒓굅 (遺紐?而⑦뀒?대꼫媛 ?믪씠 ?쒖뼱)
   *  쨌 而댄뵆?쇱씠?몄뒪 footer ?④?
   *  쨌 紐⑤컮??sticky CTA ?④? (以묐났 諛⑹?)
   */
  embedded?: boolean
  /**
   * ?쒕８ (/deals) ?꾩슜 ??醫뚯륫 硫붿씤 而⑦뀗痢좊? Deal Flow funnel 濡?援먯껜.
   * ?곗륫 sticky ?ъ씠?쒕컮(PrimaryActionCard, 遺꾩꽍?꾧뎄, AssetSidebar) ???좎?.
   * ?곷떒 hero(?먯궛 ?ъ쭊/?쒕ぉ) ? ?섎떒 footer ???④?.
   */
  dealFlowMode?: boolean
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   AssetDetailView ??蹂몃Ц (?ъ궗??媛?ν븳 酉?而댄룷?뚰듃)
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
export function AssetDetailView({
  idProp,
  dealOverride,
  embedded = false,
  dealFlowMode = false,
}: AssetDetailViewProps = {}) {
  const params = useParams()
  const id = idProp ?? (params?.id as string) ?? "npl-2026-0412"

  const [baseListing, setBaseListing] = useState<ListingDetail>(() => buildMock(id))
  const listing = useMemo(
    () => applyDealOverride(baseListing, dealOverride),
    [baseListing, dealOverride],
  )
  const [tier] = useUserTier()
  const assetTier = useAssetTier(id)

  const [watchlisted, setWatchlisted] = useState(false)
  const [watchlistSaving, setWatchlistSaving] = useState(false)
  const [dealCreating] = useState(false)

  const [mockTier, setMockTier] = useState<AssetTier>("L0")
  const [actionOpen, setActionOpen] = useState(false)

  /* ?? DR-24: 寃뚯씠??紐⑤떖 (?ъ옄???몄쬆 / NDA / LOI) ??
   * ?대? ?뱀씤???뚯썝?대㈃ 紐⑤떖?????꾩슂 ?놁쑝誘濡?遺紐⑥뿉???곹깭 泥댄겕 ???몄텧.
   * Mock: ?뚯썝媛?????ъ뾽?먮벑濡앹쬆/紐낇븿 紐⑤몢 ?쒖텧 ??愿由ъ옄 寃??以?pending).
   *       梨꾧텒蹂?NDA/LOI ??誘몄젣異?none) ?곹깭?먯꽌 ?쒖옉.
   */
  const [investorOpen, setInvestorOpen] = useState(false)
  const [ndaOpen, setNdaOpen] = useState(false)
  const [loiOpen, setLoiOpen] = useState(false)
  const [investorState, setInvestorState] = useState<InvestorVerifyState>({
    status: "pending",
    businessLicense: { label: "?ъ뾽?먮벑濡앹쬆", submitted: true, filename: "?ъ뾽?먮벑濡앹쬆_2026.pdf", submittedAt: "2026-04-20" },
    businessCard: { label: "紐낇븿", submitted: true, filename: "namecard.jpg", submittedAt: "2026-04-20" },
    reviewNote: "愿由ъ옄 寃??以?(?곸뾽??湲곗? 1???대궡)",
    updatedAt: "2026-04-20",
  })
  const [ndaState, setNdaState] = useState<NdaState>({
    status: "none",
    sellerName: maskInstitutionName("?섎굹?異뺤???),
  })
  const [loiState, setLoiState] = useState<LoiState>({
    status: "none",
    sellerName: maskInstitutionName("?섎굹?異뺤???),
  })

  /* ?? 愿由ъ옄/梨꾧텒???몄쭛 湲곕뒫 ?? */
  const [canEdit, setCanEdit] = useState(false)
  const [editingSec, setEditingSec] = useState<"auction" | "public-sale" | null>(null)
  const [auctionDraft, setAuctionDraft] = useState<ListingDetail["auction_info"]>(null)
  const [publicSaleDraft, setPublicSaleDraft] = useState<ListingDetail["public_sale_info"]>(null)
  const [areaUnit, setAreaUnit] = useState<"m2" | "??>("m2")
  const [appraisalPdfOpen, setAppraisalPdfOpen] = useState(false)
  const [loiPdfOpen, setLoiPdfOpen] = useState(false)
  const [ndaPdfOpen, setNdaPdfOpen] = useState(false)
  const [submittedOffer, setSubmittedOffer] = useState<OfferData | null>(null)
  const [offerFormVisible, setOfferFormVisible] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState<number | null>(null)

  /* ?깃린遺?깅낯 ??& ?묎린/?쇱튂湲?*/
  const [deedSummaryTab, setDeedSummaryTab] = useState<"land" | "building">("land")
  const [deedFullTab, setDeedFullTab] = useState<"land" | "building">("land")
  /* ?깃린遺?깅낯 ?쇱튂湲??묎린 湲곕낯媛?   * ?붿빟(deedSummary): false (紐⑹감留?蹂댁엫 ???쇱튂湲곕줈 ?꾩껜 ?몄텧)
   * ?먮낯(deedFull): true (?쇱튇 ?곹깭濡??쒖옉 ???묒쑝硫?紐⑹감留?
   * ?ъ슜???붿껌: "湲곕낯?곸쑝濡??깃린遺 ?꾪솴 ?쇱튂湲곕줈 踰꾪듉 / ?깃린遺 ?꾪솴 ?묎린 (吏湲덇낵 諛섎?)"
   */
  const [deedSummaryExpanded, setDeedSummaryExpanded] = useState(false)
  const [deedFullExpanded, setDeedFullExpanded] = useState(false)

  /* ?ъ슜????븷 ?뺤씤: admin ?먮뒗 seller 硫??몄쭛 ?덉슜 */
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const role = data.user?.user_metadata?.role as string | undefined
      // dev user 00000000... ??SELLER ??븷 ???몄쭛 ?덉슜
      const devUserId = "00000000-0000-0000-0000-000000000001"
      setCanEdit(
        role === "admin" || role === "seller" || role === "SELLER" ||
        data.user?.id === devUserId,
      )
    }).catch(() => setCanEdit(false))
  }, [])

  /* ?몄쭛 ?????baseListing ?낅뜲?댄듃 + PATCH API */
  const handleSaveSection = useCallback(async (section: "auction" | "public-sale") => {
    if (section === "auction" && auctionDraft !== undefined) {
      setBaseListing(prev => ({ ...prev, auction_info: auctionDraft }))
    } else if (section === "public-sale" && publicSaleDraft !== undefined) {
      setBaseListing(prev => ({ ...prev, public_sale_info: publicSaleDraft }))
    }
    setEditingSec(null)
    try {
      const body = section === "auction"
        ? { auction_case_no: auctionDraft?.case_no, auction_court: auctionDraft?.court, auction_filed_date: auctionDraft?.filed_date, auction_estimated_start: auctionDraft?.estimated_start }
        : { public_sale_mgmt_no: publicSaleDraft?.mgmt_no, public_sale_filed_date: publicSaleDraft?.filed_date, public_sale_estimated_start: publicSaleDraft?.estimated_start }
      await fetch(`/api/v1/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      toast.success("?뺣낫媛 ??λ릺?덉뒿?덈떎.")
    } catch {
      toast.error("???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.")
    }
  }, [id, auctionDraft, publicSaleDraft])
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(MOCK_STORAGE_KEY(id))
    if (saved && TIER_ORDER.includes(saved as AssetTier)) {
      setMockTier(saved as AssetTier)
    }
  }, [id])

  const effectiveTier: AssetTier = assetTier.tier !== "L0" ? assetTier.tier : mockTier
  const effectiveAccessTier: AccessTier =
    effectiveTier === "L0" ? "L0" :
    effectiveTier === "L1" ? "L1" :
    effectiveTier === "L2" ? "L2" :
    "L3"
  void tier

  // id 蹂寃???base mock ?ъ깮??(?쒕８?먯꽌 移대뱶 ?꾪솚 ???꾩닔)
  useEffect(() => {
    setBaseListing(buildMock(id))
  }, [id])

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("npl_listings")
          .select("*")
          .eq("id", id)
          .single()
        if (!error && data) {
          setBaseListing(mapNplListingToDetail(data as Record<string, unknown>, id))
        }
      } catch {
        /* mock fallback */
      }
    })()
  }, [id])

  const handleWatchlist = useCallback(async () => {
    if (watchlistSaving) return
    setWatchlistSaving(true)
    try {
      if (watchlisted) {
        await fetch(`/api/v1/buyer/watchlist?listing_id=${id}`, { method: "DELETE" })
        setWatchlisted(false)
      } else {
        const res = await fetch("/api/v1/buyer/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: id, folderName: "湲곕낯", priceAtSave: listing.asking_price }),
        })
        if (res.ok || res.status === 409) setWatchlisted(true)
      }
    } catch { /* silent */ } finally {
      setWatchlistSaving(false)
    }
  }, [id, watchlisted, watchlistSaving, listing.asking_price])

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult>({
    recoveryRate: null, priceGuide: null, anomaly: null, loading: true, error: null,
  })
  useEffect(() => {
    ;(async () => {
      try {
        const [recR, anoR] = await Promise.all([
          fetch(`/api/v1/ai/recovery-predict?listing_id=${id}`).catch(() => null),
          fetch(`/api/v1/ai/anomaly-detect?listing_id=${id}`).catch(() => null),
        ])
        const rec = recR && recR.ok ? await recR.json() : null
        const ano = anoR && anoR.ok ? await anoR.json() : null
        setAiAnalysis({
          recoveryRate: rec?.data ?? null,
          priceGuide: null,
          anomaly: ano?.data ?? null,
          loading: false,
          error: null,
        })
      } catch {
        setAiAnalysis({ recoveryRate: null, priceGuide: null, anomaly: null, loading: false, error: null })
      }
    })()
  }, [id])

  /**
   * DR-24: tier 蹂꾨줈 寃뚯씠??紐⑤떖 遺꾧린
   * - L0 ???ъ옄???몄쬆 (愿由ъ옄 ?뱀씤 ?湲???紐⑤떖, approved 硫?利됱떆 ?ㅼ쓬 ?④퀎)
   * - L1 ??NDA 泥닿껐 紐⑤떖 (留ㅺ컖???뱀씤 ?湲?
   * - L2 ??LOI ?쒖텧 紐⑤떖 (留ㅺ컖???뱀씤 ?湲?
   * - L3+ ??湲곗〈 ActionSheet (怨꾩빟/?먯뒪?щ줈/?뺤궛)
   * ?대? approved ?곹깭?대㈃ 紐⑤떖???꾩슦吏 ?딄퀬 ?ㅼ쓬 ?④퀎 利됱떆 吏꾪뻾 (handleConfirmStep)
   */
  const handlePrimaryAction = useCallback(() => {
    if (effectiveTier === "L0") {
      if (investorState.status === "approved") { handleNextTier(); return }
      setInvestorOpen(true)
      return
    }
    if (effectiveTier === "L1") {
      if (ndaState.status === "approved") { handleNextTier(); return }
      setNdaOpen(true)
      return
    }
    if (effectiveTier === "L2") {
      if (loiState.status === "approved") { handleNextTier(); return }
      setLoiOpen(true)
      return
    }
    setActionOpen(true)
  }, [effectiveTier, investorState.status, ndaState.status, loiState.status]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Mock: ?ㅼ쓬 tier 濡?利됱떆 ?밴툒 (?대? approved ??寃쎌슦?? */
  const handleNextTier = useCallback(() => {
    const currentIdx = TIER_ORDER.indexOf(effectiveTier)
    const nextTier = TIER_ORDER[currentIdx + 1] ?? "L5"
    setMockTier(nextTier)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_STORAGE_KEY(id), nextTier)
    }
    toast.success(TIER_TRANSITION_MSG[nextTier], { duration: 3000 })
  }, [effectiveTier, id])

  const handleConfirmStep = useCallback(() => {
    setActionOpen(false)
    if (effectiveTier === "L5") {
      toast.success(TIER_TRANSITION_MSG.L5, { duration: 3500 })
      return
    }
    const currentIdx = TIER_ORDER.indexOf(effectiveTier)
    const nextTier = TIER_ORDER[currentIdx + 1] ?? "L5"
    setMockTier(nextTier)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_STORAGE_KEY(id), nextTier)
    }
    toast.success(TIER_TRANSITION_MSG[nextTier], { duration: 3000 })
  }, [effectiveTier, id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (url.searchParams.get("reset") === "1") {
      window.localStorage.removeItem(MOCK_STORAGE_KEY(id))
      setMockTier("L0")
      url.searchParams.delete("reset")
      window.history.replaceState({}, "", url.toString())
      toast("吏꾪뻾 ?곹깭瑜?珥덇린?뷀뻽?듬땲?? (L0)")
    }
  }, [id])

  const discountPct = listing.discount_rate.toFixed(1)

  const oneLiner = [
    `梨꾧텒 ${formatKRW(listing.outstanding_principal)}`,
    `?щ쭩 ${formatKRW(listing.asking_price)}`,
    `?좎씤??${discountPct}%`,
  ].join(" 쨌 ")

  const title = `${listing.region_city} ${listing.region_district} ${listing.collateral} NPL`

  const counterpart: InlineDealRoomCounterpart = {
    name: tierGte(effectiveAccessTier, "L2") ? "?대ℓ???대떦?? : "留ㅻ룄??(?곕え)",
    role: "留ㅻ룄??,
    initial: "留?,
    phone: "02-0000-0000",
    organization: maskInstitutionName(listing.institution),
  }

  const handleTierPreview = (t: AssetTier) => {
    setMockTier(t)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_STORAGE_KEY(id), t)
    }
    toast(TIER_TRANSITION_MSG[t], { duration: 2200 })
  }

  return (
    <main
      style={{
        backgroundColor: C.bg0,
        color: "var(--color-text-primary)",
        // embedded 紐⑤뱶: 遺紐?而⑦뀒?대꼫媛 ?믪씠 ?쒖뼱 (min-h-screen ?쒓굅)
        minHeight: embedded ? undefined : "100vh",
      }}
    >
      {!dealFlowMode && (
      <AssetHeroSummary
        title={title}
        oneLiner={oneLiner}
        aiGrade={listing.ai_grade}
        tier={effectiveTier}
        watchlisted={watchlisted}
        onToggleWatchlist={handleWatchlist}
        backHref={embedded ? "/deals" : "/exchange"}
      />
      )}

      {!dealFlowMode && (
      <section
        className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-3"
        style={{ padding: "14px 24px" }}
      >
        <div
          className="flex items-center gap-x-4 gap-y-1.5 flex-wrap"
          style={{ fontSize: 12, color: C.lt3 }}
        >
          <span className="inline-flex items-center gap-1 font-semibold">
            <Building2 size={13} />
            {listing.inst_type}
          </span>
          <span style={{ color: C.lt4 }}>쨌</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <MapPin size={13} />
            {listing.region_city} {listing.region_district}
          </span>
          <span style={{ color: C.lt4 }}>쨌</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Gavel size={13} />
            {listing.auction_stage}
          </span>
          <span style={{ color: C.lt4 }}>쨌</span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums" style={{ color: C.lt4 }}>
            <FileText size={12} />
            {id}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        {/* 留ㅻ룄??愿由ъ옄: 留ㅻЪ ?뺣낫 ?꾩껜 ?섏젙 吏꾩엯??*/}
        {canEdit && (
          <a
            href={`/my/listings/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg font-bold transition-colors"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              color: "#FFFFFF",
              backgroundColor: "#0A1628",
              border: "1px solid #0A1628",
              textDecoration: "none",
            }}
          >
            <Pencil size={12} />
            留ㅻЪ ?뺣낫 ?섏젙
          </a>
        )}
        <div
          className="inline-flex items-center gap-1 rounded-lg p-1"
          style={{
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
          }}
          role="radiogroup"
          aria-label="怨듦컻 踰붿쐞 誘몃━蹂닿린"
        >
          <span
            className="px-2 font-bold"
            style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}
          >
            怨듦컻 踰붿쐞
          </span>
          {(["L0", "L1", "L2", "L3"] as AssetTier[]).map((t) => {
            const isActive = effectiveTier === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleTierPreview(t)}
                className="font-bold rounded-md transition-colors"
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  backgroundColor: isActive ? "var(--color-brand-dark)" : "transparent",
                  color: isActive ? "var(--fg-on-brand)" : C.lt2,
                }}
              >
                {t}
              </button>
            )
          })}
        </div>
        </div>
      </section>
      )}

      {!dealFlowMode && <TierNav tier={effectiveTier} />}

      {effectiveTier === "L5" && (
        <section className="max-w-[1280px] mx-auto" style={{ padding: "0 24px 12px" }}>
          <div
            className="rounded-2xl p-5 flex items-start gap-4 flex-wrap"
            style={{
              backgroundColor: "var(--color-positive-bg)",
              border: "1px solid var(--color-positive)",
            }}
          >
            <CheckCircle2 size={24} color="var(--color-positive)" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-[200px]">
              <div className="font-black" style={{ fontSize: 16, color: "var(--color-positive)" }}>
                嫄곕옒媛 醫낃껐?섏뿀?듬땲??              </div>
              <p className="mt-1.5 leading-relaxed" style={{ fontSize: 12, color: "var(--fg-default)" }}>
                ?먯뒪?щ줈 ?뺤궛???꾨즺?섏뿀?듬땲??쨌 ?곸닔利앷낵 ?멸툑怨꾩궛?쒕뒗 ?꾨옒 ?뺤궛 ?댁뿭?먯꽌 ?뺤씤?섏꽭??
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return
                window.localStorage.removeItem(MOCK_STORAGE_KEY(id))
                setMockTier("L0")
                toast("吏꾪뻾 ?곹깭瑜?珥덇린?뷀뻽?듬땲??")
              }}
              className="px-3 py-1.5 rounded-lg font-bold"
              style={{
                fontSize: 11,
                backgroundColor: "transparent",
                color: "var(--color-positive)",
                border: "1px solid var(--color-positive)",
              }}
            >
              泥섏쓬遺???ㅼ떆 ?쒖뿰
            </button>
          </div>
        </section>
      )}

      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "8px 24px 120px" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8">
          <div className="space-y-5 min-w-0">
            {/*
              DR-20 쨌 2026-04-25
              ?쒕８ (/deals) 吏꾩엯 ??醫뚯륫 硫붿씤??Deal Flow funnel 濡??ш뎄??
              쨌 湲곗〈 ?뱀뀡? 洹몃?濡??ъ슜 (以묐났 X)
              쨌 DealHeaderStandalone ?쇰줈 4-step funnel 吏꾪뻾?곹솴 ?ㅻ뜑留??곷떒??異붽?
              쨌 DealSection ?ㅻ뜑 + DealGate 媛濡??쇱씤???④퀎 ?ъ씠???쎌엯
              쨌 ?곗륫 sticky ?ъ씠?쒕컮??洹몃?濡??좎?
            */}
            {dealFlowMode && (
              <>
                <DealHeaderStandalone
                  title={title}
                  institution={listing.institution}
                  region={`${listing.region_city} ${listing.region_district}`.trim()}
                  saleType={listing.auction_stage}
                  dealId={id}
                  currentStage={
                    effectiveTier === "L4" || effectiveTier === "L5" ? "Execution" :
                    effectiveTier === "L3" ? "Engagement" :
                    effectiveTier === "L2" ? "Validation" : "Screening"
                  }
                  hideKpiGrid
                  panelMode
                />
                <StageHeader
                  eyebrow="Section 01 쨌 Free preview"
                  title="Deal Screening"
                  subtitle="???쒖씠 寃?좏븷 媛移섍? ?덈뒗吏 3遺??덉뿉 ?먮떒"
                />
              </>
            )}
            <KpiRow
              items={[
                {
                  label: "梨꾧텒?붿븸",
                  value: formatKRW(listing.claim_info.balance),
                  tone: "primary",
                  hint: `?먭툑 ${formatKRW(listing.claim_info.principal)} + ?곗껜?댁옄 ${formatKRW(listing.claim_info.accrued_interest)}`,
                },
                {
                  label: "留ㅺ컖 ?щ쭩媛",
                  value: formatKRW(listing.asking_price),
                  tone: "accent",
                  hint: `?좎씤????{discountPct}%`,
                },
                {
                  label: "媛먯젙媛",
                  value: formatKRW(listing.appraisal_value),
                  tone: "neutral",
                  hint: `媛먯젙?됯? 湲곗?`,
                },
              ]}
            />

            <div
              className="rounded-xl p-3.5 flex items-start gap-2"
              style={{
                backgroundColor: "rgba(46, 117, 182, 0.07)",
                border: "1px solid rgba(46, 117, 182, 0.24)",
              }}
            >
              <ShieldCheck
                size={15}
                color="var(--color-brand-bright)"
                className="flex-shrink-0 mt-0.5"
              />
              <p className="leading-relaxed" style={{ fontSize: 11, color: C.lt2 }}>
                蹂?留ㅻЪ? <strong style={{ color: C.lt1 }}>?먮룞 留덉뒪???뚯씠?꾨씪??/strong>???듦낵??                寃곌낵?낅땲?? 媛쒖씤?뺣낫쨌梨꾨Т???앸퀎?뺣낫쨌?곸꽭 吏踰댟룸룞/?몄닔??湲덉쑖媛먮룆?먃룰툑?듭쐞?먰쉶 吏移⑥뿉 ?곕씪
                ?먮룞?쇰줈 媛?ㅼ?硫? ?곗뼱蹂?怨듦컻 踰붿쐞??洹쒖젣 ?붽굔??留욎떠 遺꾨━?섏뼱 ?덉뒿?덈떎.
              </p>
            </div>

            {/* AI 遺꾩꽍 由ы룷????L0 怨듦컻 */}
            <div id="ai-report" className="scroll-mt-24">
              <AiReportCard
                recoveryRate={aiAnalysis.recoveryRate?.predicted ?? 78.5}
                confidence={aiAnalysis.recoveryRate?.confidence ?? 92}
                grade={aiAnalysis.recoveryRate?.grade}
                anomaly={
                  aiAnalysis.anomaly
                    ? { verdict: aiAnalysis.anomaly.verdict, score: aiAnalysis.anomaly.score }
                    : null
                }
                loading={aiAnalysis.loading}
                onRefresh={() => toast.info("AI ?щ텇?앹쓣 ?붿껌?덉뒿?덈떎.", { duration: 1500 })}
                onOpenFull={() => {
                  if (typeof window !== "undefined") {
                    window.open(`/analysis/${id}`, "_blank", "noopener")
                  }
                }}
                onAskCopilot={() => toast.info("AI Copilot??怨??대┰?덈떎.", { duration: 1500 })}
              />
            </div>

            <SectionCard
              title="沅뚮━愿怨??붿빟"
              icon={<Scale size={14} />}
              tierBadge="L0"
              anchorId="rights"
            >
              <div className="grid grid-cols-3 gap-3">
                <Stat label="?좎닚??珥앹븸" value={formatKRW(listing.rights_summary.senior_total)} tone="amber" />
                <Stat label="?꾩닚??珥앹븸" value={formatKRW(listing.rights_summary.junior_total)} tone="blue" />
                <Stat label="蹂댁쬆湲?珥앹븸" value={formatKRW(listing.rights_summary.deposit_total)} tone="em" />
              </div>
              <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.lt3 }}>
                ?붿빟 ?뺣낫??L0 ?④퀎?먯꽌 ?꾧뎄???대엺?????덉뒿?덈떎. 沅뚮━???곸꽭 ?뺣낫??L2 (NDA + ?꾨Ц?ъ옄?? ?댁긽?먯꽌 怨듦컻?⑸땲??
              </p>
            </SectionCard>

            {/* ?? DR-21: CTA 寃뚯씠??(L1 ?몄쬆) ??dealFlowMode ?먯꽌留??? */}
            {dealFlowMode && !tierGte(effectiveAccessTier, "L1") && (
              <div className="mt-6 lg:mt-8">
                <DealGate
                  icon={DealLockIcon}
                  title="?ъ옄???몄쬆?섍퀬 ?곸꽭 蹂닿린"
                  subtitle="?깃린遺?깅낯쨌?꾨?李㉱룰컧?뺥룊媛?????곸꽭 ?곗씠???대엺"
                  panelMode
                  ctaLabel={investorState.status === "approved" ? undefined : "?ъ옄???몄쬆?섍퀬 ?대엺"}
                  onCtaClick={
                    investorState.status === "approved"
                      ? undefined
                      : () => setInvestorOpen(true)
                  }
                />
              </div>
            )}

            <SectionCard
              title="?깃린遺?깅낯 ?붿빟"
              icon={<ScrollText size={14} />}
              tierBadge="L1"
              anchorId="deed-summary"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={140} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {listing.registry_summary_items.length === 0 ? (
                  <p className="text-center py-6" style={{ color: C.lt4, fontSize: 11 }}>
                    ?깃린 ?뺣낫媛 ?꾩쭅 ?낅줈?쒕릺吏 ?딆븯?듬땲??
                  </p>
                ) : (
                  <div>
                    {/* ?? ?좎??깃린遺 / 嫄대Ъ?깃린遺 */}
                    <div className="flex items-center gap-1 mb-3" style={{ borderBottom: "1px solid var(--layer-border-strong)", paddingBottom: 0 }}>
                      {(["land", "building"] as const).map(t => {
                        const label = t === "land" ? "?좎??깃린遺" : "嫄대Ъ?깃린遺"
                        const count = listing.registry_summary_items.filter(r => r.deed_type === t || r.deed_type == null).length
                        const active = deedSummaryTab === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDeedSummaryTab(t)}
                            className="font-bold transition-colors"
                            style={{
                              padding: "6px 14px",
                              fontSize: 12,
                              borderBottom: active ? "2px solid var(--color-brand-bright)" : "2px solid transparent",
                              color: active ? "var(--color-brand-bright)" : C.lt4,
                              background: "none",
                              marginBottom: -1,
                            }}
                          >
                            {label}
                            {count > 0 && (
                              <span
                                className="ml-1.5 rounded-full px-1.5"
                                style={{ fontSize: 9, backgroundColor: active ? "rgba(46,117,182,0.15)" : "var(--layer-2-bg)", color: active ? "var(--color-brand-bright)" : C.lt4 }}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* ?뚯씠釉?*/}
                    {deedSummaryExpanded && (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--layer-2-bg)", borderBottom: "2px solid var(--layer-border-strong)" }}>
                              {["援щ텇", "?묒닔??, "沅뚮━醫낅쪟", "沅뚮━??, "梨꾧텒湲덉븸"].map((h, i) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: "8px 12px",
                                    textAlign: i >= 4 ? "right" : i === 0 ? "center" : "left",
                                    fontSize: 10, fontWeight: 700,
                                    color: C.lt4, letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {listing.registry_summary_items
                              .filter(r => r.deed_type === deedSummaryTab || r.deed_type == null)
                              .map((r, idx, arr) => (
                                <tr
                                  key={r.order}
                                  style={{
                                    borderBottom: idx < arr.length - 1
                                      ? "1px solid var(--layer-border)"
                                      : undefined,
                                  }}
                                >
                                  <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.lt4, whiteSpace: "nowrap" }}>
                                    {fmtOrderCode(r.order, r.order_code)}
                                  </td>
                                  <td style={{ padding: "10px 12px", fontSize: 11, color: C.lt4, whiteSpace: "nowrap" }}>
                                    {r.receipt_date ?? "??}
                                  </td>
                                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: C.lt1 }}>
                                    {r.type}
                                  </td>
                                  <td style={{ padding: "10px 12px", fontSize: 11, color: C.lt3 }}>
                                    {maskHolderDisplay(r.holder_masked)}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: C.em, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                    {formatKRW(r.amount)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ?묎린/?쇱튂湲??좉? */}
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setDeedSummaryExpanded(v => !v)}
                        className="inline-flex items-center gap-1.5 rounded-full font-bold transition-colors"
                        style={{
                          padding: "4px 14px",
                          fontSize: 11,
                          backgroundColor: "var(--layer-2-bg)",
                          color: C.lt4,
                          border: "1px solid var(--layer-border-strong)",
                        }}
                      >
                        {deedSummaryExpanded ? "???깃린遺 ?꾪솴 ?묎린" : "???깃린遺 ?꾪솴 ?쇱튂湲?}
                      </button>
                    </div>
                  </div>
                )}
              </TierGate>
            </SectionCard>

            <SectionCard
              title="?꾨?李??꾪솴"
              icon={<Building2 size={14} />}
              tierBadge="L1"
              anchorId="tenants"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={120} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="蹂댁쬆湲??⑷퀎" value={formatKRW(listing.lease_summary.total_deposit)} />
                  <Stat label="?붿꽭" value={formatKRW(listing.lease_summary.monthly_rent || 0)} />
                  <Stat label="?꾩감???? value={`${listing.lease_summary.tenant_count}紐?} />
                </div>
              </TierGate>
            </SectionCard>

            {/* ?? DR-20: Gate 1 (NDA) + Stage 02 ?ㅻ뜑 ??dealFlowMode ?먯꽌留??? */}
            {dealFlowMode && (
              <>
                <DealGate
                  icon={DealLockIcon}
                  title="NDA 泥닿껐 ???대엺 媛??
                  subtitle="湲곌? 寃利??곗씠??쨌 媛먯젙?됯???쨌 ?ㅺ굅??쨌 梨꾧텒 ?뺣낫"
                  panelMode
                  ctaLabel={
                    !tierGte(effectiveAccessTier, "L2") && ndaState.status !== "approved"
                      ? "NDA 泥닿껐?붾㈃ ?닿린"
                      : undefined
                  }
                  onCtaClick={
                    !tierGte(effectiveAccessTier, "L2") && ndaState.status !== "approved"
                      ? () => setNdaOpen(true)
                      : undefined
                  }
                />
                <StageHeader
                  eyebrow="Section 02 쨌 NDA required"
                  title="Deal Validation"
                  subtitle="寃利??곗씠?????섏궗寃곗젙???듭떖 洹쇨굅"
                />
              </>
            )}

            {/* ?? NDA 泥닿껐 (L2) ?? */}
            <SectionCard
              title="NDA 泥닿껐"
              icon={<FileSignature size={14} />}
              tierBadge="L2"
              anchorId="nda"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={72} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="space-y-3">
                  <div
                    className="rounded-xl flex items-center gap-3 px-4 py-3"
                    style={{
                      backgroundColor: "var(--color-positive-bg)",
                      border: "1px solid rgba(5, 28, 44, 0.4)",
                    }}
                  >
                    <CheckCircle2 size={18} color="var(--color-positive)" className="flex-shrink-0" />
                    <div>
                      <div className="font-black" style={{ fontSize: 13, color: "var(--color-positive)" }}>
                        NDA 泥닿껐 ?꾨즺
                      </div>
                      <div className="mt-0.5" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                        媛먯젙?됯???쨌 ?꾩옣?ъ쭊 쨌 梨꾧텒?뺣낫 ??L2 ?먮즺瑜??대엺?????덉뒿?덈떎
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setNdaPdfOpen(v => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                      style={{
                        fontSize: 12,
                        backgroundColor: ndaPdfOpen ? "var(--color-brand-bright-bg, rgba(46,117,182,0.12))" : "var(--layer-2-bg)",
                        color: ndaPdfOpen ? "var(--color-brand-bright)" : "var(--fg-muted)",
                        border: `1px solid ${ndaPdfOpen ? "rgba(46,117,182,0.4)" : "var(--layer-border-strong)"}`,
                      }}
                    >
                      {ndaPdfOpen ? <EyeOff size={13} /> : <Eye size={13} />}
                      {ndaPdfOpen ? "NDA ?リ린" : "NDA 蹂닿린"}
                    </button>
                    <a
                      href={`/api/v1/docs/${id}/nda?download=1`}
                      download
                      onClick={e => { e.preventDefault(); toast.success("NDA 臾몄꽌 ?ㅼ슫濡쒕뱶瑜??쒖옉?⑸땲??", { duration: 1800 }) }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                      style={{
                        fontSize: 12,
                        backgroundColor: "rgba(5, 28, 44,0.10)",
                        color: "var(--color-positive)",
                        border: "1px solid rgba(5, 28, 44,0.3)",
                      }}
                    >
                      <FileDown size={13} />
                      PDF ?ㅼ슫濡쒕뱶
                    </a>
                  </div>
                  {ndaPdfOpen && (
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--layer-border-strong)" }}>
                      <div className="flex items-center justify-between px-3 py-2"
                        style={{ backgroundColor: "var(--layer-2-bg)", fontSize: 11, color: "var(--fg-muted)" }}>
                        <span className="font-bold">鍮꾨??좎?怨꾩빟??(NDA) 誘몃━蹂닿린</span>
                        <button type="button" onClick={() => setNdaPdfOpen(false)}><X size={14} /></button>
                      </div>
                      <iframe src={`/api/v1/docs/${id}/nda`} title="NDA" className="w-full"
                        style={{ height: 480, border: "none", backgroundColor: "#f8f8f8" }} />
                    </div>
                  )}
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title="媛먯젙?됯???
              icon={<Banknote size={14} />}
              tierBadge="L2"
              anchorId="appraisal"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={140} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {/* ?? ?⑥쐞 ?좉? ?? */}
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 11, color: C.lt4, fontWeight: 700 }}>?⑥쐞</span>
                  {(["m2", "??] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setAreaUnit(u)}
                      className="rounded-full font-bold transition-colors"
                      style={{
                        padding: "3px 10px", fontSize: 11,
                        backgroundColor: areaUnit === u ? C.blue : "var(--layer-2-bg)",
                        color: areaUnit === u ? "#fff" : C.lt3,
                        border: `1px solid ${areaUnit === u ? C.blue : "var(--layer-border-strong)"}`,
                      }}
                    >
                      {u === "m2" ? "m짼" : "??}
                    </button>
                  ))}
                </div>

                {/* ?? KPI 3移??? */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <Stat label="媛먯젙媛" value={formatKRW(listing.appraisal_value)} tone="em" />
                  <Stat
                    label={`硫댁쟻 (${areaUnit === "m2" ? "m짼" : "??})`}
                    value={listing.appraisal_area ? fmtArea(listing.appraisal_area, areaUnit) : "??}
                  />
                  <Stat
                    label={`媛먯젙媛/${areaUnit === "m2" ? "m짼" : "??}`}
                    value={
                      listing.appraisal_area
                        ? fmtPricePerArea(listing.appraisal_value, listing.appraisal_area, areaUnit)
                        : "??
                    }
                    tone="blue"
                  />
                </div>

                {/* ?? 媛먯젙 湲곗??쒖젏 ?? */}
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.lt3 }}>媛먯젙 湲곗??쒖젏</span>
                  <input
                    type="date"
                    readOnly
                    value={listing.appraisal_date ?? ""}
                    style={{
                      fontSize: 12, color: C.lt2,
                      border: "1px solid var(--layer-border-strong)",
                      borderRadius: 6, padding: "4px 8px",
                      backgroundColor: "var(--layer-2-bg)",
                      cursor: "default",
                    }}
                  />
                </div>

                {/* PDF 酉곗뼱 + ?ㅼ슫濡쒕뱶 */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAppraisalPdfOpen(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{
                      fontSize: 12,
                      backgroundColor: appraisalPdfOpen ? "var(--color-brand-bright-bg, rgba(46,117,182,0.12))" : "var(--layer-2-bg)",
                      color: appraisalPdfOpen ? "var(--color-brand-bright)" : "var(--fg-muted)",
                      border: `1px solid ${appraisalPdfOpen ? "rgba(46,117,182,0.4)" : "var(--layer-border-strong)"}`,
                    }}
                  >
                    {appraisalPdfOpen ? <EyeOff size={13} /> : <Eye size={13} />}
                    {appraisalPdfOpen ? "PDF ?リ린" : "PDF 蹂닿린"}
                  </button>
                  <a
                    href={`/api/v1/docs/${id}/appraisal?download=1`}
                    download
                    onClick={e => { e.preventDefault(); toast.success("媛먯젙?됯????ㅼ슫濡쒕뱶瑜??쒖옉?⑸땲??", { duration: 1800 }) }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{
                      fontSize: 12,
                      backgroundColor: "rgba(5, 28, 44,0.10)",
                      color: "var(--color-positive)",
                      border: "1px solid rgba(5, 28, 44,0.3)",
                    }}
                  >
                    <FileDown size={13} />
                    PDF ?ㅼ슫濡쒕뱶
                  </a>
                </div>
                {appraisalPdfOpen && (
                  <div
                    className="mt-3 rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--layer-border-strong)" }}
                  >
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ backgroundColor: "var(--layer-2-bg)", fontSize: 11, color: "var(--fg-muted)" }}
                    >
                      <span className="font-bold">媛먯젙?됯???誘몃━蹂닿린</span>
                      <button type="button" onClick={() => setAppraisalPdfOpen(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    {/* ?ㅼ젣 ?섍꼍?먯꽌??/api/v1/docs/:id/appraisal URL ?ъ슜 */}
                    <iframe
                      src={`/api/v1/docs/${id}/appraisal`}
                      title="媛먯젙?됯???
                      className="w-full"
                      style={{ height: 560, border: "none", backgroundColor: "#f8f8f8" }}
                    />
                  </div>
                )}
              </TierGate>
            </SectionCard>

            {/* ?? 寃쎈ℓ ?뺣낫 (L2) ?? */}
            <SectionCard
              title="寃쎈ℓ ?뺣낫"
              icon={<Gavel size={14} />}
              tierBadge="L2"
              anchorId="auction-info"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={120} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {editingSec === "auction" ? (
                  /* ?? 寃쎈ℓ ?뺣낫 ?몄쭛 ???? */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {(["?ш굔踰덊샇", "愿?좊쾿??] as const).map((label, i) => {
                        const key = i === 0 ? "case_no" : "court"
                        return (
                          <div key={label}>
                            <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>{label}</label>
                            <input
                              className="w-full rounded-lg px-3 py-2 font-medium"
                              style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                              value={(auctionDraft as Record<string, string>)?.[key] ?? ""}
                              onChange={e => setAuctionDraft(prev => prev ? { ...prev, [key]: e.target.value } : { case_no: "", court: "", filed_date: "", estimated_start: "", [key]: e.target.value })}
                              placeholder={label}
                            />
                          </div>
                        )
                      })}
                      {(["寃쎈ℓ?묒닔??寃쎈ℓ媛쒖떆??", "?덉긽 寃쎈ℓ ?쒖옉??] as const).map((label, i) => {
                        const key = i === 0 ? "filed_date" : "estimated_start"
                        return (
                          <div key={label}>
                            <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>{label}</label>
                            <input
                              type="date"
                              className="w-full rounded-lg px-3 py-2 font-medium"
                              style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                              value={(auctionDraft as Record<string, string>)?.[key] ?? ""}
                              onChange={e => setAuctionDraft(prev => prev ? { ...prev, [key]: e.target.value } : { case_no: "", court: "", filed_date: "", estimated_start: "", [key]: e.target.value })}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => handleSaveSection("auction")}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-black"
                        style={{ fontSize: 12, backgroundColor: "var(--color-positive)", color: "#fff" }}>
                        <Save size={13} /> ???                      </button>
                      <button type="button" onClick={() => setEditingSec(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold"
                        style={{ fontSize: 12, backgroundColor: "var(--layer-2-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>
                        <X size={13} /> 痍⑥냼
                      </button>
                    </div>
                  </div>
                ) : listing.auction_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="?ш굔踰덊샇" value={listing.auction_info.case_no} />
                      <InfoField label="愿?좊쾿?? value={listing.auction_info.court} />
                      <InfoField label="寃쎈ℓ?묒닔??寃쎈ℓ媛쒖떆??" value={formatDateKo(listing.auction_info.filed_date)} />
                      <InfoField label="?덉긽 寃쎈ℓ ?쒖옉?? value={formatDateKo(listing.auction_info.estimated_start)} />
                    </div>
                    {/* ?낆쭛怨좎삦??寃쎈ℓ ?곕룞 */}
                    <a
                      href={`https://auction.jijigae.com/search?q=${encodeURIComponent(listing.auction_info.case_no || listing.court_case_full)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                      style={{
                        fontSize: 12,
                        backgroundColor: "rgba(5, 28, 44,0.10)",
                        color: "#D97706",
                        border: "1px solid rgba(5, 28, 44,0.28)",
                      }}
                    >
                      <Gavel size={12} />
                      ?낆쭛怨좎삦?섏뿉??寃쎈ℓ 議고쉶
                      <ArrowRight size={11} />
                    </a>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setAuctionDraft(listing.auction_info); setEditingSec("auction") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-colors"
                        style={{ fontSize: 11, color: "var(--fg-muted)", backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)" }}>
                        <Pencil size={11} /> ?섏젙
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center py-3" style={{ color: C.lt4, fontSize: 12 }}>
                      寃쎈ℓ 吏꾪뻾 ?놁쓬 쨌 ?대떦 留ㅻЪ? ?꾩쓽留ㅺ컖 諛⑹떇?낅땲??
                    </p>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setAuctionDraft({ case_no: "", court: "", filed_date: "", estimated_start: "" }); setEditingSec("auction") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold"
                        style={{ fontSize: 11, color: "var(--color-brand-bright)", backgroundColor: "rgba(46,117,182,0.10)", border: "1px solid rgba(46,117,182,0.3)" }}>
                        <Pencil size={11} /> 寃쎈ℓ ?뺣낫 ?깅줉
                      </button>
                    )}
                  </div>
                )}
              </TierGate>
            </SectionCard>

            {/* ?? 怨듬ℓ ?뺣낫 (L2) ?? */}
            <SectionCard
              title="怨듬ℓ ?뺣낫"
              icon={<Gavel size={14} />}
              tierBadge="L2"
              anchorId="public-sale"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={120} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {editingSec === "public-sale" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>愿由щ쾲??/label>
                        <input className="w-full rounded-lg px-3 py-2 font-medium"
                          style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                          value={publicSaleDraft?.mgmt_no ?? ""}
                          onChange={e => setPublicSaleDraft(prev => prev ? { ...prev, mgmt_no: e.target.value } : { mgmt_no: e.target.value, filed_date: "", estimated_start: "" })}
                          placeholder="?? 2025-00123-001" />
                      </div>
                      <div>
                        <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>怨듬ℓ?좎껌??/label>
                        <input type="date" className="w-full rounded-lg px-3 py-2 font-medium"
                          style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                          value={publicSaleDraft?.filed_date ?? ""}
                          onChange={e => setPublicSaleDraft(prev => prev ? { ...prev, filed_date: e.target.value } : { mgmt_no: "", filed_date: e.target.value, estimated_start: "" })} />
                      </div>
                      <div>
                        <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>?덉긽 怨듬ℓ ?쒖옉??/label>
                        <input type="date" className="w-full rounded-lg px-3 py-2 font-medium"
                          style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                          value={publicSaleDraft?.estimated_start ?? ""}
                          onChange={e => setPublicSaleDraft(prev => prev ? { ...prev, estimated_start: e.target.value } : { mgmt_no: "", filed_date: "", estimated_start: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => handleSaveSection("public-sale")}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-black"
                        style={{ fontSize: 12, backgroundColor: "var(--color-positive)", color: "#fff" }}>
                        <Save size={13} /> ???                      </button>
                      <button type="button" onClick={() => setEditingSec(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold"
                        style={{ fontSize: 12, backgroundColor: "var(--layer-2-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>
                        <X size={13} /> 痍⑥냼
                      </button>
                    </div>
                  </div>
                ) : listing.public_sale_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="愿由щ쾲?? value={listing.public_sale_info.mgmt_no} />
                      <InfoField label="怨듬ℓ?좎껌?? value={formatDateKo(listing.public_sale_info.filed_date)} />
                      <InfoField label="?덉긽 怨듬ℓ ?쒖옉?? value={formatDateKo(listing.public_sale_info.estimated_start)} />
                    </div>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setPublicSaleDraft(listing.public_sale_info); setEditingSec("public-sale") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold"
                        style={{ fontSize: 11, color: "var(--fg-muted)", backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)" }}>
                        <Pencil size={11} /> ?섏젙
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center py-3" style={{ color: C.lt4, fontSize: 12 }}>
                      怨듬ℓ 吏꾪뻾 ?놁쓬 쨌 ?대떦 留ㅻЪ? 寃쎈ℓ ?먮뒗 ?꾩쓽留ㅺ컖 諛⑹떇?낅땲??
                    </p>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setPublicSaleDraft({ mgmt_no: "", filed_date: "", estimated_start: "" }); setEditingSec("public-sale") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold"
                        style={{ fontSize: 11, color: "var(--color-brand-bright)", backgroundColor: "rgba(46,117,182,0.10)", border: "1px solid rgba(46,117,182,0.3)" }}>
                        <Pencil size={11} /> 怨듬ℓ ?뺣낫 ?깅줉
                      </button>
                    )}
                  </div>
                )}
              </TierGate>
            </SectionCard>

            {/* ?? ?ㅺ굅??寃쎄났留??듦퀎 (L2) ?? */}
            <SectionCard
              title="?ㅺ굅??寃쎄났留??듦퀎"
              icon={<BarChart2 size={14} />}
              tierBadge="L2"
              anchorId="auction-stats"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={100} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <p className="mb-3 leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  援?넗遺 ?ㅺ굅?섍? ?꾪솴 諛?踰뺤썝 寃쎈ℓ? ?⑤퉬??怨듬ℓ ?숈같 ?듦퀎 諛??좎궗 ?щ?瑜??뺤씤?⑸땲??
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://auction.jijigo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold"
                    style={{ fontSize: 12, backgroundColor: "rgba(5, 28, 44,0.10)", color: "var(--color-text-primary)", border: "1px solid rgba(5, 28, 44,0.28)" }}
                  >
                    <BarChart2 size={12} />
                    ?낆쭛怨좎삦???듦퀎 ?뺣낫 議고쉶
                    <ArrowRight size={11} />
                  </a>
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title="?깃린遺?깅낯 ?먮낯"
              icon={<ScrollText size={14} />}
              tierBadge="L2"
              anchorId="deed-full"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={140} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="space-y-4">
                  {/* ?? ?ㅼ슫濡쒕뱶 踰꾪듉: ?좎? ?깃린遺?깅낯 / 嫄대Ъ ?깃린遺?깅낯 ?? */}
                  <div className="flex flex-wrap gap-2">
                    <DeedDownloadBtn
                      label="?좎? ?깃린遺?깅낯"
                      url={`/api/v1/docs/${id}/deed-land`}
                      uploaded={true}
                      onDownload={() => toast.success("?좎? ?깃린遺?깅낯 ?ㅼ슫濡쒕뱶瑜??쒖옉?⑸땲??", { duration: 1800 })}
                    />
                    {listing.collateral !== "?좎?" && (
                      <DeedDownloadBtn
                        label="嫄대Ъ ?깃린遺?깅낯"
                        url={`/api/v1/docs/${id}/deed-building`}
                        uploaded={true}
                        onDownload={() => toast.success("嫄대Ъ ?깃린遺?깅낯 ?ㅼ슫濡쒕뱶瑜??쒖옉?⑸땲??", { duration: 1800 })}
                      />
                    )}
                  </div>

                  {/* ?? ?? ?좎??깃린遺 / 嫄대Ъ?깃린遺 ?? */}
                  <div>
                    <div className="flex items-center gap-1" style={{ borderBottom: "1px solid var(--layer-border-strong)", paddingBottom: 0 }}>
                      {(["land", "building"] as const).map(t => {
                        const label = t === "land" ? "?좎? ?깃린遺?깅낯" : "嫄대Ъ ?깃린遺?깅낯"
                        const items = t === "land" ? listing.registry_land_full_items : listing.registry_building_full_items
                        const active = deedFullTab === t
                        const count = items?.length ?? 0
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDeedFullTab(t)}
                            className="font-bold transition-colors"
                            style={{
                              padding: "6px 14px",
                              fontSize: 12,
                              borderBottom: active ? "2px solid var(--color-brand-bright)" : "2px solid transparent",
                              color: active ? "var(--color-brand-bright)" : C.lt4,
                              background: "none",
                              marginBottom: -1,
                            }}
                          >
                            {label}
                            {count > 0 && (
                              <span
                                className="ml-1.5 rounded-full px-1.5"
                                style={{ fontSize: 9, backgroundColor: active ? "rgba(46,117,182,0.15)" : "var(--layer-2-bg)", color: active ? "var(--color-brand-bright)" : C.lt4 }}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* ?? ?꾩껜 ?깃린遺 ?뚯씠釉??? */}
                    {(() => {
                      const fullItems = deedFullTab === "land"
                        ? listing.registry_land_full_items
                        : listing.registry_building_full_items
                      if (!fullItems || fullItems.length === 0) {
                        return (
                          <p className="text-center py-5" style={{ color: C.lt4, fontSize: 11 }}>
                            {deedFullTab === "land" ? "?좎?" : "嫄대Ъ"} ?깃린遺 ?곗씠?곌? ?놁뒿?덈떎.
                          </p>
                        )
                      }
                      return (
                        <div>
                          {/* ?ㅻ뜑 ?? 梨꾧텒?≫빀怨?+ ?대엺??*/}
                          <div className="flex items-center justify-between my-2 px-1" style={{ fontSize: 11 }}>
                            <span style={{ color: C.lt3, fontWeight: 700 }}>
                              梨꾧텒?≫빀怨?" "}
                              <span style={{ color: C.em }}>
                                {fullItems.reduce((s, r) => s + (r.amount ?? 0), 0).toLocaleString("ko-KR")}??                              </span>
                            </span>
                            <span style={{ color: C.lt4 }}>
                              ?대엺 {listing.published_at?.replace(/-/g, ".")}
                            </span>
                          </div>

                          {deedFullExpanded && (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                                <thead>
                                  <tr style={{ backgroundColor: "var(--layer-2-bg)", borderBottom: "2px solid var(--layer-border-strong)" }}>
                                    {["援щ텇", "?묒닔??, "沅뚮━醫낅쪟", "沅뚮━??, "梨꾧텒湲덉븸"].map((h, i) => (
                                      <th
                                        key={h}
                                        style={{
                                          padding: "8px 10px",
                                          textAlign: i >= 4 ? "right" : i === 0 ? "center" : "left",
                                          fontSize: 10, fontWeight: 700,
                                          color: C.lt4, letterSpacing: "0.04em",
                                          textTransform: "uppercase",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {fullItems.map((r, idx) => (
                                    <tr
                                      key={r.order}
                                      style={{
                                        borderBottom: idx < fullItems.length - 1
                                          ? "1px solid var(--layer-border)"
                                          : undefined,
                                      }}
                                    >
                                      <td style={{ padding: "9px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.lt4, whiteSpace: "nowrap" }}>
                                        {fmtOrderCode(r.order, r.order_code)}
                                      </td>
                                      <td style={{ padding: "9px 10px", fontSize: 11, color: C.lt4, whiteSpace: "nowrap" }}>
                                        {r.receipt_date}
                                      </td>
                                      <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 700, color: C.lt1, whiteSpace: "nowrap" }}>
                                        {r.type}
                                      </td>
                                      <td style={{ padding: "9px 10px", fontSize: 11, color: C.lt3 }}>
                                        {maskHolderDisplay(r.holder)}
                                      </td>
                                      <td style={{ padding: "9px 10px", textAlign: "right", fontSize: 12, fontWeight: 700, color: r.amount ? C.em : C.lt4, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                        {r.amount_label && (
                                          <span style={{ fontSize: 10, color: C.lt4, marginRight: 4 }}>{r.amount_label}</span>
                                        )}
                                        {r.amount !== null ? r.amount.toLocaleString("ko-KR") + "?? : "??}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* ?묎린/?쇱튂湲??좉? */}
                          <div className="mt-2 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setDeedFullExpanded(v => !v)}
                              className="inline-flex items-center gap-1.5 rounded-full font-bold transition-colors"
                              style={{
                                padding: "4px 14px",
                                fontSize: 11,
                                backgroundColor: "var(--layer-2-bg)",
                                color: C.lt4,
                                border: "1px solid var(--layer-border-strong)",
                              }}
                            >
                              {deedFullExpanded ? "???깃린遺 ?꾪솴 ?묎린" : "???깃린遺 ?꾪솴 ?쇱튂湲?}
                            </button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title={`?꾩옣 ?ъ쭊 (${listing.site_photos.length})`}
              icon={<Images size={14} />}
              tierBadge="L2"
              anchorId="site-photos"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={160} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toast.success("?꾩옣 ?ъ쭊 ?꾩껜 ?ㅼ슫濡쒕뱶瑜??쒖옉?⑸땲??", { duration: 1800 })}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{ fontSize: 12, backgroundColor: "rgba(5, 28, 44,0.10)", color: "var(--color-positive)", border: "1px solid rgba(5, 28, 44,0.3)" }}
                  >
                    <FileDown size={13} />
                    ?꾩껜 ?ㅼ슫濡쒕뱶 ({listing.site_photos.length}??
                  </button>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory" }}>
                    {listing.site_photos.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxPhoto(i)}
                        className="flex-shrink-0 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                        style={{ width: 140, height: 140, scrollSnapAlign: "start", backgroundColor: "var(--layer-2-bg)", border: "1px dashed var(--layer-border-strong)", color: C.lt4, fontSize: 11, cursor: "pointer" }}
                        title={`?ъ쭊 ${i + 1} ?뺣?`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </TierGate>
            </SectionCard>

            {/* ?? ?꾩옣 ?ъ쭊 ?쇱씠?몃컯???? */}
            {lightboxPhoto !== null && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
                onClick={() => setLightboxPhoto(null)}
              >
                <div
                  className="relative rounded-2xl flex items-center justify-center"
                  style={{ width: "min(90vw,640px)", height: "min(80vh,480px)", backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontSize: 16, color: C.lt3 }}>{listing.site_photos[lightboxPhoto]}</div>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button type="button"
                      onClick={() => setLightboxPhoto(i => i !== null && i > 0 ? i - 1 : listing.site_photos.length - 1)}
                      className="rounded-lg px-2 py-1 font-bold"
                      style={{ fontSize: 14, backgroundColor: "var(--layer-1-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>??/button>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{lightboxPhoto + 1} / {listing.site_photos.length}</span>
                    <button type="button"
                      onClick={() => setLightboxPhoto(i => i !== null && i < listing.site_photos.length - 1 ? i + 1 : 0)}
                      className="rounded-lg px-2 py-1 font-bold"
                      style={{ fontSize: 14, backgroundColor: "var(--layer-1-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>??/button>
                    <button type="button" onClick={() => setLightboxPhoto(null)}
                      className="rounded-lg p-1" style={{ backgroundColor: "var(--layer-1-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SectionCard
              title="梨꾧텒 ?뺣낫"
              anchorId="debt-info"
              icon={<Banknote size={14} />}
              tierBadge="L2"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={200} softBlur={dealFlowMode}>
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(5, 28, 44, 0.12), rgba(46, 117, 182, 0.08))",
                      border: "1px solid rgba(5, 28, 44, 0.33)",
                    }}
                  >
                    <div
                      className="font-semibold mb-1"
                      style={{ fontSize: 11, color: C.lt3, letterSpacing: "0.04em" }}
                    >
                      梨꾧텒?붿븸 <span style={{ color: C.lt4 }}>(?먭툑 + 誘몄닔?댁옄)</span>
                    </div>
                    <div
                      className="font-black tabular-nums"
                      style={{ fontSize: 28, color: C.em, lineHeight: 1.1 }}
                    >
                      {formatKRW(listing.claim_info.balance)}
                    </div>
                    <div
                      className="mt-2 flex items-center gap-2 flex-wrap font-semibold tabular-nums"
                      style={{ fontSize: 11, color: C.lt3 }}
                    >
                      {(() => {
                        const bal = listing.claim_info.balance || 1
                        const pRatio = Math.round((listing.claim_info.principal / bal) * 100)
                        const iRatio = Math.max(0, 100 - pRatio)
                        return (
                          <>
                            <span>?먭툑 {formatKRW(listing.claim_info.principal)} <span style={{ color: C.lt4, fontWeight: 500 }}>({pRatio}%)</span></span>
                            <span style={{ color: C.lt4 }}>+</span>
                            <span>?곗껜?댁옄 {formatKRW(listing.claim_info.accrued_interest)} <span style={{ color: C.lt4, fontWeight: 500 }}>({iRatio}%)</span></span>
                          </>
                        )
                      })()}
                    </div>
                    {/* 鍮꾩쑉 ?쒓컖?????먭툑/?곗껜?댁옄 bar */}
                    <div
                      className="mt-2 h-1.5 w-full rounded-full overflow-hidden flex"
                      style={{ background: "rgba(148,163,184,0.12)" }}
                      title="梨꾧텒?붿븸 援ъ꽦 鍮꾩쑉"
                    >
                      {(() => {
                        const bal = listing.claim_info.balance || 1
                        const pPct = (listing.claim_info.principal / bal) * 100
                        return (
                          <>
                            <span style={{ width: `${pPct}%`, background: "linear-gradient(90deg,#10B981,#2E75B6)" }} />
                            <span style={{ flex: 1, background: "rgba(5, 28, 44,0.55)" }} />
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ClaimField
                      label="?異?湲덈━"
                      value={`${listing.claim_info.contract_rate.toFixed(1)}%`}
                      sub="?곗씠??
                      tone="blue"
                    />
                    <ClaimField
                      label="?곗껜 湲덈━"
                      value={`${listing.claim_info.delinquent_rate.toFixed(1)}%`}
                      sub="?곗씠??
                      tone="amber"
                    />
                    <ClaimField
                      label="?곗껜 ?쒖옉??
                      value={formatDateKo(listing.claim_info.delinquent_since)}
                      sub={(() => {
                        const days = Math.floor(
                          (Date.now() - new Date(listing.claim_info.delinquent_since).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                        return days > 0 ? `${days}??寃쎄낵` : "?ㅻ뒛"
                      })()}
                      tone="neutral"
                    />
                  </div>

                  {/* ?섏씡沅?湲덉븸 (怨듬???梨꾧텒理쒓퀬?? ???ъ슜???붿껌 2026-04-26.
                      誘몄엯??留ㅻЪ? ?쒓뎅 ?쒖? ?異쒖썝湲?횞 1.2 濡??먮룞 ?섏궛???쒖떆 */}
                  {(() => {
                    const principal = listing.claim_info.principal
                    const explicit = listing.claim_info.maximum_bond_amount
                    const maxBond = explicit && explicit > 0 ? explicit : Math.round(principal * 1.2)
                    const ratio = principal > 0 ? Math.round((maxBond / principal) * 100) : 120
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div
                          className="rounded-xl p-3 sm:col-span-2"
                          style={{
                            background: "linear-gradient(135deg, rgba(46,117,182,0.08), rgba(5,28,44,0.05))",
                            border: "1px solid rgba(46,117,182,0.30)",
                          }}
                        >
                          <div
                            className="font-semibold mb-1"
                            style={{ fontSize: 11, color: C.lt3, letterSpacing: "0.04em" }}
                          >
                            ?섏씡沅?湲덉븸 <span style={{ color: C.lt4 }}>(怨듬???梨꾧텒理쒓퀬??쨌 1?쒖쐞 洹쇱???</span>
                          </div>
                          <div className="font-black tabular-nums" style={{ fontSize: 20, color: "#2E75B6", lineHeight: 1.1 }}>
                            {formatKRW(maxBond)}
                          </div>
                          <div className="mt-1 tabular-nums" style={{ fontSize: 11, color: C.lt3 }}>
                            ?異쒖썝湲?횞 <b>{ratio}%</b>
                            {!explicit && <span style={{ color: C.lt4 }}> 쨌 ?쒖? 1.2x ?먮룞 ?섏궛 (?깃린遺 誘몄엯??</span>}
                          </div>
                        </div>
                        <ClaimField
                          label="?ㅼ젙 鍮꾩쑉"
                          value={`${ratio}%`}
                          sub="?異쒖썝湲?횞 110~140% ?쒖?"
                          tone="blue"
                        />
                      </div>
                    )
                  })()}

                  <p
                    className="leading-relaxed"
                    style={{ fontSize: 11, color: C.lt3 }}
                  >
                    梨꾧텒?붿븸? ?異?湲덈━? ?곗껜 湲덈━瑜??곸슜???먭툑怨?誘몄닔?댁옄???⑷퀎?대ŉ,
                    ?곗껜 ?쒖옉?쇰??곕뒗 ?곗껜 湲덈━濡??곗젙?⑸땲?? 梨꾧텒 ?뺣낫 ?몃? ?댁뿭? LOI ?쒖텧
                    ??湲덉쑖湲곌? ?硫?誘명똿?먯꽌 寃?좊맆 ???덉뒿?덈떎.
                  </p>
                </div>
              </TierGate>
            </SectionCard>
          </div>

          <div className="space-y-4 min-w-0">
            {/*
              sticky ?곗륫 ?ъ씠?쒕컮 ???섏씠吏 ?먯뿰 ?ㅽ겕濡???酉고룷?몄뿉 怨좎젙.
              쨌 standalone (/exchange/[id]): top-4 (16px) ??理쒖긽??Navigation ?꾨옒
              쨌 embedded (/deals): top-20 (80px) ??/deals ??64px sticky ?ㅻ뜑 ?꾨옒
            */}
            <div className={`${embedded ? "lg:sticky lg:top-20" : "lg:sticky lg:top-4"} space-y-4`}>
              <PrimaryActionCard
                tier={effectiveTier}
                loading={dealCreating}
                onAction={handlePrimaryAction}
                variant="desktop"
              />
              {/* DR-18: 遺꾩꽍 ?꾧뎄 諛붾줈媛湲???留ㅻЪ 而⑦뀓?ㅽ듃瑜??섏씡?굿룹떆裕?텮I濡??댁뼱媛?*/}
              <div
                className="rounded-xl p-3 border"
                style={{
                  backgroundColor: C.bg3,
                  borderColor: C.bg4,
                }}
              >
                <div
                  className="flex items-center gap-1.5 mb-2"
                  style={{ fontSize: 11, color: C.lt3, fontWeight: 800 }}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>??留ㅻЪ濡?遺꾩꽍 ?쒖옉</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <Link
                    href={`/analysis/profitability?listing=${id}&appraisal=${listing.appraisal_value}&senior=${listing.rights_summary.senior_total}&address=${encodeURIComponent(`${listing.region_city} ${listing.region_district}`.trim())}`}
                    className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: "rgba(5, 28, 44,0.10)",
                      border: "1px solid rgba(5, 28, 44,0.24)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--color-positive)" }} />
                      <span style={{ fontSize: 11, color: "var(--color-positive)", fontWeight: 800 }}>
                        NPL ?섏씡??遺꾩꽍 (IRR 쨌 ROI)
                      </span>
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--color-positive)" }} />
                  </Link>
                  <Link
                    href={`/analysis/simulator?listing=${id}&appraisal=${listing.appraisal_value}&senior=${listing.rights_summary.senior_total}`}
                    className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: "rgba(46,117,182,0.10)",
                      border: "1px solid rgba(46,117,182,0.24)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" style={{ color: "var(--color-brand-bright)" }} />
                      <span style={{ fontSize: 11, color: "var(--color-brand-bright)", fontWeight: 800 }}>
                        寃쎈ℓ 遺꾩꽍 ?쒕??덉씠??                      </span>
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--color-brand-bright)" }} />
                  </Link>
                  <Link
                    href={`/analysis/copilot?listing=${id}`}
                    className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: "rgba(5, 28, 44,0.10)",
                      border: "1px solid rgba(5, 28, 44,0.24)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" style={{ color: "var(--color-text-primary)" }} />
                      <span style={{ fontSize: 11, color: "var(--color-text-primary)", fontWeight: 800 }}>
                        AI 而⑥꽕?댄듃
                      </span>
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--color-text-primary)" }} />
                  </Link>
                </div>
              </div>
              <AssetSidebar
                askingPrice={listing.asking_price}
                investmentSummary={{
                  verdict: 'BUY',
                  grade: 'A',
                  score: 89.4,
                  recommendedPurchasePrice: 1_862_000_000,
                  purchaseRate: 0.95,
                  bidRatio: 0.835,
                  expectedBidPrice: 2_338_000_000,
                  secondPledgeeAmount: 849_258_576,
                  totalEquity: 571_368_997,
                  expectedNetProfit: 277_889_579,
                  roi: 0.486,
                  annualizedRoi: 0.662,
                  winProbability: 0.50,
                }}
                recoveryRate={aiAnalysis.recoveryRate?.predicted ?? 72}
                recoveryConfidence={aiAnalysis.recoveryRate?.confidence ?? 85}
                priceGuide={null}
                anomaly={
                  aiAnalysis.anomaly
                    ? { verdict: aiAnalysis.anomaly.verdict, score: aiAnalysis.anomaly.score }
                    : null
                }
                onAskAi={() => toast.info("AI Copilot??怨??대┰?덈떎.", { duration: 1500 })}
                onReanalyze={() => toast.info("AI ?щ텇?앹쓣 ?붿껌?덉뒿?덈떎.", { duration: 1500 })}
                onShowProbability={() => toast.info("?뺣쪧 怨꾩궛?앹쓣 ?쒖떆?⑸땲??", { duration: 1500 })}
                onSeeDemand={() => toast.info("留ㅼ닔???섏슂瑜?議고쉶?⑸땲??", { duration: 1500 })}
                onAiMatch={() => toast.info("AI 留ㅼ묶???ㅽ뻾?⑸땲??", { duration: 1500 })}
              />
            </div>
          </div>
        </div>

        {/* ?? DR-20: Gate 2 (LOI) + Stage 03 ?ㅻ뜑 ??dealFlowMode ?먯꽌留??? */}
        {dealFlowMode && (
          <div className="mt-6 lg:mt-8">
            <DealGate
              icon={DealLockIcon}
              title="LOI ?쒖텧 ??李몄뿬 媛??
              subtitle="梨꾪똿 쨌 媛寃??ㅽ띁 쨌 ?ㅽ봽?쇱씤 誘명똿 쨌 ?ㅼ궗 쨌 ?묒긽"
              panelMode
              ctaLabel={
                !tierGte(effectiveAccessTier, "L3") && loiState.status !== "approved"
                  ? "LOI ?쒖텧?붾㈃ ?닿린"
                  : undefined
              }
              onCtaClick={
                !tierGte(effectiveAccessTier, "L3") && loiState.status !== "approved"
                  ? () => setLoiOpen(true)
                  : undefined
              }
            />
            <StageHeader
              eyebrow="Section 03 쨌 LOI required"
              title="Deal Engagement"
              subtitle="??李몄뿬 ??留ㅻ룄?먯? 梨꾪똿쨌媛寃??묒긽쨌?ㅼ궗 吏꾪뻾"
            />
          </div>
        )}

        {/* ?? LOI ?뺤씤 (L3+) ??dealFlowMode ?먯꽌??誘몄씤利???blur 泥섎━?댁꽌 ?몄텧 ?? */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI ?쒖텧 ???대엺">
          <div id="loi" className="mt-6 lg:mt-8 scroll-mt-24">
            <SectionCard
              title="LOI ?뺤씤"
              icon={<FileCheck size={14} />}
              tierBadge="L3"
              anchorId="loi"
            >
              <div className="space-y-3">
                <p className="leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  ?쒖텧???몄닔?섑뼢??LOI)瑜??뺤씤?섍퀬 ?ㅼ슫濡쒕뱶?????덉뒿?덈떎. LOI??踰뺤쟻 援ъ냽?μ씠 ?녿뒗 ?섑뼢?쒖씠硫? 留ㅻ룄???뱀씤 ???먯뒪?щ줈 ?낃툑 諛??꾩옣 怨꾩빟 ?④퀎濡?吏꾪뻾?⑸땲??
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setLoiPdfOpen(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{
                      fontSize: 12,
                      backgroundColor: loiPdfOpen ? "var(--color-brand-bright-bg, rgba(46,117,182,0.12))" : "var(--layer-2-bg)",
                      color: loiPdfOpen ? "var(--color-brand-bright)" : "var(--fg-muted)",
                      border: `1px solid ${loiPdfOpen ? "rgba(46,117,182,0.4)" : "var(--layer-border-strong)"}`,
                    }}
                  >
                    {loiPdfOpen ? <EyeOff size={13} /> : <Eye size={13} />}
                    {loiPdfOpen ? "LOI ?リ린" : "LOI 蹂닿린"}
                  </button>
                  <a
                    href={`/api/v1/docs/${id}/loi?download=1`}
                    download
                    onClick={e => { e.preventDefault(); toast.success("LOI 臾몄꽌 ?ㅼ슫濡쒕뱶瑜??쒖옉?⑸땲??", { duration: 1800 }) }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{
                      fontSize: 12,
                      backgroundColor: "rgba(5, 28, 44,0.10)",
                      color: "var(--color-positive)",
                      border: "1px solid rgba(5, 28, 44,0.3)",
                    }}
                  >
                    <FileDown size={13} />
                    PDF ?ㅼ슫濡쒕뱶
                  </a>
                </div>
                {loiPdfOpen && (
                  <div
                    className="mt-2 rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--layer-border-strong)" }}
                  >
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ backgroundColor: "var(--layer-2-bg)", fontSize: 11, color: "var(--fg-muted)" }}
                    >
                      <span className="font-bold">?몄닔?섑뼢??(LOI) 誘몃━蹂닿린</span>
                      <button type="button" onClick={() => setLoiPdfOpen(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    <iframe
                      src={`/api/v1/docs/${id}/loi`}
                      title="LOI"
                      className="w-full"
                      style={{ height: 560, border: "none", backgroundColor: "#f8f8f8" }}
                    />
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
          </DealLockedSection>
        )}

        {/* ?? 梨꾪똿 (L3+) ??dealFlowMode ?먯꽌??誘몄씤利???blur 泥섎━?댁꽌 ?몄텧 ?? */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI ?쒖텧 ???대엺">
          <div id="chat" className="mt-6 lg:mt-8 scroll-mt-24">
            <InlineDealRoom
              tier={effectiveTier}
              counterpart={counterpart}
            />
          </div>
          </DealLockedSection>
        )}

        {/* ?? ?ㅼ궗 (L3+) ??dealFlowMode ?먯꽌??誘몄씤利???blur 泥섎━?댁꽌 ?몄텧 ?? */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI ?쒖텧 ???대엺">
          <div id="due-diligence" className="mt-6 lg:mt-8 scroll-mt-24">
            <DueDiligenceSection
              anchorId="due-diligence"
              listingId={id}
            />
          </div>
          </DealLockedSection>
        )}

        {/* ?? 媛寃??ㅽ띁 (L3+) ??dealFlowMode ?먯꽌??誘몄씤利???blur 泥섎━?댁꽌 ?몄텧 ?? */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI ?쒖텧 ???대엺">
          <div id="offer" className="mt-6 lg:mt-8 scroll-mt-24">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--layer-1-bg)",
                border: "1px solid var(--layer-border-strong)",
                boxShadow: "0 4px 20px rgba(27,58,92,0.10)",
              }}
            >
              {/* ?? ?ㅻ뜑: 釉뚮옖??洹몃씪?곗씠???? */}
              <header
                className="flex items-center justify-between gap-3 flex-wrap px-5 py-4"
                style={{
                  background: "linear-gradient(135deg, #1B3A5C 0%, #2E75B6 100%)",
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div className="inline-flex items-center gap-2">
                  <div
                    className="rounded-lg p-1.5 flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  >
                    <HandCoins size={16} color="#051C2C" />
                  </div>
                  <div>
                    <h3 className="font-black leading-none" style={{ fontSize: 15, color: "#FFFFFF" }}>
                      媛寃??ㅽ띁
                    </h3>
                    <p className="mt-0.5 font-medium" style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
                      留ㅻ룄?먯뿉寃?留ㅼ엯 ?щ쭩媛瑜??쒖븞?섏꽭??                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full font-bold px-2.5 py-1"
                  style={{ fontSize: 10, backgroundColor: "rgba(5, 28, 44,0.22)", color: "#FCD34D", border: "1px solid rgba(5, 28, 44,0.40)" }}
                >
                  L3 ?묒긽 ?④퀎
                </span>
              </header>

              {/* ?? 諛붾뵒 ?? */}
              <div className="p-5 space-y-4">
                {/* 媛寃??붿빟 KPI 2移?*/}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3.5"
                    style={{
                      backgroundColor: "rgba(5, 28, 44,0.07)",
                      border: "1px solid rgba(5, 28, 44,0.28)",
                    }}
                  >
                    <div className="font-bold mb-1" style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}>
                      留ㅻ룄 ?щ쭩媛
                    </div>
                    <div className="font-black tabular-nums" style={{ fontSize: 20, color: C.amber, lineHeight: 1.1 }}>
                      {formatKRW(listing.asking_price)}
                    </div>
                    <div className="mt-1 font-semibold tabular-nums" style={{ fontSize: 10, color: C.lt4 }}>
                      ?좎씤????discountPct}%
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3.5"
                    style={{
                      backgroundColor: "rgba(5, 28, 44,0.07)",
                      border: "1px solid rgba(5, 28, 44,0.28)",
                    }}
                  >
                    <div className="font-bold mb-1" style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}>
                      AI 沅뚭퀬 留ㅼ엯媛
                    </div>
                    <div className="font-black tabular-nums" style={{ fontSize: 20, color: C.em, lineHeight: 1.1 }}>
                      {formatKRW(Math.round(listing.asking_price * 0.96))}
                    </div>
                    <div className="mt-1 font-semibold" style={{ fontSize: 10, color: C.lt4 }}>
                      AI ?묒긽 ?ъ? 異붿젙
                    </div>
                  </div>
                </div>

                {/* 援щ텇??*/}
                <div style={{ borderTop: "1px solid var(--layer-border-strong)" }} />

                {/* ?ㅽ띁 ??/ 移대뱶 */}
                {submittedOffer ? (
                  <div>
                    <OfferCard offer={submittedOffer} isMine />
                    <button
                      type="button"
                      onClick={() => { setSubmittedOffer(null); setOfferFormVisible(true) }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                      style={{
                        fontSize: 12,
                        backgroundColor: "var(--layer-2-bg)",
                        color: C.lt3,
                        border: "1px solid var(--layer-border-strong)",
                      }}
                    >
                      ???ㅽ띁 ?묒꽦
                    </button>
                  </div>
                ) : offerFormVisible ? (
                  <OfferForm
                    onSubmit={o => {
                      const offer: OfferData = { ...o, status: "pending" }
                      setSubmittedOffer(offer)
                      setOfferFormVisible(false)
                      toast.success("媛寃??ㅽ띁媛 ?쒖텧?섏뿀?듬땲??쨌 留ㅻ룄??寃???湲?以?, { duration: 2500 })
                    }}
                    onCancel={() => setOfferFormVisible(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOfferFormVisible(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-black transition-colors"
                    style={{
                      padding: "13px 16px",
                      fontSize: 13,
                      background: "linear-gradient(135deg, #1B3A5C, #2E75B6)",
                      color: "#FFFFFF",
                      border: "none",
                    }}
                  >
                    <HandCoins size={15} />
                    ?ㅽ띁 ?묒꽦 ?닿린
                  </button>
                )}
              </div>
            </div>
          </div>
          </DealLockedSection>
        )}

        {/* ?? DR-20: Gate 3 (ESCROW) + Stage 04 ?ㅻ뜑 ??dealFlowMode ?먯꽌留??? */}
        {dealFlowMode && (
          <div className="mt-6 lg:mt-8">
            <DealGate
              icon={DealLockIcon}
              title="ESCROW 寃곗젣 ???ㅽ뻾"
              subtitle="?덉쟾寃곗젣 쨌 ?꾩옄怨꾩빟 쨌 ?붽툑泥섎━"
              panelMode
            />
            <StageHeader
              eyebrow="Section 04 쨌 Closing"
              title="Deal Execution"
              subtitle="嫄곕옒 ?ㅽ뻾 ??30遺????대줈吏?
            />
          </div>
        )}

        {/* ?? ?먯뒪?щ줈 寃곗젣 쨌 怨꾩빟 (L4+) ??dealFlowMode ?먯꽌??誘몄씤利???blur 泥섎━?댁꽌 ?몄텧 ?? */}
        {(effectiveTier === "L4" || effectiveTier === "L5" || dealFlowMode) && (
          <DealLockedSection
            locked={!(effectiveTier === "L4" || effectiveTier === "L5") && dealFlowMode}
            badgeLabel="ESCROW ?낃툑 ???ㅽ뻾"
          >
          <div id="escrow" className="mt-6 lg:mt-8 scroll-mt-24">
            <DealCompletionStages
              tier={effectiveTier}
              askingPrice={listing.asking_price}
              assetTitle={title}
              escrowConfirmed={listing.escrow_confirmed}
              contractConfirmed={listing.contract_confirmed}
              onOpenDetails={handlePrimaryAction}
              onSubmitOffer={() => {
                setMockTier("L5")
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(MOCK_STORAGE_KEY(id), "L5")
                }
              }}
              onSignConfirm={() => {
                setMockTier("L5")
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(MOCK_STORAGE_KEY(id), "L5")
                }
                toast.success(TIER_TRANSITION_MSG.L5, { duration: 3200 })
              }}
            />
          </div>
          </DealLockedSection>
        )}

      </section>

      {/* 紐⑤컮??sticky CTA 쨌 而댄뵆?쇱씠?몄뒪 footer ??embedded(/deals) ?먯꽌??以묐났 諛⑹?濡??④? */}
      {!embedded && (
        <>
          <PrimaryActionCard
            tier={effectiveTier}
            loading={dealCreating}
            onAction={handlePrimaryAction}
            variant="mobile-sticky"
          />
          <div className="md:hidden" style={{ height: 96 }} aria-hidden />
        </>
      )}

      <ActionSheet
        open={actionOpen}
        tier={effectiveTier}
        assetTitle={title}
        askingPrice={listing.asking_price}
        onClose={() => setActionOpen(false)}
        onConfirm={handleConfirmStep}
      />

      {/* DR-24: 寃뚯씠??紐⑤떖 ??L0 ?ъ옄???몄쬆 / L1 NDA / L2 LOI */}
      <InvestorVerifyModal
        open={investorOpen}
        onClose={() => setInvestorOpen(false)}
        state={investorState}
        onSubmit={() => {
          setInvestorState((s) => ({
            ...s,
            status: "pending",
            updatedAt: new Date().toISOString().slice(0, 10),
            reviewNote: "異붽? ?먮즺 ?쒖텧 ?꾨즺 ??愿由ъ옄 ?ш???以?,
          }))
          toast.success("?ъ옄???몄쬆 ?먮즺瑜??쒖텧?덉뒿?덈떎. 愿由ъ옄 寃?????뚮┝?쇰줈 ?덈궡?⑸땲??", { duration: 3000 })
        }}
      />

      <NdaModal
        open={ndaOpen}
        onClose={() => setNdaOpen(false)}
        listingTitle={title}
        listingId={id}
        state={ndaState}
        onSubmit={() => {
          const today = new Date().toISOString().slice(0, 10)
          setNdaState((s) => ({
            ...s,
            status: "submitted",
            submittedAt: today,
            reviewNote: "留ㅺ컖??寃???湲?以?(?곸뾽??湲곗? 1???대궡)",
          }))
          toast.success("NDA ?꾩옄?쒕챸??留ㅺ컖?ъ뿉 ?꾩넚?덉뒿?덈떎. ?뱀씤 ??L2 ?먮즺媛 利됱떆 ?대┰?덈떎.", { duration: 3500 })
          setNdaOpen(false)
        }}
      />

      <LoiModal
        open={loiOpen}
        onClose={() => setLoiOpen(false)}
        listingTitle={title}
        listingId={id}
        askingPrice={listing.asking_price}
        state={loiState}
        onSubmit={(price) => {
          const today = new Date().toISOString().slice(0, 10)
          setLoiState((s) => ({
            ...s,
            status: "submitted",
            submittedAt: today,
            proposedPrice: price,
            reviewNote: "留ㅺ컖??寃???湲?以?,
          }))
          toast.success("LOI 瑜?留ㅺ컖?ъ뿉 ?쒖텧?덉뒿?덈떎. ?뱀씤 ???묒긽쨌?곗씠?곕８???쒖꽦?붾맗?덈떎.", { duration: 3500 })
          setLoiOpen(false)
        }}
      />

      {!embedded && (
        <footer
          className="border-t"
          style={{
            backgroundColor: C.bg1,
            borderColor: C.bg4,
            padding: "20px 24px",
          }}
        >
          <div
            className="max-w-[1280px] mx-auto flex items-center gap-2 flex-wrap"
            style={{ fontSize: 11, color: C.lt4 }}
          >
            <ShieldCheck size={14} color={C.em} />
            <span>
              蹂?留ㅻЪ? ?먮룞 留덉뒪???뚯씠?꾨씪???곸슜 쨌 ?곗뼱蹂?怨듦컻 踰붿쐞??" "}
              <a href="/terms/disclaimer" className="underline" style={{ color: C.lt3 }}>
                硫댁콉怨좎?
              </a>
              {" "}以??
            </span>
          </div>
        </footer>
      )}
    </main>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   SECTION CARD WRAPPER
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function SectionCard({
  title,
  icon,
  tierBadge,
  accent = "neutral",
  children,
  anchorId,
}: {
  title: string
  icon?: React.ReactNode
  tierBadge?: "L0" | "L1" | "L2" | "L3"
  accent?: "neutral" | "warn"
  children: React.ReactNode
  anchorId?: string
}) {
  const BADGE_STYLE: Record<string, { bg: string; fg: string; border: string }> = {
    L0: {
      bg: "var(--color-positive-bg)",
      fg: "var(--color-positive)",
      border: "rgba(5, 28, 44, 0.33)",
    },
    L1: {
      bg: "rgba(46, 117, 182, 0.12)",
      fg: "var(--color-brand-bright)",
      border: "rgba(46, 117, 182, 0.33)",
    },
    L2: {
      bg: "rgba(5, 28, 44, 0.10)",
      fg: "#051C2C",
      border: "rgba(5, 28, 44, 0.33)",
    },
    L3: {
      bg: "rgba(5, 28, 44, 0.12)",
      fg: "#051C2C",
      border: "rgba(5, 28, 44, 0.33)",
    },
  }
  const badge = tierBadge ? BADGE_STYLE[tierBadge] : null
  return (
    <div
      id={anchorId}
      className="rounded-2xl p-5 scroll-mt-24"
      style={{
        backgroundColor: "var(--layer-1-bg)",
        border: `1px solid ${
          accent === "warn" ? "rgba(5, 28, 44, 0.33)" : "var(--layer-border-strong)"
        }`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-black inline-flex items-center gap-1.5"
          style={{ fontSize: 14, color: "var(--fg-strong)" }}
        >
          {icon && <span style={{ color: "var(--color-brand-bright)" }}>{icon}</span>}
          {title}
        </h2>
        {badge && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            style={{
              backgroundColor: badge.bg,
              color: badge.fg,
              border: `1px solid ${badge.border}`,
            }}
          >
            ??{tierBadge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   MINI COMPONENTS
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

function Stat({ label, value, tone }: { label: string; value: string; tone?: "em" | "amber" | "blue" }) {
  const color =
    tone === "em" ? C.em :
    tone === "amber" ? C.amber :
    tone === "blue" ? "var(--color-brand-bright)" :
    C.lt1
  return (
    <div>
      <div className="font-semibold" style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div className="font-black tabular-nums" style={{ fontSize: 16, color }}>
        {value}
      </div>
    </div>
  )
}

function ClaimField({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string
  value: string
  sub?: string
  tone?: "blue" | "amber" | "neutral"
}) {
  const valueColor =
    tone === "blue" ? "var(--color-brand-bright)" :
    tone === "amber" ? C.amber :
    C.lt1
  const borderColor =
    tone === "blue" ? "rgba(46, 117, 182, 0.28)" :
    tone === "amber" ? "rgba(5, 28, 44, 0.33)" :
    "var(--layer-border-strong)"
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        backgroundColor: "var(--layer-2-bg)",
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className="font-bold"
        style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}
      >
        {label}
      </div>
      <div
        className="mt-1.5 font-black tabular-nums"
        style={{ fontSize: 20, color: valueColor, lineHeight: 1.1 }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mt-1 font-semibold tabular-nums"
          style={{ fontSize: 10, color: C.lt3 }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

/** ?깃린遺?깅낯 ?ㅼ슫濡쒕뱶 踰꾪듉 ???낅줈???щ????곕씪 ?쒖꽦/鍮꾪솢??*/
function DeedDownloadBtn({
  label,
  url,
  uploaded,
  onDownload,
}: {
  label: string
  url: string
  uploaded: boolean
  onDownload: () => void
}) {
  if (!uploaded) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold"
        style={{ fontSize: 12, backgroundColor: "var(--layer-2-bg)", color: "var(--fg-subtle)", border: "1px solid var(--layer-border-strong)", opacity: 0.55, cursor: "not-allowed" }}
        title="梨꾧텒?먭? ?꾩쭅 ?낅줈?쒗븯吏 ?딆븯?듬땲??
      >
        <FileDown size={13} />
        {label}
      </span>
    )
  }
  return (
    <a
      href={url}
      download
      onClick={e => { e.preventDefault(); onDownload() }}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors hover:opacity-80"
      style={{ fontSize: 12, backgroundColor: "rgba(46,117,182,0.10)", color: "var(--color-brand-bright)", border: "1px solid rgba(46,117,182,0.3)" }}
    >
      <FileDown size={13} />
      {label}
    </a>
  )
}

/** 寃쎈ℓ쨌怨듬ℓ ?뺣낫 ?쒖떆???띿뒪???꾨뱶 */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "var(--layer-2-bg)",
        border: "1px solid var(--layer-border-strong)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--fg-subtle)", fontWeight: 700, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-strong)", fontWeight: 700 }}>
        {value || "??}
      </div>
    </div>
  )
}

/** ?ㅼ궗 ?좎껌쨌?뺤씤쨌?섍껄 ?뱀뀡 (L2 ?댁긽) */
function DueDiligenceSection({
  anchorId,
  listingId,
}: {
  anchorId: string
  listingId: string
}) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!date || !time) {
      toast.error("?ㅼ궗 ?붿껌?쇨낵 ?쒓컙???낅젰?댁＜?몄슂.")
      return
    }
    setSubmitted(true)
    toast.success(`?ㅼ궗 ?좎껌???묒닔?섏뿀?듬땲??[${listingId.slice(0, 8)}]. 留ㅻ룄???뺤씤 ???덈궡 ?쒕┰?덈떎.`, { duration: 3000 })
  }

  return (
    <SectionCard
      title="?ㅼ궗 ?좎껌"
      icon={<FileText size={14} />}
      tierBadge="L3"
      anchorId={anchorId}
    >
      {submitted ? (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: "var(--color-positive-bg)",
            border: "1px solid rgba(5, 28, 44,0.33)",
          }}
        >
          <CheckCircle2 size={20} color="var(--color-positive)" className="flex-shrink-0" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-positive)" }}>
              ?ㅼ궗 ?좎껌 ?꾨즺
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
              {date} {time} 쨌 留ㅻ룄??痢??뺤씤 ?湲?以?            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
              >
                ?ㅼ궗 ?붿껌??<span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
                  backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)",
                  color: "var(--fg-strong)", outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
              >
                諛⑸Ц ?쒓컙 <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
                  backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)",
                  color: "var(--fg-strong)", outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
            >
              ?뺤씤 諛??섍껄
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="?ㅼ궗 紐⑹쟻, ?숉뻾 ?몄썝, ?뺤씤 ?ы빆 ?깆쓣 湲곗옱??二쇱꽭??"
              rows={4}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 12,
                backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)",
                color: "var(--fg-strong)", outline: "none", resize: "vertical",
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmed(v => !v)}
              className="flex items-center gap-2 text-left"
              style={{ fontSize: 12, color: C.lt2, cursor: "pointer", background: "none", border: "none", padding: 0 }}
            >
              <div
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  backgroundColor: confirmed ? "var(--color-positive)" : "transparent",
                  border: `1.5px solid ${confirmed ? "var(--color-positive)" : "var(--layer-border-strong)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {confirmed && <CheckCircle2 size={11} color="#fff" />}
              </div>
              ?ㅼ궗 ??鍮꾨??좎? ?섎Т瑜?以?섑븯寃좎뒿?덈떎.
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!confirmed}
            style={{
              padding: "11px 20px", borderRadius: 10,
              backgroundColor: confirmed ? "var(--color-brand-bright)" : "var(--layer-border-strong)",
              color: confirmed ? "var(--fg-on-brand)" : "var(--fg-subtle)",
              fontSize: 13, fontWeight: 800, border: "none", cursor: confirmed ? "pointer" : "not-allowed",
              width: "100%",
            }}
          >
            ?ㅼ궗 ?좎껌?섍린
          </button>
        </div>
      )}
    </SectionCard>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   StageHeader ??DR-20 쨌 ?④퀎 援щ텇 ?몃씪???ㅻ뜑
   湲곗〈 SectionCard ?ъ씠???쎌엯?섍린 ?꾪븳 媛踰쇱슫 wrapper
   (DealSection ???ㅻ뜑 遺遺꾨쭔 異붿텧 ???먯떇 wrapping X)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function StageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <header className="mt-2 mb-1">
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            width: 18,
            height: 1.5,
            background: "#2251FF",
            display: "inline-block",
          }}
        />
        <span
          style={{
            color: "#1A47CC",
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
          color: "#0A1628",
          fontSize: "clamp(1.25rem, 2.2vw, 1.625rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          marginBottom: 4,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: "#4A5568",
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.55,
          maxWidth: 640,
        }}
      >
        {subtitle}
      </p>
    </header>
  )
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   DealLockedSection ??DR-21 쨌 L3+ ?뱀뀡 softBlur ?섑띁
   dealFlowMode + tier 誘몃떖 ???먯떇???먮━寃?蹂댁뿬二쇨퀬 ?곗긽???좉툑 諭껋? ?쒖떆
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
function DealLockedSection({
  locked,
  badgeLabel = "LOI ?쒖텧 ???대엺",
  children,
}: {
  locked: boolean
  badgeLabel?: string
  children: React.ReactNode
}) {
  if (!locked) return <>{children}</>
  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden
        style={{
          filter: "blur(7px)",
          opacity: 0.55,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 0,
          boxShadow: "0 4px 12px rgba(10, 22, 40, 0.08)",
          zIndex: 5,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="10" width="16" height="11" rx="2" stroke="#1A47CC" strokeWidth="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#1A47CC" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="15.5" r="1.4" fill="#1A47CC" />
        </svg>
        <span style={{ color: "#0A1628", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>
          {badgeLabel}
        </span>
      </div>
    </div>
  )
}
