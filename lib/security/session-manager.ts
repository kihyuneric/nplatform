"use client"

// ─── 세션 관리 (유휴 타임아웃 + 동시 세션 제한) ────────

const IDLE_TIMEOUT = 15 * 60 * 1000 // 15분
const WARNING_BEFORE = 2 * 60 * 1000 // 만료 2분 전 경고

type SessionCallback = () => void

let idleTimer: ReturnType<typeof setTimeout> | null = null
let warningTimer: ReturnType<typeof setTimeout> | null = null
let onTimeout: SessionCallback | null = null
let onWarning: SessionCallback | null = null

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"]

function resetTimers() {
  if (idleTimer) clearTimeout(idleTimer)
  if (warningTimer) clearTimeout(warningTimer)

  warningTimer = setTimeout(() => {
    onWarning?.()
  }, IDLE_TIMEOUT - WARNING_BEFORE)

  idleTimer = setTimeout(() => {
    onTimeout?.()
  }, IDLE_TIMEOUT)
}

function handleActivity() {
  resetTimers()
}

/**
 * 세션 타임아웃 모니터링 시작
 */
export function startSessionMonitor(callbacks: {
  onTimeout: SessionCallback
  onWarning?: SessionCallback
}) {
  if (typeof window === "undefined") return

  onTimeout = callbacks.onTimeout
  onWarning = callbacks.onWarning || null

  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true })
  })

  resetTimers()
}

/**
 * 세션 타임아웃 모니터링 중지
 */
export function stopSessionMonitor() {
  if (typeof window === "undefined") return

  if (idleTimer) clearTimeout(idleTimer)
  if (warningTimer) clearTimeout(warningTimer)

  ACTIVITY_EVENTS.forEach((event) => {
    window.removeEventListener(event, handleActivity)
  })

  onTimeout = null
  onWarning = null
}

/**
 * 세션 활성 상태 유지 (수동 리셋)
 */
export function keepAlive() {
  resetTimers()
}

/**
 * 탭 가시성 변화 감지 (백그라운드 탭 → 포그라운드 복귀 시 세션 확인)
 */
export function setupVisibilityCheck(onVisible: SessionCallback) {
  if (typeof document === "undefined") return

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      onVisible()
    }
  })
}
