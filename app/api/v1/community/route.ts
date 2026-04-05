import { Errors, fromUnknown } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { query, insert } from '@/lib/data-layer'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/sanitize'
import { z } from 'zod'

const communityPostSchema = z.object({
  title: z.string().min(2, '제목은 2자 이상이어야 합니다'),
  content: z.string().min(10, '내용은 10자 이상이어야 합니다'),
  category: z.string().min(1, '카테고리는 필수입니다'),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  is_anonymous: z.boolean().default(false),
})

export const dynamic = 'force-dynamic'

// GET /api/v1/community - List posts with pagination, filtering, search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const category = searchParams.get('category')
  const sort = searchParams.get('sort') || 'latest'
  const q = searchParams.get('q')
  const offset = (page - 1) * limit

  try {
    const filters: Record<string, string> = { status: 'ACTIVE' }

    // Category filter - map Korean categories to DB values
    const categoryMap: Record<string, string> = {
      '자유': 'GENERAL',
      '질문': 'QNA',
      '정보공유': 'TIP',
      '거래후기': 'CASE_STUDY',
      '법률상담': 'LEGAL',
      // Legacy mappings
      '투자전략': 'TIP',
      '시장분석': 'MARKET_ANALYSIS',
      '질문답변': 'QNA',
      '후기': 'CASE_STUDY',
      '일반': 'GENERAL',
      '뉴스': 'NEWS',
      '법률': 'LEGAL',
    }
    if (category && category !== '전체') {
      filters.category = categoryMap[category] || category
    }

    // Sort - support popular sort by likes + comments
    let orderBy = 'created_at'
    const order: 'asc' | 'desc' = 'desc'
    switch (sort) {
      case 'popular': orderBy = 'likes'; break
      case 'comments': orderBy = 'comment_count'; break
      default: orderBy = 'created_at'
    }

    const result = await query('community_posts', {
      filters,
      orderBy,
      order,
      limit,
      offset,
    })

    // Client-side text search for sample mode
    let posts = result.data
    if (q) {
      const search = q.toLowerCase()
      posts = posts.filter((p: Record<string, unknown>) =>
        ((p.title as string) || '').toLowerCase().includes(search) ||
        ((p.content as string) || '').toLowerCase().includes(search)
      )
    }

    // For popular sort, also sort by combined likes + comment_count
    if (sort === 'popular') {
      posts = [...posts].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const scoreA = (Number(a.likes) || 0) + (Number(a.comment_count) || 0)
        const scoreB = (Number(b.likes) || 0) + (Number(b.comment_count) || 0)
        return scoreB - scoreA
      })
    }

    return NextResponse.json({
      posts,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
      _source: result._source,
    })
  } catch {
    return NextResponse.json({ posts: [], total: 0, page, totalPages: 0, _source: 'sample' })
  }
}

// POST /api/v1/community - Create a new post
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch (err) {

    logger.warn("[route] silent catch", { error: err })

  }

  try {
    const body = await req.json()

    // Sanitize user-provided text fields
    if (body.title) body.title = sanitizeInput(body.title)
    if (body.content) body.content = sanitizeInput(body.content)

    const validated = communityPostSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: validated.error.flatten() } },
        { status: 400 }
      )
    }
    const { title, content, category, tags, images, is_anonymous } = validated.data

    const result = await insert('community_posts', {
      author_id: userId,
      title,
      content,
      category,
      tags,
      images,
      is_anonymous,
      status: 'ACTIVE',
      likes: 0,
      comment_count: 0,
      view_count: 0,
    })

    return NextResponse.json({ data: result.data, post: result.data, _source: result._source }, { status: 201 })
  } catch {
    return Errors.badRequest('잘못된 요청입니다.')
  }
}
