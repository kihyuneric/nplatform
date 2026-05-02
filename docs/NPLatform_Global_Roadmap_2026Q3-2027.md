# NPLatform — 글로벌 부실채권 플랫폼 도약 계획서
## Diagnostic & Development Roadmap (2026 Q3 ~ 2027)

> **목표**: 한국 NPL 거래 플랫폼 → **세계 최고의 글로벌 NPL Marketplace**
> **기준점**: McKinsey "Where to Play / How to Win" 프레임워크
> **작성일**: 2026-04-29
> **작성자**: NPLatform Team / TransFarmer Inc.

---

## 0. Executive Summary (3 단락)

NPLatform 은 한국 시장에서 **AI 분석 + 자동 매칭 + 전자서명 통합 워크플로우** 라는 강점을 확보했습니다.
4-Phase 마이그레이션을 통해 매물 등록 → 분석 → 딜룸 → 정산 의 **end-to-end 디지털 거래 흐름**을 구현했고,
McKinsey 스타일 정합 + 6-Zone 운영센터 + Realtime 동기화로 **운영 효율성** 또한 글로벌 SaaS 수준에 근접합니다.

그러나 **글로벌 NPL 시장 (2025년 기준 USD 1.2T)** 으로 확장하려면 5가지 핵심 격차가 존재합니다 —
**(1) 다중 통화 · 다중 법역 지원**, **(2) Distressed Debt Investor (DDI) 데이터 인프라**, **(3) Cross-border 결제 · 실사 · 규제 준수**,
**(4) Institutional grade 보안 · 컴플라이언스 (SOC 2 · ISO 27001)**, **(5) 도메인 데이터 (NPL 거래 이력 · ML 학습 데이터)**.

본 문서는 **6 개월 ~ 18 개월** 범위의 **3 단계 로드맵** (Foundation → Scale → Global) 으로 격차를 메우는 실행 계획을 제시합니다.
총 18 개의 Phase 로 구성되며, 각 Phase 는 **(가설 · 측정지표 · 산출물 · 의존성)** 으로 정의됩니다.

---

## 1. As-Is 진단 — 5 차원 평가

### 1.1 글로벌 벤치마크 비교

| 차원 | NPLatform (현재) | Debitos (EU) | Resolution Capital (US) | Pluto Loans (UK) | 격차 |
|---|---|---|---|---|---|
| **AI 분석** | ✅ 4팩터 + Monte Carlo | ⚠ 기본 회수율 | ✅ ML-based recovery | ⚠ 기본 | **선두권** |
| **거래 자동화** | ✅ NDA/LOI/ESCROW | ✅ NDA + DD | ⚠ 수기 비중 ↑ | ✅ DD VDR | **동등** |
| **거래량 (월)** | 53 매물 | 200~500 | 100~300 | 80~150 | **하위** |
| **다국어** | 한·영·일·중 (Auto-translate) | EN·DE·FR·ES | EN | EN | **선두** |
| **다통화** | KRW only | EUR + multi | USD | GBP + EUR | **하위** |
| **Cross-border 결제** | ❌ 미구현 | ✅ SEPA + Wire | ✅ Wire + USDC | ✅ SEPA | **하위** |
| **컴플라이언스 인증** | ❌ 없음 | ✅ ISO 27001 | ✅ SOC 2 Type II | ✅ ICO 등록 | **하위** |
| **도메인 데이터** | 53건 | 50,000+ 누적 | 20,000+ 누적 | 5,000+ 누적 | **하위** |
| **Investor Network** | 12 기관 | 1,200+ | 800+ | 400+ | **하위** |

### 1.2 SWOT — 글로벌 시장 진출 관점

#### Strengths (강점)
- **End-to-end 디지털화** — NDA → ESCROW → 정산 자동
- **AI 분석 보고서** — Monte Carlo 5,000회 + 4팩터 위험 모델 (선두권)
- **자동 마스킹 (PII)** — RLS + 등기부 NDA 제어 (boundary-aware)
- **다국어 자동 번역** — Google Translate fallback + 정적 사전 60+ 용어
- **McKinsey 정합 UX** — 5-Zone 마이페이지 + 6-Zone 관리자 (설계 완성도)
- **Anti-bypass policy** — NDA/LOI 본문 독점 거래 조항 (수익 보호)

