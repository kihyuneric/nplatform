# XRF Vehicle Valuation v2 — Fee Structure & Subscription Model

**Effective**: 2026-05-04
**Replaces**: XRF Ripple Deck v4.0 (2026-05) Page 9~14 의 3-tier Fee System
**Owner**: 트랜스파머 (KR Platform Co · 엔플랫폼) + XRF Foundation

> 본 문서는 **리플(Ripple) IR 자료 및 LP 청약·시뮬레이션 엑셀** 동기 업데이트용 SSoT 입니다.
> 보고서 페이지 (`/analysis/report?listingId=...` → XRF Valuation 토글)·`lib/xrf/valuation.ts` 코드와 1:1 정합되어야 합니다.

---

## 1. 핵심 변경사항 요약

| 영역 | v1 (이전) | v2 (현재 · 2026-05-04) | Delta |
|------|----------|-----------------------|-------|
| **LP 청약 모델** | LP 90% + 대부업체 10% Capital | **LP 100% Pool 청약 + 10% 대부업체 차입금** | LP가 Pool 전체 모금 |
| **대부업체 자본 출자** | Pool의 10% (Capital, Fee 아님) | **LP→대부업체 무이자 대여 10%** | 출자 → 차입금 모델로 전환 |
| **대부업체 보상** | Servicing Fee 2.0%/yr + 자본금 1:1 환원 | **Servicing Fee 2.0%/yr (차입금에는 수수료/이자 無)** | Day Exit 시 차입금 1:1 환급 |
| **엔플랫폼 BASE Fee 합계** | 3.00%/yr | **2.50%/yr** | -0.50%/yr |
| **0.5% 절감분 귀속** | (해당 없음) | **LP 순수익으로 자동 흡수** | LP profit ↑ |

---

## 2. 엔플랫폼 (KR Platform Co) Fee 재구성

### 2.1 BASE / CONSERVATIVE 공통

NPL 매입가 (AUM) × 365일 cap 기준.

| 항목 | v1 | v2 | Delta | 근거 |
|------|----|----|------|------|
| AI Valuation (ML 가격평가) | 0.70%/yr | **0.30%/yr** | -0.40%p | 데이터 파이프라인 자동화 진척 (Voyage RAG · ML 모델 내재화) |
| Pipeline Sourcing (딜 발굴·소싱) | 1.00%/yr | **1.30%/yr** | +0.30%p | NPL 시장 deal flow 확보 비용 비중 증가 |
| PM Fee (프로젝트 매니지먼트) | 0.85%/yr | **0.50%/yr** | -0.35%p | 딜룸·표준 계약·자동화 워크플로우 정착 |
| KR Margin (TP 방어선 ≥15%) | 0.45%/yr | **0.40%/yr** | -0.05%p | 운영 효율 개선 |
| **합계** | **3.00%/yr** | **2.50%/yr** | **-0.50%/yr** | LP 매력도 강화 |

### 2.2 SAVE-THE-DEAL (deal 살리기 모드)

| 항목 | v2 BASE | v2 SAVE | Delta vs BASE |
|------|---------|---------|---------------|
| AI Valuation | 0.30%/yr | **0.20%/yr** | -0.10%p |
| Pipeline Sourcing | 1.30%/yr | **1.00%/yr** | -0.30%p |
| PM Fee | 0.50%/yr | **0.50%/yr** | (유지) |
| KR Margin | 0.40%/yr | **0.30%/yr** | -0.10%p |
| **합계** | **2.50%/yr** | **2.00%/yr** | **-0.50%p** |

---

## 3. 3-Tier Fee System (v2)

### 3.1 XRF Foundation 보수 — tier 별 변동 (v4 · 관리보수 flat)

> ⚠ **v4 변경 (2026-05-04 사용자 피드백)**: XRF 관리보수는 운영비 성격 → 모든 tier 0.5%/yr **고정**.
> Hierarchy 는 Setup + Carry + 엔플랫폼 컴포넌트로 형성됨.

| 항목 | BASE ★ | CONSERVATIVE | SAVE-THE-DEAL |
|------|--------|--------------|---------------|
| Carry (8% Hurdle 초과분) | **15%** | **10%** | **5%** |
| 관리보수 (%/yr) | **0.5%** | **0.5%** | **0.5%** (★ 모든 tier 고정 — 운영비) |
| Setup (1회) | **0.5%** | **0.4%** | **0.3%** |

### 3.2 엔플랫폼 보수 — tier 별 변동 (v3 · 2026-05-04 사용자 피드백 반영)

