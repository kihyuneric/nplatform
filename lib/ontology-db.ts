// Ontology DB functions — Supabase 기반 구현
// public 스키마의 ont_* 테이블에 접근

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================
// READ — 도메인 / 개념 / 관계 / 그래프 / 경로
// ============================================================

export async function getDomains() {
  const { data, error } = await supabase
    .from('ont_domain')
    .select('*')
    .order('sort_order')

  if (error) throw error
  return data
}

export async function getConceptsByDomain(domainId?: number, level?: string) {
  let query = supabase
    .from('ont_concept')
    .select('*')
    .order('concept_id')

  if (domainId) query = query.eq('domain_id', domainId)
  if (level) query = query.eq('level', level)

  const { data, error } = await query
  if (error) throw error

  // Atomic 캡슐 수 조회 (있으면 추가)
  if (data && data.length > 0) {
    try {
      const conceptIds = data.map((c: any) => c.concept_id)
      const { data: atomicCounts } = await supabase
        .from('ont_atomic_capsule')
        .select('concept_id')
        .in('concept_id', conceptIds)

      if (atomicCounts) {
        const countMap = new Map<number, number>()
        for (const ac of atomicCounts) {
          countMap.set(ac.concept_id, (countMap.get(ac.concept_id) || 0) + 1)
        }
        for (const concept of data) {
          ;(concept as any).atomic_count = countMap.get(concept.concept_id) || 0
        }
      }
    } catch {
      // ont_atomic_capsule 테이블이 없으면 무시
    }
  }

  return data
}

export async function getConceptDetail(conceptId: number) {
  // 1. 개념 기본 정보
  const { data: concept, error: conceptErr } = await supabase
    .from('ont_concept')
    .select('*')
    .eq('concept_id', conceptId)
    .single()

  if (conceptErr) throw conceptErr

  // 2. 나가는 관계 (source)
  const { data: relationsOut } = await supabase
    .from('ont_relation')
    .select('*, target:ont_concept!target_concept_id(concept_id, name, level)')
    .eq('source_concept_id', conceptId)

  // 3. 들어오는 관계 (target)
  const { data: relationsIn } = await supabase
    .from('ont_relation')
    .select('*, source:ont_concept!source_concept_id(concept_id, name, level)')
    .eq('target_concept_id', conceptId)

  // 4. 관련 YouTube 영상
  const { data: youtubeLinks } = await supabase
    .from('ont_youtube_concept')
    .select('*, youtube:ont_youtube(*)')
    .eq('concept_id', conceptId)
    .order('relevance', { ascending: false })

  // 5. 하위 개념
  const { data: children } = await supabase
    .from('ont_concept')
    .select('concept_id, name, level, difficulty')
    .eq('parent_concept_id', conceptId)

  return {
    ...concept,
    relationsOut: relationsOut || [],
    relationsIn: relationsIn || [],
    youtube: (youtubeLinks || []).map((link: any) => ({
      ...link.youtube,
      relevance: link.relevance,
      timestamp_start: link.timestamp_start,
      timestamp_end: link.timestamp_end,
    })),
    children: children || [],
  }
}

export async function getGraphData(domainId?: number, level?: string) {
  // 노드: 개념들
  let conceptQuery = supabase
    .from('ont_concept')
    .select('concept_id, domain_id, name, level, difficulty, parent_concept_id')

  if (domainId) conceptQuery = conceptQuery.eq('domain_id', domainId)
  if (level) conceptQuery = conceptQuery.eq('level', level)

  const { data: concepts, error: cErr } = await conceptQuery
  if (cErr) throw cErr

  const conceptIds = (concepts || []).map((c: any) => c.concept_id)

  // 엣지: 관계들
  let relations: any[] = []
  if (conceptIds.length > 0) {
    const { data: rels } = await supabase
      .from('ont_relation')
      .select('*')
      .in('source_concept_id', conceptIds)
      .in('target_concept_id', conceptIds)
    relations = rels || []
  }

  // 도메인 정보 (색상용)
  const { data: domains } = await supabase
    .from('ont_domain')
    .select('domain_id, name, color')

  const domainMap = Object.fromEntries(
    (domains || []).map((d: any) => [d.domain_id, d])
  )

  const nodes = (concepts || []).map((c: any) => ({
    id: c.concept_id,
    label: c.name,
    domain_id: c.domain_id,
    domain_name: domainMap[c.domain_id]?.name || '',
    domain_color: domainMap[c.domain_id]?.color || '#888',
    level: c.level,
    difficulty: c.difficulty,
  }))

  const edges = relations.map((r: any) => ({
    source: r.source_concept_id,
    target: r.target_concept_id,
    relation_type: r.relation_type,
    weight: r.weight,
  }))

  return { nodes, edges }
}

export async function getPaths(domainId?: number) {
  let query = supabase
    .from('ont_path')
    .select('*, step_count:ont_path_step(count)')
    .order('sort_order')

  if (domainId) query = query.eq('domain_id', domainId)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((p: any) => ({
    ...p,
    step_count: p.step_count?.[0]?.count || 0,
  }))
}

export async function getPathDetail(pathId: number) {
  const { data: path, error: pathErr } = await supabase
    .from('ont_path')
    .select('*')
    .eq('path_id', pathId)
    .single()

  if (pathErr) throw pathErr

  const { data: steps } = await supabase
    .from('ont_path_step')
    .select('*, concept:ont_concept(concept_id, name, level, difficulty, description)')
    .eq('path_id', pathId)
    .order('step_order')

  return {
    ...path,
    steps: steps || [],
  }
}

export async function getLevelStats() {
  const { data, error } = await supabase
    .from('ont_concept')
    .select('level')

  if (error) throw error

  const stats: Record<string, number> = {}
  ;(data || []).forEach((c: any) => {
    const lv = c.level || '미분류'
    stats[lv] = (stats[lv] || 0) + 1
  })

  return Object.entries(stats).map(([level, count]) => ({ level, count }))
}

