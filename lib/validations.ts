// ============================================================
// Zod Validation Schemas for API Request/Response
// Mirrors lib/types.ts interfaces with runtime validation
// ============================================================

import { z } from 'zod'

// ─── Common ─────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const idParamSchema = z.object({
  id: z.string().uuid('유효하지 않은 ID 형식입니다'),
})

// ─── Market Search ──────────────────────────────────────────

const VALID_SORT_FIELDS = [
  'created_at', 'claim_amount', 'appraised_value',
  'discount_rate', 'bid_rate_avg', 'view_count',
] as const

export const marketSearchSchema = z.object({
  q: z.string().max(200).optional(),
  type: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'IN_DEAL', 'SOLD', 'WITHDRAWN']).optional(),
  region: z.string().optional(),
  sigungu: z.string().optional(),
  eupmyeondong: z.string().optional(),
  ai_grade: z.enum(['A', 'B', 'C', 'D', 'F']).optional(),
  listing_type: z.enum(['DISTRESSED_SALE', 'AUCTION_NPL', 'NON_AUCTION_NPL']).optional(),
  disclosure_level: z.enum(['TEASER', 'NDA_REQUIRED', 'FULL']).optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  min_appraisal: z.coerce.number().min(0).optional(),
  max_appraisal: z.coerce.number().min(0).optional(),
  sort: z.enum(VALID_SORT_FIELDS).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
})

// ─── Listings ───────────────────────────────────────────────

export const listingCreateSchema = z.object({
  title: z.string().min(2, '제목은 2자 이상이어야 합니다').max(200),
  listing_type: z.enum(['DISTRESSED_SALE', 'AUCTION_NPL', 'NON_AUCTION_NPL']),
  collateral_type: z.string().min(1),
  address: z.string().min(5, '주소를 입력하세요'),
  claim_amount: z.number().positive('채권액은 0보다 커야 합니다'),
  appraised_value: z.number().positive().optional(),
  minimum_bid: z.number().positive().optional(),
  discount_rate: z.number().min(0).max(100).optional(),
  debtor_status: z.string().optional(),
  occupancy_status: z.string().optional(),
  description: z.string().max(5000).optional(),
  disclosure_level: z.enum(['TEASER', 'NDA_REQUIRED', 'FULL']).optional().default('TEASER'),
  tags: z.array(z.string()).optional().default([]),
})

// ─── Contract ───────────────────────────────────────────────

export const contractCreateSchema = z.object({
  listing_id: z.string().uuid(),
  proposed_price: z.number().positive('제안 가격은 0보다 커야 합니다'),
  terms: z.record(z.any()).optional().default({}),
  deposit_amount: z.number().positive().optional(),
})

// ─── DealRoom ───────────────────────────────────────────────

export const dealRoomCreateSchema = z.object({
  listing_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  nda_required: z.boolean().optional().default(true),
  max_participants: z.number().int().min(2).max(50).optional().default(10),
  deadline: z.string().datetime().optional(),
  watermark_enabled: z.boolean().optional().default(true),
  download_restricted: z.boolean().optional().default(true),
})

export const dealRoomMessageSchema = z.object({
  content: z.string().min(1, '메시지를 입력하세요').max(5000),
  message_type: z.enum(['TEXT', 'FILE', 'SYSTEM']).optional().default('TEXT'),
  reply_to_id: z.string().uuid().optional(),
})

// ─── Demand Survey ──────────────────────────────────────────

