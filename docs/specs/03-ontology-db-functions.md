# SPEC 03: DB 함수 확장 (`lib/ontology-db.ts`)

## 개요

**파일:** `lib/ontology-db.ts` (현재 345줄)
**작업:** 10개 신규 함수 + 4개 타입 추가 (기존 함수 변경 없음)
**패턴:** 기존 `supabase.from('ont_*')` 패턴 유지

---

## 기존 Supabase 클라이언트 (변경 없음)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 신규 타입 정의

```typescript
// ============================================
// 전문가 강조도
// ============================================
export interface ConceptImportance {
  id?: number
  concept_id: number
  expert_count: number
  video_count: number
  total_relevance_sum: number
  avg_relevance: number
  max_relevance: number
  experts: Array<{
    channel_name: string
    youtube_id: number
    video_title: string
    relevance: number
    matched_keywords?: string[]
  }>
  rank_overall?: number | null
  rank_in_domain?: number | null
  updated_at?: string
  // JOIN 필드
  concept_name?: string
  domain_id?: number
  domain_name?: string
  domain_color?: string
  level?: string
  difficulty?: number
}

// ============================================
// 강의 분석
// ============================================
export interface LectureAnalysisRecord {
  analysis_id?: number
  youtube_id: number
  lecture_type: string
  lecture_type_scores: Record<string, number>
  structure: Array<{
    segment_type: string
    start_pct: number
    end_pct: number
    char_start: number
    char_end: number
    text_preview: string
    confidence: number
  }>
  case_references: Array<{
    type: string
    number: string
    court?: string
    context: string
    char_position: number
  }>
  case_count: number
  expert_name?: string
  hooking_ratio: number
  information_ratio: number
  case_ratio: number
  cta_ratio: number
  total_segments: number
  analyzed_at?: string
}

// ============================================
// 강의 캡슐
// ============================================
export interface LectureCapsuleRecord {
  capsule_id?: number
  concept_id: number
  level: string
  capsule_title: string
  overview: string
  teaching_guidelines: string
  syllabus: Array<{
    order: number
    topic: string
    description: string
    duration_min: number
    type: 'theory' | 'case' | 'practice' | 'summary' | 'quiz'
  }>
  theory_points: string[]
  case_study_refs: Array<{
    type: string
    number: string
    context: string
  }>
  recommended_duration: number
  difficulty_score: number
  expert_sources: Array<{
    channel_name: string
    relevance: number
  }>
  prerequisite_concepts: Array<{
    concept_id: number
    name: string
  }>
  generated_at?: string
}

// ============================================
// 대시보드 통계
// ============================================
export interface DashboardStats {
  total_concepts: number
  total_videos: number
  total_mappings: number
  total_experts: number
  coverage_rate: number

  domain_stats: Array<{
    domain_id: number
    domain_name: string
    color: string
    concept_count: number
    covered_count: number
    coverage_rate: number
    avg_importance: number
  }>

  level_stats: Array<{
    level: string
    concept_count: number
    covered_count: number
    coverage_rate: number
  }>

  top_concepts: ConceptImportance[]

  lecture_type_distribution: Record<string, number>

  expert_list: Array<{
    channel_name: string
    video_count: number
    concept_count: number
  }>

  structure_templates: Array<{
    lecture_type: string
    avg_hooking: number
    avg_information: number
    avg_case: number
    avg_cta: number
    sample_count: number
  }>
}
```

---

## 함수 1: `getConceptImportance`

