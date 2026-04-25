# Phase L · 잔여 핵심 이슈 해결 + 디자인 시스템 v2.5 전수 적용 계획 (v2)

**Status**: 🔴 진행 중
**작성일**: 2026-04-25 (v2 — v1 대체)
**SSoT 기준**: `docs/NPLatform_DesignSystem_v2_McKinsey.md` v2.5

---

## 0. 배경

v1 계획서에서 정의한 잔여 이슈에 더해, 사용자가 다음을 추가 지적:

1. 디자인 시스템 v2.5 (McKinsey editorial-grade) **전수 적용을 최우선**으로
2. 번역 잔여 케이스 — 메인 페이지 카드 제목·본문·라벨 등 한국어 그대로 노출
3. 다크 모드 카드 가독성 — `Fast transactions, transparent fees` 가 거의 안 보임
4. 이후 모든 개발은 새 디자인 시스템 SSoT 기반으로

→ **Phase L 의 우선순위 재배치**:
   기존 (i18n + 위자드 fix + 알림) → **신규 (디자인 시스템 전수 적용 + i18n 보강)**

---

## 1. 우선순위 재배치 (P0 → P3)

### 🔴 P0 · 즉시 (이번 커밋)
| 작업 | 영향도 | 비고 |
|---|---|---|
| **STATIC_DICT 메인 페이지 카드 30+ 추가** | 🔴 크리티컬 | 사용자 스크린샷 검출 텍스트 모두 |
| **다크모드 카드 제목 가독성 fix** | 🔴 크리티컬 | opacity 0.5 이하 금지 (DesignSystem v2.5 §1.4) |
| **NPLatform_DesignSystem_v2_McKinsey.md SSoT 문서 생성** | 🔴 | 이번 커밋에서 작성 |

### 🟠 P1 · 1주 내 (Tier S 페이지 디자인 시스템 적용)
| # | 페이지 | 적용 항목 |
|---|---|---|
| 1 | `/` 메인 | 토큰 100% · 한국어 텍스트 STATIC_DICT 등록 (40+) · 카드 hover · 모션 절제 |
| 2 | `/exchange` 거래소 | 동일 + 필터 칩 토큰화 |
| 3 | `/login` `/signup` | Form Field 모두 NplInput · 다크 모드 검증 |
| 4 | `/exchange/sell` 매물등록 | 위자드 step scroll-to-top + STATIC_DICT |
| 5 | `/exchange/auction/new` 자발적 경매 | 동일 + BidTermsSection 토큰 |

### 🟡 P2 · 2주 내 (Tier A 페이지)
6. `/analysis/new` · `/analysis/report` 분석 위자드/리포트 (FormField 마이그레이션)
7. `/exchange/demands/new` 매수자 등록
8. `/my/seller` 매도자 대시보드
9. `/admin` · `/admin/listings` · `/admin/demands` 관리자 화면

### 🟢 P3 · 3주 내 (Tier B + C)
10. `/exchange/[id]` 매물 상세 · `/deals` 딜룸
11. `/services/community` · `/news`
12. 나머지 admin 서브페이지

---

## 2. i18n 자동 번역 — 잔여 케이스 정밀 처리

### 2.1 사용자 스크린샷에서 검출된 미번역 텍스트

**카드 제목 (5종)** — STATIC_DICT 누락
```
NPL 매물 거래소
딜룸 · NDA · 전자계약
에스크로 · PII 마스킹
AI 딜 분석 리포트
AI Copilot — 거래 어시스턴트
```

**카드 본문 작은 라벨 (8종)** — STATIC_DICT 누락
```
매물 공개 → 낙찰 평균 7일
에스크로 · 전자계약 기본 제공
중간 유통 없는 1차 공급 가격
기관 KYC · 자격 검증 완료
실시간 경쟁 입찰 / 프라이빗 협상
금감원·신용정보법 가이드 준수
자동 PII 마스킹 파이프라인
NDA 전자서명 + 감사로그 영구 보관
```

**카드 본문 긴 문장 (3카드)** — STATIC_DICT 또는 클라이언트 직접 번역 필요
```
1. "은행·저축은행·캐피탈 47개사가 직접 매각. 중간 유통 없이 1차 공급자 가격으로 매입하고, 매도자는 LLR(Loan Loss Reserve) 회수를 극대화합니다."
2. "담보 부동산은 공개, 채무자 개인정보는 가린다. 본인인증(L1) → NDA(L2) → LOI(L3) 단계별로만 권리관계·채권서류에 접근합니다."
3. "국내 주요 은행, 저축은행, 캐피탈사와 파트너십을 맺고 있습니다."
```

### 2.2 i18n 처리 정책 (DesignSystem v2.5 §6.2)

1. **모든 UI 텍스트는 STATIC_DICT 등록 의무**
2. PR 머지 전 체크리스트:
   - 새 한글 추가 시 STATIC_DICT.en + STATIC_DICT.ja 동시 등록
   - 누락 시 CI 경고 (다음 스프린트 자동화)
3. 긴 본문은 클라이언트 직접 호출 (한국 IP 정상 응답)

