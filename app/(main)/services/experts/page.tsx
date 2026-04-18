'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Star,
  MapPin,
  Clock,
  Scale,
  FileText,
  Calculator,
  Gavel,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Loader2,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Zap,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { GuideButton } from '@/components/guide/guide-button'
import { Disclaimer } from '@/components/legal/disclaimer'
import { SampleBadge } from '@/components/shared/sample-badge'
import { fetchSafe } from '@/lib/fetch-safe'
import DS, { formatKRW, formatDate } from '@/lib/design-system'

type Specialty = '법률' | '감정평가' | '세무' | '경매대행'

interface Professional {
  id: number | string
  name: string
  specialty: Specialty
  rating: number
  reviews: number
  priceMin: number
  priceMax: number
  price_min?: number
  price_max?: number
  location: string
  availability: string
  description: string
  experience: number
  cases: number
  cases_count?: number
}

const PROFESSIONALS: Professional[] = [
  { id: 1, name: '김재원', specialty: '법률', rating: 4.9, reviews: 128, priceMin: 300000, priceMax: 500000, location: '서울 강남구', availability: '즉시 상담 가능', description: 'NPL 채권 관련 소송 전문, 부동산 경매 법률 자문 15년 경력', experience: 15, cases: 320 },
  { id: 2, name: '박소연', specialty: '감정평가', rating: 4.8, reviews: 95, priceMin: 200000, priceMax: 400000, location: '서울 서초구', availability: '1~2일 내 가능', description: '상업용 부동산 및 NPL 담보물건 감정평가 전문', experience: 12, cases: 450 },
  { id: 3, name: '이준혁', specialty: '세무', rating: 4.7, reviews: 87, priceMin: 150000, priceMax: 300000, location: '서울 종로구', availability: '즉시 상담 가능', description: '부동산 양도소득세, NPL 관련 세무 조정 및 절세 전략 전문', experience: 10, cases: 280 },
  { id: 4, name: '최민서', specialty: '경매대행', rating: 4.9, reviews: 156, priceMin: 500000, priceMax: 1000000, location: '서울 강남구', availability: '즉시 상담 가능', description: '법원 경매 입찰 대행, 명도 및 인도 전문 10년 경력', experience: 10, cases: 520 },
  { id: 5, name: '정다은', specialty: '법률', rating: 4.6, reviews: 64, priceMin: 250000, priceMax: 450000, location: '경기 성남시', availability: '3일 내 가능', description: '부실채권 회수, 근저당권 실행 소송 전문 변호사', experience: 8, cases: 180 },
  { id: 6, name: '한승우', specialty: '감정평가', rating: 4.5, reviews: 72, priceMin: 180000, priceMax: 350000, location: '서울 마포구', availability: '1~2일 내 가능', description: '주거용·토지 감정평가, 법원 감정 다수 수행', experience: 9, cases: 310 },
  { id: 7, name: '윤지현', specialty: '세무', rating: 4.8, reviews: 103, priceMin: 200000, priceMax: 350000, location: '서울 강남구', availability: '즉시 상담 가능', description: '법인 NPL 투자 세무 자문, 부동산 취득세·보유세 전문', experience: 13, cases: 400 },
  { id: 8, name: '강태영', specialty: '경매대행', rating: 4.7, reviews: 91, priceMin: 400000, priceMax: 800000, location: '경기 수원시', availability: '1~2일 내 가능', description: '경매 물건 분석 및 입찰 전략, 권리분석 전문', experience: 7, cases: 240 },
  { id: 9, name: '서예린', specialty: '법률', rating: 4.4, reviews: 45, priceMin: 200000, priceMax: 400000, location: '인천 남동구', availability: '3일 내 가능', description: '부동산 거래 분쟁, 임대차 관련 소송 전문', experience: 6, cases: 130 },
  { id: 10, name: '오현석', specialty: '감정평가', rating: 4.6, reviews: 58, priceMin: 220000, priceMax: 420000, location: '부산 해운대구', availability: '즉시 상담 가능', description: '부산·경남 지역 부동산 감정평가, 공매 물건 평가 전문', experience: 11, cases: 350 },
  { id: 11, name: '임하늘', specialty: '세무', rating: 4.3, reviews: 39, priceMin: 120000, priceMax: 250000, location: '대전 서구', availability: '1~2일 내 가능', description: '개인 NPL 투자 세금 신고, 종합소득세 절세 컨설팅', experience: 5, cases: 150 },
  { id: 12, name: '배정훈', specialty: '경매대행', rating: 4.8, reviews: 112, priceMin: 450000, priceMax: 900000, location: '서울 송파구', availability: '즉시 상담 가능', description: '특수물건(지분·유치권) 경매 전문, 물건 발굴부터 명도까지', experience: 14, cases: 480 },
]

