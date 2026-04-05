export type CouponType = 'FREE_PLAN' | 'CREDITS' | 'DISCOUNT' | 'INVITATION' | 'TICKET' | 'VIP'

export interface Coupon {
  id: string; code: string; type: CouponType
  value: Record<string, any>  // { months: 3 } or { credits: 100 } or { discount_pct: 20 }
  maxUses: number | null; usedCount: number
  targetRoles: string[]; validFrom: string; validUntil: string
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED'
}

export function generateCouponCode(prefix: string = 'NPL'): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${rand}`
}

export function validateCoupon(coupon: Coupon): { valid: boolean; reason?: string } {
  if (coupon.status !== 'ACTIVE') return { valid: false, reason: '비활성 쿠폰입니다' }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { valid: false, reason: '사용 횟수가 초과되었습니다' }
  const now = new Date()
  if (new Date(coupon.validFrom) > now) return { valid: false, reason: '아직 사용 기간이 아닙니다' }
  if (new Date(coupon.validUntil) < now) return { valid: false, reason: '사용 기간이 만료되었습니다' }
  return { valid: true }
}

export function applyCoupon(coupon: Coupon): { description: string; applied: Record<string, any> } {
  switch (coupon.type) {
    case 'FREE_PLAN': return { description: `${coupon.value.months}개월 무료 이용`, applied: { freePlanMonths: coupon.value.months } }
    case 'CREDITS': return { description: `${coupon.value.credits} 크레딧 증정`, applied: { bonusCredits: coupon.value.credits } }
    case 'DISCOUNT': return { description: `${coupon.value.discount_pct}% 할인`, applied: { discountPct: coupon.value.discount_pct } }
    case 'INVITATION': return { description: '초대 특별 혜택', applied: coupon.value }
    case 'TICKET': return { description: '기능 이용권', applied: coupon.value }
    case 'VIP': return { description: 'VIP 전체 기능 이용', applied: { vip: true, months: coupon.value.months } }
    default: return { description: '쿠폰 적용', applied: coupon.value }
  }
}
