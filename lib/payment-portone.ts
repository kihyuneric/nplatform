/**
 * lib/payment-portone.ts
 *
 * PortOne (포트원 / 구 아임포트) V2 결제 통합
 * https://developers.portone.io/docs/ko/v2-payment/
 *
 * 환경변수:
 *   PORTONE_STORE_ID       — 포트원 콘솔 → 스토어 ID
 *   PORTONE_CHANNEL_KEY    — 포트원 채널키 (결제 수단별)
 *   PORTONE_API_SECRET     — V2 API 시크릿 (서버 검증용)
 *   PORTONE_WEBHOOK_SECRET — Webhook 서명 검증용 시크릿
 *
 * 미설정 시 샌드박스 모드로 동작 (결제 검증 스킵)
 */

// ─── 타입 정의 ─────────────────────────────────────────────

export interface PortOnePaymentRequest {
  /** 주문 ID (플랫폼 내 unique, 영숫자+하이픈 최대 64자) */
  orderId: string
  /** 결제 금액 (원) */
  amount: number
  /** 결제 화면에 표시될 이름 */
  orderName: string
  /** 구매자 정보 */
  customer: {
    name: string
    email?: string
    phone?: string
  }
  /** 결제 완료 후 리다이렉트 URL */
  redirectUrl: string
  /** 결제 수단 (기본: CARD) */
  payMethod?: 'CARD' | 'VIRTUAL_ACCOUNT' | 'EASY_PAY' | 'MOBILE'
  /** 에스크로 여부 */
  escrow?: boolean
  /** 커스텀 메타데이터 (결제 목적 추적용) */
  metadata?: Record<string, string>
}

export interface PortOnePaymentResult {
  /** 성공/실패 여부 */
  success: boolean
  /** 포트원 결제 ID (결제 성공 시 발급) */
  paymentId?: string
  /** 주문 ID */
  orderId: string
  /** 실제 결제 금액 (검증된 금액) */
  paidAmount?: number
  /** 결제 수단 */
  method?: string
  /** 영수증 URL */
  receiptUrl?: string
  /** PG사 거래 ID */
  pgTxId?: string
  /** 실패 이유 */
  error?: string
  /** 원본 응답 (디버깅용) */
  raw?: Record<string, unknown>
}

export interface PortOneWebhookPayload {
  type: 'Transaction.Paid' | 'Transaction.Failed' | 'Transaction.Cancelled' | 'Transaction.PartialCancelled'
  timestamp: string
  data: {
    paymentId: string
    transactionId: string
  }
}

// ─── 설정 ─────────────────────────────────────────────────

const PORTONE_API_BASE = 'https://api.portone.io'

interface PortOneConfig {
  storeId: string
  channelKey: string
  apiSecret: string
  webhookSecret: string
  isSandbox: boolean
}

export function getPortOneConfig(): PortOneConfig {
  // 동기 폴백 (runtime-config는 비동기 — 동기 컨텍스트에서는 env 사용)
  const storeId       = process.env.PORTONE_STORE_ID ?? ''
  const channelKey    = process.env.PORTONE_CHANNEL_KEY ?? ''
  const apiSecret     = process.env.PORTONE_API_SECRET ?? ''
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET ?? ''

  return {
    storeId,
    channelKey,
    apiSecret,
    webhookSecret,
    isSandbox: !storeId || !apiSecret,
  }
}

/** 비동기 버전 — DB 저장 키를 runtime-config를 통해 조회 */
export async function getPortOneConfigAsync(): Promise<PortOneConfig> {
  try {
    const { getConfigs } = await import('@/lib/runtime-config')
    const cfg = await getConfigs([
      'PORTONE_STORE_ID', 'PORTONE_CHANNEL_KEY',
      'PORTONE_API_SECRET', 'PORTONE_WEBHOOK_SECRET',
    ])
    const storeId       = cfg['PORTONE_STORE_ID'] ?? process.env.PORTONE_STORE_ID ?? ''
    const channelKey    = cfg['PORTONE_CHANNEL_KEY'] ?? process.env.PORTONE_CHANNEL_KEY ?? ''
    const apiSecret     = cfg['PORTONE_API_SECRET'] ?? process.env.PORTONE_API_SECRET ?? ''
    const webhookSecret = cfg['PORTONE_WEBHOOK_SECRET'] ?? process.env.PORTONE_WEBHOOK_SECRET ?? ''
    return { storeId, channelKey, apiSecret, webhookSecret, isSandbox: !storeId || !apiSecret }
  } catch {
    return getPortOneConfig()
  }
}

