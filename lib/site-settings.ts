// Client-side: fetch site settings with cache
let cachedSettings: any = null
let cacheTime = 0

export const DEFAULT_SITE_SETTINGS = {
  siteName: 'NPLatform',
  siteDescription: '금융기관과 투자자를 직접 연결하는 NPL 거래 플랫폼',
  contactPhone: '02-555-2822',
  contactEmail: 'ceo@transfarmer.co.kr',
  dpoName: '박성필',
  dpoEmail: 'sp.park@transfarmer.co.kr',
  operatingHours: '평일 09:00 - 18:00 (공휴일 휴무)',
  companyName: '트랜스파머(주) | TransFarmer Inc.',
  companyNameKo: '트랜스파머(주)',
  companyNameEn: 'TransFarmer Inc.',
  businessNumber: '507-87-02631',
  ceoName: '박성필',
  companyAddress: '서울 마포구 백범로31길 21, 서울창업허브 별관 108호',
  companyAddress2: '서울 종로구 서린동 154-1, 스타트업빌리지 5층',
} as const

export async function getSiteSettings() {
  if (cachedSettings && Date.now() - cacheTime < 60000) return cachedSettings
  try {
    const res = await fetch('/api/v1/admin/site-settings')
    const { data } = await res.json()
    cachedSettings = data
    cacheTime = Date.now()
    return data
  } catch {
    return { ...DEFAULT_SITE_SETTINGS }
  }
}
