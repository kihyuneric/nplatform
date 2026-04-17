# NPLatform — Connected Experience Plan
## 모든 페이지가 부실채권 거래 관점으로 연결되는 UI/UX × Admin × AI 통합 설계서

**Strictly Confidential — 2026-04-07 · v1.0**

---

> **이 문서가 답하는 질문**
>
> 1. 메인 → 상세 → 세부 → 추가 페이지가 어떻게 부실채권 거래 관점으로 끊김 없이 연결되는가?
> 2. 사용자가 보는 모든 화면이 어떻게 관리자에서 통제·공급되는가?
> 3. AI는 어떤 데이터를 어디서 받아 어떻게 사용자 가치로 전환되는가?
> 4. 현재 무엇이 준비되어 있고, 무엇이 부족하며, 무엇을 개선해야 하는가?
> 5. 이 모든 것을 비즈니스 / 기술 / 디자인의 3축에서 어떻게 동시에 실행할 것인가?

---

# 0. 핵심 원칙 — Connected Trading Experience

## 0.1 모든 페이지는 거래 funnel의 한 점이다

> NPLatform의 모든 화면은 **"이 사용자를 다음 거래 단계로 어떻게 밀어넣는가"** 라는 질문에 답해야 한다.
> 거래와 무관한 화면(브로셔, 정보 페이지, 단순 디렉터리)은 존재해서는 안 된다.

### 페이지의 4가지 역할

| 역할 | 정의 | 예시 페이지 |
|---|---|---|
| **Discover** | 거래 가능성을 발견시킨다 | `/`, `/exchange`, `/exchange/map` |
| **Qualify** | 진성 사용자를 필터링한다 | `/exchange/[id]`, `/services/experts/[id]` |
| **Engage** | 거래 의향을 확정시킨다 | `/deals/[id]/offer`, `/exchange/sell` |
| **Convert** | 거래를 클로징한다 | `/deals/[id]/contract`, `/deals/[id]/settlement` |

> **모든 페이지에는 "Next Action"이 명시되어야 하며, 그 액션은 funnel의 다음 단계로 이동시켜야 한다.**

---

## 0.2 사용자가 보는 모든 것은 관리자가 채운다

> "AI를 위한 데이터, 사용자에게 보여줄 콘텐츠, 거래 진행 상태"는 모두 관리자 어드민에서 입력·승인·관리된다.
> 코드 변경 없이 운영팀이 콘텐츠와 데이터를 생산할 수 있어야 한다.

### Admin → User Surface 연결

```
[Admin Console]                           [User Surface]
─────────────                              ─────────────
콘텐츠 관리      ─────────────────────────► 가이드/뉴스/공지/배너/용어
매물 심사        ─────────────────────────► /exchange 카탈로그
가격 가이드 데이터 ───────────────────────► AI 가격 가이드 출력
권리분석 룰셋    ─────────────────────────► AI 권리분석 출력
시세 데이터 업로드 ───────────────────────► AI 시세분석 출력
계약서 템플릿    ─────────────────────────► AI 계약서 생성
전문가 디렉터리  ─────────────────────────► /services/experts
공지/이벤트      ─────────────────────────► 홈 배너 + 알림
요금/크레딧 정책 ─────────────────────────► /my/billing
딜 모니터링      ─────────────────────────► /deals 칸반 (운영 개입)
사용자 KYC 승인  ─────────────────────────► L1/L2 티어 승급
```

---

## 0.3 AI는 마법이 아니라 관리자가 채운 데이터의 함수다

> AI 가격 가이드, 권리분석, 시세 분석, 계약서 생성, Copilot — 모두 학습 데이터 + 룰셋 + 컨텍스트가 필요하다.
> 이 데이터는 관리자에서 입력·승인되며, AI는 단지 그것을 가공해서 보여줄 뿐이다.

### AI 5대 기능 ↔ 관리자 데이터 매핑

| AI 기능 | 필요 데이터 | 관리자 입력 페이지 |
|---|---|---|
| AI 가격 가이드 | 과거 거래 5만건+, 낙찰가, 회수율 | `/admin/ml/price-data` |
| AI 권리분석 | 등기 패턴, 권리 충돌 룰셋, 판례 임베딩 | `/admin/ml/rights-rules` |
| AI 시세분석 | 한국감정원·KB·실거래가, 매월 갱신 | `/admin/ml/market-data` |
| AI 계약서 생성 | 표준 계약서 템플릿 N종, 조항 라이브러리 | `/admin/content/contracts` |
| AI Copilot (RAG) | 가이드·용어·법규·FAQ 임베딩 | `/admin/ml/rag-corpus` |

