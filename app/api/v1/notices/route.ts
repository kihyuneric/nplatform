import { NextRequest, NextResponse } from "next/server"
import type { QueryFilters } from '@/lib/db-types'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert, update, remove } from "@/lib/data-layer"
import { publicCacheHeaders } from "@/lib/cache-headers"
import { sanitizeInput } from "@/lib/sanitize"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const main = searchParams.get("main")
  const popup = searchParams.get("popup")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "10")
  const q = searchParams.get("q")
  const offset = (page - 1) * limit

  try {
    const filters: QueryFilters = { status: 'ACTIVE' }
    if (category && category !== "전체") filters.category = category
    if (main === "true") filters.is_main = true
    if (popup === "true") filters.is_popup = true

    const result = await query('notices', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
      limit,
      offset,
    })

    // Client-side text search filter for sample mode (ilike not fully supported)
    let data = result.data
    if (q) {
      const search = q.toLowerCase()
      data = data.filter((n) =>
        String(n.title || '').toLowerCase().includes(search) ||
        String(n.content || '').toLowerCase().includes(search)
      )
    }

    // Sort pinned first
    data.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return 0
    })

    return NextResponse.json({ data, total: result.total, page, limit, _source: result._source }, {
      headers: publicCacheHeaders(300),
    })
  } catch {
    return NextResponse.json({ data: [], total: 0, page, limit, _source: 'sample' })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Sanitize user-provided text fields
  if (body.title) body.title = sanitizeInput(body.title)
  if (body.content) body.content = sanitizeInput(body.content)

  try {
    const result = await insert('notices', {
      ...body,
      status: body.status ?? "ACTIVE",
      view_count: 0,
      published_at: body.published_at ?? new Date().toISOString(),
    })

    return NextResponse.json({ data: result.data, _source: result._source }, { status: 201 })
  } catch {
    return Errors.internal('공지 등록 중 오류가 발생했습니다.')
  }
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const body = await req.json()

  if (!id) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "id is required" } }, { status: 400 })
  }

  try {
    if (body.action === "view") {
      // Increment view_count — for sample mode we do a manual increment
      const result = await update('notices', id, {})
      const notice = result.data as Record<string, unknown>
      if (result._source === 'sample' && notice) {
        notice.view_count = ((notice.view_count as number) || 0) + 1
      }
      return NextResponse.json({ data: notice, _source: result._source })
    }

    const result = await update('notices', id, body)
    return NextResponse.json({ data: result.data, _source: result._source })
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Notice not found" } }, { status: 404 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "id is required" } }, { status: 400 })
  }

  try {
    // Soft delete — mark as DELETED
    const result = await update('notices', id, { status: 'DELETED' })
    return NextResponse.json({ success: true, _source: result._source })
  } catch {
    // If update fails, try hard remove
    const result = await remove('notices', id)
    return NextResponse.json({ success: result.success, _source: result._source })
  }
}
