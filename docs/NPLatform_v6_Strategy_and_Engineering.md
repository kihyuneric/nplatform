# NPLatform v6 — Strategy × Engineering Master Plan
**부실채권 + 부동산 통합 거래 플랫폼 · 글로벌 유니콘 도전 기획서**
*(McKinsey / BCG / Bain 컨설팅 기준 작성 · 2026-04-07)*

> **핵심 원샷 메시지**
> *"정보는 미끼이고, 거래 구조가 진짜 제품이다."*
> NPLatform은 단순 정보 포털이 아니라, **"플랫폼을 떠나는 순간 손해"** 가 발생하도록 설계된 거래 인프라다.
> 우리는 한국 NPL을 시작으로 **부실채권·부동산 통합 거래소**로 확장하고, 5년 내 글로벌 Asia-Pacific Distressed Asset Marketplace 1위를 목표로 한다.

---

## 0. Document Map

| Part | 주제 | 독자 |
|---|---|---|
| **I** | Business Strategy (사업모델 기획서) | 투자자·경영진·BD |
| **II** | Product Architecture (제품 설계서) | PM·디자인·운영 |
| **III** | Engineering Plan (개발 기획서) | 엔지니어링·DevOps·보안 |
| **IV** | Design System Overhaul (디자인 정비안) | 디자인·프론트엔드 |
| **V** | Execution Roadmap & KPIs | 전사 |

---
---

# PART I — BUSINESS STRATEGY

## 1. Executive Summary (1-Page Pitch)

| 항목 | 내용 |
|---|---|
| **One-liner** | 한국 부실채권·부동산 자산을 위한 **규제 준수형 폐쇄 거래소** |
| **TAM (한국)** | NPL 연간 거래 규모 ≈ **₩15조** + 직거래 부동산 ≈ **₩200조** |
| **SAM** | 디지털 전환 가능한 기관·전문 투자자 거래 ≈ **₩28조** |
| **SOM (5년)** | **₩2.4조 GMV**, take rate 1.6% → **₩384억 매출** |
| **Why Now** | (1) 2026 부실채권 만기 도래 ↑ (2) 한국은행 기준금리 인하기 진입 (3) 금융위 NPL 디지털 매각 가이드 라인 시행 |
| **Why Us** | 4단계 티어 모델(L0~L3) + 8단계 락인 + AI 가치평가 + 하이브리드 실사 — **누구도 풀스택으로 통합한 적 없음** |
| **Lock-in Mantra** | 정보 단절 · 프로세스 종속 · 기록 추적 |
| **Funding Ask** | Seed ₩25억 → 18개월 런웨이 → Series A ₩120억 |

---

## 2. 시장 분석 — 왜 지금, 왜 한국인가

### 2.1 시장 사이즈

```
┌──────────────────────────────────────────┐
│ TAM  ₩215조  │ NPL ₩15조 + 부동산 직거래 ₩200조
│ SAM  ₩28조  │ 디지털 가능 기관·전문가 거래
│ SOM  ₩2.4조  │ 5년 차 GMV (Take rate 1.6%)
│ 매출 ₩384억 │ 5년 차 ARR
└──────────────────────────────────────────┘
```

### 2.2 시장 구조의 비효율 (Pain Points)

| Pain | 현재 상태 | 비용 |
|---|---|---|
| **정보 비대칭** | 매도 기관은 엑셀·이메일로 자료 배포 | 매수자당 평균 12시간 자료 정제 |
| **신뢰 부재** | 채권 정보의 정확성/완전성 미보장 | 거래 1건당 평균 ₩1,200만원 실사 비용 |
| **PII 노출 위험** | 채무자 개인정보 무방비 유통 | 금융위 행정처분 리스크 |
| **분절된 워크플로우** | 정보→실사→협상→계약→정산이 각각 다른 채널 | 거래 평균 소요 **94일** (선진국 28일) |
| **수수료 불투명** | 중개수수료 1.5~3.0% 들쭉날쭉 | 매도/매수 양측 손해 |

### 2.3 경쟁 지형 (Why No Incumbent)

| 경쟁자 | 한계 |
|---|---|
| 온비드 (KAMCO) | 공공 경매 한정, 디지털 UX 0점 |
| 사설 NPL 카페·블로그 | 정보 게시판 수준, 거래 인프라 없음 |
| 부동산 중개 플랫폼 | NPL 도메인 지식 부재 |
| 글로벌 (Debtwire/Reorg/Octus) | 정보 미디어, 거래 X |
| → **거래·정보·실사·정산을 통합한 플레이어 全無** |

> **Insight**: 한국 NPL 시장은 "정보 사업"으로 시도된 적은 많지만, 모두 거래로 전환되지 않아 단명. 이유는 단순하다 — **돈 흐름이 플랫폼 밖에서 일어나기 때문.**

---

## 3. 솔루션 — Lock-in Architecture (탈플랫폼 방지)

### 3.1 핵심 명제

> *"단순 정보 판매는 돈이 되지 않고 이탈을 부른다.
> 거래의 인프라가 되어야 글로벌 유니콘이 된다."*

NPLatform은 정보→접근→참여→거래→계약→정산 **6 Critical Path** 가 모두 플랫폼 안에서만 발생하도록 설계된다.

### 3.2 8-Stage Lock-in Funnel