---
---

# 1. End-to-End Connected Journey — 4 Personas × 8 Stages

## 1.1 매도자(은행/AMC) Journey — 매물 등록부터 정산까지

```
[Stage 1: Awareness]
  / (메인)
    └─ "기관 전용 NPL 거래소" 배너 → /exchange/sell
    └─ KPI 카드: "이번 달 평균 거래 주기 28일"
    └─ Connected: 어드민 [공지/배너 관리]에서 배너 노출 통제

[Stage 2: Onboarding]
  /signup → /select-role → [기관 인증 페이지]
    └─ 기관 KYC: 사업자등록증·금융기관 코드·담당자 신원
    └─ Connected: 어드민 [회원 관리 → KYC 승인]에서 검토
    └─ 승인 후: /pending-approval → /my (기관 대시보드)

[Stage 3: First Listing]
  /my (기관 대시보드) → "매물 등록" CTA → /exchange/sell
    └─ 4단계 위저드:
       Step 1: 자산 유형 (NPL 단건 / 채권 풀 / 부동산 / 펀드 지분)
       Step 2: 기본 정보 (담보·채권잔액·매각희망가)
       Step 3: 자료 업로드 → AI 가격 가이드 즉시 출력
       Step 4: 공개 범위 설정 (L0~L3)
    └─ Connected:
       - AI 가격 가이드는 어드민 [ML/가격 데이터]를 참조
       - 업로드 자료는 어드민 [매물 심사 큐]로 전송
       - 마스킹 검토는 어드민 [마스킹 큐]로 전송

[Stage 4: Listing Live]
  매물 심사 통과 → /exchange/[id] 노출
    └─ 자동 생성: L0 티저 카드, L1 마스킹 본문, L2 자료 vault, L3 딜룸 셸
    └─ Connected: 어드민 [매물 관리]에서 노출 ON/OFF, 추천, 핀 고정

[Stage 5: Buyer Engagement]
  매수자가 L2 진입 → 매도자에게 알림
    └─ /my/seller (매도자 대시보드)에서 진성 매수자 리스트 확인
    └─ 매수자 Q&A 답변 → 딜룸 채팅
    └─ Connected: 어드민 [딜룸 모니터링]에서 운영 개입 가능

[Stage 6: Negotiation]
  /deals/[id] 딜룸 진입
    └─ Tabs: 개요/자료/AI/실사/Q&A/오퍼/계약/정산
    └─ 온라인 미팅 예약 (1차)
    └─ 오프라인 미팅 동의 (필요 시)
    └─ Connected: 모든 메시지·미팅 녹화는 어드민 [감사 로그]에 영구 저장

[Stage 7: Contract]
  /deals/[id]/contract → AI 계약서 자동 생성 → 전자서명
    └─ Connected: 어드민 [계약 템플릿]에서 N종 표준 계약서 관리

[Stage 8: Settlement]
  /deals/[id]/settlement → 에스크로 → 자동 정산
    └─ 매도자 정산 영수증 → /my/billing
    └─ Connected: 어드민 [결제·정산]에서 정산 모니터링
```

---

## 1.2 매수자(투자자) Journey — 발견부터 클로징까지

