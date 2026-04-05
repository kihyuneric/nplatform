import { supabase, getDashboardStats, getConceptOntologyContext, getLectureCapsules, getRecentNewsletterConceptIds, saveNewsletterHistory } from './ontology-db'
import { logger } from '@/lib/logger'
import { synthesizeDailyNewsletter, isAIAvailable } from './ai-synthesizer'
import type { NewsletterData, NewsletterType, NewsletterAIContent } from './ebook-types'

// Re-export types for backward compat
export type { NewsletterData, NewsletterType }

// Legacy interface (for old PDF generator)
export interface LegacyNewsletterData {
  generated_at: string
  period_start: string
  period_end: string
  domain_filter?: number
  trending_concepts: Array<{
    concept_name: string
    domain_name: string
    expert_count: number
    video_count: number
  }>
  new_analyses: Array<{
    video_title: string
    channel_name: string
    lecture_type: string
    concept_count: number
  }>
  coverage_update: {
    overall_rate: number
    domain_rates: Array<{ domain_name: string; rate: number }>
  }
  news_digest: Array<{
    title: string
    summary: string
    provider: string
    direction: string
    sentiment_score: number
    published_at: string
  }>
  featured_capsule?: {
    concept_id: number
    capsule_title: string
    level: string
    overview_snippet: string
  }
}

// ============================================================
// Phase 5-4: AI 뉴스레터 빌더
// ============================================================

/** 요일별 자동 유형 결정 */
function getAutoNewsletterType(dayOfWeek: number): NewsletterType {
  // 0=일, 1=월, ..., 6=토
  switch (dayOfWeek) {
    case 1: return 'daily_lesson'
    case 2: return 'case_study'
    case 3: return 'daily_lesson'
    case 4: return 'expert_compare'
    case 5: return 'learning_tip'
    case 6: return 'weekly_summary'
    case 0: return 'daily_lesson'
    default: return 'daily_lesson'
  }
}

