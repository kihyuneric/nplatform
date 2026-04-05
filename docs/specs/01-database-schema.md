# SPEC 01: DB 스키마 확장

## 개요
기존 7개 `ont_*` 테이블에 3개 신규 테이블 + 기존 테이블 컬럼 추가.
Supabase MCP `apply_migration`으로 실행.

---

## 마이그레이션 1: `ont_lecture_analysis`

**목적:** 영상별 강의 분석 메타데이터 (유형, 구조, 사례 참조)

```sql
CREATE TABLE ont_lecture_analysis (
  analysis_id SERIAL PRIMARY KEY,
  youtube_id INTEGER NOT NULL REFERENCES ont_youtube(youtube_id) ON DELETE CASCADE,

  -- 강의 유형 분류
  lecture_type VARCHAR(20) NOT NULL DEFAULT 'mixed'
    CHECK (lecture_type IN ('informational','case_study','hooking','knowhow','mixed')),
  lecture_type_scores JSONB NOT NULL DEFAULT '{}',

  -- 구조 분석
  structure JSONB NOT NULL DEFAULT '[]',
  total_segments INTEGER NOT NULL DEFAULT 0,
  hooking_ratio FLOAT NOT NULL DEFAULT 0 CHECK (hooking_ratio >= 0 AND hooking_ratio <= 1),
  information_ratio FLOAT NOT NULL DEFAULT 0 CHECK (information_ratio >= 0 AND information_ratio <= 1),
  case_ratio FLOAT NOT NULL DEFAULT 0 CHECK (case_ratio >= 0 AND case_ratio <= 1),
  cta_ratio FLOAT NOT NULL DEFAULT 0 CHECK (cta_ratio >= 0 AND cta_ratio <= 1),

  -- 사례 참조
  case_references JSONB NOT NULL DEFAULT '[]',
  case_count INTEGER NOT NULL DEFAULT 0,

  -- 메타
  expert_name VARCHAR(100),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(youtube_id)
);

CREATE INDEX idx_lecture_analysis_type ON ont_lecture_analysis(lecture_type);
CREATE INDEX idx_lecture_analysis_youtube ON ont_lecture_analysis(youtube_id);
```

### 컬럼 상세

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| lecture_type | VARCHAR(20) | 지배적 유형 | `'informational'` |
| lecture_type_scores | JSONB | 4개 유형별 점수 (0-1, 합=1) | `{"informational":0.45,"case_study":0.30,"hooking":0.15,"knowhow":0.10}` |
| structure | JSONB[] | 구간별 세그먼트 배열 | 아래 참조 |
| total_segments | INTEGER | 분류된 세그먼트 수 | `5` |
| hooking_ratio | FLOAT | 후킹 구간 비율 | `0.08` |
| information_ratio | FLOAT | 정보 구간 비율 | `0.52` |
| case_ratio | FLOAT | 사례 구간 비율 | `0.25` |
| cta_ratio | FLOAT | CTA+요약 구간 비율 | `0.15` |
| case_references | JSONB[] | 탐지된 사례 번호 목록 | 아래 참조 |
| case_count | INTEGER | 탐지된 사례 수 | `3` |
| expert_name | VARCHAR(100) | 전문가(채널)명 | `'부동산읽어주는남자'` |

### JSONB 스키마: `structure`

```json
[
  {
    "segment_type": "hooking_intro",
    "start_pct": 0,
    "end_pct": 8,
    "char_start": 0,
    "char_end": 240,
    "text_preview": "여러분, 이 비밀을 알면 경매에서 절대 실패하지 않습니다",
    "confidence": 0.85
  },
  {
    "segment_type": "information_body",
    "start_pct": 8,
    "end_pct": 55,
    "char_start": 240,
    "char_end": 1650,
    "text_preview": "권리분석이란 등기부등본을 통해 부동산에 설정된...",
    "confidence": 0.92
  },
  {
    "segment_type": "case_example",
    "start_pct": 55,
    "end_pct": 80,
    "char_start": 1650,
    "char_end": 2400,
    "text_preview": "실제로 2024타경12345 사건을 보면...",
    "confidence": 0.88
  },
  {
    "segment_type": "call_to_action",
    "start_pct": 80,
    "end_pct": 90,
    "char_start": 2400,
    "char_end": 2700,
    "text_preview": "이 영상이 도움이 되셨다면 구독과 좋아요...",
    "confidence": 0.95
  },
  {
    "segment_type": "summary",
    "start_pct": 90,
    "end_pct": 100,
    "char_start": 2700,
    "char_end": 3000,
    "text_preview": "정리하면, 권리분석에서 가장 중요한 3가지는...",
    "confidence": 0.90
  }
]
```

