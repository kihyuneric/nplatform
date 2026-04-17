"use client"

// ─── NPL 거래 퍼널 이벤트 트래커 ─────────────────────────
// GA4 + Mixpanel + 내부 배치 API 동시 전송.
// 퍼널: VIEW → NDA → LOI → CONTRACT → SETTLED
//
// 환경변수:
//   NEXT_PUBLIC_GA4_MEASUREMENT_ID  — G-XXXXXXXXXX
//   NEXT_PUBLIC_MIXPANEL_TOKEN      — 32-char hex

// ─── 이벤트 타입 정의 ─────────────────────────────────────
export type FunnelEvent =
  | "listing_viewed"         // VIEW
  | "listing_bookmarked"
  | "nda_initiated"          // NDA
  | "nda_signed"
  | "loi_submitted"          // LOI
  | "loi_accepted"
  | "due_diligence_started"
  | "due_diligence_completed"
  | "contract_signed"        // CONTRACT
  | "escrow_funded"
  | "milestone_completed"
  | "deal_settled"           // SETTLED

export type EngagementEvent =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "tier_upgraded"
  | "credit_purchased"
  | "ai_analysis_run"
  | "copilot_question"
  | "keyword_alert_created"
  | "expert_consulted"
  | "community_post_created"
  | "search_performed"

// 하위 호환: 기존 type 필드
export type LegacyEventType = "page_view" | "listing_view" | "search" | "click" | "deal_action" | "time_spent"

export type AllEventType = FunnelEvent | EngagementEvent | LegacyEventType

export interface EventProperties {
  listing_id?: string
  deal_id?: string
  source?: "COURT" | "DEAL"
  property_type?: string
  region?: string
  price?: number
  tier?: string
  risk_grade?: string
  milestone_name?: string
  credit_amount?: number
  query?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface TrackEvent {
  type: AllEventType
  data: EventProperties
  timestamp: number
  userId?: string
  sessionId: string
}

// ─── Session ──────────────────────────────────────────
let sessionId = ""
if (typeof window !== "undefined") {
  sessionId =
    sessionStorage.getItem("npl_session") ||
    `s_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
  sessionStorage.setItem("npl_session", sessionId)
}

// ─── Internal batch queue ──────────────────────────────
const eventQueue: TrackEvent[] = []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let flushTimer: any = null

async function flushEvents() {
  if (eventQueue.length === 0) return
  const batch = [...eventQueue]
  eventQueue.length = 0
  flushTimer = null

  try {
    await fetch("/api/v1/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    })
  } catch {
    // Silent fail — analytics should never break UX
  }
}

// ─── GA4 sender ────────────────────────────────────────
function sendGA4(event: string, params: EventProperties) {
  if (typeof window === "undefined") return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (!w.gtag) return
  w.gtag("event", event, {
    ...params,
    send_to: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  })
}

// ─── Mixpanel sender ───────────────────────────────────
function sendMixpanel(event: string, params: EventProperties) {
  if (typeof window === "undefined") return
  const w = window as unknown as { mixpanel?: { track: (e: string, p: unknown) => void } }
  if (!w.mixpanel) return
  w.mixpanel.track(event, {
    ...params,
    timestamp: new Date().toISOString(),
  })
}

// ─── Unified Track ──────────────────────────────────────
export function track(type: AllEventType, data: EventProperties = {}) {
  // 1. Internal batch queue
  eventQueue.push({ type, data, timestamp: Date.now(), sessionId })
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 5000)
  }
  // 2. GA4
  sendGA4(type, data)
  // 3. Mixpanel
  sendMixpanel(type, data)
  // 4. Dev console
  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${type}`, data)
  }
}

// ─── Identify (로그인 시) ──────────────────────────────
export function identify(userId: string, traits: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return

  // GA4 user_id
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (w.gtag) {
    w.gtag("config", process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID, { user_id: userId })
  }

  // Mixpanel identify
  const mx = window as unknown as {
    mixpanel?: {
      identify: (id: string) => void
      people: { set: (t: Record<string, unknown>) => void }
    }
  }
  if (mx.mixpanel) {
    mx.mixpanel.identify(userId)
    mx.mixpanel.people.set({ ...traits, last_seen: new Date().toISOString() })
  }
}

// ─── Convenience trackers (하위 호환) ───────────────────
export function trackPageView(path: string) { track("page_view", { path }) }
export function trackListingView(listingId: string, duration?: number) { track("listing_viewed", { listing_id: listingId, duration }) }
export function trackSearch(query: string, filters: EventProperties, resultCount: number) { track("search_performed", { query, ...filters, resultCount }) }
export function trackDealAction(dealId: string, action: string) { track("deal_action" as AllEventType, { deal_id: dealId, action }) }

// ─── 퍼널 단계 정의 (대시보드 세팅 참조) ──────────────────
export const FUNNEL_STAGES: { event: FunnelEvent; label: string; description: string }[] = [
  { event: "listing_viewed",    label: "VIEW",     description: "매물 상세 페이지 조회" },
  { event: "nda_signed",        label: "NDA",      description: "비밀유지계약 전자서명 완료" },
  { event: "loi_submitted",     label: "LOI",      description: "투자의향서 제출" },
  { event: "contract_signed",   label: "CONTRACT", description: "매매계약 전자서명 완료" },
  { event: "deal_settled",      label: "SETTLED",  description: "에스크로 정산 완료" },
]

// GA4 Script Snippet (layout.tsx <head>에 삽입)
export const GA4_SCRIPT_SRC = "https://www.googletagmanager.com/gtag/js"
export const GA4_INIT_SCRIPT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%GA4_ID%');
`

// Mixpanel Funnel 설정 (Dashboard > Funnels에서 import)
export const MIXPANEL_FUNNEL_CONFIG = {
  name: "NPL 거래 퍼널",
  steps: [
    { event: "listing_viewed" },
    { event: "nda_signed" },
    { event: "loi_submitted" },
    { event: "contract_signed" },
    { event: "deal_settled" },
  ],
  window: { value: 90, unit: "day" },
}
