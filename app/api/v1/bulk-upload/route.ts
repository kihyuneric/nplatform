import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface BulkListingInput {
  collateral_type: string
  address: string
  sido: string
  sigungu?: string
  loan_principal: number | null
  appraised_value: number | null
  asking_price: number | null
  mortgage_amount: number | null
  claim_balance: number | null
  exclusive_area: number | null
  debtor_type: string | null
  delinquency_rate: number | null
  bid_start_date: string | null
  bid_end_date: string | null
  notes: string | null
}

const VALID_COLLATERAL_TYPES = [
  'APARTMENT', 'COMMERCIAL', 'LAND', 'FACTORY',
  'OFFICE', 'VILLA', 'HOTEL', 'WAREHOUSE', 'OTHER',
]

function validateListing(item: BulkListingInput, index: number): string | null {
  if (!item.collateral_type || !VALID_COLLATERAL_TYPES.includes(item.collateral_type)) {
    return `[${index}] 유효하지 않은 담보유형: ${item.collateral_type}`
  }
  if (!item.address || item.address.trim().length === 0) {
    return `[${index}] 담보주소 필수`
  }
  if (!item.sido || item.sido.trim().length === 0) {
    return `[${index}] 시도 필수`
  }
  if (item.loan_principal === null || item.loan_principal <= 0) {
    return `[${index}] 대출원금은 0보다 커야 합니다`
  }
  if (item.appraised_value === null || item.appraised_value <= 0) {
    return `[${index}] 감정가는 0보다 커야 합니다`
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  // Role check
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || !['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return Errors.forbidden('대량 등록 권한이 없습니다.')
  }

  let body: { listings: BulkListingInput[] }
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('잘못된 요청 형식입니다.')
  }

  if (!body.listings || !Array.isArray(body.listings) || body.listings.length === 0) {
    return Errors.badRequest('등록할 매물 데이터가 없습니다.')
  }

  if (body.listings.length > 500) {
    return Errors.badRequest('한 번에 최대 500건까지 등록 가능합니다.')
  }

  // Validate all items
  const errors: string[] = []
  const validItems: BulkListingInput[] = []

  for (let i = 0; i < body.listings.length; i++) {
    const item = body.listings[i]
    const err = validateListing(item, i + 1)
    if (err) {
      errors.push(err)
    } else {
      validItems.push(item)
    }
  }

  // Insert valid items
  let successCount = 0
  const insertErrors: string[] = [...errors]

  if (validItems.length > 0) {
    const rows = validItems.map(item => ({
      seller_id: userId,
      title: `${item.sido} ${item.sigungu || ''} ${item.collateral_type}`.trim(),
      listing_type: 'NON_AUCTION_NPL',
      collateral_type: item.collateral_type,
      address: item.address,
      sido: item.sido,
      sigungu: item.sigungu || null,
      claim_amount: item.loan_principal,
      appraised_value: item.appraised_value,
      minimum_bid: item.asking_price,
      loan_balance: item.claim_balance,
      exclusive_area: item.exclusive_area,
      debtor_status: item.debtor_type || 'UNKNOWN',
      loan_interest_rate: item.delinquency_rate ? item.delinquency_rate / 100 : null,
      discount_rate: item.appraised_value && item.asking_price
        ? Math.round((1 - item.asking_price / item.appraised_value) * 100 * 10) / 10
        : null,
      documents_summary: item.notes,
      disclosure_level: 'TEASER',
      status: 'DRAFT',
    }))

    const { data, error } = await supabase
      .from('npl_listings')
      .insert(rows)
      .select('id')

    if (error) {
      insertErrors.push(`DB 삽입 오류: ${(error instanceof Error ? error.message : 'Unknown error')}`)
    } else {
      successCount = data?.length || 0
    }
  }

  // Record bulk upload history (optional table)
  try {
    await supabase.from('bulk_uploads').insert({
      user_id: userId,
      file_name: 'bulk_upload',
      total_count: body.listings.length,
      success_count: successCount,
      error_count: body.listings.length - successCount,
      errors: insertErrors.length > 0 ? insertErrors : null,
    })
  } catch {
    // Table may not exist; skip silently
  }

  return NextResponse.json({
    success: successCount,
    failed: body.listings.length - successCount,
    errors: insertErrors,
  })
}