```
[Stage 1: Discover]
  / (메인) 또는 /exchange (거래소)
    └─ 카드/리스트/지도 토글
    └─ 추천 캐러셀 ("이번 주 핫딜", "AI 추천 매물")
    └─ Connected: 어드민 [배너/추천 관리]에서 큐레이션

[Stage 2: Filter & Qualify]
  /exchange → 필터 (담보·지역·기관·할인율·완성도)
    └─ Sticky 필터바, 무한 스크롤
    └─ Connected: 필터 옵션은 어드민 [매물 메타]에서 동적 관리

[Stage 3: L0 Browse]
  /exchange/[id] (L0 view)
    └─ 보이는 것: 지역, 유형, 규모, 할인율, AI 등급, 자료 완성도
    └─ 가려진 것: 정확한 주소, 채무자 정보, 상세 권리관계
    └─ CTA: "L1 인증하고 더 보기" → /signup or /my/settings/verify

[Stage 4: L1 Verified]
  본인 인증 + 투자자 자격 → L1 승급
    └─ /exchange/[id] (L1 view): + 마스킹된 권리분석 요약
    └─ Connected: 어드민 [회원 관리]에서 자격 검토

[Stage 5: L2 NDA]
  "자료 열람 신청" → NDA 동의 → 크레딧 차감
    └─ /exchange/[id] (L2 view): + 감정평가서·등기·세부 권리
    └─ 모든 자료는 워터마크 + 다운로드 차단
    └─ Connected: 어드민 [감사 로그]에 열람 기록 영구 저장

[Stage 6: L3 Deal Room]
  "LOI 제출" → 매도자 승인 → 딜룸 입장
    └─ /deals/[id] 8 Tabs 활성화
    └─ AI 분석, 실사 일정, 협상 채팅, 계약서, 에스크로

[Stage 7: AI 보조]
  딜룸 내 AI 탭에서:
    └─ 가격 가이드 (이 가격이 적정한가?)
    └─ 권리분석 (숨은 리스크는?)
    └─ 시세분석 (주변 시세 대비?)
    └─ Copilot (이 딜에서 주의할 점은?)
    └─ Connected: AI 응답은 어드민 [ML 데이터]를 참조

[Stage 8: Close]
  계약 → 에스크로 → 정산 → /my/portfolio에 자산 추가
    └─ Deal Access Score 점수 ↑
    └─ Connected: 어드민 [점수 시스템]에서 가중치 관리
```

---

## 1.3 전문가(법무사·세무사·실사대행) Journey

```
[Discover]    /services/experts → 전문가 카탈로그
    └─ Connected: 어드민 [전문가/파트너]에서 검증·등록

[Register]    /services/experts/register → 자격증·경력 업로드
    └─ Connected: 어드민 [전문가 심사]에서 승인

[Profile]     /services/experts/[id] → 프로필·리뷰·예약
    └─ Connected: 매수자가 딜룸에서 직접 호출 가능

[Engage]      매수자가 딜룸에서 "전문가 호출" → 전문가에게 알림
    └─ 딜룸 내 전문가 채널 추가 (제한된 자료 접근)
    └─ Connected: 어드민 [딜룸 모니터링]에서 권한 관리

[Settle]      거래 클로징 시 전문가 수수료 자동 분배
    └─ Connected: 어드민 [결제·정산]에서 정산
```

---

## 1.4 관리자 Journey — 모든 것을 통제하는 12개 페이지

### Admin 12 Pages — Single Source of Control

| Admin 페이지 | 통제하는 사용자 화면 | 통제하는 AI |
|---|---|---|
| `/admin` | 전사 KPI 대시보드 | — |
| `/admin/users` | 회원 가시성·티어 (L1/L2 승급) | KYC 데이터 |
| `/admin/listings` | `/exchange` 카탈로그·심사·추천 | 매물 메타데이터 |
| `/admin/deals` | `/deals` 운영 모니터링·개입 | 딜 진행 데이터 |
| `/admin/billing` | `/my/billing` 정책·정산·쿠폰 | — |
| `/admin/content` | 가이드·뉴스·공지·배너·용어·FAQ | RAG 코퍼스 |
| `/admin/experts` | `/services/experts` 디렉터리 | 전문가 매칭 데이터 |
| `/admin/settings` | 사이트 메타·내비·권한 | — |
| `/admin/system` | DB·API·모듈·에러·인프라 | — |
| `/admin/analytics` | 코호트·퍼널·성능·컴플라이언스 | — |
| `/admin/security` | 감사로그·마스킹·MFA·테넌트 | PII 마스킹 룰 |
| `/admin/ml` | 모델·시장데이터·자동화·RAG | **AI 5대 기능 전체** |

### `/admin/ml` 상세 — AI 의 모든 데이터 공급 지점

```
/admin/ml
  ├─ /price-data       AI 가격 가이드 학습 데이터 (CSV 업로드/수동)
  ├─ /rights-rules     AI 권리분석 룰셋 (충돌 패턴·우선순위)
  ├─ /market-data      AI 시세 데이터 (월간 갱신)
  ├─ /rag-corpus       AI Copilot 지식 베이스 (가이드·법규·판례 임베딩)
  ├─ /model-versions   모델 버전 관리 (A/B 테스트)
  ├─ /eval-dashboard   AI 응답 품질 모니터링
  └─ /feedback-loop    사용자 피드백 → 재학습 큐
```

---
---

# 2. Page-by-Page Connection Map

## 2.1 메인 (/) — 모든 길의 시작점

