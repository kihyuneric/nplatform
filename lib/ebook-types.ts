// Phase 5-1: 전자책 + AI 합성 공통 타입 정의

import { LectureCapsuleRecord } from './ontology-db'

// ============================================================
// 전자책 챕터 콘텐츠 구조 (3,000~5,000자)
// ============================================================

export interface EbookChapterContent {
  introduction: string          // 도입 (400~600자)
  core_explanation: string      // 핵심 개념 상세 설명 (800~1,200자)
  expert_comparison: string     // 전문가 관점 비교 (600~800자)
  practical_cases: string       // 실전 사례와 적용 (600~800자)
  application_guide: string     // 실전 적용 가이드 (400~600자)
  key_takeaways: string[]       // 핵심 정리 (3~5개)
}

// ============================================================
// 전자책 AI 생성 전체 콘텐츠
// ============================================================

export interface EbookAIContent {
  executive_summary: string                              // 종합 요약 (800~1,000자)
  chapter_contents: Record<string, EbookChapterContent>  // topic → 구조화된 챕터
  comprehensive_case_study: string                       // 종합 사례 연구 (1,500~2,000자)
  comparative_analysis: string                           // 전문가 비교 종합 (1,000~1,500자)
  learning_checklist: string[]                           // 학습 체크리스트 (10~15항목)
  self_assessment: string[]                              // 자기 진단 질문 (5개)
  next_steps: string                                     // 다음 학습 추천 (300자)
  ontology_summary: {
    expert_count: number
    video_count: number
    keywords: string[]
    prerequisites: string[]
    successors: string[]
  }
}

// ============================================================
// 강의안 AI 생성 결과
// ============================================================

export interface LecturePlanResult {
  ontology_summary: {
    selected_transcript_count: number
    total_available_count: number
    theory_ratio: number
    case_ratio: number
    core_keywords: string[]
  }
  lecture_goal: string
  target_description: string
  curriculum: Array<{
    time_range: string
    title: string
    content_type: 'opening' | 'theory' | 'case' | 'practice' | 'summary'
    teaching_notes: string
    key_points: string[]
    case_reference?: string
    slide_guide?: string
    expected_questions?: string[]
  }>
  total_duration_min: number
  supplementary_notes: string
}

// ============================================================
// AI 생성 상태 (UI 공통)
// ============================================================

export type GenerationStatus =
  | { state: 'idle' }
  | { state: 'loading'; progress?: string }
  | { state: 'success'; result: any; fromCache?: boolean }
  | { state: 'partial'; result: any; failedParts: string[] }
  | { state: 'fallback'; result: any; reason: string }
  | { state: 'error'; message: string; canRetry: boolean }

// ============================================================
// 온톨로지 컨텍스트 타입
// ============================================================

export interface ConceptOntologyContext {
  expert_count: number
  video_count: number
  avg_relevance: number
  lecture_type_ratio: { theory: number; case_study: number; practice: number }
  keywords: string[]
  prerequisites: Array<{ concept_id: number; name: string }>
  successors: Array<{ concept_id: number; name: string }>
  related: Array<{ concept_id: number; name: string }>
  roadmap_position: {
    level: string
    order_in_level: number
    total_in_level: number
    lecture_level: string
  }
}

export interface LevelOntologyOverview {
  total_concepts: number
  domain_distribution: Array<{ domain_name: string; concept_count: number; color: string }>
  total_hours: number
  expert_count: number
  avg_difficulty: number
  concept_graph: Array<{
    source_concept_id?: number
    target_concept_id?: number
    source_concept: string
    target_concept: string
    relation_type: 'prerequisite' | 'partOf' | 'related'
  }>
}

// ============================================================
// 관련 대본 (강의안 관리자 큐레이션용)
// ============================================================

export interface RelatedTranscript {
  youtube_id: number
  video_id: string | null
  title: string
  channel_name: string
  relevance: number
  lecture_type: string
  duration_min: number
  segments: any[]
  case_references: any[]
  key_topics: string[]
}

// ============================================================
// Enriched 캡슐 (AI 콘텐츠 포함)
// ============================================================

export interface EnrichedCapsule extends LectureCapsuleRecord {
  ai?: EbookAIContent
  ontologyContext?: ConceptOntologyContext
}

// ============================================================
// 뉴스레터 타입
// ============================================================

export type NewsletterType = 'daily_lesson' | 'case_study' | 'expert_compare' | 'learning_tip' | 'weekly_summary'

export interface NewsletterAIContent {
  headline: string
  body: string                     // 500~800자
  key_takeaways: string[]
  call_to_action: string
}

// ============================================================
// Atomic 캡슐 — Phase 6 신규 타입
// ============================================================

export interface AtomicCapsuleRecord {
  atomic_id: number
  concept_id: number
  capsule_id?: number
  sub_concept_id?: number
  topic: string
  description: string
  order_in_concept: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_min: number
  content_json: import('./web-enricher').AtomicCapsuleContent | null
  quiz_json: Array<{
    question: string
    options?: string[]
    answer: string
    explanation: string
  }> | null
  mastery_criteria: string[] | null
  web_sources: string[] | null
  generated_at: string
  ai_model: string | null
  generation_stage: string
}

export interface UserProgressRecord {
  progress_id: number
  user_id: string
  atomic_id: number
  concept_id: number
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered'
  quiz_score: number | null
  mastered_at: string | null
  last_studied: string
  study_count: number
  notes: string | null
}

// ============================================================
// 뉴스레터 데이터
// ============================================================

export interface NewsletterData {
  generated_at: string
  newsletter_type: NewsletterType
  title: string

  target_capsule?: {
    concept_id: number
    capsule_title: string
    level: string
    overview: string
    expert_count: number
  }

  ontology_context?: {
    keywords: string[]
    prerequisites: string[]
    successors: string[]
    roadmap_position: {
      level: string
      lecture_level: string
      order_in_level: number
      total_in_level: number
    }
  }

  ai_content: NewsletterAIContent

  related_concepts?: Array<{ concept_name: string; domain_name: string }>
  learning_path_position?: {
    level: string
    lecture_level: string
    progress_hint: string
  }

  weekly_stats?: {
    concepts_covered: number
    newsletters_sent: number
    trending_concepts: Array<{ concept_name: string; domain_name: string; expert_count: number }>
  }
}
