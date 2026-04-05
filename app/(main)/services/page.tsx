"use client"

import { useState, useEffect } from "react"
import {
  Users, MessageSquare, BookOpen, ArrowRight,
  Star, MapPin, Scale, Calculator, Building2,
  GraduationCap, Newspaper, Loader2, ExternalLink,
  TrendingUp, Zap, ChevronRight, Clock,
} from "lucide-react"
import Link from "next/link"
import DS, { formatKRW, getDDay, formatDate } from "@/lib/design-system"

interface Expert {
  id: string
  name: string
  specialty: string
  location?: string
  rating?: number
  review_count?: number
  expertise_areas?: string[]
  bio?: string
}

interface Post {
  id: string
  title: string
  author_name?: string
  category?: string
  view_count?: number
  comment_count?: number
  created_at: string
}

const EXPERT_CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "lawyer", label: "법무사·변호사" },
  { key: "tax", label: "세무사" },
  { key: "realtor", label: "공인중개사" },
]

const LEARN_LINKS = [
  { label: "NPL 기초 강의", href: "/services/learn/courses", icon: GraduationCap, desc: "단계별 NPL 투자 입문 커리큘럼" },
  { label: "NPL 용어사전", href: "/services/learn/glossary", icon: BookOpen, desc: "필수 부동산·법률 용어 해설" },
  { label: "부동산 뉴스", href: "/analysis?tab=news", icon: Newspaper, desc: "최신 NPL·경매 시장 뉴스" },
]

const SPECIALTY_ACCENT: Record<string, string> = {
  "법무사·변호사": "bg-[var(--color-brand-mid)]",
  "세무사": "bg-amber-500",
  "공인중개사": "bg-emerald-500",
  "default": "bg-[var(--color-brand-dark)]",
}

const CATEGORY_BADGE: Record<string, string> = {
  TIP: "bg-blue-50 text-blue-700 border border-blue-200",
  MARKET_ANALYSIS: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  QNA: "bg-amber-50 text-amber-700 border border-amber-200",
  CASE_STUDY: "bg-purple-50 text-purple-700 border border-purple-200",
  GENERAL: "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]",
  default: "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]",
}

const PILLARS = [
  {
    key: "experts",
    icon: Scale,
    label: "전문가 서비스",
    desc: "법률, 세무, 감정평가 검증된 전문가와 1:1 상담",
    cta: "전문가 찾기",
    href: "/services/experts",
    accentColor: "bg-[var(--color-brand-mid)]",
    iconBg: "bg-blue-50",
    iconColor: "text-[var(--color-brand-mid)]",
    countLabel: "등록 전문가",
    count: "120+",
  },
  {
    key: "community",
    icon: MessageSquare,
    label: "커뮤니티",
    desc: "NPL 투자자들의 정보공유·거래후기·시장분석 공간",
    cta: "커뮤니티 입장",
    href: "/community",
    accentColor: "bg-[var(--color-positive)]",
    iconBg: "bg-emerald-50",
    iconColor: "text-[var(--color-positive)]",
    countLabel: "누적 게시글",
    count: "3,400+",
  },
  {
    key: "learn",
    icon: GraduationCap,
    label: "교육",
    desc: "초보부터 심화까지 단계별 NPL 투자 커리큘럼",
    cta: "강의 보기",
    href: "/services/learn/courses",
    accentColor: "bg-purple-500",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    countLabel: "강의 수",
    count: "48개",
  },
]

