import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import type { AlertSetting } from '@/lib/types'

// ─── In-memory store ──────────────────────────────────────────────────────────

const alertStore: (AlertSetting & { triggerCount: number })[] = [
  {
    id: 'alert-001',
    user_id: 'user-1',
    name: '서울 오피스 NPL 알림',
    conditions: {
      collateral_types: ['OFFICE'],
      regions: ['서울특별시'],
      price_range: { min: 1000000000, max: 5000000000 },
      min_discount: 25,
    },
    channels: { email: true, push: true, kakao: false, in_app: true },
    frequency: 'IMMEDIATE',
    is_active: true,
    last_triggered_at: '2026-03-19T15:30:00Z',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
    triggerCount: 12,
  },
  {
    id: 'alert-002',
    user_id: 'user-1',
    name: '경기 고할인 상가 알림',
    conditions: {
      collateral_types: ['COMMERCIAL'],
      regions: ['경기도'],
      min_discount: 35,
    },
    channels: { email: true, push: false, kakao: true, in_app: true },
    frequency: 'DAILY',
    is_active: true,
    last_triggered_at: '2026-03-18T09:00:00Z',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-10T10:00:00Z',
    triggerCount: 5,
  },
]

// ─── GET /api/v1/buyer/alerts ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') ?? 'user-1'
    const activeOnly = searchParams.get('active_only') === 'true'

    let alerts = alertStore.filter((a) => a.user_id === userId)

    if (activeOnly) {
      alerts = alerts.filter((a) => a.is_active)
    }

    return NextResponse.json({
      data: alerts,
      total: alerts.length,
      active_count: alerts.filter((a) => a.is_active).length,
    })
  } catch (error) {
    logger.error('Alerts GET error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '알림 목록을 불러오는 데 실패했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── POST /api/v1/buyer/alerts ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, conditions, channels, frequency } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '알림 이름은 필수입니다.' } },
        { status: 400 }
      )
    }

    if (!frequency || !['IMMEDIATE', 'DAILY', 'WEEKLY'].includes(frequency)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '올바른 발송 주기를 선택해주세요.' } },
        { status: 400 }
      )
    }

    const newAlert = {
      id: `alert-${Date.now()}`,
      user_id: 'user-1',
      name: name.trim(),
      conditions: conditions ?? {},
      channels: channels ?? { email: true, push: false, kakao: false, in_app: true },
      frequency: frequency as 'IMMEDIATE' | 'DAILY' | 'WEEKLY',
      is_active: true,
      last_triggered_at: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      triggerCount: 0,
    }

    alertStore.push(newAlert)

    return NextResponse.json({ data: newAlert }, { status: 201 })
  } catch (error) {
    logger.error('Alerts POST error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '알림 생성에 실패했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/v1/buyer/alerts ───────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id는 필수입니다.' } },
        { status: 400 }
      )
    }

    const alert = alertStore.find((a) => a.id === id && a.user_id === 'user-1')
    if (!alert) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }

    Object.assign(alert, {
      ...updates,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ data: alert })
  } catch (error) {
    logger.error('Alerts PATCH error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '알림 수정에 실패했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/v1/buyer/alerts ──────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id는 필수입니다.' } },
        { status: 400 }
      )
    }

    const idx = alertStore.findIndex((a) => a.id === id && a.user_id === 'user-1')
    if (idx === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }

    alertStore.splice(idx, 1)

    return NextResponse.json({ success: true, message: '알림이 삭제되었습니다.' })
  } catch (error) {
    logger.error('Alerts DELETE error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '알림 삭제에 실패했습니다.' } },
      { status: 500 }
    )
  }
}
