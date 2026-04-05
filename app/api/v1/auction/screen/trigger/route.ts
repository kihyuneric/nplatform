// ============================================================
// app/api/v1/auction/screen/trigger/route.ts
// 관리자/인증 사용자용 수동 스크리닝 트리거
// POST /api/v1/auction/screen/trigger
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 인증 검증
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 관리자 역할 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  // 배치 사이즈
  const body = await req.json().catch(() => ({})) as { batch_size?: number }
  const batch_size = body.batch_size ?? 30

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? `https://${req.headers.get('host') ?? 'localhost:3000'}`

    const res = await fetch(`${baseUrl}/api/v1/auction/screen`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ batch_size, force: false, dry_run: false }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Screen API error: ${text}` }, { status: res.status })
    }

    const result = await res.json()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
