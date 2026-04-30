# 마이페이지 재구조화 기획·개발계획서 (2026 Q2)

> **테마**: McKinsey "Less is More" — 메뉴 절반 감축 · 역할 기반 노출 · 통합 알림센터
> **소유자**: NPLatform / TransFarmer Inc.
> **작성일**: 2026-04-29
> **상태**: 기획안 (개발 미착수 · 사용자 검토 후 Phase 진입)

---

## 1. Executive Summary (3줄)

1. 현재 마이페이지는 **19개 라우트 / 12개 SubNav 메뉴**로 사용자가 자기가 어디 있는지 자주 잃습니다.
2. **8개 코어 메뉴 + 통합 알림센터 1개**로 감축, **역할 기반 동적 노출**을 적용해 회원당 평균 5~7개만 보이도록 합니다.
3. 디자인 토큰·기존 페이지 컴포넌트는 100% 유지 — **메뉴 체계와 라우팅만 재정비**합니다 (개발 부담 최소).

---

## 2. As-Is 분석 — 현재 구조의 문제

### 2.1 현재 19개 라우트 전수
```
app/(main)/my/
├── page.tsx               대시보드
├── deals/                 내 딜룸
├── demands/               매수 수요
├── agreements/            계약 관리 (NDA·LOI 이력)
├── portfolio/             관심매물·포트폴리오
│   └── analytics/           ↳ 포트폴리오 분석
├── seller/                매도자 관리
├── partner/               파트너 관리
├── billing/               결제·크레딧
├── notifications/         알림
├── notices/               공지사항
├── inquiries/             문의 내역
├── settings/              설정
│   └── menu/                ↳ 메뉴 설정
├── organization/          기관 통합 계정
├── professional/          전문가 인증
├── kyc/                   투자자 인증 (사업자등록증·명함)
├── verify/                본인인증 (L0→L1)
├── privacy/               개인정보 설정 (관리자 전용)
├── developer/             개발자 (debug?)
└── listings/              내 매물 (seller 페이지와 중복?)
    └── [id]/edit/           ↳ 매물 편집 (서비스 편집 기능)
```

### 2.2 식별된 문제
| # | 문제 | 영향 |
|---|---|---|
| **P1** | 12개 SubNav 라벨이 모든 회원에게 동일하게 노출 — "매도자 관리"가 매수자에게 보이는 등 | 인지 부하 ↑ · 전환율 ↓ |
| **P2** | 알림 / 공지 / 문의 3개로 분리 — 사용자는 "내 메시지"라는 단일 멘탈 모델로 인식 | 클릭 분산 · 중요 알림 누락 위험 |
| **P3** | 인증 라우트 3개 분리 (kyc · verify · professional) — 사용자가 어떤 인증을 어디서 받는지 혼동 | 가입 깔때기 이탈 ↑ |
| **P4** | listings vs seller 기능 중복 — 두 곳에서 매물 편집 가능 | 데이터 정합성 위험 (Phase 3 자동 동기화의 단일 진입점 흐려짐) |
| **P5** | settings/menu, portfolio/analytics, listings/[id]/edit 등 2-depth 라우트가 SubNav 에 노출 안 됨 — 발견율 저하 | 기능 dead pool 화 |
| **P6** | privacy 는 관리자 전용인데 일반 메뉴 자리에 위치 (현재는 layout gate 로 차단) | 정보 구조 혼탁 |
| **P7** | developer 라우트는 무엇인지 불명확 — 운영 메뉴에 노출 시 보안 risk | 정리 필요 |

---

## 3. Design Principles — McKinsey 관점

| 원칙 | 적용 |
|---|---|
| **Pyramid Principle** (결론 먼저) | Dashboard 가 모든 정보의 진입점 · KPI 4개 · 다음 액션 1개 강조 |
| **MECE** (Mutually Exclusive · Collectively Exhaustive) | 각 메뉴 항목이 명확히 구분 · 누락·중복 없음 |
| **3-Click Rule** | 어떤 기능이든 마이페이지 진입 후 3클릭 이내 도달 |
| **Role-Driven Reveal** | 회원 역할에 무관한 항목만 default · 나머지는 권한 충족 시 동적 노출 |
| **Less is More** | 12 → 8 메뉴 (33% 감축) · 인증·설정류는 모두 단일 진입점으로 통합 |
| **Service Edit Continuity** | 매물 편집 등 핵심 운영 기능은 라우트 변경 X (북마크·딥링크 보존) |