```
[1] 매각 등록    → AI 가격 가이드 · 자동 보고서 → "여기서 파는 게 더 잘 팔림"
       ↓
[2] Teaser 공개  → 지역/유형/규모/수익률만 노출 → "관심은 ↑ 거래는 X"
       ↓
[3] 접근 권한    → 인증·NDA·보증금/크레딧     → "아무나 못 들어옴"
       ↓
[4] 딜룸(Data Room) → 워터마크·열람 로그·다운로드 통제 → 핵심 방어선
       ↓
[5] LOI 제출     → 플랫폼 내 양식만 가능       → 이메일 우회 차단
       ↓
[6] 매칭·협상   → 채팅·연락처 비공개·AI 추천   → 직거래 차단
       ↓
[7] 계약        → 자동 생성·전자서명·보관      → 외부 계약 시 패널티
       ↓
[8] 정산·클로징  → 에스크로·수수료 자동 정산   → 돈 흐름 락인
```

### 3.3 절대 금지 (Anti-Pattern)

| 절대 ❌ | 이유 |
|---|---|
| 엑셀 다운로드 제공 | 자료가 플랫폼을 벗어남 |
| 이메일로 자료 전달 | 추적 불가 |
| 담당자 직통 연락 허용 | 직거래 발생 |

→ **이 3개가 있으면 100% 무너진다.**

### 3.4 4-Tier Access Model (L0~L3)

| 티어 | 공개 정보 | 진입 조건 | 락인 효과 |
|---|---|---|---|
| **L0 (Public)** | 지역·유형·규모·할인율·AI 등급 | 비회원 가능 | SEO·바이럴 |
| **L1 (Verified)** | + 마스킹된 권리분석 요약 | 본인인증 + 투자자 자격 | 회원 전환 |
| **L2 (NDA)** | + 감정평가서·등기·세부 권리 | NDA + 자금력 인증 + 보증금/크레딧 | 진성 매수자 필터 |
| **L3 (Deal Room)** | + 워크아웃 이력·내부 자료·실사 보고서 | LOI 제출 + 매도자 승인 | 완전 락인 |

> **담보는 열고, 사람은 가린다 (PII Masking)** — 한국 개인정보보호법 + 금융위 가이드 100% 준수.

---

## 4. 자산 범위 — NPL + 부동산 통합

### 4.1 거래 가능 자산 (Asset Catalog)

| 카테고리 | 세부 자산 | L0/L1/L2/L3 적용 |
|---|---|---|
| **부실채권 (NPL)** | 담보부 NPL · 무담보 NPL · 펀드 지분 · 채권 풀 | L0~L3 전 단계 적용 |
| **경매·공매 매물** | 임의경매·강제경매·공매·신탁공매 | L0~L2 |
| **일반 부동산** | 아파트·오피스·상가·토지·꼬마빌딩 | L0~L1 (정보 공개 폭 확장) |
| **유동화 자산** | NPL ABS·MBS 트랜치 | L2~L3 (전문 투자자 한정) |
| **수요 등록** | 매수 의향(Demand) — 역경매 | L0~L2 |

### 4.2 매물 등록 / 매수 수요의 동일 락인 적용

매물 등록·매수 수요·딜 매칭은 **동일한 8단계 락인 구조** 를 공유한다.
- 매도자가 매물을 등록하면 → L0 티저 자동 생성 → L1 마스킹 본문 → L2 NDA 후 자료 공개
- 매수자가 수요를 등록하면 → 조건 매칭 알림 → 진성 매도자만 컨택 → 모든 의사소통 플랫폼 채팅으로
- **연락처는 끝까지 비공개**, 거래 클로징 후에만 공개

---

## 5. 딜룸 (Data Room) — 핵심 통제 구간

### 5.1 딜룸은 사라지지 않는다 — 더 강해진다

이전 v5 정리 과정에서 `/deal-rooms`가 `/deals/[id]`로 통합되었지만, **딜룸 개념은 NPLatform의 심장이다.** 통합은 URL의 단순화일 뿐, 기능적으로는 더 강력해진다.

### 5.2 딜룸 구성 (8 Tabs)

| 탭 | 기능 | 락인 장치 |
|---|---|---|
| **개요** | 자산 요약, 진행 단계, 카운트다운 | — |
| **자료** | 감정·등기·권리·임차·재무·사진 | 워터마크, 열람 로그, 다운로드 차단/제한 |
| **AI 분석** | 가격 추정, 권리 리스크, 시세 비교 | AI는 유료 크레딧 차감 |
| **실사** | 현장 실사 일정 + 보고서 + 사진/동영상 업로드 | 하이브리드 워크플로우 (§6) |
| **Q&A** | 매수자→매도자 질의 (담당자 비공개) | 1:1 채널, 답변 SLA |
| **오퍼** | LOI/입찰 제출, 가격 협상 히스토리 | 외부 제출 차단 |
| **계약** | 계약서 자동 생성, 전자서명, 보관 | 플랫폼 외 계약 시 패널티 |
| **정산** | 에스크로 상태, 정산 영수증, 수수료 산정 | 돈 흐름 플랫폼 内 |

### 5.3 딜룸 보안 스택