#### Weaknesses (약점)
- **거래량 부족** (53 vs 글로벌 평균 200+)
- **단일 통화** (KRW) — 외환 거래 미지원
- **단일 법역** (한국) — Cross-border 자문 / 분쟁 해결 미정의
- **컴플라이언스 인증 부재** — SOC 2 / ISO 27001 / GDPR 인증 X
- **ML 학습 데이터 부족** — 회수율 모델이 통계 추정 위주
- **모바일 네이티브 앱 없음** — PWA 만 지원

#### Opportunities (기회)
- **글로벌 NPL 잔액 USD 1.2T** (BIS 2025) — 연 +8% 성장 (특히 EU·LatAm)
- **AI distressed debt analysis 시장 USD 4.8B** (2026 → 2030 USD 18B)
- **Cross-border NPL 거래 디지털화 미성숙** — 진입 장벽
- **Institutional crypto custody (USDC)** — Cross-border 정산 비용 ↓ 80%
- **EU AMC Directive (2027)** — NPL 매각 의무화 → 마켓플레이스 수요 ↑

#### Threats (위협)
- **현지 거대 플랫폼** (Debitos / Loantrade) 의 한국 진출 가능성
- **금리 상승 → NPL 발생량 ↑** 이지만 **회수율 ↓** (자산 가격 하락)
- **개인정보 규제 강화** (GDPR · CCPA · K-PIPA) — 다국가 컴플라이언스 비용 ↑
- **블록체인 기반 NPL 토큰화** — 향후 disruption (5~10년)

### 1.3 도메인별 상세 진단

| 영역 | 현재 점수 | 글로벌 최고 | 핵심 격차 |
|---|---|---|---|
| AI/ML 통합 | 65/100 | 95 | (1) 실제 거래 데이터 ML 학습 (2) MLOps (드리프트 감지·재학습) |
| 데이터 파이프라인 | 60/100 | 90 | (1) 외부 NPL 데이터 (KAMCO · SAREB · IBA) (2) 실시간 시세 (3) BloombergGPT 수준 RAG |
| 보안/컴플라이언스 | 70/100 | 95 | (1) SOC 2 Type II (2) ISO 27001 (3) GDPR DPO (4) 침투 테스트 |
| UX/성능 | 75/100 | 92 | (1) 모바일 네이티브 (2) Edge runtime (전 세계 < 200ms) |
| 금융 도메인 | 70/100 | 88 | (1) NPL pool sale (2) 채권 양도 표준 (ISDA-NPL) (3) 거래 후 분쟁 해결 |
| API 설계 | 75/100 | 90 | (1) GraphQL Federation (2) Webhook 스트리밍 (3) Public API + SDK |
| 실시간 기능 | 60/100 | 90 | (1) WebSocket 입찰 (현재 Realtime polling) (2) Live auction |
| 테스트/품질 | 40/100 | 88 | (1) Unit + E2E coverage 80% (2) Visual regression (3) Load testing |
| 도메인 데이터 | 35/100 | 85 | (1) 거래 이력 10K+ (2) 외부 시세 (3) 회수율 ground truth |
| ML 모델 | 40/100 | 90 | (1) LightGBM/XGBoost (2) Feature store (3) AutoML (4) Backtesting |
| **종합** | **59/100** | **92.5** | — |

---

## 2. Where to Play — 글로벌 시장 우선순위

### 2.1 시장별 매력도 매트릭스