---

## 4. To-Be 메뉴 구조 (재설계안)

### 4.1 신규 SubNav (8개)
```
1. 대시보드            /my              [모든 역할]
2. 내 딜룸            /my/deals        [모든 역할]
3. 매수 수요          /my/demands      [BUYER · MONEY_LENDER · AMC · GENERAL · PARTNER]
4. 계약 관리          /my/agreements   [모든 역할]
5. 매도자 관리        /my/seller       [SELLER 권한 보유자 — INSTITUTION/MONEY_LENDER/AMC/GENERAL/PARTNER]
6. 관심매물·포트폴리오  /my/portfolio    [모든 역할 (ADMIN 외)]
7. 파트너 관리        /my/partner      [PARTNER]
8. 결제·크레딧        /my/billing      [모든 역할]
─────────────────────────────────
* 알림센터  /my/inbox  [모든 역할 · 통합]    ← 우측 상단 배지 진입
* 설정      /my/settings [모든 역할 · 모든 인증·계정 통합]
```

### 4.2 통합 알림센터 (`/my/inbox`)
**기존 3개 → 단일 페이지 + 3-탭**
- 탭 1: **알림** (시스템 · 거래 이벤트)
- 탭 2: **공지** (운영팀 공지 · 정책 변경)
- 탭 3: **문의** (1:1 문의 + 답변)

읽음 처리 / 검색 / 필터 / 일괄 처리 모두 단일 컴포넌트에서 처리.
헤더 우측 상단 종 아이콘 → unread 합계 배지 → `/my/inbox` 진입.

### 4.3 통합 설정 (`/my/settings`)
**기존 분산된 6개 → 단일 페이지 + 좌측 사이드 메뉴**

| 사이드 항목 | 내용 | 기존 라우트 |
|---|---|---|
| 프로필 | 이름·연락처·프로필 사진 | settings 일부 |
| 본인인증 (L0→L1) | 휴대폰·실명 인증 | verify |
| 사업자·투자자 인증 | 사업자등록증·명함 (KYC) | kyc |
| 전문가 인증 | 자격증·경력 (PROFESSIONAL 만) | professional |
| 기관 계정 | 멤버 초대·권한 (INSTITUTION/AMC) | organization |
| 알림 환경설정 | 채널·시간대·관심 키워드 | settings/menu |
| 보안 | 비밀번호·2FA·로그인 이력 | settings 일부 |
| 개인정보 (관리자만) | PII Access Log·파기 요청 | privacy |
| **계정 삭제** | 회원 탈퇴 | (신규) |

→ 인증 3종 (verify/kyc/professional) 이 한 페이지의 사이드 메뉴로 통합되어
**"가입 → 인증 → 거래" 깔때기**가 명확해집니다.

### 4.4 대시보드 (`/my`) — 종합 진입점
McKinsey editorial 그리드 1280px:

```
┌──────────────────────────────────────────────────────────┐
│  Hero: 환영 메시지 + 다음 액션 1개 (CTA · 미인증·미완료) │
└──────────────────────────────────────────────────────────┘
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ KPI 1       │ KPI 2       │ KPI 3       │ KPI 4       │
│ 진행 딜룸   │ 미확인 알림 │ 활성 매물   │ 잔여 크레딧│
└─────────────┴─────────────┴─────────────┴─────────────┘
┌──────────────────────────────┬───────────────────────────┐
│ Section A · 최근 활동        │ Section B · 추천 액션     │
│  · 마지막 본 매물 3개        │  · 인증 미완료 알림       │
│  · 최근 메시지 2건           │  · 매수 수요 매칭 N건     │
│  · 진행 중 계약 2건          │  · 새 공지 1건            │
└──────────────────────────────┴───────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Quick Links · 역할별 동적 표시 (4~6개 카드)              │
│ [내 딜룸] [관심매물] [매도자 관리] [결제] [설정]         │
└──────────────────────────────────────────────────────────┘
```

핵심: **Hero CTA 1개** · **KPI 4개** · **추천 액션 카드 N개** · 그 외 모두 SubNav 로 위임.

---

## 5. 역할 × 메뉴 가시성 매트릭스

