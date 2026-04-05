export interface RequestContext {
  userId?: string
  role?: string
  ip: string
  userAgent: string
  timestamp: number
}

export function validateRequest(ctx: RequestContext): { allowed: boolean; reason?: string } {
  // Check timestamp (prevent replay attacks — 5 min window)
  if (Date.now() - ctx.timestamp > 5 * 60 * 1000) {
    return { allowed: false, reason: 'REQUEST_EXPIRED' }
  }

  // Check suspicious patterns
  if (!ctx.userAgent || ctx.userAgent.length < 10) {
    return { allowed: false, reason: 'INVALID_USER_AGENT' }
  }

  return { allowed: true }
}

// IP-based anomaly detection
const recentIPs = new Map<string, { count: number; firstSeen: number }>()

export function checkIPAnomaly(userId: string, ip: string): { suspicious: boolean; reason?: string } {
  const key = `${userId}:${ip}`
  const now = Date.now()
  const record = recentIPs.get(key)

  if (!record) {
    recentIPs.set(key, { count: 1, firstSeen: now })
    return { suspicious: false }
  }

  record.count++

  // More than 100 requests from same IP in 1 minute
  if (record.count > 100 && now - record.firstSeen < 60000) {
    return { suspicious: true, reason: 'HIGH_FREQUENCY' }
  }

  return { suspicious: false }
}

// Content Security Policy nonce generator
export function generateCSPNonce(): string {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array)
  }
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}