// ============================================================
// WRITE — YouTube 대본 파이프라인
// ============================================================

export async function insertYoutubeVideo(data: {
  video_id?: string
  channel_name?: string
  title: string
  transcript: string
  published_at?: string
  view_count?: number
}) {
  const { data: result, error } = await supabase
    .from('ont_youtube')
    .insert([{
      video_id: data.video_id || null,
      channel_name: data.channel_name || null,
      title: data.title,
      transcript: data.transcript,
      published_at: data.published_at || null,
      view_count: data.view_count || null,
    }])
    .select()
    .single()

  if (error) throw error
  return result
}

export async function insertYoutubeConceptMappings(
  mappings: Array<{
    youtube_id: number
    concept_id: number
    relevance: number
    timestamp_start?: number
    timestamp_end?: number
  }>
) {
  if (mappings.length === 0) return []

  const { data, error } = await supabase
    .from('ont_youtube_concept')
    .insert(mappings)
    .select()

  if (error) throw error
  return data
}

export async function getYoutubeVideos(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('ont_youtube')
    .select('youtube_id, video_id, channel_name, title, published_at, view_count, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // 각 비디오의 매핑 수 조회
  const youtubeIds = (data || []).map((v: any) => v.youtube_id)
  let mappingCounts: Record<number, number> = {}

  if (youtubeIds.length > 0) {
    const { data: mappings } = await supabase
      .from('ont_youtube_concept')
      .select('youtube_id')
      .in('youtube_id', youtubeIds)

    ;(mappings || []).forEach((m: any) => {
      mappingCounts[m.youtube_id] = (mappingCounts[m.youtube_id] || 0) + 1
    })
  }

  return {
    videos: (data || []).map((v: any) => ({
      ...v,
      mapped_concepts_count: mappingCounts[v.youtube_id] || 0,
    })),
    total: count || 0,
    page,
    limit,
  }
}

export async function getYoutubeVideoDetail(youtubeId: number) {
  const { data: video, error: videoErr } = await supabase
    .from('ont_youtube')
    .select('*')
    .eq('youtube_id', youtubeId)
    .single()

  if (videoErr) throw videoErr

  const { data: mappings } = await supabase
    .from('ont_youtube_concept')
    .select('*, concept:ont_concept(concept_id, name, level, domain_id)')
    .eq('youtube_id', youtubeId)
    .order('relevance', { ascending: false })

  return {
    ...video,
    mappings: mappings || [],
  }
}

export async function deleteYoutubeVideo(youtubeId: number) {
  // 먼저 매핑 삭제
  await supabase
    .from('ont_youtube_concept')
    .delete()
    .eq('youtube_id', youtubeId)

  // 비디오 삭제
  const { error } = await supabase
    .from('ont_youtube')
    .delete()
    .eq('youtube_id', youtubeId)

  if (error) throw error
  return { success: true }
}

// ============================================================
// 전문가 강조도 (Concept Importance)
// ============================================================

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
  }>
  rank_overall?: number | null
  rank_in_domain?: number | null
  concept_name?: string
  domain_id?: number
  domain_name?: string
  domain_color?: string
  level?: string
}

export interface LectureAnalysisRecord {
  analysis_id?: number
  youtube_id: number
  lecture_type: string
  lecture_type_scores: { [key: string]: number }
  structure: any[]
  case_references: any[]
  case_count?: number
  expert_name?: string
  total_segments?: number
  hooking_ratio?: number
  information_ratio?: number
  case_ratio?: number
  cta_ratio?: number
}

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
    description?: string
    duration_min: number
    type: string
  }>
  theory_points: string[]
  case_study_refs: any[]
  recommended_duration: number
  expert_sources: Array<{ channel_name: string; relevance: number }>
  difficulty_score?: number
  prerequisite_concepts?: Array<{ concept_id: number; name: string }>
}

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
  coverage_matrix: Record<string, Record<string, { total: number; covered: number; rate: number }>>
}

export async function getConceptImportance(
  domainId?: number,
  level?: string,
  limit: number = 50
): Promise<ConceptImportance[]> {
  // Stage 1: get importance data
  const { data: importanceData, error: impErr } = await supabase
    .from('ont_concept_importance')
    .select('*')
    .order('expert_count', { ascending: false })

  if (impErr) throw impErr
  if (!importanceData || importanceData.length === 0) return []

  // Stage 2: get concept + domain info
  const conceptIds = importanceData.map((i: any) => i.concept_id)
  let conceptQuery = supabase
    .from('ont_concept')
    .select('concept_id, name, level, domain_id')
    .in('concept_id', conceptIds)

  if (level) conceptQuery = conceptQuery.eq('level', level)
  if (domainId) conceptQuery = conceptQuery.eq('domain_id', domainId)

  const { data: concepts } = await conceptQuery
  const conceptMap = new Map((concepts || []).map((c: any) => [c.concept_id, c]))

  const { data: domains } = await supabase.from('ont_domain').select('domain_id, name, color')
  const domainMap = new Map((domains || []).map((d: any) => [d.domain_id, d]))

  // merge and filter
  const result: ConceptImportance[] = []
  for (const imp of importanceData) {
    const concept = conceptMap.get(imp.concept_id)
    if (!concept) continue // filtered out by level/domain

    const domain = domainMap.get(concept.domain_id)
    result.push({
      ...imp,
      concept_name: concept.name,
      domain_id: concept.domain_id,
      domain_name: domain?.name || '',
      domain_color: domain?.color || '#888',
      level: concept.level,
    })
  }

  return result.slice(0, limit)
}

