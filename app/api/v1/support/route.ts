import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeInput } from '@/lib/sanitize'

const supportTicketSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  category: z.enum([
    '서비스 이용', '인증/KYC', '거래/계약', '계정 관리', '기술 문제', '요금/결제', '기타',
  ], { errorMap: () => ({ message: '유효하지 않은 카테고리입니다.' }) }),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  description: z.string().min(1, '내용은 필수입니다'),
})

// ─── Types ───────────────────────────────────────────────

type TicketStatus = 'RECEIVED' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED'
type TicketPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'

interface ThreadMessage {
  id: string
  author: string
  role: 'USER' | 'SUPPORT'
  content: string
  timestamp: string
}

interface SupportTicket {
  id: string
  title: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  author: string
  email: string
  created_at: string
  updated_at: string
  thread: ThreadMessage[]
}

interface CreateTicketPayload {
  title: string
  category: string
  priority?: TicketPriority
  description: string
}

interface ReplyPayload {
  ticket_id: string
  content: string
}

// ─── Mock data ───────────────────────────────────────────

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-0041', title: '매물 열람 횟수 초과 안내', category: '서비스 이용',
    priority: 'NORMAL', status: 'ANSWERED',
    author: '김민준', email: 'minjun@gmail.com',
    created_at: '2026-03-19T14:22:00Z', updated_at: '2026-03-19T16:05:00Z',
    thread: [
      { id: 'm1', author: '김민준', role: 'USER', content: 'Basic 플랜 사용 중인데 매물 열람 횟수가 초과되었다는 메시지가 떴습니다.', timestamp: '2026-03-19T14:22:00Z' },
      { id: 'm2', author: 'NPLatform 고객지원', role: 'SUPPORT', content: 'Basic 플랜은 월 10건의 매물 열람이 가능합니다. Pro 플랜 업그레이드를 권장드립니다.', timestamp: '2026-03-19T16:05:00Z' },
    ],
  },
  {
    id: 'TKT-0040', title: 'KYC 서류 재제출 방법 문의', category: '인증/KYC',
    priority: 'HIGH', status: 'IN_PROGRESS',
    author: '이서현', email: 'seohyun@amc.co.kr',
    created_at: '2026-03-19T10:30:00Z', updated_at: '2026-03-19T11:00:00Z',
    thread: [
      { id: 'm1', author: '이서현', role: 'USER', content: 'KYC 서류가 반려되었는데 재제출은 어떻게 하나요?', timestamp: '2026-03-19T10:30:00Z' },
      { id: 'm2', author: 'NPLatform 고객지원', role: 'SUPPORT', content: '반려 사유를 확인 후 안내드리겠습니다.', timestamp: '2026-03-19T11:00:00Z' },
    ],
  },
  {
    id: 'TKT-0039', title: '경매 입찰 시스템 오류 신고', category: '기술 문제',
    priority: 'URGENT', status: 'IN_PROGRESS',
    author: '박태양', email: 'taeyang@invest.com',
    created_at: '2026-03-18T09:15:00Z', updated_at: '2026-03-18T09:45:00Z',
    thread: [
      { id: 'm1', author: '박태양', role: 'USER', content: '입찰 버튼을 클릭하면 서버 오류가 발생합니다.', timestamp: '2026-03-18T09:15:00Z' },
      { id: 'm2', author: 'NPLatform 기술지원', role: 'SUPPORT', content: '긴급 접수 확인했습니다. 기술팀이 확인하고 있습니다.', timestamp: '2026-03-18T09:45:00Z' },
    ],
  },
]

