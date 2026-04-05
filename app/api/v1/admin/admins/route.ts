import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import type { AdminAccount, AdminLevel } from "@/lib/admin-levels"

const MOCK_ADMINS: AdminAccount[] = [
  { id: 'adm-001', name: '김슈퍼', email: 'super@nplatform.kr', level: 'L1', status: 'ACTIVE', lastLogin: '2026-03-21T09:30:00Z', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'adm-002', name: '박시스템', email: 'system@nplatform.kr', level: 'L2', status: 'ACTIVE', lastLogin: '2026-03-20T14:22:00Z', createdAt: '2025-03-15T00:00:00Z' },
  { id: 'adm-003', name: '이운영', email: 'ops@nplatform.kr', level: 'L3', status: 'ACTIVE', lastLogin: '2026-03-21T08:10:00Z', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'adm-004', name: '최콘텐츠', email: 'content@nplatform.kr', level: 'L4', status: 'ACTIVE', lastLogin: '2026-03-19T16:45:00Z', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'adm-005', name: '정모니터', email: 'monitor@nplatform.kr', level: 'L5', status: 'SUSPENDED', lastLogin: '2026-02-28T11:00:00Z', createdAt: '2025-12-01T00:00:00Z' },
]

// GET: list admin accounts
export async function GET() {
  return NextResponse.json({ data: MOCK_ADMINS })
}

// POST: create admin (L1 only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, level } = body as { name: string; email: string; level: AdminLevel }

    if (!name || !email || !level) {
      return Errors.badRequest('name, email, level are required')
    }

    const newAdmin: AdminAccount = {
      id: `adm-${String(MOCK_ADMINS.length + 1).padStart(3, '0')}`,
      name, email, level,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ data: newAdmin }, { status: 201 })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}

// PATCH: change level or status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, level, status } = body

    if (!id) {
      return Errors.badRequest('id is required')
    }

    const admin = MOCK_ADMINS.find(a => a.id === id)
    if (!admin) {
      return Errors.notFound('Admin not found')
    }

    return NextResponse.json({ data: { ...admin, ...(level && { level }), ...(status && { status }) } })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}

// DELETE: remove admin
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return Errors.badRequest('id is required')
  }

  return NextResponse.json({ data: { id, deleted: true } })
}