export default function ServicesPage() {
  const [expertFilter, setExpertFilter] = useState("all")
  const [experts, setExperts] = useState<Expert[]>([])
  const [expertsLoading, setExpertsLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    const url = expertFilter === "all"
      ? "/api/v1/professionals?limit=6"
      : `/api/v1/professionals?specialty=${expertFilter}&limit=6`
    fetch(url)
      .then(r => r.json())
      .then(d => setExperts(d.data || d.professionals || []))
      .catch(() => setExperts([]))
      .finally(() => setExpertsLoading(false))
  }, [expertFilter])

  useEffect(() => {
    fetch("/api/v1/community?limit=8&sort=latest")
      .then(r => r.json())
      .then(d => setPosts(d.data || d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false))
  }, [])

  return (
    <div className={DS.page.wrapper}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-[var(--color-border-subtle)]">
        <div className={`relative ${DS.page.container} pt-14 pb-12`}>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20 ${DS.text.label} text-[var(--color-brand-mid)] normal-case`}>
              <Zap className="w-3 h-3" />
              전문가 서비스
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <h1 className={DS.text.pageTitle}>
                전문가 서비스
              </h1>
              <p className={`mt-3 ${DS.text.body} max-w-md`}>
                법률·세무·감정 전문가 네트워크 — NPL 투자의 전 과정을 지원합니다
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-6 pb-1">
              {[
                { value: "120+", label: "검증 전문가" },
                { value: "3,400+", label: "커뮤니티 게시글" },
                { value: "48개", label: "교육 강좌" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-4">
                  {i > 0 && <div className="w-px h-8 bg-[var(--color-border-subtle)]" />}
                  <div>
                    <p className={DS.text.metricLarge}>{s.value}</p>
                    <p className={`${DS.text.micro} mt-0.5`}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3 Pillars ── */}
      <div className={`${DS.page.container} pt-10 pb-10`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.key}
                className={`group relative overflow-hidden ${DS.card.interactive} flex flex-col`}
              >
                {/* Top accent bar */}
                <div className={`h-[3px] w-full ${p.accentColor}`} />

                <div className="p-6 flex flex-col gap-4 flex-1">
                  <div className={`w-11 h-11 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${p.iconColor}`} />
                  </div>

                  <div className="flex-1">
                    <h3 className={`${DS.text.cardSubtitle} mb-1.5`}>{p.label}</h3>
                    <p className={DS.text.caption}>{p.desc}</p>
                  </div>

                  <div className={`flex items-center justify-between pt-4 ${DS.divider.default}`}>
                    <div>
                      <p className={DS.text.metricLarge}>{p.count}</p>
                      <p className={`${DS.text.micro} mt-0.5`}>{p.countLabel}</p>
                    </div>
                    <Link href={p.href}>
                      <button className={DS.button.secondary + ' ' + DS.button.sm}>
                        {p.cta}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Expert Preview ── */}
      <div className={`${DS.page.container} pb-10`}>
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={DS.text.sectionTitle}>전문가 네트워크</h2>
            <p className={`${DS.text.caption} mt-0.5`}>검증된 법률·세무·감정평가 전문가</p>
          </div>
          <Link href="/services/experts">
            <button className={`${DS.button.ghost} ${DS.button.sm}`}>
              전체보기 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {EXPERT_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setExpertFilter(cat.key); setExpertsLoading(true) }}
              className={`${DS.filter.chip} ${
                expertFilter === cat.key
                  ? DS.filter.chipActive
                  : DS.filter.chipInactive
              }`}
            >
              {cat.label}
            </button>
          ))}
          <Link href="/services/experts/register" className="ml-auto">
            <button className={`${DS.button.secondary} ${DS.button.sm}`}>
              + 전문가 등록
            </button>
          </Link>
        </div>

        {expertsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-[var(--color-surface-sunken)] animate-pulse" />
            ))}
          </div>
        ) : experts.length === 0 ? (
          <div className={DS.empty.wrapper}>
            <Users className={DS.empty.icon} />
            <p className={DS.empty.title}>등록된 전문가가 없습니다</p>
            <Link href="/services/experts/register" className="mt-4 inline-block">
              <button className={DS.button.primary}>
                전문가로 등록하기
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {experts.map((expert) => {
              const gradKey = Object.keys(SPECIALTY_ACCENT).find(k => expert.specialty?.includes(k)) || "default"
              return (
                <Link key={expert.id} href={`/services/experts/${expert.id}`}>
                  <div className={`${DS.card.interactive} p-5 flex flex-col gap-3`}>
                    <div className="flex items-start gap-3">
                      <div className={`h-11 w-11 shrink-0 rounded-xl ${SPECIALTY_ACCENT[gradKey]} flex items-center justify-center text-white font-bold ${DS.text.cardSubtitle} shadow-[var(--shadow-sm)]`}>
                        {expert.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`${DS.text.bodyBold} truncate`}>{expert.name}</p>
                        <p className={`${DS.text.caption} mt-0.5`}>{expert.specialty}</p>
                        {expert.location && (
                          <div className={`flex items-center gap-1 mt-0.5 ${DS.text.micro}`}>
                            <MapPin className="w-3 h-3" /> {expert.location}
                          </div>
                        )}
                      </div>
                    </div>
                    {expert.rating !== undefined && (
                      <div className={`flex items-center gap-1 ${DS.text.bodyBold}`}>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{expert.rating.toFixed(1)}</span>
                        {expert.review_count !== undefined && (
                          <span className={DS.text.captionLight}>({expert.review_count})</span>
                        )}
                      </div>
                    )}
                    {expert.expertise_areas && expert.expertise_areas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {expert.expertise_areas.slice(0, 3).map((area) => (
                          <span key={area} className={`${DS.text.micro} px-2 py-0.5 rounded-md bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]`}>{area}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity Feed ── */}
      <div className={`${DS.page.container} pb-10`}>
        {/* Section label row */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`h-px flex-1 ${DS.divider.default.replace('border-t ', 'bg-').replace('border-[', 'bg-[')}`} style={{ height: '1px', background: 'var(--color-border-subtle)' }} />
          <span className={DS.text.caption}>최근 활동</span>
          <div style={{ height: '1px', background: 'var(--color-border-subtle)' }} className="flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Community posts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${DS.text.bodyBold} flex items-center gap-2`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-positive)]" />
                최신 커뮤니티
              </h2>
              <Link href="/community">
                <button className={`${DS.button.ghost} ${DS.button.sm}`}>
                  전체보기 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
            <div className={`${DS.card.base} overflow-hidden`}>
              {postsLoading ? (
                <div className="space-y-px">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 bg-[var(--color-surface-sunken)] animate-pulse" />)}
                </div>
              ) : posts.length === 0 ? (
                <div className={`p-8 text-center ${DS.text.caption}`}>아직 게시글이 없습니다</div>
              ) : (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {posts.slice(0, 6).map((post) => (
                    <Link key={post.id} href={`/community/${post.id}`}>
                      <div className="px-4 py-3 hover:bg-[var(--color-surface-sunken)] transition-colors flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          {post.category && (
                            <span className={`${DS.text.micro} px-1.5 py-0.5 rounded mr-2 ${CATEGORY_BADGE[post.category] || CATEGORY_BADGE.default}`}>
                              {post.category}
                            </span>
                          )}
                          <span className={DS.text.bodyMedium}>{post.title}</span>
                          <div className={`flex items-center gap-2 mt-0.5 ${DS.text.micro}`}>
                            <span>{post.author_name || "익명"}</span>
                            <span>조회 {post.view_count ?? 0}</span>
                            <span>댓글 {post.comment_count ?? 0}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Learn links */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${DS.text.bodyBold} flex items-center gap-2`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                교육 콘텐츠
              </h2>
            </div>
            <div className="space-y-3">
              {LEARN_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className={`${DS.card.interactive} p-4 flex items-center gap-4`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <link.icon className="w-5 h-5 text-[var(--color-brand-mid)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={DS.text.bodyBold}>{link.label}</p>
                      <p className={`${DS.text.caption} mt-0.5`}>{link.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  </div>
                </Link>
              ))}

              {/* Master class card */}
              <div className={`${DS.card.dark} p-4 flex items-center justify-between gap-4`}>
                <div>
                  <p className={`${DS.text.bodyBold} text-white`}>NPL 투자 마스터 클래스</p>
                  <p className="text-[0.8125rem] text-white/70 mt-0.5">실전 투자자들의 노하우</p>
                </div>
                <Link href="/services/learn/courses">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[var(--color-brand-dark)] text-[0.8125rem] font-bold hover:bg-blue-50 transition-colors shrink-0">
                    강의 보기 <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA Banner ── */}
      <div className={`${DS.page.container} pb-16`}>
        <div className={`relative overflow-hidden ${DS.card.elevated} border-[var(--color-brand-mid)]/30`}>
          {/* Accent left bar */}
          <div className="absolute left-0 inset-y-0 w-[3px] bg-[var(--color-brand-mid)] rounded-l-2xl" />

          <div className="relative px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className={`${DS.text.label} text-[var(--color-brand-mid)] normal-case mb-2`}>전문가 파트너십</p>
              <h3 className={DS.text.sectionTitle}>전문가로 등록하시겠어요?</h3>
              <p className={`${DS.text.body} mt-1.5 max-w-md`}>
                NPLatform과 함께 NPL 투자자들에게 전문 서비스를 제공하고 새로운 고객을 만나보세요.
              </p>
            </div>
            <Link href="/services/experts/register" className="relative shrink-0">
              <button className={DS.button.primary + ' ' + DS.button.lg}>
                전문가 등록하기 <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