| 섹션 | 컴포넌트 | 연결 페이지 | Admin 통제 |
|---|---|---|---|
| Hero | 헤드라인·CTA·KPI 3개 | /exchange, /signup | `/admin/content` (헤드라인·KPI) |
| 핫딜 캐러셀 | 추천 매물 6장 | /exchange/[id] | `/admin/listings` (핀·추천 토글) |
| 거래소 미니 | 카테고리별 매물 수 | /exchange?cat=X | 자동 집계 |
| AI 위젯 | 가격 가이드 데모 | /analysis | `/admin/ml` (데모 입력) |
| 시장 인사이트 | 주간 NBI 지수 차트 | /analysis/npl-index | `/admin/ml/market-data` |
| 사용 후기 | 매수자/매도자 인용 | — | `/admin/content/testimonials` |
| 파트너 로고 | 참여 기관 6곳 | /exchange/institutions | `/admin/listings/institutions` |
| 푸터 CTA | "지금 시작하기" | /signup | — |

### 메인의 거래 funnel 역할

> 메인의 단 하나의 목적: **방문자가 30초 안에 "여기서 거래가 일어난다"는 확신을 갖게 한다.**
> 이를 위해 모든 섹션은 "정보가 아닌 거래 가능성"을 보여줘야 한다.

---

## 2.2 거래소 (/exchange) — 매물 카탈로그

### 페이지 트리

```
/exchange                       메인 카탈로그 (카드·리스트·지도 토글)
  ├─ /exchange/[id]             매물 상세 (L0~L3 가변)
  │    ├─ #overview             개요 (L0)
  │    ├─ #documents            자료 (L2)
  │    ├─ #ai-analysis          AI 분석 (L1+)
  │    ├─ #qa                   Q&A (L2+)
  │    ├─ #request-access       L2 승급 신청
  │    └─ #submit-loi           LOI 제출 → /deals/[id] 생성
  ├─ /exchange/sell             매도 위저드
  │    ├─ ?step=1 (자산 유형)
  │    ├─ ?step=2 (기본 정보)
  │    ├─ ?step=3 (자료 + AI 가격 가이드)
  │    └─ ?step=4 (공개 범위)
  ├─ /exchange/bulk-upload      기관 대량 등록 (CSV + AI OCR)
  ├─ /exchange/demands          매수 수요 (역경매)
  │    ├─ /exchange/demands/new
  │    └─ /exchange/demands/[id]
  ├─ /exchange/institutions     참여 기관 디렉터리
  │    └─ /exchange/institutions/[slug]
  ├─ /exchange/auction          입찰 진행 매물
  └─ /exchange/map              지도 검색
```

### 페이지간 연결 규칙

- 모든 매물 카드 → `/exchange/[id]`로 이동
- `/exchange/[id]` 의 LOI 제출 → `/deals/[id]` 자동 생성
- `/exchange/sell` 의 발행 → `/exchange/[id]` 자동 노출
- `/exchange/demands/[id]` 의 매칭 알림 → `/exchange/[id]` 매도자 컨택

### Admin 연결

- `/admin/listings` → 모든 매물의 노출 ON/OFF, 추천, 신고 처리
- `/admin/listings/review` → 신규 매물 심사 큐
- `/admin/listings/masking` → PII 마스킹 검토
- `/admin/listings/institutions` → 참여 기관 메타데이터

---

## 2.3 딜룸 (/deals) — 거래 진행 공간

### 페이지 트리

```
/deals                          내 거래 칸반 (진행/완료/매칭)
  ├─ /deals/[id]                딜룸 (8 Tabs URL fragment 또는 sub-route)
  │    ├─ /overview             개요
  │    ├─ /documents            자료 (워터마크)
  │    ├─ /ai                   AI 분석
  │    ├─ /inspection           실사 (온라인+오프라인 미팅 일정·기록)
  │    ├─ /qa                   Q&A 채팅
  │    ├─ /offers               LOI/입찰 히스토리
  │    ├─ /contract             계약서 생성·서명
  │    └─ /settlement           에스크로·정산
  ├─ /deals/matching            AI 매칭 결과
  ├─ /deals/teams               공동투자 팀
  │    ├─ /deals/teams/[id]
  │    └─ /deals/teams/new
  └─ /deals/archive             완료 거래
```

### 딜룸의 거래 funnel 역할

> 딜룸은 NPLatform의 심장이다. **여기서 일어나지 않는 거래는 우리에게 존재하지 않는다.**
> 따라서 딜룸은 거래의 모든 측면(자료·AI·미팅·협상·계약·정산)을 한 화면에서 끝낸다.

