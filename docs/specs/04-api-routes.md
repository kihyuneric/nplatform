# SPEC 04: API 라우트

## 개요

5개 신규 API 라우트 + 2개 기존 라우트 강화.
모든 라우트는 `app/api/ontology/` 하위에 위치.
Next.js 15 App Router `route.ts` 패턴 사용.

---

## 기존 라우트 강화

### 4-1. `app/api/ontology/youtube/upload/route.ts` (MODIFY)

**현재:** 대본 업로드 → analyzeTranscript → 매핑 저장
**변경:** + analyzeTranscriptEnhanced → lecture_type/structure/case_references 저장 → importance 재계산

```typescript
import { NextResponse } from 'next/server'
import { analyzeTranscript, analyzeTranscriptEnhanced, parseTimestampedTranscript, analyzeWithTimestamps } from '@/lib/transcript-analyzer'
import {
  insertYoutubeVideo, insertYoutubeConceptMappings, getConceptsByDomain,
  updateYoutubeEnhanced, upsertLectureAnalysis, recalculateAllImportance
} from '@/lib/ontology-db'
import type { ConceptInfo } from '@/lib/transcript-analyzer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, channel_name, video_id, transcript } = body

    // 유효성 검증 (기존 동일)
    if (!title || !transcript) {
      return NextResponse.json({ error: 'title과 transcript는 필수입니다' }, { status: 400 })
    }

    // 1. 영상 정보 저장 (기존 동일)
    const youtube_id = await insertYoutubeVideo({
      title, channel_name, video_id, transcript
    })

    // 2. 개념 목록 로드 (기존 동일)
    const concepts = await getConceptsByDomain()
    const conceptInfos: ConceptInfo[] = concepts.map(c => ({
      concept_id: c.concept_id, name: c.name,
      keywords: c.keywords || [], description: c.description,
      level: c.level, domain_id: c.domain_id
    }))

    // 3. 기본 키워드 분석 (기존 동일)
    const basicResult = analyzeTranscript(transcript, conceptInfos)

    // 4. 타임스탬프 분석 (기존 동일)
    const segments = parseTimestampedTranscript(transcript)
    let timestampMappings: any[] = []
    if (segments.length > 3) {
      const tsResult = analyzeWithTimestamps(segments, conceptInfos)
      timestampMappings = tsResult.mappings
    }

    // 5. 매핑 병합 + 저장 (기존 동일)
    const mergedMappings = mergeMappings(basicResult.mappings, timestampMappings)
    if (mergedMappings.length > 0) {
      await insertYoutubeConceptMappings(
        mergedMappings.map(m => ({
          youtube_id, concept_id: m.concept_id,
          relevance: m.relevance,
          timestamp_start: m.timestamp_start,
          timestamp_end: m.timestamp_end
        }))
      )
    }

    // ========== 신규 추가 ==========

    // 6. 강화된 분석 (강의유형 + 구조 + 사례)
    const enhanced = analyzeTranscriptEnhanced(transcript, conceptInfos)

    // 7. ont_youtube 강화 컬럼 업데이트
    await updateYoutubeEnhanced(youtube_id, {
      lecture_type: enhanced.lecture_type,
      structure_segments: enhanced.structure,
      case_references: enhanced.case_references,
      expert_name: channel_name
    })

    // 8. ont_lecture_analysis 저장
    await upsertLectureAnalysis({
      youtube_id,
      lecture_type: enhanced.lecture_type,
      lecture_type_scores: enhanced.lecture_type_scores,
      structure: enhanced.structure,
      case_references: enhanced.case_references,
      case_count: enhanced.case_references.length,
      expert_name: channel_name,
      hooking_ratio: enhanced.hooking_ratio,
      information_ratio: enhanced.information_ratio,
      case_ratio: enhanced.case_ratio,
      cta_ratio: enhanced.cta_ratio,
      total_segments: enhanced.structure.length
    })

    // 9. 전문가 강조도 재계산
    await recalculateAllImportance()

    // 10. 강화된 응답
    return NextResponse.json({
      success: true,
      youtube_id,
      mapped_concepts_count: mergedMappings.length,
      analysis: {
        total_chunks: basicResult.total_chunks,
        analyzed_at: basicResult.analyzed_at,
        mappings: mergedMappings.map(m => ({
          concept_id: m.concept_id,
          concept_name: conceptInfos.find(c => c.concept_id === m.concept_id)?.name,
          relevance: m.relevance,
          matched_keywords: m.matched_keywords
        })),
        // 신규 필드
        lecture_type: enhanced.lecture_type,
        lecture_type_scores: enhanced.lecture_type_scores,
        structure: enhanced.structure,
        case_references: enhanced.case_references,
        hooking_ratio: enhanced.hooking_ratio,
        information_ratio: enhanced.information_ratio,
        case_ratio: enhanced.case_ratio,
        cta_ratio: enhanced.cta_ratio
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**응답 스키마 (강화 후):**

```json
{
  "success": true,
  "youtube_id": 3,
  "mapped_concepts_count": 12,
  "analysis": {
    "total_chunks": 5,
    "analyzed_at": "2024-01-15T10:30:00Z",
    "mappings": [
      {
        "concept_id": 45,
        "concept_name": "권리분석",
        "relevance": 0.87,
        "matched_keywords": ["권리분석", "등기부등본"]
      }
    ],
    "lecture_type": "informational",
    "lecture_type_scores": {
      "informational": 0.45,
      "case_study": 0.30,
      "hooking": 0.15,
      "knowhow": 0.10
    },
    "structure": [
      {"segment_type": "hooking_intro", "start_pct": 0, "end_pct": 10, "text_preview": "...", "confidence": 0.8}
    ],
    "case_references": [
      {"type": "auction", "number": "2024타경12345", "court": "서울중앙지방법원", "context": "..."}
    ],
    "hooking_ratio": 0.08,
    "information_ratio": 0.52,
    "case_ratio": 0.25,
    "cta_ratio": 0.15
  }
}
```

### 4-2. `app/api/ontology/graph/route.ts` (MODIFY)

```typescript
import { NextResponse } from 'next/server'
import { getGraphDataWithImportance } from '@/lib/ontology-db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domain_id')
    const level = searchParams.get('level')

    // 변경: getGraphData → getGraphDataWithImportance
    const data = await getGraphDataWithImportance(
      domainId ? parseInt(domainId) : undefined,
      level || undefined
    )

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ nodes: [], edges: [] })
  }
}
```

**응답 노드 스키마 (강화 후):**

```json
{
  "nodes": [
    {
      "id": 45,
      "label": "권리분석",
      "domain_id": 3,
      "domain_name": "경매",
      "domain_color": "#EF4444",
      "level": "중급",
      "difficulty": 3,
      "importance_score": 0.76,
      "expert_count": 2,
      "video_count": 2,
      "rank_overall": 3
    }
  ],
  "edges": [
    { "source": 15, "target": 45, "relation_type": "prerequisite", "weight": 0.9 }
  ]
}
```

---

## 신규 라우트

### 4-3. `app/api/ontology/importance/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server'
import { getConceptImportance } from '@/lib/ontology-db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domain_id')
    const level = searchParams.get('level')
    const limit = searchParams.get('limit')

    const importance = await getConceptImportance(
      domainId ? parseInt(domainId) : undefined,
      level || undefined,
      limit ? parseInt(limit) : 50
    )

    return NextResponse.json({
      importance,
      total: importance.length
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, importance: [] }, { status: 500 })
  }
}
```

**요청:** `GET /api/ontology/importance?domain_id=3&level=중급&limit=20`

**응답:**
```json
{
  "importance": [
    {
      "concept_id": 45,
      "concept_name": "권리분석",
      "domain_id": 3,
      "domain_name": "경매",
      "domain_color": "#EF4444",
      "level": "중급",
      "expert_count": 2,
      "video_count": 2,
      "avg_relevance": 0.76,
      "max_relevance": 0.87,
      "rank_overall": 3,
      "experts": [...]
    }
  ],
  "total": 15
}
```

### 4-4. `app/api/ontology/importance/recalculate/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server'
import { recalculateAllImportance } from '@/lib/ontology-db'

