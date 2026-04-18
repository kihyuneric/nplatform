/**
 * GET    /api/v1/admin/admins  — List admin accounts (users with role='admin')
 * POST   /api/v1/admin/admins  — Invite new admin
 * PATCH  /api/v1/admin/admins  — Update admin level or status
 * DELETE /api/v1/admin/admins?id= — Remove admin role
 */
import { NextRequest, NextResponse } from "next/server"
import { Errors } from '@/lib/api-error'
import type { AdminAccount, AdminLevel } from "@/lib/admin-levels"
import { getAuthUserWithRole } from "@/lib/auth/get-user"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// ─── Fallback mock (dev / table-not-ready) ──────────────────
const MOCK_ADMINS: AdminAccount[] = [
  { id: 'adm-001', name: '김슈퍼',   email: 'super@nplatform.kr',   level: 'L1', status: 'ACTIVE',    lastLogin: '2026-03-21T09:30:00Z', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'adm-002', name: '박시스템', email: 'system@nplatform.kr',  level: 'L2', status: 'ACTIVE',    lastLogin: '2026-03-20T14:22:00Z', createdAt: '2025-03-15T00:00:00Z' },
  { id: 'adm-003', name: '이운영',   email: 'ops@nplatform.kr',     level: 'L3', status: 'ACTIVE',    lastLogin: '2026-03-21T08:10:00Z', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'adm-004', name: '최콘텐츠', email: 'content@nplatform.kr', level: 'L4', status: 'ACTIVE',    lastLogin: '2026-03-19T16:45:00Z', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'adm-005', name: '정모니터', email: 'monitor@nplatform.kr', level: 'L5', status: 'SUSPENDED', lastLogin: '2026-02-28T11:00:00Z', createdAt: '2025-12-01T00:00:00Z' },
]

async function requireAdmin() {
  const user = await getAuthUserWithRole()
  if (!user || user.role !== 'admin') return { err: Errors.forbidden('관리자만 접근할 수 있습니다.'), user: null }
  return { err: null, user }
}

// ─── GET: list admin accounts ────────────────────────────────
export async function GET() {
  const { err } = await requireAdmin()
  if (err) return err

  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return NextResponse.json({ data: MOCK_ADMINS, _mock: true })

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, admin_level, status, last_sign_in_at, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ data: MOCK_ADMINS, _mock: true })
    }
    if (!data || data.length === 0) {
      // No admins in DB yet — return empty list, not fake data
      return NextResponse.json({ data: [] })
    }

    const accounts: AdminAccount[] = (data as Record<string, unknown>[]).map((u) => ({
      id: u.id as string,
      name: (u.name as string) || '관리자',
      email: u.email as string,
      level: ((u.admin_level as string) || 'L3') as AdminLevel,
      status: ((u.status as string) || 'ACTIVE') as 'ACTIVE' | 'SUSPENDED',
      lastLogin: (u.last_sign_in_at as string) || undefined,
      createdAt: u.created_at as string,
    }))

    return NextResponse.json({ data: accounts })
  } catch {
    return NextResponse.json({ data: MOCK_ADMINS, _mock: true })
  }
}

// ─── POST: invite new admin ──────────────────────────────────
export async function POST(request: NextRequest) {
  const { err } = await requireAdmin()
  if (err) return err

  try {
    const body = await request.json()
    const { name, email, level } = body as { name: string; email: string; level: AdminLevel }

    if (!name || !email || !level) return Errors.badRequest('name, email, level are required')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        data: { id: `adm-${Date.now()}`, name, email, level, status: 'ACTIVE', createdAt: new Date().toISOString() },
        _mock: true,
      }, { status: 201 })
    }

    // Invite via Supabase Auth Admin API
    const { data: invite, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name, role: 'admin', admin_level: level },
    })

    if (inviteErr) {
      return NextResponse.json({ error: { message: inviteErr.message } }, { status: 400 })
    }

    // Upsert into users table
    if (invite?.user) {
      await supabase.from('users').upsert({
        id: invite.user.id,
        name, email,
        role: 'admin',
        admin_level: level,
        status: 'ACTIVE',
      })
    }

    return NextResponse.json({
      data: { id: invite?.user?.id, name, email, level, status: 'ACTIVE', createdAt: new Date().toISOString() }
    }, { status: 201 })
  } catch (err) {
    return Errors.badRequest(err instanceof Error ? err.message : 'Invalid request body')
  }
}

// ─── PATCH: update admin level or status ────────────────────
export async function PATCH(request: NextRequest) {
  const { err } = await requireAdmin()
  if (err) return err

  try {
    const body = await request.json()
    const { id, level, status } = body as { id: string; level?: AdminLevel; status?: 'ACTIVE' | 'SUSPENDED' }

    if (!id) return Errors.badRequest('id is required')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      const found = MOCK_ADMINS.find(a => a.id === id)
      if (!found) return Errors.notFound('Admin not found')
      return NextResponse.json({ data: { ...found, ...(level && { level }), ...(status && { status }) } })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (level)  updates.admin_level = level
    if (status) updates.status = status

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .eq('role', 'admin')
      .select('id, name, email, admin_level, status')
      .single()

    if (error || !data) return Errors.notFound('Admin not found')

    const row = data as Record<string, unknown>
    return NextResponse.json({
      data: { id: row.id, name: row.name, email: row.email, level: row.admin_level, status: row.status }
    })
  } catch (err) {
    return Errors.badRequest(err instanceof Error ? err.message : 'Invalid request body')
  }
}

// ─── DELETE: remove admin role ───────────────────────────────
export async function DELETE(request: NextRequest) {
  const { err } = await requireAdmin()
  if (err) return err

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Errors.badRequest('id is required')

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ data: { id, deleted: true }, _mock: true })

  const { error } = await supabase
    .from('users')
    .update({ role: 'user', admin_level: null })
    .eq('id', id)
    .eq('role', 'admin')

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 })

  return NextResponse.json({ data: { id, deleted: true } })
}
