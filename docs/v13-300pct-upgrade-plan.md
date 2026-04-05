# NPLatform v13 — 현재 대비 300% 고도화 마스터플랜

> 현재 70점 → 목표 100점+ (글로벌 유니콘 프로덕션 수준)
> 300% = 현재의 3배 수준. 모든 기능이 실제로 작동하는 프로덕션 레벨.

---

## 현재 70점의 의미

| 있는 것 | 없는 것 |
|---------|---------|
| 186 페이지 UI | 실제 DB 데이터 |
| 181 API (mock 포함) | 실 결제 |
| 거래 자동화 엔진 | 실 AI 연동 |
| 5카테고리 메뉴 | 실 다국어 적용 |
| 관리자 22+ 페이지 | CI/CD 자동 배포 |
| 보안 구조 | MFA 실구현 |
| PWA 설정 | 앱스토어 빌드 |
| 3언어 번역 파일 | 전 페이지 번역 적용 |

**핵심: "구조는 완성, 실연동이 없음"**

---

## 300% 고도화 = 10개 MEGA TIER

### MEGA 1: 다국어 실적용 (70→75점) — 효과 +5

현재: `messages/ko.json` 80키 + 언어 선택 UI만
목표: **186개 전 페이지에서 언어별 실 번역 작동**

#### 구현 방식: next-intl 없이 경량 방식

모든 텍스트를 t() 함수로 래핑하는 것은 186페이지 전체 수정이 필요해서 비현실적.
대신 **핵심 공통 UI만 번역** + **콘텐츠는 AI 자동 번역** 방식:

**Phase 1 — 공통 UI 번역 (즉시 효과):**
- `navigation.tsx` — 5개 메뉴명 + 모든 아이템 번역
- `footer.tsx` — 6컬럼 제목 + 링크 번역
- `mobile-tab-bar.tsx` — 5개 탭 번역
- 공통 버튼: 로그인/회원가입/검색/필터/저장/취소/삭제/확인
- 에러 메시지, 토스트 메시지

**Phase 2 — 페이지 제목/히어로 번역:**
- 메인 페이지 히어로
- 각 서비스 페이지 제목 + 설명
- 가이드 페이지 (이미 존재하지만 번역 미적용)

**Phase 3 — AI 동적 번역:**
- 사용자가 EN/JP 선택 시 → 본문 콘텐츠를 Claude API로 실시간 번역
- 번역 결과 캐시 (같은 콘텐츠 재번역 방지)
- `lib/auto-translate.ts` — AI 번역 유틸리티

**파일:**
- `messages/ko.json` → 500+ 키로 확장
- `messages/en.json` → 동일 500+ 키
- `messages/ja.json` → 동일 500+ 키
- `lib/i18n.ts` → 강화 (네임스페이스, 플러럴)
- `lib/auto-translate.ts` — AI 동적 번역
- `components/shared/translated-text.tsx` — `<T key="nav.login" />` 컴포넌트
- `navigation.tsx`, `footer.tsx`, `mobile-tab-bar.tsx` — t() 적용
- 메인 + 주요 20개 페이지 히어로 — t() 적용

### MEGA 2: CI/CD 자동화 (75→78점) — 효과 +3

**파일:**
- `.github/workflows/ci.yml` — Push → Lint → Type-check → Test → Build
- `.github/workflows/deploy.yml` — main 브랜치 → Vercel 자동 배포
- `.github/workflows/security.yml` — npm audit + Snyk 취약점 스캔
- `.github/workflows/preview.yml` — PR → Preview 배포 URL 자동 생성

```yaml
# ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```

### MEGA 3: MFA/보안 완성 (78→80점) — 효과 +2

**파일:**
- `lib/mfa.ts` — TOTP 생성/검증 (otpauth 라이브러리)
- `app/(auth)/mfa-setup/page.tsx` — QR 코드 표시 + 인증 앱 연결
- `app/(auth)/mfa-verify/page.tsx` — 로그인 시 6자리 코드 입력
- `app/api/v1/auth/mfa/setup/route.ts` — TOTP secret 생성
- `app/api/v1/auth/mfa/verify/route.ts` — 코드 검증
- `middleware.ts` — MFA 필수 역할 (ADMIN, TENANT_ADMIN) 체크

### MEGA 4: 성능 극대화 (80→82점) — 효과 +2

**Server Component 전환 (30페이지):**
- `exchange/page.tsx` — 서버에서 fetch, 클라이언트는 필터만
- `professional/page.tsx` — 서버 fetch
- `guide/*` — 전부 Server Component (정적)
- `knowledge/*` — 서버 fetch
- 매물 상세 — ISR `revalidate: 300`

**번들 최적화:**
- `next.config.mjs` — `experimental.optimizePackageImports`
- Recharts → dynamic import
- 미사용 코드 제거 (tree-shaking 확인)

**Edge Runtime:**
- 정적 API (listings GET, institutions GET) → Edge Runtime
- `export const runtime = 'edge'`

**이미지:**
- 모든 `<img>` → `<Image>` (next/image)
- WebP/AVIF 자동 변환
- `priority` 속성 히어로 이미지에 적용

### MEGA 5: 테스트 프로덕션급 (82→84점) — 효과 +2

