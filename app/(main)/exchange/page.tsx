"use client"

/**
 * /exchange — NPL 매물 탐색 (v5 프라이빗 중개, 2026-08-14)
 *
 * 설계 원칙:
 *   - 바이어 노출 필드는 9개로 제한: 관리번호 · 지역 · 주소(마스킹) · 유형 ·
 *     토지면적 · 건물면적 · 감정가 · 채권잔액 · 협의가
 *   - 분석 지표(AI 등급 · 할인율 · 완성도)는 목록 단계에서 미노출 — NDA 후 딜룸에서만
 *   - 담보는 열고 · 사람은 가린다 (PII 마스킹 일관 적용)
 *   - 수수료 0.9% 캡 고지
 */

import { useMemo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/hooks/use-translate"
import {
  Search, SlidersHorizontal, Building2,
  MapPin, ArrowRight, Sparkles, Filter,
  LayoutGrid, List as ListIcon, Brain, Loader2, Zap,
  Download, Heart, Lock as LockIcon,
} from "lucide-react"
import * as XLSX from "xlsx"
import { buildListingNoMap } from '@/lib/listing-no'
import { maskInstitutionName } from "@/lib/mask"
import { NdaModal, type NdaState } from "@/components/asset-detail"
import { createClient } from "@/lib/supabase/client"
import { DetailPane } from "@/components/listing/detail-pane"
import { PLATFORM_STATS } from "@/lib/platform-stats"
import { useMainStats } from "@/lib/hooks/use-main-stats"
import type { AccessTier } from "@/lib/access-tier"
import {
  REGION_SHORT_LIST,
  SALE_METHODS,
  SELLER_INSTITUTIONS,
  LISTING_CATEGORIES,
  type AIGrade,
} from "@/lib/taxonomy"
import { MckPageShell, MckPageHeader, MckDemoBanner, MckBadge, MckKpiGrid } from "@/components/mck"
import { MCK, MCK_FONTS } from "@/lib/mck-design"
import { OwnerEditButton } from "@/components/edit/owner-edit-button"
import { EXCHANGE_DEMO_LISTINGS, DEMO_SELLER_ID as DEMO_SELLER_ID_FROM_SAMPLES } from "@/lib/samples/exchange-demo-listings"

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — McKinsey 절제된 모노크로 (ink + brass + paper)
   기존 V.* 호출부 호환을 위해 키 이름은 유지하되 값은 mck 팔레트로 매핑.
   purple/positive(green)/brandBright는 모두 ink 또는 brass로 통일.
═══════════════════════════════════════════════════════════ */
import { MCK as _MCK } from "@/lib/mck-design"
const V = {
  surfaceSunken:  _MCK.paperTint,
  surfaceBase:    _MCK.paper,
  surfaceElevated:_MCK.paper,
  borderSubtle:   _MCK.border,
  borderDefault:  _MCK.borderStrong,
  textPrimary:    _MCK.ink,
  textSecondary:  _MCK.inkMid,
  textTertiary:   _MCK.textSub,
  textMuted:      _MCK.textMuted,
  // semantic — McKinsey 차분 톤. 칩/뱃지에서만 1px 라인용으로 사용
  positive:       _MCK.brassDark,    // green → brass (절제)
  warning:        _MCK.warning,
  danger:         _MCK.danger,
  brandBright:    _MCK.ink,           // bright blue → ink (모노크로)
  purple:         _MCK.brassDark,     // purple → brass (단일 악센트)
  onPositive:     _MCK.paper,
  onDark:         _MCK.paper,
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA (DealListingRecord-compatible)
═══════════════════════════════════════════════════════════ */
interface CardListing {
  id: string
  /** 매각사(매각사) 사용자 ID — OwnerEditButton 권한 매칭용. 없으면 관리자만 편집 가능 */
  seller_id?: string | null
  institution: string
  inst_kind: keyof typeof SELLER_INSTITUTIONS  // BANK / SAVINGS_BANK / MUTUAL_CREDIT / AMC / MONEY_LENDER
  listing_category: keyof typeof LISTING_CATEGORIES  // NPL / GENERAL
  region: string           // 시/군/구 수준만
  regionCode: string       // SEOUL / GYEONGGI ...
  collateral: string       // 상세 담보 라벨 (아파트·오피스 등)
  collateralMajor: "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "ETC"
  outstanding_principal: number   // 채권잔액
  asking_price: number            // 협의가 (구 매각희망가)
  appraisal_value: number         // 감정가
  land_area_m2?: number           // 토지면적(㎡) — 미제공 시 "—" 표시
  building_area_m2?: number       // 건물면적(㎡) — 미제공 시 "—" 표시
  discount_rate: number           // 할인율 (%)
  ai_grade: AIGrade
  data_completeness: number       // 0-10
  access_tier_required: AccessTier
  provided: {
    appraisal: boolean
    registry: boolean
    rights: boolean
    lease: boolean
    site_photos: boolean
    financials: boolean
  }
  sale_method: keyof typeof SALE_METHODS  // NPLATFORM / AUCTION / PUBLIC
  created_days_ago: number
  view_count: number   // 공개 리스트 누적 조회수 (L0)
  created_at_label?: string   // 등록일자 YYYY-MM-DD
  address_dong?: string       // 주소 — 동 단위까지 (세부주소 제외)
  photo_url?: string          // 대표 사진 (없으면 placeholder)
  max_claim?: number          // 채권최고액 (근저당 설정액) — 미제공 시 '—'
  listing_no?: string | null  // DB 고정 관리번호 (npl_listings.listing_no)
}

/**
 * 비로그인 샘플 10건 — "NPL 자동매칭 샘플" (2026-08-18)
 * 회원가입 · 로그인 + 매입조건 등록 전에는 실데이터 대신 블러 처리된 고가 샘플 노출.
 * 숫자는 매수자 관점에서 매력적으로(감정가 대비 낮은 협의가 · 고가 위주) 구성한 가상 값.
 */
const GUEST_SAMPLES: CardListing[] = ([
  { id: 'N-01', region: '서울 강남구',   address_dong: '서울 강남구 역삼동',   collateral: '오피스 빌딩',   appraisal_value: 45_000_000_000, outstanding_principal: 28_500_000_000, max_claim: 37_050_000_000, asking_price: 19_800_000_000, land_area_m2: 1240, building_area_m2: 15800, created_at_label: '2026-08-17', created_days_ago: 1,  photo_url: 'https://picsum.photos/seed/npl-01/400/300' },
  { id: 'N-02', region: '서울 용산구',   address_dong: '서울 용산구 한남동',   collateral: '통건물',       appraisal_value: 28_000_000_000, outstanding_principal: 17_200_000_000, max_claim: 22_360_000_000, asking_price: 15_200_000_000, land_area_m2: 660,  building_area_m2: 4200,  created_at_label: '2026-08-16', created_days_ago: 2,  photo_url: 'https://picsum.photos/seed/npl-02/400/300' },
  { id: 'N-03', region: '서울 성동구',   address_dong: '서울 성동구 성수동',   collateral: '지식산업센터', appraisal_value: 32_000_000_000, outstanding_principal: 19_800_000_000, max_claim: 25_740_000_000, asking_price: 17_600_000_000, land_area_m2: 1980, building_area_m2: 21400, created_at_label: '2026-08-15', created_days_ago: 3,  photo_url: 'https://picsum.photos/seed/npl-03/400/300' },
  { id: 'N-04', region: '경기 성남시 분당구', address_dong: '경기 성남시 분당구 정자동', collateral: '오피스', appraisal_value: 19_000_000_000, outstanding_principal: 11_600_000_000, max_claim: 15_080_000_000, asking_price: 10_400_000_000, land_area_m2: 890,  building_area_m2: 9800,  created_at_label: '2026-08-14', created_days_ago: 4,  photo_url: 'https://picsum.photos/seed/npl-04/400/300' },
  { id: 'N-05', region: '서울 서초구',   address_dong: '서울 서초구 서초동',   collateral: '근린상가',     appraisal_value: 12_800_000_000, outstanding_principal: 7_900_000_000,  max_claim: 10_270_000_000, asking_price: 6_900_000_000,  land_area_m2: 420,  building_area_m2: 2800,  created_at_label: '2026-08-13', created_days_ago: 5,  photo_url: 'https://picsum.photos/seed/npl-05/400/300' },
  { id: 'N-06', region: '부산 해운대구', address_dong: '부산 해운대구 우동',   collateral: '호텔',         appraisal_value: 21_500_000_000, outstanding_principal: 13_400_000_000, max_claim: 17_420_000_000, asking_price: 11_800_000_000, land_area_m2: 1650, building_area_m2: 12600, created_at_label: '2026-08-12', created_days_ago: 6,  photo_url: 'https://picsum.photos/seed/npl-06/400/300' },
  { id: 'N-07', region: '경기 성남시 판교', address_dong: '경기 성남시 삼평동', collateral: '물류센터',    appraisal_value: 16_500_000_000, outstanding_principal: 10_100_000_000, max_claim: 13_130_000_000, asking_price: 8_800_000_000,  land_area_m2: 5200, building_area_m2: 18900, created_at_label: '2026-08-11', created_days_ago: 7,  photo_url: 'https://picsum.photos/seed/npl-07/400/300' },
  { id: 'N-08', region: '서울 마포구',   address_dong: '서울 마포구 상암동',   collateral: '오피스텔 통동', appraisal_value: 9_600_000_000,  outstanding_principal: 5_900_000_000,  max_claim: 7_670_000_000,  asking_price: 5_200_000_000,  land_area_m2: 380,  building_area_m2: 5400,  created_at_label: '2026-08-10', created_days_ago: 8,  photo_url: 'https://picsum.photos/seed/npl-08/400/300' },
  { id: 'N-09', region: '인천 연수구',   address_dong: '인천 연수구 송도동',   collateral: '오피스',       appraisal_value: 14_200_000_000, outstanding_principal: 8_700_000_000,  max_claim: 11_310_000_000, asking_price: 7_800_000_000,  land_area_m2: 760,  building_area_m2: 8600,  created_at_label: '2026-08-09', created_days_ago: 9,  photo_url: 'https://picsum.photos/seed/npl-09/400/300' },
  { id: 'N-10', region: '제주 서귀포시', address_dong: '제주 서귀포시 색달동', collateral: '리조트 부지',  appraisal_value: 8_800_000_000,  outstanding_principal: 5_400_000_000,  max_claim: 7_020_000_000,  asking_price: 4_500_000_000,  land_area_m2: 12400,                          created_at_label: '2026-08-08', created_days_ago: 10, photo_url: 'https://picsum.photos/seed/npl-10/400/300' },
] as unknown) as CardListing[]

// MOCK 12건은 lib/samples/exchange-demo-listings.ts 로 추출 (P0-3 · 2026-05-02)
// — 페이지에 하드코딩 금지 정책. 데모 시드 갱신 시 본 파일은 손대지 않고 lib/samples 만 수정.
const DEMO_SELLER_ID = DEMO_SELLER_ID_FROM_SAMPLES
// 페이지 내 사용처는 기존 변수명 그대로 유지 — 시그니처 변경 최소화
// 데모 시드에는 면적 필드가 없음 — 목록 9필드 정책에 맞춰 페이지 단에서
// 담보 유형별 그럴듯한 면적을 결정적으로(index seed) 보강. lib/samples 는 손대지 않음.
const MOCK: CardListing[] = (EXCHANGE_DEMO_LISTINGS as unknown as CardListing[]).map((x, i) => {
  const seed = (i * 7) % 12
  const land =
    x.collateralMajor === "LAND" ? 661.2 + seed * 86.5 :
    x.collateralMajor === "COMMERCIAL" ? 214.8 + seed * 22.4 :
    x.collateralMajor === "RESIDENTIAL" ? 38.2 + seed * 3.1 :
    120.5 + seed * 9.7
  const building =
    x.collateralMajor === "LAND" ? undefined :
    x.collateralMajor === "COMMERCIAL" ? 486.2 + seed * 41.3 :
    x.collateralMajor === "RESIDENTIAL" ? 84.9 + seed * 4.6 :
    150.3 + seed * 11.2
  return {
    ...x,
    land_area_m2: x.land_area_m2 ?? Math.round(land * 10) / 10,
    building_area_m2: x.building_area_m2 ?? (building == null ? undefined : Math.round(building * 10) / 10),
    created_at_label: new Date(Date.now() - x.created_days_ago * 86_400_000).toISOString().slice(0, 10),
    // 채권최고액 — 미제공 데모 시드는 채권잔액의 130% 로 결정적 보강
    max_claim: x.max_claim ?? Math.round(x.outstanding_principal * 1.3),
  }
})

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

/** 면적 단위 토글 — 1평 = 3.3058㎡ */
const PYEONG_M2 = 3.3058
type AreaUnit = "m2" | "py"
function formatArea(m2: number | undefined, unit: AreaUnit): string {
  if (typeof m2 !== "number" || !isFinite(m2) || m2 <= 0) return "—"
  return unit === "py" ? `${(m2 / PYEONG_M2).toFixed(1)}평` : `${m2.toFixed(1)}㎡`
}

/** 주소 마스킹 — 목록 단계는 시/군/구 + *** 만 노출 (NDA 체결 후 전체 주소 공개) */
function maskAddress(region: string): string {
  return region ? `${region} ***` : "***"
}

// ─── Filter Options (derived from central taxonomy) ──────────
const LISTING_CATEGORY_FILTER: { value: string; label: string }[] = [
  { value: "ALL",     label: "전체" },
  { value: "NPL",     label: "NPL" },
  { value: "GENERAL", label: "일반 부동산" },
]
const COLLATERAL_MAJOR_FILTER: { value: string; label: string; icon: string }[] = [
  { value: "ALL",         label: "전체",       icon: "◈" },
  { value: "RESIDENTIAL", label: "주거용",     icon: "🏠" },
  { value: "COMMERCIAL",  label: "상업/산업용", icon: "🏢" },
  { value: "LAND",        label: "토지",       icon: "🌿" },
  { value: "ETC",         label: "기타",       icon: "📦" },
]

// 담보 소분류 — 대분류 선택 시 표시
const COLLATERAL_MINOR_MAP: Record<string, { value: string; label: string }[]> = {
  RESIDENTIAL: [
    { value: "ALL",             label: "전체" },
    { value: "아파트",           label: "아파트" },
    { value: "오피스텔(주거용)",  label: "오피스텔(주거용)" },
    { value: "빌라/연립",        label: "빌라·연립" },
    { value: "단독/다가구",      label: "단독·다가구" },
    { value: "도시형생활주택",    label: "도시형생활주택" },
  ],
  COMMERCIAL: [
    { value: "ALL",              label: "전체" },
    { value: "근린시설",         label: "근린시설/상가" },
    { value: "사무실",           label: "사무실/사무소" },
    { value: "오피스텔(업무용)", label: "오피스텔(업무용)" },
    { value: "상업용빌딩",       label: "상업용빌딩" },
    { value: "공장",             label: "공장/창고" },
    { value: "호텔",             label: "호텔/숙박" },
  ],
  LAND: [
    { value: "ALL",   label: "전체" },
    { value: "대지",  label: "대지" },
    { value: "임야",  label: "임야" },
    { value: "농지",  label: "농지(전/답)" },
    { value: "잡종지", label: "잡종지" },
  ],
  ETC: [
    { value: "ALL",  label: "전체" },
    { value: "기타", label: "기타" },
  ],
}
const REGION_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...REGION_SHORT_LIST.map(s => ({ value: s, label: s })),
]
const INST_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...Object.entries(SELLER_INSTITUTIONS).map(([v, l]) => ({ value: v, label: l })),
]
const SALE_METHOD_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...Object.entries(SALE_METHODS).map(([v, l]) => ({ value: v, label: l })),
]
type SortKey = "recent" | "appraisal_desc" | "principal_desc"
type ViewMode = "card" | "list"

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function ExchangePage() {
  const { t: tr, locale } = useTranslation()
  const searchParams = useSearchParams()
  const initialQ = searchParams?.get("q") || ""
  const [q, setQ] = useState(initialQ)
  // D5 — 알림 구간 고정 링크: ?alert=YYYY-MM-DD[&until=YYYY-MM-DD] → 해당 구간 등록 건만 표시
  const alertFrom = searchParams?.get("alert") || ""
  const alertUntil = searchParams?.get("until") || ""
  // keep q in sync with URL changes (e.g. re-enter from home with a different query)
  useEffect(() => {
    const urlQ = searchParams?.get("q") || ""
    if (urlQ && urlQ !== q) setQ(urlQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [listingCategory, setListingCategory] = useState("ALL")
  const [collateral, setCollateral] = useState("ALL")       // RESIDENTIAL / COMMERCIAL / LAND / ETC
  const [collateralMinor, setCollateralMinor] = useState("ALL") // 소분류
  const [region, setRegion] = useState("ALL")                // 서울 / 경기 ...
  const [instType, setInstType] = useState("ALL")            // BANK / SAVINGS_BANK / ...
  const [stage, setStage] = useState("ALL")                  // NPLATFORM / AUCTION / PUBLIC
  const [sort, setSort] = useState<SortKey>("recent")
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("m2")   // ㎡/평 토글 — 목록 전체 공통
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("list")   // 기본 모드 = 리스트 (2026-08-15 정책)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(50) // 카드 30, 리스트 50

  // ── 관심등록 — 회원 Key 서버 저장 (R3 · 2026-08-19) ───────────
  //    로그인 시: /api/v1/favorites (user_id × listing_id) · 기기 바뀌어도 유지
  //    비로그인:  localStorage 임시 보관 → 로그인 후 자동 이관
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  useEffect(() => {
    let local: string[] = []
    try { local = JSON.parse(localStorage.getItem('npl_favorites') || '[]') } catch { /* ignore */ }
    ;(async () => {
      try {
        // 로컬에 남은 관심이 있으면 서버로 이관 후 서버 목록을 사용
        if (local.length > 0) {
          const mig = await fetch('/api/v1/favorites', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ migrate: local }),
          })
          if (mig.ok) { try { localStorage.removeItem('npl_favorites') } catch { /* ignore */ } }
        }
        const r = await fetch('/api/v1/favorites', { credentials: 'include' })
        const d = await r.json()
        if (Array.isArray(d?.data) && d.data.length > 0) { setFavorites(new Set(d.data)); return }
      } catch { /* 서버 실패 시 로컬 폴백 */ }
      setFavorites(new Set(local))
    })()
  }, [])
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      const removing = next.has(id)
      if (removing) next.delete(id); else next.add(id)
      // 서버 저장 (회원 Key) — 실패 시 로컬 폴백
      const req = removing
        ? fetch(`/api/v1/favorites?listing_id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
        : fetch('/api/v1/favorites', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: id }) })
      req.then(r => {
        if (!r.ok) {
          try { localStorage.setItem('npl_favorites', JSON.stringify([...next])) } catch { /* ignore */ }
          // 로그인·권한 문제는 조용히 넘기지 않고 안내 (2026-08-19)
          if (r.status === 401) alert('관심매물 저장은 로그인 후 가능합니다.')
          else if (r.status === 403) alert('현재 계정 상태로는 관심매물을 저장할 수 없습니다. 운영사로 문의해주세요.')
        }
      }).catch(() => { try { localStorage.setItem('npl_favorites', JSON.stringify([...next])) } catch { /* ignore */ } })
      return next
    })
  }, [])

  // ── NPL 상태 배지 (거래중/협의중/매각완료 — 관리자·매각사 입력값) ──
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/v1/listing-marketing')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        for (const [id, row] of Object.entries(d?.data ?? {})) {
          const s = (row as { npl_status?: string })?.npl_status
          if (s) map[id] = s
        }
        setStatusMap(map)
      })
      .catch(() => {})
  }, [])

  // ── 세부내역 우측 패널 (D0·D6 — 매입 회원 열람 모드) ──
  const [detailTarget, setDetailTarget] = useState<string | null>(null)

  // ── NDA 전자계약 — 리스트에서 바로 서명 (자체 NdaModal + /api/v1/nda) ──
  const [ndaTarget, setNdaTarget] = useState<CardListing | null>(null)
  const [ndaStates, setNdaStates] = useState<Record<string, NdaState>>({})

  const openNda = useCallback((item: CardListing) => {
    setNdaTarget(item)
  }, [])

  const submitNda = useCallback(async (payload?: { signerName: string }) => {
    if (!ndaTarget) return
    const id = ndaTarget.id
    // 자체 NDA API 에 서명 기록 (npl_ndas) — 실패해도 submitted 상태로 운영사 검토 플로우 진행
    try {
      await fetch('/api/v1/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: id }),
      })
    } catch { /* ignore */ }
    // NDA 요청 등록 — '운영사 검토' 상태로 관리자·매입사·매각사 대시보드 공유
    fetch('/api/v1/listing-marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id, type: 'nda_request', signer: payload?.signerName ?? '' }),
    }).catch(() => {})
    setNdaStates(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { status: 'none' }),
        status: 'submitted',
        submittedAt: new Date().toISOString().slice(0, 10),
        reviewNote: '운영사 확인 후 1차 미팅 안내 (영업일 1일 이내)',
      } as NdaState,
    }))
    setNdaTarget(null)
  }, [ndaTarget])
  const [aiSearchMode, setAiSearchMode] = useState(false)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState("")

  // ── Real listings data ──────────────────────────────────────
  // SoT 흐름 정합: 실제 API listings 를 가져와 CardListing 으로 매핑.
  // 사용자 정책 (2026-04-29): 초기 MOCK 깜박임 제거 — fetch 전에는 빈 배열 + 로딩 상태.
  //   API 실패/빈 응답 시에만 MOCK fallback (체험 모드 배너 노출).
  //   limit 도 200 으로 상향 — 53+ 매물 1페이지에 표시.
  const [listings, setListings] = useState<CardListing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [demoDismissed, setDemoDismissed] = useState(false)
  const [totalListings, setTotalListings] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // limit=200: 거래소는 53+ 활성 매물을 1페이지에 모두 표시 (필터·정렬은 client 측).
        //   status=ACTIVE 만 (SOLD/IN_DEAL/DRAFT 제외) — 거래 가능 매물 전수.
        const r = await fetch('/api/v1/exchange/listings?limit=200&status=ACTIVE', { credentials: 'include' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (cancelled) return
        if (typeof d.total === 'number') setTotalListings(d.total)
        const rows: Array<Record<string, unknown>> = Array.isArray(d.data) ? d.data : []
        if (rows.length === 0) {
          // 실 데이터 없음 → MOCK fallback (체험 모드)
          setListings(MOCK)
          setIsDemoMode(true)
          return
        }
        // API row → CardListing 매핑 (필드 변형 흡수)
        const mapped: CardListing[] = rows.map((raw): CardListing => {
          const r = raw as Record<string, any>
          const principal =
            (r.outstanding_principal as number) ??
            (r.principal_amount as number) ??
            (r.claim_amount as number) ?? 0
          const appraisal = (r.appraised_value as number) ?? (r.appraisal_value as number) ?? 0
          let asking = (r.asking_price as number) ?? (r.proposed_sale_price as number) ?? 0
          if (!asking) {
            const lo = r.ai_estimate_low as number | undefined
            const hi = r.ai_estimate_high as number | undefined
            if (lo && hi) asking = Math.round((lo + hi) / 2)
            else if (typeof r.minimum_bid === 'number') asking = r.minimum_bid
            else asking = Math.round(principal * 0.7)
          }
          const discount =
            typeof r.discount_rate === 'number' && r.discount_rate > 0
              ? r.discount_rate
              : principal > 0
                ? Math.round((1 - asking / principal) * 1000) / 10
                : 0
          // institution / region / collateral 정규화
          const institution: string =
            (r.institution as string) ?? (r.institution_name as string) ?? '미정'
          const region: string =
            [r.sido, r.sigungu].filter(Boolean).join(' ') ||
            [r.location_city, r.location_district].filter(Boolean).join(' ') ||
            (typeof r.address_masked === 'string' ? r.address_masked : '') ||
            (typeof r.address === 'string' ? r.address.split(/\s+/).slice(0, 2).join(' ') : '')
          // collateral 영문 enum → 한글 라벨 (간단 매핑; 누락 값은 '기타')
          const ctRaw = String(r.collateral_type ?? '').toUpperCase()
          const COLLATERAL_LABEL: Record<string, string> = {
            APARTMENT: '아파트', OFFICETEL: '오피스텔', COMMERCIAL: '근린시설/상가',
            STORE: '근린시설/상가', RETAIL: '근린시설/상가', LAND: '대지',
            VILLA: '빌라/다세대', HOUSE: '빌라/다세대',
          }
          const collateral = COLLATERAL_LABEL[ctRaw] || (typeof r.collateral_type === 'string' ? r.collateral_type : '기타')
          const collateralMajor: CardListing['collateralMajor'] =
            ctRaw === 'LAND' ? 'LAND' :
            ctRaw === 'COMMERCIAL' || ctRaw === 'STORE' || ctRaw === 'RETAIL' ? 'COMMERCIAL' :
            ctRaw === 'APARTMENT' || ctRaw === 'OFFICETEL' || ctRaw === 'VILLA' || ctRaw === 'HOUSE' ? 'RESIDENTIAL' :
            'ETC'
          // institution kind — institution_type 우선, 없으면 institution 명에서 추론
          //   MONEY_LENDER (대부업체) / AMC (자산관리) / SAVINGS_BANK (저축은행) / BANK (은행)
          const instType = String(r.institution_type ?? '').toUpperCase()
          const instName = String(r.institution ?? r.institution_name ?? '')
          const inst_kind: CardListing['inst_kind'] =
            instType === 'AMC' ? 'AMC' :
            instType === 'SAVINGS_BANK' ? 'SAVINGS_BANK' :
            instType === 'MONEY_LENDER' || instType === 'LENDER' || instName.includes('대부') ? 'MONEY_LENDER' :
            instType === 'MUTUAL_CREDIT' ? 'MUTUAL_CREDIT' :
            instType === 'BANK' ? 'BANK' :
            'BANK'
          // sale_method
          const sm = String(r.sale_method ?? '').toUpperCase()
          const sale_method: CardListing['sale_method'] =
            sm === 'AUCTION' ? 'AUCTION' :
            sm === 'PUBLIC' ? 'PUBLIC' :
            'NPLATFORM'
          // 등록 후 경과일
          const created = r.created_at ? new Date(r.created_at as string).getTime() : Date.now()
          const created_days_ago = Math.max(0, Math.floor((Date.now() - created) / 86_400_000))
          // ai_grade 안전 fallback
          const aiGradeRaw = String(r.risk_grade ?? r.ai_grade ?? 'B').toUpperCase()
          const ai_grade: CardListing['ai_grade'] =
            ['A', 'B', 'C', 'D', 'E', 'S'].includes(aiGradeRaw) ? (aiGradeRaw as CardListing['ai_grade']) : 'B'
          // data_completeness 0-10
          const completeness =
            typeof r.data_completeness === 'number' ? r.data_completeness :
            typeof r.completeness_score === 'number' ? r.completeness_score :
            6
          return {
            id: String(r.id),
            listing_no: (r.listing_no as string) ?? null,   // DB 고정 관리번호 (N26-1)
            seller_id: (r.seller_id as string) ?? null,
            institution,
            inst_kind,
            listing_category: 'NPL',
            region,
            regionCode: String(r.sido ?? '').includes('서울') ? 'SEOUL' :
                        String(r.sido ?? '').includes('경기') ? 'GYEONGGI' :
                        String(r.sido ?? '').includes('인천') ? 'INCHEON' :
                        String(r.sido ?? '').includes('부산') ? 'BUSAN' :
                        String(r.sido ?? '').includes('대구') ? 'DAEGU' :
                        String(r.sido ?? '').includes('대전') ? 'DAEJEON' : 'OTHER',
            collateral,
            collateralMajor,
            outstanding_principal: principal,
            asking_price: asking,
            appraisal_value: appraisal,
            land_area_m2:
              typeof r.land_area_m2 === 'number' ? r.land_area_m2 :
              typeof r.land_area === 'number' ? r.land_area : undefined,
            building_area_m2:
              typeof r.building_area_m2 === 'number' ? r.building_area_m2 :
              typeof r.building_area === 'number' ? r.building_area : undefined,
            discount_rate: discount,
            ai_grade,
            data_completeness: Math.max(0, Math.min(10, completeness)),
            access_tier_required: 'L0',
            provided: {
              appraisal: !!appraisal,
              registry: !!r.registry_provided,
              rights: !!r.rights_provided,
              lease: !!r.lease_provided,
              site_photos: Array.isArray(r.images) && r.images.length > 0,
              financials: !!r.financials_provided,
            },
            sale_method,
            created_days_ago,
            view_count: typeof r.view_count === 'number' ? r.view_count : 0,
            created_at_label: r.created_at ? String(r.created_at).slice(0, 10) : undefined,
            // 주소 동 단위: "시 구 동" 3토큰까지만 (세부주소 제외 정책)
            address_dong: typeof r.address === 'string'
              ? r.address.split(/\s+/).slice(0, 3).join(' ')
              : [r.sido, r.sigungu, r.dong ?? r.eupmyeondong].filter(Boolean).join(' ') || undefined,
            photo_url: Array.isArray(r.images) && r.images.length > 0
              ? String((r.images[0] as any)?.url ?? r.images[0])
              : typeof r.thumbnail_url === 'string' ? r.thumbnail_url : undefined,
            max_claim:
              typeof r.max_claim === 'number' ? r.max_claim :
              typeof r.max_claim_amount === 'number' ? r.max_claim_amount :
              typeof r.mortgage_amount === 'number' ? r.mortgage_amount : undefined,
          }
        })
        setListings(mapped)
        setIsDemoMode(false)  // 실 데이터 사용 — 데모 배너 자동 해제
      } catch (err) {
        console.warn('[exchange] listings fetch failed → MOCK fallback', err)
        if (!cancelled) {
          // fetch 실패 시에만 MOCK 노출
          setListings(MOCK)
          setIsDemoMode(true)
        }
      } finally {
        if (!cancelled) setListingsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleAISearch = useCallback(async () => {
    if (!q.trim() || aiSearching) return
    setAiSearching(true)
    setAiRecommendation("")
    try {
      const res = await fetch("/api/v1/ai/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, type: "listings" }),
      })
      const data = await res.json()
      if (data.recommendation) setAiRecommendation(data.recommendation)
      if (data.filters) {
        if (data.filters.region) setRegion(data.filters.region)
        if (data.filters.collateral) { setCollateral(data.filters.collateral); setCollateralMinor("ALL") }
      }
    } catch {
      setAiRecommendation("AI 검색을 처리하는 중 오류가 발생했습니다. 일반 검색을 이용해주세요.")
    } finally {
      setAiSearching(false)
    }
  }, [q, aiSearching])

  const filtered = useMemo(() => {
    let arr = [...listings]
    if (q) {
      const t = q.toLowerCase()
      // 동 단위 주소(address_dong)·매물명까지 검색 — '역삼' 등 동 이름 검색 지원
      arr = arr.filter(x =>
        x.institution.toLowerCase().includes(t) ||
        x.region.toLowerCase().includes(t) ||
        (x.address_dong ?? '').toLowerCase().includes(t) ||
        x.collateral.toLowerCase().includes(t) ||
        x.id.toLowerCase().includes(t)
      )
    }
    if (listingCategory !== "ALL") arr = arr.filter(x => x.listing_category === listingCategory)
    if (collateral !== "ALL") {
      arr = arr.filter(x => x.collateralMajor === collateral)
      if (collateralMinor !== "ALL") {
        arr = arr.filter(x => x.collateral.includes(collateralMinor))
      }
    }
    if (region !== "ALL") arr = arr.filter(x => x.region.startsWith(region))
    if (instType !== "ALL") arr = arr.filter(x => x.inst_kind === instType)
    if (stage !== "ALL") arr = arr.filter(x => x.sale_method === stage)
    // D5 — 알림 구간: 기준일 이후(~until) 등록 건만
    if (alertFrom) arr = arr.filter(x => {
      const d = x.created_at_label ?? ""
      return d >= alertFrom && (!alertUntil || d <= alertUntil)
    })

    switch (sort) {
      case "appraisal_desc": arr.sort((a, b) => b.appraisal_value - a.appraisal_value); break
      case "principal_desc": arr.sort((a, b) => b.outstanding_principal - a.outstanding_principal); break
      default: arr.sort((a, b) => a.created_days_ago - b.created_days_ago)
    }
    return arr
  }, [q, listingCategory, collateral, collateralMinor, region, instType, stage, sort, listings])

  // ── 관리번호 자동 채번 — N26-1 형식 (SSoT: lib/listing-no.ts · 2026-08-19) ──
  const displayNo = useMemo(() => buildListingNoMap(listings), [listings])

  // ── 비로그인 게이팅 — 회원가입/로그인 + 매입조건 등록 전에는 샘플만 블러 노출 ──
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'user'>('checking')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled) setAuthState(user ? 'user' : 'guest')
      } catch {
        if (!cancelled) setAuthState('guest')
      }
    })()
    return () => { cancelled = true }
  }, [])
  const guestMode = authState === 'guest'

  // KPI — 운영 관리자(/admin/main-stats) 입력값 자동연동
  const mainStats = useMainStats()

  // 매입조건 보유 여부 — 있어야만 "N건 매칭" 카운트 노출 (없으면 '매입조건 등록 시 매칭 진행')
  const [hasDemands, setHasDemands] = useState(false)
  useEffect(() => {
    if (authState !== 'user') { setHasDemands(false); return }
    fetch('/api/v1/exchange/demands?limit=1&mine=1', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setHasDemands(Array.isArray(d?.data) && d.data.length > 0))
      .catch(() => {})
  }, [authState])

  // 관심만 보기 — 하트 등록한 매물만 필터
  const [favOnly, setFavOnly] = useState(false)

  // ── 매칭 게이팅 정책 (2026-08-17) ──
  //   기본적으로는 매입조건에 매칭되는 딜만 노출.
  //   매칭 조건이 없는 상태(비로그인·조건 미등록)에서는 10건만 프리뷰로 공개하고
  //   나머지는 비공개 — 리스트 하단에 안내 배너 노출.
  const MATCH_PREVIEW_LIMIT = 10
  const gated = !favOnly && filtered.length > MATCH_PREVIEW_LIMIT
  const visible = useMemo(() => {
    const base = favOnly ? filtered.filter(x => favorites.has(x.id)) : filtered
    return favOnly ? base : base.slice(0, MATCH_PREVIEW_LIMIT)
  }, [favOnly, filtered, favorites])

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(visible.length / perPage))
  const safePage = Math.min(page, totalPages)
  const paginatedItems = visible.slice((safePage - 1) * perPage, safePage * perPage)

  // 뷰 전환 시 기본 perPage 변경 + 페이지 리셋
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v)
    setPerPage(v === "card" ? 30 : 50)
    setPage(1)
  }, [])

  // 필터 변경 시 페이지 리셋
  const resetPage = useCallback(() => setPage(1), [])

  // ── 엑셀 다운로드 ───────────────────────────────────────────
  const handleExcelDownload = useCallback(() => {
    // 목록 노출 9필드 정책과 동일 범위만 내보냄 — 채권기관·담당자 정보는 어떤 단계에서도 미공개
    const rows = filtered.map(x => ({
      "관심":          favorites.has(x.id) ? "★" : "",
      "관리번호":      displayNo[x.id] ?? x.id,
      "내부ID":        x.id,
      "등록일자":      x.created_at_label ?? "—",
      "지역":          x.region,
      "주소(동단위)":  x.address_dong ?? maskAddress(x.region),
      "유형":          x.collateral,
      "토지면적(㎡)":  x.land_area_m2 ?? "—",
      "토지면적(평)":  typeof x.land_area_m2 === "number" ? Math.round((x.land_area_m2 / PYEONG_M2) * 10) / 10 : "—",
      "건물면적(㎡)":  x.building_area_m2 ?? "—",
      "건물면적(평)":  typeof x.building_area_m2 === "number" ? Math.round((x.building_area_m2 / PYEONG_M2) * 10) / 10 : "—",
      "감정가(원)":    x.appraisal_value,
      "총 채권액(원)":  x.outstanding_principal,
      "수익권금액(채권최고액)(원)": typeof x.max_claim === "number" && x.max_claim > 0 ? x.max_claim : "—",
      "협의가(원)":    x.asking_price,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "거래소 매물")
    XLSX.writeFile(wb, `NPLatform_NPL리스트_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [filtered, favorites, displayNo])

  return (
    <MckPageShell variant="tint">

      {/* ── 데모 모드 배너 · McKinsey ──────────────── */}
      {isDemoMode && !demoDismissed && (
        <MckDemoBanner
          message={`체험 모드 — 샘플 매물 ${MOCK.length}건을 표시 중입니다. 실제 등록된 매물이 없습니다.`}
          ctaHref="/exchange/sell"
          ctaLabel="매물 등록하기"
        />
      )}

      {/* ── McKinsey 헤더 ─────────────────────────────────── */}
      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "NPL 자동매칭" },
        ]}
        eyebrow="Private Deal · NDA 기반"
        title={tr("NPL 자동매칭")}
        subtitle={tr("기본 정보만 공개 — 주소 · 서류 · 상세 자료는 NDA 승인 후 열람 가능합니다. 채권기관 · 담당자 정보는 공개되지 않습니다.")}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/exchange/sell"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.brass}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tr("NPL 매각의뢰")} <ArrowRight size={14} />
            </Link>
            <Link
              href="/exchange/demands/new"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tr("매입조건 등록")}
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · McKinsey impact ───────────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              // 운영 관리자(/admin/main-stats) 입력값 자동연동 — 메인과 동일 수치
              { label: tr("NPL 등록 수"),       value: mainStats.nplCount,        hint: tr("실시간 집계") },
              { label: tr("감정평가 총액"),     value: mainStats.appraisalTotal,  hint: tr("누적") },
              { label: tr("근저당권 설정금액"), value: mainStats.mortgageTotal,   hint: tr("누적") },
              { label: tr("참여 기관"),         value: mainStats.institutions,    hint: tr(PLATFORM_STATS.institutionsDesc) },
            ]}
          />
        </div>
      </section>

      {/* ── Filter bar ─────────────────────────────── */}
      <section
        style={{
          position: "sticky", top: 64, zIndex: 10,
          backgroundColor: V.surfaceBase,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${V.borderSubtle}`,
        }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 24px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search — 일반 검색만 (AI 검색 미노출, 2026-08 피벗) */}
            <div
              style={{
                flex: "1 1 280px", minWidth: 240,
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px",
                backgroundColor: V.surfaceElevated,
                border: `1px solid ${V.borderSubtle}`,
                borderRadius: 10,
                transition: "all 0.2s",
              }}
            >
              <Search size={15} color={V.textMuted} />
              <input
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
                placeholder="지역 · 유형 · 관리번호 검색"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: V.textPrimary, fontSize: 13,
                }}
              />
            </div>

            <button
              onClick={() => setFiltersOpen(v => !v)}
              style={{
                padding: "9px 14px", borderRadius: 10,
                backgroundColor: filtersOpen ? V.surfaceSunken : V.surfaceElevated,
                border: `1px solid ${V.borderSubtle}`,
                color: V.textPrimary, fontSize: 12, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 6,
                cursor: "pointer",
              }}
            >
              <SlidersHorizontal size={14} /> {tr("필터")}
            </button>

            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{
                padding: "9px 14px", borderRadius: 10,
                backgroundColor: V.surfaceElevated, border: `1px solid ${V.borderSubtle}`,
                color: V.textPrimary, fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="recent">{tr("최신순")}</option>
              <option value="appraisal_desc">{tr("감정가 큰순")}</option>
              <option value="principal_desc">{tr("채권잔액 큰순")}</option>
            </select>

            {/* ㎡/평 단위 토글 — 토지/건물면적 표시 단위 (목록 전체 공통) */}
            <div
              role="group"
              aria-label="면적 단위"
              style={{
                display: "inline-flex",
                padding: 3,
                backgroundColor: V.surfaceElevated,
                border: `1px solid ${V.borderSubtle}`,
                borderRadius: 10,
                gap: 2,
              }}
            >
              {([
                { key: "m2" as AreaUnit, label: "㎡" },
                { key: "py" as AreaUnit, label: "평" },
              ]).map(({ key, label }) => {
                const active = areaUnit === key
                return (
                  <button
                    key={key}
                    aria-pressed={active}
                    onClick={() => setAreaUnit(key)}
                    title="토지/건물면적 표시 단위"
                    style={{
                      padding: "6px 11px",
                      borderRadius: 8,
                      fontSize: 11, fontWeight: 700,
                      backgroundColor: active ? V.surfaceSunken : "transparent",
                      color: active ? V.textPrimary : V.textMuted,
                      border: "none", cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              style={{
                marginTop: 12, paddingTop: 12,
                borderTop: `1px solid ${V.borderSubtle}`,
                // 세로 스택 — 각 필터 그룹이 전체 폭 사용 (쏠림 방지)
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <FilterGroup label={tr("매물 유형")} options={LISTING_CATEGORY_FILTER.map(o => ({ ...o, label: tr(o.label) }))} value={listingCategory} onChange={v => { setListingCategory(v); setPage(1) }} />
              <CollateralFilterGroup
                major={collateral}
                minor={collateralMinor}
                onMajorChange={v => { setCollateral(v); setCollateralMinor("ALL"); setPage(1) }}
                onMinorChange={v => { setCollateralMinor(v); setPage(1) }}
                tr={tr}
              />
              <FilterGroup label={tr("지역")} options={REGION_FILTER} value={region} onChange={v => { setRegion(v); setPage(1) }} />
              {/* 기관유형 · 매각방식 필터 삭제 (2026-08-17 정책 — 리스트 단계 비공개 정보) */}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Listing Grid ───────────────────────────── */}
      <section>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 24px 80px" }}>
          {/* ── 활성 필터 태그 ─────────────────────────── */}
          {(collateral !== "ALL" || collateralMinor !== "ALL" || region !== "ALL" || instType !== "ALL" || stage !== "ALL" || listingCategory !== "ALL") && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: V.textMuted, fontWeight: 700, marginRight: 2 }}>{tr("적용 필터:")}</span>
              {listingCategory !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("유형")}: ${tr(LISTING_CATEGORY_FILTER.find(o => o.value === listingCategory)?.label ?? "")}`}
                  onRemove={() => setListingCategory("ALL")}
                />
              )}
              {collateral !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("담보")}: ${COLLATERAL_MAJOR_FILTER.find(o => o.value === collateral)?.icon} ${tr(COLLATERAL_MAJOR_FILTER.find(o => o.value === collateral)?.label ?? "")}${collateralMinor !== "ALL" ? ` › ${tr(COLLATERAL_MINOR_MAP[collateral]?.find(o => o.value === collateralMinor)?.label ?? collateralMinor)}` : ""}`}
                  onRemove={() => { setCollateral("ALL"); setCollateralMinor("ALL") }}
                />
              )}
              {collateral !== "ALL" && collateralMinor !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("세부")}: ${tr(COLLATERAL_MINOR_MAP[collateral]?.find(o => o.value === collateralMinor)?.label ?? collateralMinor)}`}
                  onRemove={() => setCollateralMinor("ALL")}
                  color="brand"
                />
              )}
              {region !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("지역")}: ${region}`}
                  onRemove={() => setRegion("ALL")}
                />
              )}
              {instType !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("기관")}: ${tr(SELLER_INSTITUTIONS[instType as keyof typeof SELLER_INSTITUTIONS] ?? "")}`}
                  onRemove={() => setInstType("ALL")}
                />
              )}
              {stage !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("매각")}: ${tr(SALE_METHODS[stage as keyof typeof SALE_METHODS] ?? "")}`}
                  onRemove={() => setStage("ALL")}
                />
              )}
              <button
                onClick={() => {
                  setListingCategory("ALL"); setCollateral("ALL"); setCollateralMinor("ALL")
                  setRegion("ALL"); setInstType("ALL"); setStage("ALL"); setPage(1)
                }}
                style={{
                  padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                  backgroundColor: `color-mix(in srgb, ${V.danger} 10%, transparent)`,
                  color: V.danger,
                  border: `1px solid color-mix(in srgb, ${V.danger} 25%, transparent)`,
                  cursor: "pointer",
                }}
              >
                {tr("전체 초기화")}
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {hasDemands ? (
                <div style={{ fontSize: 13, color: V.textTertiary }}>
                  <span style={{ color: V.textPrimary, fontWeight: 700 }}>{visible.length}</span>건 매칭
                </div>
              ) : (
                // 매입조건 미등록 — 매칭 수 대신 안내 표기
                <Link href="/exchange/demands/new" style={{ fontSize: 13, fontWeight: 700, color: "#1A47CC", textDecoration: "none" }}>
                  매입조건 등록 시 매칭 진행
                </Link>
              )}
              {/* 관심만 보기 토글 — 하트 등록 매물 리스트 */}
              <button
                onClick={() => { setFavOnly(v => !v); setPage(1) }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 11px", borderRadius: 10,
                  backgroundColor: favOnly ? "rgba(225, 29, 72, 0.08)" : V.surfaceElevated,
                  border: `1px solid ${favOnly ? "#E11D48" : V.borderSubtle}`,
                  color: favOnly ? "#E11D48" : V.textSecondary,
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Heart size={12} fill={favOnly ? "#E11D48" : "none"} />
                관심만 {favorites.size > 0 ? `(${favorites.size})` : ""}
              </button>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {/* Excel download */}
              <button
                onClick={handleExcelDownload}
                title="현재 필터 결과를 엑셀로 다운로드"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 12px", borderRadius: 10,
                  backgroundColor: V.surfaceElevated,
                  border: `1px solid ${V.borderSubtle}`,
                  color: V.textSecondary,
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Download size={13} />
                {tr("엑셀")}
              </button>

              {/* View toggle */}
              <div
                role="tablist"
                aria-label="보기 방식"
                style={{
                  display: "inline-flex",
                  padding: 3,
                  backgroundColor: V.surfaceElevated,
                  border: `1px solid ${V.borderSubtle}`,
                  borderRadius: 10,
                  gap: 2,
                }}
              >
                {([
                  { key: "card" as ViewMode, label: tr("카드"), Icon: LayoutGrid },
                  { key: "list" as ViewMode, label: tr("리스트"), Icon: ListIcon },
                ]).map(({ key, label, Icon }) => {
                  const active = view === key
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      aria-label={`${label} 보기`}
                      onClick={() => handleViewChange(key)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 11px",
                        borderRadius: 8,
                        fontSize: 11, fontWeight: 700,
                        backgroundColor: active ? V.surfaceSunken : "transparent",
                        color: active ? V.textPrimary : V.textMuted,
                        border: "none", cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          {aiRecommendation && (
            <div
              style={{
                marginBottom: 16, padding: "14px 16px",
                backgroundColor: `color-mix(in srgb, ${V.purple} 4%, transparent)`,
                border: `1px solid color-mix(in srgb, ${V.purple} 20%, transparent)`,
                borderRadius: 12,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <Sparkles size={16} color={V.purple} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: V.textTertiary, lineHeight: 1.55 }}>
                <strong style={{ color: V.textPrimary }}>AI 추천:</strong> {aiRecommendation}
              </div>
              <button
                onClick={() => setAiRecommendation("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: V.textMuted, fontSize: 11, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )}

          {listingsLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", backgroundColor: V.surfaceElevated, borderRadius: 10, marginBottom: 16, fontSize: 12, color: V.textMuted }}>
              <Loader2 size={14} className="animate-spin" />
              매물 목록을 불러오는 중...
            </div>
          )}

          {/* ── 비로그인 배너 — 회원가입/로그인 + 매입조건 등록 후 실제 매칭 공개 ── */}
          {guestMode && (
            <div
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "16px 18px", marginBottom: 16,
                background: "#0A1628", borderTop: "3px solid #2251FF",
              }}
            >
              <LockIcon size={15} style={{ color: "#00A9F4", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#FFFFFF", wordBreak: "keep-all" }}>
                  회원가입 · 로그인 후 매입조건을 등록하셔야 실제 NPL 자동매칭 정보가 공개됩니다
                </p>
                <p style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                  아래 리스트는 이해를 돕기 위한 NPL 자동매칭 샘플입니다. 가입은 무료 (관리자 승인제)
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/login?redirect=/exchange"
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 800, background: "#FFFFFF", color: "#0A1628", textDecoration: "none" }}>
                    로그인
                  </Link>
                  <Link href="/signup"
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "transparent", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.35)", textDecoration: "none" }}>
                    회원가입
                  </Link>
                  <Link href="/exchange/demands/new"
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 800, background: "#2251FF", color: "#FFFFFF", textDecoration: "none" }}>
                    매입조건 등록
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* D5 — 알림 구간 보기 배너: 알림 링크로 진입 시 기준일 고정 표시 */}
          {alertFrom && !guestMode && (
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 mb-4" style={{ background: "#0A1628", borderTop: "3px solid #2251FF" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#FFFFFF" }}>
                🔔 알림 구간 보기 — <span style={{ fontVariantNumeric: "tabular-nums" }}>{alertFrom}</span>
                {alertUntil ? <> ~ <span style={{ fontVariantNumeric: "tabular-nums" }}>{alertUntil}</span></> : " 이후"} 등록 {filtered.length}건
              </div>
              <Link
                href="/exchange"
                style={{ padding: "6px 14px", fontSize: 11, fontWeight: 800, background: "#FFFFFF", color: "#0A1628", textDecoration: "none" }}
              >
                전체 보기
              </Link>
            </div>
          )}
          {(visible.length === 0 && !guestMode) ? (
            <div
              style={{
                padding: "80px 24px", textAlign: "center",
                backgroundColor: V.surfaceElevated, border: `1px dashed ${V.borderSubtle}`, borderRadius: 14,
              }}
            >
              <Filter size={32} color={V.textMuted} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: V.textPrimary, marginBottom: 6 }}>
                현재 매수조건에 적합한 NPL 리스트는 없습니다
              </div>
              <div style={{ fontSize: 12.5, color: V.textTertiary, marginBottom: 16 }}>
                매입조건을 등록·수정하시면 조건에 맞는 딜이 공개됩니다.
              </div>
              <Link
                href="/exchange/demands/new"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "11px 20px",
                  background: "#0A1628", color: "#FFFFFF",
                  borderTop: "2px solid #2251FF",
                  fontSize: 12.5, fontWeight: 800, textDecoration: "none",
                }}
              >
                매입조건 등록하기 <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
          <div style={{ position: "relative" }}>
          {view === "card" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 18,
                // 샘플 모드 — 카드 전체 블러 (카드형은 헤더 없음)
                ...(guestMode ? { filter: "blur(3px)", pointerEvents: "none", userSelect: "none" } : {}),
              }}
              aria-hidden={guestMode}
            >
              {(guestMode ? GUEST_SAMPLES : paginatedItems).map((x, i) => (
                <ListingCard key={x.id} item={x} index={i} areaUnit={areaUnit} fav={favorites.has(x.id)} onToggleFav={toggleFavorite} onNda={openNda} no={guestMode ? x.id : displayNo[x.id]} />
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: V.surfaceElevated,
                border: `1px solid ${V.borderSubtle}`,
                borderRadius: 14,
                overflowX: "auto",
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "30px 84px 1fr 1.2fr 0.7fr 0.55fr 0.55fr 0.62fr 0.62fr 0.68fr 0.62fr 88px",
                  gap: 8,
                  padding: "10px 14px",
                  backgroundColor: V.surfaceSunken,
                  borderBottom: `1px solid ${V.borderSubtle}`,
                  fontSize: 10,
                  fontWeight: 700,
                  color: V.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <div>관심</div>
                <div>사진</div>
                <div>관리번호 · 등록일</div>
                <div>지역 · 주소</div>
                <div>유형</div>
                <div>토지면적</div>
                <div>건물면적</div>
                <div>감정가</div>
                <div>총 채권액</div>
                <div style={{ lineHeight: 1.3 }}>수익권금액<br /><span style={{ fontWeight: 600, opacity: 0.75 }}>(채권최고액)</span></div>
                <div>협의가</div>
                <div>NDA</div>
              </div>
              {/* 샘플 모드 — 헤더(상단 구성 항목)는 그대로 보이고 행 내용만 블러 */}
              <div style={guestMode ? { filter: "blur(3px)", pointerEvents: "none", userSelect: "none" } : undefined} aria-hidden={guestMode}>
                {(guestMode ? GUEST_SAMPLES : paginatedItems).map((x, i) => (
                  <ListingRow key={x.id} item={x} index={i} areaUnit={areaUnit} fav={favorites.has(x.id)} onToggleFav={toggleFavorite} onNda={openNda} nplStatus={statusMap[x.id]} no={guestMode ? x.id : displayNo[x.id]} onOpenDetail={setDetailTarget} />
                ))}
              </div>
            </div>
          )}

          {/* 샘플 워터마크 — 블러 위 중앙 라벨 */}
          {guestMode && (
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  padding: "12px 26px",
                  background: "rgba(10, 22, 40, 0.88)",
                  borderTop: "3px solid #2251FF",
                  color: "#FFFFFF",
                  fontSize: 16, fontWeight: 800, letterSpacing: "0.02em",
                  boxShadow: "0 16px 40px -8px rgba(5, 28, 44, 0.45)",
                }}
              >
                NPL 자동매칭 샘플
              </span>
            </div>
          )}
          </div>
          )}

          {/* ── 매칭 게이팅 안내 — 10건 프리뷰 이후 비공개 ── */}
          {gated && (
            <div
              style={{
                marginTop: 20,
                padding: "36px 24px",
                textAlign: "center",
                backgroundColor: "#0A1628",
                borderTop: "3px solid #2251FF",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "#00A9F4", textTransform: "uppercase", marginBottom: 10 }}>
                Private Deal · 선별 공개
              </div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.1rem, 2.4vw, 1.5rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.015em", lineHeight: 1.35, wordBreak: "keep-all" }}>
                매입조건에 매칭되지 않는 NPL 딜은 공개되지 않습니다.
              </p>
              <p style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                매입조건을 등록하시면 조건에 맞는 딜만 선별하여 1:1 로 공개해 드립니다.
              </p>
              <Link
                href="/exchange/demands/new"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 18, padding: "12px 24px",
                  background: "#2251FF", color: "#FFFFFF",
                  fontSize: 13, fontWeight: 800, textDecoration: "none",
                }}
              >
                매입조건 등록하기 <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* ── Pagination ────────────────────────────── */}
          {visible.length > 0 && !gated && (
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {/* Per page selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: V.textMuted }}>페이지당</span>
                <select
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    backgroundColor: V.surfaceElevated, border: `1px solid ${V.borderSubtle}`,
                    color: V.textPrimary, fontSize: 12, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {[10, 30, 50, 100].map(n => (
                    <option key={n} value={n}>{n}개</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: V.textTertiary }}>
                  총 {visible.length}건 중 {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, visible.length)}
                </span>
              </div>

              {/* Page buttons */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <PaginationBtn
                    label="‹"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  />
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push("...")
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} style={{ padding: "0 4px", color: V.textMuted, fontSize: 12 }}>…</span>
                      ) : (
                        <PaginationBtn
                          key={p}
                          label={String(p)}
                          active={p === safePage}
                          onClick={() => setPage(p as number)}
                        />
                      )
                    )}
                  <PaginationBtn
                    label="›"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 세부내역 우측 패널 — 매입 회원 열람 (NDA 게이트는 패널 내부에서 적용) ── */}
      {detailTarget && (
        <DetailPane listingId={detailTarget} listingNo={displayNo[detailTarget]} viewerMode onClose={() => setDetailTarget(null)} />
      )}

      {/* ── NDA 전자계약 모달 — 자체 기능 (서명패드 + /api/v1/nda 기록) ── */}
      {ndaTarget && (
        <NdaModal
          open={!!ndaTarget}
          onClose={() => setNdaTarget(null)}
          // NDA 는 관리번호 기준 — 다른 명칭 표기 없음 (2026-08-18 사용자 정책)
          listingTitle={`관리번호 ${displayNo[ndaTarget.id] ?? ndaTarget.id}`}
          listingId={displayNo[ndaTarget.id] ?? ndaTarget.id}
          state={ndaStates[ndaTarget.id] ?? ({ status: 'none' } as NdaState)}
          onSubmit={submitNda}
        />
      )}
    </MckPageShell>
  )
}

/* ═══════════════════════════════════════════════════════════
   ActiveFilterChip — 활성 필터 태그
═══════════════════════════════════════════════════════════ */
function ActiveFilterChip({
  label, onRemove, color = "default",
}: {
  label: React.ReactNode
  onRemove: () => void
  color?: "default" | "brand"
}) {
  const accent = color === "brand" ? V.brandBright : V.positive
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 8px 3px 10px", borderRadius: 999,
        fontSize: 10, fontWeight: 700,
        backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
        color: accent,
        border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: accent, fontSize: 10, lineHeight: 1, padding: 0,
          display: "flex", alignItems: "center",
          opacity: 0.75,
        }}
        aria-label="필터 제거"
      >
        ✕
      </button>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   FilterGroup (chip style)
═══════════════════════════════════════════════════════════ */
function FilterGroup({
  label, options, value, onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    // 라벨 좌측 고정폭 + 칩 우측 흐름 — 전체 폭 사용으로 쏠림 방지
    <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 10, alignItems: "start" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: V.textMuted, paddingTop: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(op => {
          const active = op.value === value
          return (
            <button
              key={op.value}
              onClick={() => onChange(op.value)}
              style={{
                padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                backgroundColor: active ? `color-mix(in srgb, ${V.positive} 12%, transparent)` : V.surfaceElevated,
                color: active ? V.positive : V.textTertiary,
                border: `1px solid ${active ? `color-mix(in srgb, ${V.positive} 33%, transparent)` : V.borderSubtle}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {op.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CollateralFilterGroup — 2단계 담보 유형 필터
═══════════════════════════════════════════════════════════ */
function CollateralFilterGroup({
  major, minor, onMajorChange, onMinorChange, tr: _tr,
}: {
  major: string
  minor: string
  onMajorChange: (v: string) => void
  onMinorChange: (v: string) => void
  tr?: (text: string) => string
}) {
  const minorOptions = major !== "ALL" ? COLLATERAL_MINOR_MAP[major] : null

  return (
    // 라벨 좌측 고정폭 + 칩 우측 흐름 (FilterGroup 과 동일 정렬)
    <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 10, alignItems: "start" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: V.textMuted, paddingTop: 6 }}>{_tr ? _tr("담보 유형") : "담보 유형"}</div>
      <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COLLATERAL_MAJOR_FILTER.map(op => {
          const active = op.value === major
          return (
            <button
              key={op.value}
              onClick={() => onMajorChange(op.value)}
              style={{
                padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 4,
                backgroundColor: active
                  ? `color-mix(in srgb, ${V.positive} 14%, transparent)`
                  : V.surfaceElevated,
                color: active ? V.positive : V.textTertiary,
                border: `1px solid ${active
                  ? `color-mix(in srgb, ${V.positive} 35%, transparent)`
                  : V.borderSubtle}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 12 }}>{op.icon}</span>
              {_tr ? _tr(op.label) : op.label}
            </button>
          )
        })}
      </div>

      {/* 소분류 — 대분류 선택 시 슬라이드인 */}
      {minorOptions && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            paddingLeft: 12,
            borderLeft: `2px solid color-mix(in srgb, ${V.positive} 28%, transparent)`,
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span
            style={{
              fontSize: 9, fontWeight: 700, color: V.textMuted,
              alignSelf: "center", marginRight: 4, whiteSpace: "nowrap",
            }}
          >
            {_tr ? _tr("세부") : "세부"}
          </span>
          {minorOptions.map(op => {
            const active = op.value === minor
            return (
              <button
                key={op.value}
                onClick={() => onMinorChange(op.value)}
                style={{
                  padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${V.brandBright} 14%, transparent)`
                    : `color-mix(in srgb, ${V.textMuted} 6%, transparent)`,
                  color: active ? V.brandBright : V.textTertiary,
                  border: `1px solid ${active
                    ? `color-mix(in srgb, ${V.brandBright} 35%, transparent)`
                    : `color-mix(in srgb, ${V.textMuted} 14%, transparent)`}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {op.label}
              </button>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ListingCard
═══════════════════════════════════════════════════════════ */
function ListingCard({ item, index, areaUnit, fav, onToggleFav, onNda, no }: { item: CardListing; index: number; areaUnit: AreaUnit; fav: boolean; onToggleFav: (id: string) => void; onNda: (item: CardListing) => void; no?: string }) {
  const router = useRouter()
  const principal = formatKRW(item.outstanding_principal)
  const asking = formatKRW(item.asking_price)
  const appraisal = formatKRW(item.appraisal_value)
  const landArea = formatArea(item.land_area_m2, areaUnit)
  const buildingArea = formatArea(item.building_area_m2, areaUnit)

  /*
    McKinsey Editorial Card v6 — White Paper + Ink + 1-point Accent
    원칙: 색을 채우지 않는다. typography hierarchy 로 위계.
    - 카드 자체 = 흰 종이 (#FFFFFF, 다크 모드도 동일 — .mck-paper escape)
    - 본문 = ink (#0A1628) + 회색 단계 (#3A4A5C, #6B7280)
    - 강조 = size + weight (색 ≠ 강조). 협의가 1점만 hero.
    - sharp edge (radius 0), 1px hairline, 검정 CTA + 흰 글씨
    - 노출 필드 9개 고정: 관리번호·지역·주소(마스킹)·유형·토지/건물면적·감정가·채권잔액·협의가
  */
  return (
    <motion.article
      className="mck-paper"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4 }}
      // 카드 클릭 → 세부내역 (NDA 승인된 매입사만 열람 가능)
      onClick={() => router.push(`/listing-detail/${encodeURIComponent(item.id)}?mode=view`)}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(5, 28, 44, 0.10)",
        borderTop: "2px solid var(--color-editorial-gold, #2251FF)",
        borderRadius: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 24px -8px rgba(5, 28, 44, 0.15), 0 4px 8px -2px rgba(5, 28, 44, 0.08)",
        cursor: "pointer",
      }}
    >
      {/* Header strip — institution + tier */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid rgba(5, 28, 44, 0.10)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 0,
              backgroundColor: "#F5F5F5",
              border: "1px solid rgba(5, 28, 44, 0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Building2 size={13} color="rgba(5, 28, 44, 0.55)" />
          </div>
          <div>
            <div
              style={{ fontSize: 11, fontWeight: 700, color: "#0A1628", lineHeight: 1.2, letterSpacing: "-0.005em" }}
              title="채권기관·담당자 정보는 공개되지 않습니다 (협의 과정에서 운영사가 연결)"
            >
              {maskInstitutionName(item.institution)}
            </div>
            <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.50)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em" }}>
              채권기관 비공개 (운영사 중개)
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 9, color: "rgba(5, 28, 44, 0.45)", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap",
            }}
          >
            Private Deal
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFav(item.id) }}
            aria-label={fav ? "관심 해제" : "관심 등록"}
            style={{ background: "transparent", border: 0, cursor: "pointer", padding: 2, lineHeight: 0 }}
          >
            <Heart size={16} fill={fav ? "#E11D48" : "none"} color={fav ? "#E11D48" : "rgba(5, 28, 44, 0.40)"} />
          </button>
        </div>
      </div>

      {/* 사진 — 대표 이미지 (없으면 placeholder) */}
      <div style={{ aspectRatio: "16 / 10", minHeight: 190, backgroundColor: "#F1F4F7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(5, 28, 44, 0.08)" }}>
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center", color: "rgba(5, 28, 44, 0.35)" }}>
            <Building2 size={24} style={{ margin: "0 auto 4px" }} />
            <div style={{ fontSize: 10, fontWeight: 600 }}>사진 준비중</div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
        {/* Title row — 지역 · 유형 · 주소(마스킹) · 관리번호 */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em" }}>
            <MapPin size={10} /> {item.region}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.012em", lineHeight: 1.25 }}>
            {item.collateral} 담보
          </div>
          <div
            style={{ fontSize: 11, color: "rgba(5, 28, 44, 0.55)", marginTop: 4, fontWeight: 600 }}
            title="세부주소는 NDA 승인 후 공개 (채권기관·담당자 정보는 미공개)"
          >
            {item.address_dong ?? maskAddress(item.region)}
          </div>
          <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.40)", marginTop: 4, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {no ?? item.id} · 등록 {item.created_at_label ?? "—"}
            {item.created_days_ago <= 3 && (
              <span className="npl-badge-new" style={{ marginLeft: 6, padding: "2px 6px", fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1.2, borderRadius: 2 }}>NEW</span>
            )}
          </div>
        </div>

        {/* HERO 숫자 = 협의가 (큰 ink 검정) */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(5, 28, 44, 0.55)", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>
            협의가
          </div>
          <div style={{ fontSize: 23, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {asking}
          </div>
        </div>

        {/* Sub metrics — 감정가 · 채권잔액 · 토지/건물면적 (2×2)
            상단 electric accent strip 유지 → McKinsey 톤 시그니처 보존 */}
        <div
          style={{
            background: "#FFFFFF",
            borderTop: "3px solid #2251FF",                       /* MCK.electric accent strip */
            padding: "10px 0 8px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <SubMetric label="감정가" value={appraisal} />
            <SubMetric label="총 채권액" value={principal} />
            <SubMetric label="토지면적" value={landArea} />
            <SubMetric label="건물면적" value={buildingArea} />
          </div>
        </div>

        {/* CTA — 관심 등록 · NDA 요청. /deals/dealroom?listingId=... 에 NDA 플로우 존재.
            ListingCard CTA 자체도 명시적으로 listingId 쿼리를 넘겨 딜룸 SoT 흐름을 보장. */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNda(item) }}
          style={{
            width: "100%", border: "none", cursor: "pointer",
            marginTop: 4,
            padding: "9px 12px",
            borderRadius: 4,
            fontSize: 12, fontWeight: 800,
            textAlign: "center",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
            letterSpacing: "0.04em",
          }}
          className="mck-cta-sky"
        >
          <span>NDA 요청</span>
          <ArrowRight size={14} />
        </button>

        {/* 관리자 / 매각사(본인) 만 노출 — 라벨을 명시 표기.
            ADMIN 이면 "관리자 편집", SELLER 본인이면 "매물 편집" 으로 자동 분기 (컴포넌트 내부) */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <OwnerEditButton
            resourceType="listing"
            resourceId={item.id}
            ownerId={item.seller_id ?? null}
          />
        </div>
      </div>
    </motion.article>
  )
}

/** 작은 라벨 + 숫자 — McKinsey Sub Metric (paper variant) */
function SubMetric({ label, value, brass }: { label: string; value: string; brass?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(5, 28, 44, 0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 800,
        color: brass ? "var(--color-editorial-gold, #2251FF)" : "#0A1628",
        letterSpacing: "-0.01em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </div>
  )
}

/** SubMetric dark variant — McKinsey navy panel: 라벨/값 모두 흰색 (사용자 요청) */
function SubMetricDark({ label, value, cyan: _cyan }: { label: string; value: string; cyan?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9, fontWeight: 800,
          color: "#FFFFFF",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 800,
        fontFamily: "Georgia, 'Times New Roman', 'Noto Serif KR', serif",
        color: "#FFFFFF",
        letterSpacing: "-0.015em",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.05,
      }}>
        {value}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ListingRow (list/table view)
═══════════════════════════════════════════════════════════ */
function ListingRow({ item, index, areaUnit, fav, onToggleFav, onNda, nplStatus, no, onOpenDetail }: { item: CardListing; index: number; areaUnit: AreaUnit; fav: boolean; onToggleFav: (id: string) => void; onNda: (item: CardListing) => void; nplStatus?: string; no?: string; onOpenDetail?: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.2), duration: 0.25 }}
      // 행 클릭 → 세부내역 우측 패널 (NDA 승인된 매입 회원만 열람 · 승인 전 잠금 안내)
      onClick={() => onOpenDetail?.(item.id)}
      style={{
        display: "grid",
        gridTemplateColumns: "30px 84px 1fr 1.2fr 0.7fr 0.55fr 0.55fr 0.62fr 0.62fr 0.68fr 0.62fr 88px",
        gap: 8,
        padding: "9px 14px",
        borderBottom: `1px solid ${V.borderSubtle}`,
        alignItems: "center",
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {/* 관심등록 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFav(item.id) }}
        aria-label={fav ? "관심 해제" : "관심 등록"}
        style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4, lineHeight: 0 }}
      >
        <Heart size={16} fill={fav ? "#E11D48" : "none"} color={fav ? "#E11D48" : V.textMuted} />
      </button>

      {/* 사진 — 육안 식별 가능한 크기 */}
      <div
        style={{
          width: 82, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0,
          backgroundColor: V.surfaceSunken,
          border: `1px solid ${V.borderSubtle}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center", color: V.textMuted }}>
            <Building2 size={20} style={{ margin: "0 auto 2px" }} />
            <div style={{ fontSize: 9, fontWeight: 600 }}>사진 준비중</div>
          </div>
        )}
      </div>

      {/* 관리번호 (N-XX 자동 채번) · 등록일자 · NPL 상태 */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: V.textPrimary, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.id}>
          {no ?? item.id}
        </div>
        <div style={{ fontSize: 10, color: V.textMuted, marginTop: 2, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 5 }}>
          {item.created_at_label ?? "—"}
          {item.created_days_ago <= 3 && (
            <span className="npl-badge-new" style={{ padding: "2px 6px", fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1.2, borderRadius: 2 }}>NEW</span>
          )}
          {nplStatus && (
            <span
              style={{
                padding: "1px 6px", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap",
                background: nplStatus === "매각완료" ? "rgba(5,150,105,0.10)" : nplStatus === "협의중" ? "rgba(217,119,6,0.10)" : "rgba(34,81,255,0.10)",
                color: nplStatus === "매각완료" ? "#059669" : nplStatus === "협의중" ? "#B45309" : "#1A47CC",
                border: `1px solid ${nplStatus === "매각완료" ? "rgba(5,150,105,0.35)" : nplStatus === "협의중" ? "rgba(217,119,6,0.35)" : "rgba(34,81,255,0.35)"}`,
              }}
            >
              {nplStatus}
            </span>
          )}
        </div>
      </div>

      {/* 지역 · 주소(동단위) */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: V.textPrimary, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <MapPin size={11} color={V.textMuted} style={{ flexShrink: 0 }} /> {item.region}
        </div>
        <div style={{ fontSize: 10, color: V.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title="세부주소는 NDA 승인 후 공개 (채권기관·담당자 정보는 미공개)">
          {item.address_dong ?? maskAddress(item.region)}
        </div>
      </div>

      {/* 유형 — 별도 컬럼 */}
      <div style={{ color: V.textPrimary, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {item.collateral}
      </div>

      {/* 토지면적 */}
      <div style={{ color: V.textPrimary, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {formatArea(item.land_area_m2, areaUnit)}
      </div>

      {/* 건물면적 */}
      <div style={{ color: V.textPrimary, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {formatArea(item.building_area_m2, areaUnit)}
      </div>

      {/* 감정가 */}
      <div style={{ color: V.textPrimary, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatKRW(item.appraisal_value)}
      </div>

      {/* 채권잔액 */}
      <div style={{ color: V.textPrimary, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatKRW(item.outstanding_principal)}
      </div>

      {/* 채권최고액 */}
      <div style={{ color: V.textPrimary, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {typeof item.max_claim === "number" && item.max_claim > 0 ? formatKRW(item.max_claim) : "—"}
      </div>

      {/* 협의가 */}
      <div style={{ color: V.positive, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
        {formatKRW(item.asking_price)}
      </div>

      {/* CTA — 관심 등록 · NDA 요청 (딜룸 SoT 흐름: 매물 ID 기반 직진) */}
      <div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNda(item) }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "7px 10px",
            borderRadius: 8,
            backgroundColor: V.positive,
            color: V.onPositive,
            fontSize: 11, fontWeight: 800,
            whiteSpace: "nowrap",
            border: "none", cursor: "pointer",
          }}
        >
          NDA 요청 <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PaginationBtn
═══════════════════════════════════════════════════════════ */
function PaginationBtn({ label, active, disabled, onClick }: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8,
        fontSize: 12, fontWeight: active ? 800 : 600,
        backgroundColor: active ? V.positive : V.surfaceElevated,
        color: active ? V.onPositive : disabled ? V.textMuted : V.textPrimary,
        border: `1px solid ${active ? V.positive : V.borderSubtle}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  )
}

function Figure({
  label, value, tone, sub,
}: {
  label: string
  value: React.ReactNode
  tone: "em" | "neutral"
  sub?: string
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: V.textMuted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: tone === "em" ? V.positive : V.textPrimary,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9.5, color: V.textTertiary, marginTop: 2, fontWeight: 500, letterSpacing: "-0.005em" }}>
          {sub}
        </div>
      )}
    </div>
  )
}

