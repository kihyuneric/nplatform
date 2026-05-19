/**
 * lib/escrow/kb.ts
 *
 * KB국민은행 에스크로 어댑터 — NPL 거래대금 보호.
 *
 * 운영 흐름:
 *   1) 매수자가 매입대금 → KB 에스크로 계좌 입금 (lockEscrow)
 *   2) 매도자 채권 양도 + 등기 이전 확인 (verify by admin)
 *   3) KB 에스크로 → 매도자 계좌로 자금 이체 (releaseEscrow)
 *   4) 분쟁 발생 시 → 양당사자 합의 또는 법원 결정에 따라 환불 (refundEscrow)
 *
 * 환경변수:
 *   KB_ESCROW_API_URL
 *   KB_ESCROW_CLIENT_ID
 *   KB_ESCROW_CLIENT_SECRET
 *   KB_ESCROW_VERTICAL_ID    (KB 가맹 ID)
 *
 * 미설정 시 → mock 응답 (개발용)
 */

import { logger } from '@/lib/logger'

export interface EscrowAccount {
  escrowId: string
  dealId: string
  amountKRW: number
  status: 'PENDING' | 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED'
  buyerName: string
  sellerName: string
  createdAt: string
  releasedAt?: string
  /** mock 응답 시 true */
  _mock?: boolean
}

export interface CreateEscrowInput {
  dealId: string
  amountKRW: number
  buyerName: string
  buyerPhone: string
  buyerAccount: { bank: string; number: string }
  sellerName: string
  sellerAccount: { bank: string; number: string }
}

const isConfigured = () =>
  !!process.env.KB_ESCROW_API_URL &&
  !!process.env.KB_ESCROW_CLIENT_ID &&
  !!process.env.KB_ESCROW_CLIENT_SECRET

async function getAccessToken(): Promise<string> {
  // TODO: KB OAuth2 client_credentials grant 구현
  throw new Error('KB 에스크로 access token 미구현 — OAuth2 client_credentials 필요')
}

/** 1단계: 에스크로 계좌 생성 + 매수자에게 입금 안내 */
export async function lockEscrow(input: CreateEscrowInput): Promise<EscrowAccount> {
  if (!isConfigured()) {
    logger.warn('[kb-escrow] not configured — returning mock', { dealId: input.dealId, amount: input.amountKRW })
    return {
      escrowId: `mock-esc-${Date.now().toString(36)}`,
      dealId: input.dealId,
      amountKRW: input.amountKRW,
      status: 'LOCKED',
      buyerName: input.buyerName,
      sellerName: input.sellerName,
      createdAt: new Date().toISOString(),
      _mock: true,
    }
  }

  const token = await getAccessToken()
  const base = process.env.KB_ESCROW_API_URL!
  const res = await fetch(`${base}/escrow/accounts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vertical_id: process.env.KB_ESCROW_VERTICAL_ID,
      deal_id: input.dealId,
      amount_krw: input.amountKRW,
      buyer: { name: input.buyerName, phone: input.buyerPhone, account: input.buyerAccount },
      seller: { name: input.sellerName, account: input.sellerAccount },
    }),
  })
  if (!res.ok) throw new Error(`KB 에스크로 생성 실패: HTTP ${res.status}`)
  const data = (await res.json()) as {
    escrow_id: string
    status: string
    created_at: string
  }
  return {
    escrowId: data.escrow_id,
    dealId: input.dealId,
    amountKRW: input.amountKRW,
    status: data.status as EscrowAccount['status'],
    buyerName: input.buyerName,
    sellerName: input.sellerName,
    createdAt: data.created_at,
  }
}

/** 2단계: 매도자 정산 — 양당사자 + 관리자 확인 후 호출 */
export async function releaseEscrow(escrowId: string): Promise<EscrowAccount> {
  if (!isConfigured() || escrowId.startsWith('mock-')) {
    return {
      escrowId,
      dealId: 'mock',
      amountKRW: 0,
      status: 'RELEASED',
      buyerName: 'mock',
      sellerName: 'mock',
      createdAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      _mock: true,
    }
  }
  const token = await getAccessToken()
  const base = process.env.KB_ESCROW_API_URL!
  const res = await fetch(`${base}/escrow/accounts/${escrowId}/release`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`KB 에스크로 정산 실패: HTTP ${res.status}`)
  return (await res.json()) as EscrowAccount
}

/** 3단계: 환불 — 거래 취소 또는 분쟁 시 매수자에게 환불 */
export async function refundEscrow(escrowId: string, reason: string): Promise<EscrowAccount> {
  if (!isConfigured() || escrowId.startsWith('mock-')) {
    return {
      escrowId,
      dealId: 'mock',
      amountKRW: 0,
      status: 'REFUNDED',
      buyerName: 'mock',
      sellerName: 'mock',
      createdAt: new Date().toISOString(),
      _mock: true,
    }
  }
  const token = await getAccessToken()
  const base = process.env.KB_ESCROW_API_URL!
  const res = await fetch(`${base}/escrow/accounts/${escrowId}/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error(`KB 에스크로 환불 실패: HTTP ${res.status}`)
  return (await res.json()) as EscrowAccount
}
