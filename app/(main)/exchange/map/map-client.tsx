"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  formatKRW,
  COLLATERAL_TYPES,
} from "@/lib/constants"
import {
  MapPin,
  Search,
  List,
  Map,
  Building2,
  X,
  ZoomIn,
  ZoomOut,
  Locate,
  Layers,
  TrendingDown,
  Landmark,
  TreePine,
  Building,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  ExternalLink,
  BarChart3,
  Gavel,
  Eye,
  ArrowUpDown,
  Filter,
  Info,
  Satellite,
  MapPinned,
  AlertTriangle,
} from "lucide-react"

// ─── Kakao Maps Type Declarations ──────────────────────────
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        LatLng: new (lat: number, lng: number) => any
        Map: new (container: HTMLElement, options: any) => any
        LatLngBounds: new () => any
        CustomOverlay: new (options: any) => any
        MapTypeId: Record<string, any>
        event: {
          addListener: (target: any, type: string, handler: (...args: any[]) => void) => void
          removeListener: (target: any, type: string, handler: (...args: any[]) => void) => void
        }
        services: {
          Geocoder: new () => any
        }
        MarkerClusterer: new (options: any) => any
        Marker: new (options: any) => any
      }
    }
  }
}

// ─── Types ──────────────────────────────────────────────────
interface NplItem {
  id: string
  address: string
  collateralType: string
  collateralLabel: string
  loanBalance: number
  appraisalValue: number
  ltv: number
  status: "매각진행" | "입찰예정" | "협의중" | "낙찰완료"
  region: string
  institution: string
  x: number // percent position on fallback map
  y: number
  lat: number // kakao map latitude
  lng: number // kakao map longitude
}