```
┌────────────────────────────────────────┐
│ Layer 1 — Access Control               │
│  RLS (Supabase) + JWT + IP allowlist   │
├────────────────────────────────────────┤
│ Layer 2 — Document Protection          │
│  Server-side rendering only            │
│  Watermark (user ID + timestamp)       │
│  PDF view → image-only fallback        │
│  Download token (TTL 5 min)            │
├────────────────────────────────────────┤
│ Layer 3 — Behavior Tracking            │
│  Page view duration                    │
│  Mouse move, scroll, copy attempts     │
│  Screenshot detection (best-effort)    │
├────────────────────────────────────────┤
│ Layer 4 — Audit Trail                  │
│  Append-only log (Postgres + WORM)     │
│  Forensic export for legal disputes    │
└────────────────────────────────────────┘
```

---

## 6. 하이브리드 (Online ↔ Offline)

### 6.1 모든 것이 온라인일 수는 없다 — 정직한 인정

| 단계 | 본질 | 우리의 해결 |
|---|---|---|
| 자료 검토 | 100% 온라인 | 딜룸 |
| AI 가치평가 | 100% 온라인 | AI Layer |
| **현장 실사** | 오프라인 필수 | **하이브리드 실사 모듈** (§6.2) |
| **담당자 미팅** | 오프라인 / 화상 | **딜룸 미팅 예약 + 화상회의 통합** |
| 계약 서명 | 온라인 (전자서명) | 자체 서명 모듈 |
| 정산 | 100% 온라인 | 에스크로 |

### 6.2 하이브리드 실사 모듈 — 온라인 미팅 + 오프라인 미팅의 병행

**핵심 정의**: 하이브리드는 "온라인 자료 + 오프라인 현장"이 아니라, **온라인 미팅과 오프라인 미팅이 동일한 딜룸 안에서 병행 운영되는 것**이다.

**문제**: 자료 검토는 온라인이 가능하지만, 현장 확인과 담당자 미팅은 오프라인이 필요할 수 있다. 그러나 현장 방문은 시간·비용이 크다.

**해결 — 6단계 하이브리드 워크플로우**:
1. **사전 자료 검토** — 딜룸에서 감정평가서·등기·권리·재무 자료 열람
2. **AI 권리 자동 분석** — 등기·임차·체납 등을 AI가 사전 분석하여 의문점 추출
3. **1차 온라인 미팅** — 딜룸 내장 화상회의 (Zoom/Meet 통합), 매도 담당자 ↔ 매수자 Q&A, 자동 녹화·AI 회의록 → 딜룸 영구 저장
4. **오프라인 현장 미팅** — 필요 시 플랫폼 통한 일정 예약·동행, 매수자가 못 갈 경우 검증된 실사 대행 매칭
5. **2차 온라인 후속 미팅** — 현장 결과 공유, 추가 협상 (다시 화상)
6. **모든 미팅 기록 통합** — 온라인·오프라인 구분 없이 딜룸 타임라인에 영구 기록

**운영 원칙**:
- 1차 인터뷰·자료 명확화·후속 협상은 **온라인** 권장 (시간·비용 절감)
- 현장 확인은 **오프라인** (물리적 검증 필요)
- 담당자 미팅은 매도 기관 선호에 따라 **온라인 또는 오프라인**
- 계약 서명은 **온라인** (전자서명, 100% 비대면)
- **모든 일정·연락·기록은 플랫폼을 통해서만 일어난다.** 오프라인 미팅을 인정하되, 그 주변(예약·녹화·후속)은 100% 온라인에 묶어둔다.

### 6.3 담당기관 미팅 모듈

- 미팅 요청 → 매도자 검토 → 일정 픽 → 화상회의 자동 생성 (Zoom/Meet 통합)
- 미팅 녹화 → AI 회의록 자동 작성 → 딜룸에 영구 저장
- 오프라인 미팅 시에도 일정·연락은 플랫폼을 통해서만

---

## 7. AI Layer — 매도자·매수자 고민을 덜어주는 기술

### 7.1 5대 AI 기능

| 기능 | 모델 | 입력 → 출력 | 가치 |
|---|---|---|---|
| **AI 가격 가이드** | XGBoost + LLM | 채권/담보 정보 → 예상 낙찰가, 신뢰구간, 비교 거래 5건 | 매도 가격 의사결정 시간 ↓ 80% |
| **AI 권리분석** | LLM (RAG) | 등기부·임차계약 → 권리 충돌, 우선순위, 위험도 | 법무사 상담 비용 ↓ 50% |
| **AI 시세분석** | 부동산 시세 + 통계 모델 | 주소 → 시세, 추세, 임대수익률 | 매수자 분석 시간 ↓ 70% |
| **AI 계약서 생성** | LLM (Few-shot) | 거래 조건 → 표준 NPL 매매계약서 초안 | 변호사 검토 비용 ↓ 60% |
| **AI Copilot** | LLM (RAG, 멀티턴) | 자유 질문 → 딜·법규·전략 답변 | 신규 투자자 학습곡선 ↓ |

### 7.2 AI 차별화 — Vertical RAG

- 한국 NPL 거래 데이터셋 (자체 구축, 5만건+)
- 대법원 판례 (권리분석)
- 한국감정원/KB 시세 (시세분석)
- 금융위 가이드라인 (규제 준수)

→ **GPT-4가 모르는 한국 NPL 도메인을 우리만 안다.**

---

## 8. 매출 모델 — Take Rate × Repeat × Multi-Stream

### 8.1 5-Stream Revenue