| 시장 | NPL 잔액 | 디지털 침투율 | 규제 진입성 | 우선순위 |
|---|---|---|---|---|
| **한국** (현재) | USD 14B | 25% | ✅ 본거지 | **즉시** (P0) |
| **일본** | USD 67B | 15% | ⚠ 외국인 등록 필요 (3개월) | **6 개월** (P1) |
| **EU** (스페인 · 이탈리아 · 그리스) | USD 380B | 60% | ⚠ EU AMC Directive 준수 + DPO | **12 개월** (P2) |
| **미국** (Distressed) | USD 250B | 80% | 🔴 SEC + FINRA 등록 (12개월) | **18+ 개월** (P3) |
| **신흥 (인도 · 동남아)** | USD 200B | 5% | 🟢 진입 쉬움 (인프라 미흡) | **24 개월** (P4) |

### 2.2 첫 글로벌 베타 → 일본 (P1)
**이유**:
- 지리·시차·규제·언어 (이미 ja 번역) 4 가지 모두 한국과 인접
- 일본 NPL 시장 USD 67B (한국의 4.8 배) 디지털 침투율 15% (저조)
- TPG / Lone Star / Fortress 등 글로벌 PEF 가 한·일 양국 거래
- 1차 베타 6 개월 후 거래 5 개 성사 시 → EU 진출 검증

---

## 3. How to Win — 핵심 전략 4 가지

### 3.1 데이터 모트 (Data Moat) 구축
- **목표**: 거래 이력 10K+ 누적 → ML 회수율 모델 ground truth 확보
- **수단**: (1) 무료 6개월 정책 (현재 적용) (2) 매도사 인센티브 (전속 0.3%) (3) 정부 데이터 (KAMCO 공매)
- **측정**: 누적 거래 5K (12 개월) · 10K (18 개월)

### 3.2 AI Excellence
- **목표**: 회수율 예측 RMSE < 8% (현재 추정 ±15%)
- **수단**: (1) LightGBM + Feature store (2) 백테스팅 (3) 실거래 vs 예측 비교 자동화
- **측정**: Sharpe ratio · Hit rate · MAPE

### 3.3 Institutional Trust
- **목표**: SOC 2 Type II + ISO 27001 + EU GDPR 준수
- **수단**: (1) 보안 감사 외주 (Pentesting · ISMS) (2) DPO 지명 (이미 박성필) (3) Audit log 강화
- **측정**: 인증서 보유 · 침투 테스트 0 critical

### 3.4 Network Effects
- **목표**: 매도자 100 + 매수자 1,000 (12 개월)
- **수단**: (1) 마케팅 (땅집고 12K + 한경 + 매경) (2) Referral (포상금 30%) (3) Partner expansion
- **측정**: MAU · 등록 매물 수 · 첫 거래 전환율

---

## 4. Roadmap — 3 단계 18 Phase

### **Stage 1 — Foundation (Q3 2026, 3 개월)**
한국 시장 굳히기 + 글로벌 진출 기반 구축

| Phase | 명 | 핵심 산출물 | 측정 지표 |
|---|---|---|---|
| **G-1** | 다중 통화 인프라 | KRW · USD · EUR · JPY 4통화 + ECB · BOK API + 환율 스토리지 | 통화 간 자동 환산 · 차트 dual-currency |
| **G-2** | 다중 법역 NDA / LOI | 한국 · 일본 · 영문 (US·EU 공통) 템플릿 + 자동 선택 | 법역별 PDF 자동 생성 |
| **G-3** | 보안 인증 준비 | SOC 2 Type I 감사 시작 + 침투 테스트 + Audit log 강화 | SOC 2 Type I 인증 |
| **G-4** | ML 회수율 모델 v1 | LightGBM + 한국 거래 1K backtest + Feature store | RMSE < 12% |
| **G-5** | 모바일 네이티브 앱 | React Native + 핵심 5 기능 (거래소·딜룸·알림·KYC·결제) | iOS/Android 베타 출시 |
| **G-6** | 테스트 자동화 80% | Vitest + Playwright + Visual regression (Chromatic) | Coverage 80% |

### **Stage 2 — Scale (Q4 2026 ~ Q1 2027, 6 개월)**
일본 진출 + EU 베타

