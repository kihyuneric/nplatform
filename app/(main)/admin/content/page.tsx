"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText, RefreshCw, Loader2, X, Save, Pin } from "lucide-react"
import { toast } from "sonner"
import DS, { formatDate } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"

const TABS = ["공지사항", "배너 관리", "뉴스 관리", "가이드", "강좌"] as const
type Tab = typeof TABS[number]

/* ── Supabase row types ─────────────────────────────────────────── */
interface CommunityPost {
  id: string
  title: string
  content: string
  author_id: string
  category: string
  status: string
  tags: string[] | null
  is_pinned: boolean | null
  is_anonymous: boolean | null
  likes: number
  views: number
  comment_count: number
  created_at: string | null
  updated_at: string | null
}

/* ── Status / category filters ──────────────────────────────────── */
const NOTICE_CATEGORIES = ["공지사항", "안내", "이벤트", "점검"]
const BANNER_CATEGORIES = ["배너"]
const NEWS_CATEGORIES = ["뉴스", "분석", "리포트"]
const GUIDE_CATEGORIES = ["가이드", "입문", "경매", "실사", "법률", "재무"]
const COURSE_CATEGORIES = ["강좌", "교육"]

function categoryListForTab(tab: Tab): string[] {
  switch (tab) {
    case "공지사항": return NOTICE_CATEGORIES
    case "배너 관리": return BANNER_CATEGORIES
    case "뉴스 관리": return NEWS_CATEGORIES
    case "가이드": return GUIDE_CATEGORIES
    case "강좌": return COURSE_CATEGORIES
  }
}

const NOTICE_STATUS_STYLE: Record<string, string> = {
  "published": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "draft": "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]",
  "scheduled": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "hidden": "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]",
}

const STATUS_LABEL: Record<string, string> = {
  "published": "게시중",
  "draft": "초안",
  "scheduled": "예약",
  "hidden": "비공개",
}

const TAB_MAP: Record<string, Tab> = {
  "notices": "공지사항",
  "banners": "배너 관리",
  "news": "뉴스 관리",
  "guide": "가이드",
  "courses": "강좌",
}

interface EditorState {
  id?: string // undefined = create, string = edit
  title: string
  content: string
  category: string
  status: string
  tags: string
  is_pinned: boolean
}

