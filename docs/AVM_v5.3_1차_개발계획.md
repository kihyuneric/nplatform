# AVM v5.3 1차 개발계획

> 대상: `realestate_institutional_avm_v5_3` (통합 부동산 AVM 백엔드) + NPLatform 검증 콘솔
> 작성일: 2026-06-11 | 기준 문서: AVM_v5.3 개발자매뉴얼
> **1차 원칙: 화면은 "개발이 제대로 되었는지, 데이터가 제대로 나오는지"를 확인하는 검증 도구다.
> 디자인·UX 다듬기는 2차 이후. 1차 화면은 응답 필드를 빠짐없이, 가공 없이 보여주는 것이 목표.**

---

## 0. 1차 목표 (Definition of Done)

| # | 목표 | 완료 판정 | 상태 (2026-06-11) |
|---|------|----------|------------------|
| G1 | AVM gateway가 로컬에서 기동되고 합성데이터 파이프라인이 끝까지 돈다 | demo 생성→적재→학습→운영검증 스크립트 전부 성공, pytest 전체 green | ✅ 9스코프 학습, pytest 34 passed |
| G2 | 기관용 평가 API가 샘플 요청에 대해 **모든 핵심 필드**를 정상 반환한다 | 아래 §3 필드 체크리스트 100% 통과 | ✅ smoke_v1.py 31/31 PASS |
| G3 | 검증 콘솔 화면에서 평가 실행→결과 필드 확인→근거(explain/comparables) 추적이 가능하다 | 3개 화면에서 raw 데이터 확인 가능 | ✅ /admin/avm 3화면 브라우저 검증 완료 |
| G4 | NPLatform에서 AVM을 호출하는 연동 경로가 확정된다 | `/api/v1/avm/*` 프록시 동작 | ✅ 프록시 동작 (NPL분석 PoC 연결은 잔여) |

> 비고: 소스는 `C:\Users\82106\Desktop\avm` (git repo)에 정착.
> Windows 호환 수정 — 스코프 키 `:`를 파일명에서 `__`로 치환 (`safe_key`).
> 서버 기동: `cd avm/gateway && ..\.venv\Scripts\python -m uvicorn app.main:app --port 8000`

1차 범위 **제외**: land_avm/building_avm 풀스택(PostGIS·Redis) 연동, 실데이터(실거래·감정가) 적재, 디자인 완성도, 포트폴리오/드리프트 모니터링 화면 → 2차.

---

## 1. Step 1 — 백엔드 정착 및 기동 (백엔드, 1~2일)

소스를 정식 위치에 두고 gateway 단독으로 띄운다. 합성데이터 모드에서는 gateway만으로 멀티태스크 평가·기관용 API가 모두 동작하므로 docker compose 풀스택은 불필요.

### 작업
1. 소스 정착: `realestate_institutional_avm_v5_3` → 작업 폴더 확정(예: `C:\Users\82106\Desktop\avm` 별도 repo, git init + 첫 커밋)
2. Python 가상환경 + `gateway/requirements.txt` 설치 (fastapi, scikit-learn, pandas, joblib)
3. `uvicorn app.main:app --port 8000` 기동 → Swagger `/docs` 확인
4. 합성 파이프라인 실행:
   ```
   python scripts/generate_v5_3_demo_data.py --version 2026Q2
   python scripts/run_institutional_validation.py --version 2026Q2 --types R01,C02
   ```
5. 테스트: `pytest tests/` + `python tests/test_v5_3_institutional_ops.py`

### 검증 기준 (데이터가 제대로 나오는지)
- [ ] `models/multitask_avm/`에 스코프별 모델 아티팩트(joblib) + 메타데이터 생성 — **메타데이터에 잔차 분위수(q05~q95) 존재 확인** (없으면 conformal이 근사 후퇴함)
- [ ] `reports/champion_challenger_*.json`, `reports/guardrail_profiles/*.json` 생성
- [ ] `data/institutional/` SQLite DB 생성 (감사 이벤트 저장 확인)
- [ ] pytest 전체 통과 (v3~v5.3 테스트 16개 파일)

---

## 2. Step 2 — API 스모크 & 골든 테스트 (백엔드, 2~3일)

