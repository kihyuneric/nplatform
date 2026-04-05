import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert, update } from "@/lib/data-layer"

// ─── Types ───
interface ContractDoc {
  id: string
  deal_id: string | null
  contract_type: string
  version: number
  content: string
  status: "DRAFT" | "SENT" | "SIGNED" | "CANCELLED"
  created_at: string
  updated_at?: string
}

// GET /api/v1/contracts — list contracts, optionally filtered by deal_id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get("deal_id")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const offset = (page - 1) * limit

  const filters: Record<string, string> = {}
  if (dealId) filters.deal_id = dealId

  const result = await query<ContractDoc>("contracts", {
    filters,
    orderBy: "created_at",
    order: "desc",
    limit,
    offset,
  })

  return NextResponse.json({
    data: result.data,
    total: result.total,
    page,
    limit,
  })
}

// POST /api/v1/contracts — create new contract version
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { deal_id, contract_type, content, status } = body

    if (!contract_type || !content) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "contract_type and content are required" } },
        { status: 400 }
      )
    }

    // Auto-increment version per deal_id
    let version = 1
    if (deal_id) {
      const existing = await query<ContractDoc>("contracts", {
        filters: { deal_id },
        orderBy: "version",
        order: "desc",
        limit: 1,
      })
      if (existing.data.length > 0) {
        version = (existing.data[0].version || 0) + 1
      }
    }

    const newContract: Partial<ContractDoc> = {
      deal_id: deal_id || null,
      contract_type,
      version,
      content,
      status: status || "DRAFT",
    }

    const result = await insert<ContractDoc>("contracts", newContract)

    return NextResponse.json(result.data, { status: 201 })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}

// PATCH /api/v1/contracts — update contract status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "id and status are required" } },
        { status: 400 }
      )
    }

    const validStatuses = ["DRAFT", "SENT", "SIGNED", "CANCELLED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `status must be one of: ${validStatuses.join(", ")}` } },
        { status: 400 }
      )
    }

    const result = await update<ContractDoc>("contracts", id, { status })

    return NextResponse.json(result.data)
  } catch {
    return Errors.badRequest('Update failed')
  }
}
