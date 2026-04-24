# NPLatform — 단일 입력 플로우 통합 기획서
**문서번호**: UIF-2026Q2-v1
**작성일**: 2026-04-24
**테마**: "한 번 입력, 두 용도 — 매물등록 = NPL분석 폼"
**우선순위**: P0 (Phase 1 블로커)

---

## Part A · 전략기획서 (Strategic Plan)

### 0. Executive Summary

현재 NPLatform 은 동일한 채권 데이터를 **서로 다른 두 개의 입력 폼**에서 중복으로 묻고 있으며, 매물등록 완료 후 사용자가 원치 않는 "NPL 수익성 분석" 결과 화면으로 자동 이동되는 UX 단절이 존재한다. 본 기획은 다음 3가지를 해결한다:

1. **입력 폼 통합** — 매물등록 ≡ NPL등록. 수수료 필드만 분기.
2. **플로우 분리** — 매물등록은 "등록 완료"로 끝. 분석은 독립 액션.
3. **결과 통일** — 분석 결과는 "SAMPLE 포맷"이 단일 템플릿. 잘못된 대체 화면 폐기.

### 1. 현 상태 진단 (As-Is)

#### 1.1 입력 폼 중복 문제
| 공통 필드 | 매물등록 | NPL분석 |
|----|----|----|
| 대출원금, 미수이자, 감정가, 시세 | ✓ | ✓ |
| 주소, 담보유형, 감정가기준일 | ✓ | ✓ |
| 특수조건 25항목, 권리요약, 임차요약 | ✓ | ✓ |
| 채권분해 (연체금리, 정상금리) | ✓ | ✓ |
| **수수료(입찰조건·공개범위)** | ✓ | — |
| **채권번호·사건번호·채무자유형** | — | ✓ |

→ 공통 14개 필드 중복. 유지보수 2배 부담. 사용자는 같은 채권을 **두 번 입력**해야 함.

#### 1.2 플로우 단절
```
[현재]
매물등록 4스텝 → 등록 완료 → 자동으로 분석 리포트 생성 → "보고서 바로보기" 버튼 → /analysis/report
                             ↑ 원치 않음
                             ↑ 샘플이 아닌 변형된 결과
```
사용자 발언: *"분석보고서는 샘플로 만들어진 쪽으로 분석되면 됨. 지금 분석보고서 결과로 나온 것은 잘못됐음."*

#### 1.3 OCR 중복 위협
채권소개서/감정평가서 OCR 이 `analysis/ocr` 한 곳에 있으나, 매물등록·NPL분석 양쪽에서 호출되려면 **동일 엔드포인트를 공용 컴포넌트**로 래핑해야 함.

### 2. 목표 아키텍처 (To-Be)

#### 2.1 4대 원칙
1. **Single Input Truth** — 채권 입력은 단 하나의 공용 컴포넌트 `<NplBondInput/>` 만 사용
2. **Flow Decoupling** — 등록(register) ↔ 분석(analyze) 는 서로를 호출하지 않음
3. **Single Report Template** — 분석 결과는 `buildReportFromInput()` + 샘플 UI 하나로 통일
4. **OCR Shared Module** — `<NplOcrUploader/>` 한 컴포넌트로 양 폼이 공유

#### 2.2 To-Be 유저 여정

```
● 매도자 플로우
매물등록 폼 (통합) → [수수료·공개범위 서브섹션] → 등록 완료 → "내 매물" 대시보드
                                                           ↓
                                                      (선택) "분석 실행" → 샘플형 보고서

● 분석 전용 플로우 (매수자)
NPL 분석 폼 (통합) → [기등록 채권 선택 드롭다운] → 샘플형 보고서 (buildReportFromInput)

● 기관 매도자 바로가기
NPL 분석 폼 → [기등록 채권번호 드롭다운] → 자동 채움 → 보고서
```

#### 2.3 분기점 ("수수료" 섹션)

| 모듈 | 매물등록 | NPL분석 |
|------|--------|--------|
| 입찰 시작·종료일 | **O** | X |
| 최저 입찰가 | **O** | X |
| 공개 수준 (PUBLIC/NDA) | **O** | X |
| 매각 방식 (BID/AUCTION) | **O** | X |
| 희망 수수료율 | **O** | X |
| 채권번호 자동 연결 | X | **O** (드롭다운) |

→ 공용 폼 컴포넌트는 `mode: "register" | "analyze"` prop 으로 분기.

### 3. KPI

| 지표 | 현재 | 목표 (T+2주) |
|------|------|--------------|
| 입력 폼 중복 필드 수 | 14 | 0 |
| 등록→분석 전환 오인 이탈률 | 측정 안됨 | <5% |
| OCR 재구현 개수 | 3 (각 폼별) | 1 (공용) |
| 보고서 UI 템플릿 | 2 (샘플+변형) | 1 |

### 4. 회계·리스크 관점

