"use client"

type EventHandler = (data: any) => void
const handlers = new Map<string, Set<EventHandler>>()

export const EventBus = {
  on(event: string, handler: EventHandler) {
    if (!handlers.has(event)) handlers.set(event, new Set())
    handlers.get(event)!.add(handler)
    return () => handlers.get(event)?.delete(handler)
  },

  emit(event: string, data?: any) {
    handlers.get(event)?.forEach(h => h(data))
  },

  off(event: string, handler: EventHandler) {
    handlers.get(event)?.delete(handler)
  },
}

// Pre-defined events
export const EVENTS = {
  DEAL_CREATED: 'deal:created',
  DEAL_STAGE_CHANGED: 'deal:stage_changed',
  LISTING_CREATED: 'listing:created',
  LISTING_APPROVED: 'listing:approved',
  MESSAGE_RECEIVED: 'message:received',
  OFFER_SUBMITTED: 'offer:submitted',
  NOTIFICATION_NEW: 'notification:new',
  CREDIT_CHANGED: 'credit:changed',
  USER_ROLE_CHANGED: 'user:role_changed',
  LOCALE_CHANGED: 'locale:changed',
} as const
