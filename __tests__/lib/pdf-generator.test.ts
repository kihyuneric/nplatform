import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs and path for font loading
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(Buffer.from('')),
}))

vi.mock('path', () => ({
  join: vi.fn().mockReturnValue('/mock/path/malgun.ttf'),
}))

// Mock jsPDF
function createMockDoc() {
  return {
    addFileToVFS: vi.fn(),
    addFont: vi.fn(),
    setFont: vi.fn(),
    getFontList: vi.fn().mockReturnValue({}),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['line1', 'line2']),
    getTextWidth: vi.fn().mockReturnValue(50),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
    internal: {
      pageSize: { getWidth: vi.fn().mockReturnValue(210), getHeight: vi.fn().mockReturnValue(297) },
      pages: [null, {}],
    },
    line: vi.fn(),
    roundedRect: vi.fn(),
  }
}

vi.mock('jspdf', () => ({
  jsPDF: class MockJsPDF {
    addFileToVFS = vi.fn()
    addFont = vi.fn()
    setFont = vi.fn()
    getFontList = vi.fn().mockReturnValue({})
    setFontSize = vi.fn()
    setTextColor = vi.fn()
    setFillColor = vi.fn()
    setDrawColor = vi.fn()
    setLineWidth = vi.fn()
    rect = vi.fn()
    text = vi.fn()
    addPage = vi.fn()
    splitTextToSize = vi.fn().mockReturnValue(['line1', 'line2'])
    getTextWidth = vi.fn().mockReturnValue(50)
    getNumberOfPages = vi.fn().mockReturnValue(1)
    setPage = vi.fn()
    output = vi.fn().mockReturnValue(new ArrayBuffer(8))
    line = vi.fn()
    roundedRect = vi.fn()
    internal = {
      pageSize: { getWidth: vi.fn().mockReturnValue(210), getHeight: vi.fn().mockReturnValue(297) },
      pages: [null, {}],
    }
  },
}))

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

import {
  generateLecturePlanPdf,
  generateEbookPdf,
  generateAINewsletterPdf,
} from '@/lib/pdf-generator'
import type { NewsletterData } from '@/lib/ebook-types'

const mockCapsule = {
  capsule_id: 1,
  concept_id: 42,
  capsule_title: '권리분석 실전',
  level: '중급',
  overview: '권리분석의 핵심 개념과 실전 방법을 학습합니다.',
  teaching_guidelines: '등기부등본 분석 위주로 강의합니다.',
  syllabus: [
    { order: 1, topic: '소유권 기초', description: '기초 설명', duration_min: 20, type: 'theory' },
    { order: 2, topic: '근저당 분석', description: '분석 방법', duration_min: 25, type: 'case' },
  ],
  theory_points: ['소유권: 완전 지배권', '근저당권: 채권 담보'],
  case_study_refs: [
    { type: '대법원', number: '2023다12345', context: '소유권 이전 사례' },
  ],
  recommended_duration: 60,
  expert_sources: [
    { channel_name: '전문가A', relevance: 0.95 },
  ],
  prerequisite_concepts: [],
}

const mockNewsletterData: NewsletterData = {
  generated_at: '2026-03-14T09:00:00.000Z',
  newsletter_type: 'daily_lesson',
  title: '오늘의 부동산 학습',
  ai_content: {
    headline: '등기부등본, 이것만 알면 됩니다',
    body: '오늘은 등기부등본 읽는 법을 알아봅니다.',
    key_takeaways: ['표제부 확인', '갑구 확인', '을구 확인'],
    call_to_action: '더 알아보기',
  },
  target_capsule: {
    concept_id: 42,
    capsule_title: '등기부등본 해석',
    level: '중급',
    overview: '등기부등본 구조와 해석 방법',
    expert_count: 8,
  },
  ontology_context: {
    keywords: ['등기부', '소유권', '저당권'],
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

describe('pdf-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateLecturePlanPdf', () => {
    it('should return an ArrayBuffer', () => {
      const result = generateLecturePlanPdf(mockCapsule)
      expect(result).toBeDefined()
    })

    it('should not throw', () => {
      expect(() => generateLecturePlanPdf(mockCapsule)).not.toThrow()
    })

    it('should handle empty syllabus', () => {
      const capsule = { ...mockCapsule, syllabus: [] }
      expect(() => generateLecturePlanPdf(capsule)).not.toThrow()
    })
  })

  describe('generateEbookPdf', () => {
    it('should return an ArrayBuffer', () => {
      const result = generateEbookPdf(mockCapsule)
      expect(result).toBeDefined()
    })

    it('should handle capsule with no case refs', () => {
      const capsule = { ...mockCapsule, case_study_refs: [] }
      expect(() => generateEbookPdf(capsule)).not.toThrow()
    })
  })

  describe('generateAINewsletterPdf', () => {
    it('should return an ArrayBuffer', () => {
      const result = generateAINewsletterPdf(mockNewsletterData)
      expect(result).toBeDefined()
    })

    it('should handle newsletter without ontology context', () => {
      const newsletter: NewsletterData = {
        ...mockNewsletterData,
        ontology_context: undefined,
        related_concepts: undefined,
      }
      expect(() => generateAINewsletterPdf(newsletter)).not.toThrow()
    })

    it('should handle all newsletter types', () => {
      const types: Array<NewsletterData['newsletter_type']> = [
        'daily_lesson', 'case_study', 'expert_compare', 'learning_tip', 'weekly_summary'
      ]
      for (const type of types) {
        const newsletter = { ...mockNewsletterData, newsletter_type: type }
        expect(() => generateAINewsletterPdf(newsletter)).not.toThrow()
      }
    })
  })
})