```typescript
export async function getConceptImportance(
  domainId?: number,
  level?: string,
  limit: number = 50
): Promise<ConceptImportance[]> {
  // Supabase에서 직접 JOIN이 제한적이므로 execute_sql 사용
  // 또는 2단계 쿼리:

  // 방법 A: Supabase JS (조인 불가 → 2단계)
  let conceptQuery = supabase.from('ont_concept').select('concept_id, name, domain_id, level, difficulty')
  if (domainId) conceptQuery = conceptQuery.eq('domain_id', domainId)
  if (level) conceptQuery = conceptQuery.eq('level', level)
  const { data: concepts } = await conceptQuery

  const conceptIds = concepts?.map(c => c.concept_id) || []
  if (conceptIds.length === 0) return []

  const { data: importance } = await supabase
    .from('ont_concept_importance')
    .select('*')
    .in('concept_id', conceptIds)
    .order('expert_count', { ascending: false })
    .order('avg_relevance', { ascending: false })
    .limit(limit)

  // 도메인 정보 조인
  const { data: domains } = await supabase.from('ont_domain').select('domain_id, name, color')

  // 결과 조합
  const conceptMap = new Map(concepts?.map(c => [c.concept_id, c]))
  const domainMap = new Map(domains?.map(d => [d.domain_id, d]))

  return (importance || []).map(imp => {
    const concept = conceptMap.get(imp.concept_id)
    const domain = concept ? domainMap.get(concept.domain_id) : null
    return {
      ...imp,
      concept_name: concept?.name,
      domain_id: concept?.domain_id,
      domain_name: domain?.name,
      domain_color: domain?.color,
      level: concept?.level,
      difficulty: concept?.difficulty
    }
  })
}
```

---

## 함수 2: `recalculateAllImportance`

```typescript
export async function recalculateAllImportance(): Promise<{ updated: number }> {
  // ont_youtube_concept JOIN ont_youtube → 집계 → UPSERT into ont_concept_importance

  // Step 1: 현재 매핑 데이터 로드
  const { data: mappings } = await supabase
    .from('ont_youtube_concept')
    .select('concept_id, relevance, youtube_id')

  const { data: videos } = await supabase
    .from('ont_youtube')
    .select('youtube_id, title, channel_name')

  if (!mappings || !videos) return { updated: 0 }

  const videoMap = new Map(videos.map(v => [v.youtube_id, v]))

  // Step 2: concept_id별 집계
  const aggregated = new Map<number, {
    concept_id: number
    experts: Set<string>
    videoIds: Set<number>
    relevances: number[]
    expertDetails: Array<{ channel_name: string; youtube_id: number; video_title: string; relevance: number }>
  }>()

  for (const m of mappings) {
    const video = videoMap.get(m.youtube_id)
    if (!video) continue

    if (!aggregated.has(m.concept_id)) {
      aggregated.set(m.concept_id, {
        concept_id: m.concept_id,
        experts: new Set(),
        videoIds: new Set(),
        relevances: [],
        expertDetails: []
      })
    }

    const agg = aggregated.get(m.concept_id)!
    agg.experts.add(video.channel_name || '알 수 없음')
    agg.videoIds.add(m.youtube_id)
    agg.relevances.push(m.relevance)
    agg.expertDetails.push({
      channel_name: video.channel_name || '알 수 없음',
      youtube_id: m.youtube_id,
      video_title: video.title,
      relevance: Math.round(m.relevance * 10000) / 10000
    })
  }

  // Step 3: UPSERT
  let updated = 0
  for (const [conceptId, agg] of aggregated) {
    const avgRel = agg.relevances.reduce((a, b) => a + b, 0) / agg.relevances.length
    const maxRel = Math.max(...agg.relevances)

    const { error } = await supabase
      .from('ont_concept_importance')
      .upsert({
        concept_id: conceptId,
        expert_count: agg.experts.size,
        video_count: agg.videoIds.size,
        total_relevance_sum: Math.round(agg.relevances.reduce((a, b) => a + b, 0) * 10000) / 10000,
        avg_relevance: Math.round(avgRel * 10000) / 10000,
        max_relevance: Math.round(maxRel * 10000) / 10000,
        experts: agg.expertDetails.sort((a, b) => b.relevance - a.relevance),
        updated_at: new Date().toISOString()
      }, { onConflict: 'concept_id' })

    if (!error) updated++
  }

  // Step 4: 순위 계산 (JS에서)
  const { data: allImportance } = await supabase
    .from('ont_concept_importance')
    .select('id, concept_id, expert_count, avg_relevance')
    .order('expert_count', { ascending: false })
    .order('avg_relevance', { ascending: false })

  if (allImportance) {
    // 전체 순위
    for (let i = 0; i < allImportance.length; i++) {
      await supabase
        .from('ont_concept_importance')
        .update({ rank_overall: i + 1 })
        .eq('id', allImportance[i].id)
    }
    // 도메인별 순위는 getConceptImportance에서 클라이언트 측 계산
  }

  return { updated }
}
```

