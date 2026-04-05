export type PlanTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type CreditTransactionType = 'PURCHASE' | 'USAGE' | 'REFUND' | 'BONUS'

export interface SubscriptionPlan {
  id: string
  name: string
  tier: PlanTier
  price_monthly: number
  price_yearly: number
  credits_included: number
  features: string[]
  active: boolean
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  plan: SubscriptionPlan
  billing_cycle: BillingCycle
  status: string
  current_period_start: string
  current_period_end: string
  created_at: string
}

export interface CreditBalance {
  user_id: string
  balance: number
  total_purchased: number
  total_used: number
  last_updated: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: CreditTransactionType
  description: string
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  amount: number
  status: InvoiceStatus
  description: string
  issued_at: string
  paid_at?: string
  due_date: string
}