| 메뉴 | SUPER_ADMIN | ADMIN | INSTITUTION | MONEY_LENDER | AMC | GENERAL | PARTNER | PROFESSIONAL | BUYER (개인) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 대시보드 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 내 딜룸 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 매수 수요 | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| 계약 관리 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 매도자 관리 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| 관심매물·포트폴리오 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| 파트너 관리 | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| 결제·크레딧 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 알림센터 (통합) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 설정 (통합) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> ❗ 현재 `lib/roles.ts` UserRole enum 에 MONEY_LENDER/AMC/GENERAL 이 별도 표현되지 않음.
> → 회원 가입 시 `institution_type` (BANK/SAVINGS_BANK/AMC/MONEY_LENDER/...) + UserRole 조합으로 판정.
> 구현 시 `useEffectiveRoles()` 헬퍼 신설 (Phase 1 참조).

매도자 권한 판정:
```
isSeller =
  hasRole('SELLER') ||
  hasRole('INSTITUTION') ||
  ['AMC', 'MONEY_LENDER'].includes(institution_type) ||
  hasRole('PARTNER') ||
  hasRole('GENERAL')
```

---

## 6. 라우트 마이그레이션 맵

| 현재 (19개) | 신규 (10개) | 처리 방법 |
|---|---|---|
| `/my` | `/my` | 유지 (단순화) |
| `/my/deals` | `/my/deals` | 유지 |
| `/my/demands` | `/my/demands` | 유지 |
| `/my/agreements` | `/my/agreements` | 유지 |
| `/my/seller` | `/my/seller` | 유지 |
| `/my/partner` | `/my/partner` | 유지 |
| `/my/portfolio` | `/my/portfolio` | 유지 |
| `/my/portfolio/analytics` | `/my/portfolio?tab=analytics` | 쿼리 탭으로 흡수 |
| `/my/billing` | `/my/billing` | 유지 |
| **`/my/notifications`** | `/my/inbox?tab=alerts` | 통합 + redirect |
| **`/my/notices`** | `/my/inbox?tab=notices` | 통합 + redirect |
| **`/my/inquiries`** | `/my/inbox?tab=inquiries` | 통합 + redirect |
| **`/my/verify`** | `/my/settings?tab=verify` | 통합 + redirect |
| **`/my/kyc`** | `/my/settings?tab=kyc` | 통합 + redirect |
| **`/my/professional`** | `/my/settings?tab=professional` | 통합 + redirect |
| **`/my/organization`** | `/my/settings?tab=organization` | 통합 + redirect |
| **`/my/settings/menu`** | `/my/settings?tab=alerts` | 통합 + redirect |
| `/my/privacy` | `/my/settings?tab=privacy` (ADMIN only) | 통합 + redirect |
| **`/my/developer`** | ❌ 삭제 (운영 위험) | 제거 |
| **`/my/listings`** | ❌ 삭제 (`/my/seller` 와 중복) | 매물 편집은 `/my/seller/[id]/edit` 단일 진입 |
| `/my/listings/[id]/edit` | `/my/seller/[id]/edit` | **이동** (서비스 편집 기능 — 핵심) |

기존 URL 은 모두 **301 redirect** 로 보존 → 북마크·외부 링크 무사.

---

## 7. 삭제·통합 권고 요약

### 7.1 완전 삭제 (2개)
| 라우트 | 이유 |
|---|---|
| `/my/developer` | 용도 불명 / 운영 위험 — 디버그용이면 admin/ 으로 이전 |
| `/my/listings` | seller 와 100% 중복 — 매물 등록·편집은 `/my/seller` 로 일원화 |

### 7.2 통합 (9 → 2)
| 통합 대상 | 신규 페이지 |
|---|---|
| notifications · notices · inquiries (3개) | `/my/inbox` (3-탭) |
| settings · settings/menu · verify · kyc · professional · organization · privacy (7개) | `/my/settings` (사이드 메뉴) |

### 7.3 유지 (8개)
대시보드 · 내 딜룸 · 매수 수요 · 계약 관리 · 매도자 관리 · 관심매물·포트폴리오 · 파트너 관리 · 결제·크레딧

