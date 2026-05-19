# 모바일 앱 셋업 가이드

NPLatform을 모바일 앱(iOS/Android)으로 배포하는 두 가지 경로.

---

## 옵션 A — PWA (현재 사용 가능, 추가 작업 X)

**상태**: ✅ 활성화 완료

- `public/manifest.json` — PWA 메타 정보 (이름·아이콘·shortcuts)
- `public/sw.js` 또는 `next-pwa` — Service Worker (오프라인·캐시)
- 사용자가 모바일 브라우저에서 "홈 화면에 추가" → 앱처럼 동작

**장점**: 추가 빌드/배포 불필요, 즉시 업데이트
**단점**: 푸시 알림 제한 (iOS Safari), 앱스토어 등록 X

---

## 옵션 B — Capacitor (네이티브 앱 빌드)

**상태**: 🟡 셋업 가이드만 (실제 빌드는 별도 작업)

### 1) 의존성 설치

```bash
pnpm add -D @capacitor/core @capacitor/cli
pnpm add @capacitor/ios @capacitor/android @capacitor/preferences @capacitor/push-notifications

# 정적 export 빌드 위해 (또는 next-on-capacitor 어댑터)
pnpm add -D @capacitor/assets
```

### 2) capacitor.config.ts 작성

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'co.kr.nplatform.app',
  appName: 'NPLatform',
  webDir: 'out',                  // next build 결과
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'nplatform-pi.vercel.app',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Preferences: {
      group: 'NPLatformPrefs',
    },
  },
}

export default config
```

### 3) Next.js 정적 export 설정

`next.config.ts` 에 추가:
```ts
const config = {
  // 기존 ...
  output: 'export',     // Capacitor 빌드 시에만 활성화 (env 분기 권장)
  images: { unoptimized: true },
}
```

⚠ `output: 'export'` 활성화 시 일부 동적 라우트 (예: `/exchange/[id]` SSR)는 generateStaticParams 필요. 웹은 Vercel SSR 유지하고 모바일만 정적 export 하려면 별도 빌드 스크립트 권장.

### 4) 플랫폼 추가 + 빌드

```bash
# Web 정적 빌드
npm run build  # output: 'export' 모드일 때

# Capacitor 동기화
npx cap sync

# 플랫폼 추가
npx cap add ios
npx cap add android

# Xcode / Android Studio 열기
npx cap open ios
npx cap open android
```

### 5) 앱스토어 등록

- **App Store Connect** — Apple Developer 계정 ($99/년)
- **Google Play Console** — Google Developer 계정 ($25 일회)
- 심사 가이드라인 준수 — 금융 카테고리는 추가 서류 필요

---

## 옵션 C — Expo (React Native 풀 마이그레이션)

**상태**: ❌ 별도 repo 권장

- 별도 repo `nplatform-mobile/` 에서 React Native + Expo
- Web 과 API 공유 (`@/lib/*` 일부 재사용 가능)
- 네이티브 기능 (카메라·생체인증·푸시) 완전 지원
- 공수: 3~6개월 풀스택 1명

---

## 권장 로드맵

| 단계 | 작업 | 기간 |
|---|---|---|
| **Phase 1** (현재) | PWA 활용 — 사용자 "홈 화면 추가" 안내 | 즉시 |
| **Phase 2** (Q3 2026) | Capacitor 셋업 — 앱스토어 등록 (PWA 래핑) | 2~3주 |
| **Phase 3** (Q1 2027) | 푸시 알림·생체인증·카메라 OCR 통합 | 4~6주 |
| **Phase 4** (Q2 2027) | 필요 시 React Native 풀 마이그레이션 | 3~6개월 |

---

## 모바일 UX 체크리스트

### 반응형 (필수)
- ✅ TopBar — 모바일 햄버거 메뉴
- ✅ 거래소 카드 — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- ✅ 분석 보고서 — XRF 터미널 KPI 4-col → 모바일 2-col
- ✅ 폼 — `grid-cols-1 sm:grid-cols-2`
- 🟡 지도 — 모바일 풀스크린 + 필터 bottom-sheet

### 모바일 전용 패턴
- 🔵 Bottom navigation (5개 탭) — 우선순위 높은 경우
- 🔵 Pull-to-refresh
- 🔵 Swipe gestures (목록 좌우 스와이프 → 빠른 액션)
- 🔵 Sticky CTA (입찰·매수 버튼 화면 하단 고정)

### 성능
- 🔵 Image lazy loading (`next/image` 활용)
- 🔵 List virtualization (`react-window`) — 100+ 매물 목록
- 🔵 Bundle size < 250KB initial (현재 미측정)