**Playwright E2E (50 시나리오):**
- `playwright.config.ts` — 설정
- `e2e/auth.spec.ts` — 로그인/가입/로그아웃
- `e2e/deal-flow.spec.ts` — 매물→관심표명→NDA→실사→계약
- `e2e/admin.spec.ts` — 관리자 전체 페이지 접근
- `e2e/search.spec.ts` — 매물 검색/필터/정렬
- `e2e/professional.spec.ts` — 전문가 상담 요청

**시각적 회귀 테스트:**
- `__tests__/visual/` — 주요 페이지 스크린샷 비교

**부하 테스트:**
- `k6/load-test.js` — 동시 100 사용자 시뮬레이션

### MEGA 6: 네이티브 앱 빌드 (84→86점) — 효과 +2

**Capacitor 실제 빌드:**
- `next.config.mjs` — `output: 'export'` 모드 추가
- `package.json` — `build:app` 스크립트
- `android/` — Android 프로젝트 생성
- `ios/` — iOS 프로젝트 생성 (macOS 필요)
- 카메라 OCR 연동 (`@capacitor/camera`)
- 푸시 알림 (`@capacitor/push-notifications` + FCM)
- 생체 인증 (Face ID / 지문)

### MEGA 7: Supabase 실연동 완성 (86→92점) — 효과 +6

**가장 큰 점수 상승. 모든 mock이 실데이터로:**

Phase A — DB 생성 + 시드:
- Supabase 대시보드에서 마이그레이션 실행 (001_full_schema.sql)
- 시드 데이터: 매물 100건, 기관 10개, 전문가 50명, 교육과정 5개

Phase B — Auth 실연동:
- Supabase Auth 회원가입/로그인
- 소셜 로그인 (카카오, 구글)
- 이메일 인증
- 비밀번호 재설정

Phase C — Storage 실연동:
- 프로필 사진 → avatars 버킷
- 배너 이미지 → banners 버킷
- 실사 서류 → documents 버킷
- OCR 업로드 → documents 버킷

Phase D — Realtime 실연동:
- 딜룸 채팅 실시간
- 거래 상태 변경 알림
- 사용자 프레즌스 (온라인/오프라인)

### MEGA 8: AI 완전 연동 (92→96점) — 효과 +4

**Claude API 실연동:**
- NPL 적정가 분석 → 실시간 결과
- AI 실사 리포트 → PDF 자동 생성
- AI 매칭 → 매수자 프로필 ↔ 매물 자동 매칭
- AI 챗봇 → 자연어 거래 (Claude 실연동)
- AI OCR → DocumentAI 실연동
- AI 시장 요약 → 주간/월간 자동 리포트
- AI 자동 번역 → 콘텐츠 실시간 번역

### MEGA 9: 실 결제 + 정산 (96→99점) — 효과 +3

**토스페이먼츠 실연동:**
- 테스트 모드 → 프로덕션 전환
- 구독 자동 갱신 (Billing Key)
- 크레딧 즉시 충전
- 가상계좌 (대금 거래용)
- 정산 자동화 (월말 배치)
- 세금계산서 연동

### MEGA 10: 혁신 기능 (99→105점) — 효과 +6 (보너스)

- AI 자연어 거래 에이전트 ("강남 5억 이하 매물 찾아서 관심 표명해줘")
- 실시간 화상 상담 (WebRTC)
- 블록체인 거래 인증 (해시 기록)
- AR 담보물 현장 확인 (Capacitor + ARKit)
- 자동 법률 검토 AI
- 예측 모델 (NPL 시장 물량/가격 예측)

---

## 타임라인

| 주차 | MEGA TIER | 점수 | 핵심 |
|------|-----------|------|------|
| 1 | 다국어 실적용 | 75 | 네비+푸터+메인 번역 |
| 2 | CI/CD + MFA | 80 | GitHub Actions, TOTP |
| 3 | 성능 + 테스트 | 84 | Server Component, Playwright |
| 4 | 앱 빌드 | 86 | Capacitor Android/iOS |
| 5-6 | Supabase 실연동 | 92 | 실 DB/Auth/Storage/Realtime |
| 7 | AI 완전 연동 | 96 | Claude/DocumentAI 실작동 |
| 8 | 실 결제 | 99 | 토스 실결제 |
| 9-10 | 혁신 기능 | 105 | AI 에이전트, AR, WebRTC |

---

## 사용자 필수 액션

| 시기 | 할 일 | 비용 |
|------|------|------|
| 즉시 | Supabase 프로젝트 생성 | 무료 |
| 즉시 | Anthropic API 키 발급 | 사용량 과금 |
| 즉시 | GitHub 리포지토리 생성 | 무료 |
| 1주차 | Vercel 배포 | 무료~$20/월 |
| 3주차 | 도메인 구매 (nplatform.co.kr) | ~3만원/년 |
| 5주차 | 토스페이먼츠 가맹점 등록 | 무료 (수수료만) |
| 6주차 | Google Cloud 프로젝트 (DocumentAI) | 사용량 과금 |
| 7주차 | Apple Developer ($99/년) | $99 |
| 7주차 | Google Play ($25 일회) | $25 |
| 8주차 | 영어/일본어 네이티브 검수 | 외주 비용 |