export async function recalculateAllImportance(): Promise<{ updated: number }> {
  // Aggregate from ont_youtube_concept JOIN ont_youtube
  const { data: mappings, error: mapErr } = await supabase
    .from('ont_youtube_concept')
    .select('concept_id, relevance, youtube_id, youtube:ont_youtube(title, channel_name)')

  if (mapErr) throw mapErr
  if (!mappings || mappings.length === 0) return { updated: 0 }

  // Group by concept_id
  const conceptGroups = new Map<number, Array<{
    relevance: number
    youtube_id: number
    video_title: string
    channel_name: string
  }>>()

  for (const m of mappings) {
    const yt = m.youtube as any
    const group = conceptGroups.get(m.concept_id) || []
    group.push({
      relevance: m.relevance,
      youtube_id: m.youtube_id,
      video_title: yt?.title || '',
      channel_name: yt?.channel_name || '',
    })
    conceptGroups.set(m.concept_id, group)
  }

  // Calculate importance for each concept
  let updated = 0
  for (const [conceptId, entries] of conceptGroups) {
    const channels = new Set(entries.map(e => e.channel_name).filter(Boolean))
    const videoIds = new Set(entries.map(e => e.youtube_id))
    const relevances = entries.map(e => e.relevance)
    const totalSum = relevances.reduce((a, b) => a + b, 0)
    const avgRel = totalSum / relevances.length
    const maxRel = Math.max(...relevances)

    const experts = entries.map(e => ({
      channel_name: e.channel_name,
      youtube_id: e.youtube_id,
      video_title: e.video_title,
      relevance: e.relevance,
    }))

    // UPSERT
    const { error } = await supabase
      .from('ont_concept_importance')
      .upsert({
        concept_id: conceptId,
        expert_count: channels.size,
        video_count: videoIds.size,
        total_relevance_sum: Math.round(totalSum * 1000) / 1000,
        avg_relevance: Math.round(avgRel * 1000) / 1000,
        max_relevance: Math.round(maxRel * 1000) / 1000,
        experts,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'concept_id' })

    if (!error) updated++
  }

  // Calculate ranks (overall)
  const { data: allImportance } = await supabase
    .from('ont_concept_importance')
    .select('id, concept_id, expert_count, avg_relevance')
    .order('expert_count', { ascending: false })
    .order('avg_relevance', { ascending: false })

  if (allImportance) {
    const CHUNK = 50
    for (let i = 0; i < allImportance.length; i += CHUNK) {
      const chunk = allImportance.slice(i, i + CHUNK)
      await Promise.all(chunk.map((item, idx) =>
        supabase
          .from('ont_concept_importance')
          .update({ rank_overall: i + idx + 1 })
          .eq('id', item.id)
      ))
    }
  }

  return { updated }
}

// ============================================================
// 강의 분석 (Lecture Analysis)
// ============================================================

export async function upsertLectureAnalysis(data: LectureAnalysisRecord): Promise<void> {
  const { error } = await supabase
    .from('ont_lecture_analysis')
    .upsert({
      youtube_id: data.youtube_id,
      lecture_type: data.lecture_type,
      lecture_type_scores: data.lecture_type_scores,
      structure: data.structure,
      case_references: data.case_references,
      expert_name: data.expert_name || null,
      total_segments: data.total_segments || data.structure.length,
      hooking_ratio: data.hooking_ratio || 0,
      information_ratio: data.information_ratio || 0,
      case_ratio: data.case_ratio || 0,
      cta_ratio: data.cta_ratio || 0,
      case_count: data.case_count || data.case_references.length,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: 'youtube_id' })

  if (error) throw error
}

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
      expert_name: data.expert_name || null,
    })
    .eq('youtube_id', youtubeId)

  if (error) throw error
}

export async function getLectureAnalyses(filters?: {
  lecture_type?: string
}): Promise<LectureAnalysisRecord[]> {
  let query = supabase
    .from('ont_lecture_analysis')
    .select('*')
    .order('analyzed_at', { ascending: false })

  if (filters?.lecture_type) query = query.eq('lecture_type', filters.lecture_type)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// 강의 캡슐 (Lecture Capsule)
// ============================================================

export async function getLectureCapsules(filters?: {
  concept_id?: number
  level?: string
  domain_id?: number
}): Promise<LectureCapsuleRecord[]> {
  let query = supabase
    .from('ont_lecture_capsule')
    .select('*')
    .order('generated_at', { ascending: false })

  if (filters?.concept_id) query = query.eq('concept_id', filters.concept_id)
  if (filters?.level) query = query.eq('level', filters.level)

  const { data, error } = await query
  if (error) throw error

  // if domain_id filter, need to cross-check via concept
  if (filters?.domain_id && data) {
    const conceptIds = data.map((c: any) => c.concept_id)
    if (conceptIds.length > 0) {
      const { data: concepts } = await supabase
        .from('ont_concept')
        .select('concept_id')
        .in('concept_id', conceptIds)
        .eq('domain_id', filters.domain_id)
      const validIds = new Set((concepts || []).map((c: any) => c.concept_id))
      return data.filter((c: any) => validIds.has(c.concept_id))
    }
  }

  return data || []
}

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
      expert_sources: data.expert_sources,
      difficulty_score: data.difficulty_score || 0,
      prerequisite_concepts: data.prerequisite_concepts || [],
      generated_at: new Date().toISOString(),
    }, { onConflict: 'concept_id,level' })

  if (error) throw error
}

// Level-specific teaching guidelines templates
const TEACHING_GUIDELINES: Record<string, string> = {
  '왕초보': '- 전문 용어를 쉽게 풀어서 설명\n- 실생활 비유를 많이 활용\n- 단계적 설명으로 개념을 천천히 쌓아가기\n- 퀴즈와 요약으로 이해도 확인',
  '초보': '- 기본 용어를 사용하되 처음 등장 시 설명 추가\n- 간단한 사례와 예시 적극 활용\n- 핵심 개념 간 연결관계 강조\n- 실습 가이드 제공',
  '중급': '- 전문 용어 자유 사용\n- 실전 사례 중심 교육\n- 개념 간 심화 연결 분석\n- 체크리스트와 실무 팁 제공',
  '고급': '- 고급 전략과 리스크 관리 중심\n- 복잡한 실전 사례 심층 분석\n- 법률 해석과 판례 연구\n- 포트폴리오 관점의 통합 전략',
  '전문가': '- 시장 분석과 투자 전략 수립\n- 법률/세무 심화 해석\n- 다중 투자 포트폴리오 관리\n- 최신 트렌드와 규제 변화 대응',
}

