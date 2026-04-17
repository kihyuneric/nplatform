'use client'

import { useState } from 'react'
import { Star, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const REVIEW_TAGS = ['친절함', '전문성', '신속대응', '합리적 가격', '상세설명'] as const

interface ReviewFormProps {
  professionalId: string
  onSubmitted?: () => void
}

export function ReviewForm({ professionalId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('별점을 선택해주세요.')
      return
    }
    if (content.trim().length < 10) {
      toast.error('리뷰를 10자 이상 작성해주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/professional/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professionalId,
          rating,
          content: content.trim(),
          tags: selectedTags,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '리뷰 등록에 실패했습니다.')
      }

      toast.success('리뷰가 등록되었습니다.')
      setRating(0)
      setContent('')
      setSelectedTags([])
      onSubmitted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '리뷰 등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-[#2E75B6]" />
          리뷰 작성
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star rating */}
        <div className="space-y-2">
          <Label>별점 <span className="text-red-500">*</span></Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-7 w-7 transition-colors',
                    s <= displayRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-[var(--color-text-muted)]'
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm font-medium text-[var(--color-text-secondary)]">
                {rating}.0
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>태그 (선택)</Label>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-colors',
                  selectedTags.includes(tag)
                    ? 'bg-[#2E75B6] hover:bg-[#1B3A5C] text-white'
                    : 'hover:bg-[var(--color-surface-overlay)]'
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Review text */}
        <div className="space-y-2">
          <Label>
            리뷰 내용 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 ml-1">(최소 10자)</span>
          </Label>
          <Textarea
            placeholder="전문가 상담에 대한 솔직한 리뷰를 남겨주세요..."
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-xs text-gray-400 text-right">{content.length}자</p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0 || content.trim().length < 10}
          className="w-full gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              등록 중...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              리뷰 등록
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