export async function POST() {
  try {
    const result = await recalculateAllImportance()
    return NextResponse.json({ success: true, updated: result.updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**요청:** `POST /api/ontology/importance/recalculate` (body 불필요)
**응답:** `{ "success": true, "updated": 31 }`

### 4-5. `app/api/ontology/capsules/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server'
import { getLectureCapsules } from '@/lib/ontology-db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const concept_id = searchParams.get('concept_id')
    const level = searchParams.get('level')
    const domain_id = searchParams.get('domain_id')

    const capsules = await getLectureCapsules({
      concept_id: concept_id ? parseInt(concept_id) : undefined,
      level: level || undefined,
      domain_id: domain_id ? parseInt(domain_id) : undefined
    })

    return NextResponse.json({ capsules })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, capsules: [] }, { status: 500 })
  }
}
```

**요청:** `GET /api/ontology/capsules?concept_id=45&level=중급`

### 4-6. `app/api/ontology/capsules/generate/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server'
import { generateCapsuleFromData, upsertLectureCapsule } from '@/lib/ontology-db'

export async function POST(request: Request) {
  try {
    const { concept_id } = await request.json()

    if (!concept_id) {
      return NextResponse.json({ error: 'concept_id is required' }, { status: 400 })
    }

    // 캡슐 자동 생성
    const capsule = await generateCapsuleFromData(concept_id)

    // DB 저장
    await upsertLectureCapsule(capsule)

    return NextResponse.json({ success: true, capsule })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**요청:** `POST /api/ontology/capsules/generate`
**Body:** `{ "concept_id": 45 }`
**응답:**
```json
{
  "success": true,
  "capsule": {
    "concept_id": 45,
    "level": "중급",
    "capsule_title": "권리분석 강의",
    "overview": "부동산 경매에서 권리분석은...",
    "teaching_guidelines": "- 개념 간 연결관계 강조\n- 실전 사례 중심...",
    "syllabus": [
      {"order": 1, "topic": "권리분석 개요", "duration_min": 7, "type": "theory"},
      {"order": 2, "topic": "등기부등본", "duration_min": 9, "type": "theory"},
      {"order": 3, "topic": "실전 사례 분석", "duration_min": 9, "type": "case"},
      {"order": 4, "topic": "핵심 정리", "duration_min": 5, "type": "summary"}
    ],
    "theory_points": ["등기부등본: 권리분석의 핵심 구성 요소", ...],
    "recommended_duration": 45,
    "expert_sources": [{"channel_name": "부동산남", "relevance": 0.87}],
    "prerequisite_concepts": [{"concept_id": 15, "name": "등기부등본 이해"}]
  }
}
```

### 4-7. `app/api/ontology/dashboard/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/ontology-db'

export async function GET() {
  try {
    const stats = await getDashboardStats()
    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**요청:** `GET /api/ontology/dashboard`
**응답:** 전체 `DashboardStats` 객체 (SPEC 03 참조)

---

## API 라우트 총 목록 (확장 후)

| # | 라우트 | 메서드 | 상태 |
|---|--------|--------|------|
| 1 | `/api/ontology/domains` | GET | 기존 유지 |
| 2 | `/api/ontology/concepts` | GET | 기존 유지 |
| 3 | `/api/ontology/paths` | GET | 기존 유지 |
| 4 | `/api/ontology/graph` | GET | **강화** |
| 5 | `/api/ontology/concept/[id]` | GET | 기존 유지 |
| 6 | `/api/ontology/path/[id]` | GET | 기존 유지 |
| 7 | `/api/ontology/youtube` | GET | 기존 유지 |
| 8 | `/api/ontology/youtube/upload` | POST | **강화** |
| 9 | `/api/ontology/youtube/bulk-upload` | POST | 기존 유지 |
| 10 | `/api/ontology/youtube/[id]` | GET/DELETE | 기존 유지 |
| 11 | `/api/ontology/youtube/stats` | GET | 기존 유지 |
| 12 | `/api/ontology/importance` | GET | **신규** |
| 13 | `/api/ontology/importance/recalculate` | POST | **신규** |
| 14 | `/api/ontology/capsules` | GET | **신규** |
| 15 | `/api/ontology/capsules/generate` | POST | **신규** |
| 16 | `/api/ontology/dashboard` | GET | **신규** |

---

## 에러 처리 표준

모든 라우트에서 동일한 에러 응답 형식:

```json
{
  "error": "에러 메시지",
  "status": 500
}
```

- `400` — 필수 파라미터 누락
- `404` — 리소스 미존재
- `500` — 서버 에러 (DB 오류 등)