### 7.4 결과
- 라우트: 19 → **10** (47% 감축)
- 사용자가 보는 메뉴: 12 → **평균 6~8** (역할별 동적)
- 정보 깊이: 최대 3-depth → **2-depth + 탭 패턴**

---

## 8. 단계별 개발 계획 (Phase 1~4)

### Phase 1 — 기반 정비 (3~5일)
- [ ] `lib/my-nav.ts` 신규: 메뉴 카탈로그 + 역할 매트릭스를 SSoT 로 추출
- [ ] `useEffectiveRoles()` 헬퍼: UserRole + institution_type → 역할 boolean 집합 변환
- [ ] `MyLayout` 의 SubNav 가 `useEffectiveRoles()` 결과로 동적 필터링되도록 리팩터
- [ ] 메뉴 라벨 i18n 키 정리

### Phase 2 — 통합 페이지 신규 (5~7일)
- [ ] `/my/inbox` 신규 — 3-탭 (알림/공지/문의) · 검색 · 일괄 읽음 · unread 카운터 API
- [ ] `/my/settings` 리뉴얼 — 좌측 사이드 메뉴 (8개 섹션) · 각 섹션은 기존 페이지 컴포넌트 그대로 import
- [ ] 헤더 종 아이콘 → `/my/inbox` 라우트 변경

### Phase 3 — Migration & Redirects (1~2일)
- [ ] 기존 9개 라우트 → 새 라우트로 301 redirect (`next.config.js` 또는 미들웨어)
- [ ] `/my/listings/[id]/edit` → `/my/seller/[id]/edit` 이동 (파일 이동 + redirect)
- [ ] `/my/developer` 삭제

### Phase 4 — 대시보드 강화 (3~5일)
- [ ] Hero CTA: 다음 액션 1개 자동 선정 (인증 미완료 우선 → 매칭 알림 → 신규 공지)
- [ ] KPI 4개: 진행 딜룸 / 미확인 알림 / 활성 매물 / 잔여 크레딧 (실시간 useQuery)
- [ ] Section A · B 그리드 + Quick Links 동적 카드
- [ ] 디자인 토큰: 기존 `MCK_*` 그대로 사용 (디자인 변경 X)

### Phase 5 (옵션) — A/B 테스트 & 측정 (2주)
- [ ] 신규 마이페이지 진입 → 첫 클릭까지 시간 (TTFC)
- [ ] 인증 완료율 (signup → KYC 완료)
- [ ] 알림센터 unread → read 전환율
- [ ] 핵심 페이지(딜룸·계약) 도달 클릭 수

총 공수: **2.5~3주** (1인 풀타임 기준 · QA 포함)

---

## 9. 기존 기능 보존 약속 (Critical)

다음 기능은 라우트가 바뀌어도 **동작·UX 100% 보존** 합니다:

| 기능 | 현재 | 신규 | 비고 |
|---|---|---|---|
| 매물 편집 | `/my/listings/[id]/edit` | `/my/seller/[id]/edit` | UnifiedListingForm 재사용 |
| 매물 PATCH → 분석/딜룸 자동 동기화 | Phase 3 완료 | 동일 작동 | 백엔드 변경 X |
| KYC 업로드 | `/my/kyc` | `/my/settings?tab=kyc` | 컴포넌트 그대로 import |
| 본인인증 L0→L1 | `/my/verify` | `/my/settings?tab=verify` | 컴포넌트 그대로 import |
| 결제 / 크레딧 | `/my/billing` | `/my/billing` | 변경 없음 |
| 딜룸 진입 | `/my/deals` | `/my/deals` | 변경 없음 |
| 관심매물 토글 | `/my/portfolio` | `/my/portfolio` | 변경 없음 |
| 매수 수요 등록 | `/my/demands` | `/my/demands` | 변경 없음 |

→ **백엔드 API · DB 스키마 변경 0건** · 프론트 라우팅·UI 만 재배치.

---

## 10. 리스크·미해결 이슈