function ContentEditorModal({
  state,
  tab,
  onClose,
  onSaved,
}: {
  state: EditorState
  tab: Tab
  onClose: () => void
  onSaved: (post: CommunityPost) => void
}) {
  const [form, setForm] = useState(state)
  const [saving, setSaving] = useState(false)
  const categories = categoryListForTab(tab)
  const isNew = !state.id

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("제목을 입력하세요."); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category || categories[0],
        status: form.status,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        is_pinned: form.is_pinned,
        updated_at: new Date().toISOString(),
      }

      const supabase = createClient()
      let result: CommunityPost | null = null
      if (isNew) {
        const { data, error } = await supabase
          .from("community_posts")
          .insert({ ...payload, views: 0, likes: 0, comment_count: 0, is_anonymous: false, created_at: new Date().toISOString() })
          .select()
          .single()
        if (error) throw error
        result = data as CommunityPost
        toast.success(`"${result.title}" 등록 완료`)
      } else {
        const { data, error } = await supabase
          .from("community_posts")
          .update(payload)
          .eq("id", state.id!)
          .select()
          .single()
        if (error) throw error
        result = data as CommunityPost
        toast.success(`"${result.title}" 수정 완료`)
      }
      if (result) onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(`저장 실패: ${err.message ?? "알 수 없는 오류"}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`${DS.card.elevated} w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <h2 className={DS.text.cardTitle}>{isNew ? `새 ${tab} 작성` : `${tab} 수정`}</h2>
          <button onClick={onClose} className={DS.button.icon}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className={DS.text.label + " block mb-1"}>제목 *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="제목을 입력하세요"
              className={DS.input.base + " w-full"}
            />
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={DS.text.label + " block mb-1"}>카테고리</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className={DS.input.base + " w-full"}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={DS.text.label + " block mb-1"}>상태</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className={DS.input.base + " w-full"}
              >
                <option value="draft">초안</option>
                <option value="published">게시중</option>
                <option value="scheduled">예약</option>
                <option value="hidden">비공개</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={DS.text.label + " block mb-1"}>태그 (쉼표로 구분)</label>
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="예: 공지, 이벤트, 업데이트"
              className={DS.input.base + " w-full"}
            />
          </div>

          {/* Pin toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForm(f => ({ ...f, is_pinned: !f.is_pinned }))}
              className={`w-9 h-5 rounded-full transition-colors flex items-center ${form.is_pinned ? "bg-[var(--color-brand-mid)]" : "bg-[var(--color-border-subtle)]"}`}
            >
              <span className={`w-3.5 h-3.5 bg-white rounded-full shadow mx-0.5 transition-transform ${form.is_pinned ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <Pin size={13} className={form.is_pinned ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"} />
            <span className={DS.text.caption}>상단 고정</span>
          </label>

          {/* Content */}
          <div>
            <label className={DS.text.label + " block mb-1"}>내용</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="내용을 입력하세요..."
              rows={8}
              className={DS.input.base + " w-full resize-none"}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border-subtle)]">
          <button onClick={onClose} className={`${DS.button.ghost} ${DS.button.sm}`}>취소</button>
          <button onClick={handleSave} disabled={saving} className={`${DS.button.primary} ${DS.button.sm}`}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isNew ? "등록" : "저장"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminContentPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)

  /* ── Fetch posts for current tab ──────────────────────────────── */
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const categories = categoryListForTab(tab)
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .in("category", categories)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setPosts((data as CommunityPost[]) ?? [])
    } catch (err: any) {
      console.error(err)
      toast.error(`데이터 로드 실패: ${err.message ?? "알 수 없는 오류"}`)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  /* ── Toggle publish status ────────────────────────────────────── */
  async function toggleStatus(post: CommunityPost) {
    const newStatus = post.status === "published" ? "hidden" : "published"
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p))
    const supabase = createClient()
    const { error } = await supabase
      .from("community_posts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", post.id)

    if (error) {
      // Revert
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: post.status } : p))
      toast.error(`상태 변경 실패: ${error.message}`)
      return
    }
    toast.success(`"${post.title}" ${STATUS_LABEL[newStatus]} 처리 완료`)
  }

  /* ── Delete post ──────────────────────────────────────────────── */
  async function deletePost(post: CommunityPost) {
    if (!confirm(`"${post.title}" 을(를) 삭제하시겠습니까?`)) return

    // Optimistic update
    setPosts(prev => prev.filter(p => p.id !== post.id))
    const supabase = createClient()
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", post.id)

    if (error) {
      // Revert
      fetchPosts()
      toast.error(`삭제 실패: ${error.message}`)
      return
    }
    toast.success(`"${post.title}" 삭제 완료`)
  }

  /* ── Open editor ─────────────────────────────────────────────── */
  function openCreate() {
    setEditor({
      title: "", content: "", category: categoryListForTab(tab)[0],
      status: "draft", tags: "", is_pinned: false,
    })
  }

  function openEdit(post: CommunityPost) {
    setEditor({
      id: post.id,
      title: post.title,
      content: post.content ?? "",
      category: post.category,
      status: post.status,
      tags: (post.tags ?? []).join(", "),
      is_pinned: post.is_pinned ?? false,
    })
  }

  function handleEditorSaved(post: CommunityPost) {
    setPosts(prev => {
      const idx = prev.findIndex(p => p.id === post.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = post; return next }
      return [post, ...prev]
    })
  }

  /* ── Toggle pin ───────────────────────────────────────────────── */
  async function togglePin(post: CommunityPost) {
    const newPinned = !post.is_pinned
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: newPinned } : p))
    const supabase = createClient()
    const { error } = await supabase
      .from("community_posts")
      .update({ is_pinned: newPinned, updated_at: new Date().toISOString() })
      .eq("id", post.id)

    if (error) {
      // Revert
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: post.is_pinned } : p))
      toast.error(`고정 상태 변경 실패: ${error.message}`)
      return
    }
    toast.success(newPinned ? "상단 고정 완료" : "고정 해제 완료")
  }

  /* ── Render table rows per tab ────────────────────────────────── */
  function renderHeaders(): string[] {
    switch (tab) {
      case "공지사항": return ["제목", "카테고리", "날짜", "상태", "조회수", "액션"]
      case "배너 관리": return ["제목", "태그", "상태", "날짜", "액션"]
      case "뉴스 관리": return ["제목", "카테고리", "날짜", "공개여부", "조회수", "액션"]
      case "가이드": return ["제목", "카테고리", "작성일", "공개여부", "조회수", "액션"]
      case "강좌": return ["제목", "카테고리", "조회수", "좋아요", "공개여부", "액션"]
    }
  }

  function renderRow(p: CommunityPost) {
    const isPublished = p.status === "published"
    const statusBadge = (
      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${NOTICE_STATUS_STYLE[p.status] ?? NOTICE_STATUS_STYLE["draft"]}`}>
        {STATUS_LABEL[p.status] ?? p.status}
      </span>
    )

    switch (tab) {
      case "공지사항":
        return (
          <tr key={p.id} className={DS.table.row}>
            <td className={`${DS.table.cell} font-medium max-w-[260px] truncate`}>
              {p.is_pinned && <span className="text-[0.6875rem] text-amber-400 mr-1">[고정]</span>}
              {p.title}
            </td>
            <td className={DS.table.cellMuted}>
              <span className={DS.badge.inline("bg-blue-500/10", "text-blue-400", "border-blue-500/20")}>{p.category}</span>
            </td>
            <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{p.created_at ? formatDate(p.created_at) : "-"}</td>
            <td className={DS.table.cell}>{statusBadge}</td>
            <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{p.views.toLocaleString()}</td>
            <td className={DS.table.cell}>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className={DS.button.icon} title="수정"><Edit2 size={13} /></button>
                <button onClick={() => togglePin(p)} className={DS.button.icon} title={p.is_pinned ? "고정 해제" : "상단 고정"}>
                  <Pin size={13} />
                </button>
                <button onClick={() => toggleStatus(p)} className={DS.button.icon}>
                  {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => deletePost(p)} className={DS.button.icon}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        )

      case "배너 관리":
        return (
          <tr key={p.id} className={DS.table.row}>
            <td className={`${DS.table.cell} font-medium max-w-[260px] truncate`}>{p.title}</td>
            <td className={DS.table.cellMuted}>
              {p.tags?.map(t => (
                <span key={t} className={`${DS.badge.inline("bg-[var(--color-surface-overlay)]", "text-[var(--color-text-secondary)]", "border-[var(--color-border-subtle)]")} mr-1`}>{t}</span>
              ))}
            </td>
            <td className={DS.table.cell}>{statusBadge}</td>
            <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{p.created_at ? formatDate(p.created_at) : "-"}</td>
            <td className={DS.table.cell}>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className={DS.button.icon} title="수정"><Edit2 size={13} /></button>
                <button onClick={() => toggleStatus(p)} className={DS.button.icon}>
                  {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => deletePost(p)} className={DS.button.icon}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        )

      case "뉴스 관리":
        return (
          <tr key={p.id} className={DS.table.row}>
            <td className={`${DS.table.cell} font-medium max-w-[260px] truncate`}>{p.title}</td>
            <td className={DS.table.cellMuted}>
              <span className={DS.badge.inline("bg-purple-500/10", "text-purple-400", "border-purple-500/20")}>{p.category}</span>
            </td>
            <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{p.created_at ? formatDate(p.created_at) : "-"}</td>
            <td className={DS.table.cell}>{statusBadge}</td>
            <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{p.views.toLocaleString()}</td>
            <td className={DS.table.cell}>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className={DS.button.icon} title="수정"><Edit2 size={13} /></button>
                <button onClick={() => toggleStatus(p)} className={DS.button.icon}>
                  {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => deletePost(p)} className={DS.button.icon}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        )

      case "가이드":
        return (
          <tr key={p.id} className={DS.table.row}>
            <td className={`${DS.table.cell} font-medium`}>{p.title}</td>
            <td className={DS.table.cell}>
              <span className={DS.badge.inline("bg-purple-500/10", "text-purple-400", "border-purple-500/20")}>{p.category}</span>
            </td>
            <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{p.created_at ? formatDate(p.created_at) : "-"}</td>
            <td className={DS.table.cell}>{statusBadge}</td>
            <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{p.views.toLocaleString()}</td>
            <td className={DS.table.cell}>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className={DS.button.icon} title="수정"><Edit2 size={13} /></button>
                <button onClick={() => toggleStatus(p)} className={DS.button.icon}>
                  {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => deletePost(p)} className={DS.button.icon}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        )

      case "강좌":
        return (
          <tr key={p.id} className={DS.table.row}>
            <td className={`${DS.table.cell} font-medium`}>{p.title}</td>
            <td className={DS.table.cell}>
              <span className={DS.badge.inline("bg-cyan-500/10", "text-cyan-400", "border-cyan-500/20")}>{p.category}</span>
            </td>
            <td className={`${DS.table.cell} font-mono`}>{p.views.toLocaleString()}</td>
            <td className={`${DS.table.cell} font-mono`}>{p.likes.toLocaleString()}</td>
            <td className={DS.table.cell}>{statusBadge}</td>
            <td className={DS.table.cell}>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className={DS.button.icon} title="수정"><Edit2 size={13} /></button>
                <button onClick={() => toggleStatus(p)} className={DS.button.icon}>
                  {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => deletePost(p)} className={DS.button.icon}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        )
    }
  }

  return (
    <>
    {editor && (
      <ContentEditorModal
        state={editor}
        tab={tab}
        onClose={() => setEditor(null)}
        onSaved={handleEditorSaved}
      />
    )}
    <div className={DS.page.wrapper}>
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="flex items-center gap-3 mb-1">
          <FileText size={18} className="text-[var(--color-brand-mid)]" />
          <h1 className={DS.text.pageSubtitle}>콘텐츠 관리</h1>
        </div>
        <p className={DS.text.body}>공지사항, 배너, 뉴스, 가이드, 강좌 관리</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* Panel */}
        <div className={DS.table.wrapper}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <span className={DS.text.bodyBold}>
              {tab} 목록
              <span className={`ml-2 ${DS.text.captionLight}`}>({posts.length}건)</span>
            </span>
            <div className="flex gap-2">
              <button onClick={fetchPosts} className={`${DS.button.ghost} ${DS.button.sm}`} disabled={loading}>
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                새로고침
              </button>
              <button onClick={openCreate} className={`${DS.button.primary} ${DS.button.sm}`}>
                <Plus size={13} />새 {tab}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={DS.empty.wrapper}>
              <Loader2 className={`${DS.empty.icon} animate-spin`} />
              <p className={DS.empty.title}>데이터를 불러오는 중...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className={DS.empty.wrapper}>
              <FileText className={DS.empty.icon} />
              <p className={DS.empty.title}>등록된 {tab}이(가) 없습니다</p>
              <p className={DS.empty.description}>새 콘텐츠를 등록해 주세요.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {renderHeaders().map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map(p => renderRow(p))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
