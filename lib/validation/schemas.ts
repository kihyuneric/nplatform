import { z } from 'zod'

// Re-export profitability analysis schemas
export { profitabilityInputSchema } from '@/lib/npl/profitability/schema'

// 매각 등록
export const dealListingSchema = z.object({
  collateral_type: z.enum(['아파트','오피스텔','다세대','단독주택','상가','오피스','토지','공장','호텔','기타']),
  collateral_region: z.string().min(1, '소재지는 필수입니다'),
  collateral_district: z.string().optional(),
  debt_principal: z.number().min(10000000, '채권원금은 1,000만원 이상이어야 합니다').max(10000000000000, '채권원금이 너무 큽니다'),
  debt_delinquency_months: z.number().min(0).max(360).optional(),
  collateral_appraisal_value: z.number().min(0).optional(),
  collateral_ltv: z.number().min(0).max(200).optional(),
  ask_min: z.number().min(0).optional(),
  ask_max: z.number().min(0).optional(),
  visibility: z.enum(['PUBLIC','INTERNAL','TARGETED','VIP']).default('PUBLIC'),
  deadline: z.string().optional(),
}).refine(data => !data.ask_min || !data.ask_max || data.ask_min <= data.ask_max, {
  message: '최소 희망가는 최대 희망가보다 클 수 없습니다',
  path: ['ask_min'],
})

// 오퍼 제출
export const offerSchema = z.object({
  amount: z.number().min(1, '금액은 필수입니다'),
  conditions: z.string().max(1000).optional(),
})

// 상담 요청
export const consultationSchema = z.object({
  professional_id: z.string().min(1),
  service_id: z.string().optional(),
  scheduled_at: z.string().min(1, '상담 일시는 필수입니다'),
  content: z.string().min(10, '상담 내용은 10자 이상 입력해주세요').max(2000),
  listing_id: z.string().optional(),
})

// 전문가 서비스 등록
export const professionalServiceSchema = z.object({
  name: z.string().min(2, '서비스명은 2자 이상').max(100),
  description: z.string().max(500).optional(),
  price_type: z.enum(['PER_CASE','PER_HOUR','PROJECT','NEGOTIABLE']),
  price: z.number().min(0).optional(),
  duration_minutes: z.number().min(0).max(480).optional(),
  is_free_initial: z.boolean().default(false),
})

// 추천코드 검증
export const referralCodeSchema = z.string()
  .min(5, '추천코드는 5자 이상입니다')
  .max(20)
  .regex(/^(NP|EX|IN|VIP)-/, '올바른 추천코드 형식이 아닙니다')

// 배너 등록
export const bannerSchema = z.object({
  title: z.string().min(1).max(200),
  image_url: z.string().url('유효한 이미지 URL이 필요합니다'),
  target_url: z.string().min(1),
  position: z.enum(['hero','service-top','sidebar','between-content','professional','deal-bridge','footer']),
  target_roles: z.array(z.string()).default([]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

// 딜룸 메시지
export const dealMessageSchema = z.object({
  content: z.string().min(1, '메시지를 입력해주세요').max(5000),
  message_type: z.enum(['TEXT','SYSTEM','OFFER','DOCUMENT']).default('TEXT'),
})