`gateway/samples/*.json`을 골든 입력으로 삼아 핵심 API를 전수 호출하고, 응답을 스냅샷으로 저장해 회귀 기준을 만든다.

### 호출 대상 (1차 필수)
| 순서 | API | 샘플 | 확인 포인트 |
|------|-----|------|------------|
| 1 | `POST /api/valuation/v1/value` | `v5_institutional_request.json` | §3 필드 체크리스트 전체 |
| 2 | `GET /api/valuation/v1/explain/{id}` | 1의 valuationId | 모델 버전·가중치·감사 이벤트 |
| 3 | `GET /api/valuation/v1/comparables/{id}` | 〃 | 채택/제외 사례 + 제외 사유 |
| 4 | `GET /api/valuation/v1/model-status` | — | 등록 모델·Kill Switch 상태 |
| 5 | `POST /api/valuation/v1/backtests` | `v5_1_backtest_request.json` | MdAPE·세그먼트 편향 리포트 |
| 6 | `POST /api/v4.5/models/backtest-leaderboard` | — | 스코프·과제별 리더보드 |
| 7 | `POST /api/valuation/v1/kill-switch` on→off | — | on 시 value가 503, off 시 복귀 |
| 8 | `POST /api/valuation/v1/reviews` → `decision` | MANUAL_REVIEW 건 | 리뷰 개설→승인 흐름 |

### 산출물
- `scripts/smoke_v1.py` (또는 .http 모음): 위 8개 시나리오 자동 실행 + 응답 스냅샷 저장
- 실패 시나리오 테스트: 모델 없는 유형 요청(MODEL_NOT_FOUND), 필수 필드 누락(422), 가드레일 FATAL 유도 입력

---

## 3. 평가 응답 필드 체크리스트 (G2 합격 기준)

`POST /api/valuation/v1/value` 응답에서 아래가 **전부 비어있지 않고 논리적으로 정합**해야 1차 합격.

| 필드 | 정합성 기준 |
|------|------------|
| `status` | AUTO_APPROVED_CANDIDATE 또는 MANUAL_REVIEW_REQUIRED만 |
| `marketValue.estimatedValueKrw` | > 0, 방법별 weights 합 ≈ 1.0 |
| `conformalInterval` | low < estimated < high, method가 `SPLIT_CONFORMAL_RATIO` (NORMAL_APPROX면 재학습 안 된 것) |
| `confidenceGrade` | A~E, FSD 수치와 등급 밴드 일치 (A≤9%, B≤14%, C≤21%, D≤30%), degradeReasons 사유 표기 |
| `usageDecision` | 요청 purpose 기준 AUTO_ACCEPT/REVIEW_REQUIRED/NOT_USABLE |
| `guardrail` | PASS/WARN/FATAL + 위반 플래그. FATAL이면 등급 E·stopReasons에 GUARDRAIL_FATAL_STOP |
| `purposeValues` | MARKET·CONSERVATIVE·COLLATERAL·LIQUIDATION·INVESTMENT 5종, 헤어컷 순서 MARKET ≥ COLLATERAL ≥ LIQUIDATION |
| `dataQuality` | 0~100 점수+등급, 낮으면 status가 리뷰로 전환되는지 |
| `taskPredictions` | 과제별(실거래·감정가·낙찰가·임대료 분위수) 원시 예측 + 사용된 모델 스코프 |
| `resultHash` / `valuationId` | SHA-256 존재, explain 재조회 시 동일 해시 재현 |

교차 검증 2건:
- [ ] 같은 입력 2회 호출 → 같은 모델 버전이면 estimatedValueKrw 동일 (재현성)
- [ ] 담보 실무 규칙: usageDecision=AUTO_ACCEPT && guardrail=PASS 조합에서만 자동 처리 플래그

---

## 4. Step 3 — 검증 콘솔 화면 (프론트, 4~5일)

NPLatform admin 내부에 구축: `(main)/admin/avm/*`. 기존 3-tier 네비·DS를 따르되 **꾸미지 않는다** — 모든 화면에 "Raw JSON 토글"을 두고 가공 전 응답을 그대로 볼 수 있어야 한다. Next.js API 라우트 `/api/v1/avm/[...path]`가 FastAPI(`localhost:8000`)로 프록시.

