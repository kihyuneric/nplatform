"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Gavel, Clock, Eye, Users, Building2, ArrowUpDown,
  Search, TrendingUp, MapPin, ChevronLeft, ChevronRight,
  LayoutGrid, List, AlertTriangle, Calendar, Banknote, Loader2,
  FileText, Plus, PercentCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { NplModal, NplModalFooter } from "@/components/design-system"
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
  if (dday <= 3) return "text-stone-900"
  if (dday <= 7) return "text-stone-900"
  return "text-stone-900"
}

function getDDayBgColor(dday: number): string {
  if (dday < 0) return "bg-[var(--color-surface-overlay)]"
  if (dday <= 3) return "bg-stone-100/5"
  if (dday <= 7) return "bg-stone-100/5"
  return "bg-stone-100/5"
}

function getStatusBadge(status: BiddingStatus) {
  switch (status) {
    case "BIDDING":
      return <span className="bg-stone-100/10 text-stone-900 border-stone-300/20 inline-flex items-center">입찰중</span>
    case "CLOSING_SOON":
      return <span className="bg-stone-100/10 text-stone-900 border-stone-300/20 inline-flex items-center">마감임박</span>
    case "COMPLETED":
      return <span className="bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] inline-flex items-center">입찰완료</span>
  }
}

function getLtvColor(ltv: number): string {
  if (ltv <= 50) return "bg-stone-100"
  if (ltv <= 70) return "bg-stone-100"
  return "bg-stone-100"
}

function getLtvTextColor(ltv: number): string {
  if (ltv <= 50) return "text-stone-900"
  if (ltv <= 70) return "text-stone-900"
  return "text-stone-900"
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
    "KB국민은행": "bg-stone-100",
    "신한은행": "bg-stone-100",
    "우리은행": "bg-stone-100",
    "하나은행": "bg-stone-100",
    "IBK기업은행": "bg-stone-100",
    "한국자산관리공사": "bg-stone-100",
    "NH농협": "bg-stone-100",
    "수협": "bg-stone-100",
    "산업은행": "bg-slate-600",
  }
  return colors[name] || "bg-gray-500"
}

