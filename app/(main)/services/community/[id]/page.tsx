"use client"

import { useState, useEffect, use, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ThumbsUp, MessageSquare, Eye, Clock, Send, CornerDownRight,
  Trash2, Reply, Flag, X, Share2, Bookmark, ChevronRight, Heart,
  Lightbulb, TrendingUp, Gavel, Newspaper,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { ReportDialog } from "@/components/community/report-dialog"

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: "자유", CASE_STUDY: "거래후기", MARKET_ANALYSIS: "시장분석",
  QNA: "질문", TIP: "정보공유", NEWS: "NPL뉴스", LEGAL: "판례분석",
}

const CATEGORY_COLORS: Record<string, string> = {
  TIP: "bg-blue-500/10 text-blue-400",
  MARKET_ANALYSIS: "bg-emerald-500/10 text-emerald-400",
  QNA: "bg-amber-500/10 text-amber-400",
  CASE_STUDY: "bg-purple-500/10 text-purple-400",
  GENERAL: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]",
  NEWS: "bg-red-500/10 text-red-400",
  LEGAL: "bg-indigo-500/10 text-indigo-400",
}

interface Post {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  likes: number
  views: number
  comment_count: number
  created_at: string
  images?: string[]
  author: { id: string; name: string; company_name?: string; avatar_url?: string } | null
}

interface Comment {
  id: string
  content: string
  likes: number
  parent_id: string | null
  created_at: string
  author: { id: string; name: string; avatar_url?: string } | null
}

// Estimate reading time from plain text
function estimateReadingTime(content: string): string {
  const stripped = content.replace(/<[^>]*>/g, "")
  const words = stripped.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes}분`
}

function relativeDate(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}일 전`
  return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

