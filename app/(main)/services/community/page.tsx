"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ThumbsUp,
  MessageSquare,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Users,
  PenSquare,
  TrendingUp,
  Award,
  BarChart2,
  Pin,
  Sparkles,
  MessageCircle,
  Newspaper,
} from "lucide-react";
import { GuideButton } from "@/components/guide/guide-button";
import { SampleBadge } from "@/components/shared/sample-badge";
import { fetchSafe } from "@/lib/fetch-safe";
import DS, { formatKRW, formatDate } from "@/lib/design-system";

// ─── Constants ────────────────────────────────────────────────

const CATEGORIES = ["전체", "투자전략", "판례분석", "뉴스", "Q&A", "자유게시판"] as const;

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  자유: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]",
  질문: "bg-stone-100/10 text-stone-900",
  정보공유: "bg-stone-100/10 text-stone-900",
  거래후기: "bg-stone-100/10 text-stone-900",
  법률상담: "bg-stone-100/10 text-stone-900",
  투자전략: "bg-stone-100/10 text-stone-900",
  시장분석: "bg-stone-100/10 text-stone-900",
  질문답변: "bg-stone-100/10 text-stone-900",
  후기: "bg-stone-100/10 text-stone-900",
  일반: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]",
  뉴스: "bg-stone-100/10 text-stone-900",
  법률: "bg-stone-100/10 text-stone-900",
  "Q&A": "bg-stone-100/10 text-stone-900",
  판례분석: "bg-stone-100/10 text-stone-900",
  자유게시판: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]",
};

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: "자유",
  CASE_STUDY: "거래후기",
  MARKET_ANALYSIS: "시장분석",
  QNA: "Q&A",
  TIP: "투자전략",
  NEWS: "뉴스",
  LEGAL: "판례분석",
};

const CATEGORY_TO_API: Record<string, string> = {
  자유: "GENERAL",
  "Q&A": "QNA",
  투자전략: "TIP",
  거래후기: "CASE_STUDY",
  시장분석: "MARKET_ANALYSIS",
  질문답변: "QNA",
  후기: "CASE_STUDY",
  판례분석: "LEGAL",
  뉴스: "NEWS",
  자유게시판: "GENERAL",
};

// ─── Types ────────────────────────────────────────────────────

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  likes: number;
  comment_count: number;
  views: number;
  images?: string[];
  created_at: string;
  is_pinned?: boolean;
  author: { id: string; name: string; avatar_url?: string } | null;
}

// ─── Sidebar mock data ────────────────────────────────────────

const HOT_TOPICS = [
  "NPL 수익률 계산법",
  "2026 경매 판례 정리",
  "배당순위 분쟁 사례",
  "근저당권 말소 타이밍",
  "공매 vs 사매 비교",
];

const TOP_CONTRIBUTORS = [
  { name: "김***변호사", posts: 142, badge: "전문가" },
  { name: "이***투자자", posts: 98, badge: "고수" },
  { name: "박***컨설턴트", posts: 76, badge: "활발" },
];

const COMMUNITY_STATS = [
  { label: "전체 게시글", value: "2,847" },
  { label: "오늘 새 글", value: "34" },
  { label: "활성 멤버", value: "1,240" },
];

const POSTS_PER_PAGE = 20;

// ─── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// ─── Component ────────────────────────────────────────────────