---

## 함수 3: `upsertLectureAnalysis`

```typescript
export async function upsertLectureAnalysis(data: LectureAnalysisRecord): Promise<void> {
  const { error } = await supabase
    .from('ont_lecture_analysis')
    .upsert({
      youtube_id: data.youtube_id,
      lecture_type: data.lecture_type,
      lecture_type_scores: data.lecture_type_scores,
      structure: data.structure,
      case_references: data.case_references,
      case_count: data.case_references.length,
      expert_name: data.expert_name,
      total_segments: data.structure.length,
      hooking_ratio: data.hooking_ratio,
      information_ratio: data.information_ratio,
      case_ratio: data.case_ratio,
      cta_ratio: data.cta_ratio,
      analyzed_at: new Date().toISOString()
    }, { onConflict: 'youtube_id' })

  if (error) throw new Error(`Failed to upsert lecture analysis: ${error.message}`)
}
```

---

## 함수 4: `updateYoutubeEnhanced`

```typescript
export async function updateYoutubeEnhanced(
  youtubeId: number,
  data: {
    lecture_type: string
    structure_segments: any[]
    case_references: any[]
    expert_name?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('ont_youtube')
    .update({
      lecture_type: data.lecture_type,
      structure_segments: data.structure_segments,
      case_references: data.case_references,
      expert_name: data.expert_name
    })
    .eq('youtube_id', youtubeId)

  if (error) throw new Error(`Failed to update youtube enhanced: ${error.message}`)
}
```

---

## 함수 5: `getLectureCapsules`

```typescript
export async function getLectureCapsules(filters?: {
  concept_id?: number
  level?: string
  domain_id?: number
}): Promise<LectureCapsuleRecord[]> {
  let query = supabase.from('ont_lecture_capsule').select('*')

  if (filters?.concept_id) query = query.eq('concept_id', filters.concept_id)
  if (filters?.level) query = query.eq('level', filters.level)

  const { data, error } = await query.order('capsule_id')
  if (error) throw new Error(`Failed to get capsules: ${error.message}`)

  // domain_id 필터가 있으면 concept JOIN 후 필터
  if (filters?.domain_id && data) {
    const { data: concepts } = await supabase
      .from('ont_concept')
      .select('concept_id')
      .eq('domain_id', filters.domain_id)

    const conceptIds = new Set(concepts?.map(c => c.concept_id))
    return data.filter(cap => conceptIds.has(cap.concept_id))
  }

  return data || []
}
```

---

## 함수 6: `upsertLectureCapsule`

```typescript
export async function upsertLectureCapsule(data: LectureCapsuleRecord): Promise<void> {
  const { error } = await supabase
    .from('ont_lecture_capsule')
    .upsert({
      concept_id: data.concept_id,
      level: data.level,
      capsule_title: data.capsule_title,
      overview: data.overview,
      teaching_guidelines: data.teaching_guidelines,
      syllabus: data.syllabus,
      theory_points: data.theory_points,
      case_study_refs: data.case_study_refs,
      recommended_duration: data.recommended_duration,
      difficulty_score: data.difficulty_score,
      expert_sources: data.expert_sources,
      prerequisite_concepts: data.prerequisite_concepts,
      generated_at: new Date().toISOString()
    }, { onConflict: 'concept_id,level' })

  if (error) throw new Error(`Failed to upsert capsule: ${error.message}`)
}
```

---

## 함수 7: `generateCapsuleFromData`

