import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"
import { query, insert, update } from "@/lib/data-layer"
import { sanitizeInput } from "@/lib/sanitize"

// ─── Types ───────────────────────────────────────────────

type MessageType = "TEXT" | "SYSTEM" | "OFFER" | "FILE"

// ─── GET /api/v1/exchange/deals/[id]/messages ─────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const offset = (page - 1) * limit

    const result = await query('deal_messages', {
      filters: { deal_id: dealId },
      orderBy: 'created_at',
      order: 'asc',
      limit,
      offset,
    })

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page,
      _source: result._source,
    })
  } catch (err) {
    logger.error("[deals/[id]/messages] GET error:", { error: err })
    return NextResponse.json({ data: [], total: 0, page: 1, _source: 'sample' })
  }
}

// ─── POST /api/v1/exchange/deals/[id]/messages ────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params

    // Try to get authenticated user, but allow sample-mode submissions
    let userId = 'anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // No auth available - sample mode, continue
    }

    const body = await request.json()

    // Validate message_type
    const validTypes: MessageType[] = ["TEXT", "SYSTEM", "OFFER", "FILE"]
    const message_type: MessageType = validTypes.includes(body.message_type)
      ? body.message_type
      : "TEXT"

    // Basic validation
    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: { message: '메시지를 입력해주세요' } },
        { status: 400 }
      )
    }

    if (body.content.length > 5000) {
      return NextResponse.json(
        { error: { message: '메시지는 5000자 이내로 입력해주세요' } },
        { status: 400 }
      )
    }

    // Sanitize content
    const content = sanitizeInput(body.content.trim())

    // Build metadata based on message type
    let metadata: Record<string, unknown> | null = null

    if (message_type === "OFFER" && body.metadata?.offer) {
      metadata = {
        offer: {
          amount: Number(body.metadata.offer.amount) || 0,
          conditions: sanitizeInput(String(body.metadata.offer.conditions || "")),
          payment_method: sanitizeInput(String(body.metadata.offer.payment_method || "")),
          valid_until: body.metadata.offer.valid_until || "",
          status: "pending",
        },
      }
    }

    if (message_type === "FILE" && body.metadata?.file) {
      metadata = {
        file: {
          name: sanitizeInput(String(body.metadata.file.name || "")),
          size: Number(body.metadata.file.size) || 0,
          type: String(body.metadata.file.type || ""),
          url: String(body.metadata.file.url || ""),
        },
      }
    }

    const result = await insert('deal_messages', {
      deal_id: dealId,
      sender_id: userId,
      message_type,
      content,
      metadata: metadata || undefined,
      document_url: body.document_url || null,
      read_at: null,
    })

    return NextResponse.json({ data: result.data, _source: result._source }, { status: 201 })
  } catch (err) {
    logger.error("[deals/[id]/messages] POST error:", { error: err })
    return NextResponse.json(
      { error: { message: "메시지 전송 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/v1/exchange/deals/[id]/messages ──────────
// Mark all unread messages from other parties as read

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()

    // Determine the reader
    let readerId = body.reader_id || 'anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) readerId = user.id
    } catch {
      // No auth
    }

    // Get all messages for this deal
    const result = await query('deal_messages', {
      filters: { deal_id: dealId },
      orderBy: 'created_at',
      order: 'asc',
      limit: 500,
      offset: 0,
    })

    const now = new Date().toISOString()
    let updatedCount = 0

    // Update unread messages from other parties
    for (const msg of (result.data || [])) {
      if (msg.sender_id !== readerId && msg.sender_id !== 'system' && !msg.read_at) {
        try {
          await update('deal_messages', msg.id as string, { read_at: now })
          updatedCount++
        } catch {
          // Continue with other messages
        }
      }
    }

    return NextResponse.json({
      updated: updatedCount,
      read_at: now,
    })
  } catch (err) {
    logger.error("[deals/[id]/messages] PATCH error:", { error: err })
    return NextResponse.json(
      { error: { message: "읽음 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