### Admin 연결

- `/admin/deals` → 모든 딜의 진행 상태 모니터링
- `/admin/deals/[id]` → 특정 딜에 운영 개입 (분쟁 조정, 자료 추가, 강제 종료)
- `/admin/security/audit-trail` → 딜룸 내 모든 행동 로그
- `/admin/billing/escrow` → 에스크로 상태 모니터링

---

## 2.4 분석 (/analysis) — AI 보조 및 인사이트

### 페이지 트리

```
/analysis                       시장 대시보드
  ├─ /analysis/new              새 NPL 분석 시작 (크레딧 차감)
  ├─ /analysis/[id]             분석 결과
  │    ├─ #valuation            가격 추정
  │    ├─ #rights               권리 리스크
  │    ├─ #market               시세 비교
  │    ├─ #strategy             전략 권고
  │    └─ #legal-rag            관련 판례
  ├─ /analysis/copilot          AI Copilot 챗
  ├─ /analysis/simulator        경매 시뮬레이터
  ├─ /analysis/ocr              문서 OCR
  └─ /analysis/npl-index        NBI 주간 지수
```

### 분석 페이지의 거래 funnel 역할

- 분석 결과는 항상 "이 매물 보기 →" CTA를 가진다
- AI Copilot 챗 끝에는 "관련 매물 추천" 카드가 붙는다
- 시뮬레이터 결과는 "이 시나리오의 매물 찾기 →" CTA로 끝난다

> **분석은 정보가 아니다. 매물 클릭을 유도하는 funnel의 일부다.**

### Admin 연결

- `/admin/ml/price-data` → 가격 가이드 학습 데이터
- `/admin/ml/rights-rules` → 권리분석 룰셋
- `/admin/ml/market-data` → 시세 데이터
- `/admin/ml/rag-corpus` → Copilot 지식 베이스
- `/admin/ml/eval-dashboard` → AI 품질 모니터링

---

## 2.5 서비스 (/services) — 전문가·커뮤니티·교육

### 페이지 트리

```
/services                       서비스 허브
  ├─ /services/experts          전문가 마켓
  │    ├─ /services/experts/[id]
  │    └─ /services/experts/register
  ├─ /services/community        투자자 커뮤니티
  │    ├─ /services/community/[id]
  │    └─ /services/community/new
  └─ /services/learn            교육 허브
       ├─ /services/learn/courses/[id]
       └─ /services/learn/glossary/[term]
```

### 서비스의 거래 funnel 역할

- 전문가 프로필 → 딜룸에서 직접 호출 가능 (`/deals/[id]/qa?expert=X`)
- 커뮤니티 글 → 관련 매물 자동 링크
- 교육 강좌 → "이 개념의 실제 매물 보기 →"

### Admin 연결

- `/admin/experts` → 전문가 심사·승인·정산
- `/admin/content` → 커뮤니티 모더레이션, 강좌 관리

---

## 2.6 내 정보 (/my) — 역할별 자동 전환

### 페이지 트리

```
/my                             역할별 자동 대시보드
  ├─ /my/portfolio              관심·보유 매물 + Deal Access Score
  ├─ /my/billing                결제·크레딧·구독·영수증
  ├─ /my/settings               프로필·보안·알림·역할
  ├─ /my/notifications          알림 센터
  ├─ /my/seller                 매도자 전용 (등록 매물·정산)
  ├─ /my/professional           전문가 전용 (서비스·상담·수익)
  ├─ /my/partner                파트너 전용 (추천·수수료)
  └─ /my/developer              개발자 포털 (API 키·문서)
```

### /my 의 거래 funnel 역할

- 모든 카드는 "다음 액션"을 명시한다 (예: "L2 자료 열람 대기 중인 매물 3건")
- Deal Access Score는 항상 보이게 — 점수가 떨어지면 사용자가 자기 자산 손실로 인식

### Admin 연결

- `/admin/users` → 사용자 권한·KYC·티어
- `/admin/billing` → 정책·환불·쿠폰

---
---

# 3. Admin Console — 12 Pages, Complete Control

## 3.1 Admin은 모든 사용자 화면의 부모다

