# SPEC 10: 구현 순서 + 검증 계획

## 개요

5개 스프린트로 구현. 각 스프린트 끝에 검증 수행.
총 18개 파일 (7개 수정 + 11개 신규).

---

## Sprint 1: 기반 (DB + 분석엔진 + DB함수)

### 작업 순서

| # | 작업 | 파일/도구 | 의존성 |
|---|------|----------|--------|
| 1.1 | 마이그레이션: ont_lecture_analysis | Supabase MCP `apply_migration` | 없음 |
| 1.2 | 마이그레이션: ont_concept_importance | Supabase MCP `apply_migration` | 없음 |
| 1.3 | 마이그레이션: ont_lecture_capsule | Supabase MCP `apply_migration` | 없음 |
| 1.4 | 마이그레이션: ont_youtube 컬럼 추가 | Supabase MCP `apply_migration` | 없음 |
| 1.5 | 마이그레이션: RLS 정책 (3 테이블) | Supabase MCP `apply_migration` | 1.1-1.3 |
| 1.6 | 분석엔진 확장 | `lib/transcript-analyzer.ts` | 없음 |
| 1.7 | DB함수 확장 (타입 + 10함수) | `lib/ontology-db.ts` | 1.1-1.5 |

### 검증 (Sprint 1)

```bash
# DB 확인
Supabase MCP: list_tables → 3개 신규 테이블 확인
Supabase MCP: execute_sql "SELECT column_name FROM information_schema.columns WHERE table_name='ont_youtube' AND column_name='lecture_type'"
Supabase MCP: execute_sql "INSERT INTO ont_concept_importance (concept_id, expert_count) VALUES (1, 0)" → RLS 확인
Supabase MCP: execute_sql "DELETE FROM ont_concept_importance WHERE concept_id = 1" → 정리

# 분석엔진 테스트 (Node.js로 직접 실행)
# 또는 Sprint 2에서 API 통해 통합 테스트
```

---

## Sprint 2: API 라우트

### 작업 순서

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 2.1 | upload 라우트 강화 | `app/api/ontology/youtube/upload/route.ts` | Sprint 1 전체 |
| 2.2 | importance 라우트 | `app/api/ontology/importance/route.ts` | 1.7 |
| 2.3 | importance recalculate | `app/api/ontology/importance/recalculate/route.ts` | 1.7 |
| 2.4 | capsules 라우트 | `app/api/ontology/capsules/route.ts` | 1.7 |
| 2.5 | capsules generate | `app/api/ontology/capsules/generate/route.ts` | 1.7 |
| 2.6 | dashboard 라우트 | `app/api/ontology/dashboard/route.ts` | 1.7 |
| 2.7 | graph 라우트 강화 | `app/api/ontology/graph/route.ts` | 1.7 |
| 2.8 | 기존 2영상 재분석 | curl 명령 | 2.1 |

### 검증 (Sprint 2)

```bash
# 서버 시작
cd /c/Users/82106/Desktop/부동산\ 뉴스\ 크롤링\ 서비스/0-news
npx next dev --port 3000 &

# 강화된 업로드 테스트
curl -s -X POST http://localhost:3000/api/ontology/youtube/upload \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트","channel_name":"테스트채널","transcript":"부동산 경매란 법원을 통해 채무자의 부동산을 강제로 매각하는 절차입니다. 2024타경12345 사건의 경우 서울중앙지방법원에서 감정가 5억원에 나온 아파트가..."}'

# 기대 결과: lecture_type, structure, case_references 포함

# 강조도 재계산
curl -s -X POST http://localhost:3000/api/ontology/importance/recalculate
# 기대: { "success": true, "updated": N }

# 강조도 조회
curl -s http://localhost:3000/api/ontology/importance
# 기대: { "importance": [...], "total": N }

# 캡슐 생성
curl -s -X POST http://localhost:3000/api/ontology/capsules/generate \
  -H "Content-Type: application/json" \
  -d '{"concept_id": 1}'
# 기대: { "success": true, "capsule": {...} }

# 대시보드
curl -s http://localhost:3000/api/ontology/dashboard
# 기대: domain_stats, level_stats, top_concepts 등

# 그래프 (importance 포함)
curl -s http://localhost:3000/api/ontology/graph | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('노드 importance_score 존재:', j.nodes[0]?.importance_score !== undefined)})"
```

---

## Sprint 3: 지식그래프 UI

### 작업 순서

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 3.1 | KnowledgeGraph 컴포넌트 | `components/curriculum/KnowledgeGraph.tsx` | 2.7 |
| 3.2 | ConceptDetailPanel | `components/curriculum/ConceptDetailPanel.tsx` | 없음 |
| 3.3 | 그래프 페이지 | `app/curriculum/graph/page.tsx` | 3.1, 3.2 |

### 검증 (Sprint 3)