**segment_type 허용값:**
- `hooking_intro` — 도입부 후킹 (질문, 자극적 진술, 약속)
- `information_body` — 정보/이론 본문
- `case_example` — 구체적 사례 설명
- `call_to_action` — 구독/좋아요/링크 등 행동 유도
- `summary` — 핵심 정리/요약
- `transition` — 전환 구간 (분류 불확실)

### JSONB 스키마: `case_references`

```json
[
  {
    "type": "auction",
    "number": "2024타경12345",
    "court": "서울중앙지방법원",
    "context": "...이 사건의 경우 감정가 대비 70%에 낙찰되었는데 유치권 신고가...",
    "char_position": 1523
  },
  {
    "type": "public_sale",
    "number": "2024-00123456",
    "court": null,
    "context": "...캠코 공매로 나온 이 물건은 토지만 별도 매각이라...",
    "char_position": 2891
  },
  {
    "type": "address",
    "number": "서울시 강남구 역삼동 123-45",
    "court": null,
    "context": "...이 아파트의 경우 재건축 추진 중이라...",
    "char_position": 3102
  }
]
```

**type 허용값:**
- `auction` — 경매 사건번호 (2024타경12345 등)
- `public_sale` — 공매 번호 (캠코, 온비드)
- `court` — 법원명 (서울중앙지방법원 등)
- `address` — 구체적 부동산 주소

---

## 마이그레이션 2: `ont_concept_importance`

**목적:** 개념별 전문가 강조도 — 크로스-비디오 집계

```sql
CREATE TABLE ont_concept_importance (
  id SERIAL PRIMARY KEY,
  concept_id INTEGER NOT NULL REFERENCES ont_concept(concept_id) ON DELETE CASCADE,

  -- 핵심 메트릭
  expert_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  total_relevance_sum FLOAT NOT NULL DEFAULT 0,
  avg_relevance FLOAT NOT NULL DEFAULT 0,
  max_relevance FLOAT NOT NULL DEFAULT 0,

  -- 전문가별 상세
  experts JSONB NOT NULL DEFAULT '[]',

  -- 순위 (재계산 시 갱신)
  rank_overall INTEGER,
  rank_in_domain INTEGER,

  -- 메타
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(concept_id)
);

CREATE INDEX idx_importance_expert_count ON ont_concept_importance(expert_count DESC);
CREATE INDEX idx_importance_avg_relevance ON ont_concept_importance(avg_relevance DESC);
CREATE INDEX idx_importance_concept ON ont_concept_importance(concept_id);
```

### 컬럼 상세

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| expert_count | INTEGER | 이 개념을 언급한 고유 전문가(채널) 수 | `3` |
| video_count | INTEGER | 이 개념이 매핑된 영상 수 | `5` |
| total_relevance_sum | FLOAT | 모든 영상의 relevance 합계 | `3.45` |
| avg_relevance | FLOAT | 평균 relevance | `0.69` |
| max_relevance | FLOAT | 최고 relevance | `0.92` |
| experts | JSONB[] | 전문가별 상세 정보 | 아래 참조 |
| rank_overall | INTEGER | 전체 순위 (1=최고 강조) | `3` |
| rank_in_domain | INTEGER | 도메인 내 순위 | `1` |

### JSONB 스키마: `experts`

```json
[
  {
    "channel_name": "부동산읽어주는남자",
    "youtube_id": 1,
    "video_title": "경매 권리분석 완벽 가이드",
    "relevance": 0.87,
    "matched_keywords": ["권리분석", "등기부등본", "말소기준권리"]
  },
  {
    "channel_name": "경매의신",
    "youtube_id": 3,
    "video_title": "입문자를 위한 경매 A to Z",
    "relevance": 0.65,
    "matched_keywords": ["권리분석", "등기부"]
  }
]
```

### 재계산 SQL

`recalculateAllImportance()` 함수에서 사용하는 집계 쿼리:

