# NPLatform v15.0 — 글로벌 최고 수준 부실채권 SaaS 마스터플랜

> "한국 금융시장의 혁신. 부실채권 거래의 디지털 전환."
> 현재 80점 → 목표 300점 (글로벌 유니콘 + 규제 준수 + 모듈 아키텍처)

---

## 1부: 현재 수준 진단 (80/300)

### 현재 보유 자산
- 192 페이지 | 188 API | 175 컴포넌트 | 85 라이브러리
- 528키 × 3언어 | 37 DB 테이블 | CI/CD | MFA | Playwright
- AI 자연어 검색 | 거래 자동화 엔진 | 5카테고리 메뉴

### 카테고리별 점수 (현재 / 300점 만점)

| 카테고리 | 현재 | 목표 | 비중 |
|---------|------|------|------|
| A. 핵심 거래 기능 | 15/50 | 50 | 17% |
| B. 다국어 완전 적용 | 5/30 | 30 | 10% |
| C. 법률/규제 준수 | 0/40 | 40 | 13% |
| D. 모듈러 아키텍처 | 5/30 | 30 | 10% |
| E. 데이터 실연동 | 8/30 | 30 | 10% |
| F. AI 완전체 | 8/25 | 25 | 8% |
| G. UX/디자인 혁신 | 12/25 | 25 | 8% |
| H. 보안/성능/인프라 | 12/25 | 25 | 8% |
| I. SaaS 운영 완성 | 8/25 | 25 | 8% |
| J. 글로벌 확장 | 7/20 | 20 | 7% |
| **합계** | **80** | **300** | 100% |

---

## 2부: 300점 달성 로드맵 (20개 ULTRA TIER)

### ULTRA 1: 다국어 전 페이지 완전 적용 (80→95)

현재: 네비/푸터/메인/로그인만 t() 적용 (528키)
목표: **192개 전 페이지 2000+키 완전 번역**

**구현:**
- 번역 키 2000개로 확장 (현재 528 → 2000)
- 모든 페이지 하드코딩 한국어 → t() 래핑
- 채팅 메시지: 시스템 메시지 번역 + 사용자 메시지 AI 자동 번역
- 게시글: 커뮤니티 글 AI 번역 옵션
- 매물 상세: 필드명 번역 (채권원금 → Debt Principal → 債権元本)
- 에러 메시지/토스트: 전체 번역
- 날짜/숫자 포맷: locale별 자동 변환 (2026.03.21 / Mar 21, 2026 / 2026年3月21日)
- PDF/계약서 출력: 선택 언어로 생성

