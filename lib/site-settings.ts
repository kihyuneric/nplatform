// Client-side: fetch site settings with cache
let cachedSettings: any = null
let cacheTime = 0

export async function getSiteSettings() {
  if (cachedSettings && Date.now() - cacheTime < 60000) return cachedSettings
  try {
    const res = await fetch('/api/v1/admin/site-settings')
    const { data } = await res.json()
    cachedSettings = data
    cacheTime = Date.now()
    return data
  } catch {
    return {
      contactPhone: '02-1234-5678',
      contactEmail: 'support@nplatform.co.kr',
      operatingHours: '평일 09:00 - 18:00',
      companyName: 'NPLatform 주식회사',
      businessNumber: '123-45-67890',
      ceoName: '대표자명',
      companyAddress: '서울특별시 강남구 테헤란로 123',
    }
  }
}
