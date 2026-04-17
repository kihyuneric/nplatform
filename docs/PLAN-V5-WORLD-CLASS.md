# NPLatform v5.0 — World-Class NPL Platform Redesign

> **목표:** DebtX + Debitos + Prelios를 뛰어넘는, AI가 핵심 경쟁력인 부실채권 플랫폼
> **핵심 차별화:** "AI가 분석하고, AI가 판단하고, AI가 보고서를 쓴다"

---

## I. 현실 진단 — 왜 현재 수준이 낮은가

### 가짜 AI의 실체
| 모듈 | 주장 | 실제 구현 | 심각도 |
|------|------|----------|--------|
| recovery-predictor | "XGBoost 12,847 샘플 학습" | 하드코딩 decision tree leaf값 | CRITICAL |
| copilot | "LLM tool-calling + RAG" | 정규식 패턴매칭 6개 | CRITICAL |
| price-guide | "멀티시그널 가격 분석" | lookup 테이블 3개 곱셈 | CRITICAL |
| anomaly-detector | "Z-score + ML 이상탐지" | if문 3개 (가격<30%→위험) | CRITICAL |
| document-analyzer | "NLP 문서 분석" | 정규식 13개 | HIGH |
| copilot intent | "의도 분류기" | regex.test() 12줄 | CRITICAL |

### 글로벌 플랫폼과의 격차
| 영역 | DebtX/Debitos | NPLatform 현재 | 목표 |
|------|--------------|--------------|------|
| AI 분석 | GPT-4 기반 실시간 분석 | 가짜 (lookup table) | Claude 기반 실시간 투자 분석 |
| 문서 분석 | OCR + LLM 자동 파싱 | 정규식 매칭만 | LLM 구조화 추출 |
| 가치평가 | 실시간 시장데이터 + ML | 하드코딩 지역별 계수 | LLM + 수학모델 앙상블 |
| 리스크 분석 | 실시간 이상탐지 + 패턴 | if문 3개 | LLM 추론 + 통계 앙상블 |
| 보고서 | AI 자동 작성 40p+ | 템플릿 치환 (데이터 가짜) | Claude가 실제 분석/작성 |
| Copilot | GPT-4 tool-calling | 정규식 라우터 | Claude tool-use + streaming |

---

## II. 비즈니스 전략 — AI-First NPL Platform

### 핵심 가치 제안 (Value Proposition)
1. **"10분 만에 전문가 수준 실사 보고서"** — Claude가 등기부/계약서/감정평가서를 읽고 120+ 항목 자동 분석
2. **"AI가 찾아주는 숨은 리스크"** — 사람이 놓치는 권리관계 함정을 AI가 발견
3. **"대화하듯 분석하는 NPL Copilot"** — "이 매물 5억에 사도 돼?" 질문에 근거 기반 답변
4. **"투자은행급 보고서 자동 생성"** — 기관 투자자가 바로 쓸 수 있는 품질

### 수익 모델
| 티어 | 가격 | AI 기능 |
|------|------|---------|
| Free | 0원 | 매물 검색, 기본 시세 |
| Pro | 49,000/월 | Copilot 50회, DD 보고서 5건, 문서분석 무제한 |
| Enterprise | 490,000/월 | Copilot 무제한, DD 무제한, API 접근, 커스텀 모델 |
| Institution | 협의 | 전용 인스턴스, SLA, 화이트라벨 |

### 경쟁 해자 (Moat)
- **한국 NPL 특화 AI**: 등기부등본/감정평가서/경매 데이터에 최적화된 프롬프트 + 도구
- **데이터 네트워크 효과**: 거래가 늘수록 AI 예측 정확도 향상
- **규제 준수**: 금감원/법원경매 기준 완전 준수

---

## III. 기술 아키텍처 — AI Engine v5

### 핵심 설계 원칙
```
[사용자 질문/문서] → [AI Core Layer] → [도메인 도구들] → [구조화된 응답]
                         ↓
                    Claude API (tool-use)
                         ↓
              ┌─────────────────────────┐
              │  도구 1: 회수율 예측      │ → Monte Carlo + DCF 수학 모델
              │  도구 2: 문서 분석        │ → OCR + 구조화 추출
              │  도구 3: 권리관계 분석     │ → 등기부 파싱 + 리스크 평가
              │  도구 4: 시장 비교        │ → 유사매물 + 트렌드
              │  도구 5: 이상 탐지        │ → 통계 + 패턴 인식
              │  도구 6: 계약서 생성      │ → 조항별 AI 검토
              │  도구 7: 가격 가이드      │ → 다중모델 앙상블
              └─────────────────────────┘
```

