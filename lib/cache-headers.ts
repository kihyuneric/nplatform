export function publicCacheHeaders(maxAge: number = 60) {
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
  }
}

export function privateCacheHeaders(maxAge: number = 0) {
  return {
    'Cache-Control': `private, no-cache, no-store, must-revalidate`,
  }
}

export function listingCacheHeaders() {
  return publicCacheHeaders(60) // 1 minute for listing pages
}

export function staticCacheHeaders() {
  return publicCacheHeaders(3600) // 1 hour for static content
}