const CATEGORY_OPTIONS = [
  { value: '전체', label: '전체', icon: User },
  { value: '법률', label: '법무사', icon: Scale },
  { value: '감정평가', label: '감정평가사', icon: FileText },
  { value: '세무', label: '세무사', icon: Calculator },
  { value: '경매대행', label: '경매 대행', icon: Gavel },
] as const

const REGION_OPTIONS = [
  '전체', '서울', '경기', '인천', '부산', '대전', '대구', '광주', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const

const SPECIALTY_STYLES: Record<Specialty, { gradient: string; badge: string; tag: string; bar: string }> = {
  '법률':    {
    gradient: 'from-blue-500 to-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    tag: 'bg-blue-500/10 text-blue-400',
    bar: 'from-blue-500 to-blue-400',
  },
  '감정평가': {
    gradient: 'from-emerald-500 to-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    tag: 'bg-emerald-500/10 text-emerald-400',
    bar: 'from-emerald-500 to-emerald-400',
  },
  '세무':    {
    gradient: 'from-amber-500 to-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    tag: 'bg-amber-500/10 text-amber-400',
    bar: 'from-amber-500 to-amber-400',
  },
  '경매대행': {
    gradient: 'from-purple-500 to-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    tag: 'bg-purple-500/10 text-purple-400',
    bar: 'from-purple-500 to-purple-400',
  },
}

const SPECIALTY_TAGS: Record<Specialty, string[]> = {
  '법률':    ['NPL 소송', '경매 법률', '채권 회수'],
  '감정평가': ['담보 감정', '법원 감정', '상업용 부동산'],
  '세무':    ['양도소득세', '취득세', '절세 전략'],
  '경매대행': ['입찰 대행', '권리분석', '명도'],
}

type SortKey = 'rating' | 'reviews' | 'price'

function formatPrice(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`
  return n.toLocaleString()
}

const PAGE_SIZE = 9

// Featured expert: highest rated
const FEATURED_ID = 4 // 최민서

export default function ProfessionalPage() {
  const [category, setCategory] = useState('전체')
  const [region, setRegion] = useState('전체')
  const [sortKey, setSortKey] = useState<SortKey>('rating')
  const [searchQuery, setSearchQuery] = useState('')
  const [professionals, setProfessionals] = useState<Professional[]>(PROFESSIONALS)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchProfessionals() {
      setLoading(true)
      try {
        const data = await fetchSafe<{ professionals?: Record<string, unknown>[] }>('/api/v1/professionals', { fallback: { professionals: [] } })
        if (data.professionals?.length) {
          const mapped = data.professionals.map((p: Record<string, unknown>) => ({
            id: (p.id as string | number) || '',
            name: (p.name as string) || '',
            specialty: (p.specialty as Specialty) || '법률',
            rating: Number(p.rating) || 0,
            reviews: Number(p.reviews) || 0,
            priceMin: Number(p.price_min) || 0,
            priceMax: Number(p.price_max) || 0,
            location: (p.location as string) || '',
            availability: (p.availability as string) || '상담 가능',
            description: (p.description as string) || '',
            experience: Number(p.experience_years) || 0,
            cases: Number(p.cases_count) || 0,
          }))
          setProfessionals(mapped)
        }
      } catch {
        // Keep mock data as fallback
      } finally {
        setLoading(false)
      }
    }
    fetchProfessionals()
  }, [])

  const filtered = useMemo(() => {
    let list = [...professionals]
    if (category !== '전체') list = list.filter((p) => p.specialty === category)
    if (region !== '전체') list = list.filter((p) => p.location.includes(region))
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (p) => p.name.includes(q) || p.description.includes(q) || p.location.includes(q)
      )
    }
    list.sort((a, b) => {
      if (sortKey === 'rating') return b.rating - a.rating
      if (sortKey === 'reviews') return b.reviews - a.reviews
      return a.priceMin - b.priceMin
    })
    return list
  }, [professionals, category, region, sortKey, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [category, region, sortKey, searchQuery])

  const featured = professionals.find(p => p.id === FEATURED_ID) || professionals[0]

  return (
    <div className={DS.page.wrapper}>

      {/* ── Hero Strip ── */}
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className={DS.header.eyebrow}>
                <Briefcase className="h-3.5 w-3.5 inline mr-1.5" />
                전문가 마켓
              </p>
              <h1 className={DS.header.title}>
                법률 · 감정 · 세무 전문가를 한 곳에서
              </h1>
              <p className={DS.header.subtitle}>
                NPL 투자에 필요한 법률, 감정평가, 세무, 경매 대행 전문가를 찾아보세요.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <GuideButton serviceKey="professional" />
              <Link href="/professional/register">
                <button className={DS.button.primary}>
                  <Plus className="h-4 w-4" />
                  전문가 등록
                </button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '등록 전문가', value: `${professionals.length}명` },
              { label: '평균 평점', value: `${(professionals.reduce((s, p) => s + p.rating, 0) / (professionals.length || 1)).toFixed(1)}점` },
              { label: '총 수행 건수', value: `${professionals.reduce((s, p) => s + p.cases, 0).toLocaleString()}건` },
              { label: '즉시 상담 가능', value: `${professionals.filter(p => p.availability.includes('즉시')).length}명` },
            ].map((stat) => (
              <div key={stat.label} className={DS.stat.card}>
                <p className={DS.stat.label}>{stat.label}</p>
                <p className={DS.stat.value}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cross-links ── */}
      <div className={`${DS.page.container} pb-2`}>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/services/community" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>커뮤니티 →</Link>
          <Link href="/exchange" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>매물 탐색 →</Link>
          <Link href="/analysis/copilot" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>AI 컨설턴트 →</Link>
          <Link href="/deals" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>거래 현황 →</Link>
        </div>
      </div>

      {/* ── Featured Expert Banner ── */}
      {featured && (
        <div className={`${DS.page.container} pb-2`}>
          <div className={`${DS.card.elevated} p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 relative overflow-hidden`}>
            {/* Left accent */}
            <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-amber-400 to-amber-500 rounded-l-2xl" />

            <div className="shrink-0 flex items-center gap-2 pl-2">
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[0.6875rem] font-bold flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                이달의 추천 전문가
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${SPECIALTY_STYLES[featured.specialty]?.gradient || 'from-blue-500 to-blue-400'} flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0`}>
                {featured.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={DS.text.cardTitle}>{featured.name}</p>
                  <span className={`text-[0.6875rem] px-2 py-0.5 rounded-md font-semibold ${SPECIALTY_STYLES[featured.specialty]?.badge}`}>
                    {featured.specialty}
                  </span>
                  <span className={`${DS.text.caption} flex items-center gap-1`}>
                    <MapPin className="w-3 h-3" />{featured.location}
                  </span>
                </div>
                <p className={`${DS.text.body} mt-0.5 line-clamp-1`}>{featured.description}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className={DS.text.metricSmall}>{featured.rating}</span>
                  </div>
                  <p className={DS.text.captionLight}>({featured.reviews}건)</p>
                </div>
                <Link href={`/professional/${featured.id}`}>
                  <button className={DS.button.primary}>
                    프로필 보기
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="sticky top-0 z-20 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className={DS.page.container}>
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-none">
            {/* Category tabs */}
            {CATEGORY_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isActive = category === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setCategory(opt.value)}
                  className={isActive ? DS.tabs.active : DS.tabs.trigger}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 inline mr-1" />
                  {opt.label}
                </button>
              )
            })}

            <div className="h-5 w-px bg-[var(--color-border-subtle)] mx-2 shrink-0" />

            {/* Region */}
            <div className="flex items-center gap-1.5 shrink-0">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={`${DS.text.caption} border-none bg-transparent focus:outline-none focus:ring-0 pr-6 cursor-pointer`}
              >
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r === '전체' ? '지역 전체' : r}</option>
                ))}
              </select>
            </div>

            <div className="h-5 w-px bg-[var(--color-border-subtle)] mx-2 shrink-0" />

            {/* Sort */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={`${DS.text.caption} border-none bg-transparent focus:outline-none focus:ring-0 pr-6 cursor-pointer`}
              >
                <option value="rating">평점 높은순</option>
                <option value="reviews">리뷰 많은순</option>
                <option value="price">가격 낮은순</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative ml-auto shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="이름, 지역, 전문 분야..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${DS.input.base} h-9 pl-8 pr-3 w-48`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className={`${DS.page.container} py-8`}>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className={DS.text.body}>
            <span className={DS.text.metricSmall}>{filtered.length}</span>명의 전문가 <SampleBadge />
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className={DS.empty.wrapper}>
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-mid)] mb-3" />
            <p className={DS.text.body}>전문가 목록을 불러오는 중...</p>
          </div>
        )}

        {/* Card Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((pro) => {
              const styles = SPECIALTY_STYLES[pro.specialty]
              const tags = SPECIALTY_TAGS[pro.specialty]
              const isInstant = pro.availability.includes('즉시')
              return (
                <div
                  key={pro.id}
                  className={`${DS.card.interactive} overflow-hidden flex flex-col`}
                >
                  {/* Specialty accent bar */}
                  <div className={`h-[3px] w-full bg-gradient-to-r ${styles.bar} opacity-70`} />

                  {/* Card Header */}
                  <div className="p-5 flex items-start gap-4">
                    {/* Gradient Avatar */}
                    <div className={`relative h-14 w-14 rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md`}>
                      {pro.name.slice(0, 1)}
                      {isInstant && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={DS.text.cardTitle}>{pro.name}</h3>
                          <span className={`inline-block mt-1 text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md ${styles.badge}`}>
                            {pro.specialty}
                          </span>
                        </div>
                        {/* Rating */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className={DS.text.metricSmall}>{pro.rating}</span>
                          </div>
                          <p className={`${DS.text.captionLight} mt-0.5 tabular-nums`}>({pro.reviews}건)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-5">
                    <p className={`${DS.text.body} line-clamp-2`}>
                      {pro.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="px-5 mt-3 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className={`text-[0.6875rem] px-2 py-0.5 rounded-lg font-medium ${styles.tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="px-5 mt-4 space-y-1.5">
                    <div className={`${DS.text.captionLight} flex items-center gap-1.5`}>
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {pro.location}
                    </div>
                    <div className={`flex items-center gap-1.5 text-[0.8125rem] font-medium ${isInstant ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-muted)]'}`}>
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {pro.availability}
                    </div>
                    <div className={`${DS.text.captionLight} flex items-center gap-1.5`}>
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      경력 {pro.experience}년 · {pro.cases}건 수행
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="mt-auto px-5 pb-5 pt-4">
                    <div className={`flex items-center justify-between pt-3 ${DS.divider.default}`}>
                      <div>
                        <p className={DS.text.micro}>시간당 상담료</p>
                        <p className={`${DS.text.metricSmall} mt-0.5`}>
                          ₩{formatPrice(pro.priceMin)}~{formatPrice(pro.priceMax)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/professional/${pro.id}`}>
                          <button className={DS.button.secondary}>
                            프로필
                          </button>
                        </Link>
                        <Link href={`/professional/${pro.id}`}>
                          <button className={DS.button.primary}>
                            <MessageSquare className="h-3.5 w-3.5" />
                            예약하기
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className={DS.empty.wrapper}>
            <Search className={DS.empty.icon} />
            <h3 className={DS.empty.title}>등록된 전문가가 없습니다</h3>
            <p className={DS.empty.description}>
              다른 검색어나 카테고리를 시도해보세요.
            </p>
            <Link href="/professional/register">
              <button className={`${DS.button.primary} mt-6`}>
                <Plus className="h-4 w-4" />
                전문가 등록하기
              </button>
            </Link>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className={`${DS.button.icon} border border-[var(--color-border-subtle)] disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-9 min-w-[36px] px-2 rounded-xl text-[0.8125rem] font-medium transition-all tabular-nums ${
                  p === page
                    ? 'bg-[var(--color-brand-dark)] text-white shadow-[var(--shadow-brand)]'
                    : `border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]`
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={`${DS.button.icon} border border-[var(--color-border-subtle)] disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-10">
          <Disclaimer type="professional" compact />
        </div>
      </div>
    </div>
  )
}