```typescript
export async function generateCapsuleFromData(conceptId: number): Promise<LectureCapsuleRecord> {
  // 1. 개념 정보
  const { data: concept } = await supabase
    .from('ont_concept')
    .select('*, ont_domain!inner(name, color)')
    .eq('concept_id', conceptId)
    .single()

  if (!concept) throw new Error(`Concept ${conceptId} not found`)

  // 2. 선수 관계
  const { data: prerequisites } = await supabase
    .from('ont_relation')
    .select('source_concept_id, ont_concept!ont_relation_source_concept_id_fkey(name)')
    .eq('target_concept_id', conceptId)
    .eq('relation_type', 'prerequisite')

  // 3. 강조도
  const { data: importance } = await supabase
    .from('ont_concept_importance')
    .select('*')
    .eq('concept_id', conceptId)
    .single()

  // 4. 관련 사례 (모든 영상의 case_references에서)
  const { data: analyses } = await supabase
    .from('ont_lecture_analysis')
    .select('case_references, youtube_id')

  // 5. 캡슐 생성
  const level = concept.level || '초보'
  const keywords = concept.keywords || []
  const estimatedMin = concept.estimated_minutes || 30

  // 레벨별 교수법 가이드라인 템플릿
  const guidelineTemplates: Record<string, string> = {
    '왕초보': `- 전문 용어를 최대한 쉬운 말로 풀어서 설명\n- 비유와 일상생활 예시를 적극 활용\n- 핵심 개념 3가지 이내로 집중\n- 반복 요약으로 기억 강화`,
    '초보': `- 기본 용어는 간략히 복습 후 진행\n- 실제 서류/화면 캡처로 시각적 설명\n- 간단한 사례 1-2개로 이해도 확인\n- 체크리스트 제공으로 실습 유도`,
    '중급': `- 개념 간 연결관계 강조\n- 실전 사례 중심으로 진행\n- 예외 상황과 주의사항 상세 설명\n- 직접 분석 실습 과제 포함`,
    '고급': `- 복잡한 사례와 예외 상황 중심\n- 법률 조항 원문 해석 포함\n- 다양한 시나리오별 대응 전략\n- 토론/질의응답 시간 배정`,
    '전문가': `- 최신 판례와 법개정 사항 반영\n- 실무 노하우와 리스크 관리 중심\n- 포트폴리오 전략과 연계\n- 멘토링/컨설팅 관점에서 진행`
  }

  // 키워드 기반 실라버스 자동 생성
  const syllabus: LectureCapsuleRecord['syllabus'] = []
  syllabus.push({
    order: 1,
    topic: `${concept.name} 개요`,
    description: `${concept.name}의 정의와 중요성 소개`,
    duration_min: Math.max(3, Math.round(estimatedMin * 0.15)),
    type: 'theory'
  })

  // 키워드를 토픽으로 변환 (최대 5개)
  const topicKeywords = keywords.slice(0, 5)
  topicKeywords.forEach((kw: string, idx: number) => {
    syllabus.push({
      order: idx + 2,
      topic: kw,
      description: `${kw}에 대한 상세 설명${level === '중급' || level === '고급' ? '과 실전 적용' : ''}`,
      duration_min: Math.round(estimatedMin * 0.6 / Math.max(topicKeywords.length, 1)),
      type: 'theory'
    })
  })

  // 사례 섹션 (있으면)
  const relatedCases = (analyses || [])
    .flatMap(a => (a.case_references || []) as Array<{ type: string; number: string; context: string }>)
    .slice(0, 3)

  if (relatedCases.length > 0) {
    syllabus.push({
      order: syllabus.length + 1,
      topic: '실전 사례 분석',
      description: `${relatedCases[0].number} 등 실제 사례 분석`,
      duration_min: Math.round(estimatedMin * 0.2),
      type: 'case'
    })
  }

  // 요약
  syllabus.push({
    order: syllabus.length + 1,
    topic: '핵심 정리',
    description: `${concept.name}의 핵심 포인트 정리 및 Q&A`,
    duration_min: Math.max(3, Math.round(estimatedMin * 0.1)),
    type: 'summary'
  })

  const capsule: LectureCapsuleRecord = {
    concept_id: conceptId,
    level,
    capsule_title: concept.lecture_title || `${concept.name} 강의`,
    overview: concept.description || `${concept.name}에 대한 체계적 학습`,
    teaching_guidelines: guidelineTemplates[level] || guidelineTemplates['초보'],
    syllabus,
    theory_points: keywords.map((kw: string) => `${kw}: ${concept.name}의 핵심 구성 요소`),
    case_study_refs: relatedCases,
    recommended_duration: estimatedMin,
    difficulty_score: concept.difficulty || 1,
    expert_sources: (importance?.experts || []).map((e: any) => ({
      channel_name: e.channel_name,
      relevance: e.relevance
    })),
    prerequisite_concepts: (prerequisites || []).map((p: any) => ({
      concept_id: p.source_concept_id,
      name: p.ont_concept?.name || ''
    }))
  }

  return capsule
}
```

