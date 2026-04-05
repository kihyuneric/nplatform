/**
 * lib/webhook-dispatcher.ts
 *
 * NPlatform 아웃바운드 Webhook 발송 시스템
 * - 이벤트 발생 시 등록된 URL로 HTTP POST 발송
 * - HMAC-SHA256 서명 (수신측 검증용)
 * - 자동 재시도 (최대 3회, 지수 백오프)
 * - Supabase webhooks 테이블 기반 구독 관리
 *
 * 지원 이벤트:
 *   deal.created / deal.closed / deal.cancelled
 *   listing.created / listing.sold
 *   analysis.completed
 *   payment.completed / payment.refunded
 *   pipeline.completed
 *   ml_prediction.feedback  (낙찰 결과 → 모델 피드백 루프)
 */

import { createClient } from '@supabase/supabase-js'

// ─── 이벤트 타입 ────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'deal.created',
  'deal.closed',
  'deal.cancelled',
  'listing.created',
  'listing.sold',
  'analysis.completed',
  'payment.completed',
  'payment.refunded',
  'pipeline.completed',
  'ml_prediction.feedback',
] as const

export type WebhookEventType = typeof WEBHOOK_EVENTS[number]

export interface WebhookPayload<T = Record<string, unknown>> {
  /** NPlatform에서 발행한 고유 이벤트 ID */
  id: string
  /** 이벤트 타입 */
  event: WebhookEventType
  /** 이벤트 발생 시각 (ISO 8601) */
  created_at: string
  /** API 버전 */
  api_version: string
  /** 이벤트 데이터 */
  data: T
  /** 서명 (수신측이 secrets.WEBHOOK_SECRET으로 검증) */
  _signature?: string
}

export interface WebhookSubscription {
  id: string
  user_id: string
  url: string
  events: WebhookEventType[]
  secret: string
  is_active: boolean
  created_at: string
}

export interface WebhookDeliveryResult {
  subscriptionId: string
  url: string
  success: boolean
  statusCode?: number
  attemptCount: number
  error?: string
  durationMs: number
}

// ─── 설정 ─────────────────────────────────────────────────

const MAX_RETRIES  = 3
const RETRY_DELAYS = [1000, 5000, 30000]  // 1s, 5s, 30s
const TIMEOUT_MS   = 10_000
const API_VERSION  = '2026-04'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── HMAC-SHA256 서명 생성 ───────────────────────────────

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return 'sha256=' + Buffer.from(sig).toString('hex')
}

// ─── 단일 Webhook 발송 (재시도 포함) ─────────────────────

async function deliverWebhook(
  sub: WebhookSubscription,
  payload: WebhookPayload,
): Promise<WebhookDeliveryResult> {
  const t0 = Date.now()
  let lastError = ''
  let lastStatus = 0

  // 서명 생성
  const body = JSON.stringify(payload)
  const signature = await signPayload(body, sub.secret)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt - 1])
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NPlatform-Event':     payload.event,
          'X-NPlatform-Delivery':  payload.id,
          'X-NPlatform-Signature': signature,
          'X-NPlatform-Timestamp': payload.created_at,
          'User-Agent': 'NPlatform-Webhooks/1.0',
        },
        body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      lastStatus = res.status

      if (res.ok) {
        return {
          subscriptionId: sub.id,
          url: sub.url,
          success: true,
          statusCode: res.status,
          attemptCount: attempt + 1,
          durationMs: Date.now() - t0,
        }
      }

      lastError = `HTTP ${res.status}: ${await res.text().catch(() => '')}`

      // 4xx는 재시도 의미 없음 (수신측 오류)
      if (res.status >= 400 && res.status < 500) break

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if ((err as Error).name === 'AbortError') {
        lastError = `타임아웃 (${TIMEOUT_MS}ms)`
        break
      }
    }
  }

  return {
    subscriptionId: sub.id,
    url: sub.url,
    success: false,
    statusCode: lastStatus || undefined,
    attemptCount: MAX_RETRIES,
    error: lastError,
    durationMs: Date.now() - t0,
  }
}

// ─── 이벤트 발행 (메인 API) ───────────────────────────────

/**
 * 이벤트를 구독 중인 모든 Webhook으로 발송
 *
 * @example
 * await dispatchWebhook('deal.closed', {
 *   deal_id: 'xxx',
 *   amount: 500000000,
 *   buyer_id: 'yyy',
 * })
 */