### 2.3 다음 스프린트 자동화
```bash
# 빌드타임 자동 추출
node scripts/extract-i18n-keys.mjs
# → app/**/*.tsx 의 한글 텍스트 추출
# → STATIC_DICT 누락분 콘솔 경고
# → CI fail (가능)
```

---

## 3. 디자인 시스템 v2.5 전수 적용 — 페이지별 작업

### 3.1 P1 (Tier S) 작업 매트릭스

| 페이지 | 토큰 교체 | STATIC_DICT 등록 | NplModal 마이그 | FormField 마이그 | 다크 가독성 | 모션 절제 |
|---|---|---|---|---|---|---|
| `/` | 진행 중 | 🔴 30+ 추가 필요 | ✅ 완료 | N/A | 🔴 카드 제목 | ✅ |
| `/exchange` | 부분 | 🟡 10+ 추가 | 🟡 일부 dialog 잔여 | 🟡 검색 필터 | ✅ | ✅ |
| `/login` | ✅ | ✅ 충분 | N/A | 🟡 input → NplInput | ✅ | ✅ |
| `/signup` | 부분 | 🟡 인증·SMS 등 | N/A | 🟡 다단계 폼 | ✅ | ✅ |
| `/exchange/sell` | ✅ | 🟡 step 라벨 | ✅ NplModal 미리보기 | 🟡 일부 NumberInput | ✅ | ✅ |
| `/exchange/auction/new` | 부분 | 🔴 BidTermsSection 라벨 | 🟡 일부 dialog | 🟡 BidTerms input | ✅ | 🟡 |

### 3.2 작업 순서 (P1 1주 내)
- **Day 1-2**: STATIC_DICT 메인+거래소 100% 등록 → 즉시 모든 텍스트 번역
- **Day 3-4**: signup 폼 FormField 마이그레이션
- **Day 5**: sell/auction wizard 잔여 input → NplInput
- **Day 6**: 다크모드 가독성 전수 확인 + 모션 점검
- **Day 7**: PR · 머지 · 배포

---

## 4. 디자인 시스템 거버넌스

### 4.1 PR Review 체크리스트 (DesignSystem v2.5 §8 발췌)
| 항목 | 차단 조건 |
|---|---|
| 하드코딩 hex 색상 | `grep 'bg-\\[#'` 결과 1건 이상 → 차단 |
| 한국어 텍스트 STATIC_DICT 미등록 | CI 자동 경고 (다음 스프린트) |
| Modal 직접 사용 (Radix Dialog) | `@/components/ui/dialog` import 시 차단 |
| Custom Spinner | `<Skeleton>` 미사용 시 경고 |
| 240ms 초과 transition | 경고 |

### 4.2 변경 권한
- `lib/design-tokens.ts` 변경 → 디자이너 1인 + 엔지니어 1인 승인
- `globals.css` `:root` 토큰 추가 → 동일
- 신규 Component Primitive → Visual Regression CI 통과 필수

---

## 5. 즉시 적용 (이번 커밋)

✅ 이번 커밋에서 처리:
- [x] **DesignSystem v2.5 SSoT 문서 생성** (`docs/NPLatform_DesignSystem_v2_McKinsey.md`)
- [x] **Phase L 계획서 v2 재작성** (이 문서)
- [x] **STATIC_DICT 메인 페이지 카드 30+ 추가** (사용자 스크린샷 기반)
- [x] **다크모드 카드 가독성 fix** (opacity 0.5 이하 금지 정책)

---

## 6. 후속 (사용자 승인 후)

### 6.1 P1 (1주)
- [ ] Tier S 5페이지 (`/`·`/exchange`·`/login`·`/signup`·`/sell`) 디자인 시스템 100% 적용
- [ ] 각 페이지 STATIC_DICT 등록 누락분 보충
- [ ] 모든 위자드 step 이동 시 scroll-to-top

### 6.2 P2 (2주)
- [ ] Tier A 4페이지 디자인 시스템 적용
- [ ] 빌드타임 STATIC_DICT 자동 추출 도구 (`scripts/extract-i18n-keys.mjs`)
- [ ] PR Review 자동화 (ESLint 룰 + CI 경고)

### 6.3 P3 (3주)
- [ ] Tier B + C 페이지
- [ ] 시각적 회귀 테스트 (Chromatic) 도입
- [ ] 알림 시스템 (이전 Phase J 잔여)

---

## 7. 성공 지표 (Phase L 완료 기준)

| 지표 | 목표 | 측정 방법 |
|---|---|---|
| 하드코딩 hex 색상 | 0건 | `grep 'bg-\\[#'` |
| STATIC_DICT 커버리지 | 95% | `extract-i18n-keys.mjs` 자동 분석 |
| 다크모드 WCAG AA 통과율 | 100% | axe-core CI |
| 메인 페이지 EN/JP 100% 번역 | 95%+ | 수동 스크린샷 검증 |
| 모달 → BottomSheet 자동 전환 | 100% | Manual QA on 375px |

---

_v2 작성자 · NPLatform Engineering · 2026-04-25_
_본 문서는 v1 (단순 i18n fix 위주) 을 대체하며, DesignSystem v2.5 SSoT 와 함께 동작_