export default function CommunityPage() {
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("sort", sortBy);
      if (activeCategory !== "전체") {
        const apiCat = CATEGORY_TO_API[activeCategory];
        if (apiCat) params.set("category", apiCat);
      }
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const data = await fetchSafe<{ posts?: Post[]; totalPages?: number }>(
        `/api/v1/community?${params.toString()}`,
        { fallback: { posts: [], totalPages: 1 } }
      );
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setPosts([]);
      setTotalPages(1);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, sortBy, activeCategory, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const getCategoryLabel = (apiCategory: string) =>
    CATEGORY_LABEL[apiCategory] || apiCategory;

  const getCategoryColor = (apiCategory: string) => {
    const label = getCategoryLabel(apiCategory);
    return CATEGORY_COLORS[label] ?? "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]";
  };

  return (
    <div className={DS.page.wrapper}>

      {/* ── Hero (분석·딜룸과 톤앤매너 통일) ─────────────────────── */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className={`${DS.page.container} py-10`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h1 className={`${DS.text.sectionTitle} tracking-tight`}>
                  커뮤니티 · NPL 뉴스
                </h1>
                <SampleBadge />
              </div>
              <p className={`${DS.text.caption} max-w-2xl`}>
                NPL 시장 뉴스 · 판례분석 · 투자전략 Q&amp;A — 전문 투자자와 실무자의 인사이트를 한 곳에서
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <GuideButton serviceKey="community" />
              <Link
                href="/services/community/new"
                className={DS.button.primary}
              >
                <PenSquare className="h-3.5 w-3.5" /> 글쓰기
              </Link>
            </div>
          </div>

          {/* Quick stats (분석 대시보드 패턴 재사용) */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "전체 게시글", value: "2,847", icon: Newspaper, color: "text-stone-900" },
              { label: "오늘 새 글",   value: "34",    icon: Sparkles,  color: "text-stone-900" },
              { label: "활성 멤버",    value: "1,240", icon: Users,     color: "text-stone-900" },
              { label: "이번 주 화제", value: "5개",   icon: TrendingUp, color: "text-stone-900" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3"
              >
                <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
                <div className="min-w-0">
                  <p className={`${DS.text.micro} truncate`}>{s.label}</p>
                  <p className={DS.text.bodyBold}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={`${DS.page.container} pt-6`}>
        {/* ── Cross-links ───────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Link href="/exchange" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>매물 탐색 →</Link>
          <Link href="/analysis" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>분석 대시보드 →</Link>
          <Link href="/deals" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>딜룸 →</Link>
        </div>

        {/* ── Category Tabs + Sort/Search Bar ─────────────── */}
        <div className={`mb-0 ${DS.divider.default}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Category tabs */}
            <nav className="flex items-center gap-0 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`whitespace-nowrap px-4 py-3 text-[0.8125rem] font-medium border-b-2 transition-colors ${
                    activeCategory === cat
                      ? "border-[var(--color-brand-dark)] text-[var(--color-brand-dark)]"
                      : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>

            {/* Sort + Search */}
            <div className="flex items-center gap-2 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={`${DS.input.base} w-40 sm:w-52 py-1.5 pl-8 pr-3`}
                />
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`rounded px-2.5 py-1 text-[0.6875rem] font-medium transition-colors ${
                      sortBy === opt.value
                        ? "bg-[var(--color-brand-dark)] text-white"
                        : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main layout: List + Sidebar ──────────────────── */}
        <div className="mt-0 flex gap-6 items-start">

          {/* ── Post List ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Column headers */}
            <div className={`hidden sm:grid grid-cols-[1fr_72px_56px] gap-x-4 px-3 py-2 ${DS.text.label} ${DS.divider.default}`}>
              <span>제목</span>
              <span className="text-right">조회</span>
              <span className="text-right">댓글</span>
            </div>

            {/* Error state */}
            {fetchError && !isLoading && (
              <div className={DS.empty.wrapper}>
                <div className="w-10 h-10 rounded-full bg-stone-100/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-stone-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className={DS.empty.title}>오류가 발생했습니다</p>
                <p className={DS.empty.description}>게시글을 불러오는데 실패했습니다</p>
                <button onClick={() => fetchPosts()} className={`${DS.button.secondary} mt-3`}>다시 시도</button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="border-b border-[var(--color-border-subtle)] px-3 py-3.5 animate-pulse">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-4 w-14 bg-[var(--color-surface-sunken)] rounded-full" />
                      <div className="h-4 w-2/3 bg-[var(--color-surface-sunken)] rounded" />
                    </div>
                    <div className="flex gap-3">
                      <div className="h-3 w-16 bg-[var(--color-surface-sunken)] rounded" />
                      <div className="h-3 w-10 bg-[var(--color-surface-sunken)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !fetchError && posts.length === 0 && (
              <div className={DS.empty.wrapper}>
                <PenSquare className={DS.empty.icon} />
                <p className={DS.empty.title}>게시글이 없습니다</p>
                <p className={DS.empty.description}>
                  {searchQuery
                    ? "검색 결과가 없습니다. 다른 키워드로 시도해보세요."
                    : "아직 작성된 게시글이 없습니다. 첫 번째 글을 작성해보세요!"}
                </p>
                <Link href="/services/community/new">
                  <button className={`${DS.button.primary} mt-4`}>
                    <PenSquare className="h-3.5 w-3.5" /> 글쓰기
                  </button>
                </Link>
              </div>
            )}

            {/* Post rows */}
            {!isLoading && !fetchError && posts.length > 0 && (
              <div>
                {posts.map((post) => {
                  const isPinned = post.is_pinned;
                  const catLabel = getCategoryLabel(post.category);
                  const catColor = getCategoryColor(post.category);
                  return (
                    <Link
                      key={post.id}
                      href={`/services/community/${post.id}`}
                      className={`group flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-3 transition-colors hover:bg-[var(--color-surface-sunken)] ${
                        isPinned ? "border-l-[3px] border-l-amber-400 pl-2" : ""
                      }`}
                    >
                      {isPinned && (
                        <Pin className="h-3 w-3 text-stone-900 shrink-0 rotate-45" />
                      )}

                      {/* Main content */}
                      <div className="flex-1 min-w-0 py-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.6875rem] font-medium shrink-0 ${catColor}`}>
                            {catLabel}
                          </span>
                          <span className={`${DS.text.bodyMedium} group-hover:text-[var(--color-brand-dark)] line-clamp-1 transition-colors`}>
                            {post.title}
                          </span>
                          {post.comment_count > 0 && (
                            <span className="text-[0.6875rem] text-[var(--color-brand-mid)] shrink-0 font-medium">
                              [{post.comment_count}]
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-3 ${DS.text.captionLight}`}>
                          <span className={DS.text.caption}>
                            {post.author?.name || "익명"}
                          </span>
                          <span>{timeAgo(post.created_at)}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {post.likes}
                          </span>
                        </div>
                      </div>

                      {/* Right stats */}
                      <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <span className={`w-16 text-right ${DS.text.captionLight} flex items-center justify-end gap-1`}>
                          <Eye className="h-3 w-3" />
                          {post.views.toLocaleString()}
                        </span>
                        <span className={`w-10 text-right ${DS.text.captionLight} flex items-center justify-end gap-1`}>
                          <MessageSquare className="h-3 w-3" />
                          {post.comment_count}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`${DS.button.icon} border border-[var(--color-border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-[0.8125rem] font-medium transition-colors ${
                      page === currentPage
                        ? "bg-[var(--color-brand-dark)] text-white"
                        : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`${DS.button.icon} border border-[var(--color-border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Right Sidebar (desktop only) ─────────────── */}
          <aside className="hidden lg:flex flex-col gap-4 w-56 shrink-0 pt-2">

            {/* Hot Topics */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className={`flex items-center gap-2 px-4 py-3 ${DS.divider.default}`}>
                <TrendingUp className="h-4 w-4 text-stone-900" />
                <span className={DS.text.cardSubtitle}>이번 주 화제</span>
              </div>
              <ul className="py-1">
                {HOT_TOPICS.map((topic, i) => (
                  <li key={topic}>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-[var(--color-surface-sunken)] transition-colors">
                      <span className={`text-[0.6875rem] font-bold w-4 shrink-0 ${i < 3 ? "text-stone-900" : "text-[var(--color-text-muted)]"}`}>
                        {i + 1}
                      </span>
                      <span className={`${DS.text.captionLight} line-clamp-1`}>{topic}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top Contributors */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className={`flex items-center gap-2 px-4 py-3 ${DS.divider.default}`}>
                <Award className="h-4 w-4 text-stone-900" />
                <span className={DS.text.cardSubtitle}>TOP 기여자</span>
              </div>
              <ul className="py-1">
                {TOP_CONTRIBUTORS.map((user, i) => (
                  <li key={user.name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-brand-dark)] text-white text-[0.625rem] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`${DS.text.caption} truncate`}>{user.name}</p>
                      <p className={DS.text.micro}>{user.posts}개 작성</p>
                    </div>
                    <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-stone-100/10 text-stone-900 font-medium shrink-0">
                      {user.badge}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community Stats */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className={`flex items-center gap-2 px-4 py-3 ${DS.divider.default}`}>
                <BarChart2 className="h-4 w-4 text-[var(--color-brand-dark)]" />
                <span className={DS.text.cardSubtitle}>커뮤니티 현황</span>
              </div>
              <ul className="py-2">
                {COMMUNITY_STATS.map((stat) => (
                  <li key={stat.label} className="flex items-center justify-between px-4 py-1.5">
                    <span className={DS.text.captionLight}>{stat.label}</span>
                    <span className={DS.text.caption}>{stat.value}</span>
                  </li>
                ))}
              </ul>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