export const demandSurveySchema = z.object({
  collateral_types: z.array(z.string()).min(1, '담보물 유형을 선택하세요'),
  regions: z.array(z.string()).min(1, '관심 지역을 선택하세요'),
  amount_min: z.number().min(0).optional(),
  amount_max: z.number().min(0).optional(),
  target_discount_rate: z.number().min(0).max(100).optional(),
  recovery_period_months: z.number().int().min(1).max(120).optional(),
  avoidance_conditions: z.array(z.string()).optional().default([]),
  preferred_seller_types: z.array(z.string()).optional().default([]),
  investment_experience: z.string().optional(),
  budget_total: z.number().positive().optional(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  notes: z.string().max(2000).optional(),
})

// ─── Alert ──────────────────────────────────────────────────

export const alertSettingSchema = z.object({
  name: z.string().min(1).max(100),
  conditions: z.object({
    market_types: z.array(z.enum(['DISTRESSED_SALE', 'AUCTION_NPL', 'NON_AUCTION_NPL'])).optional(),
    regions: z.array(z.string()).optional(),
    collateral_types: z.array(z.string()).optional(),
    price_range: z.object({ min: z.number(), max: z.number() }).optional(),
    min_discount: z.number().min(0).max(100).optional(),
    auction_round_range: z.object({ min: z.number().int(), max: z.number().int() }).optional(),
    keywords: z.array(z.string()).optional(),
  }),
  channels: z.object({
    email: z.boolean(),
    push: z.boolean(),
    kakao: z.boolean(),
    in_app: z.boolean(),
  }),
  frequency: z.enum(['IMMEDIATE', 'DAILY', 'WEEKLY']).optional().default('DAILY'),
  is_active: z.boolean().optional().default(true),
})

// ─── KYC ────────────────────────────────────────────────────

export const kycSubmitSchema = z.object({
  company_name: z.string().min(2),
  business_number: z.string().regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식: 000-00-00000'),
  institution_type: z.enum([
    'BANK', 'CAPITAL', 'AMC', 'TRUST', 'INSURANCE',
    'SAVINGS_BANK', 'CREDIT_UNION', 'SECURITIES', 'OTHER',
  ]),
  representative_name: z.string().min(2),
  address: z.string().min(5),
  phone: z.string().regex(/^0\d{1,2}-\d{3,4}-\d{4}$/, '전화번호 형식: 02-1234-5678'),
})

// ─── Complaint ──────────────────────────────────────────────

export const complaintCreateSchema = z.object({
  category: z.enum(['SERVICE', 'TRANSACTION', 'LISTING', 'CONTRACT', 'PRIVACY', 'TECHNICAL', 'OTHER']),
  subject: z.string().min(5, '제목은 5자 이상이어야 합니다').max(200),
  description: z.string().min(10, '내용은 10자 이상이어야 합니다').max(5000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
})

// ─── Matching ───────────────────────────────────────────────

export const matchingRunSchema = z.object({
  survey_id: z.string().uuid('유효하지 않은 survey_id 형식입니다'),
})

// ─── NPL Analyze ────────────────────────────────────────────

export const nplAnalyzeSchema = z.object({
  case_id: z.string().uuid('유효하지 않은 case_id 형식입니다'),
})

// ─── Support / Inquiry ──────────────────────────────────────

export const supportInquirySchema = z.object({
  category: z.enum(['GENERAL', 'ACCOUNT', 'LISTING', 'PAYMENT', 'TECHNICAL', 'OTHER']),
  subject: z.string().min(2, '제목은 2자 이상이어야 합니다').max(200),
  message: z.string().min(5, '내용은 5자 이상이어야 합니다').max(5000),
  email: z.string().email('유효한 이메일 형식이 아닙니다').optional(),
})

// ─── API Response Schemas ───────────────────────────────────

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
})

export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().optional(),
    next_cursor: z.string().nullable().optional(),
    page: z.number().nullable().optional(),
    total_pages: z.number().optional(),
    per_page: z.number().optional(),
  })
}

// ─── Helper: Validate Request Body ──────────────────────────

export function validateBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const message = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ')
  return { success: false, error: message, issues: result.error.issues }
}

// ─── Helper: Validate Search Params ─────────────────────────

export function validateSearchParams<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; error: string; issues: z.ZodIssue[] } {
  const obj: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    obj[key] = value
  })
  return validateBody(schema, obj)
}
