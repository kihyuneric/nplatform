"use client"

/**
 * /admin/matching — AI 매칭 관리자 뷰 (DR-18 Phase 3 · 2026-04-21)
 *
 * 매도 회원 ↔ 매수 회원 AI 매칭 결과를 관리자 전용으로 전체 공개.
 * 일반 사용자의 /deals/matching 은 점수/등급만 노출하지만, 여기서는
 * 회원 ID · 조직 · KYC 티어 · 거래 이력 · 매칭 성공률까지 드러나
 * 운영팀이 수동 개입(승인/차단/우선 딜룸 개설)을 빠르게 할 수 있다.
 *
 * 구성:
 *   1. 요약 KPI 카드 (4개): 전체/EXCELLENT/매칭 성공률/평균 점수
 *   2. 필터 바: 등급, 상태, 기간, 검색
 *   3. 매칭 테이블: 매도·매수 회원 상세 + 팩터 브레이크다운 + 운영 액션
 *   4. 회원 프로필 드로어: 클릭 시 상세 슬라이드 열람
 *
 * 실 DB 연결은 /api/v1/matching/results · /api/v1/users 를 호출하며
 * 응답이 비어 있으면 샘플 6건으로 대체해 UX를 즉시 확인 가능.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Target, Sparkles, RefreshCw, Users, TrendingUp, Award,
  CheckCircle2, AlertTriangle, Eye, Download, Filter,
  Building2, Landmark, Mail, Phone, Shield, X, ArrowRight,
  Clock,
} from "lucide-react"
import DS from "@/lib/design-system"
import { toast } from "sonner"

// ── 타입 ────────────────────────────────────────────────────
type Grade = "EXCELLENT" | "GOOD" | "FAIR"
type Status = "PENDING" | "DEAL_OPENED" | "DISMISSED" | "EXPIRED"
type Tier = "L0" | "L1" | "L2" | "L3" | "L4" | "L5"

interface AdminMatchMember {
  userId: string
  memberName: string          // 마스킹 전 전체 이름 (관리자 전용)
  organization: string
  role: "SELLER" | "BUYER"
  email: string                // 관리자 전용 원문 노출
  phone: string                // 관리자 전용 원문 노출
  kycTier: Tier
  verifiedAt: string | null   // 전문투자자 인증일
  completedDeals: number      // 과거 완료 거래 건수
  listingCount?: number       // 등록 매물 (seller)
  buyingCapacity?: number     // 투자 한도 (buyer, 억)
  preferredCollateral?: string[]
  preferredRegion?: string[]
}

interface AdminMatchPair {
  id: string
  listingId: string
  listingTitle: string         // 담보·지역 요약
  seller: AdminMatchMember
  buyer: AdminMatchMember
  totalScore: number
  grade: Grade
  status: Status
  factors: { name: string; score: number; weight: number }[]
  createdAt: string
  lastActionAt: string | null
  recommendedAction: string
  adminNote?: string
}

// ── 샘플 데이터 ────────────────────────────────────────────
const SAMPLE: AdminMatchPair[] = [
  {
    id: "m-2026-0421-001",
    listingId: "LST-0042",
    listingTitle: "강남 역삼동 아파트 · 감정가 10.5억",
    seller: {
      userId: "u-seller-042",
      memberName: "김매도",
      organization: "하나저축은행 강남지점",
      role: "SELLER",
      email: "seller42@hana.co.kr",
      phone: "010-2***-1142",
      kycTier: "L5",
      verifiedAt: "2025-08-12",
      completedDeals: 14,
      listingCount: 23,
    },
    buyer: {
      userId: "u-buyer-118",
      memberName: "이매수",
      organization: "강남 자산운용 (사모 NPL #3)",
      role: "BUYER",
      email: "buyer118@gnam-am.com",
      phone: "010-4***-8821",
      kycTier: "L4",
      verifiedAt: "2025-11-03",
      completedDeals: 8,
      buyingCapacity: 150,
      preferredCollateral: ["아파트", "오피스텔"],
      preferredRegion: ["서울 강남", "서울 서초", "성남"],
    },
    totalScore: 94,
    grade: "EXCELLENT",
    status: "DEAL_OPENED",
    factors: [
      { name: "담보 유형", score: 95, weight: 30 },
      { name: "지역",     score: 92, weight: 25 },
      { name: "금액",     score: 90, weight: 25 },
      { name: "긴급도",   score: 98, weight: 20 },
    ],
    createdAt: "2026-04-20 14:12",
    lastActionAt: "2026-04-20 16:40",
    recommendedAction: "즉시 딜룸 개설 — 양자 선호도 100% 일치",
  },
  {
    id: "m-2026-0421-002",
    listingId: "LST-0038",
    listingTitle: "부산 해운대 상가 · 감정가 8.2억",
    seller: {
      userId: "u-seller-011",
      memberName: "박매도",
      organization: "대신F&I",
      role: "SELLER",
      email: "seller11@daishin-fni.com",
      phone: "010-9***-3387",
      kycTier: "L5",
      verifiedAt: "2025-05-20",
      completedDeals: 32,
      listingCount: 45,
    },
    buyer: {
      userId: "u-buyer-203",
      memberName: "최매수",
      organization: "해운대 캐피탈",
      role: "BUYER",
      email: "buyer203@haeundae-cap.com",
      phone: "010-7***-2214",
      kycTier: "L3",
      verifiedAt: "2026-01-15",
      completedDeals: 3,
      buyingCapacity: 80,
      preferredCollateral: ["상가", "오피스"],
      preferredRegion: ["부산", "울산"],
    },
    totalScore: 88,
    grade: "EXCELLENT",
    status: "PENDING",
    factors: [
      { name: "담보 유형", score: 92, weight: 30 },
      { name: "지역",     score: 90, weight: 25 },
      { name: "금액",     score: 82, weight: 25 },
      { name: "긴급도",   score: 88, weight: 20 },
    ],
    createdAt: "2026-04-21 09:03",
    lastActionAt: null,
    recommendedAction: "NDA 초대 발송 권장 — 매수 한도 충분",
  },
  {
    id: "m-2026-0421-003",
    listingId: "LST-0051",
    listingTitle: "분당 오피스텔 · 감정가 6.8억",
    seller: {
      userId: "u-seller-108",
      memberName: "정매도",
      organization: "신한은행 판교지점",
      role: "SELLER",
      email: "seller108@shinhan.com",
      phone: "010-2***-5560",
      kycTier: "L5",
      verifiedAt: "2025-07-01",
      completedDeals: 21,
      listingCount: 17,
    },
    buyer: {
      userId: "u-buyer-187",
      memberName: "홍매수",
      organization: "프라임 인베스트먼트",
      role: "BUYER",
      email: "buyer187@prime-inv.kr",
      phone: "010-8***-0012",
      kycTier: "L4",
      verifiedAt: "2025-12-22",
      completedDeals: 11,
      buyingCapacity: 100,
      preferredCollateral: ["오피스텔", "아파트"],
      preferredRegion: ["성남", "용인"],
    },
    totalScore: 82,
    grade: "GOOD",
    status: "PENDING",
    factors: [
      { name: "담보 유형", score: 85, weight: 30 },
      { name: "지역",     score: 88, weight: 25 },
      { name: "금액",     score: 75, weight: 25 },
      { name: "긴급도",   score: 80, weight: 20 },
    ],
    createdAt: "2026-04-21 10:47",
    lastActionAt: null,
    recommendedAction: "가격 협상 여지 있음 — 2차 매칭 시나리오 대기",
  },
  {
    id: "m-2026-0421-004",
    listingId: "LST-0055",
    listingTitle: "인천 송도 토지 · 감정가 12.0억",
    seller: {
      userId: "u-seller-066",
      memberName: "조매도",
      organization: "한국자산관리공사",
      role: "SELLER",
      email: "kamco66@kamco.or.kr",
      phone: "010-1***-9978",
      kycTier: "L5",
      verifiedAt: "2024-12-03",
      completedDeals: 58,
      listingCount: 124,
    },
    buyer: {
      userId: "u-buyer-221",
      memberName: "윤매수",
      organization: "인천 개발투자 파트너스",
      role: "BUYER",
      email: "buyer221@icdev-partners.com",
      phone: "010-3***-4455",
      kycTier: "L3",
      verifiedAt: "2026-02-18",
      completedDeals: 2,
      buyingCapacity: 200,
      preferredCollateral: ["토지", "공장"],
      preferredRegion: ["인천", "시흥"],
    },
    totalScore: 76,
    grade: "GOOD",
    status: "DEAL_OPENED",
    factors: [
      { name: "담보 유형", score: 88, weight: 30 },
      { name: "지역",     score: 92, weight: 25 },
      { name: "금액",     score: 60, weight: 25 },
      { name: "긴급도",   score: 70, weight: 20 },
    ],
    createdAt: "2026-04-19 17:02",
    lastActionAt: "2026-04-20 09:10",
    recommendedAction: "실사 기간 연장 요청 검토 — 매수자 KYC 단계 L3",
    adminNote: "매수자 L3 · LOI 전 추가 실사 2주 허용",
  },
  {
    id: "m-2026-0421-005",
    listingId: "LST-0060",
    listingTitle: "대구 수성구 상가 · 감정가 4.5억",
    seller: {
      userId: "u-seller-077",
      memberName: "문매도",
      organization: "대구은행 수성지점",
      role: "SELLER",
      email: "seller77@dgb.co.kr",
      phone: "010-6***-1102",
      kycTier: "L4",
      verifiedAt: "2025-09-15",
      completedDeals: 7,
      listingCount: 9,
    },
    buyer: {
      userId: "u-buyer-290",
      memberName: "배매수",
      organization: "영남 NPL 조합",
      role: "BUYER",
      email: "buyer290@ynpl.co.kr",
      phone: "010-5***-7780",
      kycTier: "L2",
      verifiedAt: "2026-03-02",
      completedDeals: 1,
      buyingCapacity: 25,
      preferredCollateral: ["상가"],
      preferredRegion: ["대구", "구미"],
    },
    totalScore: 64,
    grade: "FAIR",
    status: "PENDING",
    factors: [
      { name: "담보 유형", score: 75, weight: 30 },
      { name: "지역",     score: 82, weight: 25 },
      { name: "금액",     score: 55, weight: 25 },
      { name: "긴급도",   score: 45, weight: 20 },
    ],
    createdAt: "2026-04-21 11:22",
    lastActionAt: null,
    recommendedAction: "매수자 KYC L3 업그레이드 후 재매칭 권장",
  },
  {
    id: "m-2026-0421-006",
    listingId: "LST-0062",
    listingTitle: "광주 북구 공장 · 감정가 7.2억",
    seller: {
      userId: "u-seller-091",
      memberName: "노매도",
      organization: "우리은행 광주지점",
      role: "SELLER",
      email: "seller91@wooribank.com",
      phone: "010-2***-8890",
      kycTier: "L5",
      verifiedAt: "2025-04-11",
      completedDeals: 19,
      listingCount: 12,
    },
    buyer: {
      userId: "u-buyer-333",
      memberName: "안매수",
      organization: "호남 산업투자",
      role: "BUYER",
      email: "buyer333@honam-inv.com",
      phone: "010-9***-4422",
      kycTier: "L4",
      verifiedAt: "2025-10-28",
      completedDeals: 6,
      buyingCapacity: 60,
      preferredCollateral: ["공장", "창고"],
      preferredRegion: ["광주", "전남"],
    },
    totalScore: 71,
    grade: "GOOD",
    status: "EXPIRED",
    factors: [
      { name: "담보 유형", score: 85, weight: 30 },
      { name: "지역",     score: 88, weight: 25 },
      { name: "금액",     score: 55, weight: 25 },
      { name: "긴급도",   score: 50, weight: 20 },
    ],
    createdAt: "2026-04-14 08:15",
    lastActionAt: "2026-04-20 00:00",
    recommendedAction: "만료 — 매도자 재등록 요청 필요",
  },
]

// ── 상수 ────────────────────────────────────────────────────
const GRADE_STYLE: Record<Grade, { bg: string; text: string; ring: string; dot: string }> = {
  EXCELLENT: { bg: "bg-stone-100/10", text: "text-stone-900", ring: "ring-emerald-500/30", dot: "#051C2C" },
  GOOD:      { bg: "bg-stone-100/10",    text: "text-stone-900",    ring: "ring-blue-500/30",    dot: "#051C2C" },
  FAIR:      { bg: "bg-stone-100/10",   text: "text-stone-900",   ring: "ring-amber-500/30",   dot: "#051C2C" },
}

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  PENDING:     { label: "대기",      cls: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]" },
  DEAL_OPENED: { label: "딜룸 진행", cls: "bg-stone-100/10 text-stone-900 border border-stone-300/20" },
  DISMISSED:   { label: "기각",      cls: "bg-stone-100/10 text-stone-900 border border-stone-300/20" },
  EXPIRED:     { label: "만료",      cls: "bg-stone-100/10 text-stone-900 border border-stone-300/20" },
}

const GRADE_TABS: { key: "ALL" | Grade; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "EXCELLENT", label: "EXCELLENT" },
  { key: "GOOD", label: "GOOD" },
  { key: "FAIR", label: "FAIR" },
]

// ── 메인 ────────────────────────────────────────────────────
export default function AdminMatchingPage() {
  const [all, setAll] = useState<AdminMatchPair[]>(SAMPLE)
  const [grade, setGrade] = useState<"ALL" | Grade>("ALL")
  const [search, setSearch] = useState("")
  const [rerunning, setRerunning] = useState(false)
  const [drawer, setDrawer] = useState<AdminMatchPair | null>(null)

  useEffect(() => {
    // Live data: /api/v1/matching/results 응답이 있으면 치환, 없으면 샘플 유지
    ;(async () => {
      try {
        const res = await fetch("/api/v1/matching/results?view=admin")
        if (!res.ok) return
        const json = await res.json()
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.results) ? json.results : []
        if (rows.length > 0) {
          setAll(rows as AdminMatchPair[])
        }
      } catch {
        /* keep sample */
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    return all.filter(m => {
      if (grade !== "ALL" && m.grade !== grade) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [
          m.listingTitle,
          m.seller.memberName, m.seller.organization, m.seller.email,
          m.buyer.memberName, m.buyer.organization, m.buyer.email,
          m.id, m.listingId,
        ].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [all, grade, search])

  const kpi = useMemo(() => {
    const total = all.length
    const exc = all.filter(m => m.grade === "EXCELLENT").length
    const opened = all.filter(m => m.status === "DEAL_OPENED").length
    const avg = total > 0 ? Math.round(all.reduce((s, m) => s + m.totalScore, 0) / total) : 0
    return { total, exc, opened, avg, rate: total > 0 ? Math.round((opened / total) * 100) : 0 }
  }, [all])

  const handleRerun = async () => {
    setRerunning(true)
    try {
      const res = await fetch("/api/v1/matching/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      if (res.ok) {
        toast.success("AI 매칭 재실행 완료 — 결과를 새로고침합니다.")
        const fresh = await fetch("/api/v1/matching/results?view=admin").then(r => r.ok ? r.json() : null).catch(() => null)
        const rows = fresh ? (fresh.data ?? fresh.results ?? []) : []
        if (rows.length > 0) setAll(rows)
      } else {
        toast.error("매칭 실행 실패 — 샘플 데이터 유지")
      }
    } catch {
      toast.error("네트워크 오류 — 샘플 데이터 유지")
    } finally {
      setRerunning(false)
    }
  }

  const handleOpenDealroom = (m: AdminMatchPair) => {
    toast.success(`딜룸 개설 요청 전송 — ${m.listingTitle}`, { duration: 3000 })
    setAll(prev => prev.map(x => x.id === m.id ? { ...x, status: "DEAL_OPENED", lastActionAt: new Date().toISOString().slice(0, 16).replace("T", " ") } : x))
  }

  const handleDismiss = (m: AdminMatchPair) => {
    toast.info(`매칭 기각 — ${m.id}`, { duration: 2000 })
    setAll(prev => prev.map(x => x.id === m.id ? { ...x, status: "DISMISSED", lastActionAt: new Date().toISOString().slice(0, 16).replace("T", " ") } : x))
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Hero */}
      <section className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className={`${DS.page.container} py-6`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h1 className={`${DS.text.sectionTitle} tracking-tight`}>AI 매칭 · 관리자 전체 뷰</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100/10 text-stone-900 border border-stone-300/20">
                  ADMIN ONLY
                </span>
              </div>
              <p className={DS.text.caption}>
                매도·매수 회원의 실명·조직·KYC 티어·거래이력을 포함한 AI 매칭 전체 결과.
                운영팀 개입(딜룸 강제 개설/기각/메모) 가능.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRerun}
                disabled={rerunning}
                className={DS.btn("secondary", "sm")}
              >
                {rerunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {rerunning ? "실행 중..." : "AI 재매칭"}
              </button>
              <button className={DS.btn("ghost", "sm")} onClick={() => toast.info("CSV 내보내기는 준비 중입니다.")}>
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile label="총 매칭" value={kpi.total.toLocaleString()} hint="대기+진행+만료" icon={Users} tone="neutral" />
            <KpiTile label="EXCELLENT" value={kpi.exc.toString()} hint={`${kpi.total > 0 ? Math.round((kpi.exc / kpi.total) * 100) : 0}% of total`} icon={Award} tone="success" />
            <KpiTile label="딜룸 전환율" value={`${kpi.rate}%`} hint={`${kpi.opened}건 개설`} icon={TrendingUp} tone="brand" />
            <KpiTile label="평균 점수" value={`${kpi.avg}점`} hint="100점 만점" icon={Sparkles} tone="warn" />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className={`${DS.page.container} py-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-[var(--color-surface-elevated)] rounded-lg p-1 border border-[var(--color-border-subtle)]">
            {GRADE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setGrade(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  grade === t.key
                    ? "bg-[var(--color-brand-mid)] text-white"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[240px] max-w-md">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="회원명·조직·이메일·매물·매칭ID 검색"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-mid)]/30"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Matching Table */}
      <section className={`${DS.page.container} pb-8`}>
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-sm text-[var(--color-text-tertiary)]">
              매칭 결과가 없습니다.
            </div>
          )}
          {filtered.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              onOpen={() => setDrawer(m)}
              onOpenDealroom={() => handleOpenDealroom(m)}
              onDismiss={() => handleDismiss(m)}
            />
          ))}
        </div>
      </section>

      {/* Drawer */}
      {drawer && <MatchDrawer match={drawer} onClose={() => setDrawer(null)} />}
    </div>
  )
}

// ── 컴포넌트: KPI Tile ──────────────────────────────────────
function KpiTile({ label, value, hint, icon: Icon, tone }: {
  label: string; value: string; hint: string; icon: any
  tone: "neutral" | "success" | "brand" | "warn"
}) {
  const toneCls: Record<string, string> = {
    neutral: "text-[var(--color-text-secondary)]",
    success: "text-stone-900",
    brand:   "text-[var(--color-brand-mid)]",
    warn:    "text-stone-900",
  }
  return (
    <div className="rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${toneCls[tone]}`} />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      </div>
      <div className={`text-xl font-black tabular-nums ${toneCls[tone]}`}>{value}</div>
      <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{hint}</div>
    </div>
  )
}

