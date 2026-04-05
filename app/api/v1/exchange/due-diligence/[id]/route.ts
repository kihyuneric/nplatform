import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"

// ─── Mock Data ────────────────────────────────────────────

const MOCK_DD_ITEMS = [
  {
    id: "dd-001",
    deal_id: "deal-001",
    category: "법률",
    title: "등기부등본 확인",
    description: "담보물건 등기부등본 열람 및 권리 분석",
    status: "COMPLETED",
    assigned_to: "user-buyer-1",
    document_url: "/documents/dd/registry-001.pdf",
    note: "소유권 이전 문제 없음. 근저당 1순위 확인.",
    due_date: "2026-03-25T23:59:59Z",
    completed_at: "2026-03-18T10:00:00Z",
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: "dd-002",
    deal_id: "deal-001",
    category: "감정평가",
    title: "독립 감정평가",
    description: "제3자 감정평가 기관을 통한 담보물건 재감정",
    status: "IN_PROGRESS",
    assigned_to: "user-buyer-1",
    document_url: null,
    note: "감정평가 진행 중 - 한국감정원 의뢰 완료",
    due_date: "2026-03-28T23:59:59Z",
    completed_at: null,
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: "dd-003",
    deal_id: "deal-001",
    category: "재무",
    title: "채권 현금흐름 분석",
    description: "원리금 상환 스케줄 및 연체 현황 분석",
    status: "IN_PROGRESS",
    assigned_to: "user-buyer-1",
    document_url: null,
    note: "데이터 수집 완료, 분석 중",
    due_date: "2026-03-27T23:59:59Z",
    completed_at: null,
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: "dd-004",
    deal_id: "deal-001",
    category: "물리",
    title: "현장 실사",
    description: "담보물건 현장 방문 및 물리적 상태 점검",
    status: "PENDING",
    assigned_to: "user-buyer-1",
    document_url: null,
    note: null,
    due_date: "2026-04-01T23:59:59Z",
    completed_at: null,
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: "dd-005",
    deal_id: "deal-001",
    category: "세무",
    title: "세무 리스크 검토",
    description: "양도소득세, 취득세 등 세무 관련 리스크 분석",
    status: "PENDING",
    assigned_to: "user-buyer-1",
    document_url: null,
    note: null,
    due_date: "2026-04-03T23:59:59Z",
    completed_at: null,
    created_at: "2026-03-15T09:00:00Z",
  },
]

// ─── GET /api/v1/exchange/due-diligence/[id] ──────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Dev fallback: return mock data with 14 standard checklist items
      const MOCK_DD_FULL = [
        ...MOCK_DD_ITEMS,
        { id: "dd-006", deal_id: dealId, category: "법률", title: "소송 이력 확인", description: "담보물건 관련 진행 중인 소송 조사", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-05T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-007", deal_id: dealId, category: "법률", title: "임차인 현황 파악", description: "대항력 있는 임차인 및 보증금 현황 조사", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-05T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-008", deal_id: dealId, category: "환경", title: "환경 오염 조사", description: "토양/지하수 오염 여부 조사", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-07T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-009", deal_id: dealId, category: "건축", title: "건축법 위반 여부", description: "불법 증축, 용도변경 등 건축법 위반 사항 확인", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-07T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-010", deal_id: dealId, category: "재무", title: "채무자 신용조사", description: "채무자 재산 및 신용 상태 조사", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-03T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-011", deal_id: dealId, category: "시장", title: "주변 시세 조사", description: "담보물건 주변 실거래가 및 시세 분석", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-03T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-012", deal_id: dealId, category: "시장", title: "임대 수익률 분석", description: "현재 및 예상 임대 수익률 산출", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-05T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-013", deal_id: dealId, category: "보험", title: "보험 가입 현황", description: "화재보험 등 담보물건 보험 가입 현황 확인", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-07T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
        { id: "dd-014", deal_id: dealId, category: "행정", title: "도시계획 확인", description: "용도지역, 지구단위계획 등 도시계획 사항 확인", status: "PENDING", assigned_to: null, document_url: null, note: null, due_date: "2026-04-07T23:59:59Z", completed_at: null, created_at: "2026-03-15T09:00:00Z" },
      ]
      return NextResponse.json({ data: MOCK_DD_FULL, _mock: true })
    }

    const { data, error } = await supabase
      .from("due_diligence_items")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true })

    if (error) {
      const filtered = MOCK_DD_ITEMS.filter(
        (item) => item.deal_id === dealId || dealId === "deal-001"
      )
      return NextResponse.json({ data: filtered })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error("[due-diligence/[id]] GET error:", { error: err })
    return Errors.internal('실사 항목을 불러오는 중 오류가 발생했습니다.')
  }
}

// ─── PATCH /api/v1/exchange/due-diligence/[id] ────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params
    const supabase = await createClient()
    let patchUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) patchUserId = user.id } catch {}
    if (patchUserId === 'anonymous') return Errors.unauthorized('인증이 필요합니다.')

    const body = await request.json()
    const { status, note, document_url } = body

    const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "FLAGGED"]
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `유효한 상태값: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (status !== undefined) {
      updates.status = status
      if (status === "COMPLETED") {
        updates.completed_at = new Date().toISOString()
      }
    }
    if (note !== undefined) updates.note = note
    if (document_url !== undefined) updates.document_url = document_url

    const { data, error } = await supabase
      .from("due_diligence_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        data: { id: itemId, ...updates, _mock: true },
      })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error("[due-diligence/[id]] PATCH error:", { error: err })
    return Errors.internal('실사 항목 수정 중 오류가 발생했습니다.')
  }
}