// ─── Mock Data (25 items) ───────────────────────────────────
const MOCK_NPL_ITEMS: NplItem[] = [
  {
    id: "NPL-001",
    address: "서울특별시 강남구 역삼동 823-4 역삼아이파크 102동 1501호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 620000000,
    appraisalValue: 980000000,
    ltv: 63.3,
    status: "매각진행",
    region: "서울",
    institution: "KB국민은행",
    x: 62, y: 35,
    lat: 37.5010, lng: 127.0396,
  },
  {
    id: "NPL-002",
    address: "서울특별시 송파구 잠실동 40-1 리센츠 205동 803호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 890000000,
    appraisalValue: 1520000000,
    ltv: 58.6,
    status: "입찰예정",
    region: "서울",
    institution: "신한은행",
    x: 68, y: 38,
    lat: 37.5133, lng: 127.1001,
  },
  {
    id: "NPL-003",
    address: "경기도 성남시 분당구 서현동 255-2 시범단지 상가 B1층",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 450000000,
    appraisalValue: 720000000,
    ltv: 62.5,
    status: "매각진행",
    region: "경기",
    institution: "하나은행",
    x: 55, y: 42,
    lat: 37.3849, lng: 127.1230,
  },
  {
    id: "NPL-004",
    address: "부산광역시 해운대구 우동 1490 마린시티 2차 3204호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 520000000,
    appraisalValue: 810000000,
    ltv: 64.2,
    status: "협의중",
    region: "부산",
    institution: "우리은행",
    x: 82, y: 78,
    lat: 35.1631, lng: 129.1635,
  },
  {
    id: "NPL-005",
    address: "대구광역시 수성구 범어동 177-3 대구범어W 1102호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 310000000,
    appraisalValue: 520000000,
    ltv: 59.6,
    status: "매각진행",
    region: "대구",
    institution: "농협은행",
    x: 70, y: 65,
    lat: 35.8563, lng: 128.6279,
  },
  {
    id: "NPL-006",
    address: "인천광역시 연수구 송도동 24-5 송도 더샵 마스터뷰 901호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 380000000,
    appraisalValue: 650000000,
    ltv: 58.5,
    status: "입찰예정",
    region: "인천",
    institution: "IBK기업은행",
    x: 38, y: 32,
    lat: 37.3810, lng: 126.6570,
  },
  {
    id: "NPL-007",
    address: "서울특별시 마포구 합정동 412-8 합정역 상가 2층 201호",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 280000000,
    appraisalValue: 410000000,
    ltv: 68.3,
    status: "매각진행",
    region: "서울",
    institution: "KB국민은행",
    x: 52, y: 28,
    lat: 37.5496, lng: 126.9139,
  },
  {
    id: "NPL-008",
    address: "경기도 용인시 수지구 죽전동 1338 죽전역 푸르지오 토지",
    collateralType: "LAND",
    collateralLabel: "토지",
    loanBalance: 1200000000,
    appraisalValue: 1850000000,
    ltv: 64.9,
    status: "협의중",
    region: "경기",
    institution: "신한은행",
    x: 50, y: 50,
    lat: 37.3244, lng: 127.1076,
  },
  {
    id: "NPL-009",
    address: "서울특별시 영등포구 여의도동 28-1 파크원 오피스텔 2305호",
    collateralType: "OFFICE",
    collateralLabel: "오피스텔",
    loanBalance: 540000000,
    appraisalValue: 780000000,
    ltv: 69.2,
    status: "매각진행",
    region: "서울",
    institution: "하나은행",
    x: 48, y: 34,
    lat: 37.5219, lng: 126.9245,
  },
  {
    id: "NPL-010",
    address: "경기도 화성시 동탄2동 산척리 587 동탄역 롯데캐슬 1504호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 340000000,
    appraisalValue: 580000000,
    ltv: 58.6,
    status: "입찰예정",
    region: "경기",
    institution: "우리은행",
    x: 45, y: 55,
    lat: 37.2000, lng: 127.0735,
  },
  {
    id: "NPL-011",
    address: "부산광역시 부산진구 부전동 503-15 롯데백화점 인근 상가",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 190000000,
    appraisalValue: 310000000,
    ltv: 61.3,
    status: "낙찰완료",
    region: "부산",
    institution: "농협은행",
    x: 80, y: 82,
    lat: 35.1578, lng: 129.0596,
  },
  {
    id: "NPL-012",
    address: "서울특별시 서초구 서초동 1446-2 서초 래미안 리더스원 1201호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 750000000,
    appraisalValue: 1280000000,
    ltv: 58.6,
    status: "매각진행",
    region: "서울",
    institution: "KB국민은행",
    x: 58, y: 40,
    lat: 37.4922, lng: 127.0076,
  },
  {
    id: "NPL-013",
    address: "대구광역시 달서구 월성동 1189 월배역 일대 나대지 330평",
    collateralType: "LAND",
    collateralLabel: "토지",
    loanBalance: 850000000,
    appraisalValue: 1400000000,
    ltv: 60.7,
    status: "입찰예정",
    region: "대구",
    institution: "IBK기업은행",
    x: 66, y: 70,
    lat: 35.8387, lng: 128.5560,
  },
  {
    id: "NPL-014",
    address: "인천광역시 남동구 구월동 1138-3 로데오타운 오피스텔 605호",
    collateralType: "OFFICE",
    collateralLabel: "오피스텔",
    loanBalance: 210000000,
    appraisalValue: 340000000,
    ltv: 61.8,
    status: "협의중",
    region: "인천",
    institution: "신한은행",
    x: 35, y: 36,
    lat: 37.4500, lng: 126.7036,
  },
  {
    id: "NPL-015",
    address: "경기도 고양시 일산서구 탄현동 1567 킨텍스 인근 상가 3층",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 430000000,
    appraisalValue: 680000000,
    ltv: 63.2,
    status: "매각진행",
    region: "경기",
    institution: "하나은행",
    x: 40, y: 22,
    lat: 37.6700, lng: 126.7518,
  },
  {
    id: "NPL-016",
    address: "서울특별시 강동구 천호동 440-2 천호래미안 오피스텔 1807호",
    collateralType: "OFFICE",
    collateralLabel: "오피스텔",
    loanBalance: 290000000,
    appraisalValue: 450000000,
    ltv: 64.4,
    status: "입찰예정",
    region: "서울",
    institution: "우리은행",
    x: 72, y: 32,
    lat: 37.5387, lng: 127.1237,
  },
  {
    id: "NPL-017",
    address: "경기도 파주시 운정3동 1185 운정신도시 토지 550평",
    collateralType: "LAND",
    collateralLabel: "토지",
    loanBalance: 1650000000,
    appraisalValue: 2300000000,
    ltv: 71.7,
    status: "매각진행",
    region: "경기",
    institution: "농협은행",
    x: 32, y: 18,
    lat: 37.7143, lng: 126.7528,
  },
  {
    id: "NPL-018",
    address: "부산광역시 수영구 광안동 851 광안리 해변 인근 상가 1층",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 350000000,
    appraisalValue: 520000000,
    ltv: 67.3,
    status: "협의중",
    region: "부산",
    institution: "KB국민은행",
    x: 84, y: 76,
    lat: 35.1535, lng: 129.1185,
  },
  {
    id: "NPL-019",
    address: "서울특별시 용산구 한남동 657-9 한남더힐 A동 2301호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 1450000000,
    appraisalValue: 2800000000,
    ltv: 51.8,
    status: "매각진행",
    region: "서울",
    institution: "SC제일은행",
    x: 54, y: 31,
    lat: 37.5340, lng: 126.9972,
  },
  {
    id: "NPL-020",
    address: "경기도 수원시 영통구 매탄동 416 수원 힐스테이트 1203호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 420000000,
    appraisalValue: 710000000,
    ltv: 59.2,
    status: "입찰예정",
    region: "경기",
    institution: "한국투자증권",
    x: 47, y: 48,
    lat: 37.2660, lng: 127.0018,
  },
  {
    id: "NPL-021",
    address: "서울특별시 종로구 관철동 32-5 종각역 인근 상가 지하1층",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 560000000,
    appraisalValue: 820000000,
    ltv: 68.3,
    status: "협의중",
    region: "서울",
    institution: "SC제일은행",
    x: 56, y: 26,
    lat: 37.5700, lng: 126.9831,
  },
  {
    id: "NPL-022",
    address: "경기도 안양시 동안구 평촌동 908 평촌 래미안 에스티지 토지",
    collateralType: "LAND",
    collateralLabel: "토지",
    loanBalance: 980000000,
    appraisalValue: 1550000000,
    ltv: 63.2,
    status: "매각진행",
    region: "경기",
    institution: "한국투자증권",
    x: 44, y: 46,
    lat: 37.3896, lng: 126.9510,
  },
  {
    id: "NPL-023",
    address: "서울특별시 성동구 성수동2가 315-97 성수 갤러리아포레 1502호",
    collateralType: "APARTMENT",
    collateralLabel: "아파트",
    loanBalance: 680000000,
    appraisalValue: 1120000000,
    ltv: 60.7,
    status: "입찰예정",
    region: "서울",
    institution: "IBK기업은행",
    x: 64, y: 30,
    lat: 37.5445, lng: 127.0558,
  },
  {
    id: "NPL-024",
    address: "인천광역시 서구 검단동 781 검단 신도시 오피스텔 1104호",
    collateralType: "OFFICE",
    collateralLabel: "오피스텔",
    loanBalance: 180000000,
    appraisalValue: 290000000,
    ltv: 62.1,
    status: "낙찰완료",
    region: "인천",
    institution: "농협은행",
    x: 33, y: 28,
    lat: 37.5900, lng: 126.6430,
  },
  {
    id: "NPL-025",
    address: "부산광역시 남구 대연동 49-32 대연 아이파크 상가 3층",
    collateralType: "COMMERCIAL",
    collateralLabel: "상가",
    loanBalance: 270000000,
    appraisalValue: 430000000,
    ltv: 62.8,
    status: "매각진행",
    region: "부산",
    institution: "SC제일은행",
    x: 79, y: 80,
    lat: 35.1365, lng: 129.0870,
  },
]