// ── 컴포넌트: Match Card ────────────────────────────────────
function MatchCard({ match: m, onOpen, onOpenDealroom, onDismiss }: {
  match: AdminMatchPair
  onOpen: () => void
  onOpenDealroom: () => void
  onDismiss: () => void
}) {
  const gs = GRADE_STYLE[m.grade]
  const ss = STATUS_STYLE[m.status]
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 hover:border-[var(--color-brand-mid)]/30 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-3 items-center">
        {/* Score ring */}
        <div className="flex items-center gap-2.5">
          <div className={`relative w-14 h-14 flex items-center justify-center rounded-full ring-2 ${gs.ring} ${gs.bg}`}>
            <span className={`text-base font-black ${gs.text}`}>{m.totalScore}</span>
          </div>
          <div>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${gs.bg} ${gs.text}`}>{m.grade}</span>
            <div className={`text-[10px] mt-1 ${ss.cls} inline-block px-1.5 py-0.5 rounded`}>{ss.label}</div>
          </div>
        </div>

        {/* Members & Listing */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-1">
            <Building2 className="w-3 h-3" />
            <span className="font-bold text-[var(--color-text-primary)] truncate">{m.listingTitle}</span>
            <span className="text-[var(--color-text-tertiary)]">· {m.listingId}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <MemberMini who="매도" m={m.seller} />
            <MemberMini who="매수" m={m.buyer} />
          </div>
          {/* Factor bars */}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {m.factors.map(f => (
              <div key={f.name} className="min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-[var(--color-text-tertiary)] truncate">{f.name}</span>
                  <span className="text-[9px] font-bold tabular-nums" style={{ color: gs.dot }}>{f.score}</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${f.score}%`, backgroundColor: gs.dot }} />
                </div>
              </div>
            ))}
          </div>
          {m.adminNote && (
            <div className="mt-2 text-[10px] px-2 py-1 rounded bg-stone-100/10 text-stone-900 border border-stone-300/20 inline-block">
              📝 {m.adminNote}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]"
          >
            <Eye className="w-3 h-3" /> 상세
          </button>
          {m.status === "PENDING" && (
            <>
              <button
                onClick={onOpenDealroom}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-md bg-stone-100/10 border border-stone-300/30 text-stone-900 hover:bg-stone-100/20"
              >
                <CheckCircle2 className="w-3 h-3" /> 딜룸 개설
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] hover:bg-stone-100/10 hover:border-stone-300/30 hover:text-stone-900 text-[var(--color-text-tertiary)]"
              >
                <X className="w-3 h-3" /> 기각
              </button>
            </>
          )}
          {m.status === "DEAL_OPENED" && (
            <Link
              href={`/admin/deals?match=${m.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-md bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/30 text-[var(--color-brand-mid)] hover:bg-[var(--color-brand-mid)]/20"
            >
              <ArrowRight className="w-3 h-3" /> 딜룸 모니터링
            </Link>
          )}
        </div>
      </div>

      {/* Footer — 추천 액션 · 타임스탬프 */}
      <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> {m.recommendedAction}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" /> 생성 {m.createdAt}
          {m.lastActionAt && ` · 업데이트 ${m.lastActionAt}`}
        </span>
      </div>
    </div>
  )
}

function MemberMini({ who, m }: { who: string; m: AdminMatchMember }) {
  const tierColor: Record<string, string> = {
    L5: "text-stone-900 bg-stone-100/10 border-stone-300/20",
    L4: "text-stone-900 bg-stone-100/10 border-stone-300/20",
    L3: "text-stone-900 bg-stone-100/10 border-stone-300/20",
    L2: "text-stone-900 bg-stone-100/10 border-stone-300/20",
    L1: "text-[var(--color-text-tertiary)] bg-[var(--color-surface-base)] border-[var(--color-border-subtle)]",
    L0: "text-[var(--color-text-tertiary)] bg-[var(--color-surface-base)] border-[var(--color-border-subtle)]",
  }
  return (
    <div className="rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-2 py-1.5 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase">{who}</span>
        <span className={`text-[9px] font-bold px-1 py-0 rounded border ${tierColor[m.kycTier]}`}>{m.kycTier}</span>
        <span className="text-[10px] font-bold text-[var(--color-text-primary)] truncate">{m.memberName}</span>
      </div>
      <div className="text-[10px] text-[var(--color-text-tertiary)] truncate">
        {m.organization} · 완료 {m.completedDeals}건
      </div>
    </div>
  )
}

// ── 컴포넌트: Drawer ───────────────────────────────────────
function MatchDrawer({ match: m, onClose }: { match: AdminMatchPair; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-xl h-full bg-[var(--color-bg-base)] border-l border-[var(--color-border-subtle)] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-5 py-4 z-10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[var(--color-text-tertiary)]">매칭 상세 · 관리자 전용</div>
            <div className="text-sm font-bold">{m.id}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-sunken)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 매물 요약 */}
          <section>
            <h3 className="text-xs font-black text-[var(--color-text-primary)] mb-2">매물</h3>
            <div className="rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] p-3 text-xs">
              <div className="font-bold">{m.listingTitle}</div>
              <div className="text-[var(--color-text-tertiary)] mt-0.5">{m.listingId}</div>
              <Link href={`/exchange/${m.listingId}`} className="inline-flex items-center gap-1 mt-2 text-[var(--color-brand-mid)] hover:underline text-[11px]">
                매물 상세 보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </section>

          {/* 회원 상세 */}
          <section className="grid grid-cols-1 gap-3">
            <MemberDetail m={m.seller} />
            <MemberDetail m={m.buyer} />
          </section>

          {/* 팩터 상세 */}
          <section>
            <h3 className="text-xs font-black text-[var(--color-text-primary)] mb-2">AI 매칭 팩터</h3>
            <div className="space-y-2">
              {m.factors.map(f => (
                <div key={f.name}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--color-text-secondary)]">{f.name} <span className="text-[var(--color-text-tertiary)]">· 가중치 {f.weight}%</span></span>
                    <span className="font-bold tabular-nums">{f.score}점</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-brand-mid)]" style={{ width: `${f.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 추천 액션 */}
          <section>
            <h3 className="text-xs font-black text-[var(--color-text-primary)] mb-2">AI 추천 액션</h3>
            <div className="rounded-lg bg-[var(--color-brand-mid)]/5 border border-[var(--color-brand-mid)]/20 p-3 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {m.recommendedAction}
            </div>
          </section>

          {/* 운영 메모 */}
          <section>
            <h3 className="text-xs font-black text-[var(--color-text-primary)] mb-2">운영 메모</h3>
            <textarea
              defaultValue={m.adminNote ?? ""}
              placeholder="운영팀 내부 메모 (회원에겐 공개되지 않음)"
              rows={3}
              className="w-full text-xs p-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-mid)]/30"
            />
            <button className="mt-2 px-3 py-1.5 text-[11px] font-bold rounded-md bg-[var(--color-brand-mid)] text-white">
              메모 저장
            </button>
          </section>
        </div>
      </aside>
    </div>
  )
}

function MemberDetail({ m }: { m: AdminMatchMember }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] p-3 text-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${m.role === "SELLER" ? "bg-stone-100/10 text-stone-900" : "bg-stone-100/10 text-stone-900"}`}>
          {m.role === "SELLER" ? "매도자" : "매수자"}
        </span>
        <span className="font-bold">{m.memberName}</span>
        <span className="text-[10px] text-[var(--color-text-tertiary)]">({m.userId})</span>
        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
          m.kycTier === "L5" || m.kycTier === "L4" ? "bg-stone-100/10 text-stone-900 border-stone-300/20"
          : m.kycTier === "L3" ? "bg-stone-100/10 text-stone-900 border-stone-300/20"
          : "bg-stone-100/10 text-stone-900 border-stone-300/20"
        }`}>{m.kycTier}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <Row icon={Landmark} label="조직">{m.organization}</Row>
        <Row icon={Shield} label="인증일">{m.verifiedAt ?? "—"}</Row>
        <Row icon={Mail} label="이메일">{m.email}</Row>
        <Row icon={Phone} label="연락처">{m.phone}</Row>
        <Row icon={CheckCircle2} label="완료 거래">{m.completedDeals}건</Row>
        {m.role === "SELLER" && <Row icon={Building2} label="등록 매물">{m.listingCount ?? 0}건</Row>}
        {m.role === "BUYER" && <Row icon={TrendingUp} label="투자 한도">{m.buyingCapacity ?? 0}억</Row>}
      </div>
      {m.role === "BUYER" && m.preferredCollateral && (
        <div className="mt-2 text-[10px] text-[var(--color-text-tertiary)]">
          선호 담보: {m.preferredCollateral.join(", ")} · 선호 지역: {m.preferredRegion?.join(", ")}
        </div>
      )}
    </div>
  )
}

function Row({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="w-3 h-3 mt-0.5 text-[var(--color-text-tertiary)] shrink-0" />
      <div className="min-w-0">
        <div className="text-[9px] text-[var(--color-text-tertiary)]">{label}</div>
        <div className="truncate">{children}</div>
      </div>
    </div>
  )
}
