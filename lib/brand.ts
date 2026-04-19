/**
 * lib/brand.ts
 *
 * NPLatform 브랜드 아이덴티티 — Single Source of Truth
 *
 * 마케팅 페이지, 푸터, SEO 메타, 이메일 템플릿, 앱 시작화면, 앱스토어 메타 등
 * 모든 표면에서 이 모듈을 참조합니다. 값이 바뀔 때는 반드시 여기서만 수정.
 *
 *  - Corporate: 법인 공식명 / 대표 / 주소
 *  - Product:   제품명 / 슬로건 / 카피
 *  - Visual:    브랜드 컬러 (design-tokens와 교차 참조)
 *  - Social:    도메인, SNS, 이메일
 *  - Claims:    수치·지표 (KPI 공개 가능한 것만)
 */

import { brand as brandColors, semantic } from './design-tokens'

// ─── Corporate identity ─────────────────────────────────────────
export const CORP = {
  legalName: '주식회사 트랜스파머',
  legalNameEn: 'TransFarmer Inc.',
  ceo: '김대표',
  address: '서울특별시 강남구 테헤란로 123, 10층',
  brn: '000-00-00000',                // 사업자등록번호 (공개용 플레이스홀더)
  mailOrderLicense: '제2026-서울강남-00000호',
  foundedAt: '2024-06-01',
  hq: '서울',
} as const

// ─── Product identity ───────────────────────────────────────────
export const BRAND = {
  /** 한글 제품명 */
  name: 'NPLatform',
  /** 정식 표기 (공백 유지) */
  formalName: '엔플랫폼',
  /** 도메인 */
  domain: 'nplatform.co.kr',
  /** 하위 프로덕트 라인 */
  products: {
    exchange: 'NPLatform Exchange',     // 기관 거래소
    analytics: 'NPLatform Analytics',   // AI 분석
    dealroom: 'NPLatform Dealroom',     // 딜룸/실사
    insights: 'NPLatform Insights',     // 시장 지표·NBI
  },

  // ─ 슬로건 / 카피 라인 ─
  taglineShort: 'AI로 풀어내는 부실채권 투자',
  taglineLong:  '기관급 데이터·AI·컴플라이언스로, NPL 거래의 마찰을 없앱니다.',
  taglineEn:    'Institutional-grade NPL exchange, powered by AI.',

  // ─ 코어 바운스(단문 포지셔닝) ─
  bounces: {
    buyer:  '분석부터 낙찰·실사·자금조달까지, 한 화면에서.',
    seller: '공시·마스킹·입찰자 매칭을 자동화해, 매각 속도를 2배로.',
    pro:    '감평·세무·법무 전문가 네트워크와 자동 매칭.',
  },

  // ─ 3-pillar 메시지 (랜딩 히어로 3 칼럼) ─
  pillars: [
    {
      key: 'data',
      title: '실시간 기관급 데이터',
      copy: '실거래가·경매·공매·등기·NBI 지수를 한 번에. 일간 자동 수집.',
    },
    {
      key: 'ai',
      title: 'AI NPL 분석 엔진',
      copy: 'Claude 기반 리스크·수익률·담보 평가. RAG 법률 검색 내장.',
    },
    {
      key: 'trust',
      title: '기관 수준 컴플라이언스',
      copy: 'RLS·KYC·AML·PII 마스킹·감사 로그까지, 금융 수준으로 설계.',
    },
  ],
} as const

// ─── Visual identity ───────────────────────────────────────────
export const VISUAL = {
  colors: {
    primary:   brandColors.dark,      // #1B3A5C
    primaryMid: brandColors.mid,      // #2558A0
    primaryBright: brandColors.bright, // #3B82F6
    accent:    semantic.positive,      // #10B981
    warning:   semantic.warning,
    danger:    semantic.danger,
  },
  gradients: {
    hero:        'linear-gradient(135deg, #1B3A5C 0%, #2558A0 60%, #3B82F6 100%)',
    heroSoft:    'linear-gradient(135deg, rgba(27,58,92,.92), rgba(37,88,160,.88))',
    emerald:     'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    radialGlow:  'radial-gradient(circle at 30% 20%, rgba(59,130,246,.18), transparent 60%)',
  },
  /** 로고 SVG — 인라인 (외부 파일 의존 제거) */
  logo: {
    /** 다크 배경용 화이트 로고 */
    onDark: '/brand/nplatform-logo-white.svg',
    /** 라이트 배경용 네이비 로고 */
    onLight: '/brand/nplatform-logo-navy.svg',
    /** 아이콘(정사각) */
    icon: '/brand/nplatform-icon.svg',
    /** 최소 표기 (컴팩트 메뉴) */
    wordmark: 'NPLatform',
  },
  /** 타이포그래피 사이즈 스케일 — display 시리즈 (히어로용) */
  typography: {
    display: 'text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold tracking-tight leading-[1.05]',
    h1:      'text-[clamp(2rem,4.2vw,3rem)] font-bold tracking-tight',
    h2:      'text-[clamp(1.5rem,3vw,2.125rem)] font-bold',
    lead:    'text-[clamp(1.0625rem,1.4vw,1.25rem)] leading-relaxed',
  },
} as const

// ─── Contact / Social ──────────────────────────────────────────
export const CONTACT = {
  emails: {
    support:  'support@nplatform.co.kr',
    sales:    'sales@nplatform.co.kr',
    press:    'press@nplatform.co.kr',
    privacy:  'privacy@nplatform.co.kr',
    security: 'security@nplatform.co.kr',
  },
  phone:  '02-0000-0000',
  hours:  '평일 10:00 – 18:00 (점심 12–13)',
  social: {
    linkedin: 'https://www.linkedin.com/company/nplatform',
    youtube:  'https://www.youtube.com/@nplatform',
    x:        'https://x.com/nplatform_kr',
    medium:   'https://medium.com/@nplatform',
  },
} as const

// ─── Public KPI claims (랜딩에 사용 가능한 수치) ────────────────
// ⚠️ 모든 수치는 검증된 값만. 추측치/목표치는 별도 목업에 둘 것.
export const CLAIMS = {
  dataCoverage: {
    transactions: '실거래가 40만건+',
    auctions:     '경매 5만건+',
    regions:      '전국 250개 법정동',
    update:       '매일 새벽 2시 갱신',
  },
  ai: {
    model:     'Claude Sonnet 4.6',
    embedding: 'Voyage Multilingual-2',
    ragDocs:   '법률 문서 6,800건 인덱싱',
    avgLatency: '평균 340ms',
  },
  trust: {
    encryption: 'AES-256 저장 암호화 + TLS 1.3 전송',
    auth:       'Supabase Auth + MFA + RLS',
    audit:      '모든 관리자 액션 감사 로그',
    isms:       'ISMS-P 인증 준비중',
  },
} as const

// ─── Common CTA copy ───────────────────────────────────────────
export const CTA = {
  primary:   '무료로 시작하기',
  secondary: '기관 데모 요청',
  tertiary:  '가이드 보기',
  contact:   '영업팀과 상담',
  demo:      '1:1 맞춤 데모',
} as const

// ─── 전체 묶음 export ───────────────────────────────────────────
export const NPLatformBrand = {
  corp: CORP,
  brand: BRAND,
  visual: VISUAL,
  contact: CONTACT,
  claims: CLAIMS,
  cta: CTA,
} as const

export default NPLatformBrand
