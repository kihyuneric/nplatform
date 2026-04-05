export interface ExternalDataConfig {
  realEstateApiUrl: string  // 부동산 데이터 서비스 URL
  realEstateApiKey: string
  newsApiUrl: string        // 뉴스 API URL
  auctionApiUrl: string     // 경매 데이터 URL
}

// Read from env or admin settings
export function getExternalConfig(): ExternalDataConfig {
  return {
    realEstateApiUrl: process.env.EXTERNAL_REALESTATE_API || '',
    realEstateApiKey: process.env.EXTERNAL_REALESTATE_KEY || '',
    newsApiUrl: process.env.EXTERNAL_NEWS_API || '',
    auctionApiUrl: process.env.EXTERNAL_AUCTION_API || '',
  }
}

// Fetch with timeout and error handling
export async function fetchExternal(url: string, options?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    if (!res.ok) throw new Error(`External API error: ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

// Check if an external API is configured
export function isConfigured(url: string): boolean {
  return url !== '' && url !== undefined
}