> ⚠ **v3 변경 사유**: v2 에서 CONS 엔플랫폼 = BASE (Carry 만 양보) 라 수수료가 동일했음.
> 사용자 피드백 "CONSERVATIVE 일때 수수료가 BASE 보다 높아 보이는 건 이상" → 모든 fee 컴포넌트가 명확한
> **BASE > CONS > SAVE** gradient 갖도록 재배치.

| 항목 | BASE ★ | CONSERVATIVE | SAVE-THE-DEAL |
|------|--------|--------------|---------------|
| AI Valuation | **0.30%/yr** | **0.25%/yr** | **0.20%/yr** |
| Pipeline Sourcing | **1.30%/yr** | **1.15%/yr** | **1.00%/yr** |
| PM | **0.50%/yr** | **0.45%/yr** | **0.40%/yr** |
| KR Margin (★ TP defense 모든 tier 고정) | **0.40%/yr** | **0.40%/yr** | **0.40%/yr** |
| **엔플랫폼 합계** | **2.50%/yr** | **2.25%/yr** | **2.00%/yr** |

### 3.3 대부업체 (KR Servicer)

| 항목 | 모든 tier 동일 |
|------|----------------|
| Servicing Fee | 2.0%/yr (시장 표준 라이선스 가치) |
| **차입금 비율 (v5)** | **Pool의 10% — LP 무이자 대여 (대부업법 license 명목)** |
| **차입금 환급** | **Day Exit 시 LP 로 100% 환급 (1:1)** |
| 차입금 수수료 | **無** (수수료가 아닌 자본 보관) |

### 3.4 LP Hurdle Rate

| 항목 | 모든 tier 동일 |
|------|----------------|
| Hurdle | 8%/yr × LP capital × 실 운용기간 (NOT capped) |

---

## 4. AUTO Tier 판정 로직 (불변)

```
if   BASE LP ROI ≥ 20%  → BASE          (양보 불필요 · 즉시 RWA 출시)
elif BASE LP ROI ≥ 10%  → CONSERVATIVE  (Carry 만 양보 15→10%)
elif BASE LP ROI ≥  5%  → SAVE-THE-DEAL (모두 양보 · XRF Carry 5% + 엔플랫폼 2.0%/yr)
else                    → REJECT        (RWA 부적합 · deal 재구조화 필요)
```

---

## 5. Pool 산정 공식 (v5)

```
operatingFees   = XRF관리 + XRF Setup + 엔플랫폼합계 + Servicing
hurdleEstimate  = NPL totalEquity × 8%/yr × 운용기간(년)

lpFundingTarget = NPL totalEquity + operatingFees + hurdleEstimate
poolUSD         = lpFundingTarget × (1 / 0.9)   // 10% buffer for 대부업체 차입금

LP capital      = poolUSD                        // ← LP 가 100% Pool 청약
LP 1인당        = LP capital / numLPs (default 100명)
대부업체 차입금  = poolUSD × 0.10                // ← Pool 의 10% LP 무이자 대여
                                                 //    수수료/매출 아님 · 보관용 자본
                                                 //    Day Exit 시 LP 로 100% 환급
```

**LP 회계 흐름** (Day 0 → Day Exit):
```
Day 0:
  LP 청약           = +$675k    (LP 입금)
  ├─ NPL deal 투입   = -$608k    (Pool의 90%)
  └─ 대부업체 대여   = -$67k     (Pool의 10%, 무이자)
  ─────────────────────────────────────
  순 LP balance     = $0 (전액 deployed)

Day Exit:
  법원 배당 회수     = +$608k + NPL net profit
  대부업체 환급      = +$67k    (1:1 무이자 환급)
  ─────────────────────────────────────
  LP 회수액         = $675k + NPL net profit
  LP ROI            = NPL net profit / $675k
```

---

## 6. LP 분배 흐름 (v2)

```
NPL Net Profit
  ─ XRF 관리보수
  ─ XRF Setup
  ─ 엔플랫폼 합계 (2.5%/yr · v2 신규)
  ─ Servicing 2%/yr
  ─ XRF Carry (Hurdle 초과분 × tier별 carry%)
  ────────────────────────────────────
  = LP 최종 순수익  (← 0.5% 절감분 자동 포함)
  ÷ LP capital
  = LP ROI
```

---

## 7. 수치 시뮬레이션 — Jongno 종로구 홍지동 8필지 NPL

가정:
- NPL 매입가 17.28억원 (USD $1,329,231 @ 1300)
- NPL totalEquity 6.57억원 ($505,385)
- NPL 예상 순수익 5.35억원 ($411,538)
- 운용기간 587일 (1.61년)
- LP 100명 분할

### v4 3-tier 비교 (Jongno · 수수료 hierarchy 검증)

