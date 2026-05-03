/**
 * 외부 연동 통합 Registry (SSoT)
 *
 * NPLatform 의 모든 외부 API/서비스 연동 지점을 단일 위치에서 관리.
 * 관리자 페이지 (/admin/integrations) 와 docs/INTEGRATIONS.md 의 SSoT.
 *
 * 사용자 정책 (2026-05-03):
 *   - 개발자는 ENV 만 등록하면 즉시 LIVE 전환
 *   - 미등록 시 MOCK 또는 graceful fallback (서비스 중단 X)
 *   - 비용 우선: Google Cloud > DeepL Free > MyMemory > unofficial
 */

export type IntegrationStatus = 'LIVE' | 'MOCK' | 'MISSING'

export type IntegrationCategory =
  | 'Translation'
  | 'AI/LLM'
  | 'Embeddings'
  | 'OCR'
  | 'Payment'
  | 'RealEstate'
  | 'AuctionData'
  | 'Maps'
  | 'Auth'
  | 'Storage'
  | 'Cache'
  | 'Communications'
  | 'Verification'
  | 'Cron'

export interface Integration {
  /** 연동명 (사용자 표시) */
  name: string
  /** 카테고리 */
  category: IntegrationCategory
  /** 우선순위 — 같은 카테고리 내 fallback 순서 (낮을수록 우선) */
  priority?: number
  /** 현재 상태 */
  status: IntegrationStatus
  /** 필수 환경변수 (모두 등록되어야 LIVE) */
  envVars: string[]
  /** 코드 사용처 — 가장 중요한 파일 3개까지 */
  primaryFiles: string[]
  /** 비용 (예: $0.02/1M chars) */
  cost?: string
  /** 공급사 문서 URL */
  docsUrl?: string
  /** 가입/발급 URL */
  signupUrl?: string
  /** 추가 설명 */
  notes: string
  /** 의존: 이 연동이 동작하려면 미리 필요한 다른 연동 (env var 이름) */
  dependsOn?: string[]
}

