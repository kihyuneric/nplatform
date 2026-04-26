"use client"

/**
 * AssetDetailView — /exchange/[id] 자산 상세 본문 (DR-15 · 2026-04-21)
 *
 * 이 컴포넌트는 /exchange/[id] 페이지는 물론 /deals 딜룸에서 선택된 딜의
 * 상세 화면을 iframe 없이 직접 렌더링할 때에도 재사용됩니다.
 * - idProp 가 주어지면 그것을 우선 사용하고, 없으면 useParams() 의 [id] 로 fallback
 * - Next.js page.tsx 는 whitelist 된 named export 만 허용하므로 이 파일은 components/ 하위에 위치
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

// DR-4/5: 신규 단순화 컴포넌트
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
  type InlineDealRoomCounterpart,
} from "@/components/asset-detail"
// DR-19: 딜룸 좌측 메인 funnel 컴포넌트 (primitives — 기존 섹션 사이에 stage gate 삽입용)
import {
  DealHeaderStandalone,
  DealSection,
  DealGate,
} from "@/components/asset-detail/deal-flow-view"
import { Lock as DealLockIcon } from "lucide-react"
import { useAssetTier } from "@/hooks/use-asset-tier"
import type { AssetTier } from "@/hooks/use-asset-tier"

/* ═════ Mock 진행 시뮬레이션 (API 미연동 시 사용) ═════ */
const MOCK_STORAGE_KEY = (id: string) => `asset-mock-tier:${id}`
const TIER_ORDER: AssetTier[] = ["L0", "L1", "L2", "L3", "L4", "L5"]
const TIER_TRANSITION_MSG: Record<AssetTier, string> = {
  L0: "관심 표시 완료 · 매칭 단계 시작",
  L1: "개인인증 완료 · AI 리포트 · 채팅 언락 (매칭 단계 완료)",
  L2: "NDA 체결 완료 · 등기원본 · 현장사진 · 매각자 기관정보 열람",
  L3: "LOI 제출 완료 · 매도자 승인 대기 → 실사 자료 오픈",
  L4: "계약 초안 승인 · 전자서명 · 에스크로 단계 진입",
  L5: "정산 완료 · 거래가 종결되었습니다 🎉",
}

/* ═════ Design tokens ═════ */
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

/* ═════ Data types ═════ */
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
  /** 등기부등본 전체 행 (L2 공개) — 토지/건물 구분 */
  registry_land_full_items?: Array<{
    order: number
    order_code: string        // 예: "갑30", "을21"
    receipt_date: string
    type: string
    holder: string            // 권리자 (UI에서 maskHolderDisplay 적용)
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
  /** 감정평가서 부속 정보 */
  appraisal_area?: number     // 면적 (m²)
  appraisal_date?: string     // 감정 기준시점 (ISO, 예: "2026-05-23")
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
     * 수익권 금액 (공부상 채권최고액) — 1차 근저당의 채권최고액.
     * 한국 표준은 대출원금 × 110~140% (관행 1.2x). 미입력 시 원금 × 1.2 기본 적용.
     */
    maximum_bond_amount?: number
  }
  /** 경매 정보 (없으면 null) */
  auction_info: {
    case_no: string           // 사건번호
    court: string             // 관할법원
    filed_date: string        // 경매접수일 (ISO)
    estimated_start: string   // 예상 경매 개시일 (ISO)
  } | null
  /** 공매 정보 (없으면 null) */
  public_sale_info: {
    mgmt_no: string           // 관리번호
    filed_date: string        // 공매신청일 (ISO)
    estimated_start: string   // 예상 공매 시작일 (ISO)
  } | null
  /** 관리자 확인 상태 */
  escrow_confirmed: boolean   // 에스크로 결제 납입 확인
  contract_confirmed: boolean // 현장 계약 완료 확인
}

function buildMock(id: string): ListingDetail {
  /**
   * NPL 분석 보고서(lib/npl/unified-report/sample.ts) 와 동기화 (2026-04-26)
   * · 채권잔액 21.8억 = 원금 19.6억 + 연체이자 2.2억
   * · 감정가 28.0억 / AI 시세 25.5억 / 할인율 8.9%
   * · 정상금리 6.9% / 연체금리 8.9% / 연체시작 2025-07-23
   * · AI 등급 A · 매수 적합
   */
  return {
    id,
    institution: "하나저축은행",
    inst_type: "저축은행",
    region_city: "서울",
    region_district: "강남구",
    collateral: "아파트",
    outstanding_principal: 1_960_000_000,
    asking_price: 2_550_000_000,
    appraisal_value: 2_800_000_000,
    discount_rate: 8.9,
    ai_grade: "A",
    data_completeness: 9,
    debtor_type: "INDIVIDUAL",
    auction_stage: "임의매각",
    court_case_masked: "서울중앙지법 2025타경●●●●",
    published_at: "2026-04-05",
    rights_summary: {
      senior_total: 780_000_000,
      junior_total: 140_000_000,
      deposit_total: 60_000_000,
    },
    registry_summary_items: [
      { order: 1, order_code: "을21", type: "근저당권", amount: 3_600_000_000, holder_masked: "중소기업은행(부천테크노지점)", receipt_date: "2021.06.18", deed_type: "land" },
      { order: 2, order_code: "을23", type: "근저당권", amount: 960_000_000,   holder_masked: "(주)피비스타(송파동,현대레이크빌)", receipt_date: "2024.10.25", deed_type: "land" },
      { order: 3, order_code: "갑31", type: "가압류",   amount: 654_000_000,   holder_masked: "(주)린정(고잔동,한남법조빌딩)", receipt_date: "2024.10.15", deed_type: "building" },
    ],
    registry_land_full_items: [
      { order: 1, order_code: "갑30", receipt_date: "2021.06.18", type: "소유권이전(매매)",   holder: "유한회사제이원퍼스트(소유자)",         amount: null },
      { order: 2, order_code: "을21", receipt_date: "2021.06.18", type: "근저당권설정",       holder: "중소기업은행(부천테크노지점)",          amount: 3_600_000_000 },
      { order: 3, order_code: "갑31", receipt_date: "2024.10.15", type: "가압류",             holder: "(주)린정(고잔동,한남법조빌딩)",        amount: 654_000_000 },
      { order: 4, order_code: "갑32", receipt_date: "2024.10.23", type: "압류",               holder: "영등포구(서울특별시)",                 amount: null },
      { order: 5, order_code: "을23", receipt_date: "2024.10.25", type: "근저당권설정",       holder: "(주)피비스타(송파동,현대레이크빌)",    amount: 960_000_000 },
      { order: 6, order_code: "갑33", receipt_date: "2025.01.08", type: "압류",               holder: "국 금천세무서장",                      amount: null },
      { order: 7, order_code: "갑34", receipt_date: "2025.05.09", type: "임의경매개시결정",   holder: "중소기업은행(여신관리부)",             amount: 3_086_117_337, amount_label: "청구금액" },
    ],
    registry_building_full_items: [
      { order: 1, order_code: "갑1",  receipt_date: "2021.06.18", type: "소유권이전(매매)",   holder: "유한회사제이원퍼스트(소유자)",         amount: null },
      { order: 2, order_code: "을1",  receipt_date: "2021.06.18", type: "근저당권설정",       holder: "중소기업은행(부천테크노지점)",          amount: 3_600_000_000 },
      { order: 3, order_code: "갑2",  receipt_date: "2024.10.15", type: "가압류",             holder: "(주)린정(고잔동,한남법조빌딩)",        amount: 654_000_000 },
      { order: 4, order_code: "갑3",  receipt_date: "2025.05.09", type: "임의경매개시결정",   holder: "중소기업은행(여신관리부)",             amount: 3_086_117_337, amount_label: "청구금액" },
    ],
    appraisal_area: 3333,
    appraisal_date: "2026-05-23",
    lease_summary: { total_deposit: 60_000_000, monthly_rent: 0, tenant_count: 1 },
    site_photos: ["photo1", "photo2", "photo3"],
    debtor_name_masked: "김●●",
    court_case_full: "서울중앙지법 2025타경12345",
    claim_info: {
      balance: 2_180_000_000,         // 채권잔액 21.80억 (NPL 보고서 동기화)
      principal: 1_960_000_000,       // 대출원금 19.60억
      accrued_interest: 220_000_000,  // 연체이자 2.20억
      contract_rate: 6.9,             // 정상금리
      delinquent_rate: 8.9,           // 연체금리
      delinquent_since: "2025-07-23",
    },
    auction_info: {
      case_no: "서울중앙지법 2025타경12345",
      court: "서울중앙지방법원",
      filed_date: "2025-08-15",
      estimated_start: "2026-05-20",
    },
    public_sale_info: null,
    escrow_confirmed: false,
    contract_confirmed: false,
  }
}

