'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { exportToExcel, type ExcelColumn } from '@/lib/excel-export'
import {
  Search, Download, ChevronLeft, ChevronRight,
  SlidersHorizontal, X, Star,
  Settings2, RefreshCw, List, AlignJustify, Sparkles,
} from 'lucide-react'
import { GuideButton } from '@/components/guide/guide-button'

// ─── Design System ─────────────────────────────────────────────
const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)", bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)", blue: "var(--color-brand-dark)", amber: "var(--color-warning)",
  purple: "#A855F7", rose: "var(--color-danger)",
  l0: "#FFFFFF", l1: "#F8FAFC", l2: "#F1F5F9", l3: "#E2E8F0",
  lt1: "#0F172A", lt2: "#334155", lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
}

// ─── Column / Category Definitions ─────────────────────────────

const MAJOR_CATEGORIES = [
  '개요', '담보물 정보', '채권 수익성', '채권 상세 정보', '이자',
  '권리관계', '가치평가', '임차인 현황', '매각조건', '경공매 및 기타',
] as const

type MajorCategory = typeof MAJOR_CATEGORIES[number]

/** sub-column label -> data field key mapping */
const subToFieldMap: Record<string, Record<string, string>> = {
  '개요': {
    '등록일': 'up_at',
    '상태': 'status',
    '채권기관': 'creditor_institution',
    '채무자유형': 'is_corporation',
    '담보물 유형': 'type',
  },
  '담보물 정보': {
    '지역': 'sido',
    '용도지역': 'zoning',
    '담보물 주소': 'address',
    '호실 수': 'ho_num',
    '대지면적 ㎡': 'area',
    '전용면적 ㎡': 'building_area',
    '대지평수': 'area_pyeong',
    '전용평수': 'building_area_pyeong',
  },
  '채권 수익성': {
    '원금대비 총 채권액 %': 'claim_profitability',
    '연체금리 수준 %': 'overdue_interest_rate',
  },
  '채권 상세 정보': {
    '총 채권액': 'total_claim_amount',
    '대출잔액': 'loan_balance',
    '대출원금': 'loan_principal',
    '설정금액': 'setting_amount',
  },
  '이자': {
    '정상이자': 'normal_interest',
    '연체이자': 'overdue_interest',
    '미수이자': 'unpaid_interest',
    '대출금리': 'loan_interest_rate',
    '연체금리': 'overdue_interest_rate_val',
  },
  '권리관계': {
    '채권보전방식': 'claim_preservation_method',
    '1순위': 'first_rank',
    '2순위': 'second_rank',
    '수익권금액': 'profit_right_amount',
  },
  '가치평가': {
    '감정가': 'appraisal_value',
    '토지평단가': 'appraisal_value_land_pyeong',
    '공시가격': 'official_price',
    '실거래가평균': 'realdeal_avg',
    'KB시세': 'kb_price_avg',
  },
  '임차인 현황': {
    '선순위임차인': 'priority_lessee_details',
    '보증금': 'deposit',
    '월세': 'monthly_rent',
    '공실여부': 'vacancy_status',
  },
  '매각조건': {
    '최저매각가': 'min_sale_price',
    '매각조건': 'sale_conditions',
    '계약금': 'contract_deposit',
    '잔금일': 'balance_date',
  },
  '경공매 및 기타': {
    '경공매 진행': 'caseno',
    '특이사항': 'etc',
  },
}

/** units for display */
const subToUnitMap: Record<string, string> = {
  '대지면적 ㎡': '㎡', '전용면적 ㎡': '㎡', '대지평수': '평', '전용평수': '평',
  '총 채권액': '만원', '대출잔액': '만원', '대출원금': '만원', '설정금액': '만원',
  '정상이자': '만원', '연체이자': '만원', '미수이자': '만원',
  '대출금리': '%', '연체금리': '%',
  '원금대비 총 채권액 %': '%', '연체금리 수준 %': '%',
  '수익권금액': '만원', '보증금': '만원', '월세': '만원',
  '감정가': '만원', '토지평단가': '만원/평', '공시가격': '만원',
  '실거래가평균': '만원', 'KB시세': '만원',
  '최저매각가': '만원', '계약금': '만원',
}

/** columns that are sortable */
const sortableColumns: Record<string, string[]> = {
  '개요': ['등록일'],
  '담보물 정보': ['호실 수', '대지면적 ㎡', '전용면적 ㎡', '대지평수', '전용평수'],
  '채권 수익성': ['원금대비 총 채권액 %', '연체금리 수준 %'],
  '채권 상세 정보': ['총 채권액', '대출잔액', '대출원금', '설정금액'],
  '이자': ['정상이자', '연체이자', '미수이자', '대출금리', '연체금리'],
  '권리관계': ['수익권금액'],
  '가치평가': ['감정가', '토지평단가', '공시가격', '실거래가평균', 'KB시세'],
  '임차인 현황': ['보증금', '월세'],
  '매각조건': ['최저매각가', '계약금'],
  '경공매 및 기타': [],
}

// ─── Types ─────────────────────────────────────────────────────

interface NplItem {
  id: number
  up_at: string
  status: string
  creditor_institution: string
  is_corporation: string
  type: string
  sido: string
  sigungu: string
  dong: string
  zoning: string
  address: string
  ho_num: number
  area: number
  building_area: number
  area_pyeong: number
  building_area_pyeong: number
  claim_profitability: number
  overdue_interest_rate: number
  total_claim_amount: number
  loan_balance: number
  loan_principal: number
  setting_amount: number
  normal_interest: number
  overdue_interest: number
  unpaid_interest: number
  loan_interest_rate: number
  overdue_interest_rate_val: number
  claim_preservation_method: string
  first_rank: string
  second_rank: string
  profit_right_amount: number
  appraisal_value: number
  appraisal_value_land_pyeong: number
  official_price: number
  realdeal_avg: number
  kb_price_avg: number
  priority_lessee_details: string
  deposit: number
  monthly_rent: number
  vacancy_status: string
  min_sale_price: number
  sale_conditions: string
  contract_deposit: number
  balance_date: string
  caseno: string
  etc: string
}

interface FilterValues {
  sido: string
  sigungu: string
  dong: string
  collateralMain: string
  collateralSub: string
  status: string[]
  debtorType: string[]
  institution: string
  zoning: string
  overdueRateMin: string
  overdueRateMax: string
  totalClaimMin: string
  totalClaimMax: string
  appraisalMin: string
  appraisalMax: string
}

type SortDir = 'asc' | 'desc' | null

// ─── Region / Collateral cascade data ──────────────────────────

