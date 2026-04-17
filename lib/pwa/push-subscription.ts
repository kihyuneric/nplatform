// ─── PWA 푸시 구독 관리 ─────────────────────────────────────
// Service Worker 등록 + Push 구독 + 서버 동기화.

const SW_PATH = "/sw.js"

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" })
    return reg
  } catch {
    return null
  }
}

export async function subscribePush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })
    return sub
  } catch {
    return null
  }
}

export async function unsubscribePush(
  registration: ServiceWorkerRegistration,
): Promise<boolean> {
  try {
    const sub = await registration.pushManager.getSubscription()
    if (!sub) return true
    return await sub.unsubscribe()
  } catch {
    return false
  }
}

export async function syncSubscriptionToServer(
  subscription: PushSubscription,
  userId: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/notifications/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
          auth: arrayBufferToBase64(subscription.getKey("auth")),
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── 유틸 ────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0))
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ""
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
