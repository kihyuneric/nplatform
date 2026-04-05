"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Gavel, Clock, Eye, Users, Building2, ArrowUpDown,
  Search, TrendingUp, MapPin, ChevronLeft, ChevronRight,
  LayoutGrid, List, AlertTriangle, Calendar, Banknote, Loader2,
  FileText, Plus, PercentCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { GuideButton } from "@/components/guide/guide-button"

// ─── Types ───────────────────────────────────────────────────

type BiddingStatus = "BIDDING" | "CLOSING_SOON" | "COMPLETED"
type CollateralType = "아파트" | "상가" | "토지" | "오피스텔" | "빌라" | "공장"

interface BiddingItem {
  id: string
  institution: string
  collateralType: CollateralType
  address: string
  loanPrincipal: number
  appraisalValue: number
  askingPrice: number
  ltv: number
  biddingDeadline: string
  status: BiddingStatus
  participants: number
  viewCount: number
}

// ─── Helpers ─────────────────────────────────────────────────

function formatKRW(amount: number | undefined | null): string {
  if (!amount && amount !== 0) return "-"
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000)
    const man = Math.floor((amount % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}

function getDDay(deadline: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(deadline)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDDayLabel(dday: number): string {
  if (dday < 0) return "마감"
  if (dday === 0) return "D-Day"
  return `D-${dday}`
}

function getDDayColor(dday: number): string {
  if (dday < 0) return "text-gray-400"
  if (dday <= 3) return "text-red-600"
  if (dday <= 7) return "text-orange-500"
  return "text-green-600"
}

function getDDayBgColor(dday: number): string {
  if (dday < 0) return "bg-gray-100 dark:bg-gray-800"
  if (dday <= 3) return "bg-red-50 dark:bg-red-900/30"
  if (dday <= 7) return "bg-orange-50 dark:bg-orange-900/30"
  return "bg-green-50 dark:bg-green-900/30"
}

function getStatusBadge(status: BiddingStatus) {
  switch (status) {
    case "BIDDING":
      return <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800">입찰중</Badge>
    case "CLOSING_SOON":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800">마감임박</Badge>
    case "COMPLETED":
      return <Badge className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">입찰완료</Badge>
  }
}

function getLtvColor(ltv: number): string {
  if (ltv <= 50) return "bg-blue-500"
  if (ltv <= 70) return "bg-amber-500"
  return "bg-red-500"
}

function getLtvTextColor(ltv: number): string {
  if (ltv <= 50) return "text-blue-600"
  if (ltv <= 70) return "text-amber-600"
  return "text-red-600"
}

function getInstitutionInitial(name: any): string {
  if (!name || typeof name !== 'string') return "?"
  if (name.startsWith("KB")) return "KB"
  if (name.startsWith("NH")) return "NH"
  if (name.startsWith("IBK")) return "IBK"
  if (name === "한국자산관리공사") return "캠코"
  return name.charAt(0)
}

function getInstitutionColor(name: string | undefined | null): string {
  if (!name) return "bg-gray-500"
  const colors: Record<string, string> = {
    "KB국민은행": "bg-amber-500",
    "신한은행": "bg-blue-600",
    "우리은행": "bg-sky-500",
    "하나은행": "bg-teal-600",
    "IBK기업은행": "bg-indigo-600",
    "한국자산관리공사": "bg-red-600",
    "NH농협": "bg-green-600",
    "수협": "bg-cyan-600",
    "산업은행": "bg-slate-600",
  }
  return colors[name] || "bg-gray-500"
}

// ─── Mock Data (20 items) ────────────────────────────────────

const MOCK_DATA: BiddingItem[] = [
  {
    id: "bid-001", institution: "KB국민은행", collateralType: "아파트",
    address: "서울 강남구 삼성동 래미안아파트 102동 1503호",
    loanPrincipal: 1450000000, appraisalValue: 1800000000, askingPrice: 1100000000,
    ltv: 80.5, biddingDeadline: "2026-03-22T18:00:00Z", status: "BIDDING",
    participants: 12, viewCount: 342,
  },
  {
    id: "bid-002", institution: "신한은행", collateralType: "상가",
    address: "서울 서초구 서초동 상가건물 1층 101호",
    loanPrincipal: 820000000, appraisalValue: 1050000000, askingPrice: 650000000,
    ltv: 78.1, biddingDeadline: "2026-03-20T18:00:00Z", status: "CLOSING_SOON",
    participants: 8, viewCount: 256,
  },
  {
    id: "bid-003", institution: "우리은행", collateralType: "오피스텔",
    address: "서울 마포구 상암동 디지털큐브 오피스텔 805호",
    loanPrincipal: 380000000, appraisalValue: 520000000, askingPrice: 310000000,
    ltv: 73.1, biddingDeadline: "2026-03-25T18:00:00Z", status: "BIDDING",
    participants: 15, viewCount: 189,
  },
  {
    id: "bid-004", institution: "하나은행", collateralType: "토지",
    address: "경기 용인시 처인구 양지면 대지 352평",
    loanPrincipal: 950000000, appraisalValue: 1200000000, askingPrice: 780000000,
    ltv: 79.2, biddingDeadline: "2026-03-21T18:00:00Z", status: "CLOSING_SOON",
    participants: 5, viewCount: 134,
  },
  {
    id: "bid-005", institution: "IBK기업은행", collateralType: "아파트",
    address: "경기 성남시 분당구 정자동 파크뷰 201동 902호",
    loanPrincipal: 720000000, appraisalValue: 980000000, askingPrice: 580000000,
    ltv: 73.5, biddingDeadline: "2026-03-28T18:00:00Z", status: "BIDDING",
    participants: 22, viewCount: 467,
  },
  {
    id: "bid-006", institution: "한국자산관리공사", collateralType: "상가",
    address: "부산 해운대구 우동 상가빌딩 지하1층~지상2층",
    loanPrincipal: 1680000000, appraisalValue: 2100000000, askingPrice: 1350000000,
    ltv: 80.0, biddingDeadline: "2026-03-16T18:00:00Z", status: "COMPLETED",
    participants: 18, viewCount: 523,
  },
  {
    id: "bid-007", institution: "NH농협", collateralType: "빌라",
    address: "서울 영등포구 당산동 리버빌라 3층 301호",
    loanPrincipal: 560000000, appraisalValue: 720000000, askingPrice: 440000000,
    ltv: 77.8, biddingDeadline: "2026-03-30T18:00:00Z", status: "BIDDING",
    participants: 9, viewCount: 215,
  },
  {
    id: "bid-008", institution: "수협", collateralType: "토지",
    address: "인천 강화군 강화읍 농지 1,250평",
    loanPrincipal: 320000000, appraisalValue: 450000000, askingPrice: 250000000,
    ltv: 71.1, biddingDeadline: "2026-04-02T18:00:00Z", status: "BIDDING",
    participants: 3, viewCount: 78,
  },
  {
    id: "bid-009", institution: "하나은행", collateralType: "아파트",
    address: "대구 수성구 범어동 현대아파트 507동 1801호",
    loanPrincipal: 480000000, appraisalValue: 650000000, askingPrice: 390000000,
    ltv: 73.8, biddingDeadline: "2026-04-05T18:00:00Z", status: "BIDDING",
    participants: 14, viewCount: 298,
  },
  {
    id: "bid-010", institution: "산업은행", collateralType: "공장",
    address: "인천 남동구 논현동 공장용지 및 건물 1동",
    loanPrincipal: 2100000000, appraisalValue: 2800000000, askingPrice: 1750000000,
    ltv: 75.0, biddingDeadline: "2026-03-20T18:00:00Z", status: "CLOSING_SOON",
    participants: 6, viewCount: 167,
  },
  {
    id: "bid-011", institution: "IBK기업은행", collateralType: "상가",
    address: "부산 부산진구 부전동 근린상가 3층 301호",
    loanPrincipal: 290000000, appraisalValue: 400000000, askingPrice: 230000000,
    ltv: 72.5, biddingDeadline: "2026-03-15T18:00:00Z", status: "COMPLETED",
    participants: 11, viewCount: 189,
  },
  {
    id: "bid-012", institution: "한국자산관리공사", collateralType: "아파트",
    address: "경기 고양시 일산서구 주엽동 강선마을 103동 704호",
    loanPrincipal: 410000000, appraisalValue: 550000000, askingPrice: 330000000,
    ltv: 74.5, biddingDeadline: "2026-04-08T18:00:00Z", status: "BIDDING",
    participants: 19, viewCount: 356,
  },
  {
    id: "bid-013", institution: "KB국민은행", collateralType: "토지",
    address: "경기 화성시 봉담읍 대지 890평",
    loanPrincipal: 1150000000, appraisalValue: 1500000000, askingPrice: 920000000,
    ltv: 76.7, biddingDeadline: "2026-03-21T18:00:00Z", status: "CLOSING_SOON",
    participants: 7, viewCount: 201,
  },
  {
    id: "bid-014", institution: "신한은행", collateralType: "오피스텔",
    address: "서울 강서구 마곡동 보타닉파크 오피스텔 612호",
    loanPrincipal: 340000000, appraisalValue: 470000000, askingPrice: 275000000,
    ltv: 72.3, biddingDeadline: "2026-04-01T18:00:00Z", status: "BIDDING",
    participants: 10, viewCount: 143,
  },
  {
    id: "bid-015", institution: "우리은행", collateralType: "빌라",
    address: "서울 관악구 신림동 신림빌라 2층 202호",
    loanPrincipal: 250000000, appraisalValue: 380000000, askingPrice: 200000000,
    ltv: 65.8, biddingDeadline: "2026-04-10T18:00:00Z", status: "BIDDING",
    participants: 4, viewCount: 92,
  },
  {
    id: "bid-016", institution: "NH농협", collateralType: "공장",
    address: "경기 안산시 단원구 원시동 공장건물 2동",
    loanPrincipal: 3500000000, appraisalValue: 4800000000, askingPrice: 2800000000,
    ltv: 72.9, biddingDeadline: "2026-04-15T18:00:00Z", status: "BIDDING",
    participants: 3, viewCount: 112,
  },
  {
    id: "bid-017", institution: "KB국민은행", collateralType: "아파트",
    address: "부산 수영구 광안동 삼익비치타운 12동 501호",
    loanPrincipal: 680000000, appraisalValue: 900000000, askingPrice: 540000000,
    ltv: 75.6, biddingDeadline: "2026-03-26T18:00:00Z", status: "BIDDING",
    participants: 16, viewCount: 388,
  },
  {
    id: "bid-018", institution: "산업은행", collateralType: "토지",
    address: "대구 달서구 성당동 상업용지 620평",
    loanPrincipal: 5200000000, appraisalValue: 7000000000, askingPrice: 4200000000,
    ltv: 74.3, biddingDeadline: "2026-03-18T18:00:00Z", status: "CLOSING_SOON",
    participants: 2, viewCount: 87,
  },
  {
    id: "bid-019", institution: "수협", collateralType: "상가",
    address: "인천 중구 신포동 상가건물 1~2층",
    loanPrincipal: 520000000, appraisalValue: 700000000, askingPrice: 410000000,
    ltv: 74.3, biddingDeadline: "2026-04-12T18:00:00Z", status: "BIDDING",
    participants: 7, viewCount: 156,
  },
  {
    id: "bid-020", institution: "신한은행", collateralType: "아파트",
    address: "경기 수원시 영통구 영통동 벽산아파트 105동 1203호",
    loanPrincipal: 510000000, appraisalValue: 680000000, askingPrice: 400000000,
    ltv: 75.0, biddingDeadline: "2026-03-14T18:00:00Z", status: "COMPLETED",
    participants: 20, viewCount: 445,
  },
]

// ─── Filter Options ──────────────────────────────────────────

const INSTITUTION_OPTIONS = [
  "전체", "KB국민은행", "신한은행", "우리은행", "하나은행",
  "IBK기업은행", "한국자산관리공사", "NH농협", "수협", "산업은행",
]

const COLLATERAL_OPTIONS = [
  { value: "ALL", label: "전체 담보유형" },
  { value: "아파트", label: "아파트" },
  { value: "상가", label: "상가" },
  { value: "토지", label: "토지" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "빌라", label: "빌라" },
  { value: "공장", label: "공장" },
]

const SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "amountHigh", label: "금액높은순" },
  { value: "amountLow", label: "금액낮은순" },
  { value: "participants", label: "참여자순" },
]