const REGION_DATA: Record<string, Record<string, string[]>> = {
  '서울특별시': {
    '강남구': ['삼성동','역삼동','논현동','청담동','대치동','도곡동','개포동','압구정동','신사동','일원동'],
    '서초구': ['서초동','반포동','잠원동','방배동','양재동','내곡동'],
    '송파구': ['잠실동','신천동','가락동','문정동','방이동','오금동','풍납동','석촌동'],
    '마포구': ['합정동','망원동','상수동','서교동','연남동','성산동','중동'],
    '용산구': ['이태원동','한남동','용산동','서빙고동','보광동'],
    '성동구': ['성수동','금호동','옥수동','행당동','응봉동'],
    '강서구': ['화곡동','등촌동','가양동','방화동','마곡동','내발산동'],
    '영등포구': ['여의도동','영등포동','당산동','신길동','양평동','문래동'],
  },
  '경기도': {
    '성남시 분당구': ['정자동','서현동','수내동','판교동','야탑동','이매동'],
    '수원시 영통구': ['영통동','매탄동','원천동','이의동','하동'],
    '고양시 일산동구': ['정발산동','마두동','백석동','장항동','풍동'],
    '용인시 수지구': ['풍덕천동','죽전동','동천동','성복동','상현동'],
    '화성시': ['동탄동','반송동','병점동','진안동','능동'],
    '파주시': ['운정동','금촌동','교하동','야당동','목동동'],
  },
  '부산광역시': {
    '해운대구': ['우동','중동','좌동','반여동','재송동','송정동'],
    '수영구': ['광안동','남천동','민락동','망미동'],
    '부산진구': ['부전동','전포동','범천동','당감동','연지동'],
    '사하구': ['하단동','당리동','괴정동','감천동'],
  },
  '인천광역시': {
    '연수구': ['송도동','연수동','옥련동','동춘동','청학동'],
    '남동구': ['간석동','구월동','만수동','논현동'],
    '부평구': ['부평동','삼산동','십정동','청천동'],
  },
  '대전광역시': {
    '유성구': ['봉명동','장대동','구암동','덕명동','도룡동'],
    '서구': ['둔산동','탄방동','월평동','갈마동','내동'],
  },
  '대구광역시': {
    '수성구': ['범어동','만촌동','수성동','지산동','두산동'],
    '중구': ['동인동','삼덕동','남산동','대봉동'],
  },
  '광주광역시': {
    '서구': ['치평동','농성동','화정동','풍암동','금호동'],
    '북구': ['용봉동','운암동','문흥동','오치동'],
  },
  '세종특별자치시': {
    '세종시': ['나성동','어진동','다정동','보람동','새롬동'],
  },
  '충청남도': {
    '천안시 서북구': ['쌍용동','불당동','성정동','백석동'],
    '아산시': ['배방읍','온양동','탕정면','둔포면'],
  },
  '전라남도': {
    '여수시': ['학동','여서동','웅천동','소라면'],
    '순천시': ['조례동','왕조동','연향동','풍덕동'],
  },
}

const COLLATERAL_DATA: Record<string, string[]> = {
  '주거용': ['아파트', '빌라(다세대)', '다가구', '오피스텔', '단독주택', '타운하우스'],
  '상업·산업용': ['상가', '오피스', '공장', '지식산업센터', '창고', '물류센터', '호텔·숙박'],
  '토지': ['대지', '임야', '전·답', '잡종지', '공장용지'],
}

const STATUS_OPTIONS = ['진행 중', '협의 중', '매각 완료', '준비 중']
const DEBTOR_TYPE_OPTIONS = ['개인', '법인']

const INSTITUTIONS = [
  'KB국민은행','신한은행','우리은행','하나은행','IBK기업은행',
  'NH농협은행','캠코','SC제일은행','한국산업은행','수협은행',
]

// ─── Mock data generator ───────────────────────────────────────