export async function dispatchWebhook<T extends Record<string, unknown> = Record<string, unknown>>(
  event: WebhookEventType,
  data: T,
  options?: {
    /** 특정 사용자의 구독만 발송 */
    userId?: string
    /** 이미 생성된 이벤트 ID (중복 발송 방지) */
    eventId?: string
  }
): Promise<WebhookDeliveryResult[]> {
  const supabase = getSupabaseAdmin()

  // DB에서 구독 조회
  let subscriptions: WebhookSubscription[] = []
  if (supabase) {
    let query = supabase
      .from('webhooks')
      .select('id, user_id, url, events, secret, is_active, created_at')
      .eq('is_active', true)
      .contains('events', [event])

    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    const { data: rows, error } = await query
    if (error) {
      console.error('[Webhook] 구독 조회 실패:', error.message)
    } else {
      subscriptions = (rows as WebhookSubscription[]) ?? []
    }
  }

  if (subscriptions.length === 0) {
    return []
  }

  // 페이로드 구성
  const eventId = options?.eventId ?? generateEventId()
  const payload: WebhookPayload<T> = {
    id: eventId,
    event,
    created_at: new Date().toISOString(),
    api_version: API_VERSION,
    data,
  }

  console.log(`[Webhook] 발송: event=${event}, id=${eventId}, subscribers=${subscriptions.length}`)

  // 모든 구독자에게 병렬 발송
  const results = await Promise.all(
    subscriptions.map((sub) => deliverWebhook(sub, payload))
  )

  // 발송 결과 DB 저장
  if (supabase) {
    const logs = results.map((r) => ({
      webhook_id: r.subscriptionId,
      event_id: eventId,
      event_type: event,
      url: r.url,
      success: r.success,
      status_code: r.statusCode ?? null,
      attempt_count: r.attemptCount,
      error_message: r.error ?? null,
      duration_ms: r.durationMs,
      delivered_at: new Date().toISOString(),
    }))

    supabase
      .from('webhook_deliveries')
      .insert(logs)
      .then(({ error }) => {
        if (error) console.error('[Webhook] 배송 로그 저장 실패:', error.message)
      })

    // 실패한 구독은 consecutive_failures 카운터 증가
    const failed = results.filter((r) => !r.success)
    for (const f of failed) {
      supabase
        .from('webhooks')
        .update({ consecutive_failures: supabase.rpc('increment', { x: 1 }) })
        .eq('id', f.subscriptionId)
        .then(() => {})
    }
  }

  const successCount = results.filter((r) => r.success).length
  console.log(`[Webhook] 완료: ${successCount}/${results.length} 성공`)

  return results
}

// ─── 도메인별 편의 함수 ──────────────────────────────────

export async function notifyDealClosed(dealId: string, amount: number, buyerId: string) {
  return dispatchWebhook('deal.closed', { deal_id: dealId, amount, buyer_id: buyerId })
}

export async function notifyAnalysisCompleted(
  analysisId: string,
  userId: string,
  summary: Record<string, unknown>
) {
  return dispatchWebhook('analysis.completed', { analysis_id: analysisId, summary }, { userId })
}

export async function notifyPaymentCompleted(
  orderId: string,
  amount: number,
  userId: string,
  productType: 'CREDIT' | 'SUBSCRIPTION' | 'SERVICE'
) {
  return dispatchWebhook('payment.completed', { order_id: orderId, amount, product_type: productType }, { userId })
}

export async function notifyPipelineCompleted(
  runId: string,
  mode: string,
  summary: Record<string, unknown>
) {
  return dispatchWebhook('pipeline.completed', { run_id: runId, mode, summary })
}

/**
 * 낙찰 결과 → ML 예측 피드백 루프
 * 경매 완결 후 실제 낙찰가율을 모델에 피드백하여 MAPE 계산
 */
export async function notifyMLPredictionFeedback(
  predictionId: string,
  actualBidRatio: number,
  actualBidPrice: number,
) {
  return dispatchWebhook('ml_prediction.feedback', {
    prediction_id: predictionId,
    actual_bid_ratio: actualBidRatio,
    actual_bid_price: actualBidPrice,
    feedback_at: new Date().toISOString(),
  })
}

// ─── 유틸리티 ────────────────────────────────────────────

function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Webhook 관리 API 헬퍼 ───────────────────────────────

/** 새 Webhook 구독 등록 */
export async function registerWebhook(params: {
  userId: string
  url: string
  events: WebhookEventType[]
}): Promise<{ id: string; secret: string } | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  // 랜덤 시크릿 생성 (수신측이 서명 검증에 사용)
  const secret = generateWebhookSecret()

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: params.userId,
      url: params.url,
      events: params.events,
      secret,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Webhook] 등록 실패:', error.message)
    return null
  }

  return { id: data.id, secret }
}

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'whsec_' + Buffer.from(bytes).toString('base64url')
}

/** 수신측 서명 검증 예제 코드 생성 */
export function getVerificationCode(secret: string, language: 'js' | 'python' | 'php' = 'js'): string {
  const examples: Record<string, string> = {
    js: `
const crypto = require('crypto')
function verifyWebhook(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
}`,
    python: `
import hmac, hashlib
def verify_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)`,
    php: `
function verifyWebhook(string $rawBody, string $signature, string $secret): bool {
    $expected = 'sha256=' . hash_hmac('sha256', $rawBody, $secret);
    return hash_equals($expected, $signature);
}`,
  }
  return examples[language] ?? examples.js
}
