import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/v1/community/[id] - Get post detail with comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch post with author
  const { data: post, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:users!community_posts_author_id_fkey(id, name, company_name, role, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !post) {
    return Errors.notFound('게시글을 찾을 수 없습니다.')
  }

  // Increment view count (fire-and-forget)
  supabase
    .from('community_posts')
    .update({ views: (post.views || 0) + 1 })
    .eq('id', id)
    .then(() => {})

  // Fetch comments
  const { data: comments } = await supabase
    .from('community_comments')
    .select(`
      *,
      author:users!community_comments_author_id_fkey(id, name, company_name, avatar_url)
    `)
    .eq('post_id', id)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true })

  return NextResponse.json({ post, comments: comments || [] })
}

// PUT /api/v1/community/[id] - Update post
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  let putUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) putUserId = user.id } catch {}
  if (putUserId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  const body = await req.json()
  const { title, content, category, tags } = body

  const { data, error } = await supabase
    .from('community_posts')
    .update({ title, content, category, tags, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', putUserId)
    .select()
    .single()

  if (error) {
    return fromUnknown(error)
  }

  return NextResponse.json({ post: data })
}

// DELETE /api/v1/community/[id] - Soft delete post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  let delUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) delUserId = user.id } catch {}
  if (delUserId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'DELETED' })
    .eq('id', id)
    .eq('author_id', delUserId)

  if (error) {
    return fromUnknown(error)
  }

  return NextResponse.json({ success: true })
}