export async function generateCapsuleFromData(conceptId: number): Promise<LectureCapsuleRecord> {
  // 1. concept info
  const { data: concept, error: cErr } = await supabase
    .from('ont_concept')
    .select('*')
    .eq('concept_id', conceptId)
    .single()
  if (cErr) throw cErr

  // 2. prerequisite relations
  const { data: prereqs } = await supabase
    .from('ont_relation')
    .select('source_concept_id, source:ont_concept!source_concept_id(concept_id, name)')
    .eq('target_concept_id', conceptId)
    .eq('relation_type', 'prerequisite')

  const prerequisite_concepts = (prereqs || []).map((r: any) => ({
    concept_id: r.source?.concept_id || r.source_concept_id,
    name: r.source?.name || '',
  }))

  // 3. related videos + relevance
  const { data: videoLinks } = await supabase
    .from('ont_youtube_concept')
    .select('relevance, youtube:ont_youtube(youtube_id, title, channel_name)')
    .eq('concept_id', conceptId)
    .order('relevance', { ascending: false })

  // 4. importance data
  const { data: importance } = await supabase
    .from('ont_concept_importance')
    .select('*')
    .eq('concept_id', conceptId)
    .maybeSingle()

  // 5. case references from related video analyses
  const videoIds = (videoLinks || []).map((vl: any) => vl.youtube?.youtube_id).filter(Boolean)
  let caseRefs: any[] = []
  if (videoIds.length > 0) {
    const { data: analyses } = await supabase
      .from('ont_lecture_analysis')
      .select('case_references')
      .in('youtube_id', videoIds)

    for (const a of (analyses || [])) {
      if (a.case_references && Array.isArray(a.case_references)) {
        caseRefs.push(...a.case_references)
      }
    }
  }

  // Build capsule
  const keywords = concept.keywords || []
  const level = concept.level || '왕초보'
  const duration = concept.estimated_minutes || 30

  // --- Case study refs: sort by relevance, dedup by type+number ---
  const seenCaseKeys = new Set<string>()
  const dedupedCaseRefs = caseRefs
    .sort((a: any, b: any) => (b.relevance ?? 0) - (a.relevance ?? 0))
    .filter((ref: any) => {
      const key = `${ref.type || ''}:${ref.number || ref.label || ''}`
      if (seenCaseKeys.has(key)) return false
      seenCaseKeys.add(key)
      return true
    })
    .slice(0, 10)

  // --- Expert sources: group by channel, keep max relevance, sort ---
  const expertMap = new Map<string, number>()
  for (const vl of (videoLinks || [])) {
    const ch = (vl as any).youtube?.channel_name
    if (!ch) continue
    const prev = expertMap.get(ch) ?? 0
    expertMap.set(ch, Math.max(prev, vl.relevance ?? 0))
  }
  const expert_sources: LectureCapsuleRecord['expert_sources'] = Array.from(expertMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([channel_name, relevance]) => ({ channel_name, relevance }))

  // --- Theory points: level-specific framing + prereq ---
  const theory_points: string[] = []
  const LEVEL_FRAME: Record<string, string> = {
    '왕초보': '정의',
    '초급': '기본 개념',
    '중급': '활용 방법',
    '고급': '심화 분석',
    '전문가': '전략적 관점',
  }
  const frame = LEVEL_FRAME[level] || '핵심 내용'

  if (concept.description) {
    theory_points.push(concept.description)
  }
  for (const kw of keywords.slice(0, 8)) {
    theory_points.push(`${kw}: ${concept.name}의 ${frame}`)
  }
  if (prerequisite_concepts.length > 0) {
    theory_points.push(`선수 개념: ${prerequisite_concepts.map((p: any) => p.name).join(', ')}`)
  }

  // --- Syllabus: richer structure ---
  const syllabus: LectureCapsuleRecord['syllabus'] = []
  let order = 1

  // prereq review (if any)
  if (prerequisite_concepts.length > 0) {
    syllabus.push({
      order: order++,
      topic: '선수 개념 리뷰',
      description: `${prerequisite_concepts.map((p: any) => p.name).join(', ')} 핵심 복습`,
      duration_min: Math.max(3, Math.round(duration * 0.08)),
      type: 'theory',
    })
  }

  // intro with learning objectives
  syllabus.push({
    order: order++,
    topic: `${concept.name} 개요`,
    description: `학습목표: ${concept.name}의 ${frame}을 이해하고 실무에 적용할 수 있다`,
    duration_min: Math.max(5, Math.round(duration * 0.12)),
    type: 'theory',
  })

  // keyword-based topics
  const topicKeywords = keywords.slice(0, 5)
  for (const kw of topicKeywords) {
    syllabus.push({
      order: order++,
      topic: kw,
      description: `${kw} 상세 학습`,
      duration_min: Math.max(5, Math.round(duration / (topicKeywords.length + 4))),
      type: 'theory',
    })
  }

  // case study (if case refs exist)
  if (dedupedCaseRefs.length > 0) {
    syllabus.push({
      order: order++,
      topic: '실전 사례 분석',
      description: `${dedupedCaseRefs.length}건의 실제 사례 분석`,
      duration_min: Math.max(5, Math.round(duration * 0.2)),
      type: 'case',
    })
  }

  // Q&A / self-check
  syllabus.push({
    order: order++,
    topic: '자가점검 Q&A',
    description: `${concept.name} 핵심 체크리스트 & 자가 진단`,
    duration_min: Math.max(3, Math.round(duration * 0.08)),
    type: 'summary',
  })

  // summary
  syllabus.push({
    order: order++,
    topic: '핵심 정리',
    description: '학습 내용 요약 및 다음 단계 안내',
    duration_min: Math.max(3, Math.round(duration * 0.1)),
    type: 'summary',
  })

  return {
    concept_id: conceptId,
    level,
    capsule_title: concept.lecture_title || `${concept.name} 강의`,
    overview: [concept.description, concept.lecture_content?.slice(0, 200)].filter(Boolean).join('\n\n') || `${concept.name}에 대한 체계적인 강의입니다.`,
    teaching_guidelines: TEACHING_GUIDELINES[level] || TEACHING_GUIDELINES['중급'],
    syllabus,
    theory_points,
    case_study_refs: dedupedCaseRefs,
    recommended_duration: duration,
    expert_sources,
    difficulty_score: concept.difficulty || 1,
    prerequisite_concepts,
  }
}

