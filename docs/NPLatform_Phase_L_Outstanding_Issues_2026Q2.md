# Phase L · 잔여 핵심 이슈 해결 계획

**Status**: 🟡 진행 중
**작성일**: 2026-04-25
**배경**: 사용자가 G7+/Phase H/I 작업 후에도 여전히 미해결로 지적한 이슈를 모아 정리.

---

## 0. 사용자 지적 vs 현재 상태 매핑

| # | 사용자 지적 | 현재 상태 | 잔여 작업 |
|---|---|---|---|
| 1 | 자발적 경매 등록이 어떻게 하는지 명확치 않음 (입력 폼만 있음) | ✅ 페이지 제목 "자발적 경매 등록" 으로 변경 + POST API 작동 | 완료 |
| 2 | NPLatform 전속 계약은 매각 수수료 설정 시에 같이 | ✅ Phase G5 — FeeSection 최상단으로 이동 | 완료 |
| 3 | 매물 등록 시 경매 동시 등록 + 종료일 | ✅ Step3 토글 + 종료일/최저입찰가 + POST API 동시 호출 | 완료 |
| 4 | 자발적 경매에서 일정 조정 가능 | ✅ /my/listings/[id]/edit + /admin/listings/[id]/edit 패널 | 완료 |
| 5 | 매각사 매물 정보 수정 화면 | ✅ /my/listings/[id]/edit + /my/seller "수정" 링크 | 완료 |
| 6 | 관리자 매물 수정 | ✅ /admin/listings/[id]/edit + 액션 열 "편집" | 완료 |
| **7** | **모달 다음 클릭 시 스크롤이 하단에 위치 — 위로 다시 올려야** | 🟡 NplModal 5곳 적용했으나 일부 페이지 위자드는 미처리 | **L1 · 위자드 step 전수 처리** |
| **8** | **영어/일본어 번역 전혀 안 됨 (메뉴 상위만)** | 🔴 **CSP 누락 + Portal 미감지가 원인** | **L2 · i18n 전수 적용** |

---

## 1. L1 · 모달/위자드 scroll-to-top 전수 처리

### 1.1 현재까지 처리된 곳
- ✅ `app/(main)/exchange/sell/page.tsx` · step 이동 시 `window.scrollTo`
- ✅ `app/(main)/exchange/auction/new/page.tsx` · `handleNext/Prev` 에서 처리
- ✅ `components/overlay/npl-modal.tsx` · open 변경 시 contentRef scrollTo (5곳에서 사용 중)

### 1.2 잔여 위자드 (step 이동 시 스크롤 누락 가능성)
- `app/(main)/analysis/new/page.tsx` (NPL 분석 위자드)
- `app/(main)/exchange/edit/[id]/page.tsx` (구 매물 편집)
- `app/(main)/exchange/court-auction/page.tsx` (입찰 모달은 NplModal · 외부 페이지는 OK)
- `app/(main)/services/experts/register/page.tsx` (전문가 등록)
- `app/(main)/deals/teams/new/page.tsx` (딜룸 팀 신규)

### 1.3 작업
- [ ] 위 페이지의 step 변경 함수 전수 grep → `window.scrollTo({top:0, behavior:'smooth'})` 추가
- [ ] step 컨테이너에 `id="wizard-step-top"` 부여 → element.scrollIntoView 도 옵션 (sticky 헤더 회피)

---

## 2. L2 · i18n 자동 번역 전수 적용 (가장 큰 미해결 이슈)

### 2.1 현재 인프라 (이미 구축됨)
- `lib/i18n.ts` (1230 lines) — Locale 관리, 정적 사전, Google Translate 연동, useTranslation hook
- `components/translate/auto-translate-provider.tsx` (203 lines) — DOM walker + MutationObserver
- `app/layout.tsx` — `<AutoTranslateProvider />` 마운트됨

### 2.2 근본 원인 분석
**🔴 RC1 · CSP `connect-src` 누락 (CRITICAL)**
- `middleware.ts` L239 의 CSP에 `https://translate.googleapis.com` 없음
- 브라우저가 Google Translate fetch 를 차단 → 번역 호출 실패
- → **이미 즉시 fix 적용** (이번 커밋)

