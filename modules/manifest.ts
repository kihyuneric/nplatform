export interface ModuleConfig {
  name: string
  version: string
  description: string
  enabled: boolean
  routes: string[]
  adminPages: string[]
  apiRoutes: string[]
  dependencies: string[]
}

export const MODULES: Record<string, ModuleConfig> = {
  exchange: {
    name: 'NPL 딜 브릿지',
    version: '2.0.0',
    description: 'NPL 매물 등록, 거래, 실사, 계약 관리',
    enabled: true,
    routes: ['/exchange', '/exchange/*', '/listings', '/listings/*', '/market/*'],
    adminPages: ['/admin/listings', '/admin/listings/review', '/admin/cases'],
    apiRoutes: ['/api/v1/exchange/*', '/api/v1/listings/*', '/api/v1/market/*'],
    dependencies: [],
  },
  professional: {
    name: '전문 서비스',
    version: '1.0.0',
    description: '법률/세무/감정 전문가 마켓플레이스',
    enabled: true,
    routes: ['/professional', '/professional/*'],
    adminPages: ['/admin/professionals'],
    apiRoutes: ['/api/v1/professional/*', '/api/v1/professionals/*'],
    dependencies: [],
  },
  partner: {
    name: '파트너 시스템',
    version: '1.0.0',
    description: '추천코드, 수익쉐어, 정산',
    enabled: true,
    routes: ['/partner', '/partner/*'],
    adminPages: ['/admin/partners', '/admin/partners/settlements'],
    apiRoutes: ['/api/v1/partner/*', '/api/v1/referrals/*'],
    dependencies: [],
  },
  billing: {
    name: '과금/결제',
    version: '1.0.0',
    description: '구독, 크레딧, 수수료, PG 연동',
    enabled: true,
    routes: ['/settings/billing', '/settings/payment/*'],
    adminPages: ['/admin/pricing'],
    apiRoutes: ['/api/v1/billing/*', '/api/v1/payments/*', '/api/v1/credits/*'],
    dependencies: [],
  },
  ai: {
    name: 'AI 기능',
    version: '1.0.0',
    description: 'AI 분석, OCR, 매칭, 챗봇, 자연어 검색',
    enabled: true,
    routes: ['/npl-analysis', '/tools/ocr', '/tools/due-diligence-report'],
    adminPages: [],
    apiRoutes: ['/api/v1/ai/*', '/api/v1/ocr/*'],
    dependencies: [],
  },
  community: {
    name: '커뮤니티',
    version: '1.0.0',
    description: '투자자 커뮤니티 게시판',
    enabled: true,
    routes: ['/community', '/community/*'],
    adminPages: [],
    apiRoutes: ['/api/v1/community/*'],
    dependencies: [],
  },
  knowledge: {
    name: '지식센터',
    version: '1.0.0',
    description: '교육과정, 용어사전',
    enabled: true,
    routes: ['/knowledge', '/knowledge/*'],
    adminPages: ['/admin/courses', '/admin/glossary'],
    apiRoutes: ['/api/v1/courses/*', '/api/v1/glossary/*'],
    dependencies: [],
  },
  intelligence: {
    name: '시장 인텔리전스',
    version: '1.0.0',
    description: '시장 분석, 통계, 뉴스',
    enabled: true,
    routes: ['/market-intelligence', '/statistics', '/statistics/*', '/news', '/news/*'],
    adminPages: ['/admin/news'],
    apiRoutes: ['/api/v1/intelligence/*', '/api/v1/statistics/*'],
    dependencies: [],
  },
  tenant: {
    name: 'SaaS 멀티테넌시',
    version: '1.0.0',
    description: '기관별 독립 운영, 기능 토글',
    enabled: true,
    routes: ['/institution', '/institution/*'],
    adminPages: ['/admin/tenants', '/admin/tenants/*', '/admin/security/masking'],
    apiRoutes: ['/api/v1/institution/*', '/api/v1/institutions/*'],
    dependencies: [],
  },
  auth: {
    name: '인증/인가',
    version: '1.0.0',
    description: '회원가입, 로그인, MFA, 역할 관리',
    enabled: true,
    routes: ['/login', '/signup', '/dev-login', '/mfa-setup', '/mfa-verify', '/pending-approval'],
    adminPages: ['/admin/users', '/admin/approvals', '/admin/kyc'],
    apiRoutes: ['/api/v1/auth/*', '/api/v1/roles/*', '/api/v1/users/*'],
    dependencies: [],
  },
  legal: {
    name: '법률/규제',
    version: '1.0.0',
    description: '면책 조항, 이용약관, 규제 준수',
    enabled: true,
    routes: ['/terms/*', '/about'],
    adminPages: [],
    apiRoutes: [],
    dependencies: [],
  },
  notification: {
    name: '알림',
    version: '1.0.0',
    description: '실시간 알림, 푸시, 이메일',
    enabled: true,
    routes: ['/notifications'],
    adminPages: [],
    apiRoutes: ['/api/v1/notifications/*'],
    dependencies: [],
  },
}

// Get all enabled modules
export function getEnabledModules(): ModuleConfig[] {
  return Object.values(MODULES).filter(m => m.enabled)
}

// Check if a route belongs to an enabled module
export function isRouteEnabled(pathname: string): boolean {
  for (const mod of Object.values(MODULES)) {
    if (!mod.enabled) {
      const matches = mod.routes.some(r => {
        if (r.endsWith('/*')) return pathname.startsWith(r.slice(0, -2))
        return pathname === r
      })
      if (matches) return false
    }
  }
  return true
}

// Get module by route
export function getModuleForRoute(pathname: string): ModuleConfig | null {
  for (const mod of Object.values(MODULES)) {
    const matches = mod.routes.some(r => {
      if (r.endsWith('/*')) return pathname.startsWith(r.slice(0, -2))
      return pathname === r
    })
    if (matches) return mod
  }
  return null
}