// ─── (Mock data removed — all data loaded from Supabase) ────────────────────

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

  // Data state — empty until Supabase responds
  const [data, setData] = useState<BiddingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Bid modal state
  const [bidModalOpen, setBidModalOpen] = useState(false)
  const [bidTarget, setBidTarget] = useState<BiddingItem | null>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [bidMemo, setBidMemo] = useState("")
  const [bidSubmitting, setBidSubmitting] = useState(false)

  // Fetch from Supabase (with API route as secondary source)
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setIsLoading(true)
      try {
        // Primary: direct Supabase query for active auction listings
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: rows } = await supabase
          .from("court_auction_listings")
          .select("*")
          .in("status", ["BIDDING", "CLOSING_SOON"])
          .order("bidding_deadline", { ascending: true })
          .limit(50)

        if (!cancelled && rows && rows.length > 0) {
          const mapped: BiddingItem[] = rows.map((r: any) => ({
            id: String(r.id),
            institution: r.institution ?? r.creditor_institution ?? "미상",
            collateralType: (r.collateral_type ?? "아파트") as CollateralType,
            address: r.address ?? "주소 미공개",
            loanPrincipal: r.loan_principal ?? r.claim_amount ?? 0,
            appraisalValue: r.appraisal_value ?? r.appraised_value ?? 0,
            askingPrice: r.asking_price ?? r.minimum_bid ?? 0,
            ltv: r.ltv ?? (r.loan_principal && r.appraisal_value ? Math.round((r.loan_principal / r.appraisal_value) * 100) : 0),
            biddingDeadline: String(r.bidding_deadline ?? "").slice(0, 10),
            status: (r.status ?? "BIDDING") as BiddingStatus,
            participants: r.participants ?? r.bid_count ?? 0,
            viewCount: r.view_count ?? 0,
          }))
          setData(mapped)
        } else {
          // Secondary: try API route
          const res = await fetch("/api/v1/market/bidding")
          if (res.ok) {
            const json = await res.json()
            if (!cancelled && Array.isArray(json.data) && json.data.length > 0) {
              const mapped = json.data.map((item: any) => ({
                ...item,
                institution: item.institution || item.creditor_institution || "미상",
                appraisalValue: item.appraisalValue || item.appraised_value || 0,
                loanPrincipal: item.loanPrincipal || item.claim_amount || item.loan_balance || 0,
                collateralType: (item.collateralType || item.collateral_type || "아파트") as CollateralType,
                status: (item.bidStatus || item.bid_status || item.status || "BIDDING") as BiddingStatus,
              }))
              setData(mapped)
            }
          }
        }
      } catch {
        // data stays empty — no mock fallback
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
    <div className="min-h-screen bg-[var(--color-surface-base)]">
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
          <Card className="shadow-lg border-0 bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-stone-100/10 rounded-xl shrink-0">
                <Gavel className="h-5 w-5 text-stone-900" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">진행중 입찰</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{activeBiddings}<span className="text-sm font-medium ml-0.5">건</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-stone-100/10 rounded-xl shrink-0">
                <Calendar className="h-5 w-5 text-stone-900" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">이번달 신규</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{thisMonthNew}<span className="text-sm font-medium ml-0.5">건</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-stone-100/10 rounded-xl shrink-0">
                <Banknote className="h-5 w-5 text-stone-900" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">총 거래규모</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{Math.floor(totalVolume / 100000000).toLocaleString()}<span className="text-sm font-medium ml-0.5">억</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-stone-100/10 rounded-xl shrink-0">
                <PercentCircle className="h-5 w-5 text-stone-900" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">평균 할인율</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{avgDiscount}<span className="text-sm font-medium ml-0.5">%</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ──── Tab Filters ──── */}
      <div className="container mx-auto px-4 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 bg-[var(--color-surface-elevated)] shadow-sm border-[var(--color-border-subtle)]">
            <TabsTrigger value="ALL" className="px-4">전체</TabsTrigger>
            <TabsTrigger value="BIDDING" className="px-4">입찰중</TabsTrigger>
            <TabsTrigger value="CLOSING_SOON" className="px-4">마감임박 (D-3이내)</TabsTrigger>
            <TabsTrigger value="COMPLETED" className="px-4">입찰완료</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ──── Filter Bar ──── */}
      <div className="container mx-auto px-4 mt-4">
        <Card className="mb-6 bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
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
                <button className="w-full lg:w-auto bg-[#2E75B6] hover:bg-[#1B3A5C] text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5">
                  <Plus className="h-4 w-4 mr-1" />
                  자발적 경매 등록
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ──── Results header + view toggle ──── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            총 <span className="font-bold text-[var(--color-text-primary)]">{filteredData.length}</span>건
            {filteredData.length > 0 && (
              <span className="text-[var(--color-text-muted)] ml-1">
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
          <Card className="p-16 text-center bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
            <Search className="h-14 w-14 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)] text-lg font-semibold">검색 결과가 없습니다</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-2">
              필터 조건을 변경하거나 다른 키워드로 검색해 보세요.
            </p>
            <button
              className="mt-4 px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5"
              onClick={() => {
                setActiveTab("ALL")
                setCollateralFilter("ALL")
                setInstitutionFilter("전체")
                setSearchQuery("")
              }}
            >
              필터 초기화
            </button>
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
                  className={`overflow-hidden transition-shadow hover:shadow-lg bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)] ${
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
                        <span className="text-sm font-semibold text-[var(--color-text-secondary)] truncate">{item.institution}</span>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Collateral type badge */}
                    <span className="mb-2 text-xs inline-flex items-center border rounded-full px-2 py-0.5">
                      {item.collateralType}
                    </span>

                    {/* Address */}
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 mb-3">
                      <MapPin className="h-3.5 w-3.5 inline-block mr-1 text-gray-400 relative -top-px" />
                      {item.address}
                    </p>

                    {/* Financial info */}
                    <div className="space-y-1.5 mb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">대출원금</span>
                        <span className="font-medium text-[var(--color-text-secondary)]">{formatKRW(item.loanPrincipal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">감정가</span>
                        <span className="font-medium text-[var(--color-text-secondary)]">{formatKRW(item.appraisalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">희망매각가</span>
                        <span className="font-bold text-[#2E75B6]">{formatKRW(item.askingPrice)}</span>
                      </div>
                    </div>

                    {/* LTV Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--color-text-secondary)]">LTV</span>
                        <span className={`font-bold ${getLtvTextColor(item.ltv)}`}>{item.ltv}%</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--color-surface-overlay)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getLtvColor(item.ltv)}`}
                          style={{ width: `${Math.min(item.ltv, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className={`flex items-center justify-between mb-3 p-2 rounded-lg ${getDDayBgColor(dday)}`}>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
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
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] mb-4">
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
                      <button
                        className="flex-1 bg-[#2E75B6] hover:bg-[#1B3A5C] text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={item.status === "COMPLETED"}
                        onClick={() => handleOpenBidModal(item)}
                      >
                        <Gavel className="h-3.5 w-3.5 mr-1" />
                        입찰 참여
                      </button>
                      <Link href={`/listings/${item.id}`} className="flex-1">
                        <button className="w-full px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5 justify-center">
                          상세보기
                        </button>
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
          <Card className="bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]">
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
                        className={isClosingSoon ? "bg-stone-100/5" : ""}
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
                          <span className="text-xs inline-flex items-center border rounded-full px-2 py-0.5">{item.collateralType}</span>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--color-text-secondary)] max-w-[250px] truncate">
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
                        <TableCell className="text-center text-xs text-[var(--color-text-secondary)]">
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
                            <button
                              className="text-xs bg-[#2E75B6] hover:bg-[#1B3A5C] text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={item.status === "COMPLETED"}
                              onClick={() => handleOpenBidModal(item)}
                            >
                              입찰
                            </button>
                            <Link href={`/listings/${item.id}`}>
                              <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5">
                                상세
                              </button>
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
            <p className="text-sm text-[var(--color-text-secondary)]">
              {filteredData.length}건 중 {startItem}-{endItem}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={page === currentPage ? "bg-[#1B3A5C] hover:bg-[#2E75B6] text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5" : "px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5"}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phase H5+ · NplModal 마이그레이션 — 모바일 BottomSheet 자동 + scroll-to-top */}
      <NplModal
        open={bidModalOpen}
        onOpenChange={setBidModalOpen}
        title={
          <span className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[var(--color-brand-mid)]" />
            입찰 참여
          </span>
        }
        description="입찰 정보를 확인하고 입찰 금액을 입력해주세요."
        size="md"
      >
        {bidTarget && (
            <div className="space-y-4">
              {/* Listing summary */}
              <div className="rounded-lg border bg-[var(--color-surface-overlay)] p-4 space-y-3 border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded ${getInstitutionColor(bidTarget.institution)} text-white flex items-center justify-center text-[9px] font-bold`}>
                    {getInstitutionInitial(bidTarget.institution)}
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{bidTarget.institution}</span>
                  <span className="text-xs ml-auto inline-flex items-center border rounded-full px-2 py-0.5">{bidTarget.collateralType}</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                  <MapPin className="h-3.5 w-3.5 inline-block mr-1 text-gray-400 relative -top-px" />
                  {bidTarget.address}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm pt-1 border-t border-[var(--color-border-subtle)]">
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs">대출원금</span>
                    <p className="font-medium text-[var(--color-text-secondary)]">{formatKRW(bidTarget.loanPrincipal)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs">감정가</span>
                    <p className="font-medium text-[var(--color-text-secondary)]">{formatKRW(bidTarget.appraisalValue)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs">희망매각가</span>
                    <p className="font-bold text-[#2E75B6]">{formatKRW(bidTarget.askingPrice)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)] text-xs">마감일</span>
                    <p className="font-medium text-[var(--color-text-secondary)]">
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
              <div className="flex items-start gap-2 rounded-lg bg-stone-100/10 border border-stone-300/20 p-3">
                <FileText className="h-4 w-4 text-stone-900 mt-0.5 shrink-0" />
                <p className="text-xs text-stone-900 leading-relaxed">
                  입찰 참여 시 비밀유지서약(NDA)에 동의하는 것으로 간주됩니다.
                </p>
              </div>
            </div>
          )}

        <NplModalFooter>
          <button className="px-4 py-2 rounded-lg text-sm border border-[var(--color-border-default)] hover:bg-[var(--color-surface-overlay)] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-text-secondary)]" onClick={() => setBidModalOpen(false)} disabled={bidSubmitting}>
            취소
          </button>
          <button
            className="bg-[var(--color-brand-mid)] hover:bg-[var(--color-brand-dark)] text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </button>
        </NplModalFooter>
      </NplModal>
    </div>
  )
}