// ─── GET /api/v1/support ──────────────────────────────────
// Users: own tickets; Admins: all tickets

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const category = searchParams.get('category')
  const ticketId = searchParams.get('id')
  const page = parseInt(searchParams.get('page') || '0', 10)
  const pageSize = parseInt(searchParams.get('page_size') || '20', 10)

  // ── Supabase-first: try DB tickets ──
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', user.id)
        .single()

      const isAdmin = profile && ['SUPER_ADMIN', 'ADMIN'].includes(profile.role)

      // Try Supabase tickets table
      try {
        let query = supabase.from('support_tickets').select('*', { count: 'exact' })
        if (!isAdmin) query = query.eq('email', profile?.email || user.email)
        if (ticketId) query = query.eq('id', ticketId)
        if (status) query = query.eq('status', status)
        if (priority) query = query.eq('priority', priority)
        if (category) query = query.eq('category', category)
        query = query.order('created_at', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1)

        const { data, error, count } = await query
        if (!error && data && data.length > 0) {
          if (ticketId) return NextResponse.json({ ticket: data[0] })
          return NextResponse.json({ data, total: count || data.length, page, page_size: pageSize })
        }
      } catch {
        // support_tickets table may not exist, fall through to mock
      }

      // ── Mock fallback (authenticated) ──
      if (ticketId) {
        const ticket = MOCK_TICKETS.find(t => t.id === ticketId)
        if (!ticket) {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: '해당 티켓을 찾을 수 없습니다.' } },
            { status: 404 }
          )
        }
        if (!isAdmin && ticket.email !== profile?.email) {
          return NextResponse.json(
            { error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } },
            { status: 403 }
          )
        }
        return NextResponse.json({ ticket, _mock: true })
      }

      let list = isAdmin
        ? MOCK_TICKETS
        : MOCK_TICKETS.filter(t => t.email === profile?.email)

      if (status) list = list.filter(t => t.status === status)
      if (priority) list = list.filter(t => t.priority === priority)
      if (category) list = list.filter(t => t.category === category)

      const total = list.length
      const data = list.slice(page * pageSize, (page + 1) * pageSize)

      return NextResponse.json({ data, total, page, page_size: pageSize, _mock: true })
    }
  } catch {
    // Auth failed, fall through to unauthenticated mock
  }

  // ── Mock fallback (unauthenticated) ──
  if (ticketId) {
    const ticket = MOCK_TICKETS.find(t => t.id === ticketId)
    if (!ticket) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '해당 티켓을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }
    return NextResponse.json({ ticket, _mock: true })
  }

  let list = [...MOCK_TICKETS]
  if (status) list = list.filter(t => t.status === status)
  if (priority) list = list.filter(t => t.priority === priority)
  if (category) list = list.filter(t => t.category === category)

  const total = list.length
  const data = list.slice(page * pageSize, (page + 1) * pageSize)

  return NextResponse.json({ data, total, page, page_size: pageSize, _mock: true })
}

