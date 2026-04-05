import { describe, it, expect } from 'vitest'
import {
  mapAppraisalData,
  mapRegistryData,
  mapTenantData,
  mapBondDocData,
  AppraisalExtracted,
  RegistryExtracted,
  TenantExtracted,
  BondDocExtracted,
} from '@/lib/npl/ocr-mapper'

// ===== mapAppraisalData =====

describe('mapAppraisalData', () => {
  it('converts appraisal value from won to 억', () => {
    const data: AppraisalExtracted = {
      appraisal_value: 500000000, // 5억
      address: null,
      land_area: null,
      building_area: null,
      property_type: null,
      appraisal_date: null,
    }
    const result = mapAppraisalData(data)
    expect(result.appraisalValue).toBe('5')
  })

  it('maps all non-null fields', () => {
    const data: AppraisalExtracted = {
      appraisal_value: 1000000000,
      address: '서울시 강남구 역삼동 123',
      land_area: 150.5,
      building_area: 200.3,
      property_type: '아파트',
      appraisal_date: '2024-01-15',
    }
    const result = mapAppraisalData(data)
    expect(result.appraisalValue).toBe('10')
    expect(result.address).toBe('서울시 강남구 역삼동 123')
    expect(result.landArea).toBe('150.5')
    expect(result.buildingArea).toBe('200.3')
    expect(result.propertyType).toBe('아파트')
  })

  it('skips null fields', () => {
    const data: AppraisalExtracted = {
      appraisal_value: null,
      address: null,
      land_area: null,
      building_area: null,
      property_type: null,
      appraisal_date: null,
    }
    const result = mapAppraisalData(data)
    expect(result.appraisalValue).toBeUndefined()
    expect(result.address).toBeUndefined()
  })

  it('normalizes property types', () => {
    expect(mapAppraisalData({ appraisal_value: null, address: null, land_area: null, building_area: null, property_type: '빌라', appraisal_date: null }).propertyType).toBe('다세대')
    expect(mapAppraisalData({ appraisal_value: null, address: null, land_area: null, building_area: null, property_type: '다가구', appraisal_date: null }).propertyType).toBe('다세대')
    expect(mapAppraisalData({ appraisal_value: null, address: null, land_area: null, building_area: null, property_type: '근린시설', appraisal_date: null }).propertyType).toBe('상가')
  })
})

// ===== mapRegistryData =====

describe('mapRegistryData', () => {
  it('maps rights with correct unit conversions', () => {
    const data: RegistryExtracted = {
      rights: [
        {
          seq: 1,
          registration_date: '2023-06-01',
          right_type: '근저당권',
          right_holder: '국민은행',
          claim_amount: 500000000,
          max_claim_amount: 600000000,
          principal: 400000000,
          interest_rate: 0.05,
        },
      ],
    }
    const result = mapRegistryData(data)
    expect(result).toHaveLength(1)
    expect(result[0].right_holder).toBe('국민은행')
    expect(result[0].claim_amount).toBe('5') // 5억
    expect(result[0].max_claim_amount).toBe('6')
    expect(result[0].principal).toBe('4')
    expect(result[0].interest_rate).toBe('5') // 5%
    expect(result[0].right_type).toBe('근저당')
    expect(result[0].classification).toBe('선순위') // first = 선순위
    expect(result[0].registration_date).toBe('2023-06-01')
  })

  it('classifies rights by index', () => {
    const data: RegistryExtracted = {
      rights: [
        { seq: 1, registration_date: null, right_type: '근저당', right_holder: 'A', claim_amount: 100000000, max_claim_amount: 120000000, principal: 100000000, interest_rate: 0 },
        { seq: 2, registration_date: null, right_type: '근저당', right_holder: 'B', claim_amount: 200000000, max_claim_amount: 240000000, principal: 200000000, interest_rate: 0 },
        { seq: 3, registration_date: null, right_type: '근저당', right_holder: 'C', claim_amount: 300000000, max_claim_amount: 360000000, principal: 300000000, interest_rate: 0 },
      ],
    }
    const result = mapRegistryData(data)
    expect(result[0].classification).toBe('선순위')
    expect(result[1].classification).toBe('매입채권(NPL)')
    expect(result[2].classification).toBe('후순위')
  })

  it('classifies 가압류 correctly regardless of index', () => {
    const data: RegistryExtracted = {
      rights: [
        { seq: 1, registration_date: null, right_type: '가압류', right_holder: '세무서', claim_amount: 50000000, max_claim_amount: 50000000, principal: 50000000, interest_rate: 0 },
      ],
    }
    const result = mapRegistryData(data)
    expect(result[0].classification).toBe('가압류·압류')
  })

  it('normalizes right types', () => {
    const data: RegistryExtracted = {
      rights: [
        { seq: 1, registration_date: null, right_type: '근저당권설정', right_holder: 'A', claim_amount: 0, max_claim_amount: 0, principal: 0, interest_rate: 0 },
        { seq: 2, registration_date: null, right_type: '전세권설정', right_holder: 'B', claim_amount: 0, max_claim_amount: 0, principal: 0, interest_rate: 0 },
        { seq: 3, registration_date: null, right_type: '임차권등기', right_holder: 'C', claim_amount: 0, max_claim_amount: 0, principal: 0, interest_rate: 0 },
      ],
    }
    const result = mapRegistryData(data)
    expect(result[0].right_type).toBe('근저당')
    expect(result[1].right_type).toBe('전세권')
    expect(result[2].right_type).toBe('전세권') // 임차권 → 전세권
  })

  it('defaults interest_rate to 15 when zero', () => {
    const data: RegistryExtracted = {
      rights: [
        { seq: 1, registration_date: null, right_type: '근저당', right_holder: 'A', claim_amount: 100000000, max_claim_amount: 120000000, principal: 100000000, interest_rate: 0 },
      ],
    }
    const result = mapRegistryData(data)
    expect(result[0].interest_rate).toBe('15')
  })

  it('uses seq from data or falls back to index+1', () => {
    const data: RegistryExtracted = {
      rights: [
        { seq: 0, registration_date: null, right_type: '근저당', right_holder: 'A', claim_amount: 0, max_claim_amount: 0, principal: 0, interest_rate: 0 },
      ],
    }
    const result = mapRegistryData(data)
    // seq=0 is falsy, so falls back to index+1 = 1
    expect(result[0].seq).toBe(1)
  })
})