| Stream | 단가 | 전체 매출 비중 (5년차) | 비고 |
|---|---|---|---|
| **거래 수수료** | 매도 0.9% + 매수 0.9% | **65%** | 메인 |
| **딜 접근 크레딧** | 1 크레딧 = ₩50,000 | 12% | L2 진입 시 차감 |
| **AI 분석 크레딧** | 분석당 ₩30,000~₩200,000 | 10% | 가격/권리/시세 |
| **구독 (Pro)** | 월 ₩99,000 / ₩299,000 / ₩999,000 | 8% | 알림·우선공개·딜점수 |
| **부가 서비스** | 실사 대행, 법무 매칭, 에스크로 수수료 | 5% | 마진 ↑ |

### 8.2 Unit Economics (Year 5 가정)

```
GMV               ₩2,400억
Take Rate          1.6% (양측 합산)
거래 매출         ₩384억
+ 크레딧·구독     ₩188억
─────────────────────────
ARR               ₩572억
Gross Margin       72%
CAC (per buyer)   ₩180,000
LTV (per buyer)   ₩4,200,000
LTV / CAC         23.3x
Payback           5 months
```

### 8.3 왜 정보 판매가 아닌가

> 단순 정보 구독은 한 번 보면 끝, 평균 LTV ₩60만원 ·이탈률 70%/년.
> 거래 수수료는 거래할 때마다 발생, **고객당 평생 5~10건 거래** → LTV 7배 차이.

---

## 9. Moat — 우리의 해자 5가지

| Moat | 설명 | 시간 함수 |
|---|---|---|
| **데이터 네트워크 효과** | 거래가 쌓일수록 AI가 정확해짐 | 거래수² |
| **양면 시장 락인** | 매도 기관 ↔ 매수자 풀이 서로 끌어당김 | 사용자² |
| **규제 준수 자산** | PII 마스킹·감사로그·금융위 가이드 — 후발주자 진입 비용 1년+ | 시간 |
| **딜룸 종속성** | 거래 진행 중인 딜은 이동 불가 (전환비용 ∞) | 거래량 |
| **Exclusive Deal** | 일부 딜은 플랫폼 독점 공개 (기관 계약) | 협상력 |

---

## 10. GTM Strategy — 18개월 시장 침투

### 10.1 Three Beachheads

| Phase | 기간 | Target | 전략 |
|---|---|---|---|
| **Beachhead 1** | M0~M6 | 중소 캐피탈·AMC 5곳 | 무료 등록 + 거래 수수료 50% 할인, AI 가치평가 무료 |
| **Beachhead 2** | M6~M12 | 5대 시중은행 NPL 부서 | Exclusive Deal 계약, 백오피스 SaaS 무상 제공 |
| **Beachhead 3** | M12~M18 | 부동산 일반 매물 확장 | 부동산 중개 협회 제휴, 직거래 매도 수수료 0.5% |

### 10.2 Buyer Side 캠페인

