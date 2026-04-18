import { NextRequest, NextResponse } from 'next/server'
import { type SettlementStatus } from '@/lib/settlement/fee-engine'

const VALID_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  pending:  ['invoiced', 'waived'],
  invoiced: ['paid', 'disputed'],
  paid:     [],
  waived:   [],
  disputed: ['invoiced', 'waived'],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Mock: return 404 for unknown IDs
  if (!id.startsWith('STL-')) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '정산 내역을 찾을 수 없습니다.' } },
      { status: 404 }
    )
  }

  // Mock settlement detail
  return NextResponse.json({
    success: true,
    data: {
      id,
      status: 'pending',
      message: '실제 DB 연동 전 mock 응답입니다.',
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { status, notes } = body

  if (!status) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'status is required' } },
      { status: 400 }
    )
  }

  const validStatuses: SettlementStatus[] = ['pending', 'invoiced', 'paid', 'waived', 'disputed']
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: `Invalid status: ${status}` } },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const updates: Record<string, string | null> = { status, notes: notes ?? null }
  if (status === 'invoiced') updates.invoiced_at = now
  if (status === 'paid')     updates.paid_at     = now

  return NextResponse.json({
    success: true,
    data: { id, ...updates, updated_at: now },
  })
}