// ============================================================
// 대시보드 통계
// ============================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  // parallel queries
  const [
    conceptsRes,
    videosRes,
    mappingsRes,
    domainsRes,
    importanceRes,
    analysesRes,
  ] = await Promise.all([
    supabase.from('ont_concept').select('concept_id, domain_id, level, estimated_minutes'),
    supabase.from('ont_youtube').select('youtube_id, channel_name'),
    supabase.from('ont_youtube_concept').select('concept_id, youtube_id'),
    supabase.from('ont_domain').select('domain_id, name, color').order('sort_order'),
    supabase.from('ont_concept_importance').select('*').order('expert_count', { ascending: false }).limit(20),
    supabase.from('ont_lecture_analysis').select('lecture_type, hooking_ratio, information_ratio, case_ratio, cta_ratio'),
  ])

  const concepts = conceptsRes.data || []
  const videos = videosRes.data || []
  const mappings = mappingsRes.data || []
  const domains = domainsRes.data || []
  const topImportance = importanceRes.data || []
  const analyses = analysesRes.data || []

  const coveredConcepts = new Set(mappings.map((m: any) => m.concept_id))
  const experts = new Set(videos.map((v: any) => v.channel_name).filter(Boolean))

  // domain stats
  const domain_stats = domains.map((d: any) => {
    const domainConcepts = concepts.filter((c: any) => c.domain_id === d.domain_id)
    const covered = domainConcepts.filter((c: any) => coveredConcepts.has(c.concept_id))
    return {
      domain_id: d.domain_id,
      domain_name: d.name,
      color: d.color,
      concept_count: domainConcepts.length,
      covered_count: covered.length,
      coverage_rate: domainConcepts.length > 0 ? Math.round((covered.length / domainConcepts.length) * 100) : 0,
      avg_importance: 0, // will be calculated separately if importance data exists
    }
  })

  // level stats
  const levelOrder = ['왕초보', '초보', '중급', '고급', '전문가']
  const level_stats = levelOrder.map(level => {
    const levelConcepts = concepts.filter((c: any) => c.level === level)
    const covered = levelConcepts.filter((c: any) => coveredConcepts.has(c.concept_id))
    return {
      level,
      concept_count: levelConcepts.length,
      covered_count: covered.length,
      coverage_rate: levelConcepts.length > 0 ? Math.round((covered.length / levelConcepts.length) * 100) : 0,
    }
  })

  // lecture type distribution
  const lecture_type_distribution: Record<string, number> = {}
  for (const a of analyses) {
    lecture_type_distribution[a.lecture_type] = (lecture_type_distribution[a.lecture_type] || 0) + 1
  }

  // expert list
  const expertMap = new Map<string, { video_count: number; concepts: Set<number> }>()
  for (const v of videos) {
    if (!v.channel_name) continue
    const existing = expertMap.get(v.channel_name) || { video_count: 0, concepts: new Set() }
    existing.video_count++
    expertMap.set(v.channel_name, existing)
  }
  for (const m of mappings) {
    const video = videos.find((v: any) => v.youtube_id === m.youtube_id)
    if (video?.channel_name) {
      expertMap.get(video.channel_name)?.concepts.add(m.concept_id)
    }
  }
  const expert_list = Array.from(expertMap.entries()).map(([name, data]) => ({
    channel_name: name,
    video_count: data.video_count,
    concept_count: data.concepts.size,
  }))

  // structure templates
  const typeGroups = new Map<string, Array<any>>()
  for (const a of analyses) {
    const group = typeGroups.get(a.lecture_type) || []
    group.push(a)
    typeGroups.set(a.lecture_type, group)
  }
  const structure_templates = Array.from(typeGroups.entries()).map(([type, items]) => ({
    lecture_type: type,
    avg_hooking: Math.round(items.reduce((s: number, i: any) => s + (i.hooking_ratio || 0), 0) / items.length * 100) / 100,
    avg_information: Math.round(items.reduce((s: number, i: any) => s + (i.information_ratio || 0), 0) / items.length * 100) / 100,
    avg_case: Math.round(items.reduce((s: number, i: any) => s + (i.case_ratio || 0), 0) / items.length * 100) / 100,
    avg_cta: Math.round(items.reduce((s: number, i: any) => s + (i.cta_ratio || 0), 0) / items.length * 100) / 100,
    sample_count: items.length,
  }))

  // top concepts with concept info
  const conceptMap = new Map(concepts.map((c: any) => [c.concept_id, c]))
  const domainMap = new Map(domains.map((d: any) => [d.domain_id, d]))
  const top_concepts: ConceptImportance[] = topImportance.map((imp: any) => {
    const c = conceptMap.get(imp.concept_id)
    const d = c ? domainMap.get(c.domain_id) : null
    return {
      ...imp,
      concept_name: c?.name || '',
      domain_id: c?.domain_id,
      domain_name: d?.name || '',
      domain_color: d?.color || '#888',
      level: c?.level || '',
    }
  })

  // coverage matrix: domain × level cross-tabulation
  const coverage_matrix: Record<string, Record<string, { total: number; covered: number; rate: number }>> = {}
  for (const d of domains) {
    coverage_matrix[d.domain_id] = {}
    for (const level of levelOrder) {
      const matching = concepts.filter((c: any) => c.domain_id === d.domain_id && c.level === level)
      const covered = matching.filter((c: any) => coveredConcepts.has(c.concept_id))
      coverage_matrix[d.domain_id][level] = {
        total: matching.length,
        covered: covered.length,
        rate: matching.length > 0 ? Math.round((covered.length / matching.length) * 100) : 0,
      }
    }
  }

  return {
    total_concepts: concepts.length,
    total_videos: videos.length,
    total_mappings: mappings.length,
    total_experts: experts.size,
    coverage_rate: concepts.length > 0 ? Math.round((coveredConcepts.size / concepts.length) * 100) : 0,
    domain_stats,
    level_stats,
    top_concepts,
    lecture_type_distribution,
    expert_list,
    structure_templates,
    coverage_matrix,
  }
}