### 화면 1: 평가 실행 — `/admin/avm/value`
- 좌: 요청 폼 (주소·유형코드·목적·핵심 필드) + **샘플 프리셋 드롭다운** (samples/*.json 그대로 로드)
- 우: 응답 패널 — §3 체크리스트 순서대로 필드별 카드 표시. 각 카드에 합격/불합격 자동 판정 배지(예: weights 합≠1.0이면 빨강)
- 하단: Raw JSON 전문 + 복사 버튼
- 핵심: **응답에 없는 필드는 "MISSING"으로 빨갛게 표시** (조용히 숨기지 않음)

### 화면 2: 평가 추적 — `/admin/avm/trace/[valuationId]`
- explain + comparables 통합 뷰: 모델 버전·스코프·가중치, 채택/제외 사례와 제외 사유, 감사 이벤트 타임라인, resultHash
- 리뷰 개설/결정 버튼 (MANUAL_REVIEW_REQUIRED 건 처리 흐름 검증용)

### 화면 3: 모델·백테스트 상태 — `/admin/avm/models`
- model-status (Kill Switch 토글 포함), 스코프별 학습 모델 목록, 리더보드 테이블, 백테스트 리포트 목록·조회 (markdown 렌더)

### 화면별 DoD
- [ ] 샘플 프리셋 8종(아파트·구분상가·근린빌딩·토지 등) 각각 평가 실행 → 필드 카드 전부 초록
- [ ] 가드레일 FATAL 유도 입력 → 화면에서 E등급·NOT_USABLE·stopReasons가 그대로 보임
- [ ] Kill Switch on → 화면 1에서 503 에러가 명시적으로 표시 (mock fallback 금지 — **검증 콘솔에서는 NPLatform의 mock fallback 패턴을 쓰지 않는다. 실패는 실패로 보여야 함**)

---

## 5. Step 4 — NPLatform 연동 경로 확정 (1~2일)

- `/api/v1/avm/[...path]/route.ts`: FastAPI 프록시 (env: `AVM_GATEWAY_URL`, `AVM_INTERNAL_API_KEY`)
- 에러 응답을 NPLatform 표준 `{ error: { code, message } }`로 변환하되, 검증 콘솔에서는 원본 에러도 함께 노출
- NPL 분석(`npl-analysis`)에서 담보가치 평가로 AVM을 호출하는 지점 1곳 PoC 연결 (purpose=COLLATERAL, usageDecision/guardrail 조건부 자동 처리 규칙 적용) — 본격 통합은 2차

---

## 6. 일정 요약 (영업일 기준 ~2주)

| 주차 | Step | 산출물 |
|------|------|--------|
| 1주 전반 | Step 1 백엔드 기동·파이프라인 | 기동 환경, pytest green, 모델 아티팩트 |
| 1주 후반 | Step 2 API 골든 테스트 | smoke 스크립트, 응답 스냅샷, 필드 체크리스트 통과 |
| 2주 전반 | Step 3 검증 콘솔 3화면 | /admin/avm/value·trace·models |
| 2주 후반 | Step 4 연동 + 종합 검증 | 프록시, PoC 연결, 1차 검수 리포트 |

## 7. 리스크 & 선결 확인

| 리스크 | 대응 |
|--------|------|
| Windows에서 scikit-learn/joblib 설치 이슈 | Python 3.11 고정, 실패 시 Docker(gateway 단독)로 전환 |
| 합성데이터라 등급·MdAPE가 비현실적 | 1차는 **파이프라인·필드 정합성**만 판정. 수치 품질 판정은 실데이터 적재(2차) 이후 |
| land_value_krw 입력 의존(토지 AVM 미기동) | 1차는 요청에 land_value 직접 입력. land_avm_v7 연동은 2차 |
| 기존 v4_7 버전과 혼동 | v5_3만 사용, avm_v4_7 폴더는 아카이브 표기 |

## 8. 2차 예고 (참고)

실데이터 적재(분기 운영 사이클 §5.2), land/building AVM 풀스택, 포트폴리오 일괄평가·드리프트·실현오차 모니터링 화면, NPL 분석·딜룸 본격 통합, 등급 기준 사후검증.
