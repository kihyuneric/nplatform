import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{}' }],
        }),
      },
    })),
  }
})

// Mock ontology-db
vi.mock('@/lib/ontology-db', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }),
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        gte: vi.fn().mockResolvedValue({ data: [] }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { capsule_id: 1 } }),
        }),
      }),
    }),
  },
  getConceptOntologyContext: vi.fn().mockResolvedValue({
    expert_count: 5,
    video_count: 10,
    avg_relevance: 0.8,
    lecture_type_ratio: { theory: 0.5, case_study: 0.3, practice: 0.2 },
    keywords: ['소유권', '저당권'],
    prerequisites: [{ concept_id: 1, name: '기초' }],
    successors: [{ concept_id: 3, name: '심화' }],
    related: [],
    roadmap_position: { level: '중급', order_in_level: 5, total_in_level: 20, lecture_level: 'L2' },
  }),
  getLectureCapsules: vi.fn().mockResolvedValue([]),
  getRecentNewsletterConceptIds: vi.fn().mockResolvedValue([]),
  saveNewsletterHistory: vi.fn().mockResolvedValue(undefined),
}))

// Helper: minimal valid LectureCapsuleRecord
function makeCapsule(overrides: Record<string, any> = {}) {
  return {
    capsule_id: 1,
    concept_id: 42,
    capsule_title: '권리분석 실전',
    level: '중급',
    overview: '권리분석 개요',
    teaching_guidelines: '강의 가이드라인',
    syllabus: [{ order: 1, topic: '소유권 기초', duration_min: 15, type: 'theory' }],
    theory_points: ['이론1'],
    case_study_refs: ['사례1'],
    recommended_duration: 45,
    expert_sources: [{ channel_name: '***', relevance: 0.9 }],
    ...overrides,
  }
}

const mockOntologyContext = {
  expert_count: 5,
  video_count: 10,
  avg_relevance: 0.8,
  lecture_type_ratio: { theory: 0.5, case_study: 0.3, practice: 0.2 },
  keywords: ['소유권'],
  prerequisites: [],
  successors: [],
  related: [],
  roadmap_position: { level: '중급', order_in_level: 5, total_in_level: 20, lecture_level: 'L2' },
}

describe('ai-synthesizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isAIAvailable', () => {
    it('should return false when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY
      // Re-import to get fresh module
      const mod = await import('@/lib/ai-synthesizer')
      expect(mod.isAIAvailable()).toBe(false)
    })

    it('should return true when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key-123'
      // Need to reset module cache
      vi.resetModules()
      const mod = await import('@/lib/ai-synthesizer')
      expect(mod.isAIAvailable()).toBe(true)
      delete process.env.ANTHROPIC_API_KEY
    })
  })

  describe('synthesizeLecturePlan', () => {
    it('should return fallback when AI is not available', async () => {
      delete process.env.ANTHROPIC_API_KEY
      vi.resetModules()
      const { synthesizeLecturePlan } = await import('@/lib/ai-synthesizer')

      const result = await synthesizeLecturePlan({
        capsule: makeCapsule({ capsule_title: '권리분석 실전' }),
        selectedTranscripts: [{
          channel_name: '***',
          relevance: 0.95,
          lecture_type: '이론형',
          segments: [],
          case_references: [],
          key_topics: ['소유권'],
        }],
        ontologyContext: mockOntologyContext,
        settings: {
          lectureLevel: 'L2',
          targetDurationMin: 45,
          emphasisTypes: ['theory', 'case'],
        },
      })

      // Should return fallback structure
      expect(result).toBeDefined()
      expect(result.lecture_goal).toBeTruthy()
      expect(result.curriculum).toBeDefined()
      expect(Array.isArray(result.curriculum)).toBe(true)
      expect(result.total_duration_min).toBeGreaterThan(0)
    })
  })

  describe('synthesizeDailyNewsletter', () => {
    it('should return fallback content when AI is not available', async () => {
      delete process.env.ANTHROPIC_API_KEY
      vi.resetModules()
      const { synthesizeDailyNewsletter } = await import('@/lib/ai-synthesizer')

      const result = await synthesizeDailyNewsletter({
        type: 'daily_lesson',
        capsule: makeCapsule({
          capsule_title: '등기부등본 해석',
          overview: '등기부등본의 구조와 해석 방법을 학습합니다.',
          syllabus: [],
          theory_points: ['소유권 이전', '근저당 설정'],
          case_study_refs: [],
        }),
        videoData: [],
        ontologyContext: mockOntologyContext,
      })

      expect(result).toBeDefined()
      expect(result.headline).toBeTruthy()
      expect(result.body).toBeTruthy()
      expect(result.call_to_action).toBeTruthy()
    })
  })

  describe('synthesizeEbookChapter', () => {
    it('should return fallback when AI is not available', async () => {
      delete process.env.ANTHROPIC_API_KEY
      vi.resetModules()
      const { synthesizeEbookChapter } = await import('@/lib/ai-synthesizer')

      const result = await synthesizeEbookChapter({
        capsule: makeCapsule({
          capsule_title: '권리분석',
          syllabus: [{ order: 1, topic: '소유권 기초', description: '기초 설명', duration_min: 15, type: 'theory' }],
        }),
        chapterTopic: { order: 1, topic: '소유권 기초', description: '기초 설명' },
        videoData: [],
        ontologyContext: mockOntologyContext,
        totalChapters: 4,
      })

      expect(result).toBeDefined()
      expect(result.introduction).toBeTruthy()
      expect(result.core_explanation).toBeTruthy()
      expect(Array.isArray(result.key_takeaways)).toBe(true)
    })
  })

  describe('synthesizeEbookSummary', () => {
    it('should return fallback when AI is not available', async () => {
      delete process.env.ANTHROPIC_API_KEY
      vi.resetModules()
      const { synthesizeEbookSummary } = await import('@/lib/ai-synthesizer')

      const result = await synthesizeEbookSummary({
        capsule: makeCapsule({
          capsule_title: '권리분석',
          syllabus: [],
        }),
        videoData: [],
        ontologyContext: mockOntologyContext,
        chapterTopics: ['소유권 기초', '저당권 이해'],
      })

      expect(result).toBeDefined()
      expect(result.executive_summary).toBeTruthy()
      expect(Array.isArray(result.learning_checklist)).toBe(true)
      expect(Array.isArray(result.self_assessment)).toBe(true)
    })
  })
})