---

## 함수 8: `getDashboardStats`

```typescript
export async function getDashboardStats(): Promise<DashboardStats> {
  // 병렬 쿼리 실행
  const [
    conceptsRes,
    videosRes,
    mappingsRes,
    domainsRes,
    importanceRes,
    analysesRes
  ] = await Promise.all([
    supabase.from('ont_concept').select('concept_id, domain_id, level', { count: 'exact' }),
    supabase.from('ont_youtube').select('youtube_id, channel_name', { count: 'exact' }),
    supabase.from('ont_youtube_concept').select('concept_id, youtube_id', { count: 'exact' }),
    supabase.from('ont_domain').select('*').order('sort_order'),
    supabase.from('ont_concept_importance').select('*').order('expert_count', { ascending: false }).limit(20),
    supabase.from('ont_lecture_analysis').select('lecture_type, hooking_ratio, information_ratio, case_ratio, cta_ratio')
  ])

  const concepts = conceptsRes.data || []
  const videos = videosRes.data || []
  const mappings = mappingsRes.data || []
  const domains = domainsRes.data || []
  const topImportance = importanceRes.data || []
  const analyses = analysesRes.data || []

  const totalConcepts = conceptsRes.count || concepts.length
  const totalVideos = videosRes.count || videos.length
  const totalMappings = mappingsRes.count || mappings.length
  const coveredConceptIds = new Set(mappings.map(m => m.concept_id))
  const uniqueExperts = new Set(videos.map(v => v.channel_name).filter(Boolean))

  // 도메인별 통계
  const domain_stats = domains.map(d => {
    const domainConcepts = concepts.filter(c => c.domain_id === d.domain_id)
    const domainCovered = domainConcepts.filter(c => coveredConceptIds.has(c.concept_id))
    const domainImportance = topImportance.filter(imp => {
      const concept = concepts.find(c => c.concept_id === imp.concept_id)
      return concept?.domain_id === d.domain_id
    })
    return {
      domain_id: d.domain_id,
      domain_name: d.name,
      color: d.color,
      concept_count: domainConcepts.length,
      covered_count: domainCovered.length,
      coverage_rate: domainConcepts.length > 0
        ? Math.round(domainCovered.length / domainConcepts.length * 100) : 0,
      avg_importance: domainImportance.length > 0
        ? Math.round(domainImportance.reduce((s, i) => s + i.avg_relevance, 0) / domainImportance.length * 100) / 100
        : 0
    }
  })

  // 레벨별 통계
  const levels = ['왕초보', '초보', '중급', '고급', '전문가']
  const level_stats = levels.map(level => {
    const levelConcepts = concepts.filter(c => c.level === level)
    const levelCovered = levelConcepts.filter(c => coveredConceptIds.has(c.concept_id))
    return {
      level,
      concept_count: levelConcepts.length,
      covered_count: levelCovered.length,
      coverage_rate: levelConcepts.length > 0
        ? Math.round(levelCovered.length / levelConcepts.length * 100) : 0
    }
  })

  // 강의 유형 분포
  const lecture_type_distribution: Record<string, number> = {}
  for (const a of analyses) {
    lecture_type_distribution[a.lecture_type] = (lecture_type_distribution[a.lecture_type] || 0) + 1
  }

  // 전문가 목록
  const expertMap = new Map<string, { video_count: number; concept_ids: Set<number> }>()
  for (const v of videos) {
    const name = v.channel_name || '알 수 없음'
    if (!expertMap.has(name)) expertMap.set(name, { video_count: 0, concept_ids: new Set() })
    expertMap.get(name)!.video_count++
  }
  for (const m of mappings) {
    const video = videos.find(v => v.youtube_id === m.youtube_id)
    if (video?.channel_name) {
      expertMap.get(video.channel_name)?.concept_ids.add(m.concept_id)
    }
  }
  const expert_list = Array.from(expertMap.entries()).map(([name, data]) => ({
    channel_name: name,
    video_count: data.video_count,
    concept_count: data.concept_ids.size
  }))

  // 구조 템플릿
  const typeGroups = new Map<string, typeof analyses>()
  for (const a of analyses) {
    if (!typeGroups.has(a.lecture_type)) typeGroups.set(a.lecture_type, [])
    typeGroups.get(a.lecture_type)!.push(a)
  }
  const structure_templates = Array.from(typeGroups.entries()).map(([type, group]) => ({
    lecture_type: type,
    avg_hooking: Math.round(group.reduce((s, g) => s + g.hooking_ratio, 0) / group.length * 100) / 100,
    avg_information: Math.round(group.reduce((s, g) => s + g.information_ratio, 0) / group.length * 100) / 100,
    avg_case: Math.round(group.reduce((s, g) => s + g.case_ratio, 0) / group.length * 100) / 100,
    avg_cta: Math.round(group.reduce((s, g) => s + g.cta_ratio, 0) / group.length * 100) / 100,
    sample_count: group.length
  }))

  return {
    total_concepts: totalConcepts,
    total_videos: totalVideos,
    total_mappings: totalMappings,
    total_experts: uniqueExperts.size,
    coverage_rate: totalConcepts > 0
      ? Math.round(coveredConceptIds.size / totalConcepts * 100) : 0,
    domain_stats,
    level_stats,
    top_concepts: topImportance as ConceptImportance[],
    lecture_type_distribution,
    expert_list,
    structure_templates
  }
}
```