function generateMockData(): NplItem[] {
  const types = ['아파트','상가','토지','오피스텔','빌라(다세대)','공장','다가구','지식산업센터','오피스','창고']
  const statuses = STATUS_OPTIONS
  const debtorTypes = ['개인','법인']
  const zonings = ['제1종일반주거지역','제2종일반주거지역','제3종일반주거지역','준주거지역','일반상업지역','준공업지역','자연녹지지역','계획관리지역']
  const preservations = ['근저당','질권','가압류','근저당+질권','근저당+가압류']
  const saleConditions = ['일괄매각','개별매각','경쟁입찰','수의계약','공개입찰']
  const vacancies = ['공실','만실','일부공실']
  const lessees = ['없음','1건','2건','3건 이상']

  const allRegions: { sido: string; sigungu: string; dong: string }[] = []
  Object.entries(REGION_DATA).forEach(([sido, sigungus]) => {
    Object.entries(sigungus).forEach(([sigungu, dongs]) => {
      dongs.forEach(dong => {
        allRegions.push({ sido, sigungu, dong })
      })
    })
  })

  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  const randF = (min: number, max: number, dec = 2) => +(Math.random() * (max - min) + min).toFixed(dec)

  const items: NplItem[] = []
  for (let i = 1; i <= 40; i++) {
    const region = allRegions[rand(0, allRegions.length - 1)]
    const tp = types[rand(0, types.length - 1)]
    const principal = rand(5000, 200000)
    const balance = Math.round(principal * randF(0.8, 1.2))
    const totalClaim = Math.round(balance * randF(1.0, 1.4))
    const settingAmt = Math.round(principal * randF(1.1, 1.5))
    const appraisal = rand(8000, 500000)
    const officialP = Math.round(appraisal * randF(0.6, 0.9))
    const area = randF(30, 800, 1)
    const buildingArea = randF(20, 400, 1)
    const loanRate = randF(2.5, 7.5, 2)
    const overdueRate = randF(8, 25, 2)
    const normalInt = rand(100, 5000)
    const overdueInt = rand(200, 8000)
    const unpaidInt = rand(50, 3000)

    const year = rand(2023, 2025)
    const month = String(rand(1, 12)).padStart(2, '0')
    const day = String(rand(1, 28)).padStart(2, '0')

    items.push({
      id: i,
      up_at: `${year}-${month}-${day}`,
      status: statuses[rand(0, statuses.length - 1)],
      creditor_institution: INSTITUTIONS[rand(0, INSTITUTIONS.length - 1)],
      is_corporation: debtorTypes[rand(0, 1)],
      type: tp,
      sido: region.sido,
      sigungu: region.sigungu,
      dong: region.dong,
      zoning: zonings[rand(0, zonings.length - 1)],
      address: `${region.sido} ${region.sigungu} ${region.dong} ${rand(1, 500)}번지`,
      ho_num: tp === '토지' ? 0 : rand(1, 300),
      area,
      building_area: buildingArea,
      area_pyeong: +(area * 0.3025).toFixed(1),
      building_area_pyeong: +(buildingArea * 0.3025).toFixed(1),
      claim_profitability: randF(100, 180, 1),
      overdue_interest_rate: overdueRate,
      total_claim_amount: totalClaim,
      loan_balance: balance,
      loan_principal: principal,
      setting_amount: settingAmt,
      normal_interest: normalInt,
      overdue_interest: overdueInt,
      unpaid_interest: unpaidInt,
      loan_interest_rate: loanRate,
      overdue_interest_rate_val: overdueRate,
      claim_preservation_method: preservations[rand(0, preservations.length - 1)],
      first_rank: ['근저당','질권','가압류'][rand(0, 2)],
      second_rank: ['없음','근저당','질권','가압류'][rand(0, 3)],
      profit_right_amount: rand(0, 50000),
      appraisal_value: appraisal,
      appraisal_value_land_pyeong: Math.round(appraisal / (area * 0.3025)),
      official_price: officialP,
      realdeal_avg: Math.round(appraisal * randF(0.85, 1.15)),
      kb_price_avg: Math.round(appraisal * randF(0.9, 1.1)),
      priority_lessee_details: lessees[rand(0, lessees.length - 1)],
      deposit: rand(0, 30000),
      monthly_rent: rand(0, 500),
      vacancy_status: vacancies[rand(0, vacancies.length - 1)],
      min_sale_price: Math.round(totalClaim * randF(0.5, 0.9)),
      sale_conditions: saleConditions[rand(0, saleConditions.length - 1)],
      contract_deposit: rand(500, 10000),
      balance_date: `${rand(2025, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
      caseno: rand(0, 3) === 0 ? `${rand(2023, 2025)}타경${rand(10000, 99999)}` : '없음',
      etc: rand(0, 2) === 0 ? ['다수 임차인 존재', '법적 분쟁 중', '재개발 예정 지역', '도로접합 불량', '지분 매각'][rand(0, 4)] : '-',
    })
  }
  return items
}

// ─── Helpers ───────────────────────────────────────────────────

function formatAmount(val: number | string | undefined | null, unit?: string): string {
  if (val === undefined || val === null || val === '') return '-'
  const num = typeof val === 'string' ? parseFloat(val) : val
  if (isNaN(num)) return String(val)
  if (unit === '만원' || unit === '만원/평') {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}억`
    return `${num.toLocaleString()}만`
  }
  if (unit === '㎡') return `${num.toLocaleString()}㎡`
  if (unit === '평') return `${num.toLocaleString()}평`
  if (unit === '%') return `${num}%`
  return num.toLocaleString()
}

function getStatusBadge(status: string) {
  const s = (status || "").replace(/\s/g, '')
  switch (s) {
    case '진행중': return 'bg-[#E4EDFD] text-[#2944B7]'
    case '협의중': return 'bg-[#DCF7E8] text-[#0C6146]'
    case '매각완료': return 'bg-[#FEEFEF] text-[#A01B3C]'
    default: return 'bg-[#F4F5F7] text-[#787D87]'
  }
}

function getTypeBadge(type: string) {
  if (!type) return 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]'
  if (['아파트', '빌라(다세대)', '다가구', '오피스텔', '단독주택', '타운하우스'].includes(type))
    return 'bg-blue-500/10 text-blue-300'
  if (['상가', '오피스', '공장', '지식산업센터', '창고', '물류센터', '호텔·숙박'].includes(type))
    return 'bg-amber-500/10 text-amber-300'
  return 'bg-green-500/10 text-green-400'
}

const emptyFilters: FilterValues = {
  sido: '', sigungu: '', dong: '',
  collateralMain: '', collateralSub: '',
  status: [], debtorType: [],
  institution: '', zoning: '',
  overdueRateMin: '', overdueRateMax: '',
  totalClaimMin: '', totalClaimMax: '',
  appraisalMin: '', appraisalMax: '',
}

function countActiveFilters(f: FilterValues): number {
  let c = 0
  if (f.sido) c++
  if (f.sigungu) c++
  if (f.dong) c++
  if (f.collateralMain) c++
  if (f.collateralSub) c++
  if (f.status.length) c++
  if (f.debtorType.length) c++
  if (f.institution) c++
  if (f.zoning) c++
  if (f.overdueRateMin || f.overdueRateMax) c++
  if (f.totalClaimMin || f.totalClaimMax) c++
  if (f.appraisalMin || f.appraisalMax) c++
  return c
}

// ─── Initial table-option selections (all columns on) ──────────

function buildInitialTableOptions(): Record<string, string[]> {
  const opts: Record<string, string[]> = {}
  MAJOR_CATEGORIES.forEach(cat => {
    opts[cat] = Object.keys(subToFieldMap[cat] ?? {})
  })
  return opts
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NplSearchPage() {
  const router = useRouter()
  const filterRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // --- data state ---
  const [items, setItems] = useState<NplItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // --- UI state ---
  const [major, setMajor] = useState<MajorCategory>('개요')
  const [searchQuery, setSearchQuery] = useState('')
  const perPage = 10
  const [currentPage, setCurrentPage] = useState(1)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [starred, setStarred] = useState<Set<number>>(new Set())

  // --- scroll mode ---
  const [scrollMode, setScrollMode] = useState<'pagination' | 'infinite'>('pagination')
  const [infinitePage, setInfinitePage] = useState(1)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // --- filters ---
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters })
  const [tempFilters, setTempFilters] = useState<FilterValues>({ ...emptyFilters })
  const [showFilterModal, setShowFilterModal] = useState(false)

  // --- table column settings ---
  const [tableOptions, setTableOptions] = useState<Record<string, string[]>>(buildInitialTableOptions)
  const [tempTableOptions, setTempTableOptions] = useState<Record<string, string[]>>(buildInitialTableOptions)
  const [showTableSettings, setShowTableSettings] = useState(false)

  // --- hover state for rows ---
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  // --- click outside to close modals ---
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showFilterModal && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterModal(false)
      }
      if (showTableSettings && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowTableSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilterModal, showTableSettings])

  // --- data fetch ---
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(perPage))
      if (searchQuery) params.set('q', searchQuery)
      if (filters.sido) params.set('sido', filters.sido)
      if (filters.sigungu) params.set('sigungu', filters.sigungu)
      if (filters.dong) params.set('dong', filters.dong)
      if (filters.collateralMain) params.set('collateralMain', filters.collateralMain)
      if (filters.collateralSub) params.set('collateralSub', filters.collateralSub)
      if (filters.status.length) params.set('status', filters.status.join(','))
      if (filters.debtorType.length) params.set('debtorType', filters.debtorType.join(','))
      if (filters.institution) params.set('institution', filters.institution)
      if (filters.zoning) params.set('zoning', filters.zoning)
      if (filters.overdueRateMin) params.set('overdueRateMin', filters.overdueRateMin)
      if (filters.overdueRateMax) params.set('overdueRateMax', filters.overdueRateMax)
      if (filters.totalClaimMin) params.set('totalClaimMin', filters.totalClaimMin)
      if (filters.totalClaimMax) params.set('totalClaimMax', filters.totalClaimMax)
      if (filters.appraisalMin) params.set('appraisalMin', filters.appraisalMin)
      if (filters.appraisalMax) params.set('appraisalMax', filters.appraisalMax)

      const res = await fetch(`/api/v1/market/search?${params.toString()}`)
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setItems(json.data ?? json.items ?? [])
      setTotalCount(json.total ?? json.totalCount ?? 0)
    } catch {
      // fallback to mock
      const mock = generateMockData()
      setItems(mock)
      setTotalCount(mock.length)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, filters])

  useEffect(() => { fetchData() }, [fetchData])

  // --- local filtering & sorting (mock mode) ---
  const filteredItems = useMemo(() => {
    let data = [...items]

    // text search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      data = data.filter(d =>
        (d.address || "").toLowerCase().includes(q) ||
        (d.creditor_institution || "").toLowerCase().includes(q) ||
        (d.type || "").toLowerCase().includes(q)
      )
    }

    // filters
    if (filters.sido) data = data.filter(d => d.sido === filters.sido)
    if (filters.sigungu) data = data.filter(d => d.sigungu === filters.sigungu)
    if (filters.dong) data = data.filter(d => d.dong === filters.dong)
    if (filters.collateralSub) data = data.filter(d => d.type === filters.collateralSub)
    else if (filters.collateralMain) {
      const subs = COLLATERAL_DATA[filters.collateralMain] ?? []
      data = data.filter(d => subs.includes(d.type))
    }
    if (filters.status.length) data = data.filter(d => filters.status.includes(d.status))
    if (filters.debtorType.length) data = data.filter(d => filters.debtorType.includes(d.is_corporation))
    if (filters.institution) data = data.filter(d => (d.creditor_institution || "").includes(filters.institution))
    if (filters.zoning) data = data.filter(d => (d.zoning || "").includes(filters.zoning))
    if (filters.overdueRateMin) data = data.filter(d => d.overdue_interest_rate >= Number(filters.overdueRateMin))
    if (filters.overdueRateMax) data = data.filter(d => d.overdue_interest_rate <= Number(filters.overdueRateMax))
    if (filters.totalClaimMin) data = data.filter(d => d.total_claim_amount >= Number(filters.totalClaimMin))
    if (filters.totalClaimMax) data = data.filter(d => d.total_claim_amount <= Number(filters.totalClaimMax))
    if (filters.appraisalMin) data = data.filter(d => d.appraisal_value >= Number(filters.appraisalMin))
    if (filters.appraisalMax) data = data.filter(d => d.appraisal_value <= Number(filters.appraisalMax))

    // sort
    if (sortCol && sortDir) {
      const fieldMap = subToFieldMap[major] ?? {}
      const fieldKey = fieldMap[sortCol]
      if (fieldKey) {
        data.sort((a, b) => {
          const va = (a as any)[fieldKey]
          const vb = (b as any)[fieldKey]
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          if (typeof va === 'number' && typeof vb === 'number')
            return sortDir === 'asc' ? va - vb : vb - va
          return sortDir === 'asc'
            ? String(va).localeCompare(String(vb))
            : String(vb).localeCompare(String(va))
        })
      }
    }

    return data
  }, [items, searchQuery, filters, sortCol, sortDir, major])

  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage))
  const pageItems = filteredItems.slice((currentPage - 1) * perPage, currentPage * perPage)

  const activeFilterCount = countActiveFilters(filters)

  // columns for current tab + table settings
  const currentColumns = useMemo(() => {
    const allCols = Object.keys(subToFieldMap[major] ?? {})
    const selected = tableOptions[major] ?? allCols
    return allCols.filter(c => selected.includes(c))
  }, [major, tableOptions])

  // --- sort handler ---
  const handleSort = (col: string) => {
    const sortable = sortableColumns[major] ?? []
    if (!sortable.includes(col)) return
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortCol(null); setSortDir(null) }
      else setSortDir('asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // --- star toggle ---
  const toggleStar = (id: number) => {
    setStarred(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- excel download ---
  const handleExcelDownload = () => {
    if (filteredItems.length === 0) {
      toast.warning('다운로드할 데이터가 없습니다')
      return
    }

    const fieldMap = subToFieldMap[major] ?? {}
    const columns: ExcelColumn[] = currentColumns.map((col) => {
      const field = fieldMap[col]
      return {
        header: col,
        key: field || col,
        width: col.length > 10 ? col.length + 4 : 18,
      }
    })

    const rows = filteredItems.map((item, idx) => {
      const row: Record<string, any> = { __rowNo: idx + 1 }
      currentColumns.forEach((col) => {
        const field = fieldMap[col]
        if (field) {
          row[field] = (item as any)[field] ?? ''
        }
      })
      return row
    })

    const allColumns: ExcelColumn[] = [
      { header: 'No', key: '__rowNo', width: 6 },
      ...columns,
    ]

    exportToExcel(rows, allColumns, 'NPL_검색결과', major)
    toast.success('엑셀 파일이 다운로드되었습니다')
  }

  // --- cell value ---
  const getCellValue = (item: NplItem, col: string): string => {
    const field = (subToFieldMap[major] ?? {})[col]
    if (!field) return '-'
    const val = (item as any)[field]
    if (val === undefined || val === null) return '-'
    const unit = subToUnitMap[col]
    if (unit) return formatAmount(val, unit)
    return String(val)
  }

  // --- pagination range ---
  const paginationRange = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const delta = isMobile ? 1 : 5
    const range: number[] = []
    const left = Math.max(2, currentPage - delta)
    const right = Math.min(totalPages - 1, currentPage + delta)
    range.push(1)
    if (left > 2) range.push(-1)
    for (let i = left; i <= right; i++) range.push(i)
    if (right < totalPages - 1) range.push(-2)
    if (totalPages > 1) range.push(totalPages)
    return range
  }, [currentPage, totalPages])

  // --- infinite scroll ---
  const infiniteItems = useMemo(
    () => filteredItems.slice(0, infinitePage * perPage),
    [filteredItems, infinitePage, perPage]
  )
  const hasMoreInfinite = infiniteItems.length < filteredItems.length

  // Reset infinite page when filters/search change or mode switches to infinite
  useEffect(() => {
    setInfinitePage(1)
  }, [filteredItems, scrollMode])

  // IntersectionObserver to load next batch
  useEffect(() => {
    if (scrollMode !== 'infinite') return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreInfinite && !isFetchingMore) {
          setIsFetchingMore(true)
          // Small delay to feel natural, then reveal next page
          setTimeout(() => {
            setInfinitePage(p => p + 1)
            setIsFetchingMore(false)
          }, 400)
        }
      },
      { rootMargin: '160px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollMode, hasMoreInfinite, isFetchingMore])

  // Toggle scroll mode: reset pages
  const handleScrollModeToggle = (mode: 'pagination' | 'infinite') => {
    setScrollMode(mode)
    setCurrentPage(1)
    setInfinitePage(1)
  }

  // ─── RENDER ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.l2 }}>

      {/* ── Dark Header ─────────────────────────────── */}
      <div
        className="h-14 flex items-center px-4 shrink-0 gap-3"
        style={{ backgroundColor: C.bg1 }}
      >
        {/* Title */}
        <h1 className="text-lg font-bold tracking-tight" style={{ color: C.l0 }}>
          NPL 검색
        </h1>

        {/* Result count badge */}
        <span
          className="px-2.5 py-0.5 text-[12px] font-bold rounded-full"
          style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: C.em, border: `1px solid rgba(16,185,129,0.3)` }}
        >
          {totalFiltered.toLocaleString()}건
        </span>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 ml-1">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: C.em, boxShadow: `0 0 6px ${C.em}` }}
          />
          <span className="text-[11px] font-bold tracking-widest" style={{ color: C.em }}>
            LIVE
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick action buttons */}
        <button
          onClick={() => { setTempFilters({ ...filters }); setShowFilterModal(!showFilterModal) }}
          className="flex items-center gap-1.5 h-8 px-3 rounded text-[12px] font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: activeFilterCount > 0 ? C.em : 'rgba(255,255,255,0.08)',
            color: activeFilterCount > 0 ? C.bg1 : C.lt4,
            border: `1px solid ${activeFilterCount > 0 ? C.em : 'rgba(255,255,255,0.12)'}`,
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>필터</span>
          {activeFilterCount > 0 && (
            <span
              className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
              style={{ backgroundColor: C.bg1, color: C.em }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={handleExcelDownload}
          className="flex items-center gap-1.5 h-8 px-3 rounded text-[12px] font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: C.lt4,
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">엑셀 다운로드</span>
        </button>

        {/* Scroll mode toggle in header */}
        <div
          className="flex items-center h-8 rounded p-0.5 gap-0.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <button
            onClick={() => handleScrollModeToggle('pagination')}
            className="h-6 px-2 rounded flex items-center gap-1 text-[11px] font-medium transition-all"
            style={{
              backgroundColor: scrollMode === 'pagination' ? C.em : 'transparent',
              color: scrollMode === 'pagination' ? C.bg1 : C.lt4,
            }}
          >
            <List className="w-3 h-3" />
            <span className="hidden sm:inline">페이지</span>
          </button>
          <button
            onClick={() => handleScrollModeToggle('infinite')}
            className="h-6 px-2 rounded flex items-center gap-1 text-[11px] font-medium transition-all"
            style={{
              backgroundColor: scrollMode === 'infinite' ? C.em : 'transparent',
              color: scrollMode === 'infinite' ? C.bg1 : C.lt4,
            }}
          >
            <AlignJustify className="w-3 h-3" />
            <span className="hidden sm:inline">무한</span>
          </button>
        </div>

        <GuideButton serviceKey="deal-bridge" variant="compact" />
      </div>

      {/* ── Dark Category Tabs (sticky) ──────────────── */}
      <div
        className="sticky top-0 z-30 shrink-0"
        style={{ backgroundColor: C.bg1, borderBottom: `1px solid rgba(255,255,255,0.08)` }}
      >
        {/* Major tabs */}
        <div className="overflow-x-auto">
          <div className="flex px-4 min-w-max">
            {MAJOR_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setMajor(cat); setSortCol(null); setSortDir(null) }}
                className="px-4 py-2.5 text-[13px] whitespace-nowrap transition-all duration-100 border-b-2 font-medium"
                style={{
                  borderBottomColor: major === cat ? C.em : 'transparent',
                  color: major === cat ? C.em : C.lt4,
                  backgroundColor: 'transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-column indicator row */}
        {currentColumns.length > 0 && (
          <div
            className="overflow-x-auto"
            style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}
          >
            <div className="flex px-4 gap-1 py-1.5 min-w-max">
              {currentColumns.map(col => (
                <span
                  key={col}
                  className="px-2 py-0.5 text-[10px] font-mono rounded"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: C.lt3,
                    border: '1px solid rgba(255,255,255,0.08)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {col}{subToUnitMap[col] ? ` (${subToUnitMap[col]})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Light Controls Bar ─────────────────────── */}
      <div
        className="min-h-[56px] md:h-[64px] flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-0 shrink-0 relative"
        style={{ backgroundColor: C.l0, borderBottom: `1px solid ${C.l3}` }}
      >
        {/* Search input with AI badge */}
        <div className="relative w-full md:w-auto order-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.lt4 }} />
          <input
            type="text"
            placeholder="주소, 기관명 검색..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full md:w-[320px] h-10 rounded-lg px-3 pl-9 pr-16 text-[14px] outline-none transition-shadow"
            style={{
              backgroundColor: C.l2,
              color: C.lt1,
              border: `1px solid ${C.l3}`,
              boxShadow: 'none',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px rgba(16,185,129,0.25)`; e.currentTarget.style.borderColor = C.em }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.l3 }}
          />
          {/* AI badge */}
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: C.em, border: `1px solid rgba(16,185,129,0.2)` }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </span>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
              className="absolute right-10 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: C.lt4 }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => { setTempFilters({ ...filters }); setShowFilterModal(!showFilterModal) }}
          className="h-9 rounded-lg px-3 text-[13px] flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors order-2 font-medium"
          style={{
            backgroundColor: activeFilterCount > 0 ? C.lt1 : C.l2,
            color: activeFilterCount > 0 ? C.l0 : C.lt2,
            border: `1px solid ${activeFilterCount > 0 ? C.lt1 : C.l3}`,
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>필터</span>
          {activeFilterCount > 0 && (
            <span
              className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ backgroundColor: C.em, color: C.lt1 }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Table settings button */}
        <button
          onClick={() => { setTempTableOptions({ ...tableOptions }); setShowTableSettings(!showTableSettings) }}
          className="h-9 rounded-lg px-3 text-[13px] flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors order-3 font-medium"
          style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
        >
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">테이블설정</span>
          <span className="sm:hidden">설정</span>
        </button>

        {/* Excel download */}
        <button
          onClick={handleExcelDownload}
          className="h-9 rounded-lg px-3 text-[13px] flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors order-4 font-medium"
          style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
        >
          <Download className="w-4 h-4" />
          <span>엑셀</span>
        </button>

        {/* Spacer */}
        <div className="flex-1 hidden md:block" />

        {/* ═══ Filter Modal ═══ */}
        {showFilterModal && (
          <div
            ref={filterRef}
            className="fixed inset-0 md:absolute md:inset-auto md:w-[560px] md:h-[640px] md:top-14 md:left-0 md:rounded-xl z-40 flex flex-col overflow-hidden"
            style={{ backgroundColor: C.l0, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: `1px solid ${C.l3}` }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ backgroundColor: C.bg1, borderBottom: `1px solid rgba(255,255,255,0.08)` }}
            >
              <h3 className="text-[15px] font-bold" style={{ color: C.l0 }}>고급 필터</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="transition-opacity hover:opacity-70"
                style={{ color: C.lt4 }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ backgroundColor: C.l0 }}>
              {/* Region cascade */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>담보물 지역</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={tempFilters.sido}
                    onChange={e => setTempFilters(f => ({ ...f, sido: e.target.value, sigungu: '', dong: '' }))}
                    className="h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  >
                    <option value="">광역시도</option>
                    {Object.keys(REGION_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={tempFilters.sigungu}
                    onChange={e => setTempFilters(f => ({ ...f, sigungu: e.target.value, dong: '' }))}
                    disabled={!tempFilters.sido}
                    className="h-[40px] rounded-lg text-[14px] px-3 outline-none disabled:opacity-50"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  >
                    <option value="">시군구</option>
                    {(tempFilters.sido ? Object.keys(REGION_DATA[tempFilters.sido] ?? {}) : []).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <select
                    value={tempFilters.dong}
                    onChange={e => setTempFilters(f => ({ ...f, dong: e.target.value }))}
                    disabled={!tempFilters.sigungu}
                    className="h-[40px] rounded-lg text-[14px] px-3 outline-none disabled:opacity-50"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  >
                    <option value="">읍면동</option>
                    {(tempFilters.sido && tempFilters.sigungu
                      ? (REGION_DATA[tempFilters.sido]?.[tempFilters.sigungu] ?? [])
                      : []
                    ).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Collateral cascade */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>담보물 종류</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={tempFilters.collateralMain}
                    onChange={e => setTempFilters(f => ({ ...f, collateralMain: e.target.value, collateralSub: '' }))}
                    className="h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  >
                    <option value="">대분류</option>
                    {Object.keys(COLLATERAL_DATA).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <select
                    value={tempFilters.collateralSub}
                    onChange={e => setTempFilters(f => ({ ...f, collateralSub: e.target.value }))}
                    disabled={!tempFilters.collateralMain}
                    className="h-[40px] rounded-lg text-[14px] px-3 outline-none disabled:opacity-50"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  >
                    <option value="">세부유형</option>
                    {(COLLATERAL_DATA[tempFilters.collateralMain] ?? []).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status checkboxes */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>채권 상태</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => {
                    const checked = tempFilters.status.includes(s)
                    return (
                      <label key={s} className="flex items-center gap-1.5 text-[14px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setTempFilters(f => ({
                              ...f,
                              status: checked ? f.status.filter(x => x !== s) : [...f.status, s],
                            }))
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className={`px-2 py-0.5 text-[13px] font-bold rounded ${getStatusBadge(s)}`}>{s}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Debtor type */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>채무자유형</label>
                <div className="flex gap-3">
                  {DEBTOR_TYPE_OPTIONS.map(d => {
                    const checked = tempFilters.debtorType.includes(d)
                    return (
                      <label key={d} className="flex items-center gap-1.5 text-[14px] cursor-pointer" style={{ color: C.lt1 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setTempFilters(f => ({
                              ...f,
                              debtorType: checked ? f.debtorType.filter(x => x !== d) : [...f.debtorType, d],
                            }))
                          }}
                          className="w-4 h-4 rounded"
                        />
                        {d}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>채권기관</label>
                <input
                  type="text"
                  placeholder="기관명 입력 (예: KB, 캠코)"
                  value={tempFilters.institution}
                  onChange={e => setTempFilters(f => ({ ...f, institution: e.target.value }))}
                  className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                  style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                />
              </div>

              {/* Zoning */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>용도지역</label>
                <input
                  type="text"
                  placeholder="용도지역 입력 (예: 일반주거)"
                  value={tempFilters.zoning}
                  onChange={e => setTempFilters(f => ({ ...f, zoning: e.target.value }))}
                  className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                  style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                />
              </div>

              <div style={{ borderTop: `1px solid ${C.l3}` }} />

              {/* Range: overdue rate */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>연체금리 수준 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" placeholder="최소"
                    value={tempFilters.overdueRateMin}
                    onChange={e => setTempFilters(f => ({ ...f, overdueRateMin: e.target.value }))}
                    className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  />
                  <span className="text-[14px]" style={{ color: C.lt4 }}>~</span>
                  <input
                    type="number" placeholder="최대"
                    value={tempFilters.overdueRateMax}
                    onChange={e => setTempFilters(f => ({ ...f, overdueRateMax: e.target.value }))}
                    className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  />
                </div>
              </div>

              {/* Range: total claim */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>총 채권액 (만원)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" placeholder="최소"
                    value={tempFilters.totalClaimMin}
                    onChange={e => setTempFilters(f => ({ ...f, totalClaimMin: e.target.value }))}
                    className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  />
                  <span className="text-[14px]" style={{ color: C.lt4 }}>~</span>
                  <input
                    type="number" placeholder="최대"
                    value={tempFilters.totalClaimMax}
                    onChange={e => setTempFilters(f => ({ ...f, totalClaimMax: e.target.value }))}
                    className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  />
                </div>
              </div>

              {/* Range: appraisal */}
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: C.lt3 }}>감정가 (만원)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" placeholder="최소"
                    value={tempFilters.appraisalMin}
                    onChange={e => setTempFilters(f => ({ ...f, appraisalMin: e.target.value }))}
                    className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  />
                  <span className="text-[14px]" style={{ color: C.lt4 }}>~</span>
                  <input
                    type="number" placeholder="최대"
                    value={tempFilters.appraisalMax}
                    onChange={e => setTempFilters(f => ({ ...f, appraisalMax: e.target.value }))}
                    className="w-full h-[40px] rounded-lg text-[14px] px-3 outline-none"
                    style={{ backgroundColor: C.l2, color: C.lt1, border: `1px solid ${C.l3}` }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderTop: `1px solid ${C.l3}`, backgroundColor: C.l0 }}
            >
              <button
                onClick={() => setTempFilters({ ...emptyFilters })}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
              >
                <RefreshCw className="w-4 h-4" />
                초기화
              </button>
              <button
                onClick={() => { setFilters({ ...tempFilters }); setCurrentPage(1); setShowFilterModal(false) }}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: C.em, color: C.lt1 }}
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* ═══ Table Settings Modal ═══ */}
        {showTableSettings && (
          <div
            ref={settingsRef}
            className="fixed inset-0 md:absolute md:inset-auto md:w-[560px] md:h-[640px] md:top-14 md:left-[340px] md:rounded-xl z-40 flex flex-col overflow-hidden"
            style={{ backgroundColor: C.l0, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: `1px solid ${C.l3}` }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ backgroundColor: C.bg1, borderBottom: `1px solid rgba(255,255,255,0.08)` }}
            >
              <h3 className="text-[15px] font-bold" style={{ color: C.l0 }}>테이블 설정</h3>
              <button
                onClick={() => setShowTableSettings(false)}
                className="transition-opacity hover:opacity-70"
                style={{ color: C.lt4 }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ backgroundColor: C.l0 }}>
              <p className="text-[13px]" style={{ color: C.lt3 }}>각 카테고리별 표시할 컬럼을 선택하세요.</p>
              {MAJOR_CATEGORIES.map(cat => {
                const allCols = Object.keys(subToFieldMap[cat] ?? {})
                const selected = tempTableOptions[cat] ?? []

                return (
                  <div key={cat} className="pb-3" style={{ borderBottom: `1px solid ${C.l3}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-semibold" style={{ color: C.lt1 }}>{cat}</span>
                      <span className="text-[12px]" style={{ color: C.lt4 }}>{selected.length}/{allCols.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {allCols.map(col => {
                        const checked = selected.includes(col)
                        return (
                          <label key={col} className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setTempTableOptions(o => ({
                                  ...o,
                                  [cat]: checked
                                    ? (o[cat] ?? []).filter(c => c !== col)
                                    : [...(o[cat] ?? []), col],
                                }))
                              }}
                              className="w-4 h-4 rounded"
                            />
                            <span className="truncate" style={{ color: C.lt2 }}>{col}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderTop: `1px solid ${C.l3}`, backgroundColor: C.l0 }}
            >
              <button
                onClick={() => setTempTableOptions(buildInitialTableOptions())}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
              >
                <RefreshCw className="w-4 h-4" />
                초기화
              </button>
              <button
                onClick={() => { setTableOptions({ ...tempTableOptions }); setShowTableSettings(false) }}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: C.em, color: C.lt1 }}
              >
                적용
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active filter chips ─────────────────────── */}
      {activeFilterCount > 0 && (
        <div
          className="px-4 py-2 flex flex-wrap gap-1.5 items-center shrink-0"
          style={{ backgroundColor: C.l0, borderBottom: `1px solid ${C.l3}` }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider mr-1" style={{ color: C.lt4 }}>적용:</span>
          {filters.sido && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              {filters.sido}{filters.sigungu ? ` ${filters.sigungu}` : ''}{filters.dong ? ` ${filters.dong}` : ''}
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, sido: '', sigungu: '', dong: '' }))} />
            </span>
          )}
          {filters.collateralMain && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              {filters.collateralSub || filters.collateralMain}
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, collateralMain: '', collateralSub: '' }))} />
            </span>
          )}
          {filters.status.length > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              {filters.status.join(', ')}
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, status: [] }))} />
            </span>
          )}
          {filters.debtorType.length > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              {filters.debtorType.join(', ')}
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, debtorType: [] }))} />
            </span>
          )}
          {filters.institution && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              {filters.institution}
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, institution: '' }))} />
            </span>
          )}
          {(filters.overdueRateMin || filters.overdueRateMax) && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              연체금리 {filters.overdueRateMin || '0'}~{filters.overdueRateMax || ''}%
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, overdueRateMin: '', overdueRateMax: '' }))} />
            </span>
          )}
          {(filters.totalClaimMin || filters.totalClaimMax) && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              총채권 {filters.totalClaimMin || '0'}~{filters.totalClaimMax || ''}만
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, totalClaimMin: '', totalClaimMax: '' }))} />
            </span>
          )}
          {(filters.appraisalMin || filters.appraisalMax) && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded font-medium"
              style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
            >
              감정가 {filters.appraisalMin || '0'}~{filters.appraisalMax || ''}만
              <X className="w-3 h-3 cursor-pointer hover:opacity-60" onClick={() => setFilters(f => ({ ...f, appraisalMin: '', appraisalMax: '' }))} />
            </span>
          )}
          <button
            onClick={() => { setFilters({ ...emptyFilters }); setCurrentPage(1) }}
            className="text-[12px] font-medium ml-1 transition-opacity hover:opacity-70"
            style={{ color: C.rose }}
          >
            전체 초기화
          </button>
        </div>
      )}

      {/* ── Table content ────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div
            className="flex-1 overflow-x-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.l3} transparent`, backgroundColor: C.l2 }}
          >
            <table className="w-max min-w-full border-collapse">
              {/* ── Table Header ─── */}
              <thead>
                <tr>
                  {/* Sticky left: basic info header */}
                  <th
                    className="w-[200px] md:w-[380px] sticky left-0 z-20 px-2 md:px-4 py-3 text-left"
                    style={{
                      backgroundColor: C.l1,
                      borderRight: `1px solid ${C.l3}`,
                      borderBottom: `2px solid ${C.l3}`,
                    }}
                  >
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: C.lt3 }}
                    >
                      기본정보
                    </span>
                  </th>
                  {/* Scrollable data columns */}
                  {currentColumns.map(col => {
                    const isSortable = (sortableColumns[major] ?? []).includes(col)
                    const isActive = sortCol === col
                    const isWide = ['담보물 주소', '특이사항', '매각조건', '채권보전방식', '선순위임차인'].includes(col)
                    return (
                      <th
                        key={col}
                        className={`${isWide ? 'w-60' : 'w-40'} px-4 py-3 text-left whitespace-nowrap`}
                        style={{
                          backgroundColor: C.l1,
                          borderBottom: `2px solid ${C.l3}`,
                          cursor: isSortable ? 'pointer' : 'default',
                          userSelect: 'none',
                        }}
                        onClick={() => isSortable && handleSort(col)}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: isActive ? C.lt1 : C.lt3 }}
                          >
                            {col}
                          </span>
                          {subToUnitMap[col] && (
                            <span className="text-[10px] font-normal" style={{ color: C.lt4 }}>
                              ({subToUnitMap[col]})
                            </span>
                          )}
                          {isSortable && (
                            <span className="ml-0.5 text-[11px] leading-none">
                              {isActive && sortDir === 'asc' && <span style={{ color: C.em }}>&#9650;</span>}
                              {isActive && sortDir === 'desc' && <span style={{ color: C.rose }}>&#9660;</span>}
                              {!isActive && <span style={{ color: C.l3 }}>&#9650;&#9660;</span>}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* ── Table Body ─── */}
              <tbody>
                {(scrollMode === 'infinite' ? infiniteItems : pageItems).length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentColumns.length + 1}
                      className="text-center py-16 text-[14px]"
                      style={{ color: C.lt4, backgroundColor: C.l0 }}
                    >
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  (scrollMode === 'infinite' ? infiniteItems : pageItems).map((item, idx) => {
                    const rowNo = scrollMode === 'infinite' ? idx + 1 : (currentPage - 1) * perPage + idx + 1
                    const isHovered = hoveredRow === item.id
                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: `1px solid ${C.l3}`, backgroundColor: isHovered ? C.l1 : C.l0, cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredRow(item.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => router.push(`/listings/${item.id}`)}
                      >
                        {/* ── Sticky left column: basic info ─── */}
                        <td
                          className="w-[200px] md:w-[380px] sticky left-0 z-10 px-2 md:px-4 py-3 transition-colors"
                          style={{
                            backgroundColor: isHovered ? C.l1 : C.l0,
                            borderRight: `1px solid ${C.l3}`,
                          }}
                        >
                          <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
                            {/* No */}
                            <span
                              className="text-[12px] md:text-[13px] leading-5 font-mono w-5 md:w-6 shrink-0 text-right tabular-nums"
                              style={{ color: C.lt4 }}
                            >
                              {rowNo}
                            </span>
                            {/* Star */}
                            <button
                              onClick={e => { e.stopPropagation(); toggleStar(item.id) }}
                              className="shrink-0"
                            >
                              <Star
                                className="w-3.5 md:w-4 h-3.5 md:h-4"
                                style={{
                                  fill: starred.has(item.id) ? '#FBBF24' : 'none',
                                  color: starred.has(item.id) ? '#FBBF24' : C.l3,
                                }}
                              />
                            </button>
                            {/* Institution - hidden on mobile */}
                            <span
                              className="hidden md:inline text-[13px] leading-5 font-medium shrink-0 max-w-[80px] truncate"
                              style={{ color: C.lt2 }}
                            >
                              {item.creditor_institution || "-"}
                            </span>
                            {/* Type badge */}
                            <span className={`px-1.5 md:px-2 py-0.5 text-[10px] md:text-[11px] font-bold rounded shrink-0 ${getTypeBadge(item.type)}`}>
                              {item.type || "-"}
                            </span>
                            {/* Address truncated */}
                            <span
                              className="text-[12px] md:text-[13px] leading-5 truncate min-w-0"
                              style={{ color: C.lt3 }}
                            >
                              {item.address || "-"}
                            </span>
                            {/* Status badge */}
                            <span className={`hidden md:inline px-2 py-0.5 text-[12px] font-bold rounded shrink-0 ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </td>

                        {/* ── Scrollable data cells ─── */}
                        {currentColumns.map(col => {
                          const isWide = ['담보물 주소', '특이사항', '매각조건', '채권보전방식', '선순위임차인'].includes(col)
                          const val = getCellValue(item, col)
                          const isNumeric = !!subToUnitMap[col]

                          // Special rendering for status column
                          if (col === '상태') {
                            return (
                              <td key={col} className={`${isWide ? 'w-60' : 'w-40'} px-4 py-3`}>
                                <span className={`px-2 py-0.5 text-[12px] font-bold rounded ${getStatusBadge(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                            )
                          }
                          return (
                            <td
                              key={col}
                              className={`${isWide ? 'w-60' : 'w-40'} px-4 py-3 text-[13px] leading-5 whitespace-nowrap`}
                              style={{
                                color: isNumeric ? C.lt1 : C.lt3,
                                textAlign: isNumeric ? 'right' : 'left',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {isWide ? (
                                <span className="block truncate max-w-[220px] text-left" title={val} style={{ color: C.lt3 }}>{val}</span>
                              ) : val}
                            </td>
                          )
                        })}

                        {/* ── Action cell ─── */}
                        <td
                          className="w-32 px-2 py-3 sticky right-0 z-10 transition-colors"
                          style={{
                            backgroundColor: isHovered ? C.l1 : C.l0,
                            borderLeft: `1px solid ${C.l3}`,
                          }}
                        >
                          <div
                            className="flex items-center gap-1 transition-opacity"
                            style={{ opacity: isHovered ? 1 : 0 }}
                          >
                            <button
                              onClick={e => { e.stopPropagation(); router.push(`/exchange/${item.id}`) }}
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded whitespace-nowrap transition-opacity hover:opacity-80"
                              style={{ backgroundColor: C.em, color: C.lt1 }}
                            >
                              관심 표명
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Infinite scroll sentinel ─────────────── */}
        {!loading && scrollMode === 'infinite' && (
          <div style={{ backgroundColor: C.l0 }}>
            <div ref={sentinelRef} className="h-1" />
            {isFetchingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-[13px]" style={{ color: C.lt4 }}>
                  <svg className="animate-spin w-4 h-4" style={{ color: C.em }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>불러오는 중...</span>
                </div>
              </div>
            )}
            {!hasMoreInfinite && infiniteItems.length > 0 && (
              <div className="flex justify-center py-4 pb-16">
                <span className="text-[12px]" style={{ color: C.lt4 }}>
                  전체 {filteredItems.length.toLocaleString()}건 모두 표시됨
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Pagination ──────────────────────────── */}
        {!loading && totalFiltered > 0 && scrollMode === 'pagination' && (
          <div
            className="flex justify-center pt-4 pb-16 shrink-0"
            style={{ backgroundColor: C.l0, borderTop: `1px solid ${C.l3}` }}
          >
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-2 rounded text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: C.lt3 }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {paginationRange.map((p, i) =>
                p < 0 ? (
                  <span key={`e${i}`} className="px-2 text-[13px]" style={{ color: C.lt4 }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className="px-3 py-2 rounded text-[13px] font-medium transition-colors min-w-[36px]"
                    style={{
                      backgroundColor: p === currentPage ? C.lt1 : 'transparent',
                      color: p === currentPage ? C.l0 : C.lt3,
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-2 rounded text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: C.lt3 }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Loading skeleton component ─────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex-1" style={{ backgroundColor: C.l0 }}>
      {/* header */}
      <div
        className="flex gap-0"
        style={{ backgroundColor: C.l1, borderBottom: `2px solid ${C.l3}` }}
      >
        <div
          className="w-[200px] md:w-[380px] px-2 md:px-4 py-3"
          style={{ borderRight: `1px solid ${C.l3}` }}
        >
          <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: C.l3 }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-40 px-4 py-3">
            <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: C.l3 }} />
          </div>
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: 10 }).map((_, row) => (
        <div
          key={row}
          className="flex gap-0"
          style={{ borderBottom: `1px solid ${C.l3}` }}
        >
          <div
            className="w-[200px] md:w-[380px] px-2 md:px-4 py-3"
            style={{ borderRight: `1px solid ${C.l3}` }}
          >
            <div className="h-5 w-full rounded animate-pulse" style={{ backgroundColor: C.l2 }} />
          </div>
          {Array.from({ length: 5 }).map((_, col) => (
            <div key={col} className="w-40 px-4 py-3">
              <div className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: C.l2 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
