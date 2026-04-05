import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WatchlistEntry {
  id: string
  userId: string
  listingId: string
  folderName: string
  memo: string | null
  priceAtSave: number
  createdAt: string
}

// ─── In-memory store (replace with Supabase in production) ────────────────────

const watchlistStore: WatchlistEntry[] = [
  {
    id: 'w-001',
    userId: 'user-1',
    listingId: 'lst-001',
    folderName: '우선순위',
    memo: '역삼역 도보 5분, 낙찰 전망 좋음',
    priceAtSave: 3500000000,
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'w-002',
    userId: 'user-1',
    listingId: 'lst-002',
    folderName: '검토중',
    memo: '2회 유찰, 추가 가격 인하 예상',
    priceAtSave: 1800000000,
    createdAt: '2026-03-05T14:30:00Z',
  },
  {
    id: 'w-003',
    userId: 'user-1',
    listingId: 'lst-003',
    folderName: '기본',
    memo: null,
    priceAtSave: 2200000000,
    createdAt: '2026-03-08T10:15:00Z',
  },
]

// ─── GET /api/v1/buyer/watchlist ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get('folder')

  // ── Supabase-first ──
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      let query = supabase
        .from('buyer_watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (folder && folder !== 'all') {
        query = query.eq('folder_name', folder)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        const folderSummary = data.reduce<Record<string, number>>((acc, e: Record<string, unknown>) => {
          const fn = (e.folder_name as string) ?? 'default'
          acc[fn] = (acc[fn] ?? 0) + 1
          return acc
        }, {})
        return NextResponse.json({ data, total: data.length, folders: folderSummary })
      }
    }
  } catch {
    // Supabase not available, fall through to mock
  }

  // ── Mock fallback ──
  try {
    const userId = searchParams.get('user_id') ?? 'user-1'
    let entries = watchlistStore.filter((e) => e.userId === userId)

    if (folder && folder !== 'all') {
      entries = entries.filter((e) => e.folderName === folder)
    }

    const folderSummary = entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.folderName] = (acc[e.folderName] ?? 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      data: entries,
      total: entries.length,
      folders: folderSummary,
      _mock: true,
    })
  } catch (error) {
    logger.error('Watchlist GET error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '관심 목록을 불러오는 데 실패했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── POST /api/v1/buyer/watchlist ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listingId, folderName = '기본', memo = null, priceAtSave } = body

    if (!listingId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'listingId는 필수입니다.' } },
        { status: 400 }
      )
    }

    // ── Supabase-first ──
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from('buyer_watchlist')
          .insert({
            user_id: user.id,
            listing_id: listingId,
            folder_name: folderName,
            memo,
            price_at_save: priceAtSave ?? 0,
          })
          .select()
          .single()

        if (!error && data) {
          return NextResponse.json({ data }, { status: 201 })
        }
        // If unique constraint violation
        if (error?.code === '23505') {
          return NextResponse.json(
            { error: { code: 'DUPLICATE', message: '이미 관심 목록에 추가된 매물입니다.' } },
            { status: 409 }
          )
        }
      }
    } catch {
      // fall through to mock
    }

    // ── Mock fallback ──
    const existing = watchlistStore.find(
      (e) => e.userId === 'user-1' && e.listingId === listingId
    )
    if (existing) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE', message: '이미 관심 목록에 추가된 매물입니다.' } },
        { status: 409 }
      )
    }

    const newEntry: WatchlistEntry = {
      id: `w-${Date.now()}`,
      userId: 'user-1',
      listingId,
      folderName,
      memo,
      priceAtSave: priceAtSave ?? 0,
      createdAt: new Date().toISOString(),
    }

    watchlistStore.push(newEntry)

    return NextResponse.json({ data: newEntry, _mock: true }, { status: 201 })
  } catch (error) {
    logger.error('Watchlist POST error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '관심 목록 추가에 실패했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/v1/buyer/watchlist ───────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const listingId = searchParams.get('listing_id')

    if (!id && !listingId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id 또는 listing_id가 필요합니다.' } },
        { status: 400 }
      )
    }

    const idx = id
      ? watchlistStore.findIndex((e) => e.id === id && e.userId === 'user-1')
      : watchlistStore.findIndex((e) => e.listingId === listingId && e.userId === 'user-1')

    if (idx === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '관심 목록 항목을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }

    watchlistStore.splice(idx, 1)

    return NextResponse.json({ success: true, message: '관심 목록에서 삭제되었습니다.' })
  } catch (error) {
    logger.error('Watchlist DELETE error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '관심 목록 삭제에 실패했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/v1/buyer/watchlist ────────────────────────────────────────────
// Move folder or update memo

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, folderName, memo } = body

    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id는 필수입니다.' } },
        { status: 400 }
      )
    }

    const entry = watchlistStore.find((e) => e.id === id && e.userId === 'user-1')
    if (!entry) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '항목을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }

    if (folderName !== undefined) entry.folderName = folderName
    if (memo !== undefined) entry.memo = memo

    return NextResponse.json({ data: entry })
  } catch (error) {
    logger.error('Watchlist PATCH error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '업데이트에 실패했습니다.' } },
      { status: 500 }
    )
  }
}