// Mask name for privacy: 김** style
function maskName(name: string): string {
  if (!name || name === "익명") return "익명"
  if (name.length <= 1) return name + "*"
  return name.charAt(0) + "*".repeat(name.length - 1)
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/community/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data.post)
        setComments(data.comments || [])
      })
      .catch(() => toast.error("게시글을 불러올 수 없습니다."))
      .finally(() => setIsLoading(false))
  }, [id])

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/v1/community/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (!res.ok) throw new Error("댓글 작성 실패")
      const { comment } = await res.json()
      setComments((prev) => [...prev, comment])
      setNewComment("")
      toast.success("댓글이 작성되었습니다.")
    } catch {
      toast.error("댓글 작성에 실패했습니다. 로그인이 필요합니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return
    setIsSubmittingReply(true)
    try {
      const res = await fetch(`/api/v1/community/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_id: parentId,
        }),
      })
      if (!res.ok) throw new Error("답글 작성 실패")
      const { comment } = await res.json()
      setComments((prev) => [...prev, comment])
      setReplyTo(null)
      setReplyContent("")
      toast.success("답글이 작성되었습니다.")
    } catch {
      toast.error("답글 작성에 실패했습니다. 로그인이 필요합니다.")
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      await fetch(`/api/v1/community/${id}`, { method: "DELETE" })
      toast.success("게시글이 삭제되었습니다.")
      router.push("/community")
    } catch {
      toast.error("삭제에 실패했습니다.")
    }
  }

  // Group comments: top-level + their replies
  const commentTree = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parent_id)
    const replies = comments.filter((c) => c.parent_id)
    return topLevel.map((parent) => ({
      ...parent,
      replies: replies.filter((r) => r.parent_id === parent.id),
    }))
  }, [comments])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)]">
        <div className="mx-auto max-w-5xl px-4 py-10 animate-pulse">
          <div className="h-4 w-32 bg-[var(--color-surface-overlay)] rounded mb-8" />
          <div className="grid lg:grid-cols-[1fr_280px] gap-10">
            <div className="space-y-5">
              <div className="h-6 w-20 bg-[var(--color-surface-overlay)] rounded-full" />
              <div className="h-10 w-4/5 bg-[var(--color-surface-overlay)] rounded" />
              <div className="h-10 w-3/5 bg-[var(--color-surface-overlay)] rounded" />
              <div className="flex items-center gap-3 mt-4">
                <div className="h-10 w-10 rounded-full bg-[var(--color-surface-overlay)]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-[var(--color-surface-overlay)] rounded" />
                  <div className="h-3 w-36 bg-[var(--color-surface-overlay)] rounded" />
                </div>
              </div>
              <div className="h-px bg-[var(--color-surface-overlay)] my-6" />
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-4 bg-[var(--color-surface-overlay)] rounded" style={{ width: `${85 + Math.random()*15}%` }} />
                ))}
              </div>
            </div>
            <div className="hidden lg:block space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-[var(--color-surface-overlay)] rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center py-20 px-4">
          <div className="h-16 w-16 rounded-full bg-[var(--color-surface-overlay)] flex items-center justify-center mx-auto mb-5">
            <MessageSquare className="h-8 w-8 text-[var(--color-text-muted)]" />
          </div>
          <p className="text-xl font-bold text-[var(--color-text-primary)] mb-2">게시글을 찾을 수 없습니다</p>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">삭제되었거나 존재하지 않는 게시글입니다.</p>
          <Link href="/community" className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors gap-2 inline-flex items-center">
            <ArrowLeft className="h-4 w-4" />
            커뮤니티로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const readingTime = estimateReadingTime(post.content)

  const relatedPosts = [
    { href: "/community", label: "커뮤니티 전체 보기", desc: "투자자 거래 후기 · 시장 분석", icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
    { href: "/community?category=TIP", label: "정보공유 게시판", desc: "NPL 투자 실전 팁 모음", icon: <Lightbulb className="h-4 w-4 text-amber-500" /> },
    { href: "/community?category=LEGAL", label: "판례분석", desc: "최신 부동산 판례 분석", icon: <Gavel className="h-4 w-4 text-violet-500" /> },
    { href: "/community?category=NEWS", label: "NPL 뉴스", desc: "시장 동향 및 공시 정보", icon: <Newspaper className="h-4 w-4 text-blue-500" /> },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">

      {/* ── TOP NAV BAR ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--color-surface-base)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 py-3">
            <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <Link href="/community" className="hover:text-[var(--color-text-primary)] transition-colors font-medium">
                커뮤니티
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.GENERAL}`}>
                {CATEGORY_LABEL[post.category] || post.category}
              </span>
            </nav>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다.") }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                공유
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-500/5 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_260px] gap-12">

          {/* ── MAIN COLUMN ─────────────────────────────────────── */}
          <div className="min-w-0">

            {/* ── ARTICLE HEADER ────────────────────────────────── */}
            <header className="mb-8">
              {/* Category badge */}
              <div className="mb-5">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.GENERAL}`}>
                  {CATEGORY_LABEL[post.category] || post.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-black leading-[1.2] text-[var(--color-text-primary)] mb-6 tracking-tight">
                {post.title}
              </h1>

              {/* Author + meta row */}
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar className="h-11 w-11 ring-2 ring-[var(--color-border-subtle)] shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-[var(--color-brand-deep)] to-[#2E75B6] text-white text-sm font-black">
                    {post.author?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    {post.author?.name || "익명"}
                  </p>
                  {post.author?.company_name && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{post.author.company_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] flex-wrap shrink-0">
                  <span>{formatDate(post.created_at)}</span>
                  <span className="text-[var(--color-text-muted)]">·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.views.toLocaleString()}
                  </span>
                  <span className="text-[var(--color-text-muted)]">·</span>
                  <span className="bg-[var(--color-surface-overlay)] px-2 py-0.5 rounded-full font-medium">
                    읽기 {readingTime}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] font-medium hover:bg-[var(--color-surface-overlay)] transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-7 border-t border-[var(--color-border-subtle)]" />
            </header>

            {/* ── ARTICLE BODY ──────────────────────────────────── */}
            <article className="mb-10">
              {post.content?.startsWith('<') ? (
                <div
                  className="prose prose-base max-w-none prose-headings:font-black prose-headings:text-[var(--color-text-primary)] prose-p:leading-8 prose-p:text-[var(--color-text-secondary)] prose-a:text-[#2E75B6] prose-strong:text-[var(--color-text-primary)] rich-editor-content"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="text-[16px] leading-9 text-[var(--color-text-secondary)] whitespace-pre-wrap font-[350]">
                  {post.content}
                </div>
              )}

              {/* Post images */}
              {post.images && post.images.length > 0 && (
                <div className="mt-8 space-y-3">
                  {post.images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`첨부 이미지 ${i + 1}`}
                      className="rounded-2xl object-cover w-full border border-[var(--color-border-subtle)] shadow-sm"
                    />
                  ))}
                </div>
              )}
            </article>

            {/* ── REACTION BAR ──────────────────────────────────── */}
            <div className="flex items-center justify-between py-5 border-y border-[var(--color-border-subtle)] mb-12">
              <div className="flex items-center gap-2">
                {/* Like */}
                <button
                  onClick={async () => {
                    setPost((prev) => prev ? { ...prev, likes: prev.likes + 1 } : prev)
                    try {
                      const res = await fetch(`/api/v1/community/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "like" }),
                      })
                      if (!res.ok) {
                        setPost((prev) => prev ? { ...prev, likes: prev.likes - 1 } : prev)
                        toast.error("좋아요에 실패했습니다.")
                      }
                    } catch {
                      setPost((prev) => prev ? { ...prev, likes: prev.likes - 1 } : prev)
                      toast.error("네트워크 오류가 발생했습니다.")
                    }
                  }}
                  className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-secondary)] hover:border-red-300 hover:text-red-500 hover:bg-red-500/5 transition-all active:scale-95"
                >
                  <ThumbsUp className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  유용해요 {post.likes}
                </button>

                {/* Insight reaction (static decorative) */}
                <button
                  onClick={() => toast.success("인사이트로 표시했습니다.")}
                  className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-secondary)] hover:border-amber-300 hover:text-amber-600 hover:bg-amber-500/5 transition-all active:scale-95"
                >
                  <Lightbulb className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  인사이트
                </button>

                {/* Save */}
                <button
                  onClick={() => toast.success("북마크에 저장되었습니다.")}
                  className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[#2E75B6]/40 hover:text-[#2E75B6] hover:bg-blue-500/5 transition-all active:scale-95"
                >
                  <Bookmark className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  저장
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Share */}
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다.") }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border-subtle)] text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  공유
                </button>

                {/* Report */}
                <button
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border-subtle)] text-sm font-medium text-[var(--color-text-muted)] hover:border-gray-300 hover:text-[var(--color-text-secondary)] transition-all"
                >
                  <Flag className="h-4 w-4" />
                  신고
                </button>
              </div>
            </div>

            {/* Report Dialog */}
            <ReportDialog
              open={reportOpen}
              onOpenChange={setReportOpen}
              targetId={id}
              targetType="post"
            />

            {/* ── COMMENTS SECTION ──────────────────────────────── */}
            <section>
              {/* Header */}
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-xl font-black text-[var(--color-text-primary)] flex items-center gap-2.5">
                  <MessageSquare className="h-5 w-5 text-[#2E75B6]" />
                  {comments.length}개의 댓글
                </h2>
                <select className="text-sm text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border-subtle)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 cursor-pointer">
                  <option>최신순</option>
                  <option>오래된순</option>
                  <option>좋아요순</option>
                </select>
              </div>

              {/* Compose box — at TOP */}
              <div className="mb-8 bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] focus-within:border-[#2E75B6]/50 focus-within:ring-2 focus-within:ring-[#2E75B6]/10 transition-all overflow-hidden">
                <div className="flex gap-3 p-4">
                  <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-gradient-to-br from-[var(--color-brand-deep)] to-[#2E75B6] text-white text-xs font-black">
                      나
                    </AvatarFallback>
                  </Avatar>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="의견을 남겨보세요..."
                    rows={3}
                    className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] resize-none focus:outline-none placeholder:text-[var(--color-text-muted)] leading-6"
                  />
                </div>
                <div className="flex items-center justify-between px-4 pb-3">
                  <span className="text-xs text-gray-400">{newComment.length > 0 ? `${newComment.length}자` : ""}</span>
                  <button
                    onClick={handleSubmitComment}
                    disabled={isSubmitting || !newComment.trim()}
                    className="bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)] gap-1.5 rounded-xl h-8 px-4 text-xs font-bold inline-flex items-center"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting ? "작성 중..." : "등록"}
                  </button>
                </div>
              </div>

              {/* Comment list */}
              <div className="space-y-0">
                {commentTree.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)]">
                    <div className="h-12 w-12 rounded-full bg-[var(--color-surface-overlay)] flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-6 w-6 text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm font-medium">아직 댓글이 없습니다</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-1">첫 댓글을 작성해보세요!</p>
                  </div>
                ) : (
                  commentTree.map((comment) => (
                    <div key={comment.id} className="group">
                      {/* Parent comment */}
                      <div className="flex gap-3 py-5">
                        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                          <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-600 text-white text-xs font-bold">
                            {comment.author?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">
                              {maskName(comment.author?.name || "익명")}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {relativeDate(comment.created_at)}
                            </span>
                            {comment.likes > 0 && (
                              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                                <ThumbsUp className="h-3 w-3" />
                                {comment.likes}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)] leading-7 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                          <button
                            onClick={() =>
                              setReplyTo({
                                id: comment.id,
                                authorName: comment.author?.name || "익명",
                              })
                            }
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[#2E75B6] transition-colors"
                          >
                            <Reply className="h-3.5 w-3.5" />
                            답글
                          </button>
                        </div>
                      </div>

                      {/* Reply compose */}
                      {replyTo?.id === comment.id && (
                        <div className="ml-12 mb-4">
                          <div className="rounded-xl border border-[#2E75B6]/25 bg-blue-500/5 overflow-hidden">
                            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                              <span className="text-xs text-[#2E75B6] flex items-center gap-1.5 font-semibold">
                                <CornerDownRight className="h-3.5 w-3.5" />
                                {replyTo.authorName}님에게 답글
                              </span>
                              <button
                                onClick={() => { setReplyTo(null); setReplyContent("") }}
                                className="text-gray-400 hover:text-[var(--color-text-primary)] transition-colors p-0.5"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="답글을 작성하세요..."
                              rows={2}
                              className="w-full bg-transparent px-4 py-2 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none placeholder:text-[var(--color-text-muted)]"
                              autoFocus
                            />
                            <div className="flex justify-end px-4 pb-3">
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={isSubmittingReply || !replyContent.trim()}
                                className="bg-[var(--color-brand-dark)] hover:bg-[#2E75B6] gap-1.5 rounded-lg h-8 text-xs px-3 inline-flex items-center"
                              >
                                <Send className="h-3.5 w-3.5" />
                                {isSubmittingReply ? "작성 중..." : "답글 작성"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nested replies (1 level deep) */}
                      {comment.replies.length > 0 && (
                        <div className="ml-12 border-l-2 border-[var(--color-border-subtle)] pl-5 mb-1 space-y-0">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3 py-4">
                              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-500 text-white text-xs font-bold">
                                  {reply.author?.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-sm font-bold text-[var(--color-text-primary)]">
                                    {maskName(reply.author?.name || "익명")}
                                  </span>
                                  <span className="text-xs text-[var(--color-text-muted)]">
                                    {relativeDate(reply.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-[#2E75B6] mb-1.5">
                                  @{maskName(comment.author?.name || "익명")}
                                </p>
                                <p className="text-sm text-[var(--color-text-secondary)] leading-6 whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-b border-[var(--color-border-subtle)]" />
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── RIGHT SIDEBAR (desktop only) ────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-5">

              {/* Post stats card */}
              <div className="bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] p-5">
                <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-normal mb-4">이 글의 반응</h3>
                <div className="space-y-3">
                  {[
                    { icon: <Eye className="h-4 w-4 text-gray-400" />, label: "조회", value: post.views.toLocaleString() },
                    { icon: <ThumbsUp className="h-4 w-4 text-blue-400" />, label: "유용해요", value: post.likes },
                    { icon: <MessageSquare className="h-4 w-4 text-emerald-400" />, label: "댓글", value: comments.length },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        {item.icon}
                        {item.label}
                      </div>
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related posts */}
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-normal mb-3 px-1">비슷한 글</h3>
                <div className="space-y-2">
                  {relatedPosts.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-subtle)] hover:shadow-sm transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-dark)] transition-colors leading-5">
                          {item.label}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-4">{item.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors shrink-0 mt-1.5 ml-auto" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Author card */}
              {post.author && (
                <div className="bg-gradient-to-br from-[var(--color-brand-deep)]/5 to-[#2E75B6]/5 rounded-2xl border border-[var(--color-brand-dark)]/10 p-5">
                  <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-normal mb-3">작성자</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-[var(--color-border-subtle)] shadow">
                      <AvatarFallback className="bg-gradient-to-br from-[var(--color-brand-deep)] to-[#2E75B6] text-white text-sm font-black">
                        {post.author.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{post.author.name}</p>
                      {post.author.company_name && (
                        <p className="text-xs text-[var(--color-text-muted)]">{post.author.company_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
