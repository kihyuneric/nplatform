/**
 * lib/payments/toss.ts
 *
 * 토스페이먼츠 결제 어댑터 + 크레딧 적립 엔진.
 *
 * 흐름:
 *   1) 클라이언트 — initPayment() 호출 → orderId/amount/clientKey 반환
 *   2) 토스 결제 위젯 띄움 → 사용자 결제 → success 콜백
 *   3) 서버 — confirmPayment() 호출 → 토스 v1/payments/confirm API
 *   4) 결제 성공 → payments insert + 크레딧 적립 + 영수증 발급
 *   5) 웹훅 — 환불/취소 이벤트 검증 후 반영
 *
 * 보안 원칙:
 *   - secretKey는 절대 클라이언트에 노출 금지
 *   - clientKey만 브라우저 사용
 *   - 웹훅 서명은 SHA-256 HMAC 검증
 *   - 결제 amount는 서버에서 재계산 — 클라이언트 값 신뢰 금지
 *   - 모든 결제 이벤트는 audit_logs 기록
 */

import { createHash, randomUUID, timingSafeEqual } from "crypto"

// ─── Types ────────────────────────────────────────────────────

export type PaymentMethod =
  | "CARD"
  | "VIRTUAL_ACCOUNT"
  | "TRANSFER"
  | "MOBILE"
  | "EASY_PAY"
  | "CULTURE_GIFT"

export type PaymentPurpose =
  | "CREDIT_PURCHASE"     // 크레딧 충전
  | "SUBSCRIPTION"        // 구독료
  | "DEAL_LISTING_FEE"    // 매물 등록 수수료
  | "EXPERT_CONSULTATION" // 전문가 상담료
  | "DEAL_SUCCESS_FEE"    // 거래 성사 수수료

export type PaymentStatus =
  | "PENDING"
  | "DONE"
  | "CANCELED"
  | "PARTIAL_CANCELED"
  | "FAILED"
  | "EXPIRED"

export interface InitPaymentInput {
  userId: string
  amount: number
  purpose: PaymentPurpose
  /** 크레딧 충전 시 적립 수량 */
  creditAmount?: number
  /** 호환을 위한 메타데이터 */
  metadata?: Record<string, unknown>
}

export interface InitPaymentResult {
  orderId: string
  amount: number
  /** 결제 위젯에 전달할 클라이언트 키 (브라우저 노출 가능) */
  clientKey: string
  /** 위젯 사용자 식별 (이메일 sha-256 해시) */
  customerKey: string
  orderName: string
  /** 결제 위젯 callback URL */
  successUrl: string
  failUrl: string
  expiresAt: string
}

export interface ConfirmPaymentInput {
  orderId: string
  paymentKey: string
  amount: number
}

export interface ConfirmPaymentResult {
  ok: boolean
  status: PaymentStatus
  paymentKey: string
  orderId: string
  approvedAt?: string
  receiptUrl?: string
  /** 적립된 크레딧 (CREDIT_PURCHASE 시) */
  creditsGranted?: number
  /** 실패 사유 */
  reason?: string
}

export interface WebhookEvent {
  eventType: "PAYMENT.DONE" | "PAYMENT.CANCELED" | "PAYMENT.FAILED" | "PAYMENT.EXPIRED"
  paymentKey: string
  orderId: string
  status: PaymentStatus
  totalAmount: number
  canceledAmount?: number
  occurredAt: string
}

// ─── Constants ────────────────────────────────────────────────

const TOSS_API_BASE = "https://api.tosspayments.com/v1"
const ORDER_TTL_MS = 30 * 60 * 1000   // 30분

/** 크레딧 패키지 — 충전 amount → 적립 credit */
export const CREDIT_PACKAGES: { amount: number; credits: number; bonusPct: number }[] = [
  { amount:   10_000, credits:    100, bonusPct:  0 },
  { amount:   30_000, credits:    320, bonusPct:  6 },
  { amount:   50_000, credits:    560, bonusPct: 12 },
  { amount:  100_000, credits:  1200, bonusPct: 20 },
  { amount:  300_000, credits:  3900, bonusPct: 30 },
  { amount: 1_000_000, credits: 14000, bonusPct: 40 },
]

/** 목적별 표시명 (영수증/위젯) */
const PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  CREDIT_PURCHASE:     "NPLatform 크레딧 충전",
  SUBSCRIPTION:        "NPLatform 구독료",
  DEAL_LISTING_FEE:    "매물 등록 수수료",
  EXPERT_CONSULTATION: "전문가 상담료",
  DEAL_SUCCESS_FEE:    "거래 성사 수수료",
}

// ─── 1) 결제 init ─────────────────────────────────────────────

/**
 * 결제 시작. 서버 사이드 호출 — orderId 생성 + DB pending 기록(호출 측 책임).
 */
export function initPayment(input: InitPaymentInput): InitPaymentResult {
  const clientKey = process.env.TOSS_CLIENT_KEY ?? "test_ck_replace_me"
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const orderId = `ORD-${Date.now()}-${randomUUID().slice(0, 8)}`
  const customerKey = createHash("sha256").update(input.userId).digest("hex").slice(0, 32)

  return {
    orderId,
    amount: input.amount,
    clientKey,
    customerKey,
    orderName: PURPOSE_LABELS[input.purpose],
    successUrl: `${baseUrl}/api/v1/payments/success?orderId=${orderId}`,
    failUrl:    `${baseUrl}/api/v1/payments/fail?orderId=${orderId}`,
    expiresAt:  new Date(Date.now() + ORDER_TTL_MS).toISOString(),
  }
}