### 아키텍처 결정
1. **Claude API (tool-use)** — 핵심 추론 엔진. 모든 분석은 Claude가 수행
2. **수학 모델은 도구로** — Monte Carlo, DCF, IRR 등은 Claude의 tool로 호출
3. **Structured Output** — Zod 스키마로 AI 응답 강제 구조화
4. **Streaming** — 실시간 응답 (Vercel AI SDK)
5. **Caching** — 동일 분석 요청 캐싱 (비용 절감)
6. **Fallback** — API 실패 시 기존 휴리스틱 모듈로 graceful degradation

---

## IV. 개발 계획 — 6 Phase

### Phase 1: AI Core Engine (이번 세션)
**목표:** 모든 AI 모듈의 심장부 구축

1. `lib/ai/core/llm-service.ts` — 통합 LLM 서비스 레이어
   - Claude API 초기화 + 에러 핸들링
   - Tool-use 프로토콜 정의
   - Structured output (Zod) 강제
   - Token 사용량 추적
   - 캐싱 레이어

2. `lib/ai/core/tools.ts` — AI 도구 정의
   - 7개 도메인 도구를 Claude tool-use 형식으로 정의
   - 각 도구의 input/output 스키마

3. `lib/ai/core/prompts.ts` — 시스템 프롬프트
   - NPL 도메인 전문가 페르소나
   - 한국 부동산/법률 지식 기반
   - 환각 방지 규칙

### Phase 2: AI 모듈 전면 교체 (이번 세션)
**목표:** 가짜 AI를 진짜 AI로 전부 교체

1. `copilot.ts` v2 — Claude tool-calling + streaming
2. `document-analyzer.ts` v2 — LLM 구조화 추출
3. `recovery-predictor.ts` v2 — 수학모델 + LLM 추론 하이브리드
4. `anomaly-detector.ts` v2 — LLM 패턴인식 + 통계 앙상블
5. `price-guide.ts` v2 — 다중모델 앙상블 + LLM 시장분석

### Phase 3: API 라우트 재구축 (이번 세션)
**목표:** Streaming + Structured Output API

1. `/api/v1/ai/copilot` — SSE streaming
2. `/api/v1/ai/analyze-document` — 구조화 응답
3. `/api/v1/ai/predict-recovery` — 하이브리드 응답
4. `/api/v1/ai/detect-anomaly` — 실시간 분석
5. `/api/v1/ai/generate-report` — DD 보고서 AI 생성

### Phase 4: 프론트엔드 AI 통합
- Copilot 채팅 UI (streaming)
- 문서 분석 결과 시각화
- AI 인사이트 카드
- 실시간 리스크 알림

### Phase 5: 데이터 파이프라인
- Supabase 실데이터 연결
- 법원경매 API 연동
- 실거래가 API 연동
- RAG 벡터 검색 활성화

### Phase 6: 품질 보증
- AI 응답 품질 테스트
- 할루시네이션 감지
- A/B 테스트 프레임워크
- 비용 최적화

---

## V. 핵심 기술 사양

### LLM Service Layer
- Provider: Anthropic Claude (claude-sonnet-4-20250514)
- Protocol: Tool-use (function calling)
- Output: Zod-validated structured JSON
- Streaming: Vercel AI SDK (ai package)
- Fallback: 기존 휴리스틱 모듈
- Cache: In-memory LRU (production: Redis)

### AI 도구 목록
| 도구명 | 설명 | 입력 | 출력 |
|--------|------|------|------|
| calculate_recovery | 회수율 계산 | 채권정보 | 회수율, CI, SHAP |
| analyze_document | 문서 구조화 분석 | OCR 텍스트 | 구조화 데이터 |
| analyze_rights | 권리관계 분석 | 등기부 데이터 | 리스크 평가 |
| compare_market | 시장 비교 분석 | 지역/유형 | 유사매물, 트렌드 |
| detect_anomaly | 이상 탐지 | 매물 데이터 | 알림, 점수 |
| generate_contract | 계약서 생성 | 거래 조건 | 계약서 초안 |
| evaluate_price | 가격 적정성 | 매물 정보 | 3시나리오 가격 |

---

## VI. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| AI 응답 품질 | 가짜 (lookup) | 전문가 수준 자연어 |
| 문서 분석 정확도 | 정규식 60% | LLM 95%+ |
| Copilot 응답 시간 | 즉시 (가짜) | <5초 (streaming) |
| DD 보고서 품질 | 템플릿 치환 | AI 작성 투자급 |
| 사용자 신뢰도 | 낮음 | 높음 (근거 제시) |