**🔴 RC2 · MutationObserver 가 Portal 미감지**
- 기존: `document.body` 만 observe, `subtree:true` (Portal 도 body 자식이라 작동해야 함)
- 그러나 `characterData:false` → 텍스트 노드 변경 미감지
- 그러나 `attributes:false` → placeholder 동적 변경 미감지
- → **이미 즉시 fix 적용** (이번 커밋)

**🟡 RC3 · React 동적 텍스트 (interpolation)**
- `${count}건` 같은 패턴은 count 변수 변경 시 텍스트 노드만 갈리는데
  characterData 옵션 없이는 못 잡음 → 위 RC2 와 함께 해결됨

**🟡 RC4 · Select option 텍스트 미처리**
- `<option>` 태그 안의 텍스트는 일부 브라우저에서 일반 textnode 와 다르게 처리
- → IGNORED_TAGS 에서 제외 안 했으니 동작해야 함

**🟡 RC5 · 정적 사전 부족**
- STATIC_DICT 가 핵심 메뉴 위주
- 모달 내부 텍스트, 버튼 라벨, 에러 메시지 등 누락
- Google Translate 가 작동하면 자동 채워짐

### 2.3 검증 방법
1. 배포 후 https://nplatform-pi.vercel.app 진입
2. 우측 상단 언어 토글 → English / 日本語 선택
3. DevTools Network 패널 → `translate.googleapis.com` fetch 호출 확인
4. DevTools Console 패널 → CSP 위반 에러 사라졌는지 확인
5. 모달 / 드롭다운 / 입력 placeholder 실제 번역 동작 확인

### 2.4 후속 보강 (다음 스프린트)
- [ ] **빌드타임 정적 사전 자동 추출**: 빌드 시 모든 .tsx 파일에서 한글 텍스트 추출 → STATIC_DICT 에 자동 등록
- [ ] **번역 캐시 영구 저장**: localStorage → Supabase 테이블 (translation_cache) 전환
- [ ] **번역 Quality 게이트**: 금융 용어 (담보·매각·낙찰 등) 사전 정의 → 자동 번역 결과 오버라이드
- [ ] **언어별 폰트 fallback**: ja → "Noto Sans JP" / en → "Inter" 등 layout.tsx 에서 분기

---

## 3. L3 · 추가 후속 (중요도 중)

### 3.1 알림 시스템 (사용자 요청 우선 반영)
- 자발적 경매 종료일 변경 시 입찰자에게 알림 발송 (현재 코드에서 안내문만 있음)
- 매도자 → 매수자 매칭 시 양쪽 모두에 알림
- 이메일 + 인앱 알림 통합

### 3.2 WebSocket 실시간 입찰
- 자발적 경매·법원경매 입찰가 실시간 업데이트
- 마감 임박 시 카운트다운 + 자동 새로고침

### 3.3 Bulk Action
- /admin/listings 선택 매물 일괄 승인/거절/숨김

---

## 4. 우선순위·일정

| 우선순위 | 작업 | 예상 시간 | 영향도 |
|---|---|---|---|
| **P0** | L2 · CSP fix + Portal 감지 (이번 커밋) | 즉시 | 🔴 매우 높음 |
| **P0** | L2 · 검증 (배포 후 사용자 확인) | 5분 | 🔴 매우 높음 |
| **P1** | L1 · 잔여 위자드 scroll-to-top | 30분 | 🟡 높음 |
| **P1** | L2 · 정적 사전 자동 추출 (빌드타임) | 1일 | 🟡 높음 |
| **P2** | L3.1 · 알림 시스템 통합 | 3일 | 🟡 중간 |
| **P2** | L3.2 · WebSocket 실시간 입찰 | 1주 | 🟢 중간 |
| **P3** | L3.3 · Bulk Action | 1일 | 🟢 낮음 |

---

## 5. 즉시 적용 (이번 커밋)

- ✅ `middleware.ts` CSP 에 `https://translate.googleapis.com` 추가
- ✅ `AutoTranslateProvider` 의 MutationObserver 옵션 보강
  - `characterData: true` (텍스트 노드 변경 감지)
  - `attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label']`
- ✅ Phase L 계획서 작성 (이 문서)

다음 스프린트 (사용자 확인 후):
- L1 위자드 전수 + L2 정적 사전 추출 + L3 알림 시스템

---

_작성자 · NPLatform 엔지니어링팀 · Phase L 리드_