/** AI 뉴스레터 빌드 (Phase 5-4 메인 함수) */
export async function buildDailyNewsletter(options?: {
  type?: NewsletterType
  concept_id?: number
  domain_id?: number
  theme?: string  // 자유 주제 (예: "경매 입찰 전략", "절세 방법")
}): Promise<NewsletterData> {
  const now = new Date()
  const type = options?.type || getAutoNewsletterType(now.getDay())
  const theme = options?.theme

  // 자유 주제(theme)가 있으면 캡슐 없이 AI로 직접 생성
  if (theme && isAIAvailable()) {
    const aiContent = await synthesizeDailyNewsletter({
      type,
      capsule: {
        capsule_id: 0, concept_id: 0, capsule_title: theme,
        level: '일반', overview: theme, teaching_guidelines: '',
        syllabus: [], theory_points: [], case_study_refs: [],
        recommended_duration: 30, expert_sources: [], prerequisite_concepts: [],
      } as any,
      videoData: [],
      ontologyContext: {
        expert_count: 0, video_count: 0, avg_relevance: 0,
        lecture_type_ratio: { theory: 60, case_study: 30, practice: 10 },
        keywords: [theme], prerequisites: [], successors: [], related: [],
        roadmap_position: { level: '일반', order_in_level: 0, total_in_level: 0, lecture_level: 'L1' },
      },
      theme,
    })

    return {
      generated_at: now.toISOString(),
      newsletter_type: type,
      title: aiContent.headline,
      ai_content: aiContent,
    }
  }

  // 1. 캡슐 선택
  let conceptId = options?.concept_id
  let capsule

  if (conceptId) {
    const capsules = await getLectureCapsules({ concept_id: conceptId })
    capsule = capsules[0]
  }

  if (!capsule) {
    // 최근 30일 발송한 concept 제외하고 중요도 순 선택
    const recentIds = await getRecentNewsletterConceptIds(30)

    let importanceQuery = supabase
      .from('ont_concept_importance')
      .select('concept_id, expert_count')
      .order('expert_count', { ascending: false })
      .limit(50)

    const { data: importanceList } = await importanceQuery

    // 최근 발송하지 않은 개념 찾기
    const available = (importanceList || []).filter(
      imp => !recentIds.includes(imp.concept_id)
    )

    if (available.length > 0) {
      // 도메인 필터 적용
      let selectedConceptId = available[0].concept_id

      if (options?.domain_id) {
        const { data: domainConcepts } = await supabase
          .from('ont_concept')
          .select('concept_id')
          .eq('domain_id', options.domain_id)

        const domainConceptIds = new Set((domainConcepts || []).map((c: any) => c.concept_id))
        const filtered = available.filter(a => domainConceptIds.has(a.concept_id))
        if (filtered.length > 0) selectedConceptId = filtered[0].concept_id
      }

      conceptId = selectedConceptId
      const capsules = await getLectureCapsules({ concept_id: conceptId })
      capsule = capsules[0]
    }

    // 폴백: 아무 캡슐이나
    if (!capsule) {
      const { data: anyCapsule } = await supabase
        .from('ont_lecture_capsule')
        .select('*')
        .limit(1)
        .single()
      capsule = anyCapsule
      conceptId = capsule?.concept_id
    }
  }

  if (!capsule || !conceptId) {
    // 데이터 없음 폴백
    return {
      generated_at: now.toISOString(),
      newsletter_type: type,
      title: '오늘의 부동산 학습',
      ai_content: {
        headline: '오늘의 부동산 학습',
        body: '현재 학습 콘텐츠를 준비 중입니다.',
        key_takeaways: [],
        call_to_action: 'NPLatform에서 더 많은 학습 콘텐츠를 확인하세요!',
      },
    }
  }

  // 2. 온톨로지 컨텍스트
  const ontologyContext = await getConceptOntologyContext(conceptId)

  // 3. 관련 영상 데이터
  const { data: videoLinks } = await supabase
    .from('ont_youtube_concept')
    .select('relevance, youtube:ont_youtube(youtube_id, title, channel_name, lecture_type)')
    .eq('concept_id', conceptId)
    .order('relevance', { ascending: false })
    .limit(10)

  const videoData = (videoLinks || []).map((vl: any) => ({
    ...vl.youtube,
    relevance: vl.relevance,
  }))

  // 4. AI 콘텐츠 생성
  let aiContent: NewsletterAIContent

  if (isAIAvailable()) {
    // 주간 요약용 데이터
    let weeklyData
    if (type === 'weekly_summary') {
      const { data: weekHistory } = await supabase
        .from('ont_newsletter_history')
        .select('concept_id')
        .gte('sent_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())

      weeklyData = {
        concepts_covered: new Set((weekHistory || []).map((h: any) => h.concept_id).filter(Boolean)).size,
        newsletters_sent: (weekHistory || []).length,
        trending: [],
      }
    }

    aiContent = await synthesizeDailyNewsletter({
      type,
      capsule,
      videoData,
      ontologyContext,
      weeklyData,
    })
  } else {
    aiContent = {
      headline: `오늘의 부동산 학습: ${capsule.capsule_title}`,
      body: capsule.overview || '',
      key_takeaways: capsule.theory_points?.slice(0, 3) || [],
      call_to_action: '더 자세한 내용은 NPLatform에서 확인하세요!',
    }
  }

  // 5. 관련 개념
  const relatedConcepts: Array<{ concept_name: string; domain_name: string }> = []
  const allRelated = [...ontologyContext.prerequisites, ...ontologyContext.successors, ...ontologyContext.related]
  if (allRelated.length > 0) {
    const relConceptIds = allRelated.map(r => r.concept_id)
    const { data: relConcepts } = await supabase
      .from('ont_concept')
      .select('name, domain_id')
      .in('concept_id', relConceptIds)

    const { data: domains } = await supabase.from('ont_domain').select('domain_id, name')
    const domainMap = new Map((domains || []).map((d: any) => [d.domain_id, d.name]))

    for (const rc of (relConcepts || []).slice(0, 5)) {
      relatedConcepts.push({
        concept_name: rc.name,
        domain_name: domainMap.get(rc.domain_id) || '',
      })
    }
  }

  // 5.5. Atomic 캡슐 보강 — 해당 개념에 Atomic 캡슐이 있으면 콘텐츠 보강
  let atomicSupplement = ''
  try {
    const { data: atomicCapsules } = await supabase
      .from('ont_atomic_capsule')
      .select('topic, description, content_json, difficulty')
      .eq('concept_id', conceptId)
      .order('order_in_concept')
      .limit(5)

    if (atomicCapsules && atomicCapsules.length > 0) {
      const highlights = atomicCapsules
        .filter((ac: any) => ac.content_json)
        .slice(0, 3)
        .map((ac: any) => {
          const c = ac.content_json
          return `[${ac.topic}] ${c?.definition?.plain?.slice(0, 100) || ac.description || ''}`
        })

      if (highlights.length > 0) {
        atomicSupplement = `\n\n📚 Atomic 캡슐 주요 학습 포인트:\n${highlights.join('\n')}`
      }

      // AI 콘텐츠 body에 Atomic 캡슐 하이라이트 추가
      if (atomicSupplement) {
        aiContent = {
          ...aiContent,
          body: aiContent.body + atomicSupplement,
          key_takeaways: [
            ...aiContent.key_takeaways,
            `이 개념은 ${atomicCapsules.length}개의 Atomic 캡슐로 구성되어 있습니다`,
          ],
        }
      }
    }
  } catch {
    // ont_atomic_capsule 없으면 무시
  }

  // 6. 결과 구성
  const result: NewsletterData = {
    generated_at: now.toISOString(),
    newsletter_type: type,
    title: aiContent.headline,
    target_capsule: {
      concept_id: conceptId,
      capsule_title: capsule.capsule_title,
      level: capsule.level,
      overview: capsule.overview?.slice(0, 200) || '',
      expert_count: ontologyContext.expert_count,
    },
    ontology_context: {
      keywords: ontologyContext.keywords.slice(0, 5),
      prerequisites: ontologyContext.prerequisites.map(p => p.name),
      successors: ontologyContext.successors.map(s => s.name),
      roadmap_position: ontologyContext.roadmap_position,
    },
    ai_content: aiContent,
    related_concepts: relatedConcepts,
    learning_path_position: {
      level: ontologyContext.roadmap_position.level,
      lecture_level: ontologyContext.roadmap_position.lecture_level,
      progress_hint: `${ontologyContext.roadmap_position.order_in_level}/${ontologyContext.roadmap_position.total_in_level} 강의`,
    },
  }

  // 7. 이력 저장
  try {
    await saveNewsletterHistory({
      newsletter_type: type,
      concept_id: conceptId,
      capsule_id: capsule.capsule_id,
      title: aiContent.headline,
      ai_content: aiContent,
      ontology_context: result.ontology_context,
      ai_model: isAIAvailable() ? 'claude-sonnet-4-20250514' : undefined,
      ai_cost_usd: isAIAvailable() ? 0.012 : 0,
    })
  } catch (err) {
    logger.error('[Newsletter] History save failed:', { error: err })
  }

  return result
}

// ============================================================
// Legacy buildNewsletterData (backward compat)
// ============================================================

export async function buildNewsletterData(options?: {
  domain_id?: number
  period_days?: number
}): Promise<LegacyNewsletterData> {
  const periodDays = options?.period_days || 7
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  const dashStats = await getDashboardStats()

  let importanceQuery = supabase
    .from('ont_concept_importance')
    .select('concept_id, expert_count, video_count, avg_relevance, rank_overall')
    .order('rank_overall', { ascending: true })
    .limit(10)

  const { data: importanceData } = await importanceQuery
  const trendingConceptIds = (importanceData || []).map(i => i.concept_id)
  let trendingConcepts: LegacyNewsletterData['trending_concepts'] = []

  if (trendingConceptIds.length > 0) {
    const { data: conceptsData } = await supabase
      .from('ont_concept')
      .select('concept_id, name, domain_id')
      .in('concept_id', trendingConceptIds)

    const { data: domainsData } = await supabase.from('ont_domain').select('domain_id, name')
    const domainMap = new Map((domainsData || []).map(d => [d.domain_id, d.name]))
    const conceptMap = new Map((conceptsData || []).map(c => [c.concept_id, c]))

    trendingConcepts = (importanceData || []).map(imp => {
      const concept = conceptMap.get(imp.concept_id)
      return {
        concept_name: concept?.name || `개념 ${imp.concept_id}`,
        domain_name: concept ? (domainMap.get(concept.domain_id) || '미분류') : '미분류',
        expert_count: imp.expert_count || 0,
        video_count: imp.video_count || 0,
      }
    })

    if (options?.domain_id) {
      const filteredIds = new Set(
        (conceptsData || []).filter(c => c.domain_id === options.domain_id).map(c => c.concept_id)
      )
      trendingConcepts = trendingConcepts.filter(tc => {
        const concept = (conceptsData || []).find(c => c.name === tc.concept_name)
        return concept && filteredIds.has(concept.concept_id)
      })
    }
  }

  const { data: recentYoutube } = await supabase
    .from('ont_youtube')
    .select('youtube_id, title, channel_name, lecture_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const newAnalyses: LegacyNewsletterData['new_analyses'] = []
  for (const yt of recentYoutube || []) {
    const { count } = await supabase
      .from('ont_youtube_concept')
      .select('*', { count: 'exact', head: true })
      .eq('youtube_id', yt.youtube_id)

    newAnalyses.push({
      video_title: yt.title,
      channel_name: yt.channel_name,
      lecture_type: yt.lecture_type || '미분류',
      concept_count: count || 0,
    })
  }

  let featuredCapsule: LegacyNewsletterData['featured_capsule'] = undefined
  const { data: capsules } = await supabase
    .from('ont_lecture_capsule')
    .select('concept_id, capsule_title, level, overview')
    .order('generated_at', { ascending: false })
    .limit(1)

  if (capsules && capsules.length > 0) {
    const c = capsules[0]
    featuredCapsule = {
      concept_id: c.concept_id,
      capsule_title: c.capsule_title,
      level: c.level,
      overview_snippet: (c.overview || '').slice(0, 150) + ((c.overview || '').length > 150 ? '...' : ''),
    }
  }

  const domainRates = (dashStats.domain_stats || []).map(d => ({
    domain_name: d.domain_name,
    rate: d.coverage_rate || 0,
  }))

  return {
    generated_at: now.toISOString().slice(0, 10),
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: now.toISOString().slice(0, 10),
    domain_filter: options?.domain_id,
    trending_concepts: trendingConcepts,
    new_analyses: newAnalyses,
    coverage_update: {
      overall_rate: dashStats.coverage_rate || 0,
      domain_rates: domainRates,
    },
    news_digest: [],
    featured_capsule: featuredCapsule,
  }
}