| Phase | 명 | 핵심 산출물 | 측정 지표 |
|---|---|---|---|
| **S-1** | 일본 베타 런칭 | 도쿄 사무소 + 일본어 SubNav + 일본 NPL 시장 데이터 (J-Score) | 첫 거래 5 건 |
| **S-2** | Cross-border 결제 | USDC 옵션 + Wise · Stripe Treasury | < 1% FX cost |
| **S-3** | 외부 데이터 통합 | KAMCO API + 법원경매 (한·일) + Bloomberg NPL feed | 1K+ 외부 매물 자동 인덱싱 |
| **S-4** | WebSocket 라이브 입찰 | 실시간 호가 + countdown + 자동 종료 | 입찰 latency < 100ms |
| **S-5** | RAG · Copilot v2 | NPL 법률 RAG (5K 판례) + Claude 4.5 + 보고서 자동 생성 | 사용자 만족도 4.5+ |
| **S-6** | EU 프리뷰 (스페인 · 이탈리아) | EU AMC Directive 준수 + DPO 지명 + 영문 + EUR | 파트너 5 기관 |

### **Stage 3 — Global Leadership (Q2 ~ Q4 2027, 9 개월)**
미국 진출 + Distressed Debt Marketplace 글로벌 1위 진입

| Phase | 명 | 핵심 산출물 | 측정 지표 |
|---|---|---|---|
| **L-1** | 미국 베타 (CA · TX · NY) | SEC Reg D + FINRA 등록 (or partner with broker-dealer) | 첫 거래 10 건 |
| **L-2** | NPL 토큰화 (Pilot) | ERC-3643 (security token) + 전자서명 on-chain hash | 1 건 토큰화 deal |
| **L-3** | Pool Sale Marketplace | 100 채권 묶음 매각 + automated waterfall | 첫 Pool sale |
| **L-4** | Public API + SDK | OpenAPI 3.1 + JS/Python SDK + Webhook 스트리밍 | 50+ 외부 dev |
| **L-5** | ISO 27001 + SOC 2 Type II | 보안 인증 풀 셋 (전 세계 institutional 준수) | 모든 인증 통과 |
| **L-6** | Distressed Debt Index (DDI) | 실거래 기반 글로벌 NPL 가격 지수 — Bloomberg 비교 | 일일 publish |

---

## 5. 우선순위 매트릭스 — Impact vs Effort

```
                    Effort →
        Low                              High
     ┌─────────────────────┬─────────────────────┐
High │  ★ G-2 다중 법역      │  S-1 일본 진출        │
 ↑   │    NDA               │  G-3 SOC 2          │
Imp- │  ★ G-1 다통화          │  S-2 Cross-border  │
act  │  ★ G-4 ML v1         │  L-1 미국 진출       │
     ├─────────────────────┼─────────────────────┤
     │  G-6 테스트 자동화     │  G-5 모바일 앱       │
Low  │  S-3 외부 데이터       │  L-2 토큰화          │
     │                      │  L-6 DDI            │
     └─────────────────────┴─────────────────────┘

★ = Q3 2026 즉시 착수 (Quick Win)
```

---

## 6. 리소스 · 예산 · 일정

### 6.1 인력 계획
| Phase | FTE | 핵심 역할 |
|---|---|---|
| Stage 1 (3M) | 8 | FE 3 + BE 3 + ML 1 + DevOps 1 |
| Stage 2 (6M) | 14 | + JP team 4 (BD/Legal/Ops) + Security 2 |
| Stage 3 (9M) | 24 | + US team 6 + Compliance 2 + Data 2 |

### 6.2 예산 (USD)
| 영역 | Stage 1 | Stage 2 | Stage 3 | 합계 |
|---|---|---|---|---|
| 개발 (인건비) | 480K | 1,260K | 2,160K | 3,900K |
| 컴플라이언스 (감사·법무) | 80K | 200K | 350K | 630K |
| 인프라 (Vercel · AWS · DB) | 30K | 90K | 180K | 300K |
| 마케팅 (땅집고 · 한경) | 50K | 150K | 300K | 500K |
| 외부 데이터 (Bloomberg · KAMCO) | 20K | 80K | 150K | 250K |
| **합계** | **660K** | **1,780K** | **3,140K** | **5,580K** |