```sql
-- 1단계: 기존 데이터 삭제 후 재삽입 (UPSERT 사용)
INSERT INTO ont_concept_importance
  (concept_id, expert_count, video_count, total_relevance_sum, avg_relevance, max_relevance, experts, updated_at)
SELECT
  yc.concept_id,
  COUNT(DISTINCT y.channel_name)::INTEGER as expert_count,
  COUNT(DISTINCT yc.youtube_id)::INTEGER as video_count,
  ROUND(SUM(yc.relevance)::NUMERIC, 4)::FLOAT as total_relevance_sum,
  ROUND(AVG(yc.relevance)::NUMERIC, 4)::FLOAT as avg_relevance,
  ROUND(MAX(yc.relevance)::NUMERIC, 4)::FLOAT as max_relevance,
  jsonb_agg(
    jsonb_build_object(
      'channel_name', COALESCE(y.channel_name, '알 수 없음'),
      'youtube_id', yc.youtube_id,
      'video_title', y.title,
      'relevance', ROUND(yc.relevance::NUMERIC, 4)
    )
    ORDER BY yc.relevance DESC
  ) as experts,
  now() as updated_at
FROM ont_youtube_concept yc
JOIN ont_youtube y ON y.youtube_id = yc.youtube_id
GROUP BY yc.concept_id
ON CONFLICT (concept_id) DO UPDATE SET
  expert_count = EXCLUDED.expert_count,
  video_count = EXCLUDED.video_count,
  total_relevance_sum = EXCLUDED.total_relevance_sum,
  avg_relevance = EXCLUDED.avg_relevance,
  max_relevance = EXCLUDED.max_relevance,
  experts = EXCLUDED.experts,
  updated_at = EXCLUDED.updated_at;

-- 2단계: 전체 순위 갱신
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (ORDER BY expert_count DESC, avg_relevance DESC) as rank_all,
    ROW_NUMBER() OVER (
      PARTITION BY (SELECT domain_id FROM ont_concept c WHERE c.concept_id = ci.concept_id)
      ORDER BY expert_count DESC, avg_relevance DESC
    ) as rank_domain
  FROM ont_concept_importance ci
)
UPDATE ont_concept_importance ci
SET rank_overall = r.rank_all, rank_in_domain = r.rank_domain
FROM ranked r WHERE ci.id = r.id;
```

---

## 마이그레이션 3: `ont_lecture_capsule`

**목적:** 개념별 자동 생성 강의 캡슐 (교안/지침/실라버스)

```sql
CREATE TABLE ont_lecture_capsule (
  capsule_id SERIAL PRIMARY KEY,
  concept_id INTEGER NOT NULL REFERENCES ont_concept(concept_id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL
    CHECK (level IN ('왕초보','초보','중급','고급','전문가')),

  -- 캡슐 내용
  capsule_title VARCHAR(200) NOT NULL,
  overview TEXT NOT NULL DEFAULT '',
  teaching_guidelines TEXT NOT NULL DEFAULT '',
  syllabus JSONB NOT NULL DEFAULT '[]',
  theory_points JSONB NOT NULL DEFAULT '[]',
  case_study_refs JSONB NOT NULL DEFAULT '[]',

  -- 메타
  recommended_duration INTEGER NOT NULL DEFAULT 30,
  difficulty_score FLOAT DEFAULT 0,
  expert_sources JSONB NOT NULL DEFAULT '[]',
  prerequisite_concepts JSONB NOT NULL DEFAULT '[]',

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(concept_id, level)
);

CREATE INDEX idx_capsule_concept ON ont_lecture_capsule(concept_id);
CREATE INDEX idx_capsule_level ON ont_lecture_capsule(level);
```

### JSONB 스키마: `syllabus`

```json
[
  {
    "order": 1,
    "topic": "개념 소개",
    "description": "권리분석의 정의와 부동산 투자에서의 중요성",
    "duration_min": 5,
    "type": "theory"
  },
  {
    "order": 2,
    "topic": "등기부등본 읽기",
    "description": "갑구(소유권)/을구(제한물권) 구분법과 핵심 확인사항",
    "duration_min": 10,
    "type": "theory"
  },
  {
    "order": 3,
    "topic": "말소기준권리 판단",
    "description": "어떤 권리가 낙찰 후 소멸되고 어떤 것이 인수되는지",
    "duration_min": 10,
    "type": "theory"
  },
  {
    "order": 4,
    "topic": "실전 사례 분석",
    "description": "2024타경12345 사건의 등기부 분석 실습",
    "duration_min": 12,
    "type": "case"
  },
  {
    "order": 5,
    "topic": "체크리스트 정리",
    "description": "권리분석 10가지 체크포인트 요약",
    "duration_min": 5,
    "type": "summary"
  }
]
```