// ============================================================
// 그래프 데이터 강화 (with importance)
// ============================================================

export async function getGraphDataWithImportance(domainId?: number, level?: string) {
  const baseGraph = await getGraphData(domainId, level)

  // get importance data for all nodes
  const nodeIds = baseGraph.nodes.map((n: any) => n.id)
  if (nodeIds.length === 0) return { ...baseGraph, nodes: [], edges: [] }

  const { data: importanceData } = await supabase
    .from('ont_concept_importance')
    .select('concept_id, avg_relevance, expert_count, video_count, rank_overall')
    .in('concept_id', nodeIds)

  const impMap = new Map((importanceData || []).map((i: any) => [i.concept_id, i]))

  // Atomic capsule counts per concept
  let atomicCountMap = new Map<number, number>()
  try {
    const { data: atomicCounts } = await supabase
      .from('ont_atomic_capsule')
      .select('concept_id')
      .in('concept_id', nodeIds)
    if (atomicCounts) {
      for (const a of atomicCounts) {
        atomicCountMap.set(a.concept_id, (atomicCountMap.get(a.concept_id) || 0) + 1)
      }
    }
  } catch {}

  const enhancedNodes = baseGraph.nodes.map((node: any) => {
    const imp = impMap.get(node.id)
    return {
      ...node,
      importance_score: imp?.avg_relevance || 0,
      expert_count: imp?.expert_count || 0,
      video_count: imp?.video_count || 0,
      rank_overall: imp?.rank_overall || null,
      atomic_count: atomicCountMap.get(node.id) || 0,
    }
  })

  return { nodes: enhancedNodes, edges: baseGraph.edges }
}

export async function getYoutubeStats() {
  const { count: totalVideos } = await supabase
    .from('ont_youtube')
    .select('*', { count: 'exact', head: true })

  const { data: mappings } = await supabase
    .from('ont_youtube_concept')
    .select('concept_id')

  const uniqueConcepts = new Set((mappings || []).map((m: any) => m.concept_id))

  const { count: totalConcepts } = await supabase
    .from('ont_concept')
    .select('*', { count: 'exact', head: true })

  return {
    total_videos: totalVideos || 0,
    total_mappings: (mappings || []).length,
    covered_concepts: uniqueConcepts.size,
    total_concepts: totalConcepts || 0,
    coverage_rate: totalConcepts
      ? Math.round((uniqueConcepts.size / totalConcepts) * 100)
      : 0,
  }
}

// ── Check duplicate YouTube video ──
export async function checkYoutubeDuplicate(videoId: string): Promise<{ exists: boolean; youtube_id?: number; title?: string }> {
  const { data } = await supabase
    .from('ont_youtube')
    .select('youtube_id, title')
    .eq('video_id', videoId)
    .limit(1)
  if (data && data.length > 0) {
    return { exists: true, youtube_id: data[0].youtube_id, title: data[0].title }
  }
  return { exists: false }
}

// ============================================================
// Phase 5-0B: 온톨로지 그래프 데이터 조회 함수
// ============================================================

import type { ConceptOntologyContext, LevelOntologyOverview, RelatedTranscript } from './ebook-types'

/** 과정(레벨)별 온톨로지 개요 */
export async function getLevelOntologyOverview(level: string): Promise<LevelOntologyOverview> {
  // 1. 해당 레벨의 개념들
  const { data: concepts } = await supabase
    .from('ont_concept')
    .select('concept_id, domain_id, difficulty, estimated_minutes')
    .eq('level', level)

  const conceptIds = (concepts || []).map((c: any) => c.concept_id)

  // 2. 도메인 분포
  const { data: domains } = await supabase
    .from('ont_domain')
    .select('domain_id, name, color')

  const domainMap = new Map((domains || []).map((d: any) => [d.domain_id, d]))
  const domainCount: Record<number, number> = {}
  for (const c of (concepts || [])) {
    domainCount[c.domain_id] = (domainCount[c.domain_id] || 0) + 1
  }

  const domain_distribution = Object.entries(domainCount).map(([dId, count]) => {
    const d = domainMap.get(Number(dId))
    return {
      domain_name: d?.name || '',
      concept_count: count,
      color: d?.color || '#888',
    }
  }).sort((a, b) => b.concept_count - a.concept_count)

  // 3. 총 학습시간, 평균 난이도
  const total_hours = Math.round(
    (concepts || []).reduce((sum: number, c: any) => sum + (c.estimated_minutes || 30), 0) / 60 * 10
  ) / 10
  const avg_difficulty = concepts && concepts.length > 0
    ? Math.round((concepts.reduce((sum: number, c: any) => sum + (c.difficulty || 1), 0) / concepts.length) * 10) / 10
    : 1

  // 4. 전문가 수
  let expert_count = 0
  if (conceptIds.length > 0) {
    const { data: importance } = await supabase
      .from('ont_concept_importance')
      .select('experts')
      .in('concept_id', conceptIds)

    const allChannels = new Set<string>()
    for (const imp of (importance || [])) {
      if (Array.isArray(imp.experts)) {
        for (const e of imp.experts) {
          if (e.channel_name) allChannels.add(e.channel_name)
        }
      }
    }
    expert_count = allChannels.size
  }

  // 5. 개념 간 관계 그래프
  let concept_graph: LevelOntologyOverview['concept_graph'] = []
  if (conceptIds.length > 0) {
    const { data: relations } = await supabase
      .from('ont_relation')
      .select('source_concept_id, target_concept_id, relation_type')
      .in('source_concept_id', conceptIds)
      .in('target_concept_id', conceptIds)

    // 개념명 매핑
    const { data: conceptNames } = await supabase
      .from('ont_concept')
      .select('concept_id, name')
      .in('concept_id', conceptIds)

    const nameMap = new Map((conceptNames || []).map((c: any) => [c.concept_id, c.name]))

    concept_graph = (relations || []).map((r: any) => ({
      source_concept_id: r.source_concept_id,
      target_concept_id: r.target_concept_id,
      source_concept: nameMap.get(r.source_concept_id) || '',
      target_concept: nameMap.get(r.target_concept_id) || '',
      relation_type: r.relation_type as 'prerequisite' | 'partOf' | 'related',
    }))
  }

  return {
    total_concepts: conceptIds.length,
    domain_distribution,
    total_hours,
    expert_count,
    avg_difficulty,
    concept_graph,
  }
}