- "한국 첫 NPL 디지털 거래소" 미디어 PR
- VIP 투자자 100명 사전 등록 (Founder's Letter)
- 카페·블로그 KOL 50명 시드 (수익 분배)

---

## 11. 5-Year Financial Forecast

| 항목 (₩억) | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| 등록 매물 | 200 | 1,200 | 4,800 | 12,000 | 24,000 |
| 거래 건수 | 12 | 95 | 480 | 1,400 | 2,800 |
| GMV | 80 | 480 | 1,440 | 1,920 | 2,400 |
| 매출 | 1.5 | 12 | 65 | 220 | 572 |
| Gross Profit | 0.6 | 6 | 40 | 145 | 412 |
| OPEX | 25 | 60 | 110 | 180 | 260 |
| EBITDA | (24) | (54) | (70) | (35) | 152 |
| 누적 펀딩 | 25 | 150 | 280 | 280 | 280 |
| **임직원** | 15 | 38 | 72 | 110 | 160 |

> **Break-even**: Y5 Q1, **흑자 전환** 후 Y6+ 글로벌 진출 (일본·동남아).

---

## 12. Risk Matrix

| Risk | 확률 | 영향 | 대응 |
|---|---|---|---|
| 매도 기관 락인 실패 | 中 | 致命 | Exclusive Deal 계약 + Take Rate 인하 |
| 외부 직거래 발생 | 高 | 高 | 8-Stage 락인 + 패널티 조항 + 추적 |
| PII 유출 사고 | 低 | 致命 | 4-Layer 보안 + 보험 + Bug Bounty |
| 금융 규제 변경 | 中 | 中 | 금융위 사전 협의, 자체 준법감시인 채용 |
| AI 가격 가이드 오류 | 中 | 中 | "참고용" 명시, 보험 가입 |
| 경쟁 진입 (글로벌) | 中 | 高 | 한국 도메인 데이터 5만건 선점 |

---
---

# PART II — PRODUCT ARCHITECTURE

## 13. 사용자 페르소나 (4 Primary Roles)

| 페르소나 | 핵심 잡 | NPLatform이 해결 |
|---|---|---|
| **김 부장** (시중은행 NPL팀) | 빨리·비싸게·합법적으로 매각 | AI 가격 가이드, 매수자 풀, 자동 보고서 |
| **박 이사** (NPL 전문 투자자) | 좋은 딜 빨리 발견, 권리 안전 | Deal Access Score, 권리분석 AI, 실사 모듈 |
| **이 대표** (꼬마빌딩 매도자) | 정보 노출 최소화, 좋은 가격 | 비공개 매물, 진성 매수자 매칭 |
| **최 변호사** (전문가) | 거래 부수 수임 확보 | 전문가 마켓, 컨설팅 매칭, AI 보조 |

---

## 14. 정보 아키텍처 (Information Architecture v6)

### 14.1 Top-Level Navigation (5+1)

```
┌────────────────────────────────────────────────────┐
│ 거래소 │ 딜룸 │ 분석 │ 서비스 │ 내 정보 │ (관리자) │
└────────────────────────────────────────────────────┘
   /exchange  /deals  /analysis  /services  /my  (/admin)
```

### 14.2 거래소 (/exchange) — 통합 자산 카탈로그

| 페이지 | 기능 | 디자인 톤 |
|---|---|---|
| `/exchange` | 거래소 메인 (카드·리스트·지도 토글) | NPL 다크 톤 (현재 v5 완성) |
| `/exchange/[id]` | 매물 상세 (개요/실사/입찰/Q&A) | 좌측 자료 + 우측 액션 |
| `/exchange/sell` | 매도 위저드 (NPL/부동산 분기) | 단계별 위저드 |
| `/exchange/bulk-upload` | 기관용 대량 등록 | 테이블 + AI OCR |
| `/exchange/demands` | 매수 수요 (역경매) | 거래소와 동일 톤 |
| `/exchange/institutions` | 참여 기관 디렉터리 | 카드 그리드 |
| `/exchange/auction` | 입찰 진행 중인 매물 | 카운트다운·실시간 |
| `/exchange/map` | 지도 검색 | 풀스크린 지도 |

### 14.3 딜룸 (/deals) — 거래 진행 공간

```
/deals                  내 거래 현황 (칸반: 진행/완료/매칭)
/deals/[id]             딜룸 (8 Tabs: 개요·자료·AI·실사·Q&A·오퍼·계약·정산)
/deals/[id]/inspection  현장 실사 일정/리포트
/deals/[id]/contract    계약서 작성/서명
/deals/matching         AI 매칭 결과
/deals/teams            공동투자 팀
```

### 14.4 분석 (/analysis)

```
/analysis               시장 대시보드
/analysis/new           새 매물 분석 (AI)
/analysis/[id]          분석 결과
/analysis/copilot       AI Copilot 챗
/analysis/simulator     수익률 시뮬레이터
/analysis/ocr           문서 OCR
/analysis/npl-index     NBI 주간 지수
```

### 14.5 서비스 (/services)

```
/services               서비스 허브
/services/experts       전문가 마켓 (법무·세무·실사)
/services/community     투자자 커뮤니티
/services/learn         교육·용어사전
```

### 14.6 내 정보 (/my)

```
/my                     역할별 자동 대시보드
/my/portfolio           관심·보유 매물
/my/billing             결제·크레딧·구독
/my/settings            프로필·보안·알림
/my/notifications       알림 센터
```

### 14.7 관리자 (/admin) — 12개로 통합 (v5 결정 유지)

---

## 15. Deal Access Score — 투자자 락인 무기

각 투자자에게 **0~1000점** 의 Deal Access Score 부여:
- 거래 완료 건수 × 20
- 평균 입찰 신뢰도 × 10
- 자료 열람 후 진성 LOI 비율 × 30
- 결제·정산 신용 × 20
- 커뮤니티 기여도 × 5

→ **점수 高 → 좋은 딜 우선 공개 (Exclusive Window 24h)**
→ 점수가 자산화되어 **떠날 수 없는 이유** 가 됨.

---
---

# PART III — ENGINEERING PLAN

## 16. Tech Stack (현재 + 보강)

| Layer | Tech | 비고 |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript | 현재 |
| Styling | Tailwind 4, CSS Variables, framer-motion | 현재 |
| State | React Query, Zustand | 보강 |
| Backend | Supabase (Postgres + RLS + Edge Functions) | 현재 |
| File Storage | Supabase Storage + S3 (백업) | 보강 |
| AI/ML | OpenAI GPT-4o + Claude Opus + 자체 XGBoost | 보강 |
| Search | Postgres FTS + pgvector (RAG) | 보강 |
| Realtime | Supabase Realtime + Yjs (협업) | 보강 |
| Auth | Supabase Auth + 본인인증 (PASS) + MFA | 보강 |
| Payment | 토스페이먼츠 + 에스크로 (자체) | 신규 |
| Monitoring | Sentry + Posthog + Grafana | 보강 |

---

## 17. 데이터 모델 (Core Entities)

### 17.1 ERD 핵심

```
users ─┬─< user_roles (buyer/seller/investor/institution/expert/admin)
       └─< user_kyc_status

institutions ─< institution_listings

listings (통합)
   id, asset_type (NPL|RE_AUCTION|RE_PRIVATE|FUND_SHARE|ABS)
   tier_required (L0|L1|L2|L3)
   ai_grade, completeness_score
   masked_address, exact_address (L2+)
   ─< listing_documents (with watermark_template)
   ─< listing_ai_analyses
   ─< listing_views (audit log)

deal_rooms
   id, listing_id, status (DRAFT|OPEN|NDA|LOI|NEGOTIATION|CONTRACT|SETTLEMENT|CLOSED)
   buyer_id, seller_id
   ─< deal_messages (chat)
   ─< deal_offers (LOI/bid history)
   ─< deal_documents
   ─< deal_inspections (hybrid offline)
   ─< deal_contracts
   ─< deal_settlements

deal_access_scores
   user_id, score, components_json, updated_at

ai_credits
   user_id, balance, ledger_json

transactions
   deal_id, gmv, fee_seller, fee_buyer, escrow_status

audit_logs (append-only)
   user_id, action, resource, ip, ua, ts, payload
```

### 17.2 RLS 정책 핵심

```sql
-- L0: anyone can SELECT public columns
-- L1: only verified users
-- L2: only users with NDA + paid credit
-- L3: only buyer_id = auth.uid() or seller_id = auth.uid()

CREATE POLICY listing_l2_select ON listing_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listing_access
      WHERE listing_access.listing_id = listing_documents.listing_id
        AND listing_access.user_id = auth.uid()
        AND listing_access.tier_granted >= 'L2'
        AND listing_access.expires_at > now()
    )
  );
```

---

## 18. API 설계 (REST + Edge Functions)

### 18.1 핵심 엔드포인트 (15개 카테고리)

```
/api/v1/listings        GET POST (자산 통합 CRUD)
/api/v1/listings/:id/access-request   POST (L1→L2 승급)
/api/v1/listings/:id/documents/:doc/view   GET (signed URL, TTL 5min)

/api/v1/deals           GET POST
/api/v1/deals/:id/messages   GET POST (Realtime)
/api/v1/deals/:id/offers     POST (LOI 제출)
/api/v1/deals/:id/inspections   POST (현장 실사 예약)
/api/v1/deals/:id/contracts/sign  POST (전자서명)
/api/v1/deals/:id/settlement      POST (에스크로)

/api/v1/ai/price-guide       POST (크레딧 차감)
/api/v1/ai/rights-analysis   POST
/api/v1/ai/market-comp       POST
/api/v1/ai/copilot           POST (스트리밍)

/api/v1/credits/balance      GET
/api/v1/credits/purchase     POST
/api/v1/access-score         GET

/api/v1/admin/...            (관리자 API 12개)
```

---

## 19. 보안 아키텍처

### 19.1 4-Layer Defense

| Layer | 컴포넌트 | 구현 |
|---|---|---|
| L1 — Network | Cloudflare WAF, Rate limit | 100 req/min/IP |
| L2 — App | Supabase RLS + JWT + IP allowlist (기관) | RLS 정책 100% |
| L3 — Document | 워터마크 + Signed URL + DRM (PDF→이미지) | 자체 모듈 |
| L4 — Audit | Append-only log + Forensic export | Postgres + WORM S3 |

### 19.2 PII Masking Pipeline

```
[원본 자료 업로드]
    ↓
[OCR/PDF Parser] — 채무자명, 주민번호, 주소, 전화번호 추출
    ↓
[NER (LLM)] — 추가 PII 스캔
    ↓
[Masking Engine] — 김○○ / ***-***-1234 / 서울 강남구 ***
    ↓
[원본은 L3 전용 vault, 마스킹본은 L1-L2 노출]
```

---

## 20. 페이지·컴포넌트 인벤토리 (현재 → 목표)

### 20.1 v5 대비 v6 변경사항

| 영역 | v5 (65 페이지) | v6 추가/변경 |
|---|---|---|
| 거래소 | 8 | + `/exchange/auction` 별도, `/exchange/teaser-preview` (모달) |
| 딜룸 | 8 | + `/deals/[id]/inspection`, `/deals/[id]/access-log` |
| 분석 | 6 | (유지) |
| 서비스 | 10 | (유지) |
| 내 정보 | 9 | + `/my/access-score` |
| 공통 | 7 | (유지) |
| 인증 | 5 | (유지) |
| 관리자 | 12 | + `/admin/audit-trail` |
| **합계** | 65 | **70** |

---
---

# PART IV — DESIGN SYSTEM OVERHAUL

## 21. 현재 디자인 갭 분석 (Design Gap Audit)

### 21.1 사용자가 지적한 문제

1. ✅ 매물(/exchange) 메인은 톤앤매너 완성도 高
2. ❌ 다른 메뉴 (/deals, /analysis, /services, /my)는 톤앤매너 부족
3. ❌ 매물 하위 페이지 (sell, demands, bulk-upload, [id])는 디자인 미완성

### 21.2 갭 매트릭스

| 영역 | 현재 점수 (10점) | 목표 (10점) |
|---|---:|---:|
| /exchange (메인) | 9 | 10 |
| /exchange/[id] | 5 | 10 |
| /exchange/sell | 4 | 10 |
| /exchange/demands | 4 | 10 |
| /deals | 5 | 10 |
| /deals/[id] (딜룸) | 6 | 10 |
| /analysis | 6 | 10 |
| /services | 4 | 10 |
| /my | 5 | 10 |
| /admin | 6 | 9 |

---

## 22. Design Tokens (Single Source of Truth)

### 22.1 Color System

```ts
// design-tokens/colors.ts
export const tokens = {
  // Backgrounds (Dark, NPL Trading Tone)
  bg: {
    0: '#030810',  // canvas
    1: '#050D1A',
    2: '#080F1E',
    3: '#0A1628',
    4: '#0F1F35',  // border
  },
  // Brand
  brand: {
    primary: '#10B981',  // emerald (수익·신뢰)
    primaryLight: '#34D399',
    deep: '#1B3A5C',     // navy (기관·신뢰)
  },
  // Accent
  accent: {
    blue: '#3B82F6',
    amber: '#F59E0B',
    purple: '#A855F7',
    rose: '#F43F5E',
    teal: '#14B8A6',
  },
  // Text on dark
  text: {
    primary: '#FFFFFF',
    secondary: '#E2E8F0',
    tertiary: '#94A3B8',
    quaternary: '#64748B',
    muted: '#475569',
  },
  // Light mode mirror
  light: { /* mirror */ },
} as const
```

### 22.2 Typography Scale

```
Display    48 / 56  / 900 / -0.04em
H1         36 / 44  / 900 / -0.03em
H2         28 / 36  / 800 / -0.02em
H3         22 / 30  / 800 / -0.02em
H4         18 / 26  / 700 / -0.01em
Body lg    16 / 24  / 500
Body       14 / 22  / 500
Body sm    13 / 20  / 500
Caption    11 / 16  / 600
Mono       12 / 18  / 500 / monospace (id, 숫자)
```

### 22.3 Spacing & Radius

```
Spacing: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72 · 96
Radius:  4 · 6 · 8 · 10 · 12 · 14 · 18 · 9999
```

### 22.4 Elevation (Dark theme)

```
e0  border 1px #0F1F35
e1  border 1px #0F1F35 + bg #080F1E
e2  border 1px #0F1F35 + bg #0A1628 + shadow 0 1px 2px rgba(0,0,0,0.3)
e3  border 1px #1E3755 + bg #0F1F35 + shadow 0 4px 12px rgba(0,0,0,0.4)
e4  modal:  border 1px #1E3755 + bg #0A1628 + shadow 0 24px 48px rgba(0,0,0,0.6)
```

---

## 23. Component Library (50 Core)

### 23.1 분류

```
Primitives    Button, Input, Select, Checkbox, Radio, Switch, Slider, Textarea
Layout        Container, Grid, Stack, Divider, Section
Display       Card, Badge, Avatar, Tag, Chip, Skeleton, EmptyState
Feedback      Alert, Toast, Tooltip, Popover, Dialog (Portal!), Drawer
Navigation    Tabs, Breadcrumb, Pagination, Stepper, Sidebar
Data          Table, DataGrid, Tree, KanbanBoard, Calendar
Charts        Line, Bar, Donut, Heatmap, Sparkline (recharts)
NPL-specific  TierBadge, CompletenessBadge, AIGradeBadge,
              ListingCard, ListingRow, DealRoomTab, OfferCard,
              InspectionTimeline, WatermarkedDocument, AccessScoreRing,
              CreditMeter, LOIForm, PriceGuideWidget, RightsRiskMatrix
```

### 23.2 모달은 반드시 Portal로

```tsx
// components/ui/dialog.tsx
import { createPortal } from 'react-dom'
// 절대 transform이 있는 부모 안에서 렌더하지 말 것 → portal 강제
```

---

## 24. Page-by-Page Rebuild Priority

### 24.1 우선순위 매트릭스

| 우선 | 페이지 | 사유 | 예상 작업량 |
|---|---|---|---|
| **P0** | `/exchange/[id]` | 거래의 진입점 | 5d |
| **P0** | `/deals/[id]` (딜룸) | 락인 핵심 | 7d |
| **P0** | `/exchange/sell` | 매도 진입점 | 4d |
| **P1** | `/deals` 칸반 | 거래 현황 | 3d |
| **P1** | `/analysis` 대시보드 | 신뢰도 | 3d |
| **P1** | `/exchange/demands` | 역경매 | 3d |
| **P2** | `/services/experts` | 부가 매출 | 2d |
| **P2** | `/my` 역할별 | 잔존율 | 4d |
| **P2** | `/exchange/bulk-upload` | 기관 락인 | 3d |
| **P3** | `/admin/*` | 운영 효율 | 6d |

### 24.2 디자인 정비 체크리스트 (페이지별)

- [ ] Hero 영역 (top-level title, subtitle, CTA)
- [ ] KPI/요약 strip (4-6 메트릭)
- [ ] Sticky filter/action bar
- [ ] 메인 콘텐츠 (Card/List/Table 중 선택)
- [ ] Empty state (디자인된 일러스트)
- [ ] Loading state (skeleton, not spinner)
- [ ] Error state (사용자 친화적 메시지)
- [ ] 모바일 (≤640) / 태블릿 (641-1023) / 데스크톱 (≥1024) 3-tier

---

## 25. 글로벌 톱티어 벤치마크

| 영역 | 벤치마크 | 우리 적용 |
|---|---|---|
| Trading UX | **Bloomberg Terminal**, **Carta** | 데이터 밀도 + 단축키 |
| Fintech 톤 | **Stripe**, **Mercury**, **Brex** | 미니멀 + 차분한 confidence |
| Workflow | **Linear**, **Notion** | 빠른 인터랙션, 키보드 우선 |
| 데이터 제품 | **Pitchbook**, **Crunchbase** | 검색·필터 패턴 |
| 한국 핀테크 | **토스**, **카카오뱅크** | 모바일 친화 |

---
---

# PART V — EXECUTION ROADMAP

## 26. 6-Phase Roadmap (6 months → MVP+ → GTM)

### Phase 1 — Foundation (M1, Weeks 1-4) ✅ in progress
- [x] 페이지 구조 정리 (283 → 70)
- [x] 거래소 메인 디자인 완성
- [ ] **디자인 시스템 토큰 정리**
- [ ] **Dialog Portal 강제** (모달 깨짐 영구 차단)
- [ ] DB 스키마 v6 마이그레이션

### Phase 2 — Listing & Discovery (M2, Weeks 5-8)
- [ ] /exchange/[id] 풀 디자인
- [ ] /exchange/sell 위저드
- [ ] /exchange/demands 역경매
- [ ] L0/L1 마스킹 파이프라인
- [ ] 검색·필터·지도 통합

### Phase 3 — DealRoom Core (M3, Weeks 9-12) — **가장 중요**
- [ ] /deals/[id] 8 Tabs 완성
- [ ] 워터마크 + Signed URL
- [ ] LOI 제출/협상 채팅
- [ ] 열람 로그 + Audit Trail
- [ ] 하이브리드 실사 모듈 v1

### Phase 4 — AI Layer (M4, Weeks 13-16)
- [ ] AI 가격 가이드 (XGBoost + LLM 후처리)
- [ ] AI 권리분석 (RAG)
- [ ] AI Copilot
- [ ] 크레딧 시스템

### Phase 5 — Contract & Settlement (M5, Weeks 17-20)
- [ ] 계약서 자동 생성
- [ ] 전자서명
- [ ] 에스크로 연동
- [ ] 자동 정산 + 영수증

### Phase 6 — GTM Launch (M6, Weeks 21-24)
- [ ] Beachhead 1: 캐피탈/AMC 5곳 온보딩
- [ ] PR 캠페인
- [ ] 베타 → GA 전환
- [ ] Series A 자료 준비

---

## 27. 핵심 KPI (North Star Metrics)

| 단계 | KPI | Y1 목표 |
|---|---|---|
| **Acquisition** | 등록 매물 수 | 200건 |
| **Activation** | L1 인증 완료율 | 60% |
| **Retention** | 월간 활성 매수자 (MAU) | 500 |
| **Revenue** | GMV (₩억) | 80 |
| **Lock-in (★)** | **딜룸 → 클로징 전환율** | 25% |
| **Lock-in (★)** | **외부 직거래 발생률** | < 5% |
| **NPS** | 매도 기관 NPS | 50+ |

> ★ = Lock-in 지표는 다른 모든 KPI보다 우선한다. 락인이 깨지면 비즈니스는 죽는다.

---

## 28. 의사결정 원칙 (Founder's Principles)

1. **거래가 일어나지 않는 기능은 만들지 않는다.**
2. **정보를 다운로드 가능하게 하면 회사가 죽는다.**
3. **AI는 도구일 뿐, 신뢰의 원천은 데이터와 프로세스다.**
4. **디자인은 신뢰의 90%다. 톱티어 수준이 아니면 출시하지 않는다.**
5. **하이브리드를 인정하라 — 현장은 사라지지 않는다. 단지 최소화될 뿐.**
6. **양면 시장은 한쪽이 무너지면 끝난다 — 매도 기관에 모든 것을 걸어라.**
7. **규제는 해자다. 두려워하지 말고 끌어안아라.**
8. **단순 정보 사업은 절대 하지 않는다.**

---

## 29. 부록: 현재 코드베이스 → v6 변환 작업 항목

### 29.1 디자인 시스템 정비 (Phase 1 우선)
- [ ] `lib/design-tokens.ts` 신설 — 색/타입/간격/elevation 통합
- [ ] `components/ui/dialog.tsx` Portal 강제 (이미 fix된 transform 이슈의 영구 방지)
- [ ] `components/ui/listing-card.tsx`, `listing-row.tsx` 추출 (현재 /exchange/page.tsx 인라인)
- [ ] 모든 페이지의 인라인 `style={{}}` → 토큰 참조로 마이그레이션

### 29.2 페이지 디자인 완성 우선순위
- [ ] **P0**: /exchange/[id], /deals/[id], /exchange/sell
- [ ] **P1**: /deals (칸반), /analysis, /exchange/demands
- [ ] **P2**: /services/*, /my/*, /exchange/bulk-upload
- [ ] **P3**: /admin/*

### 29.3 락인 기능 구현 항목
- [ ] 워터마크 컴포넌트 (`components/dealroom/watermarked-document.tsx`)
- [ ] 열람 로그 미들웨어 (`middleware/audit-log.ts`)
- [ ] Signed URL 시스템 (`lib/signed-url.ts`, TTL 5분)
- [ ] Deal Access Score 계산 엔진 (`lib/access-score.ts`)
- [ ] LOI 폼 (외부 제출 차단, 플랫폼 내 전용)
- [ ] 협상 채팅 (Realtime, 연락처 자동 마스킹)
- [ ] 에스크로 정산 (토스페이먼츠 연동)

---

## 30. 마지막 한 줄

> **NPLatform은 정보 회사가 아니다. 거래 인프라 회사다.**
> **이 차이가 글로벌 유니콘과 단명 정보 포털을 가른다.**

— 끝 —
