import { describe, it, expect, vi } from 'vitest'

// Mock docx library
vi.mock('docx', () => {
  class MockParagraph {
    constructor(public opts: any) {}
  }
  class MockTable {
    constructor(public opts: any) {}
  }
  class MockTableRow {
    constructor(public opts: any) {}
  }
  class MockTableCell {
    constructor(public opts: any) {}
  }
  class MockTextRun {
    constructor(public opts: any) {}
  }
  class MockPageBreak {}
  class MockDocument {
    constructor(public opts: any) {}
  }
  class MockPacker {
    static toBuffer = vi.fn().mockResolvedValue(Buffer.from('mock-docx'))
  }

  return {
    Document: MockDocument,
    Paragraph: MockParagraph,
    TextRun: MockTextRun,
    Table: MockTable,
    TableRow: MockTableRow,
    TableCell: MockTableCell,
    HeadingLevel: { HEADING_1: 'HEADING_1', HEADING_2: 'HEADING_2', HEADING_3: 'HEADING_3' },
    AlignmentType: { CENTER: 'center', LEFT: 'left', RIGHT: 'right', JUSTIFY: 'justify' },
    WidthType: { PERCENTAGE: 'pct', AUTO: 'auto' },
    BorderStyle: { SINGLE: 'single', NONE: 'none' },
    PageBreak: MockPageBreak,
    Packer: MockPacker,
    ShadingType: { SOLID: 'solid', CLEAR: 'clear' },
  }
})

import {
  generateLecturePlan,
  generateEbook,
  packDocxToBuffer,
} from '@/lib/docx-generator'

const mockCapsule = {
  capsule_id: 1,
  concept_id: 42,
  capsule_title: '권리분석 실전',
  level: '중급',
  overview: '권리분석의 핵심 개념과 실전 방법을 학습합니다.',
  teaching_guidelines: '등기부등본 분석 위주로 강의합니다.',
  syllabus: [
    { order: 1, topic: '소유권 기초', description: '소유권의 개념과 이전', duration_min: 20, type: 'theory' },
    { order: 2, topic: '근저당 분석', description: '근저당권 설정과 해제', duration_min: 25, type: 'case' },
    { order: 3, topic: '실전 적용', description: '실제 사례 분석', duration_min: 15, type: 'practice' },
  ],
  theory_points: [
    '소유권: 부동산을 완전히 지배하는 권리',
    '근저당권: 채권 담보를 위한 저당권',
    '말소기준권리: 경매에서 기준이 되는 권리',
  ],
  case_study_refs: [
    { type: '대법원', number: '2023다12345', context: '소유권 이전 관련 판례' },
  ],
  recommended_duration: 60,
  expert_sources: [
    { channel_name: '전문가A', relevance: 0.95 },
    { channel_name: '전문가B', relevance: 0.88 },
  ],
  prerequisite_concepts: [
    { concept_id: 1, name: '부동산 기초 용어' },
  ],
}

describe('docx-generator', () => {
  describe('generateLecturePlan', () => {
    it('should return a Document object', () => {
      const doc = generateLecturePlan(mockCapsule)
      expect(doc).toBeDefined()
      expect(doc).toBeInstanceOf(Object)
    })

    it('should handle capsule with empty syllabus', () => {
      const emptyCapsule = { ...mockCapsule, syllabus: [] }
      const doc = generateLecturePlan(emptyCapsule)
      expect(doc).toBeDefined()
    })

    it('should handle capsule with no theory points', () => {
      const capsule = { ...mockCapsule, theory_points: [] }
      const doc = generateLecturePlan(capsule)
      expect(doc).toBeDefined()
    })

    it('should handle capsule with no case refs', () => {
      const capsule = { ...mockCapsule, case_study_refs: [] }
      const doc = generateLecturePlan(capsule)
      expect(doc).toBeDefined()
    })
  })

  describe('generateEbook', () => {
    it('should return a Document object', () => {
      const doc = generateEbook(mockCapsule)
      expect(doc).toBeDefined()
      expect(doc).toBeInstanceOf(Object)
    })

    it('should handle capsule with multiple syllabus items', () => {
      const doc = generateEbook(mockCapsule)
      expect(doc).toBeDefined()
    })

    it('should handle capsule with case study refs', () => {
      const capsule = {
        ...mockCapsule,
        case_study_refs: [
          { type: '대법원', number: '2023다11111', context: '권리분석 사례' },
          { type: '서울고등법원', number: '2022나22222', context: '명도 판례' },
        ],
      }
      const doc = generateEbook(capsule)
      expect(doc).toBeDefined()
    })
  })

  describe('packDocxToBuffer', () => {
    it('should convert Document to Buffer', async () => {
      const doc = generateLecturePlan(mockCapsule)
      const buffer = await packDocxToBuffer(doc)
      expect(buffer).toBeDefined()
      expect(Buffer.isBuffer(buffer)).toBe(true)
    })
  })
})
