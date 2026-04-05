# NPLatform v12 — 실제 작동하는 시스템 통합 계획

> 핵심 원칙: **하드코딩 0%. 모든 데이터는 DB에서, 모든 액션은 API로, 모든 상태는 실시간으로.**

---

## 문제: 현재 "가짜 시스템"

| 기능 | 현재 (하드코딩) | 목표 (실제 시스템) |
|------|--------------|----------------|
| 딜룸 채팅 | mock 4개 메시지 고정 | DB에서 로드 + 실시간 추가 + 스크롤 |
| 거래 마일스톤 | mock 7단계 고정 | 거래 생성 시 자동 생성, 단계별 전환 API |
| 매물 목록 | mock 5건 고정 | DB 조회 + 필터 + 페이지네이션 + 실시간 |
| 오퍼/역제안 | mock 3건 고정 | POST로 생성, 상대방에게 실시간 알림 |
| 실사 체크리스트 | mock 14항목 고정 | 거래 시작 시 자동 생성, 항목별 상태 변경 API |
| 추천 매물 | 하드코딩 3건 | 관리자가 featured 설정 → API 조회 |
| 뉴스 | 외부 링크 | API로 수집 → DB 저장 → 내부 표시 |
| 교육과정 | 목록만 | 관리자 CRUD → 사용자 수강 + 진행률 |

---

## 해결: 실제 작동 플로우

### 1. 거래 전체 플로우 (자동화)

```
[매물 등록] → 검수(자동+AI) → 승인 → 공개
     ↓
[매수자 관심 표명] → 거래(deal) 자동 생성 + 마일스톤 7개 자동 생성
     ↓
[NDA 체결] → 자동: NDA 템플릿 생성 + 상세정보 잠금 해제
     ↓
[실사 진행] → 자동: 14개 체크리스트 생성 + AI 자동 검증
     ↓
[오퍼 제출] → DB 저장 + 상대방 실시간 알림 + 역제안 가능
     ↓
[계약 체결] → 자동: 계약서 템플릿 생성 (당사자 정보 자동 입력)
     ↓
[잔금/양도] → 자동: 수수료 계산 + 청구서 + 파트너 수익쉐어
     ↓
[완료] → 자동: 상호 평가 요청 + 아카이브
```

### 핵심: 모든 단계가 API 호출로 진행됨

| 액션 | API | 자동 결과 |
|------|-----|----------|
| 매물 등록 | POST /exchange/listings | listing_reviews 자동 생성 (4단계) |
| 관심 표명 | POST /exchange/deals | deal + 7 milestones + 관심표명서 자동 생성 |
| NDA 서명 | PATCH /exchange/deals/{id} stage=NDA | NDA 문서 자동 생성 + 상세정보 잠금 해제 |
| 실사 시작 | PATCH stage=DUE_DILIGENCE | 14개 due_diligence_items 자동 생성 |
| 오퍼 제출 | POST /exchange/deals/{id}/offers | 이전 오퍼 COUNTERED + 알림 |
| 계약 체결 | PATCH stage=CONTRACT | 계약서 템플릿 자동 생성 |
| 거래 완료 | PATCH stage=COMPLETED | 수수료 계산 + 청구서 + 평가 요청 |

### 구현: 거래 자동화 엔진

**`lib/deal-engine.ts`** — 거래 전체 자동화 로직
```
createDeal(listingId, buyerId) → deal + milestones 생성
advanceStage(dealId, nextStage) → 단계별 자동 처리
  - NDA → generateNDA() + unlockDetails()
  - DUE_DILIGENCE → createDDChecklist(14items)
  - CONTRACT → generateContract()
  - COMPLETED → calculateFees() + createInvoice() + referralEarnings()
```

---

### 2. 딜룸 채팅 — 실제 작동

현재: mock 메시지 4개 하드코딩, 스크롤 안 됨
목표: 실제 메시지 송수신 + 스크롤 + 실시간

