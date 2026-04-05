'use client'

import { useState, useMemo } from 'react'
import { Star, Award, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ReviewItem {
  id: string
  client_name: string
  rating: number
  content: string
  tags?: string[]
  date: string
}

interface ReviewListProps {
  reviews: ReviewItem[]
  averageRating?: number
}

type SortKey = 'latest' | 'highest'

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            cls,
            s <= Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          )}
        />
      ))}
    </div>
  )
}

export function ReviewList({ reviews, averageRating }: ReviewListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('latest')

  const avgRating = useMemo(() => {
    if (averageRating !== undefined) return averageRating
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews, averageRating])

  const sorted = useMemo(() => {
    const list = [...reviews]
    if (sortKey === 'latest') {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else {
      list.sort((a, b) => b.rating - a.rating)
    }
    return list
  }, [reviews, sortKey])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-[#2E75B6]" />
            리뷰 ({reviews.length}건)
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-sm rounded-md border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="latest">최신순</option>
              <option value="highest">높은평점순</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Average rating display */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-4 p-4 mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#1B3A5C] dark:text-blue-400">
                {avgRating.toFixed(1)}
              </p>
              <StarDisplay rating={avgRating} size="md" />
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => Math.round(r.rating) === star).length
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-right text-gray-500 dark:text-gray-400">{star}점</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-gray-400">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Review items */}
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            아직 리뷰가 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {sorted.map((rev) => (
              <div
                key={rev.id}
                className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {rev.client_name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {rev.client_name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{rev.date}</span>
                </div>
                <div className="mt-1 ml-10">
                  <StarDisplay rating={rev.rating} />
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{rev.content}</p>
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rev.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