| Admin 페이지 | Sub-routes | 통제 대상 (사용자 surface) |
|---|---|---|
| `/admin` | dashboard | — (KPI 모니터링) |
| `/admin/users` | list / approvals / kyc / roles | `/my`, 모든 인증 |
| `/admin/listings` | all / review / masking / featured / reports | `/exchange/*` |
| `/admin/deals` | active / archived / disputes / monitor | `/deals/*` |
| `/admin/billing` | transactions / settlements / coupons / pricing / refunds | `/my/billing`, 에스크로 |
| `/admin/content` | notices / banners / news / guides / glossary / faqs / testimonials | `/`, `/notices`, `/services/learn` |
| `/admin/experts` | experts / partners / verifications / settlements | `/services/experts` |
| `/admin/settings` | site / nav / permissions / admins / locales | 전사 |
| `/admin/system` | database / api / modules / errors / infra / migrations | — |
| `/admin/analytics` | cohort / funnel / performance / compliance | — |
| `/admin/security` | audit-logs / masking / mfa / tenants / piit | 보안 |
| `/admin/ml` | price-data / rights-rules / market-data / rag-corpus / model-versions / eval / feedback | **AI 전체** |

---

## 3.2 Admin → User Surface Data Flow

### 사례 1 — 매물 심사 흐름

```
[매도자]                    [Admin]                      [매수자]
─────                       ───────                      ───────
/exchange/sell  ───등록───► /admin/listings/review
                                  │
                                  ├─ AI 마스킹 자동 검토
                                  ├─ 운영자 1차 검토
                                  ├─ 거부 → 매도자에게 피드백
                                  └─ 승인 ─────────────► /exchange/[id] 노출
                                                          (L0 카드, L1 본문, L2 vault)
```

### 사례 2 — AI 가격 가이드 데이터 흐름

```
[Admin]                                     [User]
───────                                     ──────
/admin/ml/price-data
  ├─ 과거 거래 CSV 업로드
  ├─ 데이터 정제·검증
  ├─ XGBoost 재학습
  └─ 모델 v1.X 배포 ───────────────────► /exchange/sell (Step 3)
                                          /analysis/[id] #valuation
                                          /deals/[id]/ai
```

### 사례 3 — 콘텐츠 관리 흐름

```
[Admin]                                     [User]
───────                                     ──────
/admin/content/banners ───────────────────► / (홈 hero 배너)
/admin/content/notices ───────────────────► /notices, 알림 센터
/admin/content/news ──────────────────────► /services/learn (뉴스 탭)
/admin/content/guides ────────────────────► /guide/[topic]
/admin/content/glossary ──────────────────► /services/learn/glossary
/admin/content/faqs ──────────────────────► /support, AI Copilot RAG
/admin/content/testimonials ──────────────► / (홈 후기 섹션)
```

---
---

# 4. Gap Analysis — 준비 / 부족 / 개선

## 4.1 비즈니스 모델 영역

### 준비된 것 ✅

- 4단계 티어 모델 (L0~L3) 명확히 정의
- 8단계 락인 funnel 명확히 정의
- 5-stream 매출 모델 설계
- Unit Economics 가설
- Risk Matrix
- McKinsey 스타일 기획서 1종

### 부족한 것 ❌

- **실제 매도 기관 인터뷰 부재** — 5곳 이상 deep interview 필요
- **수수료 구조의 가격 탄력성 검증 안 됨** — 1.6%가 적정한지 시장 검증 필요
- **Exclusive Deal 계약 템플릿 부재** — 법무 검토 필요
- **금융위 사전 협의 진행 안 됨** — 컴플라이언스 리스크
- **경쟁 분석에 글로벌 사례(Reorg, Octus) 깊이 부족**

### 개선 필요 ⚠️

- 정보 사업 vs 거래 사업의 LTV 차이를 **자체 데이터로** 입증 필요 (현재는 가설)
- Beachhead 1 (캐피탈/AMC 5곳)에 대한 **구체적 타겟 리스트** 작성
- Series A 펀드 ₩120억 근거의 **세부 use of fund** 작성

---

## 4.2 기술 개발 영역

### 준비된 것 ✅

- Next.js 15 App Router 기반 페이지 구조 (283 → 70개로 정리)
- 4단계 티어 모델 코드 (`lib/access-tier.ts`)
- 매물 카탈로그 (`/exchange`) 카드+리스트 뷰
- 페이지 트랜지션·모달 buggy fix 완료
- Supabase + RLS 기본 구조
- 일부 AI 분석 페이지

### 부족한 것 ❌