**type 허용값:** `'theory'` | `'case'` | `'practice'` | `'summary'` | `'quiz'`

### JSONB 스키마: `theory_points`

```json
[
  "말소기준권리: 저당권, 가압류, 담보가등기 중 가장 빠른 것이 기준",
  "대항력 있는 임차인: 전입신고 + 확정일자 + 점유가 모두 필요",
  "유치권: 실제 공사비 채권이 있어야 하며, 허위 유치권 판별 필요",
  "가처분: 소유권이전청구권 가처분은 낙찰 후에도 인수 위험"
]
```

### JSONB 스키마: `prerequisite_concepts`

```json
[
  {"concept_id": 1, "name": "부동산 기초 용어"},
  {"concept_id": 15, "name": "등기부등본 이해"}
]
```

---

## 마이그레이션 4: `ont_youtube` 컬럼 추가

```sql
ALTER TABLE ont_youtube
  ADD COLUMN IF NOT EXISTS lecture_type VARCHAR(20) DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS structure_segments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS case_references JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expert_name VARCHAR(100);
```

| 컬럼 | 용도 |
|------|------|
| lecture_type | ont_lecture_analysis의 요약 (빠른 조회용) |
| structure_segments | 강의 구조 세그먼트 (비정규화 캐시) |
| case_references | 탐지된 사례 목록 (비정규화 캐시) |
| duration_seconds | 영상 길이 (초) |
| expert_name | 전문가명 (channel_name과 별도, 수동 설정 가능) |

---

## 마이그레이션 5: RLS 정책

```sql
-- ont_lecture_analysis
ALTER TABLE ont_lecture_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lecture_analysis_select" ON ont_lecture_analysis FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lecture_analysis_insert" ON ont_lecture_analysis FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "lecture_analysis_update" ON ont_lecture_analysis FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "lecture_analysis_delete" ON ont_lecture_analysis FOR DELETE TO anon, authenticated USING (true);

-- ont_concept_importance
ALTER TABLE ont_concept_importance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concept_importance_select" ON ont_concept_importance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "concept_importance_insert" ON ont_concept_importance FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "concept_importance_update" ON ont_concept_importance FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "concept_importance_delete" ON ont_concept_importance FOR DELETE TO anon, authenticated USING (true);

-- ont_lecture_capsule
ALTER TABLE ont_lecture_capsule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lecture_capsule_select" ON ont_lecture_capsule FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lecture_capsule_insert" ON ont_lecture_capsule FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "lecture_capsule_update" ON ont_lecture_capsule FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "lecture_capsule_delete" ON ont_lecture_capsule FOR DELETE TO anon, authenticated USING (true);
```

---

## ER 다이어그램 (확장 후)

```
ont_domain (5)
  │ 1:N
  ▼
ont_concept (131)
  │ 1:N          1:1              1:N
  ├──────► ont_relation (111)
  ├──────► ont_concept_importance [신규]
  ├──────► ont_lecture_capsule [신규] (개념×레벨)
  │ N:M
  ▼
ont_youtube_concept (31+)
  │ N:1
  ▼
ont_youtube (2+)
  │ 1:1
  ▼
ont_lecture_analysis [신규]

ont_path (6) ──1:N──► ont_path_step (90) ──N:1──► ont_concept
```

---

## 검증 체크리스트

- [ ] `list_tables`로 3개 신규 테이블 확인
- [ ] `execute_sql SELECT * FROM ont_lecture_analysis LIMIT 1` → 빈 테이블 확인
- [ ] `execute_sql SELECT * FROM ont_concept_importance LIMIT 1` → 빈 테이블 확인
- [ ] `execute_sql SELECT * FROM ont_lecture_capsule LIMIT 1` → 빈 테이블 확인
- [ ] `execute_sql SELECT column_name FROM information_schema.columns WHERE table_name = 'ont_youtube' AND column_name = 'lecture_type'` → 컬럼 존재 확인
- [ ] `execute_sql INSERT INTO ont_concept_importance (concept_id, expert_count) VALUES (1, 0)` → RLS 허용 확인
- [ ] `execute_sql DELETE FROM ont_concept_importance WHERE concept_id = 1` → 정리