export const INTEGRATIONS: Integration[] = [
  // ── Translation ───────────────────────────────────────────
  {
    name: 'Google Cloud Translation v2',
    category: 'Translation',
    priority: 1,
    status: 'MISSING',  // ENV 등록 시 LIVE 자동 전환
    envVars: ['GOOGLE_TRANSLATE_API_KEY'],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: '$0.02 / 1M chars (가장 저렴)',
    docsUrl: 'https://cloud.google.com/translate/docs/setup',
    signupUrl: 'https://console.cloud.google.com/apis/library/translate.googleapis.com',
    notes: '4단계 폴백 1차 · 한·영·일 고품질 · 사이트 전반 자동 번역 (AutoTranslateProvider)',
  },
  {
    name: 'DeepL Free API',
    category: 'Translation',
    priority: 2,
    status: 'MISSING',
    envVars: ['DEEPL_API_KEY'],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: '500k chars/월 무료 → 그 이상 $5.49/M',
    docsUrl: 'https://www.deepl.com/docs-api',
    signupUrl: 'https://www.deepl.com/pro-api',
    notes: '자연스러운 번역 · Google 다음 폴백',
  },
  {
    name: 'MyMemory',
    category: 'Translation',
    priority: 3,
    status: 'LIVE',  // ENV 불필요
    envVars: [],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: '5,000 chars/일/IP 무료',
    docsUrl: 'https://mymemory.translated.net/doc/spec.php',
    notes: 'API key 불필요 · 일일 한도 있음 · 3차 폴백',
  },
  {
    name: 'Google Translate (비공식)',
    category: 'Translation',
    priority: 4,
    status: 'LIVE',
    envVars: [],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: '무료 (rate-limit 가능)',
    notes: '4차 폴백 · 검증 강화로 깨진 응답 차단',
  },

  // ── AI/LLM ────────────────────────────────────────────────
  {
    name: 'Anthropic Claude',
    category: 'AI/LLM',
    priority: 1,
    status: 'MISSING',
    envVars: ['ANTHROPIC_API_KEY'],
    primaryFiles: [
      'app/api/v1/copilot/route.ts',
      'app/api/v1/ocr/parse-template/route.ts',
      'lib/ai-service.ts',
    ],
    cost: 'Haiku $0.80/M input · Sonnet $3/M input',
    docsUrl: 'https://docs.anthropic.com',
    signupUrl: 'https://console.anthropic.com',
    notes: 'AI Copilot · OCR (Claude Vision) · 분석 보고서 생성 · NLP 검색',
  },
  {
    name: 'OpenAI GPT-4',
    category: 'AI/LLM',
    priority: 2,
    status: 'MISSING',
    envVars: ['OPENAI_API_KEY'],
    primaryFiles: ['lib/ai-service.ts'],
    cost: 'GPT-4o $2.50/M input · GPT-4o-mini $0.15/M',
    docsUrl: 'https://platform.openai.com/docs',
    signupUrl: 'https://platform.openai.com',
    notes: 'Claude unavailable 시 fallback (현재 미연결)',
  },

  // ── Embeddings ────────────────────────────────────────────
  {
    name: 'Voyage AI Multilingual',
    category: 'Embeddings',
    priority: 1,
    status: 'MISSING',
    envVars: ['VOYAGE_API_KEY'],
    primaryFiles: [
      'app/api/v1/rag/search/route.ts',
      'app/api/v1/rag/ingest/route.ts',
    ],
    cost: '$0.18 / 1M tokens (multilingual-2)',
    docsUrl: 'https://docs.voyageai.com',
    signupUrl: 'https://www.voyageai.com/',
    notes: 'voyage-multilingual-2 · 법률 문서 RAG 임베딩 · pgvector + Supabase',
  },

  // ── OCR ───────────────────────────────────────────────────
  {
    name: 'Claude Vision (OCR)',
    category: 'OCR',
    priority: 1,
    status: 'MISSING',  // ANTHROPIC_API_KEY 공유
    envVars: ['ANTHROPIC_API_KEY'],
    primaryFiles: ['app/api/v1/ocr/parse-template/route.ts'],
    cost: 'Sonnet $3/M input + image $0.0048/image',
    notes: 'Excel 템플릿 OCR · UnifiedFormState 자동 채움',
    dependsOn: ['ANTHROPIC_API_KEY'],
  },
  {
    name: 'Upstage Document AI',
    category: 'OCR',
    priority: 2,
    status: 'MISSING',
    envVars: ['UPSTAGE_API_KEY'],
    primaryFiles: [],
    cost: '$0.02 / page',
    docsUrl: 'https://console.upstage.ai/docs/capabilities/document-ocr',
    signupUrl: 'https://console.upstage.ai/',
    notes: '한글 문서 특화 OCR (98%+ 정확도) · 미연동',
  },
  {
    name: 'NAVER CLOVA OCR',
    category: 'OCR',
    priority: 3,
    status: 'MISSING',
    envVars: ['NAVER_OCR_API_KEY', 'NAVER_OCR_INVOKE_URL'],
    primaryFiles: [],
    cost: '50건/일 무료 → 그 이상 0.7원/건',
    docsUrl: 'https://www.ncloud.com/product/aiService/ocr',
    signupUrl: 'https://www.ncloud.com/',
    notes: '한국어 최적화 · 미연동',
  },

  // ── Payment ───────────────────────────────────────────────
  {
    name: 'PortOne V2',
    category: 'Payment',
    priority: 1,
    status: 'MISSING',
    envVars: [
      'PORTONE_STORE_ID',
      'PORTONE_CHANNEL_KEY',
      'PORTONE_API_SECRET',
      'PORTONE_WEBHOOK_SECRET',
    ],
    primaryFiles: [
      'app/api/v1/payments/confirm/route.ts',
      'lib/payment-portone.ts',
    ],
    cost: 'PG 수수료 별도',
    docsUrl: 'https://developers.portone.io/docs',
    signupUrl: 'https://admin.portone.io/signup',
    notes: '주 PG · 카드·가상계좌·간편결제 통합',
  },
  {
    name: '이니시스 (Inicis)',
    category: 'Payment',
    priority: 2,
    status: 'MISSING',
    envVars: ['INICIS_MID', 'INICIS_SIGN_KEY', 'INICIS_IV'],
    primaryFiles: ['lib/payment-inicis.ts', 'app/api/v1/payments/inicis-ready/route.ts'],
    cost: 'PG 수수료 별도',
    docsUrl: 'https://manual.inicis.com/',
    signupUrl: 'https://www.inicis.com/',
    notes: '레거시 PG · 카드·계좌이체',
  },
  {
    name: '토스페이먼츠',
    category: 'Payment',
    priority: 3,
    status: 'MISSING',
    envVars: ['TOSS_CLIENT_KEY', 'TOSS_SECRET_KEY'],
    primaryFiles: [],
    docsUrl: 'https://docs.tosspayments.com/',
    signupUrl: 'https://www.tosspayments.com/',
    notes: '간편결제 옵션 · 미연동',
  },
  {
    name: 'KakaoPay',
    category: 'Payment',
    priority: 4,
    status: 'MISSING',
    envVars: ['KAKAO_PAY_ADMIN_KEY'],
    primaryFiles: [],
    docsUrl: 'https://developers.kakao.com/docs/latest/ko/kakaopay/common',
    signupUrl: 'https://developers.kakao.com/',
    notes: '카카오페이 단독 연동 · 미연동',
  },

  // ── Real Estate / Registry ────────────────────────────────
  {
    name: 'IROS (대법원 인터넷등기소)',
    category: 'RealEstate',
    priority: 1,
    status: 'MOCK',  // ENV 미등록 시 mock 반환
    envVars: ['IROS_API_KEY'],
    primaryFiles: ['lib/external-apis/iros.ts'],
    cost: '건당 700원 (개별 등기부)',
    docsUrl: 'https://www.iros.go.kr/',
    signupUrl: 'https://www.iros.go.kr/',
    notes: '등기부등본 자동 조회 · ENV 미등록 시 mock 데이터 반환',
  },

  // ── Auction Data ──────────────────────────────────────────
  {
    name: 'MOLIT 실거래가 (국토교통부)',
    category: 'AuctionData',
    priority: 1,
    status: 'MISSING',
    envVars: ['MOLIT_API_KEY'],
    primaryFiles: [],
    cost: '무료 (공공데이터포털)',
    docsUrl: 'https://www.data.go.kr/data/15058747/openapi.do',
    signupUrl: 'https://www.data.go.kr/',
    notes: '아파트 실거래가 · NBI 인덱스 일일 자동 fetch · 미연동',
  },
  {
    name: '온비드 (KAMCO)',
    category: 'AuctionData',
    priority: 1,
    status: 'MISSING',
    envVars: ['ONBID_API_KEY'],
    primaryFiles: [],
    cost: '무료 (공공데이터포털)',
    docsUrl: 'https://www.data.go.kr/iim/api/selectAPIAcountView.do',
    signupUrl: 'https://www.data.go.kr/',
    notes: '공매 자산 · NPL 회수율 (낙찰가율) 인덱스 · 미연동',
  },
  {
    name: '대법원 법원경매정보',
    category: 'AuctionData',
    priority: 2,
    status: 'MOCK',
    envVars: ['COURT_AUCTION_API_KEY'],
    primaryFiles: ['lib/data-pipeline/court-auction-fetcher.ts'],
    cost: '비공식 크롤러 (ENV 없으면 mock)',
    docsUrl: 'https://www.courtauction.go.kr/',
    notes: '법원 경매 데이터 · 사용자 정책: 자체 크롤러 구현됨, API 연동 불필요',
  },

  // ── Maps ──────────────────────────────────────────────────
  {
    name: '카카오맵',
    category: 'Maps',
    priority: 1,
    status: 'MISSING',
    envVars: ['KAKAO_MAP_JAVASCRIPT_KEY', 'KAKAO_MAP_REST_KEY'],
    primaryFiles: [],
    cost: '월 30만 호출 무료',
    docsUrl: 'https://apis.map.kakao.com/web/guide/',
    signupUrl: 'https://developers.kakao.com/',
    notes: '매물 지도 표시 · 위치 검색 · 미연동',
  },
  {
    name: '네이버 지도',
    category: 'Maps',
    priority: 2,
    status: 'MISSING',
    envVars: ['NAVER_MAP_CLIENT_ID', 'NAVER_MAP_CLIENT_SECRET'],
    primaryFiles: [],
    cost: '월 100만 호출 무료',
    docsUrl: 'https://api.ncloud-docs.com/docs/ai-naver-mapsstaticmap',
    signupUrl: 'https://www.ncloud.com/',
    notes: '대체 지도 공급자 · 미연동',
  },

  // ── Auth & Storage ────────────────────────────────────────
  {
    name: 'Supabase',
    category: 'Auth',
    priority: 1,
    status: 'LIVE',
    envVars: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
    primaryFiles: ['lib/supabase/server.ts', 'lib/supabase/client.ts'],
    cost: '무료 tier (50k MAU) → Pro $25/월',
    docsUrl: 'https://supabase.com/docs',
    notes: 'PostgreSQL + RLS + Realtime + Auth + Storage',
  },

  // ── Cache ─────────────────────────────────────────────────
  {
    name: 'Upstash Redis',
    category: 'Cache',
    priority: 1,
    status: 'MISSING',
    envVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    primaryFiles: ['lib/redis-cache.ts'],
    cost: '10k req/일 무료 → Pro $0.20/100k',
    docsUrl: 'https://upstash.com/docs/redis',
    signupUrl: 'https://upstash.com/',
    notes: 'NBI 인덱스·분석결과·AI 응답 캐싱 · 미등록 시 in-memory fallback',
  },

  // ── Cron ──────────────────────────────────────────────────
  {
    name: 'Vercel Cron Secret',
    category: 'Cron',
    priority: 1,
    status: 'MISSING',
    envVars: ['CRON_SECRET'],
    primaryFiles: [
      'app/api/v1/cron/data-pipeline/route.ts',
      'app/api/v1/cron/nbi/route.ts',
    ],
    notes: '스케줄러 인증 토큰 · 데이터 파이프라인 트리거',
  },

  // ── Communications ────────────────────────────────────────
  {
    name: 'Slack Webhook',
    category: 'Communications',
    priority: 1,
    status: 'MISSING',
    envVars: ['SLACK_WEBHOOK_URL'],
    primaryFiles: ['lib/notifications/slack.ts'],
    cost: '무료',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    notes: '관리자 알림·딜 알림 · 미등록 시 console.log 로 graceful fallback',
  },
  {
    name: 'SMTP Email',
    category: 'Communications',
    priority: 2,
    status: 'MISSING',
    envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'],
    primaryFiles: [],
    notes: '인보이스·알림 이메일 · 미연동 (Sendgrid/AWS SES 등 추천)',
  },
  {
    name: '카카오 알림톡',
    category: 'Communications',
    priority: 3,
    status: 'MISSING',
    envVars: ['KAKAO_ALIMTALK_SENDER_KEY'],
    primaryFiles: [],
    cost: '발송 건당 9~15원',
    docsUrl: 'https://business.kakao.com/info/alimtalk/',
    notes: '거래 알림 SMS 대체 · 미연동',
  },
  {
    name: 'Web Push (VAPID)',
    category: 'Communications',
    priority: 4,
    status: 'MISSING',
    envVars: ['WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY'],
    primaryFiles: [],
    notes: '브라우저 푸시 알림 · 미연동 (PWA Service Worker 필요)',
  },

  // ── Verification ──────────────────────────────────────────
  {
    name: 'NICE 본인인증',
    category: 'Verification',
    priority: 1,
    status: 'MISSING',
    envVars: ['NICE_AUTH_SITE_CODE', 'NICE_AUTH_SITE_PASSWORD'],
    primaryFiles: [],
    cost: '건당 200원 (사용량 따라 변동)',
    docsUrl: 'https://www.niceapi.co.kr/',
    signupUrl: 'https://www.niceapi.co.kr/',
    notes: '실명인증 · 회원가입 KYC L1 · 미연동',
  },
]