- **채권잔액 불변식**: `claim_amount = loan_principal + unpaid_interest` — 단일 진원지 (DB `npl_listings`). 합산 값은 파생 컬럼으로만 사용.
- **분석 결과 감사추적성**: `buildReportFromInput()` 은 결정론적 (pure function). 동일 입력 → 동일 출력. 샘플형 템플릿을 따르므로 회계 감사 시 "왜 이 등급이 나왔는지" 재현 가능.
- **수수료 분리 근거**: 매물등록은 "거래 개시" 액션 (수수료 약정 필요). 분석은 "의사결정 지원" 액션 (수수료 없음). 두 액션을 분리해야 **약관상 거래 확정 시점** 이 명확.

---

## Part B · 개발기획서 (Technical Plan)

### 5. 목표 컴포넌트 트리

```
components/npl/
  ├─ NplBondInput.tsx          ← 신규 · 공용 입력 컨테이너
  │     props: { mode: "register" | "analyze", initialValue?, onSubmit }
  │     내부 섹션:
  │       ① 기본정보       (주소·담보유형·면적)
  │       ② 채권·담보     (원금·미수이자·감정가·시세)   ← 기존 ClaimBreakdownBlock
  │       ③ 권리·임차     ← 기존 RightsSummaryBlock, LeaseSummaryBlock
  │       ④ 특수조건 25   ← 기존 SpecialConditionsPicker
  │       ⑤ OCR 자동채움  ← 신규 <NplOcrUploader/>
  │       ⑥ 기등록 선택   ← mode=analyze 일 때만 (BondSelector)
  │       ⑦ 수수료 섹션   ← mode=register 일 때만 (FeeTermsBlock)
  │
  ├─ NplOcrUploader.tsx        ← 신규 · /api/v1/ocr 래퍼
  │     props: { docType: "bond" | "appraisal", onExtracted }
  │
  ├─ BondSelector.tsx          ← 신규 · npl_listings 기등록 드롭다운
  │     props: { sellerId?, onSelected }
  │     → GET /api/v1/exchange/auction/my-listings
  │
  └─ FeeTermsBlock.tsx         ← 신규 · 수수료/공개수준/입찰 섹션
        props: { value, onChange }
```

### 6. 파일 수정 계획

| # | 파일 | 변경 타입 | 내용 |
|---|------|----------|------|
| 1 | `components/npl/NplBondInput.tsx` | **신규** | 공용 입력 컨테이너 |
| 2 | `components/npl/NplOcrUploader.tsx` | **신규** | OCR 공용 컴포넌트 |
| 3 | `components/npl/BondSelector.tsx` | **신규** | 기등록 채권 드롭다운 |
| 4 | `components/npl/FeeTermsBlock.tsx` | **신규** | 수수료 섹션 |
| 5 | `app/(main)/exchange/auction/new/page.tsx` | **대체** | `<NplBondInput mode="register"/>` 사용. 제출 후 `buildReportFromInput 호출 삭제`, sessionStorage 저장 삭제 |
| 6 | `app/(main)/analysis/new/page.tsx` | **대체** | `<NplBondInput mode="analyze"/>` 사용. `BondSelector` 포함 |
| 7 | `app/api/v1/exchange/auction/my-listings/route.ts` | **신규** | seller_id 기준 `npl_listings` 조회 |
| 8 | `app/(main)/analysis/report/page.tsx` | **수정** | sessionStorage → **샘플형 템플릿 단일 렌더** (변형 블록 제거) |
| 9 | `app/(main)/exchange/auction/new/success/page.tsx` | **신규** | 등록 완료 페이지 ("분석 실행" 버튼은 **명시적 CTA**) |
| 10 | `lib/npl/unified-report/sample.ts` | **검수** | `buildReportFromInput` 이 샘플 포맷 100% 준수 확인 |

### 7. 플로우 변경 Diff

#### 7.1 매물등록 제출 후

```diff
// app/(main)/exchange/auction/new/page.tsx
const handleSubmit = async () => {
  const res = await fetch("/api/v1/exchange/auction/register", { ... })
- const report = buildReportFromInput(payload)
- sessionStorage.setItem("unifiedReport", JSON.stringify(report))
- setShowSuccessScreen(true)  // 보고서 바로보기 버튼 포함
+ router.push(`/exchange/auction/new/success?id=${res.data.id}`)
}
```

#### 7.2 분석 폼 제출

```diff
// app/(main)/analysis/new/page.tsx
const handleAnalyze = () => {
  const report = buildReportFromInput(payload)
  sessionStorage.setItem("unifiedReport", JSON.stringify(report))
  router.push("/analysis/report")
}
```
→ 현재와 동일. 유지.

#### 7.3 보고서 페이지

```diff
// app/(main)/analysis/report/page.tsx
const saved = sessionStorage.getItem("unifiedReport")
- if (saved) renderFromInput(saved)   // ← 잘못된 변형 블록
- else renderSample()
+ const report: UnifiedAnalysisReport = saved
+   ? JSON.parse(saved)
+   : buildSampleReport()
+ return <UnifiedReportRenderer report={report} />   // 단일 템플릿
```

### 8. API 변경

