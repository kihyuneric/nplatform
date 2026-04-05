// OCR 추출 데이터 → 폼 필드 매핑 함수

// ── 감정평가서 추출 데이터 타입 ──
export interface AppraisalExtracted {
  appraisal_value: number | null;
  address: string | null;
  land_area: number | null;
  building_area: number | null;
  property_type: string | null;
  appraisal_date: string | null;
}

// ── 등기부등본 추출 데이터 타입 ──
export interface RegistryRightExtracted {
  seq: number;
  registration_date: string | null;
  right_type: string;
  right_holder: string;
  claim_amount: number;
  max_claim_amount: number;
  principal: number;
  interest_rate: number;
}

export interface RegistryExtracted {
  rights: RegistryRightExtracted[];
}

// ── 임차인현황표 추출 데이터 타입 ──
export interface TenantItemExtracted {
  tenant_name: string;
  move_in_date: string | null;
  fixed_date: string | null;
  deposit: number;
  monthly_rent: number;
  has_opposition_right: boolean;
}

export interface TenantExtracted {
  tenants: TenantItemExtracted[];
}

// ── 채권/부동산 소개자료 추출 데이터 타입 ──
export interface BondDocExtracted {
  case_number: string | null;
  court_name: string | null;
  appraisal_value: number | null;
  minimum_price: number | null;
  ai_estimated_value: number | null;
  auction_count: number | null;
  next_auction_date: string | null;
  address: string | null;
  property_type: string | null;
  land_area: number | null;
  building_area: number | null;
  property_composition: string | null;
}

// ── Step 1 폼 필드 타입 ──
export interface Step1Fields {
  caseNumber?: string;
  courtName?: string;
  propertyType?: string;
  address?: string;
  appraisalValue?: string;
  minimumPrice?: string;
  aiEstimatedValue?: string;
  landArea?: string;
  buildingArea?: string;
  auctionCount?: string;
  nextAuctionDate?: string;
  propertyComposition?: '단독' | '복수-동일담보' | '복수-개별담보';
}

// ── Step 2 폼 필드 타입 ──
export interface RightRow {
  seq: number;
  right_type: string;
  right_holder: string;
  claim_amount: string;
  principal: string;
  max_claim_amount: string;
  interest_rate: string;
  classification: string;
  registration_date: string;
  priority_rank: number;
}

// ── Step 3 폼 필드 타입 ──
export interface TenantRow {
  tenant_name: string;
  move_in_date: string;
  deposit: string;
  monthly_rent: string;
  has_opposition_right: boolean;
}

// ── 매핑 함수들 ──

/** 감정평가서 → Step 1 기본정보 */
export function mapAppraisalData(data: AppraisalExtracted): Partial<Step1Fields> {
  const result: Partial<Step1Fields> = {};

  if (data.appraisal_value != null) {
    result.appraisalValue = (data.appraisal_value / 100000000).toString();
  }
  if (data.address) result.address = data.address;
  if (data.land_area != null) result.landArea = data.land_area.toString();
  if (data.building_area != null) result.buildingArea = data.building_area.toString();
  if (data.property_type) {
    result.propertyType = normalizePropertyType(data.property_type);
  }

  return result;
}

/** 등기부등본 → Step 2 권리분석 */
export function mapRegistryData(data: RegistryExtracted): RightRow[] {
  return data.rights.map((r, i) => ({
    seq: r.seq || i + 1,
    right_type: normalizeRightType(r.right_type),
    right_holder: r.right_holder || '',
    claim_amount: r.claim_amount ? (r.claim_amount / 100000000).toString() : '0',
    principal: r.principal ? (r.principal / 100000000).toString() : '0',
    max_claim_amount: r.max_claim_amount ? (r.max_claim_amount / 100000000).toString() : '0',
    interest_rate: r.interest_rate ? (r.interest_rate * 100).toString() : '15',
    classification: classifyRight(r.right_type, i),
    registration_date: r.registration_date || '',
    priority_rank: i + 1,
  }));
}

/** 임차인현황표 → Step 3 임차인 */
export function mapTenantData(data: TenantExtracted): TenantRow[] {
  return data.tenants.map(t => ({
    tenant_name: t.tenant_name || '',
    move_in_date: t.move_in_date || '',
    deposit: t.deposit ? (t.deposit / 10000).toString() : '0',
    monthly_rent: t.monthly_rent ? (t.monthly_rent / 10000).toString() : '0',
    has_opposition_right: t.has_opposition_right || false,
  }));
}

/** 채권/부동산 소개자료 → Step 1 기본정보 */
export function mapBondDocData(data: BondDocExtracted): Partial<Step1Fields> {
  const result: Partial<Step1Fields> = {};

  if (data.case_number) result.caseNumber = data.case_number;
  if (data.court_name) result.courtName = data.court_name;
  if (data.address) result.address = data.address;
  if (data.property_type) result.propertyType = normalizePropertyType(data.property_type);
  if (data.appraisal_value != null) {
    result.appraisalValue = (data.appraisal_value / 100000000).toString();
  }
  if (data.minimum_price != null) {
    result.minimumPrice = (data.minimum_price / 100000000).toString();
  }
  if (data.ai_estimated_value != null) {
    result.aiEstimatedValue = (data.ai_estimated_value / 100000000).toString();
  }
  if (data.auction_count != null) {
    result.auctionCount = data.auction_count.toString();
  }
  if (data.next_auction_date) result.nextAuctionDate = data.next_auction_date;
  if (data.land_area != null) result.landArea = data.land_area.toString();
  if (data.building_area != null) result.buildingArea = data.building_area.toString();
  if (data.property_composition) {
    const comp = data.property_composition;
    if (['단독', '복수-동일담보', '복수-개별담보'].includes(comp)) {
      result.propertyComposition = comp as Step1Fields['propertyComposition'];
    }
  }

  return result;
}

// ── 유틸리티 함수 ──

function normalizePropertyType(raw: string): string {
  const mapping: Record<string, string> = {
    '아파트': '아파트',
    '오피스텔': '오피스텔',
    '상가': '상가',
    '공장': '공장',
    '토지': '토지',
    '다세대': '다세대',
    '다가구': '다세대',
    '빌라': '다세대',
    '단독주택': '기타',
    '근린시설': '상가',
  };
  return mapping[raw] || raw;
}

function normalizeRightType(raw: string): string {
  if (raw.includes('근저당')) return '근저당';
  if (raw.includes('저당')) return '저당';
  if (raw.includes('가압류')) return '가압류';
  if (raw.includes('압류')) return '압류';
  if (raw.includes('전세권')) return '전세권';
  if (raw.includes('임차권')) return '전세권';
  return raw;
}

function classifyRight(rightType: string, index: number): string {
  if (rightType.includes('가압류') || rightType.includes('압류')) {
    return '가압류·압류';
  }
  // First mortgage is typically senior, second could be NPL
  if (index === 0) return '선순위';
  if (index === 1) return '매입채권(NPL)';
  return '후순위';
}
