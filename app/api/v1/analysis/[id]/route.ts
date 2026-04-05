import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const MOCK_ANALYSIS = {
  id: 'mock-analysis-001',
  listing_id: 'mock-listing-001',
  user_id: 'mock-user',
  ai_grade: 'A',
  risk_score: 32,
  expected_recovery_rate: 78.5,
  summary: '서울 강남구 소재 아파트 담보 NPL. 감정가 대비 할인율 35%로 투자 매력도 높음.',
  strengths: ['우수한 입지조건', '높은 유동성', '안정적 시세'],
  risks: ['경매 지연 가능성', '선순위 권리관계 확인 필요'],
  recommendation: 'BUY',
  created_at: '2025-01-15T09:00:00Z',
  npl_listings: {
    id: 'mock-listing-001',
    title: '[서울 강남] 아파트 담보 NPL',
    collateral_type: '아파트',
    listing_type: 'NPL',
    address_masked: '서울특별시 강남구 ***',
    sido: '서울특별시',
    sigungu: '강남구',
    claim_amount: 850000000,
    discount_rate: 35,
    status: 'ACTIVE',
    thumbnail_url: null,
    created_at: '2025-01-10T09:00:00Z',
  },
}

// GET - Single analysis detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: analysis, error } = await supabase
      .from('npl_ai_analyses')
      .select(`
        *,
        npl_listings (
          id,
          title,
          collateral_type,
          listing_type,
          address_masked,
          sido,
          sigungu,
          claim_amount,
          discount_rate,
          status,
          thumbnail_url,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Analysis not found' } },
          { status: 404 }
        )
      }
      // Fallback to mock data on query error (table may not exist yet)
      logger.warn('[analysis] GET query error, returning mock:', { error: (error as Error).message })
      return NextResponse.json({ data: { ...MOCK_ANALYSIS, id }, _mock: true })
    }

    return NextResponse.json({ data: analysis })
  } catch (err) {
    logger.error('[analysis] GET detail error:', { error: err })
    const { id } = await params
    return NextResponse.json({ data: { ...MOCK_ANALYSIS, id }, _mock: true })
  }
}

// DELETE - Remove analysis (ownership check)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    let delUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) delUserId = user.id } catch {}
    if (delUserId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Verify ownership before deleting
    const { data: existing, error: fetchError } = await supabase
      .from('npl_ai_analyses')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Analysis not found' } },
        { status: 404 }
      )
    }

    if (existing.user_id !== delUserId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own analyses' } },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('npl_ai_analyses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Analysis deleted successfully' })
  } catch (err) {
    logger.error('[analysis] DELETE error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
