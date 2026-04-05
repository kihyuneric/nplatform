"use client"

interface TrackEvent {
  type: 'page_view' | 'listing_view' | 'search' | 'click' | 'deal_action' | 'time_spent'
  data: Record<string, any>
  timestamp: number
  userId?: string
  sessionId: string
}

let sessionId = ''
if (typeof window !== 'undefined') {
  sessionId = sessionStorage.getItem('npl_session') || `s_${Date.now().toString(36)}_${Math.random().toString(36).substring(2,8)}`
  sessionStorage.setItem('npl_session', sessionId)
}

const eventQueue: TrackEvent[] = []
let flushTimer: any = null

export function track(type: TrackEvent['type'], data: Record<string, any> = {}) {
  eventQueue.push({ type, data, timestamp: Date.now(), sessionId })
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 5000) // Batch every 5s
  }
}

async function flushEvents() {
  if (eventQueue.length === 0) return
  const batch = [...eventQueue]
  eventQueue.length = 0
  flushTimer = null

  try {
    await fetch('/api/v1/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    })
  } catch {} // Silent fail
}

// Convenience trackers
export function trackPageView(path: string) { track('page_view', { path }) }
export function trackListingView(listingId: string, duration?: number) { track('listing_view', { listingId, duration }) }
export function trackSearch(query: string, filters: Record<string, any>, resultCount: number) { track('search', { query, filters, resultCount }) }
export function trackDealAction(dealId: string, action: string) { track('deal_action', { dealId, action }) }