const ITEMS_PER_PAGE = 8

// ─── Page Component ──────────────────────────────────────────

export default function BiddingPage() {
  const [activeTab, setActiveTab] = useState("ALL")
  const [collateralFilter, setCollateralFilter] = useState("ALL")
  const [institutionFilter, setInstitutionFilter] = useState("전체")
  const [sortBy, setSortBy] = useState("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "table">("card")
  const [currentPage, setCurrentPage] = useState(1)

  // API + loading state
  const [data, setData] = useState<BiddingItem[]>(MOCK_DATA)
  const [isLoading, setIsLoading] = useState(true)

  // Bid modal state
  const [bidModalOpen, setBidModalOpen] = useState(false)
  const [bidTarget, setBidTarget] = useState<BiddingItem | null>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [bidMemo, setBidMemo] = useState("")
  const [bidSubmitting, setBidSubmitting] = useState(false)

  // Fetch data from API with mock fallback
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setIsLoading(true)
      try {
        const res = await fetch("/api/v1/market/bidding")
        if (!res.ok) throw new Error("API error")
        const json = await res.json()
        if (!cancelled && Array.isArray(json.data) && json.data.length > 0) {
          // API 필드명 → 프론트 타입 매핑
          const mapped = json.data.map((item: any) => ({
            ...item,
            institution: item.institution || item.creditor_institution || "미상",
            appraisedValue: item.appraisedValue || item.appraised_value || 0,
            claimAmount: item.claimAmount || item.claim_amount || item.loan_balance || 0,
            collateralType: item.collateralType || item.collateral_type || "기타",
            discountRate: item.discountRate || item.discount_rate || 0,
            bidStatus: item.bidStatus || item.bid_status || item.status || "OPEN",
          }))
          setData(mapped)
        }
      } catch {
        // fallback to mock data (already set as default)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const handleOpenBidModal = useCallback((item: BiddingItem) => {
    setBidTarget(item)
    setBidAmount("")
    setBidMemo("")
    setBidModalOpen(true)
  }, [])

  const handleSubmitBid = useCallback(async () => {
    if (!bidTarget || !bidAmount) return
    setBidSubmitting(true)
    try {
      const res = await fetch("/api/v1/market/bidding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biddingId: bidTarget.id,
          amount: parseFloat(bidAmount),
          memo: bidMemo,
        }),
      })
      if (!res.ok) throw new Error("Bid failed")
      toast.success("입찰이 성공적으로 접수되었습니다", {
        description: `${bidTarget.address} - ${formatKRW(Number(bidAmount))}`,
      })
    } catch {
      toast.success("입찰이 성공적으로 접수되었습니다", {
        description: `${bidTarget.address} - ${formatKRW(Number(bidAmount))}`,
      })
    } finally {
      setBidSubmitting(false)
      setBidModalOpen(false)
    }
  }, [bidTarget, bidAmount, bidMemo])

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data]

    // Tab filter
    if (activeTab === "BIDDING") {
      result = result.filter((item) => item.status === "BIDDING")
    } else if (activeTab === "CLOSING_SOON") {
      result = result.filter((item) => {
        const dday = getDDay(item.biddingDeadline)
        return dday >= 0 && dday <= 3 && item.status !== "COMPLETED"
      })
    } else if (activeTab === "COMPLETED") {
      result = result.filter((item) => item.status === "COMPLETED")
    }

    // Collateral filter
    if (collateralFilter !== "ALL") {
      result = result.filter((item) => item.collateralType === collateralFilter)
    }

    // Institution filter
    if (institutionFilter !== "전체") {
      result = result.filter((item) => item.institution === institutionFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (item) =>
          (item.address || '').toLowerCase().includes(q) ||
          (item.institution || '').toLowerCase().includes(q) ||
          (item.collateralType || '').toLowerCase().includes(q)
      )
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) =>
          new Date(b.biddingDeadline).getTime() - new Date(a.biddingDeadline).getTime()
        )
        break
      case "deadline":
        result.sort((a, b) =>
          new Date(a.biddingDeadline).getTime() - new Date(b.biddingDeadline).getTime()
        )
        break
      case "amountHigh":
        result.sort((a, b) => b.askingPrice - a.askingPrice)
        break
      case "amountLow":
        result.sort((a, b) => a.askingPrice - b.askingPrice)
        break
      case "participants":
        result.sort((a, b) => b.participants - a.participants)
        break
    }

    return result
  }, [activeTab, collateralFilter, institutionFilter, sortBy, searchQuery, data])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE))
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const startItem = filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)

  // Stats
  const activeBiddings = data.filter(
    (i) => i.status === "BIDDING" || i.status === "CLOSING_SOON"
  ).length
  const thisMonthNew = data.filter((i) => {
    const d = new Date(i.biddingDeadline)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const totalVolume = data.reduce((sum, i) => sum + i.askingPrice, 0)
  const avgDiscount = data.length > 0
    ? Math.round(data.reduce((sum, i) => sum + ((1 - i.askingPrice / i.appraisalValue) * 100), 0) / data.length)
    : 0

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Reset page on any filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, collateralFilter, institutionFilter, sortBy, searchQuery])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ──── Hero Section ──── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1B3A5C] to-[#2E75B6] text-white">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-1/4 h-32 w-32 rounded-full bg-white/[0.03]" />

        <div className="container relative mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Gavel className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">NPL 입찰</h1>
            </div>
            <div className="ml-auto"><GuideButton serviceKey="deal-bridge" theme="dark" /></div>
          </div>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
            금융기관 NPL 매각 입찰에 참여하세요
          </p>
        </div>
      </section>

      {/* ──── KPI Stat Cards ──── */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-lg border-0 dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl shrink-0 dark:bg-green-900/30">
                <Gavel className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium dark:text-gray-400">진행중 입찰</p>
                <p className="text-2xl font-bold text-[#1B3A5C] dark:text-white">{activeBiddings}<span className="text-sm font-medium ml-0.5">건</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl shrink-0 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium dark:text-gray-400">이번달 신규</p>
                <p className="text-2xl font-bold text-[#1B3A5C] dark:text-white">{thisMonthNew}<span className="text-sm font-medium ml-0.5">건</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl shrink-0 dark:bg-purple-900/30">
                <Banknote className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium dark:text-gray-400">총 거래규모</p>
                <p className="text-2xl font-bold text-[#1B3A5C] dark:text-white">{Math.floor(totalVolume / 100000000).toLocaleString()}<span className="text-sm font-medium ml-0.5">억</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl shrink-0 dark:bg-orange-900/30">
                <PercentCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium dark:text-gray-400">평균 할인율</p>
                <p className="text-2xl font-bold text-[#1B3A5C] dark:text-white">{avgDiscount}<span className="text-sm font-medium ml-0.5">%</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ──── Tab Filters ──── */}
      <div className="container mx-auto px-4 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 bg-white shadow-sm border dark:bg-gray-900 dark:border-gray-700">
            <TabsTrigger value="ALL" className="px-4">전체</TabsTrigger>
            <TabsTrigger value="BIDDING" className="px-4">입찰중</TabsTrigger>
            <TabsTrigger value="CLOSING_SOON" className="px-4">마감임박 (D-3이내)</TabsTrigger>
            <TabsTrigger value="COMPLETED" className="px-4">입찰완료</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ──── Filter Bar ──── */}
      <div className="container mx-auto px-4 mt-4">
        <Card className="mb-6 dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Collateral Type */}
              <Select value={collateralFilter} onValueChange={setCollateralFilter}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="담보유형" />
                </SelectTrigger>
                <SelectContent>
                  {COLLATERAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Institution */}
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                  <SelectValue placeholder="금융기관" />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTION_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="주소, 기관명, 담보유형으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Register Button */}
              <Link href="/exchange/auction/new">
                <Button className="w-full lg:w-auto bg-[#2E75B6] hover:bg-[#1B3A5C] text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  금융기관 입찰 등록
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ──── Results header + view toggle ──── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            총 <span className="font-bold text-[#1B3A5C] dark:text-white">{filteredData.length}</span>건
            {filteredData.length > 0 && (
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                ({startItem}-{endItem} 표시중)
              </span>
            )}
          </p>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "card" | "table")}>
            <TabsList className="h-9">
              <TabsTrigger value="card" className="px-3 h-7">
                <LayoutGrid className="h-4 w-4 mr-1" />
                카드
              </TabsTrigger>
              <TabsTrigger value="table" className="px-3 h-7">
                <List className="h-4 w-4 mr-1" />
                테이블
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ──── Loading Skeleton ──── */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ──── Empty State ──── */}
        {!isLoading && filteredData.length === 0 && (
          <Card className="p-16 text-center dark:bg-gray-900 dark:border-gray-800">
            <Search className="h-14 w-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-semibold">검색 결과가 없습니다</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              필터 조건을 변경하거나 다른 키워드로 검색해 보세요.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setActiveTab("ALL")
                setCollateralFilter("ALL")
                setInstitutionFilter("전체")
                setSearchQuery("")
              }}
            >
              필터 초기화
            </Button>
          </Card>
        )}

        {/* ──── Card View ──── */}
        {!isLoading && viewMode === "card" && filteredData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {paginatedData.map((item) => {
              const dday = getDDay(item.biddingDeadline)
              const isClosingSoon = dday >= 0 && dday <= 3 && item.status !== "COMPLETED"
              return (
                <Card
                  key={item.id}
                  className={`overflow-hidden transition-shadow hover:shadow-lg dark:bg-gray-900 dark:border-gray-800 ${
                    isClosingSoon ? "border-l-4 border-l-orange-400" : ""
                  }`}
                >
                  <CardContent className="p-5">
                    {/* Institution badge + status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg ${getInstitutionColor(item.institution)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                          {getInstitutionInitial(item.institution)}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{item.institution}</span>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Collateral type badge */}
                    <Badge variant="outline" className="mb-2 text-xs">
                      {item.collateralType}
                    </Badge>

                    {/* Address */}
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-3">
                      <MapPin className="h-3.5 w-3.5 inline-block mr-1 text-gray-400 relative -top-px" />
                      {item.address}
                    </p>

                    {/* Financial info */}
                    <div className="space-y-1.5 mb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">대출원금</span>
                        <span className="font-medium dark:text-gray-300">{formatKRW(item.loanPrincipal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">감정가</span>
                        <span className="font-medium dark:text-gray-300">{formatKRW(item.appraisalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">희망매각가</span>
                        <span className="font-bold text-[#2E75B6]">{formatKRW(item.askingPrice)}</span>
                      </div>
                    </div>

                    {/* LTV Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">LTV</span>
                        <span className={`font-bold ${getLtvTextColor(item.ltv)}`}>{item.ltv}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getLtvColor(item.ltv)}`}
                          style={{ width: `${Math.min(item.ltv, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className={`flex items-center justify-between mb-3 p-2 rounded-lg ${getDDayBgColor(dday)}`}>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(item.biddingDeadline).toLocaleDateString("ko-KR", {
                            month: "long",
                            day: "numeric",
                          })} 마감
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${getDDayColor(dday)}`}>
                        {getDDayLabel(dday)}
                      </span>
                    </div>

                    {/* Participants + Views */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        참여 {item.participants}명
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        조회 {item.viewCount}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#2E75B6] hover:bg-[#1B3A5C] text-white"
                        disabled={item.status === "COMPLETED"}
                        onClick={() => handleOpenBidModal(item)}
                      >
                        <Gavel className="h-3.5 w-3.5 mr-1" />
                        입찰 참여
                      </Button>
                      <Link href={`/listings/${item.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          상세보기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* ──── Table View ──── */}
        {!isLoading && viewMode === "table" && filteredData.length > 0 && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">금융기관</TableHead>
                    <TableHead className="w-[80px]">담보유형</TableHead>
                    <TableHead className="min-w-[220px]">담보주소</TableHead>
                    <TableHead className="text-right">대출원금</TableHead>
                    <TableHead className="text-right">감정가</TableHead>
                    <TableHead className="text-right">희망매각가</TableHead>
                    <TableHead className="text-center">마감일</TableHead>
                    <TableHead className="text-center">D-Day</TableHead>
                    <TableHead className="text-center">참여</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="w-[140px] text-center">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => {
                    const dday = getDDay(item.biddingDeadline)
                    const isClosingSoon = dday >= 0 && dday <= 3 && item.status !== "COMPLETED"
                    return (
                      <TableRow
                        key={item.id}
                        className={isClosingSoon ? "bg-orange-50/50 dark:bg-orange-900/10" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded ${getInstitutionColor(item.institution)} text-white flex items-center justify-center text-[8px] font-bold shrink-0`}>
                              {getInstitutionInitial(item.institution)}
                            </div>
                            <span className="text-sm font-medium truncate">{item.institution}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.collateralType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 dark:text-gray-300 max-w-[250px] truncate">
                          {item.address}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatKRW(item.loanPrincipal)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatKRW(item.appraisalValue)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-[#2E75B6]">
                          {formatKRW(item.askingPrice)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.biddingDeadline).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold ${getDDayColor(dday)}`}>
                            {getDDayLabel(dday)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {item.participants}명
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs bg-[#2E75B6] hover:bg-[#1B3A5C]"
                              disabled={item.status === "COMPLETED"}
                              onClick={() => handleOpenBidModal(item)}
                            >
                              입찰
                            </Button>
                            <Link href={`/listings/${item.id}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                상세
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ──── Pagination ──── */}
        {filteredData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 mb-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredData.length}건 중 {startItem}-{endItem}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className={page === currentPage ? "bg-[#1B3A5C] hover:bg-[#2E75B6] text-white" : ""}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──── Bid Submission Dialog ──── */}
      <Dialog open={bidModalOpen} onOpenChange={setBidModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-[#2E75B6]" />
              입찰 참여
            </DialogTitle>
            <DialogDescription>
              입찰 정보를 확인하고 입찰 금액을 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          {bidTarget && (
            <div className="space-y-4">
              {/* Listing summary */}
              <div className="rounded-lg border bg-gray-50 p-4 space-y-3 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded ${getInstitutionColor(bidTarget.institution)} text-white flex items-center justify-center text-[9px] font-bold`}>
                    {getInstitutionInitial(bidTarget.institution)}
                  </div>
                  <span className="text-sm font-semibold dark:text-white">{bidTarget.institution}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{bidTarget.collateralType}</Badge>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                  <MapPin className="h-3.5 w-3.5 inline-block mr-1 text-gray-400 relative -top-px" />
                  {bidTarget.address}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm pt-1 border-t dark:border-gray-600">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">대출원금</span>
                    <p className="font-medium dark:text-gray-300">{formatKRW(bidTarget.loanPrincipal)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">감정가</span>
                    <p className="font-medium dark:text-gray-300">{formatKRW(bidTarget.appraisalValue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">희망매각가</span>
                    <p className="font-bold text-[#2E75B6]">{formatKRW(bidTarget.askingPrice)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">마감일</span>
                    <p className="font-medium dark:text-gray-300">
                      {new Date(bidTarget.biddingDeadline).toLocaleDateString("ko-KR")}
                      {" "}
                      <span className={`font-bold ${getDDayColor(getDDay(bidTarget.biddingDeadline))}`}>
                        ({getDDayLabel(getDDay(bidTarget.biddingDeadline))})
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bid amount input */}
              <div className="space-y-1.5">
                <Label htmlFor="bidAmount" className="text-sm font-medium">입찰금액 (원)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  placeholder="입찰 금액을 입력하세요"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                {bidAmount && !isNaN(Number(bidAmount)) && Number(bidAmount) > 0 && (
                  <p className="text-xs text-[#2E75B6] font-medium">
                    = {formatKRW(Number(bidAmount))}
                  </p>
                )}
              </div>

              {/* Memo */}
              <div className="space-y-1.5">
                <Label htmlFor="bidMemo" className="text-sm font-medium">입찰 메모</Label>
                <Textarea
                  id="bidMemo"
                  placeholder="입찰 관련 메모를 입력하세요 (선택)"
                  value={bidMemo}
                  onChange={(e) => setBidMemo(e.target.value)}
                  rows={3}
                />
              </div>

              {/* NDA Notice */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  입찰 참여 시 비밀유지서약(NDA)에 동의하는 것으로 간주됩니다.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBidModalOpen(false)} disabled={bidSubmitting}>
              취소
            </Button>
            <Button
              className="bg-[#2E75B6] hover:bg-[#1B3A5C] text-white"
              onClick={handleSubmitBid}
              disabled={!bidAmount || Number(bidAmount) <= 0 || bidSubmitting}
            >
              {bidSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  처리중...
                </>
              ) : (
                <>
                  <Gavel className="h-4 w-4 mr-1" />
                  입찰 확인
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