| # | 이슈 | 대응 |
|---|---|---|
| **R1** | `lib/roles.ts` 의 UserRole enum 에 MONEY_LENDER/AMC/GENERAL 이 명시 안 됨 | Phase 1 에서 institution_type 매핑 헬퍼로 해결 (DB 스키마 변경 X) |
| **R2** | 사용자가 기존 북마크로 진입 시 redirect chain | next.config.js 의 `redirects()` 로 즉시 308/301 처리 |
| **R3** | `/my/inbox` 통합 시 알림 타입별 RLS 정책 충돌 가능성 | API 레벨에서 type 별 query 분기 (테이블은 그대로 유지) |
| **R4** | settings 사이드 메뉴 deep link (?tab=) 검색엔진 인덱싱 | `<title>` 동적 + `noindex` for tabs |
| **R5** | 헤더 우상단 종 아이콘 클릭 시 기존 동작 변경 | A/B 토글로 점진 전환 (Phase 2 옵션) |

---

## 11. 사용자 검토 체크리스트

기획안 확정 전 확인 필요:

- [ ] **8개 코어 메뉴** 구성에 동의하시나요? (대시보드 / 딜룸 / 매수수요 / 계약 / 매도자 / 포트폴리오 / 파트너 / 결제)
- [ ] **알림센터 통합** (알림+공지+문의 → 1개 페이지 3-탭) 동의하시나요?
- [ ] **설정 통합** (인증 3종 + 기관 + 알림설정 + 보안 → 1개 페이지 사이드메뉴) 동의하시나요?
- [ ] **`/my/listings` 삭제** + 매물편집을 `/my/seller/[id]/edit` 으로 이동 동의하시나요?
- [ ] **`/my/developer` 삭제** 동의하시나요? (또는 admin/ 으로 이전?)
- [ ] **MONEY_LENDER/AMC/GENERAL 매핑** 정책 (institution_type 기준) 동의하시나요?
- [ ] **Phase 1~4 일정** (총 ~3주) 적합하시나요?

→ 위 체크리스트 답변 후 Phase 1 착수.

---

## 12. 부록 A — 8개 코어 페이지 책임 정의 (1줄)

| 메뉴 | 한 문장 책임 |
|---|---|
| 대시보드 | "오늘 내가 할 다음 한 가지" + KPI 4개 + 최근 활동 요약 |
| 내 딜룸 | 내가 매수자/매도자/참관자로 참여 중인 모든 딜룸 흐름 추적 |
| 매수 수요 | 내가 등록한 NPL/부동산 매수 조건 + 매칭 결과 관리 |
| 계약 관리 | NDA·LOI·매매계약·전자서명 이력 (송수신) 단일 진입 |
| 매도자 관리 | 내 매물 등록·편집·노출 상태 + 매수 문의 응답 (UnifiedListingForm) |
| 관심매물·포트폴리오 | 즐겨찾기 + 보유 매물 손익·분석 (탭으로 분리) |
| 파트너 관리 | 자문사 본인의 사건 의뢰·수임·정산 (PARTNER 전용) |
| 결제·크레딧 | 결제 수단 · 크레딧 잔액 · 인보이스 · 정기결제 |

## 부록 B — 통합 알림센터 3-탭 책임

| 탭 | 데이터 소스 | 행위 |
|---|---|---|
| 알림 | `notifications` 테이블 (시스템·거래) | 읽음 처리·삭제·필터·검색 |
| 공지 | `community_posts` (type=NOTICE) | 읽음 처리·검색 |
| 문의 | 1:1 문의 + 답변 thread | 답변 알림·재문의 |

## 부록 C — 통합 설정 사이드 메뉴 책임

| 섹션 | 컴포넌트 | 비고 |
|---|---|---|
| 프로필 | (신규 또는 기존 settings 일부) | 이름·연락처·사진 |
| 본인인증 | 기존 verify 페이지 컴포넌트 import | L0→L1 |
| 사업자·투자자 인증 | 기존 kyc 페이지 컴포넌트 import | 사업자등록증·명함 |
| 전문가 인증 | 기존 professional 페이지 import | PROFESSIONAL 만 표시 |
| 기관 계정 | 기존 organization 페이지 import | INSTITUTION/AMC 만 |
| 알림 환경설정 | 기존 settings/menu 페이지 import | 채널·시간대·키워드 |
| 보안 | (신규 또는 기존 settings) | 비밀번호·2FA |
| 개인정보 | 기존 privacy 페이지 import | ADMIN/SUPER_ADMIN 만 |
| 계정 삭제 | (신규) | 회원 탈퇴 |

---

**End of Document.**
**다음 단계**: 사용자 검토 체크리스트 (§11) 답변 → Phase 1 착수.