// ─── POST /api/v1/support ────────────────────────────────
// Create a new ticket

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    let postUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) postUserId = user.id } catch {}
    if (postUserId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', postUserId)
      .single()

    const body = await req.json()

    // Sanitize user-provided text fields before validation
    if (body.title) body.title = sanitizeInput(body.title)
    if (body.description) body.description = sanitizeInput(body.description)

    const validated = supportTicketSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: validated.error.flatten() } },
        { status: 400 }
      )
    }
    const { title, category, priority, description } = validated.data

    // Map API category values → DB CHECK constraint values
    const categoryMap: Record<string, string> = {
      '서비스 이용': 'SERVICE',
      '인증/KYC': 'SERVICE',
      '거래/계약': 'TRANSACTION',
      '계정 관리': 'SERVICE',
      '기술 문제': 'TECHNICAL',
      '요금/결제': 'BILLING',
      '기타': 'OTHER',
    }
    // Map API priority values → DB CHECK constraint values
    const priorityMap: Record<string, string> = {
      URGENT: 'URGENT',
      HIGH: 'HIGH',
      NORMAL: 'MEDIUM',
      LOW: 'LOW',
    }

    const dbCategory = categoryMap[category] || 'OTHER'
    const dbPriority = priorityMap[priority] || 'MEDIUM'

    // Try to persist to Supabase
    try {
      const { data: dbTicket, error: dbError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: postUserId,
          title,
          content: description,
          category: dbCategory,
          priority: dbPriority,
          status: 'OPEN',
        })
        .select()
        .single()

      if (!dbError && dbTicket) {
        logger.info('[support POST] ticket saved to DB', { id: dbTicket.id })
        return NextResponse.json({ success: true, ticket: dbTicket }, { status: 201 })
      }
      logger.error('[support POST] DB insert failed, falling back to mock', { error: dbError })
    } catch (dbErr) {
      logger.error('[support POST] DB insert exception, falling back to mock', { error: dbErr })
    }

    // Fallback: return in-memory ticket when DB is unavailable
    const ticket: SupportTicket = {
      id: `TKT-${Date.now()}`,
      title,
      category,
      priority,
      status: 'RECEIVED',
      author: profile?.name || profile?.email || '사용자',
      email: profile?.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      thread: [
        {
          id: 'm1',
          author: profile?.name || profile?.email || '사용자',
          role: 'USER',
          content: description,
          timestamp: new Date().toISOString(),
        },
      ],
    }

    return NextResponse.json({ success: true, ticket, _mock: true }, { status: 201 })
  } catch (err) {
    logger.error('[support POST]', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/v1/support ───────────────────────────────
// Reply to ticket / update status (admin only for status changes)

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    let patchUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) patchUserId = user.id } catch {}
    if (patchUserId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, name, email')
      .eq('id', patchUserId)
      .single()

    const body = await req.json()
    const { ticket_id, action, content, status } = body

    if (!ticket_id || !action) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ticket_id와 action은 필수입니다.' } },
        { status: 400 }
      )
    }

    const isAdmin = profile && ['SUPER_ADMIN', 'ADMIN'].includes(profile.role)

    // ── Try Supabase DB first ──
    try {
      const { data: dbTicket, error: ticketFetchError } = await supabase
        .from('support_tickets')
        .select('id, user_id, status')
        .eq('id', ticket_id)
        .maybeSingle()

      if (!ticketFetchError && dbTicket) {
        // Ownership check: non-admins can only act on their own tickets
        if (!isAdmin && dbTicket.user_id !== patchUserId) {
          return NextResponse.json(
            { error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } },
            { status: 403 }
          )
        }

        if (action === 'reply') {
          if (!content) {
            return NextResponse.json(
              { error: { code: 'VALIDATION_ERROR', message: '답변 내용은 필수입니다.' } },
              { status: 400 }
            )
          }
          // Insert comment into support_ticket_comments
          const { data: comment, error: commentError } = await supabase
            .from('support_ticket_comments')
            .insert({
              ticket_id,
              author_id: patchUserId,
              content,
              is_internal: false,
            })
            .select()
            .single()

          if (commentError) {
            logger.error('[support PATCH] comment insert error', { error: commentError })
          }

          // If admin replies, update ticket status to IN_PROGRESS
          const newStatus = isAdmin ? 'IN_PROGRESS' : dbTicket.status
          if (isAdmin) {
            await supabase
              .from('support_tickets')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', ticket_id)
          }

          return NextResponse.json({
            success: true,
            ticket_id,
            new_message: comment ?? { ticket_id, content, author_id: patchUserId },
            new_status: newStatus,
          })
        }

        if (action === 'update_status') {
          if (!isAdmin) {
            return NextResponse.json(
              { error: { code: 'FORBIDDEN', message: '관리자만 상태를 변경할 수 있습니다.' } },
              { status: 403 }
            )
          }
          if (!status) {
            return NextResponse.json(
              { error: { code: 'VALIDATION_ERROR', message: 'status는 필수입니다.' } },
              { status: 400 }
            )
          }
          const validDbStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'ESCALATED']
          if (!validDbStatuses.includes(status)) {
            return NextResponse.json(
              { error: { code: 'INVALID_STATUS', message: '유효하지 않은 상태입니다.' } },
              { status: 400 }
            )
          }
          const now = new Date().toISOString()
          const updateData: Record<string, string | null> = { status, updated_at: now }
          if (status === 'RESOLVED') updateData.resolved_at = now

          const { error: updateError } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticket_id)

          if (updateError) {
            return NextResponse.json(
              { error: { code: 'UPDATE_ERROR', message: updateError.message } },
              { status: 500 }
            )
          }

          return NextResponse.json({ success: true, ticket_id, new_status: status, updated_at: now })
        }

        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: '유효하지 않은 action입니다. (reply, update_status)' } },
          { status: 400 }
        )
      }
    } catch (dbErr) {
      logger.error('[support PATCH] DB error, falling back to mock', { error: dbErr })
    }

    // ── Mock fallback (DB unavailable or ticket not in DB) ──
    const ticket = MOCK_TICKETS.find(t => t.id === ticket_id)
    if (!ticket) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '해당 티켓을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }

    if (action === 'reply') {
      if (!content) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: '답변 내용은 필수입니다.' } },
          { status: 400 }
        )
      }
      const reply: ThreadMessage = {
        id: `m${ticket.thread.length + 1}`,
        author: isAdmin ? 'NPLatform 고객지원' : profile?.name || profile?.email || '사용자',
        role: isAdmin ? 'SUPPORT' : 'USER',
        content,
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json({
        success: true,
        ticket_id,
        new_message: reply,
        new_status: isAdmin ? 'ANSWERED' : ticket.status,
        _mock: true,
      })
    }

    if (action === 'update_status') {
      if (!isAdmin) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: '관리자만 상태를 변경할 수 있습니다.' } },
          { status: 403 }
        )
      }
      if (!status) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'status는 필수입니다.' } },
          { status: 400 }
        )
      }
      const validStatuses: TicketStatus[] = ['RECEIVED', 'IN_PROGRESS', 'ANSWERED', 'CLOSED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: { code: 'INVALID_STATUS', message: `유효하지 않은 상태입니다.` } },
          { status: 400 }
        )
      }
      return NextResponse.json({
        success: true,
        ticket_id,
        new_status: status,
        updated_at: new Date().toISOString(),
        _mock: true,
      })
    }

    return NextResponse.json(
      { error: { code: 'INVALID_ACTION', message: '유효하지 않은 action입니다. (reply, update_status)' } },
      { status: 400 }
    )
  } catch (err) {
    logger.error('[support PATCH]', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