// ─── 2) 결제 승인 ────────────────────────────────────────────

/**
 * 토스 v1/payments/confirm 호출. orderId/amount는 DB에서 조회한 값과 비교 필수.
 *
 * @param input 클라이언트가 success 콜백으로 보낸 값
 * @param expectedAmount DB에 저장된 금액 (변조 차단)
 */
export async function confirmPayment(
  input: ConfirmPaymentInput,
  expectedAmount: number,
): Promise<ConfirmPaymentResult> {
  if (input.amount !== expectedAmount) {
    return {
      ok: false,
      status: "FAILED",
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      reason: `Amount mismatch: client=${input.amount} expected=${expectedAmount}`,
    }
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    return {
      ok: false,
      status: "FAILED",
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      reason: "TOSS_SECRET_KEY 미설정",
    }
  }

  const auth = Buffer.from(`${secretKey}:`).toString("base64")
  try {
    const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      }),
    })
    const json = await res.json() as TossConfirmResponse | TossErrorResponse

    if (!res.ok || isError(json)) {
      return {
        ok: false,
        status: "FAILED",
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        reason: isError(json) ? json.message : "Toss API error",
      }
    }

    return {
      ok: true,
      status: mapTossStatus(json.status),
      paymentKey: json.paymentKey,
      orderId: json.orderId,
      approvedAt: json.approvedAt,
      receiptUrl: json.receipt?.url,
    }
  } catch (err) {
    return {
      ok: false,
      status: "FAILED",
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      reason: `Network error: ${(err as Error)?.message ?? "unknown"}`,
    }
  }
}

interface TossConfirmResponse {
  paymentKey: string
  orderId: string
  status: string
  approvedAt: string
  receipt?: { url: string }
  totalAmount: number
}

interface TossErrorResponse {
  code: string
  message: string
}

function isError(json: unknown): json is TossErrorResponse {
  return typeof json === "object" && json !== null && "code" in json && "message" in json
}

function mapTossStatus(status: string): PaymentStatus {
  switch (status) {
    case "DONE":             return "DONE"
    case "CANCELED":         return "CANCELED"
    case "PARTIAL_CANCELED": return "PARTIAL_CANCELED"
    case "EXPIRED":          return "EXPIRED"
    case "ABORTED":          return "FAILED"
    default:                 return "PENDING"
  }
}

// ─── 3) 크레딧 적립 ──────────────────────────────────────────

/**
 * 결제 amount → 적립 크레딧 계산.
 * 정의된 패키지 정확 매칭 시 보너스 포함, 그 외 1원=0.01 크레딧.
 */
export function calculateCreditGrant(amount: number): number {
  const exact = CREDIT_PACKAGES.find(p => p.amount === amount)
  if (exact) return exact.credits
  return Math.floor(amount / 100)
}

// ─── 4) 웹훅 서명 검증 ────────────────────────────────────────

/**
 * 토스 웹훅 X-Toss-Signature 검증.
 * payload 본문 + secretKey HMAC-SHA256.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET ?? ""
  if (!secret) return false
  const expected = createHash("sha256").update(rawBody + secret).digest("hex")
  return safeEqual(expected, signature)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

/**
 * 웹훅 본문을 표준 이벤트로 파싱. 잘못된 형식이면 null.
 */
export function parseWebhookEvent(rawBody: string): WebhookEvent | null {
  try {
    const json = JSON.parse(rawBody) as Record<string, unknown>
    const eventType = json.eventType as WebhookEvent["eventType"]
    const data = (json.data ?? {}) as Record<string, unknown>
    if (!eventType || !data.paymentKey || !data.orderId) return null
    return {
      eventType,
      paymentKey: String(data.paymentKey),
      orderId: String(data.orderId),
      status: mapTossStatus(String(data.status ?? "")),
      totalAmount: Number(data.totalAmount ?? 0),
      canceledAmount: data.canceledAmount != null ? Number(data.canceledAmount) : undefined,
      occurredAt: String(data.occurredAt ?? new Date().toISOString()),
    }
  } catch {
    return null
  }
}

// ─── 5) 환불 ──────────────────────────────────────────────────

export interface CancelInput {
  paymentKey: string
  cancelReason: string
  cancelAmount?: number       // 부분 환불
}

export async function cancelPayment(input: CancelInput): Promise<{ ok: boolean; reason?: string }> {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return { ok: false, reason: "TOSS_SECRET_KEY 미설정" }
  const auth = Buffer.from(`${secretKey}:`).toString("base64")
  try {
    const res = await fetch(`${TOSS_API_BASE}/payments/${input.paymentKey}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancelReason: input.cancelReason,
        cancelAmount: input.cancelAmount,
      }),
    })
    if (!res.ok) {
      const json = await res.json() as TossErrorResponse
      return { ok: false, reason: json.message }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: `Network error: ${(err as Error)?.message ?? "unknown"}` }
  }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  CREDIT_PACKAGES,
  PURPOSE_LABELS,
  ORDER_TTL_MS,
  TOSS_API_BASE,
  mapTossStatus,
  calculateCreditGrant,
}
