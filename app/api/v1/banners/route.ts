import { NextRequest, NextResponse } from "next/server"
import { query, insert, update, remove } from "@/lib/data-layer"
import { publicCacheHeaders } from "@/lib/cache-headers"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const position = searchParams.get("position")
  const status = searchParams.get("status")

  const filters: Record<string, string> = {}
  if (position) filters.position = position
  if (status) filters.status = status
  else filters.status = 'ACTIVE'

  const { data, total, _source } = await query("banners", {
    filters,
    orderBy: "priority",
    order: "asc",
  })

  return NextResponse.json({ data, total, _source }, { headers: publicCacheHeaders(300) }) // 5분 캐시
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, _source } = await insert("banners", {
    ...body,
    impressions: 0,
    clicks: 0,
    ctr: 0,
  })
  return NextResponse.json({ data, _source }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: { code: "MISSING_ID", message: "id is required" } }, { status: 400 })
  }

  const body = await req.json()

  if (body.action === "click" || body.action === "impression") {
    // For tracking actions, just update the record
    const updatePayload: Record<string, number> = body.action === "click" ? { clicks: 1 } : { impressions: 1 }
    const { data, _source } = await update("banners", id, updatePayload)
    return NextResponse.json({ data, _source })
  }

  const { data, _source } = await update("banners", id, body)
  return NextResponse.json({ data, _source })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: { code: "MISSING_ID", message: "id is required" } }, { status: 400 })
  }
  const { success, _source } = await remove("banners", id)
  return NextResponse.json({ success, _source })
}