---

## 함수 9: `getGraphDataWithImportance`

```typescript
export async function getGraphDataWithImportance(
  domainId?: number,
  level?: string
): Promise<{
  nodes: Array<{
    id: number; label: string; domain_id: number; domain_name: string; domain_color: string
    level: string; difficulty: number
    importance_score: number; expert_count: number; video_count: number; rank_overall: number | null
  }>
  edges: Array<{
    source: number; target: number; relation_type: string; weight: number
  }>
}> {
  // 기존 getGraphData 로직 + importance LEFT JOIN
  const graphData = await getGraphData(domainId, level)

  // importance 데이터 로드
  const { data: importance } = await supabase
    .from('ont_concept_importance')
    .select('concept_id, avg_relevance, expert_count, video_count, rank_overall')

  const impMap = new Map(
    (importance || []).map(i => [i.concept_id, i])
  )

  const enhancedNodes = graphData.nodes.map(node => {
    const imp = impMap.get(node.id)
    return {
      ...node,
      importance_score: imp?.avg_relevance || 0,
      expert_count: imp?.expert_count || 0,
      video_count: imp?.video_count || 0,
      rank_overall: imp?.rank_overall || null
    }
  })

  return { nodes: enhancedNodes, edges: graphData.edges }
}
```

---

## 함수 10: `getLectureAnalyses`

```typescript
export async function getLectureAnalyses(filters?: {
  lecture_type?: string
}): Promise<LectureAnalysisRecord[]> {
  let query = supabase.from('ont_lecture_analysis').select('*')

  if (filters?.lecture_type) {
    query = query.eq('lecture_type', filters.lecture_type)
  }

  const { data, error } = await query.order('analyzed_at', { ascending: false })
  if (error) throw new Error(`Failed to get analyses: ${error.message}`)

  return data || []
}
```

---

## 검증 체크리스트

- [ ] `getConceptImportance()` — 빈 결과 반환 (아직 데이터 없음)
- [ ] `recalculateAllImportance()` — 기존 2영상/31매핑 → importance 생성
- [ ] `recalculateAllImportance()` 후 `getConceptImportance()` — 31개 importance 반환
- [ ] `upsertLectureAnalysis()` — 데이터 삽입 확인
- [ ] `generateCapsuleFromData(1)` — concept_id=1의 캡슐 생성
- [ ] `upsertLectureCapsule()` → `getLectureCapsules()` — CRUD 동작
- [ ] `getDashboardStats()` — 모든 필드 정상 반환
- [ ] `getGraphDataWithImportance()` — 노드에 importance 필드 포함