/** 캡슐/개념별 온톨로지 컨텍스트 */
export async function getConceptOntologyContext(conceptId: number): Promise<ConceptOntologyContext> {
  // 1. 중요도 + 영상 수
  const { data: importance } = await supabase
    .from('ont_concept_importance')
    .select('expert_count, video_count, avg_relevance, experts')
    .eq('concept_id', conceptId)
    .maybeSingle()

  // 2. 개념 정보 (키워드, 레벨)
  const { data: concept } = await supabase
    .from('ont_concept')
    .select('name, level, keywords')
    .eq('concept_id', conceptId)
    .single()

  // 3. 선수 관계 (prerequisite → 나)
  const { data: prereqRels } = await supabase
    .from('ont_relation')
    .select('source_concept_id, source:ont_concept!source_concept_id(concept_id, name)')
    .eq('target_concept_id', conceptId)
    .eq('relation_type', 'prerequisite')

  const prerequisites = (prereqRels || []).map((r: any) => ({
    concept_id: r.source?.concept_id || r.source_concept_id,
    name: r.source?.name || '',
  }))

  // 4. 후속 관계 (나 → prerequisite로 가는 타겟)
  const { data: succRels } = await supabase
    .from('ont_relation')
    .select('target_concept_id, target:ont_concept!target_concept_id(concept_id, name)')
    .eq('source_concept_id', conceptId)
    .eq('relation_type', 'prerequisite')

  const successors = (succRels || []).map((r: any) => ({
    concept_id: r.target?.concept_id || r.target_concept_id,
    name: r.target?.name || '',
  }))

  // 5. 연관 관계
  const { data: relatedOut } = await supabase
    .from('ont_relation')
    .select('target_concept_id, target:ont_concept!target_concept_id(concept_id, name)')
    .eq('source_concept_id', conceptId)
    .eq('relation_type', 'related')

  const related = (relatedOut || []).map((r: any) => ({
    concept_id: r.target?.concept_id || r.target_concept_id,
    name: r.target?.name || '',
  }))

  // 6. 강의 분석 비율 (이론/사례/실습)
  const { data: videoLinks } = await supabase
    .from('ont_youtube_concept')
    .select('youtube_id')
    .eq('concept_id', conceptId)

  const videoIds = (videoLinks || []).map((v: any) => v.youtube_id)
  let lecture_type_ratio = { theory: 0, case_study: 0, practice: 0 }

  if (videoIds.length > 0) {
    const { data: analyses } = await supabase
      .from('ont_lecture_analysis')
      .select('lecture_type')
      .in('youtube_id', videoIds)

    const typeCounts: Record<string, number> = {}
    for (const a of (analyses || [])) {
      typeCounts[a.lecture_type] = (typeCounts[a.lecture_type] || 0) + 1
    }
    const total = Object.values(typeCounts).reduce((s, v) => s + v, 0) || 1
    lecture_type_ratio = {
      theory: Math.round((typeCounts['이론형'] || typeCounts['정보전달형'] || 0) / total * 100),
      case_study: Math.round((typeCounts['사례형'] || typeCounts['사례분석형'] || 0) / total * 100),
      practice: Math.round((typeCounts['실습형'] || typeCounts['혼합형'] || 0) / total * 100),
    }
  }

  // 7. 로드맵 위치
  const { data: pathStep } = await supabase
    .from('ont_path_step')
    .select('step_order, path_id, lecture_level, path:ont_path(level)')
    .eq('concept_id', conceptId)
    .limit(1)
    .maybeSingle()

  let roadmap_position = {
    level: concept?.level || '',
    order_in_level: 0,
    total_in_level: 0,
    lecture_level: 'L1',
  }

  if (pathStep) {
    const pathLevel = (pathStep as any).path?.level || concept?.level || ''
    // 같은 레벨 내 총 개수
    const { count } = await supabase
      .from('ont_path_step')
      .select('*', { count: 'exact', head: true })
      .eq('path_id', pathStep.path_id)

    roadmap_position = {
      level: pathLevel,
      order_in_level: pathStep.step_order || 0,
      total_in_level: count || 0,
      lecture_level: pathStep.lecture_level || 'L1',
    }
  }

  return {
    expert_count: importance?.expert_count || 0,
    video_count: importance?.video_count || 0,
    avg_relevance: importance?.avg_relevance || 0,
    lecture_type_ratio,
    keywords: concept?.keywords || [],
    prerequisites,
    successors,
    related,
    roadmap_position,
  }
}

