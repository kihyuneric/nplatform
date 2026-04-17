/**
 * NPLatform Service Worker v6
 *
 * Cache strategies:
 *   - Static assets (_next/static/**): Cache-First (immutable, 1 year)
 *   - Fonts/images:                   Cache-First (1 year)
 *   - API reads (GET /api/v1/*):       Network-First → SWR fallback (5 min TTL)
 *   - Page navigations:               Stale-While-Revalidate
 *   - Offline fallback:               /offline page served when network unavailable
 */

const CACHE_STATIC   = 'nplatform-static-v6'   // immutable Next.js chunks
const CACHE_DYNAMIC  = 'nplatform-dynamic-v6'  // pages (SWR)
const CACHE_API      = 'nplatform-api-v6'       // cacheable GET APIs
const CACHE_ASSETS   = 'nplatform-assets-v6'   // fonts, images

const ALL_CACHES = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_API, CACHE_ASSETS]

const PRECACHE_URLS = [
  '/',
  '/exchange',
  '/analysis',
  '/offline',
  '/favicon.ico',
  '/favicon.png',
  '/manifest.json',
]

// API TTL: 5 minutes
const API_CACHE_MAX_AGE = 5 * 60 * 1000

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] precache partial failure:', err)
      })
    )
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => {
            console.log('[SW] deleting old cache:', k)
            return caches.delete(k)
          })
      )
    )
  )
  self.clients.claim()
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Cache-First: serve cached; fetch + update cache in background if miss */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

/** Network-First: try network; fall back to cache; use offline page for navigate */
async function networkFirst(request, cacheName, offlineFallback) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (offlineFallback) return caches.match('/offline') ?? new Response('Offline', { status: 503 })
    return new Response('Network error', { status: 503 })
  }
}

/** Stale-While-Revalidate: serve cache immediately; refresh in background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached ?? fetchPromise
}

/** API cache with TTL check */
async function apiCacheWithTTL(request) {
  const cache = await caches.open(CACHE_API)
  const cached = await cache.match(request)

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at')
    if (cachedDate && Date.now() - Number(cachedDate) < API_CACHE_MAX_AGE) {
      return cached
    }
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Inject cache timestamp header
      const headers = new Headers(response.headers)
      headers.set('sw-cached-at', String(Date.now()))
      const timestamped = new Response(await response.blob(), { status: response.status, headers })
      cache.put(request, timestamped)
      return timestamped
    }
    return response
  } catch {
    return cached ?? new Response(JSON.stringify({ ok: false, error: { code: 'OFFLINE' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and non-http(s)
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Skip Supabase / 3rd-party requests
  if (!url.hostname.includes('localhost') && !url.hostname.includes('nplatform')) return

  // 1. Next.js immutable static chunks → Cache-First (forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC))
    return
  }

  // 2. Next.js image optimization → Cache-First (30 days)
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(cacheFirst(request, CACHE_ASSETS))
    return
  }

  // 3. Fonts, images, icons → Cache-First
  if (url.pathname.match(/\.(woff2?|ttf|otf|eot|png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    event.respondWith(cacheFirst(request, CACHE_ASSETS))
    return
  }

  // 4. Cacheable API reads (exchange list, stats, analysis) → API TTL cache
  const CACHEABLE_API_PREFIXES = [
    '/api/v1/exchange',
    '/api/v1/stats',
    '/api/openapi',
  ]
  if (CACHEABLE_API_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(apiCacheWithTTL(request))
    return
  }

  // 5. All other /api/* → Network-First (no cache for auth/write APIs)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_API, false))
    return
  }

  // 6. Page navigations → Stale-While-Revalidate (fast load + fresh content)
  if (request.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(request, CACHE_DYNAMIC).catch(async () => {
        const offline = await caches.match('/offline')
        return offline ?? new Response('Offline', { status: 503 })
      })
    )
    return
  }

  // 7. Default: network-first
  event.respondWith(networkFirst(request, CACHE_DYNAMIC, false))
})

// ── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'SYNC_NOTIFICATIONS' }))
      })
    )
  }
})

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'NPLatform', body: event.data.text() }
  }

  const { title = 'NPLatform', body, icon, badge, url, tag, type } = payload

  // 알림 유형별 아이콘/색상 지원 (딜·매칭·KYC 등)
  const notifIcon = icon || '/favicon.png'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: notifIcon,
      badge: badge || '/favicon.png',
      tag: tag || 'nplatform-default',
      data: { url: url || '/', type },
      vibrate: type === 'deal_update' ? [300, 100, 300] : [200, 100, 200],
      actions: [
        { action: 'open',    title: '열기' },
        { action: 'dismiss', title: '닫기' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(new URL(url, self.location.origin).pathname) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// ── Message handler (invalidate API cache on demand) ─────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'INVALIDATE_CACHE') {
    const cacheName = event.data.cache || CACHE_API
    caches.delete(cacheName).then(() => {
      event.source?.postMessage({ type: 'CACHE_INVALIDATED', cache: cacheName })
    })
  }
})