### 6.3 마일스톤 KPI
| 시점 | 매물 | MAU | 거래 | ARR (USD) |
|---|---|---|---|---|
| 현재 | 53 | 500 | 0 (베타) | 0 |
| Q3 2026 | 200 | 1,500 | 10 | 50K |
| Q4 2026 | 500 | 4,000 | 30 | 200K |
| Q2 2027 | 2,000 | 15,000 | 100 | 1.5M |
| Q4 2027 | 10,000 | 50,000 | 500 | 8M |

---

## 7. 위험 관리

| 리스크 | 영향 | 가능성 | 완화 방안 |
|---|---|---|---|
| 일본 등록 지연 | 6 개월 지연 | 30% | 현지 변호사 사전 컨설팅 (Q2 2026) |
| ML 모델 정확도 부족 | 사용자 신뢰 ↓ | 40% | 백테스팅 + 보수적 신뢰 구간 표기 |
| 보안 인증 실패 | EU 진출 불가 | 20% | SOC 2 Type I 우선 → Type II 단계적 |
| 환율 변동성 | 거래 취소 ↑ | 50% | ESCROW 시점 환율 고정 (Wise lock-in) |
| 경쟁사 한국 진출 | 시장 점유율 ↓ | 30% | 한국 데이터 모트 + 정부 파트너십 (KAMCO) |

---

## 8. 즉시 실행 (다음 30 일)

### Week 1–2
- ✅ 본 문서 검토 & 우선순위 확정 (위 ★ 4 개)
- ⏳ G-1 다통화 인프라 사양서 작성 (KRW + USD + EUR + JPY)
- ⏳ G-2 다중 법역 NDA 변호사 자문 발주 (한·일·영문)

### Week 3–4
- ⏳ G-4 ML 모델 v1 데이터 수집 (한국 거래 53건 + KAMCO 공매 1K)
- ⏳ G-3 SOC 2 Type I 감사 업체 RFP (3 사 비교)
- ⏳ G-6 테스트 자동화 (Vitest + Playwright) 환경 구축

### Week 5–8 (Stage 1 본격)
- ⏳ G-1 통화 dropdown UI + 환율 storage + 모든 가격 dual-display
- ⏳ G-2 영문 NDA / LOI 템플릿 + 자동 선택 로직
- ⏳ G-4 LightGBM 학습 + 백테스팅 + 회수율 confidence interval

---

## 9. 글로벌 리더로 가는 핵심 메시지 (Pyramid 정리)

> **NPLatform 은 한국 NPL 거래를 디지털화한 것이 강점입니다.**
> **세계 1위가 되려면 데이터 · 신뢰 · 네트워크 — 3 가지를 동시에 글로벌 수준으로 끌어올려야 합니다.**
> **18 개월 · USD 5.6M · 24 FTE 로 가능합니다.**

3 가지 차별화 포인트:
1. **AI Excellence** — 회수율 예측 정확도 90%+ (글로벌 1위 가능 영역)
2. **End-to-End Digital** — NDA → 정산까지 사용자 이탈 없이 완결
3. **Cross-jurisdictional Trust** — SOC 2 + ISO 27001 + 다국적 NDA 자동화

---

## 10. 참고 자료

- BIS Quarterly Review (Q4 2025): "Global NPL Stocks and Sales"
- McKinsey "How banks can play offense in the next NPL cycle" (2024)
- Debitos Annual Report 2024: Transaction volumes
- KAMCO Annual Report 2024: Korea NPL market structure
- ECB Banking Supervision: NPL Guidance
- 본 NPLatform 자체 데이터 (2026-04 기준 53 매물)

---

**End of Document.**
**다음 단계**: 본 문서 검토 → 우선순위 ★ 4 개 (G-1 / G-2 / G-3 / G-4) Phase 1 개발 착수.