- **딜룸 8 Tabs 미구현** — 현재 `/deals/[id]`는 셸만 존재
- **워터마크·DRM 모듈 부재** — 자료 다운로드 차단 안 됨
- **Signed URL 시스템 부재** — TTL 5분 자료 접근 모듈 필요
- **에스크로 모듈 부재** — 토스페이먼츠 연동 안 됨
- **Deal Access Score 엔진 부재**
- **Audit Log (append-only) 미구현**
- **AI 5대 기능 중 가격 가이드만 데모 수준**
- **Admin Console 12개 페이지 중 7개만 존재**, ML 영역 전무
- **하이브리드 미팅 모듈 부재** — Zoom/Meet 통합·녹화·AI 회의록
- **PII 마스킹 파이프라인 부분 구현** — OCR + NER 미구현

### 개선 필요 ⚠️

- 모든 페이지의 인라인 `style={{}}` → 디자인 토큰 시스템으로 마이그레이션
- 모달은 반드시 React Portal로 렌더 (transform 부모 회피)
- 페이지 트랜지션은 opacity-only (translate 금지)
- React Query 도입 — 현재 useState/useEffect 패턴 과다
- 서버 컴포넌트 전환 — 현재 너무 많은 'use client'

---

## 4.3 디자인 영역

### 준비된 것 ✅

- `/exchange` 메인 페이지 (다크 NPL 트레이딩 톤, 9/10)
- TierBadge, CompletenessBadge 등 NPL-specific 컴포넌트 일부
- 카드/리스트 뷰 토글
- Sticky 필터바
- KPI strip 패턴

### 부족한 것 ❌

- **디자인 토큰 시스템 부재** — 색·타입·간격·elevation 일관성 0
- **컴포넌트 라이브러리 부재** — Card/Button/Input 등 재사용 컴포넌트 흩어짐
- **/exchange 외 페이지 톤앤매너 미완성** (사용자 직접 지적)
- **/exchange 하위 페이지 디자인 미완성** (사용자 직접 지적)
- **Empty state·Loading state·Error state 일러스트 부재**
- **모바일 반응형 부분 구현**
- **다크/라이트 모드 일관성 부족**
- **글로벌 톱티어(Stripe·Linear·Mercury) 벤치마크 적용 안 됨**

### 개선 필요 ⚠️

- 매물 ↔ 딜룸 ↔ 분석 ↔ 서비스 ↔ 내정보 5개 영역의 **시각적 일관성** 확보
- 관리자 영역의 **차분한 운영 톤** (사용자 영역과는 다른 정체성)
- 인터랙션 마이크로 애니메이션 (Linear 수준)

---
---

# 5. Action Plan — 90 Days × 3 Tracks

## 5.1 3개 트랙 동시 실행

### Track A — Business (CEO/BD)

| Week | Action | Output |
|---|---|---|
| W1-2 | 매도 기관 5곳 인터뷰 | Pain point 보고서 |
| W3-4 | Exclusive Deal 계약 템플릿 작성 | 법무 검토 통과 |
| W5-6 | 금융위 사전 협의 신청 | 회의록 |
| W7-8 | Beachhead 1 타겟 리스트 (캐피탈/AMC 30곳) | CRM 등록 |
| W9-12 | Beachhead 1 영업 활동 시작 | 5곳 LOI |

### Track B — Engineering (CTO/Dev)

| Week | Action | Output |
|---|---|---|
| W1 | 디자인 토큰 시스템 (`lib/design-tokens.ts`) | 토큰 모듈 |
| W1-2 | 모달 Portal 강제 (재발 방지) | `components/ui/dialog.tsx` |
| W2-3 | DB 스키마 v6 마이그레이션 (deal_rooms, audit_logs, access_scores) | Supabase migration |
| W3-5 | **딜룸 8 Tabs 구현** (P0) | `/deals/[id]/*` |
| W5-6 | 워터마크 + Signed URL 모듈 | `lib/document-protection.ts` |
| W6-8 | LOI 폼·협상 채팅·열람 로그 | 딜룸 코어 완성 |
| W8-10 | AI 가격 가이드 v2 (XGBoost 재학습) | `/admin/ml/price-data` |
| W10-12 | Admin Console 12 페이지 완성 (특히 `/admin/ml`) | 운영 가능 상태 |

### Track C — Design (Design Lead/Frontend)