/** 관련 대본 리스트 (강의안 관리자 큐레이션용) */
export async function getRelatedTranscripts(conceptId: number): Promise<RelatedTranscript[]> {
  // 1. concept에 매핑된 영상 조회
  const { data: videoLinks } = await supabase
    .from('ont_youtube_concept')
    .select('youtube_id, relevance, youtube:ont_youtube(youtube_id, video_id, title, channel_name)')
    .eq('concept_id', conceptId)
    .order('relevance', { ascending: false })

  if (!videoLinks || videoLinks.length === 0) return []

  const youtubeIds = videoLinks.map((vl: any) => vl.youtube_id)

  // 2. 강의 분석 데이터
  const { data: analyses } = await supabase
    .from('ont_lecture_analysis')
    .select('youtube_id, lecture_type, structure, case_references, hooking_ratio, information_ratio, case_ratio')
    .in('youtube_id', youtubeIds)

  const analysisMap = new Map((analyses || []).map((a: any) => [a.youtube_id, a]))

  // 3. 개념 키워드
  const { data: concept } = await supabase
    .from('ont_concept')
    .select('keywords')
    .eq('concept_id', conceptId)
    .single()

  return videoLinks.map((vl: any) => {
    const yt = vl.youtube as any
    const analysis = analysisMap.get(vl.youtube_id)

    return {
      youtube_id: vl.youtube_id,
      video_id: yt?.video_id || null,
      title: yt?.title || '',
      channel_name: yt?.channel_name || '',
      relevance: vl.relevance || 0,
      lecture_type: analysis?.lecture_type || '미분류',
      duration_min: 0, // ont_youtube에 duration 필드가 없으면 0
      segments: analysis?.structure || [],
      case_references: analysis?.case_references || [],
      key_topics: concept?.keywords?.slice(0, 5) || [],
    }
  })
}

// ============================================================
// Phase 5-0B: 이력/캐시 CRUD 함수
// ============================================================

/** 강의안 이력 저장 */
export async function saveLecturePlanHistory(data: {
  concept_id: number
  capsule_id?: number
  lecture_level: string
  target_duration_min: number
  section_count?: number
  emphasis_types: string[]
  additional_instructions?: string
  selected_youtube_ids: string[]
  ai_result: any
  ai_model?: string
  ai_cost_usd?: number
  created_by?: string
}): Promise<{ plan_id: number }> {
  // version 계산
  const { count } = await supabase
    .from('ont_lecture_plan_history')
    .select('*', { count: 'exact', head: true })
    .eq('concept_id', data.concept_id)

  const { data: result, error } = await supabase
    .from('ont_lecture_plan_history')
    .insert({
      ...data,
      emphasis_types: data.emphasis_types,
      selected_youtube_ids: data.selected_youtube_ids,
      version: (count || 0) + 1,
    })
    .select('plan_id')
    .single()

  if (error) throw error
  return { plan_id: result.plan_id }
}

/** 강의안 이력 조회 */
export async function getLecturePlanHistory(conceptId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('ont_lecture_plan_history')
    .select('*')
    .eq('concept_id', conceptId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/** 뉴스레터 이력 저장 */
export async function saveNewsletterHistory(data: {
  newsletter_type: string
  concept_id?: number
  capsule_id?: number
  title: string
  ai_content: any
  ontology_context?: any
  ai_model?: string
  ai_cost_usd?: number
}): Promise<{ newsletter_id: number }> {
  const { data: result, error } = await supabase
    .from('ont_newsletter_history')
    .insert(data)
    .select('newsletter_id')
    .single()

  if (error) throw error
  return { newsletter_id: result.newsletter_id }
}

/** 뉴스레터 이력 조회 (최근 N일) */
export async function getNewsletterHistory(days: number = 30): Promise<any[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('ont_newsletter_history')
    .select('*')
    .gte('sent_at', since.toISOString())
    .order('sent_at', { ascending: false })

  if (error) throw error
  return data || []
}

/** 뉴스레터 발송 상태 업데이트 */
export async function updateNewsletterStatus(
  newsletterId: number,
  status: 'sent' | 'failed',
  details?: { recipient_count?: number; error_message?: string }
): Promise<void> {
  const { error } = await supabase
    .from('ont_newsletter_history')
    .update({ status, ...details })
    .eq('newsletter_id', newsletterId)

  if (error) throw error
}

/** 최근 발송된 concept_id 목록 (중복 방지용) */
export async function getRecentNewsletterConceptIds(days: number = 30): Promise<number[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('ont_newsletter_history')
    .select('concept_id')
    .gte('sent_at', since.toISOString())
    .not('concept_id', 'is', null)

  return (data || []).map((d: any) => d.concept_id).filter(Boolean)
}

/** 전자책 캐시 조회 */
export async function getEbookCache(conceptId: number): Promise<any | null> {
  const { data } = await supabase
    .from('ont_ebook_cache')
    .select('*')
    .eq('concept_id', conceptId)
    .is('invalidated_at', null)
    .maybeSingle()

  return data || null
}

/** 전자책 캐시 저장 */
export async function saveEbookCache(data: {
  concept_id: number
  ai_content: any
  chapter_count: number
  total_chars: number
  ai_model?: string
  ai_cost_usd?: number
}): Promise<void> {
  const { error } = await supabase
    .from('ont_ebook_cache')
    .upsert({
      ...data,
      created_at: new Date().toISOString(),
      invalidated_at: null,
    }, { onConflict: 'concept_id' })

  if (error) throw error
}

/** 전자책 캐시 무효화 */
export async function invalidateEbookCache(conceptId: number): Promise<void> {
  const { error } = await supabase
    .from('ont_ebook_cache')
    .update({ invalidated_at: new Date().toISOString() })
    .eq('concept_id', conceptId)

  if (error) throw error
}