| Tier | XRF 수수료 | 엔플랫폼 수수료 | LP ROI | 1인당 청약 |
|------|---------|--------------|--------|-----------|
| **BASE ★** | **$51k** | **$33k** (2.50%/yr) | 42.19% | $7,137 |
| **CONSERVATIVE** | **$37k** | **$30k** (2.25%/yr) | 44.84% | $7,085 |
| **SAVE-THE-DEAL** | **$24k** | **$27k** (2.00%/yr) | 47.59% | $7,034 |

> ✅ 수수료 hierarchy: **BASE > CONSERVATIVE > SAVE-THE-DEAL** (모든 fee 컴포넌트)
> ✅ XRF 관리보수 0.5% flat (운영비) — Hierarchy 는 XRF Setup·Carry + 엔플랫폼 4종이 형성
> ✅ Jongno BASE LP ROI 42.19% ≥ 20% → AUTO 판정 **BASE** (양보 불필요)

### v4 다른 case 검증

| Case | 차주 | XRF gradient | 엔플랫폼 gradient | AUTO |
|------|------|--------------|-------------------|------|
| Case 1 종로 토지 | 개인 75% | $51k → $37k → $24k ✓ | $33k → $30k → $27k ✓ | BASE |
| Case 2 잠실 오피스텔 | 개인 75% | $18k → $15k → $12k ✓ | $24k → $22k → $19k ✓ | SAVE |
| Case 3 강남 상가 (가상) | 법인 90% | $134k → $96k → $58k ✓ | $66k → $60k → $53k ✓ | BASE |

---

## 8. 영향 분석

### 8.1 LP 측 영향

- **장점**:
  - 1인당 수익 절대값 증가 ($2,924 → $2,993, +2.4%)
  - 엔플랫폼 fee 0.5%p 절감 효과를 LP가 흡수
  - 대부업체 자본 라인 제거 → cap table 단순화
- **단점**:
  - 1인당 청약액 증가 ($6,528 → $7,180, +10.0%)
  - LP ROI % 자체는 다소 감소 (분모↑) — 단, 절대 수익은 증가

### 8.2 엔플랫폼 측 영향

- **수익 감소**: 기존 3.0%/yr → 2.5%/yr → -0.5%p × purchase × duration
- **상쇄 요인**: deal flow 확대 시 Pipeline Sourcing 비중 증가 (1.0 → 1.3) 반영
- **장기 효과**: LP 매력도 강화 → AUM 확대 → 절대 수익 회복 기대

### 8.3 대부업체 측 영향

- Capital 출자 면제 → 자본 부담 0
- Servicing Fee 2.0%/yr 유지 → 라이선스 가치 변동 없음

### 8.4 XRF Foundation 측 영향

- Fee 구조 불변 (관리·Setup·Carry)
- LP 매력도 강화로 RWA 출시 확률 ↑

---

## 9. 코드 정합 체크리스트

- [x] `lib/xrf/valuation.ts` — `XRF_TIERS.BASE / CONSERVATIVE / SAVE-THE-DEAL` 업데이트
- [x] `lib/xrf/valuation.ts` — `daepuCapitalPct: 0`, LP capital = poolUSD
- [x] `lib/xrf/summary.ts` — AI 총평 v2 텍스트 (`[XRF Vehicle 평가 v2]` 프리픽스)
- [x] `app/(main)/analysis/report/components/xrf-valuation-section.tsx`:
  - EXHIBIT 2 POOL 구조 — 대부업체 자본금 row 제거 · LP 100% 청약 표기
  - EXHIBIT 3 Vehicle Fee — 엔플랫폼 v2 % 라벨
  - EXHIBIT 4 Cash Flow — 대부업체 자본 라인 제거
  - 모델 설명 — 대부업체 자본 출자 폐지 명시
- [x] `.claude/verify-xrf-v2.ts` — 검증 스크립트 통과

---

## 10. Ripple IR 자료 동기화 가이드

본 문서를 단일 출처로 다음 산출물 업데이트 필요:

1. **XRF Ripple Deck v4 → v5** (PPTX): Page 9~14 의 Fee Table·Subscription 도식
2. **LP 청약 시뮬레이션 Excel**:
   - Sheet "Fee Calculator" — 엔플랫폼 4종 % 셀 갱신
   - Sheet "LP Subscription" — Pool 100% 청약 모델 적용
   - Sheet "3-Tier Compare" — BASE/CONS/SAVE 새 수치 갱신
3. **One-Pager** (PDF): Tier 별 LP ROI 그래프 갱신
4. **Pitch Deck**: Vehicle Fee 슬라이드 의 4종 % 라벨

---

**작성**: NPLatform 개발팀
**검토 필요**: XRF Foundation Investment Committee · 트랜스파머 CFO
**최종 업데이트**: 2026-05-04
