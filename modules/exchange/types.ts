export type ListingType = 'DISTRESSED_SALE' | 'AUCTION_NPL' | 'NON_AUCTION_NPL'
export type DealStage = 'INTEREST' | 'NDA' | 'DUE_DILIGENCE' | 'NEGOTIATION' | 'CONTRACT' | 'SETTLEMENT' | 'COMPLETED' | 'CANCELLED'
export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type Visibility = 'PUBLIC' | 'INTERNAL' | 'TARGETED' | 'VIP'

export interface Listing { id: string; title?: string; debt_principal: number; collateral_type: string; collateral_region: string; risk_grade: RiskGrade; status: string; visibility: Visibility; listing_type?: ListingType; featured?: boolean; created_at: string }
export interface Deal { id: string; listing_id: string; buyer_id: string; seller_id: string; current_stage: DealStage; agreed_price?: number; created_at: string }
export interface Offer { id: string; deal_id: string; from_role: 'BUYER' | 'SELLER'; amount: number; status: string; created_at: string }
export interface DealMessage { id: string; deal_id: string; sender_id: string; content: string; message_type: string; created_at: string }
export interface DDItem { id: string; deal_id: string; item_number: number; title: string; status: string; note?: string }