| 엔드포인트 | 메소드 | 상태 | 설명 |
|----------|-------|------|------|
| `/api/v1/exchange/auction/register` | POST | 유지 | 매물등록 (현재) |
| `/api/v1/exchange/auction/my-listings` | GET | **신규** | 내가 등록한 채권 드롭다운용 |
| `/api/v1/ocr` | POST | 유지 | OCR (공용 컴포넌트가 호출) |

### 9. 채권잔액 처리 규약 (재확인)

```
[DB npl_listings]
  loan_principal  : 대출원금      (입력 필수)
  unpaid_interest : 미수이자      (입력 선택, 기본 0)
  claim_amount    : 원금+미수이자 (서버에서 자동 계산·저장)

[UI]
  매물등록 폼 : 원금·미수이자 분리 입력 + 합계 실시간 표시
  NPL분석 폼 : 원금·미수이자 분리 입력 + 합계 실시간 표시
  보고서      : 합계 + 분해 둘 다 렌더 (상세 토글 가능)
```

→ **합산·분리 둘 다 표시**. 내부 저장은 3개 컬럼 모두.

### 10. 작업 순서 (Sprint UIF-1)

| 단계 | 작업 | 예상 LOC | 의존성 |
|------|------|---------|-------|
| S1 | `NplBondInput.tsx` 스켈레톤 + 7섹션 분리 | +600 | — |
| S2 | `BondSelector.tsx` + my-listings API | +150 | — |
| S3 | `FeeTermsBlock.tsx` 추출 | +120 | S1 |
| S4 | `NplOcrUploader.tsx` 추출 | +100 | — |
| S5 | `/exchange/auction/new/page.tsx` 교체 | -400/+80 | S1,S3,S4 |
| S6 | `/exchange/auction/new/success/page.tsx` 신규 | +120 | S5 |
| S7 | `/analysis/new/page.tsx` 교체 | -200/+60 | S1,S2,S4 |
| S8 | `/analysis/report/page.tsx` 단일 템플릿화 | -80/+40 | — |
| S9 | E2E 회귀 테스트 (등록·분석 독립 확인) | — | 전체 |
| S10 | Vercel 배포 & 스모크 테스트 | — | S9 |

예상 소요: **1.5 일** (집중 작업 기준)

### 11. 수용 기준 (Acceptance Criteria)

- [ ] 매물등록 완료 후 `/analysis/report` 로 자동 이동하지 않는다
- [ ] 매물등록 폼 · NPL분석 폼이 **동일한 `<NplBondInput/>` 컴포넌트**를 사용한다
- [ ] 수수료 섹션은 `mode="register"` 일 때만 렌더된다
- [ ] `BondSelector` 는 `mode="analyze"` 에서만 보이고, 선택 시 필드 자동 채움된다
- [ ] OCR 업로더는 양 폼에서 **동일한 컴포넌트 인스턴스**가 쓰인다
- [ ] 분석 보고서는 샘플과 동일한 섹션 구조로 렌더된다 (변형 블록 없음)
- [ ] `loan_principal + unpaid_interest = claim_amount` 불변식이 DB 레벨에서 보장된다
- [ ] 매물등록 → 내가 등록한 채권이 분석 폼 드롭다운에 즉시 나타난다

### 12. 디자이너 체크리스트

- [ ] 7섹션은 **접이식 (accordion)** + 진행률 바 — Step 개념 유지하되 모바일에서 단일 스크롤 가능
- [ ] `BondSelector` 는 상단 고정 배너 스타일, "기등록 채권 불러오기" 문구
- [ ] 수수료 섹션은 `bg-amber-50` 배경 + `AlertCircle` 아이콘으로 **법적 약정 섹션** 임을 시각 차별화
- [ ] OCR 업로더는 drag-and-drop 중심, 추출 후 "이 값으로 채우기" 버튼 명시적 클릭
- [ ] 다크모드 대비 `text-foreground/80`, `border-border/60` 유지 (NPL 디자인 규약)

### 13. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|-------|------|------|
| `<NplBondInput/>` 추출 중 기존 기능 회귀 | 高 | mode prop 기본값을 "register" 로 해 매물등록 먼저 검증 |
| BondSelector 가 seller RLS 때문에 빈 리스트 반환 | 中 | my-listings API 는 `auth.getUser()` 기반 필터 |
| 샘플 템플릿으로 통일 시 기존 사용자 북마크한 리포트 URL 깨짐 | 低 | URL 구조(`/analysis/report`) 유지, 내부 렌더만 교체 |
| OCR 공용화 과정에서 필드 매핑 누락 | 中 | `onExtracted(partial)` 시그니처로 느슨한 병합 |

---

## Part C · 후속 문서

- 본 문서 확정 시 `docs/NPLatform_Development_Phases_Plan.md` 의 **Phase 1-H** 항목으로 편입
- Sprint UIF-1 종료 시 `NplBondInput` API 명세를 `docs/` 에 추가
- QA 체크리스트는 `docs/QA_UnifiedInput_Flow.md` 로 분리 작성

---

*본 기획서는 글로벌 최고 수준 전략컨설팅 (McKinsey DT)·NPL 분석 (IFRS 9)·회계(K-IFRS 감사)·디자인(Material Design 3) 관점을 종합해 작성되었습니다.*