| Week | Action | Output |
|---|---|---|
| W1-2 | 디자인 토큰 시각화 (Storybook) | Token reference |
| W2-3 | 컴포넌트 라이브러리 1차 (50개 핵심) | Storybook |
| W3-5 | `/exchange/[id]` 풀 디자인 (P0) | 시안 + 구현 |
| W5-7 | `/deals/[id]` 8 Tabs 디자인 (P0) | 시안 + 구현 |
| W7-9 | `/exchange/sell` 위저드 디자인 (P0) | 시안 + 구현 |
| W9-11 | `/analysis`, `/services`, `/my` 톤앤매너 통일 | 5개 영역 일관성 |
| W11-12 | 모바일 반응형 + 다크/라이트 모드 통일 | 출시 가능 상태 |

---

## 5.2 90일 후 도달 상태

```
Business
─────────
✅ 매도 기관 5곳 LOI 확보
✅ Exclusive Deal 계약 1건 체결
✅ 금융위 사전 협의 완료
✅ Series A 자료 80% 완성

Engineering
───────────
✅ 딜룸 8 Tabs 완성 (락인 핵심)
✅ AI 가격 가이드 v2 운영
✅ Admin Console 12개 완성
✅ 워터마크·Signed URL·열람 로그 작동
✅ Audit Trail append-only 운영

Design
──────
✅ 디자인 토큰 시스템 100%
✅ 5개 영역 톤앤매너 통일
✅ 글로벌 톱티어 수준 도달 (8/10)
✅ 모바일·다크모드 일관성
```

---
---

# 6. Connected Experience — 5 Critical Connection Rules

## 6.1 모든 연결은 5개 규칙을 따른다

### Rule 1 — Single Source of Truth

> 동일한 데이터는 단 한 곳에서만 입력되고, 모든 곳에서 참조된다.
> 매물 정보는 `/admin/listings`에서만 입력되고, `/exchange`, `/deals`, `/analysis`, `/my` 모두 참조한다.

### Rule 2 — Forward Action

> 모든 페이지에는 다음 단계 액션이 명시되어야 한다.
> "/exchange/[id]"는 "L1 인증 → L2 자료 → LOI 제출" funnel을 시각적으로 보여준다.

### Rule 3 — Backward Reference

> 모든 페이지에는 어디에서 왔는지 표시되어야 한다 (브레드크럼).
> `/deals/[id]`에는 "← npl-2026-0412 매물에서 시작된 거래" 가 항상 보인다.

### Rule 4 — Admin Mirror

> 모든 사용자 화면에는 그것을 통제하는 Admin 화면이 1:1 매칭된다.
> 사용자가 보는 무언가가 코드에 하드코딩되어 있으면 안 된다 (콘텐츠는 모두 DB).

### Rule 5 — AI Augmented

> 모든 거래 의사결정 화면에는 AI 보조가 옵션으로 존재한다.
> "이 매물 어때?" 버튼이 모든 매물 카드에 있고, 클릭하면 AI Copilot이 이 매물을 컨텍스트로 응답한다.

---

## 6.2 연결되지 않은 페이지는 삭제한다

- 거래 funnel과 무관한 페이지는 즉시 통합·삭제 (예: `/about`, `/psychology` → `/guide`)
- 정보만 제공하는 페이지는 funnel 액션을 추가하거나 삭제
- 관리자에서 통제할 수 없는 하드코딩 콘텐츠는 DB로 이전 후 삭제

---
---

# 7. 최종 의사결정 사항

## 7.1 합의가 필요한 6가지

| # | 의사결정 | 권고 |
|---|---|---|
| 1 | 딜룸 8 Tabs를 P0로 설정하고 모든 기술 자원의 30% 투입할 것인가? | **YES** |
| 2 | Admin Console `/admin/ml` 을 P0로 설정하고 AI 데이터 공급을 통제할 것인가? | **YES** |
| 3 | 디자인 토큰 시스템을 도입하고 모든 인라인 스타일을 마이그레이션할 것인가? | **YES** |
| 4 | 매도 기관 인터뷰 5곳을 90일 내 완료할 것인가? | **YES** |
| 5 | 금융위 사전 협의를 60일 내 신청할 것인가? | **YES** |
| 6 | 거래 funnel과 무관한 페이지를 모두 삭제할 것인가? | **YES** |

---

## 7.2 마지막 한 줄

> **NPLatform의 모든 화면은 거래 funnel의 한 점이고,
> 모든 데이터는 관리자에서 흘러나오며,
> 모든 의사결정은 AI가 보조한다.**
>
> **이 세 가지가 동시에 작동하지 않는 페이지는 NPLatform에 존재할 자격이 없다.**

— 끝 —