```
브라우저: http://localhost:3000/curriculum/graph

확인사항:
□ 131개 노드 렌더링
□ 5개 도메인 색상 구분
□ 엣지 유형별 스타일 차이
□ 마우스 호버 → 노드 하이라이트
□ 노드 클릭 → 사이드패널 열림
□ 드래그 → 노드 이동
□ 마우스 휠 → 줌 인/아웃
□ 배경 드래그 → 팬
□ 도메인 필터 체크박스 동작
□ 레벨 필터 셀렉트 동작
□ 시뮬레이션 5초 내 수렴
□ 전문가 뱃지 표시 (expert_count > 0)
```

---

## Sprint 4: 대시보드 + 캡슐

### 작업 순서

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 4.1 | 대시보드 페이지 | `app/curriculum/dashboard/page.tsx` | 2.6 |
| 4.2 | 캡슐 상세 페이지 | `app/curriculum/capsule/[conceptId]/page.tsx` | 2.4, 2.5 |

### 검증 (Sprint 4)

```
브라우저: http://localhost:3000/curriculum/dashboard
□ 5개 통계 카드
□ 레이더 차트 (5 도메인)
□ 바 차트 (5 레벨)
□ 파이 차트 (강의 유형)
□ 합의도 테이블
□ 커버리지 매트릭스
□ 구조 템플릿 바

브라우저: http://localhost:3000/curriculum/capsule/1
□ 캡슐 자동 생성 (또는 DB에서 로드)
□ 실라버스 테이블
□ 교수법 가이드라인
□ 전문가 출처 바
□ 선수 개념 링크
```

---

## Sprint 5: 로드맵 개편 + 마무리

### 작업 순서

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 5.1 | 로드맵 페이지 개편 | `app/curriculum/page.tsx` | 2.2, 2.4 |
| 5.2 | 업로드 UI 강화 | `app/curriculum/upload/page.tsx` | 2.1 |
| 5.3 | 네비게이션 업데이트 | `app/curriculum/layout.tsx` | 3.3, 4.1 |
| 5.4 | E2E 전체 검증 | 브라우저 + curl | 전체 |

### 검증 (Sprint 5)

```
브라우저: http://localhost:3000/curriculum
□ 5단계 타임라인 렌더링
□ 레벨 클릭 → 개념 필터
□ 강조도 뱃지 표시
□ "캡슐 보기" 링크 동작

브라우저: http://localhost:3000/curriculum/upload
□ 대본 업로드 → 강의 유형 뱃지
□ 구조 타임라인 바
□ 사례 참조 패널

네비게이션:
□ 홈 → 뉴스 → 로드맵 → 대본분석 → 지식그래프 → 대시보드
□ 모든 링크 정상 동작
```

---

## E2E 전체 검증 시나리오

### 시나리오 1: 대본 업로드 → 분석 → 그래프 확인

```
1. /curriculum/upload 접속
2. 경매 관련 대본 입력 (사건번호 포함)
3. 업로드 → 분석 결과 확인
   - 강의 유형 뱃지
   - 구조 타임라인
   - 사례 참조
   - 개념 매핑
4. /curriculum/graph 이동
   - 새로 매핑된 개념 노드의 expert_count 증가 확인
   - 노드 크기 변화 확인
5. /curriculum/dashboard 이동
   - 통계 업데이트 확인 (영상수, 매핑수, 커버리지)
```

### 시나리오 2: 캡슐 생성 → 확인

```
1. /curriculum 접속
2. 중급 레벨 선택
3. 개념 카드의 "캡슐 보기" 클릭
4. /curriculum/capsule/[id]에서 자동 생성된 캡슐 확인
   - 실라버스
   - 교수법 가이드라인
   - 전문가 출처
5. 선수 개념 클릭 → 해당 캡슐 페이지로 이동
```

### 시나리오 3: 그래프 인터랙션

```
1. /curriculum/graph 접속
2. 도메인 "경매" 만 필터
3. 노드 호버 → 하이라이트 확인
4. 노드 클릭 → 사이드패널 확인
5. 사이드패널에서 "캡슐 보기" 클릭
6. 줌/팬으로 그래프 탐색
```

---

## 파일 생성/수정 최종 순서

```
Sprint 1:
  [Supabase MCP] 마이그레이션 × 5
  [EDIT] lib/transcript-analyzer.ts
  [EDIT] lib/ontology-db.ts

Sprint 2:
  [EDIT] app/api/ontology/youtube/upload/route.ts
  [NEW]  app/api/ontology/importance/route.ts
  [NEW]  app/api/ontology/importance/recalculate/route.ts
  [NEW]  app/api/ontology/capsules/route.ts
  [NEW]  app/api/ontology/capsules/generate/route.ts
  [NEW]  app/api/ontology/dashboard/route.ts
  [EDIT] app/api/ontology/graph/route.ts

Sprint 3:
  [NEW]  components/curriculum/KnowledgeGraph.tsx
  [NEW]  components/curriculum/ConceptDetailPanel.tsx
  [NEW]  app/curriculum/graph/page.tsx

Sprint 4:
  [NEW]  app/curriculum/dashboard/page.tsx
  [NEW]  app/curriculum/capsule/[conceptId]/page.tsx

Sprint 5:
  [EDIT] app/curriculum/page.tsx (REWRITE)
  [EDIT] app/curriculum/upload/page.tsx
  [EDIT] app/curriculum/layout.tsx
```