// ─── V2 API 헬퍼 ─────────────────────────────────────────

async function portoneRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { apiSecret, isSandbox } = getPortOneConfig()

  if (isSandbox) {
    console.log(`[PortOne] 샌드박스 모드 — ${method} ${path}`)
    return { data: null, error: 'sandbox' }
  }

  try {
    const res = await fetch(`${PORTONE_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    const json = await res.json() as Record<string, unknown>

    if (!res.ok) {
      const errMsg = (json.message as string) ?? `HTTP ${res.status}`
      return { data: null, error: errMsg }
    }

    return { data: json as T, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

// ─── 결제 검증 (서버사이드) ──────────────────────────────

/**
 * 클라이언트에서 결제 완료 후 paymentId를 받아 서버에서 검증
 * - 결제 금액 위변조 방지 (클라이언트 amount와 PG사 amount 비교)
 */
export async function verifyPortOnePayment(
  paymentId: string,
  expectedAmount: number,
  expectedOrderId: string,
): Promise<PortOnePaymentResult> {
  const { isSandbox } = getPortOneConfig()

  // 샌드박스 모드: 검증 스킵 (개발/테스트용)
  if (isSandbox) {
    console.warn('[PortOne] 샌드박스 — 결제 검증 스킵, orderId:', expectedOrderId)
    return {
      success: true,
      paymentId,
      orderId: expectedOrderId,
      paidAmount: expectedAmount,
      method: 'SANDBOX',
    }
  }

  const { data, error } = await portoneRequest<Record<string, unknown>>(
    `/payments/${encodeURIComponent(paymentId)}`
  )

  if (error || !data) {
    return { success: false, orderId: expectedOrderId, error: error ?? '결제 정보 조회 실패' }
  }

  // 금액 검증 (위변조 탐지)
  const actualAmount = data.amount as { total: number }
  const paidTotal = actualAmount?.total ?? 0

  if (paidTotal !== expectedAmount) {
    console.error(`[PortOne] 금액 불일치! expected=${expectedAmount}, actual=${paidTotal}`)
    return {
      success: false,
      orderId: expectedOrderId,
      error: `결제 금액 불일치 (예상: ${expectedAmount}원, 실제: ${paidTotal}원)`,
    }
  }

  // 주문 ID 검증
  if (data.orderId !== expectedOrderId) {
    return {
      success: false,
      orderId: expectedOrderId,
      error: '주문 ID 불일치',
    }
  }

  // 결제 상태 확인
  if (data.status !== 'PAID') {
    return {
      success: false,
      orderId: expectedOrderId,
      error: `결제 미완료 (상태: ${data.status})`,
    }
  }

  return {
    success: true,
    paymentId,
    orderId: expectedOrderId,
    paidAmount: paidTotal,
    method: data.method as string,
    receiptUrl: data.receiptUrl as string | undefined,
    pgTxId: data.pgTransactionId as string | undefined,
    raw: data,
  }
}

// ─── 결제 취소 ───────────────────────────────────────────

export interface PortOneCancelRequest {
  paymentId: string
  reason: string
  amount?: number       // 부분 취소 시 금액 (원). 없으면 전액 취소
  refundAccount?: {     // 가상계좌 환불 계좌
    bankCode: string
    accountNumber: string
    holderName: string
  }
}

export async function cancelPortOnePayment(
  req: PortOneCancelRequest,
): Promise<{ success: boolean; cancellationId?: string; error?: string }> {
  const { isSandbox } = getPortOneConfig()

  if (isSandbox) {
    return { success: true, cancellationId: `sandbox-cancel-${Date.now()}` }
  }

  const body: Record<string, unknown> = { reason: req.reason }
  if (req.amount)         body.amount = req.amount
  if (req.refundAccount)  body.refundAccount = req.refundAccount

  const { data, error } = await portoneRequest<Record<string, unknown>>(
    `/payments/${encodeURIComponent(req.paymentId)}/cancel`,
    'POST',
    body,
  )

  if (error || !data) {
    return { success: false, error: error ?? '취소 실패' }
  }

  return {
    success: true,
    cancellationId: data.cancellationId as string,
  }
}

// ─── Webhook 서명 검증 ───────────────────────────────────

/**
 * PortOne Webhook 서명 검증
 * https://developers.portone.io/docs/ko/v2-payment/webhook
 */
export async function verifyPortOneWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  const { webhookSecret, isSandbox } = getPortOneConfig()
  if (isSandbox) return true      // 샌드박스는 검증 스킵
  if (!webhookSecret) {
    console.error('[PortOne] PORTONE_WEBHOOK_SECRET 미설정 — Webhook 거부')
    return false
  }

  try {
    // PortOne V2 서명: HMAC-SHA256(rawBody, secret)
    const encoder = new TextEncoder()
    const keyData = encoder.encode(webhookSecret)
    const msgData = encoder.encode(rawBody)

    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, msgData)
    const computed = Buffer.from(sig).toString('hex')

    // 타이밍 어택 방어: 상수 시간 비교
    return timingSafeEqual(computed, signatureHeader)
  } catch {
    return false
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ─── 결제 URL 빌더 ──────────────────────────────────────

/**
 * 프론트엔드 PortOne SDK 초기화 파라미터 생성
 * (클라이언트에 전달할 안전한 정보만 포함)
 */
export function buildPortOneInitParams(req: PortOnePaymentRequest) {
  const { storeId, channelKey, isSandbox } = getPortOneConfig()
  return {
    storeId: isSandbox ? 'store-test-sandbox' : storeId,
    channelKey: isSandbox ? 'channel-key-test' : channelKey,
    paymentId: req.orderId,
    orderName: req.orderName,
    totalAmount: req.amount,
    currency: 'CURRENCY_KRW',
    payMethod: req.payMethod ?? 'CARD',
    customer: req.customer,
    redirectUrl: req.redirectUrl,
    isSandbox,
    metadata: req.metadata,
  }
}

// ─── 주문 ID 생성 ─────────────────────────────────────────

export function generatePortOneOrderId(
  type: 'credit' | 'subscription' | 'service' = 'credit'
): string {
  const prefix = { credit: 'CRD', subscription: 'SUB', service: 'SVC' }[type]
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${ts}-${rand}`
}

// ─── 크레딧 패키지 정의 ──────────────────────────────────

export const CREDIT_PACKAGES = [
  { id: 'credit_10',  credits: 10,  amount: 9_900,   name: '기본 10 크레딧',    badge: null },
  { id: 'credit_30',  credits: 30,  amount: 27_000,  name: '스탠다드 30 크레딧', badge: '10% 할인' },
  { id: 'credit_100', credits: 100, amount: 79_000,  name: '프로 100 크레딧',    badge: '20% 할인' },
  { id: 'credit_300', credits: 300, amount: 199_000, name: '엔터프라이즈 300 크레딧', badge: '32% 할인' },
] as const

export type CreditPackageId = typeof CREDIT_PACKAGES[number]['id']

export function getCreditPackage(id: CreditPackageId) {
  return CREDIT_PACKAGES.find((p) => p.id === id)
}

// ─── 구독 플랜 정의 ──────────────────────────────────────

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: '무료',
    monthlyAmount: 0,
    credits: 5,
    features: ['기본 분석 5회/월', 'NBI 지수 조회'],
  },
  {
    id: 'pro',
    name: '프로',
    monthlyAmount: 49_000,
    credits: 50,
    features: ['분석 50회/월', 'AI 코파일럿', 'PDF 리포트', '포트폴리오 분석'],
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈',
    monthlyAmount: 199_000,
    credits: 300,
    features: ['무제한 분석', 'API 접근', '화이트레이블', '전담 지원'],
  },
] as const

export type SubscriptionPlanId = typeof SUBSCRIPTION_PLANS[number]['id']