// ===== mapTenantData =====

describe('mapTenantData', () => {
  it('converts deposit and rent from won to 만원', () => {
    const data: TenantExtracted = {
      tenants: [
        {
          tenant_name: '홍길동',
          move_in_date: '2023-01-01',
          fixed_date: '2023-01-02',
          deposit: 100000000, // 1억 = 10000만
          monthly_rent: 500000,  // 50만
          has_opposition_right: true,
        },
      ],
    }
    const result = mapTenantData(data)
    expect(result).toHaveLength(1)
    expect(result[0].tenant_name).toBe('홍길동')
    expect(result[0].deposit).toBe('10000') // 만원
    expect(result[0].monthly_rent).toBe('50') // 만원
    expect(result[0].has_opposition_right).toBe(true)
    expect(result[0].move_in_date).toBe('2023-01-01')
  })

  it('defaults deposit/rent to 0 when falsy', () => {
    const data: TenantExtracted = {
      tenants: [
        { tenant_name: '이영희', move_in_date: null, fixed_date: null, deposit: 0, monthly_rent: 0, has_opposition_right: false },
      ],
    }
    const result = mapTenantData(data)
    expect(result[0].deposit).toBe('0')
    expect(result[0].monthly_rent).toBe('0')
  })

  it('handles empty tenants array', () => {
    const result = mapTenantData({ tenants: [] })
    expect(result).toHaveLength(0)
  })
})

// ===== mapBondDocData =====

describe('mapBondDocData', () => {
  it('maps all fields from bond document', () => {
    const data: BondDocExtracted = {
      case_number: '2024타경12345',
      court_name: '서울중앙지방법원',
      appraisal_value: 1000000000,
      minimum_price: 700000000,
      ai_estimated_value: 900000000,
      auction_count: 2,
      next_auction_date: '2024-06-15',
      address: '서울시 강남구 역삼동',
      property_type: '오피스텔',
      land_area: 100,
      building_area: 85,
      property_composition: '단독',
    }
    const result = mapBondDocData(data)
    expect(result.caseNumber).toBe('2024타경12345')
    expect(result.courtName).toBe('서울중앙지방법원')
    expect(result.appraisalValue).toBe('10') // 10억
    expect(result.minimumPrice).toBe('7')
    expect(result.aiEstimatedValue).toBe('9')
    expect(result.auctionCount).toBe('2')
    expect(result.nextAuctionDate).toBe('2024-06-15')
    expect(result.address).toBe('서울시 강남구 역삼동')
    expect(result.propertyType).toBe('오피스텔')
    expect(result.landArea).toBe('100')
    expect(result.buildingArea).toBe('85')
    expect(result.propertyComposition).toBe('단독')
  })

  it('skips null fields', () => {
    const data: BondDocExtracted = {
      case_number: null,
      court_name: null,
      appraisal_value: null,
      minimum_price: null,
      ai_estimated_value: null,
      auction_count: null,
      next_auction_date: null,
      address: null,
      property_type: null,
      land_area: null,
      building_area: null,
      property_composition: null,
    }
    const result = mapBondDocData(data)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('rejects invalid property_composition values', () => {
    const data: BondDocExtracted = {
      case_number: null, court_name: null, appraisal_value: null, minimum_price: null,
      ai_estimated_value: null, auction_count: null, next_auction_date: null, address: null,
      property_type: null, land_area: null, building_area: null,
      property_composition: '잘못된값',
    }
    const result = mapBondDocData(data)
    expect(result.propertyComposition).toBeUndefined()
  })

  it('accepts valid property_composition values', () => {
    for (const comp of ['단독', '복수-동일담보', '복수-개별담보']) {
      const data: BondDocExtracted = {
        case_number: null, court_name: null, appraisal_value: null, minimum_price: null,
        ai_estimated_value: null, auction_count: null, next_auction_date: null, address: null,
        property_type: null, land_area: null, building_area: null,
        property_composition: comp,
      }
      const result = mapBondDocData(data)
      expect(result.propertyComposition).toBe(comp)
    }
  })
})
