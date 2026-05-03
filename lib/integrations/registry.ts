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

/**
 * Output 연결 상태 — API 키 등록 ≠ UI 사용 가능.
 *   - CONNECTED: 사용자가 보는 UI 소비자 존재 (API 키 등록 즉시 효과)
 *   - PARTIAL: 백엔드 fetcher 만 존재 (관리자 / cron 만 사용, 일반 UI 없음)
 *   - PLANNED: 코드 미구현 — API 키 등록해도 효과 없음 (UI 개발 우선 필요)
 *
 * 사용자 정책 (2026-05-03): "API 연동만 있고 실제 아웃풋 안 되는 건 의미 없음"
 *   PLANNED 항목은 UI 개발 후 등록 권장.
 */
export type OutputStatus = 'CONNECTED' | 'PARTIAL' | 'PLANNED'

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
  /** API 키 등록 상태 */
  status: IntegrationStatus
  /**
   * UI 출력 연결 상태 (옵션 — 기본 'CONNECTED'):
   *   - CONNECTED: 사용자 UI 소비자 존재 → 키 등록 즉시 효과
   *   - PARTIAL:   백엔드만 존재 (cron / admin 만 사용)
   *   - PLANNED:   UI 미구현 — 키 등록해도 효과 없음
   */
  outputStatus?: OutputStatus
  /** UI 소비자 경로 또는 미구현 사유 */
  uiConsumer?: string
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
    outputStatus: 'CONNECTED',
    uiConsumer: '사이트 전체 (헤더 🌐 EN/JA 토글)',
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
    name: 'Google Gemini (Translation)',
    category: 'Translation',
    priority: 3,
    status: 'MISSING',
    envVars: ['GEMINI_API_KEY'],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: 'Flash $0.075/M (가장 저렴 + 무료 tier) · 도메인 용어 보존 우수',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    signupUrl: 'https://aistudio.google.com/apikey',
    notes: 'NPL/XRF 도메인 용어 보존에 최적 · Google Cloud Translate 보다 뉘앙스 정확',
  },
  {
    name: 'MyMemory',
    category: 'Translation',
    priority: 4,
    status: 'LIVE',
    envVars: [],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: '5,000 chars/일/IP 무료',
    docsUrl: 'https://mymemory.translated.net/doc/spec.php',
    notes: 'API key 불필요 · 일일 한도 있음 · 4차 폴백',
  },
  {
    name: 'Google Translate (비공식)',
    category: 'Translation',
    priority: 5,
    status: 'LIVE',
    envVars: [],
    primaryFiles: ['app/api/v1/translate/route.ts'],
    cost: '무료 (rate-limit 가능)',
    notes: '5차 폴백 · 검증 강화로 깨진 응답 차단',
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
    cost: 'Haiku $0.80/M · Sonnet $3/M · Opus $15/M input',
    docsUrl: 'https://docs.anthropic.com',
    signupUrl: 'https://console.anthropic.com',
    notes: 'AI Copilot · OCR (Vision) · 분석 보고서 · NLP 검색 · 코파일럿 도구 호출',
  },
  {
    name: 'Google Gemini',
    category: 'AI/LLM',
    priority: 2,
    status: 'MISSING',
    envVars: ['GEMINI_API_KEY'],
    primaryFiles: [
      'app/api/v1/copilot/route.ts',
      'app/api/v1/ocr/parse-template/route.ts',
      'lib/ai-service.ts',
    ],
    cost: 'Flash $0.075/M · Pro $1.25/M input · Flash 무료 tier 지원',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    signupUrl: 'https://aistudio.google.com/apikey',
    notes: 'Claude 대체 가능 · Vision 지원 · Flash 모델은 Haiku보다 저렴 + 무료 tier',
  },
  {
    name: 'OpenAI GPT-4',
    category: 'AI/LLM',
    priority: 3,
    status: 'MISSING',
    envVars: ['OPENAI_API_KEY'],
    primaryFiles: ['lib/ai-service.ts'],
    cost: 'GPT-4o $2.50/M · GPT-4o-mini $0.15/M input',
    docsUrl: 'https://platform.openai.com/docs',
    signupUrl: 'https://platform.openai.com',
    notes: 'Claude / Gemini unavailable 시 3차 fallback',
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
  {
    name: 'Google Gemini Embeddings',
    category: 'Embeddings',
    priority: 2,
    status: 'MISSING',
    envVars: ['GEMINI_API_KEY'],
    primaryFiles: ['app/api/v1/rag/search/route.ts'],
    cost: 'text-embedding-004 무료 tier · 유료 $0.0001/1k tokens',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/embeddings',
    notes: 'Voyage 대체 가능 · text-embedding-004 (768 dim · 한국어 지원)',
  },
  {
    name: 'Anthropic Claude Embeddings',
    category: 'Embeddings',
    priority: 3,
    status: 'MISSING',
    envVars: ['ANTHROPIC_API_KEY'],
    primaryFiles: ['app/api/v1/rag/ingest/route.ts'],
    cost: 'Voyage 통한 간접 사용 (Anthropic 자체 임베딩 없음)',
    notes: 'Anthropic 은 자체 임베딩 미제공 → Voyage 권장',
  },

  // ── OCR ───────────────────────────────────────────────────
  {
    name: 'Claude Vision (OCR)',
    category: 'OCR',
    priority: 1,
    status: 'MISSING',
    envVars: ['ANTHROPIC_API_KEY'],
    primaryFiles: ['app/api/v1/ocr/parse-template/route.ts'],
    cost: 'Sonnet $3/M input + image $0.0048/image',
    docsUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/vision',
    signupUrl: 'https://console.anthropic.com',
    notes: 'Excel 템플릿 OCR · UnifiedFormState 자동 채움',
    dependsOn: ['ANTHROPIC_API_KEY'],
  },
  {
    name: 'Google Gemini Vision (OCR)',
    category: 'OCR',
    priority: 2,
    status: 'MISSING',
    envVars: ['GEMINI_API_KEY'],
    primaryFiles: ['app/api/v1/ocr/parse-template/route.ts'],
    cost: 'Flash $0.075/M + image · Pro $1.25/M + image · Flash 무료 tier',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/vision',
    signupUrl: 'https://aistudio.google.com/apikey',
    notes: '✨ Claude Vision 대체 · Flash 모델 무료 tier 활용 가능 · 한글 우수',
  },
  {
    name: 'Upstage Document AI',
    category: 'OCR',
    priority: 3,
    status: 'MISSING',
    envVars: ['UPSTAGE_API_KEY'],
    primaryFiles: [],
    cost: '$0.02 / page',
    docsUrl: 'https://console.upstage.ai/docs/capabilities/document-ocr',
    signupUrl: 'https://console.upstage.ai/',
    notes: '⚠ UI 미연동 — Claude/Gemini Vision 으로 OCR 처리 중',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ Upstage 호출 코드 미구현. Claude/Gemini Vision 우선 사용',
  },
  {
    name: 'NAVER CLOVA OCR',
    category: 'OCR',
    priority: 4,
    status: 'MISSING',
    envVars: ['NAVER_OCR_API_KEY', 'NAVER_OCR_INVOKE_URL'],
    primaryFiles: [],
    cost: '50건/일 무료 → 그 이상 0.7원/건',
    docsUrl: 'https://www.ncloud.com/product/aiService/ocr',
    signupUrl: 'https://www.ncloud.com/',
    notes: '⚠ UI 미연동 — Claude/Gemini Vision 우선',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ CLOVA 호출 코드 미구현',
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
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ Toss 결제 위젯 미구현. PortOne 으로 대체 사용',
    envVars: ['TOSS_CLIENT_KEY', 'TOSS_SECRET_KEY'],
    primaryFiles: [],
    docsUrl: 'https://docs.tosspayments.com/',
    signupUrl: 'https://www.tosspayments.com/',
    notes: '⚠ UI 미연동 — PortOne 이 토스카드 포함하여 대체 가능',
  },
  {
    name: 'KakaoPay',
    category: 'Payment',
    priority: 4,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ KakaoPay 단독 결제 미구현. PortOne 으로 대체',
    envVars: ['KAKAO_PAY_ADMIN_KEY'],
    primaryFiles: [],
    docsUrl: 'https://developers.kakao.com/docs/latest/ko/kakaopay/common',
    signupUrl: 'https://developers.kakao.com/',
    notes: '⚠ UI 미연동 — PortOne 카카오페이 채널 사용 권장',
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
  // 사용자 정책 (2026-05-03): "AI 시세나 낙찰가율 정보는 개발자가 직접 붙혀줌 (이미 보유)"
  //   → 본 항목들은 fetcher/pipeline 만 존재, 개발자가 ENV + 데이터 붙이면 LIVE 전환
  {
    name: 'MOLIT 실거래가 (국토교통부)',
    category: 'AuctionData',
    priority: 1,
    status: 'MISSING',
    outputStatus: 'PARTIAL',
    uiConsumer: 'lib/external-apis/molit.ts (fetcher) → /admin/data-sync (pipeline)',
    envVars: ['MOLIT_API_KEY'],
    primaryFiles: ['lib/external-apis/molit.ts', 'lib/data-pipeline/real-transaction-fetcher.ts'],
    cost: '무료 (공공데이터포털)',
    docsUrl: 'https://www.data.go.kr/data/15058747/openapi.do',
    signupUrl: 'https://www.data.go.kr/',
    notes: '아파트 실거래가 fetcher 존재 · 개발자 데이터 직접 보유 시 ENV만 등록',
  },
  {
    name: '온비드 (KAMCO)',
    category: 'AuctionData',
    priority: 1,
    status: 'MISSING',
    outputStatus: 'PARTIAL',
    uiConsumer: '백엔드만 존재 (관리자 데이터 동기화)',
    envVars: ['ONBID_API_KEY'],
    primaryFiles: [],
    cost: '무료 (공공데이터포털)',
    docsUrl: 'https://www.data.go.kr/iim/api/selectAPIAcountView.do',
    signupUrl: 'https://www.data.go.kr/',
    notes: '공매 자산 · 낙찰가율 인덱스 · 사용자가 데이터 직접 보유',
  },
  {
    name: '대법원 법원경매정보',
    category: 'AuctionData',
    priority: 2,
    status: 'MOCK',
    outputStatus: 'PARTIAL',
    uiConsumer: 'lib/data-pipeline/court-auction-fetcher.ts → 분석 엔진',
    envVars: ['COURT_AUCTION_API_KEY'],
    primaryFiles: ['lib/data-pipeline/court-auction-fetcher.ts'],
    cost: '비공식 크롤러 (ENV 없으면 mock)',
    docsUrl: 'https://www.courtauction.go.kr/',
    notes: '자체 크롤러 구현됨 · 사용자 정책: API 연동 불필요',
  },

  // ── Maps ──────────────────────────────────────────────────
  // 사용자 정책 (2026-05-03): UI 미구현 → PLANNED. 지도 컴포넌트 개발 후 등록 권장.
  {
    name: '카카오맵',
    category: 'Maps',
    priority: 1,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ 지도 UI 컴포넌트 미구현. 매물 지도 화면 개발 필요',
    envVars: ['KAKAO_MAP_JAVASCRIPT_KEY', 'KAKAO_MAP_REST_KEY'],
    primaryFiles: [],
    cost: '월 30만 호출 무료',
    docsUrl: 'https://apis.map.kakao.com/web/guide/',
    signupUrl: 'https://developers.kakao.com/',
    notes: '⚠ UI 미구현 — 키 등록해도 효과 없음. 지도 화면 개발 후 등록 권장',
  },
  {
    name: '네이버 지도',
    category: 'Maps',
    priority: 2,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ 지도 UI 컴포넌트 미구현',
    envVars: ['NAVER_MAP_CLIENT_ID', 'NAVER_MAP_CLIENT_SECRET'],
    primaryFiles: [],
    cost: '월 100만 호출 무료',
    docsUrl: 'https://api.ncloud-docs.com/docs/ai-naver-mapsstaticmap',
    signupUrl: 'https://www.ncloud.com/',
    notes: '⚠ UI 미구현 — 카카오맵 대안. 지도 화면 개발 후 등록',
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
    outputStatus: 'CONNECTED',
    uiConsumer: '회원가입 알림 + 일일 요약 cron + 관리자 알림',
    envVars: ['SLACK_WEBHOOK_URL'],
    primaryFiles: ['lib/notifications/slack.ts', 'app/api/v1/onboarding/institution/route.ts', 'app/api/v1/cron/daily-summary/route.ts'],
    cost: '무료',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    notes: '✅ 코드 호출처 3곳 존재 · 미등록 시 console.log fallback',
  },
  {
    name: 'SMTP Email',
    category: 'Communications',
    priority: 2,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ 이메일 발송 코드 미구현',
    envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'],
    primaryFiles: [],
    notes: '⚠ UI 미연동 · 등록해도 효과 없음. 이메일 발송 기능 개발 후 등록',
  },
  {
    name: '카카오 알림톡',
    category: 'Communications',
    priority: 3,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ 알림톡 발송 코드 미구현',
    envVars: ['KAKAO_ALIMTALK_SENDER_KEY'],
    primaryFiles: [],
    cost: '발송 건당 9~15원',
    docsUrl: 'https://business.kakao.com/info/alimtalk/',
    notes: '⚠ UI 미연동 — 거래 알림 SMS 대체 기능 미구현',
  },
  {
    name: 'Web Push (VAPID)',
    category: 'Communications',
    priority: 4,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ Service Worker push subscription 미구현',
    envVars: ['WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY'],
    primaryFiles: [],
    notes: '⚠ UI 미연동 — PWA push 알림 미구현',
  },

  // ── Verification ──────────────────────────────────────────
  {
    name: 'NICE 본인인증',
    category: 'Verification',
    priority: 1,
    status: 'MISSING',
    outputStatus: 'PLANNED',
    uiConsumer: '⚠ 회원가입 KYC L1 단계는 현재 mock fallback 사용 중',
    envVars: ['NICE_AUTH_SITE_CODE', 'NICE_AUTH_SITE_PASSWORD'],
    primaryFiles: [],
    cost: '건당 200원 (사용량 따라 변동)',
    docsUrl: 'https://www.niceapi.co.kr/',
    signupUrl: 'https://www.niceapi.co.kr/',
    notes: '⚠ UI 호출 미구현 — 회원가입에서 mock 사용. 실 인증 필요 시 등록',
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
