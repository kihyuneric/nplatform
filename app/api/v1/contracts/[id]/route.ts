import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'

// Shared mock store — in production this would be a DB query.
// Re-declare same mock so each file is self-contained (server module cache
// keeps them in sync within a single Next.js server process).
const MOCK_CONTRACT = {
  id: "contract-001",
  listing_id: "listing-mock-001",
  buyer_id: "user-buyer-001",
  seller_id: "user-seller-001",
  status: "REVIEWING",
  proposed_price: 850000000,
  counter_price: null as number | null,
  final_price: null as number | null,
  terms: { description: "잔금 30일 내 지급 조건. 등기 이전 완료 후 채권 양도." },
  cancellation_reason: null as string | null,
  deal_room_id: null as string | null,
  cooldown_expires_at: null as string | null,
  timeline: [
    { status: "PENDING", changed_at: "2026-03-10T09:00:00Z", note: "계약 요청 생성" },
    { status: "REVIEWING", changed_at: "2026-03-11T10:00:00Z", note: "매도자 검토 시작" },
  ],
  listing: {
    title: "서울 강남구 역삼동 오피스텔 NPL",
    listing_type: "NON_AUCTION_NPL",
    collateral_type: "OFFICETEL",
  },
  buyer: { name: "홍길동" },
  seller: { name: "한국자산관리공사", company_name: "한국자산관리공사" },
  created_at: "2026-03-10T09:00:00Z",
  updated_at: "2026-03-11T10:00:00Z",
}

// In-memory mutable copy
type ContractEntry = Record<string, unknown> & { timeline?: Record<string, unknown>[] }
const contractStore: Record<string, ContractEntry> = {
  "contract-001": { ...MOCK_CONTRACT },
}

// GET /api/v1/contracts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const contract = contractStore[id]
  if (!contract) {
    // Return a minimal mock so the page always renders during development
    return NextResponse.json(
      {
        ...MOCK_CONTRACT,
        id,
        timeline: [
          { status: "PENDING", changed_at: new Date().toISOString(), note: "계약 요청 생성" },
        ],
      },
      { status: 200 }
    )
  }
  return NextResponse.json(contract)
}

// PATCH /api/v1/contracts/[id] — update status or other fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    let contract = contractStore[id]
    if (!contract) {
      contract = { ...MOCK_CONTRACT, id }
    }

    const { status, counter_price, cancellation_reason } = body
    const now = new Date().toISOString()

    // Apply changes
    if (status) contract.status = status
    if (counter_price != null) contract.counter_price = counter_price
    if (cancellation_reason != null) contract.cancellation_reason = cancellation_reason

    // Append to timeline
    const note =
      cancellation_reason
        ? cancellation_reason
        : counter_price
        ? `역제안 금액: ${counter_price.toLocaleString()}원`
        : undefined

    contract.timeline = [
      ...(contract.timeline || []),
      { status: status || contract.status, changed_at: now, note },
    ]
    contract.updated_at = now

    // Auto-set cooldown if accepted
    if (status === "ACCEPTED") {
      const cooldownDate = new Date()
      cooldownDate.setDate(cooldownDate.getDate() + 7)
      contract.status = "COOLDOWN"
      contract.cooldown_expires_at = cooldownDate.toISOString()
      contract.timeline.push({
        status: "COOLDOWN",
        changed_at: now,
        note: "청약철회 기간 시작 (7 영업일)",
      })
    }

    contractStore[id] = contract
    return NextResponse.json(contract)
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