**파일 영향:** 192 페이지 전체 + messages/*.json 확장

### ULTRA 2: 법률/규제 준수 프레임워크 (95→125)

> 금감원, 금융위, 자본시장법, 유사수신행위 규제 대응

**2-1. 서비스별 면책 조항 (Disclaimer)**

모든 서비스 페이지 하단에 법적 면책 조항:

```
components/legal/disclaimer.tsx
- ServiceDisclaimer: 서비스별 면책 (type: 'exchange'|'analysis'|'matching'|'professional')
- InvestmentDisclaimer: 투자 관련 면책
- DataDisclaimer: 데이터 정확성 면책
- AIDisclaimer: AI 분석 면책
```

| 서비스 | 면책 내용 |
|--------|----------|
| 딜 브릿지 | "본 플랫폼은 부실채권 거래를 중개하는 정보 플랫폼이며, 거래의 당사자가 아닙니다. 모든 거래 책임은 매수자와 매도자에게 있습니다." |
| AI 분석 | "AI 분석 결과는 참고용이며, 투자 권유가 아닙니다. 투자 결정은 본인의 판단과 책임하에 이루어져야 합니다." |
| 매칭 | "AI 매칭은 알고리즘 기반 추천이며, 매칭 결과에 대한 법적 구속력이 없습니다." |
| 전문가 | "플랫폼은 전문가와 이용자 간 연결을 제공하며, 자문 내용에 대한 책임은 해당 전문가에게 있습니다." |
| 가격 정보 | "게재된 가격 정보는 참고용이며, 실제 거래가와 다를 수 있습니다. 정확한 가격은 거래 당사자 간 협의로 결정됩니다." |

**2-2. 역할별 책임 구조**

```
components/legal/role-responsibility.tsx
```

| 역할 | 책임 |
|------|------|
| 플랫폼 (NPLatform) | 정보 중개, 시스템 운영, 데이터 보안. 거래 성사/실패에 대한 책임 없음 |
| 매도자 | 매물 정보의 정확성, 법적 하자 없음 보증, 채권 양도 적법성 |
| 매수자 | 투자 판단의 자기 책임, 실사 의무, 대금 지급 |
| 전문가 | 자문의 전문성과 정확성, 자격 유지, 수임료 적정성 |
| 파트너 | 추천의 진실성, 회원 정보 보호, 수수료 정산 |

**2-3. 자본시장법 준수**

- 투자 권유 표현 금지: "수익 보장", "확정 수익률" 표현 제거
- "예상 수익률"은 항상 "시뮬레이션 결과이며 실제와 다를 수 있음" 부기
- 유사수신행위 방지: 자금 수탁/운용 표현 제거, 플랫폼은 중개만
- 개인정보보호법(PIPA) 준수: 이미 구현됨 + 강화

**2-4. 이용약관/개인정보처리방침 고도화**

- `terms/service/page.tsx` — 서비스 이용약관 전면 개정 (법률 검토 반영)
- `terms/privacy/page.tsx` — PIPA 최신 기준 반영
- `terms/disclaimer/page.tsx` — 신규: 투자 면책 조항 전문
- `terms/partnership/page.tsx` — 신규: 파트너 협약 약관

### ULTRA 3: 모듈러 아키텍처 재설계 (125→150)

> 개발자가 모듈만 교체/확장하면 되는 플러그인 구조

**3-1. 모듈 정의**

```
modules/
├── exchange/          — NPL 딜 브릿지 (매물, 거래, 오퍼)
│   ├── types.ts
│   ├── api.ts
│   ├── hooks.ts
│   └── components/
├── professional/      — 전문가 서비스
├── partner/           — 파트너/추천
├── billing/           — 과금/결제
├── auth/              — 인증/인가
├── i18n/              — 다국어
├── analytics/         — 분석/통계
├── notification/      — 알림
├── storage/           — 파일 저장
├── ai/                — AI 기능
├── admin/             — 관리자
├── legal/             — 법률/면책
└── core/              — 공통 유틸리티
```

각 모듈:
- `types.ts` — 타입 정의
- `api.ts` — API 호출 함수
- `hooks.ts` — React 훅
- `components/` — UI 컴포넌트
- `config.ts` — 설정 (ON/OFF, 파라미터)

**3-2. 모듈 매니페스트**

```ts
// modules/manifest.ts
export const MODULES = {
  exchange: { name: 'NPL 딜 브릿지', version: '1.0', enabled: true, routes: ['/exchange/*'] },
  professional: { name: '전문 서비스', version: '1.0', enabled: true, routes: ['/professional/*'] },
  partner: { name: '파트너', version: '1.0', enabled: true, routes: ['/partner/*'] },
  billing: { name: '과금/결제', version: '1.0', enabled: true, routes: ['/settings/billing/*'] },
  ai: { name: 'AI 기능', version: '1.0', enabled: true, routes: ['/api/v1/ai/*'] },
  // ...
}
```

**3-3. 플러그인 시스템**

```ts
// lib/plugin-system.ts
interface NPLPlugin {
  name: string
  version: string
  init(): Promise<void>
  routes?: RouteConfig[]
  adminPages?: AdminPageConfig[]
  hooks?: Record<string, Function>
}
```

### ULTRA 4: 데이터 실연동 완성 (150→175)

- Supabase 37테이블 실행 + 시드
- 모든 188개 API mock → DB 우선
- 실시간: 채팅, 알림, 매물 업데이트
- 스토리지: 이미지, 문서, 계약서
- 백업: 일간 자동 백업

### ULTRA 5: AI 완전체 (175→195)

- Claude API 실연동 (관리자에서 키 입력)
- DocumentAI OCR 실연동
- AI 자연어 거래 에이전트 (자연어 → 액션)
- AI 시장 분석 리포트 자동 생성
- AI 계약서 검토
- AI 리스크 스코어링 모델
- AI 번역 파이프라인 (콘텐츠 자동 번역)

### ULTRA 6: UX 혁신 (195→215)

- 3D 파티클 히어로 (Three.js)
- 스크롤 기반 섹션 전환 (GSAP)
- 매물 카드 스와이프 (Tinder-style)
- 다크모드 프리미엄 (네이비+골드)
- 마이크로 인터랙션 (모든 버튼, 카드)
- 맞춤형 대시보드 (위젯 드래그앤드롭)

### ULTRA 7: 보안/성능 최상급 (215→235)

- SOC2 준수 수준 보안
- E2E 암호화 (채팅, 문서)
- 제로 트러스트 아키텍처
- Lighthouse 99+ (모든 페이지)
- Edge Runtime (전 API)
- CDN + ISR + Streaming SSR
- 99.99% SLA 모니터링

### ULTRA 8: SaaS 운영 완성 (235→255)

- 실 결제 (토스 + 카카오페이)
- 자동 정산 배치 (월말)
- 세금계산서 연동 (홈택스)
- 구독 자동 갱신
- 기관별 화이트라벨 완성
- 멀티테넌시 완전 격리
- 운영 대시보드 (실시간 매출/트래픽)

### ULTRA 9: 글로벌 확장 (255→275)

- 일본 NPL 시장 대응 (용어, 규제)
- 영어권 (미국/유럽 부실채권 용어)
- 통화 자동 환산 (KRW/JPY/USD)
- 현지 PG사 연동 (Stripe/PayPal)
- 글로벌 SEO (hreflang + 언어별 sitemap)
- 다국어 고객지원 (채팅봇)

### ULTRA 10: 혁신 기능 (275→300)

- 블록체인 거래 인증 (해시 기록)
- AR 담보물 현장 확인 (Capacitor + ARKit)
- 실시간 화상 상담 (WebRTC)
- IoT 담보물 센서 연동 (건물 상태 모니터링)
- 메타버스 딜룸 (3D 가상 회의실)
- 자동 법률 검토 AI (계약서 위험 조항 감지)
- 예측 모델 (NPL 시장 물량/가격 예측)
- API 마켓플레이스 (외부 개발자 연동)

---

## 3부: 모듈별 개발 구조

### 현재 → 모듈러 전환

```
현재 (Monolithic):
app/
├── (main)/
│   ├── exchange/     ← 페이지
│   ├── professional/ ← 페이지
│   └── ...
├── api/v1/
│   ├── exchange/     ← API
│   └── ...
├── components/       ← 컴포넌트 (혼재)
└── lib/              ← 유틸 (혼재)

목표 (Modular):
modules/
├── exchange/
│   ├── types.ts          ← 타입
│   ├── api.ts            ← API 클라이언트
│   ├── hooks.ts          ← React 훅 (useListings, useDeals)
│   ├── config.ts         ← 모듈 설정
│   ├── components/
│   │   ├── ListingCard.tsx
│   │   ├── DealKanban.tsx
│   │   └── ...
│   └── pages/            ← 페이지 컴포넌트
│       ├── ExchangeMain.tsx
│       └── ...
├── professional/
│   ├── types.ts
│   ├── api.ts
│   ├── hooks.ts
│   └── components/
└── ...

app/ (라우팅만 담당):
├── (main)/exchange/page.tsx  → import { ExchangeMain } from '@/modules/exchange'
└── ...
```

**장점:**
- 개발자가 `modules/exchange/` 폴더만 보면 됨
- 모듈 교체 시 다른 모듈에 영향 없음
- 새 모듈 추가 시 `modules/new-module/` 폴더만 생성
- 테스트도 모듈별 독립 실행

---

## 4부: 규제 준수 상세

### 자본시장법 체크리스트

| # | 규제 | 현재 | 대응 |
|---|------|------|------|
| 1 | 투자 권유 금지 | 일부 표현 위반 가능 | "수익 보장" 표현 전면 제거, "예상" + 면책 부기 |
| 2 | 유사수신행위 | 해당 없음 (중개만) | 자금 수탁 표현 없음 확인, 면책 조항 |
| 3 | 개인정보보호 | PIPA 기본 준수 | 마스킹, 암호화, 감사로그 강화 |
| 4 | 전자금융거래법 | PG사 위탁 | 토스페이먼츠 통한 간접 처리 |
| 5 | 부동산 거래신고 | 해당 없음 (채권) | 채권 양도 관련 안내 제공 |
| 6 | 공인중개사법 | 해당 없음 (채권) | 부동산 중개 아닌 채권 거래 명시 |

### 수정 필요 표현

| 현재 표현 | 수정 | 이유 |
|----------|------|------|
| "기대 수익률 15~25%" | "과거 사례 기반 시뮬레이션 수익률 (실제와 다를 수 있음)" | 확정 수익률 인상 방지 |
| "투자하기" | "매수 의향 표명" | 투자 권유 인상 방지 |
| "수익 보장" | 삭제 | 유사수신 우려 |
| "안전한 투자" | "정보 기반 투자 판단 지원" | 원금 보장 인상 방지 |

---

## 5부: 실행 타임라인

| 주차 | ULTRA | 점수 | 핵심 |
|------|-------|------|------|
| 1-2 | 다국어 전 페이지 | 95 | 2000키, 전 페이지 t() |
| 3-4 | 법률/규제 준수 | 125 | 면책 조항, 역할 책임, 용어 수정 |
| 5-6 | 모듈러 아키텍처 | 150 | modules/ 구조, 플러그인 시스템 |
| 7-8 | 데이터 실연동 | 175 | Supabase 37테이블 실행 |
| 9-10 | AI 완전체 | 195 | Claude 실연동, OCR, 자동 리포트 |
| 11-12 | UX 혁신 | 215 | 3D, 스와이프, 마이크로 인터랙션 |
| 13-14 | 보안/성능 | 235 | SOC2, Edge, Lighthouse 99 |
| 15-16 | SaaS 운영 | 255 | 실 결제, 자동 정산, 화이트라벨 |
| 17-18 | 글로벌 확장 | 275 | 일본/영어, 현지 PG, 글로벌 SEO |
| 19-20 | 혁신 기능 | 300 | 블록체인, AR, WebRTC, 메타버스 |

---

## 6부: 개발자 가이드 (모듈 확장 방법)

### 새 모듈 추가 (예: "보험" 모듈)

```bash
# 1. 모듈 폴더 생성
mkdir -p modules/insurance/{components,pages}

# 2. 기본 파일 생성
touch modules/insurance/{types,api,hooks,config}.ts

# 3. 라우트 연결
# app/(main)/insurance/page.tsx → import from modules/insurance

# 4. 관리자 메뉴 추가
# admin/layout.tsx → ADMIN_MENU에 항목 추가

# 5. 기능 토글 등록
# lib/feature-flags.ts → FEATURES에 'insurance' 추가
```

### 기존 모듈 수정 (예: 딜 브릿지에 새 단계 추가)

```
1. modules/exchange/types.ts → DealStage에 새 단계 추가
2. modules/exchange/api.ts → advanceStage()에 자동화 로직 추가
3. modules/exchange/components/DealKanban.tsx → 칸반에 새 컬럼 추가
4. 끝. 다른 모듈에 영향 없음.
```
