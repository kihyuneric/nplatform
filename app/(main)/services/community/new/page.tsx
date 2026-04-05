"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bold, Italic, Link2, Image, Code, Eye, EyeOff, X, Plus, Send, Save } from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

const CATEGORIES = [
  { value: "review", label: "투자 후기" },
  { value: "qna", label: "Q&A" },
  { value: "analysis", label: "시장 분석" },
  { value: "free", label: "자유 토론" },
  { value: "column", label: "전문가 칼럼" },
]

export default function NewPostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState("review")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "")
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() }
  }

  const handleThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return alert("5MB 이하 이미지만 업로드 가능합니다.")
    setThumbnail(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.")
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/v1/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, tags }),
      })
      if (!res.ok) throw new Error("게시글 작성에 실패했습니다.")
      const { post } = await res.json()
      router.push(`/community/${post?.id || ""}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? ""

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={DS.header.wrapper}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className={DS.button.icon}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className={DS.header.eyebrow}>커뮤니티</p>
              <h1 className={DS.text.pageSubtitle}>새 글 작성</h1>
            </div>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className={`${DS.button.ghost} ml-auto`}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? "편집" : "미리보기"}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className={`${DS.page.container} py-8 ${DS.page.sectionGap}`} style={{ maxWidth: '48rem' }}>
        {showPreview ? (
          /* Preview */
          <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[var(--color-brand-dark)] text-white text-[0.6875rem] font-medium">{categoryLabel}</span>
              {tags.map((tag) => (
                <span key={tag} className={`px-2 py-0.5 rounded-full border border-[var(--color-border-default)] ${DS.text.captionLight}`}>#{tag}</span>
              ))}
            </div>
            {thumbnail && <img src={thumbnail} alt="썸네일" className="w-full h-48 object-cover rounded-lg mb-6" />}
            <h2 className={`${DS.text.sectionTitle} mb-4`}>{title || "제목 없음"}</h2>
            <div className={`${DS.text.body} whitespace-pre-wrap`}>{content || "내용 없음"}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Category */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.cardSubtitle} mb-3`}>카테고리</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`${DS.filter.chip} ${
                      category === cat.value
                        ? DS.filter.chipActive
                        : DS.filter.chipInactive
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <label htmlFor="post-title" className={`${DS.text.cardSubtitle} mb-3 block`}>제목</label>
              <input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                maxLength={200}
                className={DS.input.base}
              />
            </div>

            {/* Rich Text Editor */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className={`${DS.divider.default} px-4 py-2 flex items-center gap-1`}>
                {[
                  { icon: Bold, label: "굵게" },
                  { icon: Italic, label: "기울임" },
                  { icon: Link2, label: "링크" },
                  { icon: Image, label: "이미지" },
                  { icon: Code, label: "코드" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    className={DS.button.icon}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <div className="p-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="내용을 입력하세요..."
                  className={`w-full resize-none outline-none text-[0.9375rem] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] leading-relaxed`}
                  style={{ minHeight: 400 }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.cardSubtitle} mb-3`}>태그 <span className="text-[var(--color-text-muted)] font-normal">(최대 5개)</span></p>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[0.8125rem] font-medium">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-blue-900 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="태그 입력 후 Enter"
                  className={`${DS.input.base} flex-1`}
                  disabled={tags.length >= 5}
                />
                <button
                  onClick={addTag}
                  disabled={tags.length >= 5}
                  className={`${DS.button.secondary} disabled:opacity-40`}
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
            </div>

            {/* Thumbnail */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.cardSubtitle} mb-3`}>썸네일 이미지 <span className="text-[var(--color-text-muted)] font-normal">(선택)</span></p>
              {thumbnail ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden group">
                  <img src={thumbnail} alt="썸네일 미리보기" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setThumbnail(null)}
                    className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => thumbInputRef.current?.click()}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-[var(--color-border-default)] flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)] hover:border-[var(--color-brand-mid)] hover:text-[var(--color-brand-mid)] transition-colors"
                >
                  <Image className="w-6 h-6" />
                  <span className={DS.text.body}>이미지 업로드</span>
                </button>
              )}
              <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumb} className="hidden" />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={() => router.back()}
            className={DS.button.secondary}
          >
            <Save className="w-4 h-4" />
            임시저장
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className={`${DS.button.primary} disabled:opacity-50`}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "게시 중..." : "게시하기"}
          </button>
        </div>
      </div>
    </div>
  )
}
