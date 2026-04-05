"use client"

/**
 * Prevent same account from logging in on multiple devices/tabs simultaneously
 * Uses a session token stored in DB + localStorage
 */

export function generateSessionToken(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`
}

export function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('npl_session_token')
}

export function storeSessionToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('npl_session_token', token)
}

/**
 * Check if current session is still valid
 * Called periodically to detect if another device logged in
 */
export async function validateSession(): Promise<{ valid: boolean; reason?: string }> {
  const token = getStoredSessionToken()
  if (!token) return { valid: false, reason: 'NO_TOKEN' }

  try {
    const res = await fetch('/api/v1/auth/validate-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token }),
    })
    const data = await res.json()
    return data
  } catch {
    return { valid: true } // Network error — don't kick out
  }
}

/**
 * Start periodic session validation (every 60 seconds)
 */
export function startSessionGuard(onInvalidated: () => void) {
  const interval = setInterval(async () => {
    const result = await validateSession()
    if (!result.valid && result.reason === 'SESSION_REPLACED') {
      clearInterval(interval)
      onInvalidated()
    }
  }, 60000)

  return () => clearInterval(interval)
}
