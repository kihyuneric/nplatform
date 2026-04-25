"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Calendar, Building, MapPin, TrendingUp, TrendingDown, Minus,
  Share2, Bookmark, Twitter, Link2, Clock, ChevronRight,
} from "lucide-react"
import { getDummyArticleById, KEYWORD_CATEGORY_MAP } from "@/lib/dummy-data"
import type { KeywordCategory } from "@/lib/dummy-data"
import { toast } from "sonner"

const CATEGORY_STYLES: Record<KeywordCategory, { bg: string; text: string; dot: string }> = {
  "거래/시장": { bg: "bg-blue-500/10 border border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
  "개발/지역": { bg: "bg-emerald-500/10 border border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  "정책/규제": { bg: "bg-amber-500/10 border border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  "투자/금융": { bg: "bg-purple-500/10 border border-purple-500/30", text: "text-purple-400", dot: "bg-purple-400" },
}

const DIR_INFO: Record<string, { icon: typeof TrendingUp; color: string; bg: string; label: string }> = {
  "상승": { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/30", label: "상승 전망" },
  "하락": { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10 border border-red-500/30", label: "하락 전망" },
  "중립": { icon: Minus, color: "text-slate-400", bg: "bg-slate-500/10 border border-slate-500/30", label: "중립" },
}

// Mock related articles for editorial feel
const RELATED_ARTICLES = [
  { id: 2, title: "수도권 NPL 경매 낙찰가율 3개월 연속 상승", category: "경매·공매", time: "2시간 전" },
  { id: 3, title: "금융위, NPL 투자 규제 완화 방안 검토 중", category: "규제·정책", time: "4시간 전" },
  { id: 4, title: "강남권 상업용 부동산 부실채권 매각 증가", category: "시장·거래", time: "6시간 전" },
]

export default function NewsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params?.id)
  const article = getDummyArticleById(id)

  if (!article) {
    return (
      <div className="min-h-screen bg-[var(--color-brand-deepest)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-400 mb-4">기사를 찾을 수 없습니다.</p>
          <Link href="/news" className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors border-[var(--color-brand-dark)]/40 text-slate-300 hover:bg-[var(--color-brand-deep)]">
            뉴스 목록으로
          </Link>
        </div>
      </div>
    )
  }

  const dir = DIR_INFO[article.direction] || DIR_INFO["중립"]
  const DirIcon = dir.icon
  const readingTime = Math.max(1, Math.round((article.summary?.length ?? 200) / 400))

  return (
    <div className="min-h-screen bg-[var(--color-brand-deepest)]">

      {/* ── Hero Image Placeholder ── */}
      <div className="relative h-56 sm:h-72 lg:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1F38] via-[#1a3a5c] to-[#0D2540]" />
        {/* Decorative grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(46,117,182,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(46,117,182,0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-brand-mid)]/10 rounded-full blur-3xl" />
        {/* Category label overlaid on hero */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#060E1C] to-transparent h-32" />
        <div className="absolute bottom-5 left-4 sm:left-8 lg:left-12">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase bg-[var(--color-brand-mid)] text-white">
            NPL 뉴스
          </span>
        </div>
      </div>

      {/* ── Article Layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── Main Column ── */}
          <article className="flex-1 min-w-0">

            {/* Back nav */}
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[var(--color-brand-mid)] text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              뉴스 목록
            </button>

            {/* Article Header */}
            <header className="mb-8">
              {/* Direction badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${dir.bg} ${dir.color}`}>
                  <DirIcon className="h-3.5 w-3.5" />
                  {dir.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  확신도 {Math.round(article.direction_score * 100)}%
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-6">
                {article.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-5 border-b border-[var(--color-brand-dark)]/40">
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-300">{article.provider}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {article.published_at}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {article.sido}{article.sigungu ? ` ${article.sigungu}` : ""}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  읽는 시간 {readingTime}분
                </span>
              </div>
            </header>

            {/* Article Body */}
            <div className="prose prose-invert prose-lg max-w-none mb-10">
              <p className="text-[17px] leading-8 text-slate-300 whitespace-pre-line font-light">
                {article.summary}
              </p>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="rounded-xl border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)] p-5 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">방향성 확신도</p>
                <p className="text-3xl font-bold text-[var(--color-brand-mid)]">
                  {Math.round(article.direction_score * 100)}%
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)] p-5 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">감성 점수</p>
                <p className={`text-3xl font-bold ${
                  article.sentiment_score > 0 ? "text-emerald-400"
                    : article.sentiment_score < 0 ? "text-red-400"
                    : "text-slate-400"
                }`}>
                  {article.sentiment_score > 0 ? "+" : ""}{article.sentiment_score.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Keywords */}
            {article.keywords.length > 0 && (
              <div className="mb-10 p-5 rounded-xl border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)]">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">관련 키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {article.keywords.map((kw) => {
                    const cat = KEYWORD_CATEGORY_MAP[kw]
                    const style = cat
                      ? CATEGORY_STYLES[cat]
                      : { bg: "bg-slate-500/10 border border-slate-500/30", text: "text-slate-400", dot: "bg-slate-400" }
                    return (
                      <span
                        key={kw}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {kw}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Related Articles */}
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-[var(--color-brand-mid)]" />
                관련 기사
              </h2>
              <div className="space-y-0 rounded-xl border border-[var(--color-brand-dark)]/40 overflow-hidden">
                {RELATED_ARTICLES.map((rel, i) => (
                  <Link
                    key={rel.id}
                    href={`/news/${rel.id}`}
                    className={`flex items-center gap-4 px-5 py-4 bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)]/50 transition-colors group ${
                      i < RELATED_ARTICLES.length - 1 ? "border-b border-[var(--color-brand-dark)]/40" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[10px] text-[var(--color-brand-mid)] font-semibold uppercase tracking-wider mb-1">
                        {rel.category}
                      </span>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                        {rel.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{rel.time}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[var(--color-brand-mid)] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* ── Share Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-3 w-12 items-center pt-16">
            <div className="sticky top-24 flex flex-col gap-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-normal writing-mode-vertical rotate-180 text-center mb-1" style={{ writingMode: 'vertical-rl' }}>공유</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success("링크가 복사되었습니다")
                }}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)] text-slate-400 hover:border-[var(--color-brand-mid)] hover:text-[var(--color-brand-mid)] transition-all"
                title="링크 복사"
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)] text-slate-400 hover:border-[#1DA1F2] hover:text-[#1DA1F2] transition-all"
                title="Twitter 공유"
              >
                <Twitter className="h-4 w-4" />
              </button>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)] text-slate-400 hover:border-amber-400 hover:text-amber-400 transition-all"
                title="스크랩"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-brand-dark)]/40 bg-[var(--color-brand-deep)] text-slate-400 hover:border-emerald-400 hover:text-emerald-400 transition-all"
                title="공유"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}