const REGIONS = [
  "전체", "서울", "경기", "부산", "대구", "인천",
  "광주", "대전", "울산", "세종", "강원",
  "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]

const COLLATERAL_FILTERS = [
  { key: "전체", label: "전체" },
  { key: "APARTMENT", label: "아파트" },
  { key: "COMMERCIAL", label: "상가" },
  { key: "LAND", label: "토지" },
  { key: "OFFICE", label: "오피스텔" },
]

const STATUS_FILTERS = [
  { key: "전체", label: "전체" },
  { key: "매각진행", label: "매각진행" },
  { key: "입찰예정", label: "입찰예정" },
  { key: "협의중", label: "협의중" },
]

const SORT_OPTIONS = [
  { key: "latest", label: "최신순" },
  { key: "amount", label: "금액순" },
  { key: "ltv", label: "LTV순" },
]

const STATUS_COLORS: Record<string, string> = {
  매각진행: "bg-blue-100 text-blue-700 border-blue-200",
  입찰예정: "bg-amber-100 text-amber-700 border-amber-200",
  협의중: "bg-purple-100 text-purple-700 border-purple-200",
  낙찰완료: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const MARKER_COLORS: Record<string, string> = {
  APARTMENT: "#2E75B6",
  COMMERCIAL: "#E67E22",
  LAND: "#27AE60",
  OFFICE: "#8E44AD",
}

const INSTITUTION_COLORS: Record<string, string> = {
  "KB국민은행": "#FFBC00",
  "신한은행": "#0046FF",
  "하나은행": "#009B8D",
  "우리은행": "#0066B3",
  "농협은행": "#03C75A",
  "IBK기업은행": "#005BAA",
  "SC제일은행": "#0072CE",
  "한국투자증권": "#1A1A1A",
}

const COLLATERAL_ICONS: Record<string, typeof Building2> = {
  APARTMENT: Building2,
  COMMERCIAL: Landmark,
  LAND: TreePine,
  OFFICE: Building,
}

const COLLATERAL_ICON_SVG: Record<string, string> = {
  APARTMENT: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  COMMERCIAL: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  LAND: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14V2"/><path d="M3 22h18"/><path d="M14 22V10l-3-3-3 8"/></svg>`,
  OFFICE: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
}

// ─── useKakaoMap Hook ──────────────────────────────────────
function useKakaoMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initAttempted = useRef(false)

  useEffect(() => {
    if (initAttempted.current) return
    initAttempted.current = true

    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    if (!apiKey) {
      setError("KAKAO_MAP_KEY_MISSING")
      return
    }

    // Check if SDK already loaded
    if (window.kakao?.maps) {
      initMap()
      return
    }

    // Load SDK script dynamically
    const script = document.createElement("script")
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services,clusterer`
    script.async = true

    script.onload = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          initMap()
        })
      } else {
        setError("SDK_LOAD_FAILED")
      }
    }

    script.onerror = () => {
      setError("SDK_LOAD_FAILED")
    }

    document.head.appendChild(script)

    function initMap() {
      if (!containerRef.current) {
        setError("CONTAINER_NOT_FOUND")
        return
      }

      try {
        const center = new window.kakao.maps.LatLng(37.5665, 126.9780)
        const mapInstance = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 11,
        })
        setMap(mapInstance)
        setIsLoaded(true)
      } catch (e) {
        setError("MAP_INIT_FAILED")
      }
    }

    return () => {
      // Cleanup: script stays in head for caching
    }
  }, [containerRef])

  return { map, isLoaded, error }
}

// ─── Fallback Marker Component (when no Kakao API) ─────────
function FallbackMapMarker({
  item,
  isSelected,
  onClick,
}: {
  item: NplItem
  isSelected: boolean
  onClick: () => void
}) {
  const color = MARKER_COLORS[item.collateralType] || "#2E75B6"
  const IconComp = COLLATERAL_ICONS[item.collateralType] || Building2

  return (
    <button
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
      style={{ left: `${item.x}%`, top: `${item.y}%` }}
      aria-label={`${item.address} 마커`}
    >
      {isSelected && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className={`relative flex items-center justify-center ${isSelected ? "w-10 h-10" : "w-8 h-8"} rounded-full border-2 border-white shadow-lg transition-all duration-200 cursor-pointer hover:scale-110`}
        style={{ backgroundColor: color }}
      >
        <IconComp className="w-4 h-4 text-white" />
      </span>

      {/* Price badge */}
      <span
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border"
        style={{
          backgroundColor: "white",
          color: color,
          borderColor: color + "40",
        }}
      >
        {((item.appraisalValue || 0) / 100000000).toFixed(1)}억
      </span>

      {/* Tooltip on hover */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
        <span className="block bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-left">
          <span className="block text-xs font-semibold text-gray-900 truncate">
            {item.address.split(" ").slice(0, 4).join(" ")}
          </span>
          <span className="flex items-center gap-1 mt-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-gray-500">{item.collateralLabel}</span>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
              {item.status}
            </span>
          </span>
          <span className="block mt-1.5 text-[11px] text-gray-600">
            감정가 <strong className="text-gray-900">{formatKRW(item.appraisalValue)}</strong>
          </span>
          <span className="block text-[11px] text-gray-600">
            대출잔액 <strong className="text-gray-900">{formatKRW(item.loanBalance)}</strong>
          </span>
          <span className="block text-[11px] text-gray-600">
            LTV <strong className="text-[#E74C3C]">{item.ltv}%</strong>
          </span>
        </span>
      </span>
    </button>
  )
}

// ─── Enhanced Sidebar Item ──────────────────────────────────
function SidebarItem({
  item,
  isSelected,
  onClick,
}: {
  item: NplItem
  isSelected: boolean
  onClick: () => void
}) {
  const IconComp = COLLATERAL_ICONS[item.collateralType] || Building2
  const markerColor = MARKER_COLORS[item.collateralType] || "#2E75B6"
  const instColor = INSTITUTION_COLORS[item.institution] || "#6B7280"
  const ltvColor = item.ltv >= 70 ? "#DC2626" : item.ltv >= 60 ? "#D97706" : "#16A34A"

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50 ${
        isSelected ? "bg-blue-50 border-l-[3px]" : "border-l-[3px] border-l-transparent"
      }`}
      style={isSelected ? { borderLeftColor: markerColor } : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
          style={{ backgroundColor: `${markerColor}15` }}
        >
          <IconComp className="w-4 h-4" style={{ color: markerColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: instColor }}
              />
              {item.institution}
            </span>
            <Badge
              className="text-[10px] px-1.5 py-0 border"
              style={{
                backgroundColor: `${markerColor}15`,
                color: markerColor,
                borderColor: `${markerColor}30`,
              }}
            >
              {item.collateralLabel}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 border ${STATUS_COLORS[item.status]}`}>
              {item.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900 truncate">{item.address}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
            <span>
              대출잔액 <strong className="text-gray-700">{formatKRW(item.loanBalance)}</strong>
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
            <span>
              감정가 <strong className="text-gray-700">{formatKRW(item.appraisalValue)}</strong>
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(item.ltv, 100)}%`,
                  backgroundColor: ltvColor,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: ltvColor }}>
              LTV {item.ltv}%
            </span>
          </div>
          <Link
            href={`/listings/${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium hover:underline text-[#2E75B6]"
          >
            상세보기
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 mt-3 flex-shrink-0" />
      </div>
    </button>
  )
}

// ─── Enhanced Detail Panel ──────────────────────────────────
function DetailPanel({ item, onClose }: { item: NplItem; onClose: () => void }) {
  const markerColor = MARKER_COLORS[item.collateralType] || "#2E75B6"
  const instColor = INSTITUTION_COLORS[item.institution] || "#6B7280"
  const IconComp = COLLATERAL_ICONS[item.collateralType] || Building2
  const ltvColor = item.ltv >= 70 ? "#DC2626" : item.ltv >= 60 ? "#D97706" : "#16A34A"

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-16 md:w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden">
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: `${markerColor}10` }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${markerColor}20` }}
        >
          <IconComp className="w-5 h-5" style={{ color: markerColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              className="text-[10px] px-1.5 py-0 border"
              style={{
                backgroundColor: `${markerColor}15`,
                color: markerColor,
                borderColor: `${markerColor}30`,
              }}
            >
              {item.collateralLabel}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 border ${STATUS_COLORS[item.status]}`}>
              {item.status}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{item.id}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: instColor }}
          />
          <span className="text-xs font-medium text-gray-700">{item.institution}</span>
        </div>
        <div>
          <p className="text-xs text-gray-400">주소</p>
          <p className="text-sm text-gray-900 mt-0.5">{item.address}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-[11px] text-gray-400">감정가</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatKRW(item.appraisalValue)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-[11px] text-gray-400">대출잔액</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {formatKRW(item.loanBalance)}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-gray-400">LTV (담보인정비율)</p>
            <p className="text-sm font-bold" style={{ color: ltvColor }}>{item.ltv}%</p>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(item.ltv, 100)}%`,
                backgroundColor: ltvColor,
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-[11px] text-gray-400">지역</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.region}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-[11px] text-gray-400">상태</p>
            <p className="mt-0.5">
              <Badge className={`text-[11px] px-2 py-0.5 border ${STATUS_COLORS[item.status]}`}>
                {item.status}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Link href="/npl-analysis" className="flex-1">
            <Button
              variant="outline"
              className="w-full text-xs h-9 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              NPL 분석
            </Button>
          </Link>
          <Link href="/exchange/auction" className="flex-1">
            <Button
              variant="outline"
              className="w-full text-xs h-9 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Gavel className="w-3.5 h-3.5" />
              입찰 참여
            </Button>
          </Link>
        </div>
        <Link href={`/listings/${item.id}`} className="block">
          <Button
            className="w-full text-white text-xs h-9 gap-1.5 bg-[#1B3A5C]"
          >
            <Eye className="w-3.5 h-3.5" />
            상세 보기
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ─── Kakao Map Overlay HTML builders ────────────────────────
function buildMarkerHtml(item: NplItem, isSelected: boolean): string {
  const color = MARKER_COLORS[item.collateralType] || "#2E75B6"
  const icon = COLLATERAL_ICON_SVG[item.collateralType] || COLLATERAL_ICON_SVG.APARTMENT
  const size = isSelected ? 40 : 32
  const priceText = (item.appraisalValue / 100000000).toFixed(1) + "억"

  return `
    <div style="cursor:pointer;display:flex;flex-direction:column;align-items:center;position:relative;" data-npl-id="${item.id}">
      ${isSelected ? `<div style="position:absolute;width:${size + 8}px;height:${size + 8}px;border-radius:50%;background:${color};opacity:0.25;animation:kakao-ping 1.2s cubic-bezier(0,0,0.2,1) infinite;top:-4px;left:50%;transform:translateX(-50%);"></div>` : ""}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transition:transform 0.2s;position:relative;"
           onmouseover="this.style.transform='scale(1.15)'"
           onmouseout="this.style.transform='scale(1)'"
      >
        ${icon}
      </div>
      <div style="margin-top:3px;background:white;border:1.5px solid ${color}40;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700;color:${color};white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
        ${priceText}
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid white;margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.08));"></div>
    </div>
    <style>
      @keyframes kakao-ping {
        75%, 100% { transform: translateX(-50%) scale(2); opacity: 0; }
      }
    </style>
  `
}

// ─── Main Page Component ────────────────────────────────────
export function MarketMapPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("전체")
  const [selectedCollateral, setSelectedCollateral] = useState("전체")
  const [selectedStatus, setSelectedStatus] = useState("전체")
  const [sortBy, setSortBy] = useState("latest")
  const [selectedItem, setSelectedItem] = useState<NplItem | null>(null)
  const [mobileView, setMobileView] = useState<"map" | "list">("map")
  const [zoomLevel, setZoomLevel] = useState(1) // for fallback map only
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [apiItems, setApiItems] = useState<NplItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap")
  const [showReSearch, setShowReSearch] = useState(false)
  const [isBoundsLoading, setIsBoundsLoading] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)

  // Kakao Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { map: kakaoMap, isLoaded: kakaoLoaded, error: kakaoError } = useKakaoMap(mapContainerRef)
  const overlaysRef = useRef<any[]>([])
  const clustererRef = useRef<any>(null)
  const boundsListenerRef = useRef<any>(null)

  const isKakaoReady = kakaoLoaded && kakaoMap
  const isFallback = !isKakaoReady

  // ─── API Integration (fallback to mock data) ──────────────
  useEffect(() => {
    const controller = new AbortController()
    async function fetchItems() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          swLat: "33.0",
          swLng: "124.0",
          neLat: "38.5",
          neLng: "132.0",
        })
        if (selectedRegion !== "전체") params.set("region", selectedRegion)
        if (selectedCollateral !== "전체") params.set("collateralType", selectedCollateral)
        if (searchQuery) params.set("q", searchQuery)

        const res = await fetch(`/api/v1/market/map?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("API error")
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((item: any, idx: number) => ({
            ...item,
            x: item.x ?? 15 + (idx % 5) * 17,
            y: item.y ?? 15 + Math.floor(idx / 5) * 18,
            lat: item.lat ?? 37.5665 + (Math.random() - 0.5) * 0.2,
            lng: item.lng ?? 126.9780 + (Math.random() - 0.5) * 0.3,
          }))
          setApiItems(enriched)
        } else if (data?.items && Array.isArray(data.items)) {
          const enriched = data.items.map((item: any, idx: number) => ({
            ...item,
            x: item.x ?? 15 + (idx % 5) * 17,
            y: item.y ?? 15 + Math.floor(idx / 5) * 18,
            lat: item.lat ?? 37.5665 + (Math.random() - 0.5) * 0.2,
            lng: item.lng ?? 126.9780 + (Math.random() - 0.5) * 0.3,
          }))
          setApiItems(enriched)
        } else {
          setApiItems(null)
        }
      } catch {
        setApiItems(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchItems()
    return () => controller.abort()
  }, [selectedRegion, selectedCollateral, searchQuery])

  // ─── Filtering & Sorting ─────────────────────────────────
  const filteredItems = useMemo(() => {
    let items: NplItem[]
    if (apiItems) {
      items = apiItems
    } else {
      items = MOCK_NPL_ITEMS.filter((item) => {
        if (selectedRegion !== "전체" && item.region !== selectedRegion) return false
        if (selectedCollateral !== "전체" && item.collateralType !== selectedCollateral) return false
        if (selectedStatus !== "전체" && item.status !== selectedStatus) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            (item.address || '').toLowerCase().includes(q) ||
            (item.id || '').toLowerCase().includes(q) ||
            (item.institution || '').toLowerCase().includes(q)
          )
        }
        return true
      })
    }

    const sorted = [...items]
    if (sortBy === "amount") {
      sorted.sort((a, b) => b.appraisalValue - a.appraisalValue)
    } else if (sortBy === "ltv") {
      sorted.sort((a, b) => b.ltv - a.ltv)
    }

    return sorted
  }, [searchQuery, selectedRegion, selectedCollateral, selectedStatus, sortBy, apiItems])

  // ─── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const count = filteredItems.length
    const total = MOCK_NPL_ITEMS.length
    const avgAppraisal =
      count > 0
        ? filteredItems.reduce((s, i) => s + i.appraisalValue, 0) / count
        : 0
    const avgLtv =
      count > 0
        ? filteredItems.reduce((s, i) => s + i.ltv, 0) / count
        : 0
    return { count, total, avgAppraisal, avgLtv }
  }, [filteredItems])

  const handleSelectItem = useCallback((item: NplItem) => {
    setSelectedItem((prev) => (prev?.id === item.id ? null : item))
  }, [])

  // ─── Kakao Map: Manage overlays + clusterer ─────────────
  useEffect(() => {
    if (!isKakaoReady) return

    // Clear existing overlays
    overlaysRef.current.forEach((ov) => ov.setMap(null))
    overlaysRef.current = []

    // Clear existing clusterer
    if (clustererRef.current) {
      clustererRef.current.clear()
    }

    const markers: any[] = []

    filteredItems.forEach((item) => {
      const position = new window.kakao.maps.LatLng(item.lat, item.lng)
      const isSelected = selectedItem?.id === item.id

      const content = document.createElement("div")
      content.innerHTML = buildMarkerHtml(item, isSelected)
      content.addEventListener("click", () => {
        handleSelectItem(item)
      })

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1.3,
        zIndex: isSelected ? 100 : 10,
      })

      overlay.setMap(kakaoMap)
      overlaysRef.current.push(overlay)

      // Also create a hidden marker for the clusterer
      const marker = new window.kakao.maps.Marker({
        position,
        visible: false,
      })
      markers.push(marker)
    })

    // Create clusterer
    if (!clustererRef.current) {
      clustererRef.current = new window.kakao.maps.MarkerClusterer({
        map: kakaoMap,
        averageCenter: true,
        minLevel: 6,
        disableClickZoom: false,
        styles: [
          {
            width: "50px",
            height: "50px",
            background: "rgba(27, 58, 92, 0.85)",
            borderRadius: "50%",
            border: "3px solid white",
            color: "white",
            textAlign: "center",
            fontWeight: "bold",
            lineHeight: "44px",
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          },
          {
            width: "60px",
            height: "60px",
            background: "rgba(46, 117, 182, 0.85)",
            borderRadius: "50%",
            border: "3px solid white",
            color: "white",
            textAlign: "center",
            fontWeight: "bold",
            lineHeight: "54px",
            fontSize: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          },
        ],
      })
    }

    clustererRef.current.clear()
    clustererRef.current.addMarkers(markers)

    return () => {
      overlaysRef.current.forEach((ov) => ov.setMap(null))
      overlaysRef.current = []
    }
  }, [isKakaoReady, kakaoMap, filteredItems, selectedItem, handleSelectItem])

  // ─── Bounds-based reload ──────────────────────────────────
  const fetchItemsByBounds = useCallback(async () => {
    if (!isKakaoReady) return
    const bounds = kakaoMap.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()

    setIsBoundsLoading(true)
    setShowReSearch(false)

    try {
      const params = new URLSearchParams({
        swLat: String(sw.getLat()),
        swLng: String(sw.getLng()),
        neLat: String(ne.getLat()),
        neLng: String(ne.getLng()),
      })
      if (selectedRegion !== "전체") params.set("region", selectedRegion)
      if (selectedCollateral !== "전체") params.set("collateralType", selectedCollateral)
      if (searchQuery) params.set("q", searchQuery)

      const res = await fetch(`/api/v1/market/map?${params.toString()}`)
      if (!res.ok) throw new Error("API error")
      const data = await res.json()

      const raw: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : []

      if (raw.length > 0) {
        const enriched = raw.map((item: any, idx: number) => ({
          ...item,
          x: item.x ?? 15 + (idx % 5) * 17,
          y: item.y ?? 15 + Math.floor(idx / 5) * 18,
          lat: item.lat ?? 37.5665 + (Math.random() - 0.5) * 0.2,
          lng: item.lng ?? 126.9780 + (Math.random() - 0.5) * 0.3,
        }))
        setApiItems(enriched)
      } else {
        // No results in this area — keep current items visible
      }
    } catch {
      // Silently fall back to existing items
    } finally {
      setIsBoundsLoading(false)
    }
  }, [isKakaoReady, kakaoMap, selectedRegion, selectedCollateral, searchQuery])

  // ─── Kakao Map: dragend + zoom_changed listeners ──────────
  useEffect(() => {
    if (!isKakaoReady) return

    const handleDragEnd = () => {
      setShowReSearch(true)
    }

    const handleZoomChanged = () => {
      setShowReSearch(true)
    }

    window.kakao.maps.event.addListener(kakaoMap, "dragend", handleDragEnd)
    window.kakao.maps.event.addListener(kakaoMap, "zoom_changed", handleZoomChanged)

    return () => {
      window.kakao.maps.event.removeListener(kakaoMap, "dragend", handleDragEnd)
      window.kakao.maps.event.removeListener(kakaoMap, "zoom_changed", handleZoomChanged)
    }
  }, [isKakaoReady, kakaoMap])

  // ─── Kakao Map: pan to selected item ─────────────────────
  useEffect(() => {
    if (!isKakaoReady || !selectedItem) return
    const position = new window.kakao.maps.LatLng(selectedItem.lat, selectedItem.lng)
    kakaoMap.panTo(position)
  }, [isKakaoReady, kakaoMap, selectedItem])

  // ─── Kakao Map: map type toggle ──────────────────────────
  useEffect(() => {
    if (!isKakaoReady) return
    if (mapType === "satellite") {
      kakaoMap.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID)
    } else {
      kakaoMap.setMapTypeId(window.kakao.maps.MapTypeId.ROADMAP)
    }
  }, [isKakaoReady, kakaoMap, mapType])

  // ─── Map Controls ────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    if (isKakaoReady) {
      kakaoMap.setLevel(kakaoMap.getLevel() - 1)
    } else {
      setZoomLevel((z) => Math.min(z + 0.2, 2))
    }
  }, [isKakaoReady, kakaoMap])

  const handleZoomOut = useCallback(() => {
    if (isKakaoReady) {
      kakaoMap.setLevel(kakaoMap.getLevel() + 1)
    } else {
      setZoomLevel((z) => Math.max(z - 0.2, 0.6))
    }
  }, [isKakaoReady, kakaoMap])

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isKakaoReady) {
          const center = new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
          kakaoMap.setCenter(center)
          kakaoMap.setLevel(5)
        }
      },
      () => {
        // Fallback: center on Seoul
        if (isKakaoReady) {
          const center = new window.kakao.maps.LatLng(37.5665, 126.9780)
          kakaoMap.setCenter(center)
          kakaoMap.setLevel(11)
        } else {
          setZoomLevel(1)
        }
      }
    )
  }, [isKakaoReady, kakaoMap])

  const handleMapTypeToggle = useCallback(() => {
    setMapType((prev) => (prev === "roadmap" ? "satellite" : "roadmap"))
  }, [])

  // ─── Sidebar collapse persistence ──────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("npl-map-sidebar")
    if (saved === "collapsed") setSidebarCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem("npl-map-sidebar", sidebarCollapsed ? "collapsed" : "expanded")
  }, [sidebarCollapsed])

  // ─── Sidebar Content (shared between desktop & mobile sheet) ─
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="주소, 매물번호, 금융기관 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Collateral type filters */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1 mb-1.5">
          <Filter className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">담보유형</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {COLLATERAL_FILTERS.map((f) => {
            const isActive = selectedCollateral === f.key
            return (
              <Button
                key={f.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs rounded-full px-3 ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                style={isActive ? { backgroundColor: "#1B3A5C" } : undefined}
                onClick={() => setSelectedCollateral(f.key)}
              >
                {f.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Status filters */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1 mb-1.5">
          <Info className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">상태</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const isActive = selectedStatus === f.key
            return (
              <Button
                key={f.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs rounded-full px-3 ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                style={isActive ? { backgroundColor: "#1B3A5C" } : undefined}
                onClick={() => setSelectedStatus(f.key)}
              >
                {f.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Sort + Results count */}
      <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          검색결과 <strong className="text-gray-900">{filteredItems.length}</strong>건
        </p>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer pr-1"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-100 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="w-12 h-4 bg-gray-200 rounded" />
                      <div className="w-14 h-4 bg-gray-200 rounded" />
                    </div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded" />
                    <div className="w-1/2 h-3 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">검색 결과가 없습니다</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              onClick={() => handleSelectItem(item)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  )

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col bg-white border-r border-gray-200 shrink-0 transition-all duration-300 overflow-hidden relative ${
          sidebarCollapsed ? "w-0 border-r-0" : "w-[380px]"
        }`}
      >
        {!sidebarCollapsed && sidebarContent}
        {/* Collapse button on sidebar edge */}
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="absolute top-1/2 -translate-y-1/2 -right-0 z-20 w-5 h-10 bg-white border border-gray-200 border-l-0 rounded-r-md shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="사이드바 접기"
          style={{ display: sidebarCollapsed ? "none" : "flex" }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Map Area (primary focus - fills remaining space) */}
      <div className="flex-1 relative overflow-hidden">
        {/* ─── Hero Bar (absolute overlay, 40px) ───────────── */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50"
          style={{ height: "40px" }}
        >
          <h1 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
            NPL 지도
          </h1>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[90px] h-7 text-xs bg-white/60 dark:bg-gray-800/60 border-gray-300/50 dark:border-gray-600/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sidebar re-open button (when collapsed) */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="hidden md:flex items-center gap-1.5 ml-auto px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 bg-white/70 dark:bg-gray-800/70 border border-gray-200/60 hover:bg-white transition-colors"
              title="사이드바 열기"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
              <span>목록</span>
            </button>
          )}
        </div>

        {/* Map container area */}
        <div
          className={`absolute inset-0 ${
            mobileView === "list" ? "hidden md:block" : "block"
          }`}
        >
          {/* Kakao Map Container */}
          <div
            ref={mapContainerRef}
            className="absolute inset-0 w-full h-full"
            style={{
              display: isKakaoReady ? "block" : "none",
            }}
          />

          {/* Fallback: gray background with positioned markers when no Kakao API */}
          {isFallback && (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-100 to-gray-200">
              {/* Grid pattern for fallback */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                }}
              />

              {/* API key missing message */}
              {kakaoError === "KAKAO_MAP_KEY_MISSING" && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 shadow-sm flex items-start gap-3 max-w-md">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        카카오맵 API 키를 설정해주세요
                      </p>
                      <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                        <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                          .env.local
                        </code>{" "}
                        파일에{" "}
                        <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                          NEXT_PUBLIC_KAKAO_MAP_KEY=YOUR_KEY
                        </code>{" "}
                        를 추가하세요.
                      </p>
                      <p className="text-[11px] text-amber-500 mt-1.5">
                        Kakao Developers &rarr; 애플리케이션 &rarr; JavaScript 키 사용
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {kakaoError && kakaoError !== "KAKAO_MAP_KEY_MISSING" && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">
                      카카오맵 로드 실패 - 대체 지도로 표시 중
                    </p>
                  </div>
                </div>
              )}

              {/* Fallback markers */}
              <div
                className="absolute inset-0 transition-transform duration-300 pointer-events-none"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {filteredItems.map((item) => (
                  <div key={item.id} className="pointer-events-auto">
                    <FallbackMapMarker
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => handleSelectItem(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 bg-white rounded-xl shadow-lg px-8 py-6 border border-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium text-gray-600">데이터를 불러오는 중...</p>
              </div>
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-12 right-4 flex flex-col gap-1 z-20">
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 bg-white shadow-md border-gray-200 hover:bg-gray-50"
              onClick={handleZoomIn}
              title="확대"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 bg-white shadow-md border-gray-200 hover:bg-gray-50"
              onClick={handleZoomOut}
              title="축소"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 bg-white shadow-md border-gray-200 hover:bg-gray-50 mt-1"
              onClick={handleCurrentLocation}
              title="현재 위치"
            >
              <Locate className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`w-9 h-9 shadow-md border-gray-200 mt-1 ${
                mapType === "satellite"
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={handleMapTypeToggle}
              title={mapType === "roadmap" ? "위성지도" : "일반지도"}
            >
              {mapType === "roadmap" ? (
                <Satellite className="w-4 h-4 text-gray-600" />
              ) : (
                <MapPinned className="w-4 h-4 text-blue-600" />
              )}
            </Button>
          </div>

          {/* Re-search this area button */}
          {isKakaoReady && showReSearch && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                onClick={fetchItemsByBounds}
                disabled={isBoundsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed bg-emerald-500"
              >
                {isBoundsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {isBoundsLoading ? "검색 중..." : "이 지역 재검색"}
              </button>
            </div>
          )}

          {/* Map Legend (collapsible, default collapsed) */}
          <div className="absolute bottom-2 left-2 z-20 hidden md:block">
            {legendOpen ? (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-md border border-gray-200/60 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-semibold text-gray-600">범례</span>
                  <button
                    onClick={() => setLegendOpen(false)}
                    className="ml-auto p-0.5 rounded hover:bg-gray-200/60 transition-colors"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(MARKER_COLORS).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[11px] text-gray-600">
                        {COLLATERAL_TYPES[key as keyof typeof COLLATERAL_TYPES] || key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLegendOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md border border-gray-200/60 text-[11px] font-medium text-gray-600 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                범례
              </button>
            )}
          </div>

          {/* ─── Bottom Stats Bar (absolute overlay, collapsible) ─ */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border-t border-gray-200/50 transition-all duration-200"
          >
            {/* Compact line (always visible, 32px) */}
            <div className="flex items-center justify-between px-4 text-xs" style={{ height: "32px" }}>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-200">
                  표시 매물 <strong className="text-blue-600 dark:text-blue-400">{stats.count}</strong>건
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-gray-700 dark:text-gray-200">
                  평균 감정가{" "}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {(stats.avgAppraisal / 100000000).toFixed(1)}억
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setStatsExpanded((v) => !v)}
                className="p-1 rounded hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                title={statsExpanded ? "통계 접기" : "통계 펼치기"}
              >
                {statsExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>
            </div>
            {/* Expanded stats */}
            {statsExpanded && (
              <div className="px-4 pb-2 pt-0 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-200/40">
                <span>
                  평균 LTV{" "}
                  <strong className="text-amber-600 dark:text-amber-400">{stats.avgLtv.toFixed(1)}%</strong>
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>
                  전체 <strong className="text-blue-600 dark:text-blue-400">{stats.total}</strong>건
                </span>
                <span className="ml-auto text-[10px] text-gray-400">
                  데이터 기준일: 2026-03-15
                </span>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <DetailPanel
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </div>

        {/* Mobile List View */}
        <div
          className={`absolute inset-0 flex-col bg-white ${
            mobileView === "list" ? "flex md:hidden" : "hidden"
          }`}
        >
          {sidebarContent}
        </div>
      </div>

      {/* ─── Mobile Toggle FAB ───────────────────────────── */}
      <div className="md:hidden fixed bottom-4 right-4 z-20 flex flex-col gap-2">
        <Button
          className="w-12 h-12 rounded-full shadow-lg text-white bg-[#1B3A5C]"
          onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
        >
          {mobileView === "map" ? (
            <List className="w-5 h-5" />
          ) : (
            <Map className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* ─── Mobile Sheet for item detail ────────────────── */}
      {selectedItem && (
        <Sheet
          open={!!selectedItem}
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null)
          }}
        >
          <SheetContent side="bottom" className="md:hidden rounded-t-xl p-0 max-h-[70vh]">
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedItem.id} 상세정보</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