function formatKRW(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

function formatDateKo(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return iso.slice(0, 10) } catch { return "—" }
}

/** 권리자 표시용 마스킹: 괄호 부분 제거 + 앞 5글자 ● 처리 */
function maskHolderDisplay(raw: string): string {
  const stripped = raw.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim()
  if (!stripped) return '●●●●●'
  const chars = [...stripped]
  return chars.map((c, i) => i < 5 ? '●' : c).join('')
}

/** 구분 코드 포맷: order + optional code → "1(갑30)" */
function fmtOrderCode(order: number, code?: string): string {
  return code ? `${order}(${code})` : String(order)
}

/** m² ↔ 평 변환 */
const M2_PER_PYEONG = 3.3058
function fmtArea(m2: number, unit: "m2" | "평"): string {
  if (unit === "m2") return `${m2.toLocaleString("ko-KR")}m²`
  return `${(m2 / M2_PER_PYEONG).toFixed(1)}평`
}
function fmtPricePerArea(price: number, m2: number, unit: "m2" | "평"): string {
  if (!m2) return "—"
  if (unit === "m2") {
    const v = Math.round(price / m2)
    return v >= 10_000 ? `${(v / 10_000).toFixed(0)}만원/m²` : `${v.toLocaleString()}원/m²`
  }
  const pyeong = m2 / M2_PER_PYEONG
  const v = Math.round(price / pyeong)
  return v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}억/평` :
    v >= 10_000 ? `${(v / 10_000).toFixed(0)}만원/평` : `${v.toLocaleString()}원/평`
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
    institution: (row.creditor_institution as string) ?? "매각기관",
    inst_type: "금융기관",
    region_city: (row.sido as string) ?? "지역 미상",
    region_district: (row.sigungu as string) ?? "",
    collateral: (row.collateral_type as string) ?? "기타",
    outstanding_principal: claimAmt,
    asking_price: askingPrice,
    appraisal_value: appraisedVal,
    discount_rate: discountRaw,
    ai_grade: (row.ai_grade as "S" | "A" | "B" | "C") ?? "C",
    data_completeness: computeDataCompleteness(row),
    debtor_type: (row.debtor_type as "INDIVIDUAL" | "CORPORATE") ?? "INDIVIDUAL",
    auction_stage: (row.listing_type as string) ?? "임의매각",
    court_case_masked: "●●지법 ●●타경●●●●",
    published_at: formatDateKo(row.created_at as string),
    rights_summary: { senior_total: seniorClaim, junior_total: 0, deposit_total: 0 },
    registry_summary_items: [],
    lease_summary: { total_deposit: 0, monthly_rent: 0, tenant_count: 0 },
    site_photos: imageUrls,
    debtor_name_masked: "●●●",
    court_case_full: "●●지법 ●●타경●●●●",
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
          court: (row.auction_court as string) ?? "—",
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
 * /deals 딜룸 카드/리스트에서 선택된 딜 정보를 AssetDetailView 에 전달할 때
 * 하드코딩된 mock 데이터를 덮어씌우기 위한 얕은 overlay 타입.
 */
export interface AssetDetailDealOverride {
  /** 매물명 (예: "강남구 아파트 NPL 채권") — 표시용 */
  listing_name?: string
  /** 상대방/매각기관 (예: "하나저축은행") → listing.institution */
  counterparty?: string
  /** 채권 금액 (원) → outstanding_principal · claim_info · 희망가·감정가 재산정 */
  amount?: number
  /** 담보 종류 (예: "아파트") → listing.collateral */
  asset_type?: string
  /** 지역 (예: "서울 강남구") → region_city + region_district 로 분리 */
  location?: string
}

/**
 * Deal override 를 base ListingDetail 에 얕게 합성.
 * 금액이 주어지면 권리·희망가·감정가·채권정보도 비례 산정.
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
    next.appraisal_value = Math.round(amount * 1.18) // 감정가 ≈ 원금 대비 18% 상회 가정
    next.claim_info = {
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
  /** URL param 대신 직접 id 주입 — 없으면 useParams() fallback */
  idProp?: string
  /** 외부 페이지(/deals 등) 에서 선택된 딜의 동적 데이터로 mock overlay */
  dealOverride?: AssetDetailDealOverride
  /**
   * 외부 컨테이너에 임베드 된 상태. true 면:
   *  · min-h-screen 제거 (부모 컨테이너가 높이 제어)
   *  · 컴플라이언스 footer 숨김
   *  · 모바일 sticky CTA 숨김 (중복 방지)
   */
  embedded?: boolean
  /**
   * 딜룸 (/deals) 전용 — 좌측 메인 컨텐츠를 Deal Flow funnel 로 교체.
   * 우측 sticky 사이드바(PrimaryActionCard, 분석도구, AssetSidebar) 는 유지.
   * 상단 hero(자산 사진/제목) 와 하단 footer 는 숨김.
   */
  dealFlowMode?: boolean
}

/* ═══════════════════════════════════════════════════════════
   AssetDetailView — 본문 (재사용 가능한 뷰 컴포넌트)
═══════════════════════════════════════════════════════════ */
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

  /* ── 관리자/채권자 편집 기능 ── */
  const [canEdit, setCanEdit] = useState(false)
  const [editingSec, setEditingSec] = useState<"auction" | "public-sale" | null>(null)
  const [auctionDraft, setAuctionDraft] = useState<ListingDetail["auction_info"]>(null)
  const [publicSaleDraft, setPublicSaleDraft] = useState<ListingDetail["public_sale_info"]>(null)
  const [areaUnit, setAreaUnit] = useState<"m2" | "평">("m2")
  const [appraisalPdfOpen, setAppraisalPdfOpen] = useState(false)
  const [loiPdfOpen, setLoiPdfOpen] = useState(false)
  const [ndaPdfOpen, setNdaPdfOpen] = useState(false)
  const [submittedOffer, setSubmittedOffer] = useState<OfferData | null>(null)
  const [offerFormVisible, setOfferFormVisible] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState<number | null>(null)

  /* 등기부등본 탭 & 접기/펼치기 */
  const [deedSummaryTab, setDeedSummaryTab] = useState<"land" | "building">("land")
  const [deedFullTab, setDeedFullTab] = useState<"land" | "building">("land")
  /* 등기부등본 펼치기/접기 기본값
   * 요약(deedSummary): false (목차만 보임 → 펼치기로 전체 노출)
   * 원본(deedFull): true (펼친 상태로 시작 → 접으면 목차만)
   * 사용자 요청: "기본적으로 등기부 현황 펼치기로 버튼 / 등기부 현황 접기 (지금과 반대)"
   */
  const [deedSummaryExpanded, setDeedSummaryExpanded] = useState(false)
  const [deedFullExpanded, setDeedFullExpanded] = useState(false)

  /* 사용자 역할 확인: admin 또는 seller 면 편집 허용 */
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const role = data.user?.user_metadata?.role as string | undefined
      // dev user 00000000... 는 SELLER 역할 → 편집 허용
      const devUserId = "00000000-0000-0000-0000-000000000001"
      setCanEdit(
        role === "admin" || role === "seller" || role === "SELLER" ||
        data.user?.id === devUserId,
      )
    }).catch(() => setCanEdit(false))
  }, [])

  /* 편집 저장 — baseListing 업데이트 + PATCH API */
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
      toast.success("정보가 저장되었습니다.")
    } catch {
      toast.error("저장 중 오류가 발생했습니다.")
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

  // id 변경 시 base mock 재생성 (딜룸에서 카드 전환 시 필수)
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
          body: JSON.stringify({ listingId: id, folderName: "기본", priceAtSave: listing.asking_price }),
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

  const handlePrimaryAction = useCallback(() => {
    setActionOpen(true)
  }, [])

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
      toast("진행 상태를 초기화했습니다. (L0)")
    }
  }, [id])

  const discountPct = listing.discount_rate.toFixed(1)

  const oneLiner = [
    `채권 ${formatKRW(listing.outstanding_principal)}`,
    `희망 ${formatKRW(listing.asking_price)}`,
    `할인율 ${discountPct}%`,
  ].join(" · ")

  const title = `${listing.region_city} ${listing.region_district} ${listing.collateral} NPL`

  const counterpart: InlineDealRoomCounterpart = {
    name: tierGte(effectiveAccessTier, "L2") ? "이매도 담당자" : "매도자 (데모)",
    role: "매도자",
    initial: "매",
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
        // embedded 모드: 부모 컨테이너가 높이 제어 (min-h-screen 제거)
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
          <span style={{ color: C.lt4 }}>·</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <MapPin size={13} />
            {listing.region_city} {listing.region_district}
          </span>
          <span style={{ color: C.lt4 }}>·</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Gavel size={13} />
            {listing.auction_stage}
          </span>
          <span style={{ color: C.lt4 }}>·</span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums" style={{ color: C.lt4 }}>
            <FileText size={12} />
            {id}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        {/* 매도자/관리자: 매물 정보 전체 수정 진입점 */}
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
            매물 정보 수정
          </a>
        )}
        <div
          className="inline-flex items-center gap-1 rounded-lg p-1"
          style={{
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
          }}
          role="radiogroup"
          aria-label="공개 범위 미리보기"
        >
          <span
            className="px-2 font-bold"
            style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}
          >
            공개 범위
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
                거래가 종결되었습니다
              </div>
              <p className="mt-1.5 leading-relaxed" style={{ fontSize: 12, color: "var(--fg-default)" }}>
                에스크로 정산이 완료되었습니다 · 영수증과 세금계산서는 아래 정산 내역에서 확인하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return
                window.localStorage.removeItem(MOCK_STORAGE_KEY(id))
                setMockTier("L0")
                toast("진행 상태를 초기화했습니다.")
              }}
              className="px-3 py-1.5 rounded-lg font-bold"
              style={{
                fontSize: 11,
                backgroundColor: "transparent",
                color: "var(--color-positive)",
                border: "1px solid var(--color-positive)",
              }}
            >
              처음부터 다시 시연
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
              DR-20 · 2026-04-25
              딜룸 (/deals) 진입 시 좌측 메인을 Deal Flow funnel 로 재구성.
              · 기존 섹션은 그대로 사용 (중복 X)
              · DealHeaderStandalone 으로 4-step funnel 진행상황 헤더만 상단에 추가
              · DealSection 헤더 + DealGate 가로 라인을 단계 사이에 삽입
              · 우측 sticky 사이드바는 그대로 유지
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
                  eyebrow="Section 01 · Free preview"
                  title="Deal Screening"
                  subtitle="이 딜이 검토할 가치가 있는지 3분 안에 판단"
                />
              </>
            )}
            <KpiRow
              items={[
                {
                  label: "채권잔액",
                  value: formatKRW(listing.claim_info.balance),
                  tone: "primary",
                  hint: `원금 ${formatKRW(listing.claim_info.principal)} + 연체이자 ${formatKRW(listing.claim_info.accrued_interest)}`,
                },
                {
                  label: "매각 희망가",
                  value: formatKRW(listing.asking_price),
                  tone: "accent",
                  hint: `할인율 ↓${discountPct}%`,
                },
                {
                  label: "감정가",
                  value: formatKRW(listing.appraisal_value),
                  tone: "neutral",
                  hint: `감정평가 기준`,
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
                본 매물은 <strong style={{ color: C.lt1 }}>자동 마스킹 파이프라인</strong>을 통과한
                결과입니다. 개인정보·채무자 식별정보·상세 지번·동/호수는 금융감독원·금융위원회 지침에 따라
                자동으로 가려지며, 티어별 공개 범위는 규제 요건에 맞춰 분리되어 있습니다.
              </p>
            </div>

            {/* AI 분석 리포트 — L0 공개 */}
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
                onRefresh={() => toast.info("AI 재분석을 요청했습니다.", { duration: 1500 })}
                onOpenFull={() => {
                  if (typeof window !== "undefined") {
                    window.open(`/analysis/${id}`, "_blank", "noopener")
                  }
                }}
                onAskCopilot={() => toast.info("AI Copilot이 곧 열립니다.", { duration: 1500 })}
              />
            </div>

            <SectionCard
              title="권리관계 요약"
              icon={<Scale size={14} />}
              tierBadge="L0"
              anchorId="rights"
            >
              <div className="grid grid-cols-3 gap-3">
                <Stat label="선순위 총액" value={formatKRW(listing.rights_summary.senior_total)} tone="amber" />
                <Stat label="후순위 총액" value={formatKRW(listing.rights_summary.junior_total)} tone="blue" />
                <Stat label="보증금 총액" value={formatKRW(listing.rights_summary.deposit_total)} tone="em" />
              </div>
              <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.lt3 }}>
                요약 정보는 L0 단계에서 누구나 열람할 수 있습니다. 권리자 상세 정보는 L2 (NDA + 전문투자자) 이상에서 공개됩니다.
              </p>
            </SectionCard>

            {/* ── DR-21: CTA 게이트 (L1 인증) — dealFlowMode 에서만 ── */}
            {dealFlowMode && !tierGte(effectiveAccessTier, "L1") && (
              <div className="mt-6 lg:mt-8">
                <DealGate
                  icon={DealLockIcon}
                  title="로그인/인증하고 상세 보기"
                  subtitle="등기부등본·임대차·감정평가서 등 상세 데이터 열람"
                  panelMode
                />
              </div>
            )}

            <SectionCard
              title="등기부등본 요약"
              icon={<ScrollText size={14} />}
              tierBadge="L1"
              anchorId="deed-summary"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={140} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {listing.registry_summary_items.length === 0 ? (
                  <p className="text-center py-6" style={{ color: C.lt4, fontSize: 11 }}>
                    등기 정보가 아직 업로드되지 않았습니다.
                  </p>
                ) : (
                  <div>
                    {/* 탭: 토지등기부 / 건물등기부 */}
                    <div className="flex items-center gap-1 mb-3" style={{ borderBottom: "1px solid var(--layer-border-strong)", paddingBottom: 0 }}>
                      {(["land", "building"] as const).map(t => {
                        const label = t === "land" ? "토지등기부" : "건물등기부"
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

                    {/* 테이블 */}
                    {deedSummaryExpanded && (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--layer-2-bg)", borderBottom: "2px solid var(--layer-border-strong)" }}>
                              {["구분", "접수일", "권리종류", "권리자", "채권금액"].map((h, i) => (
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
                                    {r.receipt_date ?? "—"}
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

                    {/* 접기/펼치기 토글 */}
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
                        {deedSummaryExpanded ? "▲ 등기부 현황 접기" : "▼ 등기부 현황 펼치기"}
                      </button>
                    </div>
                  </div>
                )}
              </TierGate>
            </SectionCard>

            <SectionCard
              title="임대차 현황"
              icon={<Building2 size={14} />}
              tierBadge="L1"
              anchorId="tenants"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={120} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="보증금 합계" value={formatKRW(listing.lease_summary.total_deposit)} />
                  <Stat label="월세" value={formatKRW(listing.lease_summary.monthly_rent || 0)} />
                  <Stat label="임차인 수" value={`${listing.lease_summary.tenant_count}명`} />
                </div>
              </TierGate>
            </SectionCard>

            {/* ── DR-20: Gate 1 (NDA) + Stage 02 헤더 — dealFlowMode 에서만 ── */}
            {dealFlowMode && (
              <>
                <DealGate
                  icon={DealLockIcon}
                  title="NDA 체결 시 열람 가능"
                  subtitle="기관 검증 데이터 · 감정평가서 · 실거래 · 채권 정보"
                  panelMode
                />
                <StageHeader
                  eyebrow="Section 02 · NDA required"
                  title="Deal Validation"
                  subtitle="검증 데이터 — 의사결정의 핵심 근거"
                />
              </>
            )}

            {/* ── NDA 체결 (L2) ── */}
            <SectionCard
              title="NDA 체결"
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
                        NDA 체결 완료
                      </div>
                      <div className="mt-0.5" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                        감정평가서 · 현장사진 · 채권정보 등 L2 자료를 열람할 수 있습니다
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
                      {ndaPdfOpen ? "NDA 닫기" : "NDA 보기"}
                    </button>
                    <a
                      href={`/api/v1/docs/${id}/nda?download=1`}
                      download
                      onClick={e => { e.preventDefault(); toast.success("NDA 문서 다운로드를 시작합니다.", { duration: 1800 }) }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                      style={{
                        fontSize: 12,
                        backgroundColor: "rgba(5, 28, 44,0.10)",
                        color: "var(--color-positive)",
                        border: "1px solid rgba(5, 28, 44,0.3)",
                      }}
                    >
                      <FileDown size={13} />
                      PDF 다운로드
                    </a>
                  </div>
                  {ndaPdfOpen && (
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--layer-border-strong)" }}>
                      <div className="flex items-center justify-between px-3 py-2"
                        style={{ backgroundColor: "var(--layer-2-bg)", fontSize: 11, color: "var(--fg-muted)" }}>
                        <span className="font-bold">비밀유지계약서 (NDA) 미리보기</span>
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
              title="감정평가서"
              icon={<Banknote size={14} />}
              tierBadge="L2"
              anchorId="appraisal"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={140} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {/* ── 단위 토글 ── */}
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 11, color: C.lt4, fontWeight: 700 }}>단위</span>
                  {(["m2", "평"] as const).map(u => (
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
                      {u === "m2" ? "m²" : "평"}
                    </button>
                  ))}
                </div>

                {/* ── KPI 3칸 ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <Stat label="감정가" value={formatKRW(listing.appraisal_value)} tone="em" />
                  <Stat
                    label={`면적 (${areaUnit === "m2" ? "m²" : "평"})`}
                    value={listing.appraisal_area ? fmtArea(listing.appraisal_area, areaUnit) : "—"}
                  />
                  <Stat
                    label={`감정가/${areaUnit === "m2" ? "m²" : "평"}`}
                    value={
                      listing.appraisal_area
                        ? fmtPricePerArea(listing.appraisal_value, listing.appraisal_area, areaUnit)
                        : "—"
                    }
                    tone="blue"
                  />
                </div>

                {/* ── 감정 기준시점 ── */}
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.lt3 }}>감정 기준시점</span>
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

                {/* PDF 뷰어 + 다운로드 */}
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
                    {appraisalPdfOpen ? "PDF 닫기" : "PDF 보기"}
                  </button>
                  <a
                    href={`/api/v1/docs/${id}/appraisal?download=1`}
                    download
                    onClick={e => { e.preventDefault(); toast.success("감정평가서 다운로드를 시작합니다.", { duration: 1800 }) }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{
                      fontSize: 12,
                      backgroundColor: "rgba(5, 28, 44,0.10)",
                      color: "var(--color-positive)",
                      border: "1px solid rgba(5, 28, 44,0.3)",
                    }}
                  >
                    <FileDown size={13} />
                    PDF 다운로드
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
                      <span className="font-bold">감정평가서 미리보기</span>
                      <button type="button" onClick={() => setAppraisalPdfOpen(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    {/* 실제 환경에서는 /api/v1/docs/:id/appraisal URL 사용 */}
                    <iframe
                      src={`/api/v1/docs/${id}/appraisal`}
                      title="감정평가서"
                      className="w-full"
                      style={{ height: 560, border: "none", backgroundColor: "#f8f8f8" }}
                    />
                  </div>
                )}
              </TierGate>
            </SectionCard>

            {/* ── 경매 정보 (L2) ── */}
            <SectionCard
              title="경매 정보"
              icon={<Gavel size={14} />}
              tierBadge="L2"
              anchorId="auction-info"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={120} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {editingSec === "auction" ? (
                  /* ── 경매 정보 편집 폼 ── */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {(["사건번호", "관할법원"] as const).map((label, i) => {
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
                      {(["경매접수일(경매개시일)", "예상 경매 시작일"] as const).map((label, i) => {
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
                        <Save size={13} /> 저장
                      </button>
                      <button type="button" onClick={() => setEditingSec(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold"
                        style={{ fontSize: 12, backgroundColor: "var(--layer-2-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>
                        <X size={13} /> 취소
                      </button>
                    </div>
                  </div>
                ) : listing.auction_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="사건번호" value={listing.auction_info.case_no} />
                      <InfoField label="관할법원" value={listing.auction_info.court} />
                      <InfoField label="경매접수일(경매개시일)" value={formatDateKo(listing.auction_info.filed_date)} />
                      <InfoField label="예상 경매 시작일" value={formatDateKo(listing.auction_info.estimated_start)} />
                    </div>
                    {/* 땅집고옥션 경매 연동 */}
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
                      땅집고옥션에서 경매 조회
                      <ArrowRight size={11} />
                    </a>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setAuctionDraft(listing.auction_info); setEditingSec("auction") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-colors"
                        style={{ fontSize: 11, color: "var(--fg-muted)", backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)" }}>
                        <Pencil size={11} /> 수정
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center py-3" style={{ color: C.lt4, fontSize: 12 }}>
                      경매 진행 없음 · 해당 매물은 임의매각 방식입니다.
                    </p>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setAuctionDraft({ case_no: "", court: "", filed_date: "", estimated_start: "" }); setEditingSec("auction") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold"
                        style={{ fontSize: 11, color: "var(--color-brand-bright)", backgroundColor: "rgba(46,117,182,0.10)", border: "1px solid rgba(46,117,182,0.3)" }}>
                        <Pencil size={11} /> 경매 정보 등록
                      </button>
                    )}
                  </div>
                )}
              </TierGate>
            </SectionCard>

            {/* ── 공매 정보 (L2) ── */}
            <SectionCard
              title="공매 정보"
              icon={<Gavel size={14} />}
              tierBadge="L2"
              anchorId="public-sale"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={120} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                {editingSec === "public-sale" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>관리번호</label>
                        <input className="w-full rounded-lg px-3 py-2 font-medium"
                          style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                          value={publicSaleDraft?.mgmt_no ?? ""}
                          onChange={e => setPublicSaleDraft(prev => prev ? { ...prev, mgmt_no: e.target.value } : { mgmt_no: e.target.value, filed_date: "", estimated_start: "" })}
                          placeholder="예: 2025-00123-001" />
                      </div>
                      <div>
                        <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>공매신청일</label>
                        <input type="date" className="w-full rounded-lg px-3 py-2 font-medium"
                          style={{ fontSize: 13, backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)", color: "var(--color-text-primary)" }}
                          value={publicSaleDraft?.filed_date ?? ""}
                          onChange={e => setPublicSaleDraft(prev => prev ? { ...prev, filed_date: e.target.value } : { mgmt_no: "", filed_date: e.target.value, estimated_start: "" })} />
                      </div>
                      <div>
                        <label className="block font-bold mb-1" style={{ fontSize: 11, color: C.lt3 }}>예상 공매 시작일</label>
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
                        <Save size={13} /> 저장
                      </button>
                      <button type="button" onClick={() => setEditingSec(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold"
                        style={{ fontSize: 12, backgroundColor: "var(--layer-2-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>
                        <X size={13} /> 취소
                      </button>
                    </div>
                  </div>
                ) : listing.public_sale_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="관리번호" value={listing.public_sale_info.mgmt_no} />
                      <InfoField label="공매신청일" value={formatDateKo(listing.public_sale_info.filed_date)} />
                      <InfoField label="예상 공매 시작일" value={formatDateKo(listing.public_sale_info.estimated_start)} />
                    </div>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setPublicSaleDraft(listing.public_sale_info); setEditingSec("public-sale") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold"
                        style={{ fontSize: 11, color: "var(--fg-muted)", backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)" }}>
                        <Pencil size={11} /> 수정
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center py-3" style={{ color: C.lt4, fontSize: 12 }}>
                      공매 진행 없음 · 해당 매물은 경매 또는 임의매각 방식입니다.
                    </p>
                    {canEdit && (
                      <button type="button"
                        onClick={() => { setPublicSaleDraft({ mgmt_no: "", filed_date: "", estimated_start: "" }); setEditingSec("public-sale") }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold"
                        style={{ fontSize: 11, color: "var(--color-brand-bright)", backgroundColor: "rgba(46,117,182,0.10)", border: "1px solid rgba(46,117,182,0.3)" }}>
                        <Pencil size={11} /> 공매 정보 등록
                      </button>
                    )}
                  </div>
                )}
              </TierGate>
            </SectionCard>

            {/* ── 실거래/경공매 통계 (L2) ── */}
            <SectionCard
              title="실거래 경공매 통계"
              icon={<BarChart2 size={14} />}
              tierBadge="L2"
              anchorId="auction-stats"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={100} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <p className="mb-3 leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  국토부 실거래가 현황 및 법원 경매와 온비드 공매 낙찰 통계 및 유사 사례를 확인합니다.
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
                    땅집고옥션 통계 정보 조회
                    <ArrowRight size={11} />
                  </a>
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title="등기부등본 원본"
              icon={<ScrollText size={14} />}
              tierBadge="L2"
              anchorId="deed-full"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={140} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="space-y-4">
                  {/* ── 다운로드 버튼: 토지 등기부등본 / 건물 등기부등본 ── */}
                  <div className="flex flex-wrap gap-2">
                    <DeedDownloadBtn
                      label="토지 등기부등본"
                      url={`/api/v1/docs/${id}/deed-land`}
                      uploaded={true}
                      onDownload={() => toast.success("토지 등기부등본 다운로드를 시작합니다.", { duration: 1800 })}
                    />
                    {listing.collateral !== "토지" && (
                      <DeedDownloadBtn
                        label="건물 등기부등본"
                        url={`/api/v1/docs/${id}/deed-building`}
                        uploaded={true}
                        onDownload={() => toast.success("건물 등기부등본 다운로드를 시작합니다.", { duration: 1800 })}
                      />
                    )}
                  </div>

                  {/* ── 탭: 토지등기부 / 건물등기부 ── */}
                  <div>
                    <div className="flex items-center gap-1" style={{ borderBottom: "1px solid var(--layer-border-strong)", paddingBottom: 0 }}>
                      {(["land", "building"] as const).map(t => {
                        const label = t === "land" ? "토지 등기부등본" : "건물 등기부등본"
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

                    {/* ── 전체 등기부 테이블 ── */}
                    {(() => {
                      const fullItems = deedFullTab === "land"
                        ? listing.registry_land_full_items
                        : listing.registry_building_full_items
                      if (!fullItems || fullItems.length === 0) {
                        return (
                          <p className="text-center py-5" style={{ color: C.lt4, fontSize: 11 }}>
                            {deedFullTab === "land" ? "토지" : "건물"} 등기부 데이터가 없습니다.
                          </p>
                        )
                      }
                      return (
                        <div>
                          {/* 헤더 행: 채권액합계 + 열람일 */}
                          <div className="flex items-center justify-between my-2 px-1" style={{ fontSize: 11 }}>
                            <span style={{ color: C.lt3, fontWeight: 700 }}>
                              채권액합계{" "}
                              <span style={{ color: C.em }}>
                                {fullItems.reduce((s, r) => s + (r.amount ?? 0), 0).toLocaleString("ko-KR")}원
                              </span>
                            </span>
                            <span style={{ color: C.lt4 }}>
                              열람 {listing.published_at?.replace(/-/g, ".")}
                            </span>
                          </div>

                          {deedFullExpanded && (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                                <thead>
                                  <tr style={{ backgroundColor: "var(--layer-2-bg)", borderBottom: "2px solid var(--layer-border-strong)" }}>
                                    {["구분", "접수일", "권리종류", "권리자", "채권금액"].map((h, i) => (
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
                                        {r.amount !== null ? r.amount.toLocaleString("ko-KR") + "원" : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* 접기/펼치기 토글 */}
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
                              {deedFullExpanded ? "▲ 등기부 현황 접기" : "▼ 등기부 현황 펼치기"}
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
              title={`현장 사진 (${listing.site_photos.length})`}
              icon={<Images size={14} />}
              tierBadge="L2"
              anchorId="site-photos"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={160} onUpgradeClick={handlePrimaryAction} softBlur={dealFlowMode}>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toast.success("현장 사진 전체 다운로드를 시작합니다.", { duration: 1800 })}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{ fontSize: 12, backgroundColor: "rgba(5, 28, 44,0.10)", color: "var(--color-positive)", border: "1px solid rgba(5, 28, 44,0.3)" }}
                  >
                    <FileDown size={13} />
                    전체 다운로드 ({listing.site_photos.length}장)
                  </button>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory" }}>
                    {listing.site_photos.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxPhoto(i)}
                        className="flex-shrink-0 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                        style={{ width: 140, height: 140, scrollSnapAlign: "start", backgroundColor: "var(--layer-2-bg)", border: "1px dashed var(--layer-border-strong)", color: C.lt4, fontSize: 11, cursor: "pointer" }}
                        title={`사진 ${i + 1} 확대`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </TierGate>
            </SectionCard>

            {/* ── 현장 사진 라이트박스 ── */}
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
                      style={{ fontSize: 14, backgroundColor: "var(--layer-1-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>‹</button>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{lightboxPhoto + 1} / {listing.site_photos.length}</span>
                    <button type="button"
                      onClick={() => setLightboxPhoto(i => i !== null && i < listing.site_photos.length - 1 ? i + 1 : 0)}
                      className="rounded-lg px-2 py-1 font-bold"
                      style={{ fontSize: 14, backgroundColor: "var(--layer-1-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>›</button>
                    <button type="button" onClick={() => setLightboxPhoto(null)}
                      className="rounded-lg p-1" style={{ backgroundColor: "var(--layer-1-bg)", color: "var(--fg-muted)", border: "1px solid var(--layer-border-strong)" }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SectionCard
              title="채권 정보"
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
                      채권잔액 <span style={{ color: C.lt4 }}>(원금 + 미수이자)</span>
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
                            <span>원금 {formatKRW(listing.claim_info.principal)} <span style={{ color: C.lt4, fontWeight: 500 }}>({pRatio}%)</span></span>
                            <span style={{ color: C.lt4 }}>+</span>
                            <span>연체이자 {formatKRW(listing.claim_info.accrued_interest)} <span style={{ color: C.lt4, fontWeight: 500 }}>({iRatio}%)</span></span>
                          </>
                        )
                      })()}
                    </div>
                    {/* 비율 시각화 — 원금/연체이자 bar */}
                    <div
                      className="mt-2 h-1.5 w-full rounded-full overflow-hidden flex"
                      style={{ background: "rgba(148,163,184,0.12)" }}
                      title="채권잔액 구성 비율"
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
                      label="대출 금리"
                      value={`${listing.claim_info.contract_rate.toFixed(1)}%`}
                      sub="연이율"
                      tone="blue"
                    />
                    <ClaimField
                      label="연체 금리"
                      value={`${listing.claim_info.delinquent_rate.toFixed(1)}%`}
                      sub="연이율"
                      tone="amber"
                    />
                    <ClaimField
                      label="연체 시작일"
                      value={formatDateKo(listing.claim_info.delinquent_since)}
                      sub={(() => {
                        const days = Math.floor(
                          (Date.now() - new Date(listing.claim_info.delinquent_since).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                        return days > 0 ? `${days}일 경과` : "오늘"
                      })()}
                      tone="neutral"
                    />
                  </div>

                  {/* 수익권 금액 (공부상 채권최고액) — 사용자 요청 2026-04-26.
                      미입력 매물은 한국 표준 대출원금 × 1.2 로 자동 환산해 표시 */}
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
                            수익권 금액 <span style={{ color: C.lt4 }}>(공부상 채권최고액 · 1순위 근저당)</span>
                          </div>
                          <div className="font-black tabular-nums" style={{ fontSize: 20, color: "#2E75B6", lineHeight: 1.1 }}>
                            {formatKRW(maxBond)}
                          </div>
                          <div className="mt-1 tabular-nums" style={{ fontSize: 11, color: C.lt3 }}>
                            대출원금 × <b>{ratio}%</b>
                            {!explicit && <span style={{ color: C.lt4 }}> · 표준 1.2x 자동 환산 (등기부 미입력)</span>}
                          </div>
                        </div>
                        <ClaimField
                          label="설정 비율"
                          value={`${ratio}%`}
                          sub="대출원금 × 110~140% 표준"
                          tone="blue"
                        />
                      </div>
                    )
                  })()}

                  <p
                    className="leading-relaxed"
                    style={{ fontSize: 11, color: C.lt3 }}
                  >
                    채권잔액은 대출 금리와 연체 금리를 적용한 원금과 미수이자의 합계이며,
                    연체 시작일부터는 연체 금리로 산정됩니다. 채권 정보 세부 내역은 LOI 제출
                    후 금융기관 대면 미팅에서 검토될 수 있습니다.
                  </p>
                </div>
              </TierGate>
            </SectionCard>
          </div>

          <div className="space-y-4 min-w-0">
            {/*
              sticky 우측 사이드바 — 페이지 자연 스크롤 시 뷰포트에 고정.
              · standalone (/exchange/[id]): top-4 (16px) — 최상단 Navigation 아래
              · embedded (/deals): top-20 (80px) — /deals 의 64px sticky 헤더 아래
            */}
            <div className={`${embedded ? "lg:sticky lg:top-20" : "lg:sticky lg:top-4"} space-y-4`}>
              <PrimaryActionCard
                tier={effectiveTier}
                loading={dealCreating}
                onAction={handlePrimaryAction}
                variant="desktop"
              />
              {/* DR-18: 분석 도구 바로가기 — 매물 컨텍스트를 수익성·시뮬·AI로 이어감 */}
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
                  <span>이 매물로 분석 시작</span>
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
                        NPL 수익성 분석 (IRR · ROI)
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
                        경매 분석 시뮬레이터
                      </span>
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
                        AI 컨설턴트
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
                onAskAi={() => toast.info("AI Copilot이 곧 열립니다.", { duration: 1500 })}
                onReanalyze={() => toast.info("AI 재분석을 요청했습니다.", { duration: 1500 })}
                onShowProbability={() => toast.info("확률 계산식을 표시합니다.", { duration: 1500 })}
                onSeeDemand={() => toast.info("매수자 수요를 조회합니다.", { duration: 1500 })}
                onAiMatch={() => toast.info("AI 매칭을 실행합니다.", { duration: 1500 })}
              />
            </div>
          </div>
        </div>

        {/* ── DR-20: Gate 2 (LOI) + Stage 03 헤더 — dealFlowMode 에서만 ── */}
        {dealFlowMode && (
          <div className="mt-6 lg:mt-8">
            <DealGate
              icon={DealLockIcon}
              title="LOI 제출 시 참여 가능"
              subtitle="채팅 · 가격 오퍼 · 오프라인 미팅 · 실사 · 협상"
              panelMode
            />
            <StageHeader
              eyebrow="Section 03 · LOI required"
              title="Deal Engagement"
              subtitle="딜 참여 — 매도자와 채팅·가격 협상·실사 진행"
            />
          </div>
        )}

        {/* ── LOI 확인 (L3+) — dealFlowMode 에서는 미인증 시 blur 처리해서 노출 ── */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI 제출 후 열람">
          <div id="loi" className="mt-6 lg:mt-8 scroll-mt-24">
            <SectionCard
              title="LOI 확인"
              icon={<FileCheck size={14} />}
              tierBadge="L3"
              anchorId="loi"
            >
              <div className="space-y-3">
                <p className="leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  제출된 인수의향서(LOI)를 확인하고 다운로드할 수 있습니다. LOI는 법적 구속력이 없는 의향서이며, 매도자 승인 후 에스크로 입금 및 현장 계약 단계로 진행됩니다.
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
                    {loiPdfOpen ? "LOI 닫기" : "LOI 보기"}
                  </button>
                  <a
                    href={`/api/v1/docs/${id}/loi?download=1`}
                    download
                    onClick={e => { e.preventDefault(); toast.success("LOI 문서 다운로드를 시작합니다.", { duration: 1800 }) }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors"
                    style={{
                      fontSize: 12,
                      backgroundColor: "rgba(5, 28, 44,0.10)",
                      color: "var(--color-positive)",
                      border: "1px solid rgba(5, 28, 44,0.3)",
                    }}
                  >
                    <FileDown size={13} />
                    PDF 다운로드
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
                      <span className="font-bold">인수의향서 (LOI) 미리보기</span>
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

        {/* ── 채팅 (L3+) — dealFlowMode 에서는 미인증 시 blur 처리해서 노출 ── */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI 제출 후 열람">
          <div id="chat" className="mt-6 lg:mt-8 scroll-mt-24">
            <InlineDealRoom
              tier={effectiveTier}
              counterpart={counterpart}
            />
          </div>
          </DealLockedSection>
        )}

        {/* ── 실사 (L3+) — dealFlowMode 에서는 미인증 시 blur 처리해서 노출 ── */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI 제출 후 열람">
          <div id="due-diligence" className="mt-6 lg:mt-8 scroll-mt-24">
            <DueDiligenceSection
              anchorId="due-diligence"
              listingId={id}
            />
          </div>
          </DealLockedSection>
        )}

        {/* ── 가격 오퍼 (L3+) — dealFlowMode 에서는 미인증 시 blur 처리해서 노출 ── */}
        {(tierGte(effectiveAccessTier, "L3") || dealFlowMode) && (
          <DealLockedSection locked={!tierGte(effectiveAccessTier, "L3") && dealFlowMode} badgeLabel="LOI 제출 후 열람">
          <div id="offer" className="mt-6 lg:mt-8 scroll-mt-24">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--layer-1-bg)",
                border: "1px solid var(--layer-border-strong)",
                boxShadow: "0 4px 20px rgba(27,58,92,0.10)",
              }}
            >
              {/* ── 헤더: 브랜드 그라데이션 ── */}
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
                      가격 오퍼
                    </h3>
                    <p className="mt-0.5 font-medium" style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
                      매도자에게 매입 희망가를 제안하세요
                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full font-bold px-2.5 py-1"
                  style={{ fontSize: 10, backgroundColor: "rgba(5, 28, 44,0.22)", color: "#FCD34D", border: "1px solid rgba(5, 28, 44,0.40)" }}
                >
                  L3 협상 단계
                </span>
              </header>

              {/* ── 바디 ── */}
              <div className="p-5 space-y-4">
                {/* 가격 요약 KPI 2칸 */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3.5"
                    style={{
                      backgroundColor: "rgba(5, 28, 44,0.07)",
                      border: "1px solid rgba(5, 28, 44,0.28)",
                    }}
                  >
                    <div className="font-bold mb-1" style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}>
                      매도 희망가
                    </div>
                    <div className="font-black tabular-nums" style={{ fontSize: 20, color: C.amber, lineHeight: 1.1 }}>
                      {formatKRW(listing.asking_price)}
                    </div>
                    <div className="mt-1 font-semibold tabular-nums" style={{ fontSize: 10, color: C.lt4 }}>
                      할인율 ↓{discountPct}%
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
                      AI 권고 매입가
                    </div>
                    <div className="font-black tabular-nums" style={{ fontSize: 20, color: C.em, lineHeight: 1.1 }}>
                      {formatKRW(Math.round(listing.asking_price * 0.96))}
                    </div>
                    <div className="mt-1 font-semibold" style={{ fontSize: 10, color: C.lt4 }}>
                      AI 협상 여지 추정
                    </div>
                  </div>
                </div>

                {/* 구분선 */}
                <div style={{ borderTop: "1px solid var(--layer-border-strong)" }} />

                {/* 오퍼 폼 / 카드 */}
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
                      새 오퍼 작성
                    </button>
                  </div>
                ) : offerFormVisible ? (
                  <OfferForm
                    onSubmit={o => {
                      const offer: OfferData = { ...o, status: "pending" }
                      setSubmittedOffer(offer)
                      setOfferFormVisible(false)
                      toast.success("가격 오퍼가 제출되었습니다 · 매도자 검토 대기 중", { duration: 2500 })
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
                    오퍼 작성 열기
                  </button>
                )}
              </div>
            </div>
          </div>
          </DealLockedSection>
        )}

        {/* ── DR-20: Gate 3 (ESCROW) + Stage 04 헤더 — dealFlowMode 에서만 ── */}
        {dealFlowMode && (
          <div className="mt-6 lg:mt-8">
            <DealGate
              icon={DealLockIcon}
              title="ESCROW 결제 후 실행"
              subtitle="안전결제 · 전자계약 · 잔금처리"
              panelMode
            />
            <StageHeader
              eyebrow="Section 04 · Closing"
              title="Deal Execution"
              subtitle="거래 실행 — 30분 내 클로징"
            />
          </div>
        )}

        {/* ── 에스크로 결제 · 계약 (L4+) — dealFlowMode 에서는 미인증 시 blur 처리해서 노출 ── */}
        {(effectiveTier === "L4" || effectiveTier === "L5" || dealFlowMode) && (
          <DealLockedSection
            locked={!(effectiveTier === "L4" || effectiveTier === "L5") && dealFlowMode}
            badgeLabel="ESCROW 입금 후 실행"
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

      {/* 모바일 sticky CTA · 컴플라이언스 footer — embedded(/deals) 에서는 중복 방지로 숨김 */}
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
              본 매물은 자동 마스킹 파이프라인 적용 · 티어별 공개 범위는{" "}
              <a href="/terms/disclaimer" className="underline" style={{ color: C.lt3 }}>
                면책고지
              </a>
              {" "}준수.
            </span>
          </div>
        </footer>
      )}
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION CARD WRAPPER
═══════════════════════════════════════════════════════════ */
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
            ● {tierBadge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MINI COMPONENTS
═══════════════════════════════════════════════════════════ */

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

/** 등기부등본 다운로드 버튼 — 업로드 여부에 따라 활성/비활성 */
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
        title="채권자가 아직 업로드하지 않았습니다"
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

/** 경매·공매 정보 표시용 텍스트 필드 */
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
        {value || "—"}
      </div>
    </div>
  )
}

/** 실사 신청·확인·의견 섹션 (L2 이상) */
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
      toast.error("실사 요청일과 시간을 입력해주세요.")
      return
    }
    setSubmitted(true)
    toast.success(`실사 신청이 접수되었습니다 [${listingId.slice(0, 8)}]. 매도자 확인 후 안내 드립니다.`, { duration: 3000 })
  }

  return (
    <SectionCard
      title="실사 신청"
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
              실사 신청 완료
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
              {date} {time} · 매도자 측 확인 대기 중
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
              >
                실사 요청일 <span style={{ color: "var(--color-danger)" }}>*</span>
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
                방문 시간 <span style={{ color: "var(--color-danger)" }}>*</span>
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
              확인 및 의견
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="실사 목적, 동행 인원, 확인 사항 등을 기재해 주세요."
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
              실사 후 비밀유지 의무를 준수하겠습니다.
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
            실사 신청하기
          </button>
        </div>
      )}
    </SectionCard>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   StageHeader — DR-20 · 단계 구분 인라인 헤더
   기존 SectionCard 사이에 삽입하기 위한 가벼운 wrapper
   (DealSection 의 헤더 부분만 추출 — 자식 wrapping X)
   ═══════════════════════════════════════════════════════════════════════════ */
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
            background: "#B8924B",
            display: "inline-block",
          }}
        />
        <span
          style={{
            color: "#8B6F2F",
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

/* ═══════════════════════════════════════════════════════════════════════════
   DealLockedSection — DR-21 · L3+ 섹션 softBlur 래퍼
   dealFlowMode + tier 미달 시 자식을 흐리게 보여주고 우상단 잠금 뱃지 표시
   ═══════════════════════════════════════════════════════════════════════════ */
function DealLockedSection({
  locked,
  badgeLabel = "LOI 제출 후 열람",
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
          <rect x="4" y="10" width="16" height="11" rx="2" stroke="#8B6F2F" strokeWidth="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#8B6F2F" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="15.5" r="1.4" fill="#8B6F2F" />
        </svg>
        <span style={{ color: "#0A1628", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>
          {badgeLabel}
        </span>
      </div>
    </div>
  )
}