/** ENV 변수 등록 여부에 따라 status 동적 결정 (서버 사이드 only) */
export function resolveIntegrationStatus(integration: Integration): IntegrationStatus {
  // 서버에서 process.env 검사
  if (typeof process === 'undefined' || !process.env) return integration.status
  if (integration.envVars.length === 0) return 'LIVE' // ENV 불필요 (MyMemory 등)
  const allSet = integration.envVars.every(v => Boolean(process.env[v]))
  if (allSet) return 'LIVE'
  // 일부만 설정된 경우는 명시적으로 MOCK/MISSING 유지
  return integration.status === 'MOCK' ? 'MOCK' : 'MISSING'
}

/** 카테고리별 그룹화 (관리자 페이지용) */
export function groupByCategory(): Record<IntegrationCategory, Integration[]> {
  const groups = {} as Record<IntegrationCategory, Integration[]>
  INTEGRATIONS.forEach(i => {
    if (!groups[i.category]) groups[i.category] = []
    groups[i.category].push(i)
  })
  // priority 순 정렬
  Object.keys(groups).forEach(k => {
    groups[k as IntegrationCategory].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  })
  return groups
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  Translation: '번역',
  'AI/LLM': 'AI / LLM',
  Embeddings: '임베딩 (RAG)',
  OCR: '문서 인식 (OCR)',
  Payment: '결제',
  RealEstate: '부동산 / 등기',
  AuctionData: '경매 / 실거래 데이터',
  Maps: '지도',
  Auth: '인증 / DB',
  Storage: '스토리지',
  Cache: '캐시',
  Communications: '알림 / 이메일',
  Verification: '본인인증',
  Cron: '스케줄러',
}
