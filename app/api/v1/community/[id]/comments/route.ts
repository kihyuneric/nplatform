import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/v1/community/[id]/comments - Add comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  const { content, parent_id } = await req.json()

  if (!content || content.trim().length < 2) {
    return Errors.badRequest('댓글 내용은 2자 이상이어야 합니다.')
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: id,
      author_id: userId,
      content: content.trim(),
      parent_id: parent_id || null,
    })
    .select(`
      *,
      author:users!community_comments_author_id_fkey(id, name, company_name, avatar_url)
    `)
    .single()

  if (error) {
    return fromUnknown(error)
  }

  return NextResponse.json({ comment: data }, { status: 201 })
}