**수정:**
- `exchange/deals/[id]/page.tsx` — mock 메시지 제거, API에서 로드
- 채팅 컨테이너: `overflow-y-auto` + `scrollTo(bottom)` + 무한 스크롤
- 메시지 전송: POST API → DB 저장 → Realtime으로 상대방에게 즉시 전달
- 시스템 메시지: 단계 전환 시 자동 삽입 ("NDA 체결이 완료되었습니다")

---

### 3. 매물 등록 → 검수 → 공개 자동화

현재: 등록하면 바로 mock 목록에 추가
목표: 4단계 검수 파이프라인

```
등록 (POST /exchange/listings)
  → status: PENDING_REVIEW
  → listing_reviews 4건 자동 생성:
    1. AUTO_VALIDATION (즉시 실행 — listing-validator.ts)
    2. AI_REVIEW (Claude API 또는 룰 기반 — ai-reviewer.ts)
    3. MANUAL_REVIEW (검수자 대기)
    4. FINAL_APPROVAL (기관관리자 대기)
  → 1,2 통과 시 → status: IN_REVIEW (검수자에게 알림)
  → 3,4 통과 시 → status: OPEN (통합 마켓 공개)
```

---

### 4. 추천 매물 / 분석 사례 — 관리자 설정

현재: 메인 페이지에 하드코딩
목표: 관리자가 설정, API로 조회

- deal_listings 테이블의 `featured` 필드 = true → 추천 매물
- `/admin/listings` 에서 "추천" 토글
- 메인 페이지: `GET /api/v1/exchange/listings?featured=true` 로 조회
- 분석 사례도 동일: `GET /api/v1/analysis?featured=true`

---

### 5. 뉴스 — 외부 수집 → 내부 표시

현재: 외부 링크로 이탈
목표: API로 수집 → DB 저장 → 내부에서 읽기

```
[외부 뉴스 API / RSS] → api/v1/external/news → DB(news 테이블) 저장
                                                    ↓
                                        /news 페이지에서 내부 표시
                                                    ↓
                                        /news/[id] 상세 (본문 내부)
                                                    ↓
                                        관련 매물 자동 연결 (키워드 매칭)
```

---

### 6. 교육과정 — 세부 콘텐츠 + 수강 관리

현재: 목록만 있고 세부 없음
목표: 관리자 CRUD + 사용자 수강 + 진행률

```
courses (과정)
  └── lessons (강의)
       └── progress (수강 진행률)

관리자: /admin/courses → 과정 생성/편집/삭제, 강의 추가
사용자: /knowledge/courses/[id] → 커리큘럼 보기
        /knowledge/courses/[id]/lesson/[lessonId] → 강의 수강
        진행률 자동 추적
```

---

## 실행 계획 (5단계)

### Step 1: 거래 자동화 엔진 (핵심)
- `lib/deal-engine.ts` — 거래 생성/단계전환 자동화
- API 수정: deals POST/PATCH에 자동화 로직 연결
- 딜룸 채팅: mock 제거, API 로드 + 스크롤 + 실시간

### Step 2: 메뉴 + 메인 + 푸터 통합
- `navigation.tsx` — 5개 드롭다운 (NPL마켓/거래매칭/인사이트/서비스/도구)
- `page.tsx` — 3대 마켓 → 딜 브릿지 연결, 추천 매물 API
- `footer.tsx` — 6컬럼 통합

### Step 3: 뉴스 + 교육과정 세부
- 뉴스: 내부 표시 + 관리자 관리
- 교육과정: 상세/강의/수강 + 관리자 CRUD
- 용어사전: 상세 + 관리자 CRUD

### Step 4: 관리자 연동 완성
- 추천 매물/분석 사례 토글
- 뉴스/교육과정/용어사전 관리
- AI 검토: 룰기반 + AI 둘 다 관리자에서 모니터링

### Step 5: 전체 하드코딩 제거
- 모든 페이지에서 mock 데이터 → API 호출로 교체
- 모든 버튼 → 실제 API 호출
- 모든 상태 변경 → DB 반영 + 실시간 알림
