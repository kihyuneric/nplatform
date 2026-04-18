import { NextRequest, NextResponse } from 'next/server'

// POST /api/v1/ocr/autofill
// OCR 추출 데이터 → 매물 등록 폼 자동 채우기 매핑
//
// Request body:
//   { doc_type: string, extracted: Record<string, unknown> }
//
// Response:
//   { fields: ListingFormFields, confidence: number, warnings: string[] }

interface ListingFormFields {
  title?: string
  description?: string
  asset_type?: 'NPL' | 'RE' | 'MIXED'
  principal_amount?: number       // 채권 원금 (원)
  claim_amount?: number           // 채권 총액 (원)
  appraisal_value?: number        // 감정가 (원)
  minimum_bid?: number            // 최저입찰가 (원)
  address?: string
  property_type?: string          // 아파트 | 오피스텔 | 근린상가 | 토지 | 공장 | 기타
  land_area?: number              // 토지면적 (m²)
  building_area?: number          // 건물면적 (m²)
  court_name?: string
  case_number?: string
  auction_date?: string           // YYYY-MM-DD
  auction_count?: number
  tenant_count?: number
  total_lease_deposit?: number    // 임차인 보증금 합계
  total_encumbrance?: number      // 담보권 합계
  ltv_ratio?: number              // LTV
}

function mapBondOcr(extracted: Record<string, unknown>): { fields: ListingFormFields; confidence: number; warnings: string[] } {
  const warnings: string[] = []
  let confidence = 0
  const fields: ListingFormFields = {}

  // 사건번호 & 법원
  if (extracted.case_number) { fields.case_number = String(extracted.case_number); confidence += 15 }
  if (extracted.court_name)  { fields.court_name  = String(extracted.court_name);  confidence += 10 }

  // 금액
  if (typeof extracted.appraisal_value === 'number') {
    fields.appraisal_value = extracted.appraisal_value
    confidence += 15
  }
  if (typeof extracted.minimum_price === 'number') {
    fields.minimum_bid = extracted.minimum_price
    confidence += 10
  }

  // 부동산 정보
  if (extracted.address) { fields.address = String(extracted.address); confidence += 10 }
  if (extracted.property_type) {
    const pt = String(extracted.property_type)
    fields.property_type = pt
    if (!fields.title) fields.title = `${pt} ${fields.address?.split(' ').slice(-1)[0] ?? ''} NPL`
    confidence += 10
  }
  if (typeof extracted.land_area     === 'number') { fields.land_area     = extracted.land_area;     confidence += 5 }
  if (typeof extracted.building_area === 'number') { fields.building_area = extracted.building_area; confidence += 5 }

  // 경매 일정
  if (extracted.next_auction_date) { fields.auction_date  = String(extracted.next_auction_date); confidence += 10 }
  if (typeof extracted.auction_count === 'number') { fields.auction_count = extracted.auction_count; confidence += 5 }

  // 자산 유형 추론
  fields.asset_type = 'NPL'

  // 최고 confidence 100
  confidence = Math.min(100, confidence)

  if (!fields.case_number) warnings.push('사건번호를 찾지 못했습니다. 직접 입력이 필요합니다.')
  if (!fields.address)     warnings.push('주소를 찾지 못했습니다. 직접 입력이 필요합니다.')
  if (!fields.appraisal_value) warnings.push('감정가를 찾지 못했습니다. 직접 입력이 필요합니다.')

  return { fields, confidence, warnings }
}

function mapRegistryOcr(extracted: Record<string, unknown>): { fields: ListingFormFields; confidence: number; warnings: string[] } {
  const warnings: string[] = []
  let confidence = 0
  const fields: ListingFormFields = {}

  const rights = (extracted.rights as Record<string, unknown>[] | null) ?? []
  if (rights.length > 0) {
    const mortgages = rights.filter(r => String(r.right_type ?? '').includes('근저당') || String(r.right_type ?? '').includes('저당'))
    const totalEncumbrance = mortgages.reduce((sum, r) => {
      const amt = (r.max_claim_amount ?? r.claim_amount ?? 0) as number
      return sum + amt
    }, 0)
    if (totalEncumbrance > 0) {
      fields.total_encumbrance = totalEncumbrance
      fields.claim_amount = totalEncumbrance
      confidence += 25
    }
  }

  if (extracted.address) { fields.address = String(extracted.address); confidence += 20 }

  return { fields, confidence, warnings }
}

function mapAppraisalOcr(extracted: Record<string, unknown>): { fields: ListingFormFields; confidence: number; warnings: string[] } {
  const warnings: string[] = []
  let confidence = 0
  const fields: ListingFormFields = {}

  if (typeof extracted.appraisal_value === 'number') {
    fields.appraisal_value = extracted.appraisal_value
    // 채권 원금 추정: 감정가의 80% (일반적 LTV)
    if (!fields.claim_amount) {
      fields.claim_amount = Math.round(extracted.appraisal_value * 0.8)
      warnings.push('채권액은 감정가 80%로 추정되었습니다. 실제 채권액을 확인해주세요.')
    }
    confidence += 30
  }
  if (extracted.address)       { fields.address       = String(extracted.address);       confidence += 20 }
  if (extracted.property_type) { fields.property_type = String(extracted.property_type); confidence += 15 }
  if (typeof extracted.land_area     === 'number') { fields.land_area     = extracted.land_area;     confidence += 5 }
  if (typeof extracted.building_area === 'number') { fields.building_area = extracted.building_area; confidence += 5 }

  fields.asset_type = 'NPL'
  return { fields, confidence: Math.min(100, confidence), warnings }
}

function mapLeaseOcr(extracted: Record<string, unknown>): { fields: ListingFormFields; confidence: number; warnings: string[] } {
  const warnings: string[] = []
  let confidence = 0
  const fields: ListingFormFields = {}

  const tenants = (extracted.tenants as Record<string, unknown>[] | null) ?? []
  if (tenants.length > 0) {
    fields.tenant_count = tenants.length
    fields.total_lease_deposit = tenants.reduce((sum, t) => sum + ((t.deposit as number) ?? 0), 0)
    confidence += 30
  } else {
    warnings.push('임차인 정보를 찾지 못했습니다.')
  }

  return { fields, confidence: Math.min(100, confidence), warnings }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { doc_type, extracted } = body

    if (!doc_type || !extracted) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'doc_type and extracted are required' } },
        { status: 400 }
      )
    }

    let result: { fields: ListingFormFields; confidence: number; warnings: string[] }

    switch (doc_type) {
      case 'bond':       result = mapBondOcr(extracted); break
      case 'registry':   result = mapRegistryOcr(extracted); break
      case 'appraisal':  result = mapAppraisalOcr(extracted); break
      case 'lease':      result = mapLeaseOcr(extracted); break
      default:
        result = { fields: {}, confidence: 0, warnings: ['지원되지 않는 문서 유형입니다.'] }
    }

    return NextResponse.json({
      success: true,
      doc_type,
      ...result,
      hint: '자동 채워진 값은 반드시 원본 서류와 대조 후 확인하세요.',
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'autofill 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
