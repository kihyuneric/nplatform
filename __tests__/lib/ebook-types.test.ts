import { describe, it, expect } from 'vitest'
import type {
  EbookChapterContent,
  EbookAIContent,
  LecturePlanResult,
  GenerationStatus,
  ConceptOntologyContext,
  LevelOntologyOverview,
  RelatedTranscript,
  EnrichedCapsule,
  NewsletterData,
  NewsletterAIContent,
  NewsletterType,
} from '@/lib/ebook-types'

describe('ebook-types', () => {
  describe('EbookChapterContent', () => {
    it('should conform to expected structure', () => {
      const chapter: EbookChapterContent = {
        introduction: '도입부 텍스트 400~600자',
        core_explanation: '핵심 개념 설명 800~1200자',
        expert_comparison: '전문가 비교 600~800자',
        practical_cases: '실전 사례 600~800자',
        application_guide: '적용 가이드 400~600자',
        key_takeaways: ['포인트1', '포인트2', '포인트3'],
      }
      expect(chapter.introduction).toBeTruthy()
      expect(chapter.key_takeaways).toHaveLength(3)
    })
  })

  describe('EbookAIContent', () => {
    it('should hold full ebook structure', () => {
      const content: EbookAIContent = {
        executive_summary: '종합 요약 800~1000자',
        chapter_contents: {
          '권리분석 기초': {
            introduction: '도입',
            core_explanation: '핵심',
            expert_comparison: '비교',
            practical_cases: '사례',
            application_guide: '가이드',
            key_takeaways: ['포인트1'],
          },
        },
        comprehensive_case_study: '종합 사례 연구',
        comparative_analysis: '비교 분석',
        learning_checklist: ['체크1', '체크2'],
        self_assessment: ['질문1'],
        next_steps: '다음 학습 추천',
        ontology_summary: {
          expert_count: 8,
          video_count: 23,
          keywords: ['소유권', '저당권'],
          prerequisites: ['부동산 기초'],
          successors: ['경매 입찰'],
        },
      }
      expect(content.chapter_contents['권리분석 기초']).toBeDefined()
      expect(content.ontology_summary.expert_count).toBe(8)
      expect(content.learning_checklist).toHaveLength(2)
    })
  })

  describe('LecturePlanResult', () => {
    it('should contain curriculum and ontology summary', () => {
      const plan: LecturePlanResult = {
        ontology_summary: {
          selected_transcript_count: 5,
          total_available_count: 23,
          theory_ratio: 0.45,
          case_ratio: 0.35,
          core_keywords: ['권리분석', '등기부'],
        },
        lecture_goal: '권리분석 핵심 이해',
        target_description: '중급 L2 수준 학습자',
        curriculum: [
          {
            time_range: '0:00~0:05',
            title: '오프닝',
            content_type: 'opening',
            teaching_notes: '강의 목표 안내',
            key_points: ['학습 목표 제시'],
          },
          {
            time_range: '0:05~0:25',
            title: '핵심 개념',
            content_type: 'theory',
            teaching_notes: '권리분석의 기초 설명',
            key_points: ['소유권 개념', '저당권 이해'],
            case_reference: '실제 등기부 사례',
          },
        ],
        total_duration_min: 45,
        supplementary_notes: '보충 자료 안내',
      }
      expect(plan.curriculum).toHaveLength(2)
      expect(plan.total_duration_min).toBe(45)
      expect(plan.ontology_summary.selected_transcript_count).toBe(5)
    })
  })

  describe('GenerationStatus', () => {
    it('should handle all status states', () => {
      const idle: GenerationStatus = { state: 'idle' }
      const loading: GenerationStatus = { state: 'loading', progress: '챕터 2/6 생성 중...' }
      const success: GenerationStatus = { state: 'success', result: {}, fromCache: true }
      const partial: GenerationStatus = { state: 'partial', result: {}, failedParts: ['Chapter 3'] }
      const fallback: GenerationStatus = { state: 'fallback', result: {}, reason: 'AI 미가용' }
      const error: GenerationStatus = { state: 'error', message: '서버 오류', canRetry: true }

      expect(idle.state).toBe('idle')
      expect(loading.state).toBe('loading')
      expect(success.state).toBe('success')
      expect(partial.state).toBe('partial')
      expect(fallback.state).toBe('fallback')
      expect(error.state).toBe('error')
    })
  })

  describe('ConceptOntologyContext', () => {
    it('should hold full concept context', () => {
      const ctx: ConceptOntologyContext = {
        expert_count: 8,
        video_count: 23,
        avg_relevance: 0.82,
        lecture_type_ratio: { theory: 0.45, case_study: 0.35, practice: 0.20 },
        keywords: ['소유권', '저당권', '전세권'],
        prerequisites: [{ concept_id: 1, name: '부동산 기초 용어' }],
        successors: [{ concept_id: 3, name: '경매 입찰 전략' }],
        related: [{ concept_id: 5, name: '부동산 등기법' }],
        roadmap_position: {
          level: '중급',
          order_in_level: 15,
          total_in_level: 47,
          lecture_level: 'L2',
        },
      }
      expect(ctx.prerequisites).toHaveLength(1)
      expect(ctx.roadmap_position.level).toBe('중급')
      expect(ctx.lecture_type_ratio.theory + ctx.lecture_type_ratio.case_study + ctx.lecture_type_ratio.practice).toBe(1)
    })
  })

  describe('NewsletterData', () => {
    it('should support all newsletter types', () => {
      const types: NewsletterType[] = ['daily_lesson', 'case_study', 'expert_compare', 'learning_tip', 'weekly_summary']
      expect(types).toHaveLength(5)

      const newsletter: NewsletterData = {
        generated_at: '2026-03-14T00:00:00.000Z',
        newsletter_type: 'daily_lesson',
        title: '오늘의 부동산 학습: 등기부등본 읽는 법',
        ai_content: {
          headline: '등기부등본, 이것만 알면 됩니다',
          body: '오늘의 학습 콘텐츠 본문...',
          key_takeaways: ['포인트1', '포인트2'],
          call_to_action: '더 알아보기',
        },
        target_capsule: {
          concept_id: 42,
          capsule_title: '등기부등본 해석',
          level: '중급',
          overview: '등기부등본의 구조와 해석 방법',
          expert_count: 5,
        },
        ontology_context: {
          keywords: ['등기부', '소유권'],
          prerequisites: ['부동산 기초'],
          successors: ['권리분석'],
          roadmap_position: {
            level: '중급',
            lecture_level: 'L2',
            order_in_level: 15,
            total_in_level: 47,
          },
        },
        related_concepts: [
          { concept_name: '권리분석', domain_name: '경매' },
        ],
        learning_path_position: {
          level: '중급',
          lecture_level: 'L2',
          progress_hint: '15/47 강의',
        },
      }

      expect(newsletter.newsletter_type).toBe('daily_lesson')
      expect(newsletter.ai_content.key_takeaways).toHaveLength(2)
      expect(newsletter.target_capsule?.concept_id).toBe(42)
    })
  })

  describe('RelatedTranscript', () => {
    it('should match expected shape', () => {
      const transcript: RelatedTranscript = {
        youtube_id: 12345,
        video_id: 'abc123xyz',
        title: '권리분석 완벽정리',
        channel_name: '***',
        relevance: 0.95,
        lecture_type: '이론형',
        duration_min: 32,
        segments: [{ topic: '소유권', start: 0, end: 120 }],
        case_references: ['등기부 사례 1'],
        key_topics: ['소유권', '저당권'],
      }
      expect(transcript.relevance).toBeGreaterThanOrEqual(0)
      expect(transcript.relevance).toBeLessThanOrEqual(1)
      expect(transcript.key_topics).toContain('소유권')
    })
  })
})
