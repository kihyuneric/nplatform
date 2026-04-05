import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  Packer,
  ShadingType,
} from 'docx'
import type { LectureCapsuleRecord } from './ontology-db'
import type { EnrichedCapsule, LecturePlanResult, ConceptOntologyContext, AtomicCapsuleRecord } from './ebook-types'
import type { AtomicCapsuleContent } from './web-enricher'

const FONT = '맑은 고딕'
const TITLE_SIZE = 56 // half-points (28pt)
const H1_SIZE = 36
const H2_SIZE = 28
const H3_SIZE = 24
const BODY_SIZE = 22
const SMALL_SIZE = 18

function text(content: string, options?: { bold?: boolean; size?: number; color?: string; font?: string; italics?: boolean }): TextRun {
  return new TextRun({
    text: content,
    bold: options?.bold,
    size: options?.size || BODY_SIZE,
    color: options?.color,
    font: options?.font || FONT,
    italics: options?.italics,
  })
}

function heading(content: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  const size = level === HeadingLevel.HEADING_1 ? H1_SIZE : level === HeadingLevel.HEADING_2 ? H2_SIZE : H3_SIZE
  return new Paragraph({
    heading: level,
    children: [text(content, { bold: true, size })],
    spacing: { before: 320, after: 160 },
  })
}

function subHeading(content: string, color?: string): Paragraph {
  return new Paragraph({
    children: [text(content, { bold: true, size: H3_SIZE, color: color || '7C3AED' })],
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: color || '7C3AED' } },
  })
}

function bodyParagraph(content: string, options?: { bullet?: boolean; spacing?: number; indent?: boolean }): Paragraph {
  return new Paragraph({
    children: [text(content)],
    bullet: options?.bullet ? { level: 0 } : undefined,
    spacing: { after: options?.spacing ?? 120, line: 360 },
    indent: options?.indent ? { left: 400 } : undefined,
  })
}

function infoParagraph(content: string): Paragraph {
  return new Paragraph({
    children: [text(content, { color: '374151' })],
    spacing: { after: 120, line: 340 },
    shading: { type: ShadingType.SOLID, color: 'F5F3FF' },
    border: {
      left: { style: BorderStyle.THICK, size: 12, color: '7C3AED' },
    },
    indent: { left: 240, right: 120 },
  })
}

function checkItem(content: string): Paragraph {
  return new Paragraph({
    children: [text(`□  ${content}`)],
    spacing: { after: 80, line: 320 },
    indent: { left: 200 },
  })
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [], spacing: { after: 200 } })
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] })
}

function divider(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' } },
  })
}

function sectionCover(title: string, subtitle: string, num: number): Paragraph[] {
  return [
    emptyLine(),
    new Paragraph({
      children: [
        text(`Section ${num}`, { bold: true, size: 20, color: '7C3AED' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      shading: { type: ShadingType.SOLID, color: 'EDE9FE' },
    }),
    new Paragraph({
      children: [text(title, { bold: true, size: H1_SIZE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [text(subtitle, { size: H2_SIZE, color: '6B7280', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    divider(),
    emptyLine(),
  ]
}

const TYPE_LABELS: Record<string, string> = {
  theory: '이론',
  case: '사례',
  practice: '실습',
  summary: '정리',
}

const TYPE_DESC: Record<string, string> = {
  theory: '개념과 원리를 중심으로 체계적으로 설명하는 방식',
  case: '실제 사례와 경험을 중심으로 이해를 돕는 방식',
  practice: '직접 해보며 익히는 실습 중심 방식',
  summary: '핵심 내용을 정리하고 복습하는 방식',
}

// 이론 포인트를 주제별로 매핑
function matchTheoryPoints(topic: string, allPoints: string[]): string[] {
  const topicWords = topic.toLowerCase().split(/[\s,]+/).filter(w => w.length > 1)
  const scored = allPoints.map(p => {
    const pLower = p.toLowerCase()
    const score = topicWords.filter(w => pLower.includes(w)).length
    return { point: p, score }
  })
  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.point)
  return matched.length > 0 ? matched : allPoints.slice(0, 3)
}

// ============================================================
// 강의안 (Lecture Plan) DOCX
// ============================================================

export function generateLecturePlanDocx(capsule: LectureCapsuleRecord): Document {
  const sections: Paragraph[] = []

  // --- Cover ---
  sections.push(emptyLine())
  sections.push(emptyLine())
  sections.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(capsule.capsule_title, { bold: true, size: TITLE_SIZE })],
    spacing: { after: 200 },
  }))
  sections.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`레벨: ${capsule.level}  |  소요시간: ${capsule.recommended_duration}분  |  난이도: ${capsule.difficulty_score ?? '-'}`, { size: SMALL_SIZE, color: '666666' })],
    spacing: { after: 100 },
  }))
  sections.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
    spacing: { after: 400 },
  }))
  sections.push(new Paragraph({ children: [new PageBreak()] }))

  // --- Overview ---
  sections.push(heading('1. 개요', HeadingLevel.HEADING_1))
  for (const line of capsule.overview.split('\n')) {
    if (line.trim()) sections.push(bodyParagraph(line.trim()))
  }

  // --- Teaching Guidelines ---
  sections.push(heading('2. 교수법 가이드라인', HeadingLevel.HEADING_1))
  for (const line of capsule.teaching_guidelines.split('\n')) {
    if (line.trim()) sections.push(bodyParagraph(line.trim(), { bullet: true }))
  }

  // --- Syllabus Table ---
  sections.push(heading('3. 강의 실라버스', HeadingLevel.HEADING_1))

  const headerCells = ['순서', '주제', '설명', '시간(분)', '유형'].map(label =>
    new TableCell({
      children: [new Paragraph({ children: [text(label, { bold: true, size: SMALL_SIZE, color: 'FFFFFF' })] })],
      shading: { type: ShadingType.SOLID, color: '7C3AED' },
      width: { size: label === '설명' ? 35 : label === '주제' ? 25 : 10, type: WidthType.PERCENTAGE },
    })
  )

  const dataRows = capsule.syllabus.map(item =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [text(String(item.order), { size: SMALL_SIZE })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(item.topic, { size: SMALL_SIZE, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(item.description || '', { size: SMALL_SIZE })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(String(item.duration_min), { size: SMALL_SIZE })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(TYPE_LABELS[item.type] || item.type, { size: SMALL_SIZE })] })] }),
      ],
    })
  )

  const totalDuration = capsule.syllabus.reduce((sum, s) => sum + s.duration_min, 0)
  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [] })] }),
      new TableCell({
        children: [new Paragraph({ children: [text('합계', { bold: true, size: SMALL_SIZE })] })],
        columnSpan: 2,
      }),
      new TableCell({ children: [new Paragraph({ children: [text(`${totalDuration}분`, { bold: true, size: SMALL_SIZE })] })] }),
      new TableCell({ children: [new Paragraph({ children: [] })] }),
    ],
  })

  sections.push(new Paragraph({ children: [] })) // spacer before table
  const syllabusTable = new Table({
    rows: [new TableRow({ children: headerCells }), ...dataRows, totalRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  // --- Theory Points ---
  sections.push(heading('4. 핵심 이론', HeadingLevel.HEADING_1))
  for (const point of capsule.theory_points) {
    sections.push(bodyParagraph(point, { bullet: true }))
  }

  // --- Case Study Refs ---
  if (capsule.case_study_refs.length > 0) {
    sections.push(heading('5. 참고 사례', HeadingLevel.HEADING_1))
    for (const ref of capsule.case_study_refs) {
      const label = ref.label || ref.type || '사례'
      const number = ref.number || ref.matched || ''
      const context = ref.context ? ` — ${ref.context}` : ''
      sections.push(bodyParagraph(`[${label}] ${number}${context}`, { bullet: true }))
    }
  }

  // --- Expert Sources ---
  if (capsule.expert_sources.length > 0) {
    sections.push(heading('6. 전문가 출처', HeadingLevel.HEADING_1))
    for (const src of capsule.expert_sources) {
      sections.push(bodyParagraph(`${src.channel_name} (관련도 ${Math.round(src.relevance * 100)}%)`, { bullet: true }))
    }
  }

  // --- Prerequisites ---
  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    sections.push(heading('7. 선수 개념', HeadingLevel.HEADING_1))
    const names = capsule.prerequisite_concepts.map(p => p.name).join(', ')
    sections.push(bodyParagraph(names))
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
        },
      },
    },
    sections: [{
      children: [...sections.slice(0, sections.indexOf(syllabusTable as any) >= 0 ? sections.length : sections.length)],
    }],
  })
}

// We need a workaround since Table isn't a Paragraph — build children array manually
function buildLecturePlanChildren(capsule: LectureCapsuleRecord): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = []
  const totalDuration = capsule.syllabus.reduce((sum, s) => sum + s.duration_min, 0)

  // ── 표지 ──────────────────────────────────────────────────────
  children.push(emptyLine(), emptyLine(), emptyLine())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.SOLID, color: 'EDE9FE' },
    children: [text('  강 의 안  ', { bold: true, size: SMALL_SIZE, color: '7C3AED' })],
    spacing: { after: 120 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(capsule.capsule_title, { bold: true, size: TITLE_SIZE })],
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`${capsule.level} 레벨  ·  총 ${totalDuration}분  ·  ${capsule.syllabus.length}개 섹션`, { size: H2_SIZE, color: '7C3AED' })],
    spacing: { after: 160 },
  }))
  children.push(divider())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}  |  NPLatform 부동산 전문가 ${capsule.expert_sources.length}명 분석`, { size: SMALL_SIZE, color: '999999' })],
    spacing: { after: 100 },
  }))
  children.push(pageBreak())

  // ── 목차 ──────────────────────────────────────────────────────
  children.push(heading('목  차', HeadingLevel.HEADING_1))
  children.push(bodyParagraph('1. 강의 개요 및 교수 전략'))
  children.push(bodyParagraph('2. 전체 커리큘럼 (시간표)'))
  children.push(bodyParagraph('3. 핵심 이론 정리'))
  for (let i = 0; i < capsule.syllabus.length; i++) {
    children.push(bodyParagraph(`4-${i + 1}. 섹션 ${i + 1}: ${capsule.syllabus[i].topic}  (상세 강의 노트)`, { indent: true }))
  }
  children.push(bodyParagraph('5. 참고 사례 분석'))
  children.push(bodyParagraph('6. 강의 준비 체크리스트'))
  children.push(bodyParagraph('7. 학습자 평가 도구'))
  children.push(bodyParagraph('8. 참고 자료'))
  children.push(pageBreak())

  // ── 1. 강의 개요 ──────────────────────────────────────────────
  children.push(heading('1. 강의 개요 및 교수 전략', HeadingLevel.HEADING_1))
  children.push(subHeading('강의 목표'))
  for (const line of capsule.overview.split('\n')) {
    if (line.trim()) children.push(bodyParagraph(line.trim()))
  }
  children.push(emptyLine())

  children.push(subHeading('교수 전략 가이드라인'))
  children.push(infoParagraph('이 강의는 다수 부동산 전문가의 분석 데이터를 기반으로 설계되었습니다. 강사는 아래 가이드라인을 참고하여 학습 효과를 극대화하시기 바랍니다.'))
  for (const line of capsule.teaching_guidelines.split('\n')) {
    if (line.trim()) children.push(bodyParagraph(`• ${line.trim()}`))
  }
  children.push(emptyLine())

  children.push(subHeading('강의 구성 개요'))
  children.push(bodyParagraph(`• 총 섹션 수: ${capsule.syllabus.length}개`))
  children.push(bodyParagraph(`• 총 소요시간: ${totalDuration}분`))
  children.push(bodyParagraph(`• 권장 난이도: ${capsule.difficulty_score ? `★${'★'.repeat(Math.round(capsule.difficulty_score) - 1)}${'☆'.repeat(5 - Math.round(capsule.difficulty_score))}` : '중급'}`))
  children.push(bodyParagraph(`• 강의 레벨: ${capsule.level}`))

  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    children.push(emptyLine())
    children.push(subHeading('선수 학습 요건'))
    children.push(infoParagraph('이 강의를 수강하기 전에 다음 개념에 대한 기초 이해가 필요합니다:'))
    for (const prereq of capsule.prerequisite_concepts) {
      children.push(bodyParagraph(`• ${prereq.name}`))
    }
  }
  children.push(pageBreak())

  // ── 2. 커리큘럼 테이블 ───────────────────────────────────────
  children.push(heading('2. 전체 커리큘럼 (시간표)', HeadingLevel.HEADING_1))
  children.push(bodyParagraph('아래 시간표를 기준으로 강의를 진행하되, 학습자 반응에 따라 탄력적으로 조정할 수 있습니다.'))
  children.push(emptyLine())

  const headerCells = ['순서', '주제', '설명', '시간(분)', '유형'].map(label =>
    new TableCell({
      children: [new Paragraph({ children: [text(label, { bold: true, size: SMALL_SIZE, color: 'FFFFFF' })] })],
      shading: { type: ShadingType.SOLID, color: '7C3AED' },
    })
  )

  let runningTime = 0
  const dataRows = capsule.syllabus.map(item => {
    const start = runningTime
    runningTime += item.duration_min
    const timeRange = `${String(Math.floor(start / 60)).padStart(1, '0')}:${String(start % 60).padStart(2, '0')}~${String(Math.floor(runningTime / 60)).padStart(1, '0')}:${String(runningTime % 60).padStart(2, '0')}`
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [text(String(item.order), { size: SMALL_SIZE })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(item.topic, { size: SMALL_SIZE, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(item.description || TYPE_DESC[item.type] || '', { size: SMALL_SIZE })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(`${item.duration_min}분\n(${timeRange})`, { size: SMALL_SIZE })] })] }),
        new TableCell({ children: [new Paragraph({ children: [text(TYPE_LABELS[item.type] || item.type, { size: SMALL_SIZE })] })] }),
      ],
    })
  })

  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [] })] }),
      new TableCell({ children: [new Paragraph({ children: [text('합계', { bold: true, size: SMALL_SIZE })] })], columnSpan: 2 }),
      new TableCell({ children: [new Paragraph({ children: [text(`${totalDuration}분`, { bold: true, size: SMALL_SIZE })] })] }),
      new TableCell({ children: [new Paragraph({ children: [] })] }),
    ],
  })

  children.push(new Table({
    rows: [new TableRow({ children: headerCells }), ...dataRows, totalRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }))
  children.push(pageBreak())

  // ── 3. 핵심 이론 정리 ─────────────────────────────────────────
  children.push(heading('3. 핵심 이론 정리', HeadingLevel.HEADING_1))
  children.push(infoParagraph('다음은 이 강의에서 반드시 전달해야 할 핵심 이론 포인트입니다. 각 섹션에서 해당 이론을 자연스럽게 녹여서 설명하십시오.'))
  children.push(emptyLine())

  // 주제별로 이론 포인트 그룹화
  for (const item of capsule.syllabus) {
    const relevantPoints = matchTheoryPoints(item.topic, capsule.theory_points)
    if (relevantPoints.length > 0) {
      children.push(subHeading(`${item.order}. ${item.topic} 관련 이론`, '1D4ED8'))
      for (const point of relevantPoints) {
        children.push(bodyParagraph(`• ${point}`))
      }
      children.push(emptyLine())
    }
  }

  // 전체 이론 포인트 (매핑 안된 것들)
  const allMapped = capsule.syllabus.flatMap(item => matchTheoryPoints(item.topic, capsule.theory_points))
  const unmapped = capsule.theory_points.filter(p => !allMapped.includes(p))
  if (unmapped.length > 0) {
    children.push(subHeading('공통 이론 포인트'))
    for (const point of unmapped) {
      children.push(bodyParagraph(`• ${point}`))
    }
  }
  children.push(pageBreak())

  // ── 4. 섹션별 상세 강의 노트 ──────────────────────────────────
  for (let i = 0; i < capsule.syllabus.length; i++) {
    const item = capsule.syllabus[i]
    const sectionNum = i + 1
    const topicPoints = matchTheoryPoints(item.topic, capsule.theory_points)

    // 섹션 표지
    children.push(...sectionCover(
      item.topic,
      `섹션 ${sectionNum}/${capsule.syllabus.length}  ·  ${item.duration_min}분  ·  ${TYPE_LABELS[item.type] || item.type}형`,
      sectionNum
    ))

    // 섹션 개요
    children.push(subHeading('섹션 목표'))
    if (item.description) {
      children.push(bodyParagraph(item.description))
    }
    children.push(bodyParagraph(`• 학습 유형: ${TYPE_LABELS[item.type] || item.type}  (${TYPE_DESC[item.type] || ''})`))
    children.push(bodyParagraph(`• 배정 시간: ${item.duration_min}분`))
    children.push(emptyLine())

    // 강사 강의 노트
    children.push(subHeading('강사 강의 노트'))
    children.push(infoParagraph(`이 섹션은 ${item.topic}을(를) 중심으로 ${TYPE_LABELS[item.type] || item.type}형 방식으로 진행합니다. 아래 포인트를 중심으로 설명하되 학습자의 눈높이에 맞추어 조절하십시오.`))
    children.push(emptyLine())

    if (item.type === 'theory' || item.type === 'opening') {
      children.push(bodyParagraph('【도입부 안내 (1~2분)】'))
      children.push(bodyParagraph(`  "오늘은 ${item.topic}에 대해 알아보겠습니다. 이 주제는 부동산 투자에서 왜 중요한지 먼저 살펴볼게요."`))
      children.push(emptyLine())
      children.push(bodyParagraph('【본론 전개 (핵심 이론 중심)】'))
      for (const point of topicPoints.slice(0, 4)) {
        children.push(bodyParagraph(`  ▷ ${point}`, { indent: true }))
      }
    } else if (item.type === 'case') {
      children.push(bodyParagraph('【사례 도입 (2~3분)】'))
      children.push(bodyParagraph(`  "실제 현장에서 ${item.topic}이(가) 어떻게 적용되는지 사례를 통해 살펴보겠습니다."`))
      children.push(emptyLine())
      children.push(bodyParagraph('【사례 분석 포인트】'))
      for (const point of topicPoints.slice(0, 3)) {
        children.push(bodyParagraph(`  ▷ ${point}`, { indent: true }))
      }
    } else if (item.type === 'practice') {
      children.push(bodyParagraph('【실습 준비 안내 (2~3분)】'))
      children.push(bodyParagraph(`  "지금까지 배운 ${item.topic}을 직접 실습해 보겠습니다. 아래 단계를 따라오세요."`))
      children.push(emptyLine())
      children.push(bodyParagraph('【실습 단계】'))
      for (let step = 1; step <= Math.min(topicPoints.length, 4); step++) {
        children.push(bodyParagraph(`  Step ${step}. ${topicPoints[step - 1] || `${item.topic} 실습 단계 ${step}`}`, { indent: true }))
      }
    } else if (item.type === 'summary') {
      children.push(bodyParagraph('【핵심 정리 (2~3분)】'))
      children.push(bodyParagraph(`  "오늘 ${item.topic}에서 배운 내용을 정리해 보겠습니다."`))
      children.push(emptyLine())
      children.push(bodyParagraph('【정리 포인트】'))
      for (const point of topicPoints.slice(0, 5)) {
        children.push(bodyParagraph(`  ✓ ${point}`, { indent: true }))
      }
    }

    children.push(emptyLine())

    // 핵심 포인트
    children.push(subHeading('이 섹션의 핵심 포인트'))
    const keyPoints = topicPoints.length > 0 ? topicPoints : capsule.theory_points.slice(0, 3)
    for (const point of keyPoints.slice(0, 5)) {
      children.push(bodyParagraph(`★ ${point}`, { indent: true }))
    }
    children.push(emptyLine())

    // 슬라이드/자료 가이드
    children.push(subHeading('슬라이드/자료 가이드'))
    children.push(bodyParagraph(`• 슬라이드 1: ${item.topic} 개요 및 정의`))
    children.push(bodyParagraph(`• 슬라이드 2-3: 핵심 개념 도식화 (다이어그램 또는 플로우차트 권장)`))
    if (item.type === 'case' || item.type === 'practice') {
      children.push(bodyParagraph(`• 슬라이드 4: 실전 사례/실습 화면 (실제 서류/화면 캡처 활용)`))
    }
    children.push(bodyParagraph(`• 마지막 슬라이드: 이 섹션 핵심 정리 3줄 요약`))
    children.push(emptyLine())

    // 예상 질문 & 답변
    children.push(subHeading('예상 질문 & 답변 가이드'))
    children.push(bodyParagraph(`Q1. ${item.topic}이(가) 실제 투자에서 얼마나 중요한가요?`))
    children.push(infoParagraph(`A: ${item.topic}은 부동산 투자의 핵심 영역 중 하나로, 전문가들이 가장 많이 다루는 주제입니다. ${item.description || '실무에서 빈번히 적용됩니다.'}`))
    children.push(emptyLine())
    children.push(bodyParagraph(`Q2. 초보자가 가장 어려워하는 부분은 무엇인가요?`))
    children.push(infoParagraph(`A: 처음 접하는 학습자는 용어와 절차가 낯설 수 있습니다. 핵심 용어를 먼저 정리하고, 단계별로 설명하면 이해도가 높아집니다.`))
    children.push(emptyLine())
    if (capsule.case_study_refs.length > 0) {
      children.push(bodyParagraph(`Q3. 실제 사례를 더 알고 싶은데 어디서 찾을 수 있나요?`))
      children.push(infoParagraph(`A: 뒤에 나오는 참고 사례 분석 섹션을 참고하세요. 실전 경험에서 나온 사례들이 정리되어 있습니다.`))
    }

    if (i < capsule.syllabus.length - 1) {
      children.push(pageBreak())
    }
  }
  children.push(pageBreak())

  // ── 5. 참고 사례 분석 ────────────────────────────────────────
  if (capsule.case_study_refs.length > 0) {
    children.push(heading('5. 참고 사례 분석', HeadingLevel.HEADING_1))
    children.push(infoParagraph('다음 사례들은 강의 중 활용할 수 있는 실전 참고 자료입니다. 학습자의 이해를 높이기 위해 적절한 시점에 인용하세요.'))
    children.push(emptyLine())

    for (let i = 0; i < capsule.case_study_refs.length; i++) {
      const ref = capsule.case_study_refs[i]
      const label = ref.label || ref.type || '사례'
      const number = ref.number || ref.matched || ''
      children.push(subHeading(`사례 ${i + 1}: [${label}] ${number}`))
      if (ref.context) {
        children.push(bodyParagraph(ref.context))
      }
      if (ref.court) {
        children.push(bodyParagraph(`• 관할: ${ref.court}`, { indent: true }))
      }
      children.push(bodyParagraph(`• 강의 활용 팁: 이 사례는 ${label} 유형의 실전 상황을 보여줍니다. 학습자들이 공감할 수 있는 관점으로 설명하세요.`))
      children.push(emptyLine())
    }
    children.push(pageBreak())
  }

  // ── 6. 강의 준비 체크리스트 ────────────────────────────────────
  children.push(heading('6. 강의 준비 체크리스트', HeadingLevel.HEADING_1))
  children.push(infoParagraph('강의 당일 준비 상태를 점검하세요. 모든 항목에 체크가 완료되어야 최고의 강의가 가능합니다.'))
  children.push(emptyLine())

  children.push(subHeading('사전 준비 (강의 전날)'))
  children.push(checkItem('강의 자료 (슬라이드/화이트보드) 최종 점검 완료'))
  children.push(checkItem('각 섹션별 사례 자료 준비 완료'))
  children.push(checkItem(`총 ${totalDuration}분 기준 시간 배분 재확인`))
  children.push(checkItem('선수 학습 개념 간단 복습 자료 준비'))
  children.push(checkItem('학습자 수준 및 배경 사전 파악'))
  children.push(emptyLine())

  children.push(subHeading('당일 준비 (강의 1시간 전)'))
  children.push(checkItem('강의 환경 점검 (마이크, 화면, 조명 등)'))
  children.push(checkItem('참고 자료 출력/업로드 완료'))
  children.push(checkItem('Q&A 진행 방식 결정 (실시간 or 마지막)'))
  children.push(checkItem('강의 흐름 최종 리허설 (핵심 포인트 암기)'))
  children.push(emptyLine())

  children.push(subHeading('각 섹션별 체크'))
  for (const item of capsule.syllabus) {
    children.push(checkItem(`섹션 ${item.order}: ${item.topic} — 핵심 포인트 ${Math.min(3, matchTheoryPoints(item.topic, capsule.theory_points).length)}개 준비`))
  }
  children.push(pageBreak())

  // ── 7. 학습자 평가 도구 ──────────────────────────────────────
  children.push(heading('7. 학습자 평가 도구', HeadingLevel.HEADING_1))

  children.push(subHeading('강의 전 사전 이해도 체크 (5분)'))
  children.push(infoParagraph('강의 시작 전 학습자의 현재 이해도를 파악하여 강의 수준을 조절하세요.'))
  for (let i = 0; i < Math.min(3, capsule.syllabus.length); i++) {
    children.push(bodyParagraph(`${i + 1}. ${capsule.syllabus[i].topic}에 대해 이미 알고 있는 것이 있나요? (없음/조금/잘 알고 있음)`))
  }
  children.push(emptyLine())

  children.push(subHeading('강의 중 중간 점검 (각 섹션 후)'))
  children.push(bodyParagraph('각 섹션이 끝난 후 다음 질문으로 이해도를 확인하세요:'))
  for (const item of capsule.syllabus) {
    children.push(bodyParagraph(`• [${item.topic}] 이 섹션에서 가장 인상 깊었던 내용은 무엇인가요?`, { indent: true }))
  }
  children.push(emptyLine())

  children.push(subHeading('강의 후 이해도 평가 문항'))
  children.push(infoParagraph('강의가 끝난 후 아래 문항으로 학습 성취도를 평가할 수 있습니다.'))
  for (let i = 0; i < Math.min(5, capsule.theory_points.length); i++) {
    children.push(bodyParagraph(`${i + 1}. ${capsule.theory_points[i]}에 대해 자신의 말로 설명해 보세요.`))
  }
  children.push(pageBreak())

  // ── 8. 참고 자료 ─────────────────────────────────────────────
  children.push(heading('8. 참고 자료', HeadingLevel.HEADING_1))

  children.push(subHeading('전문가 출처'))
  children.push(infoParagraph('이 강의안은 NPLatform 부동산 전문가들의 강의 데이터를 AI가 종합 분석하여 제작했습니다. 개별 채널/이름은 공개하지 않습니다.'))
  children.push(bodyParagraph(`• 분석 참여 전문가: 총 ${capsule.expert_sources.length}명`))
  for (const src of capsule.expert_sources.slice(0, 5)) {
    children.push(bodyParagraph(`  — 관련도 ${Math.round(src.relevance * 100)}% 전문가`, { indent: true }))
  }
  children.push(emptyLine())

  children.push(subHeading('추천 연계 학습'))
  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    children.push(bodyParagraph('선수 학습 (이 강의 이전에 이수 권장):'))
    for (const prereq of capsule.prerequisite_concepts) {
      children.push(bodyParagraph(`  → ${prereq.name}`, { indent: true }))
    }
  }
  children.push(emptyLine())
  children.push(bodyParagraph(`출처: NPLatform 부동산 전문가 ${capsule.expert_sources.length}명의 강의를 AI가 종합 분석`, { spacing: 50 }))
  children.push(new Paragraph({
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
    alignment: AlignmentType.RIGHT,
  }))

  return children
}

// ============================================================
// 전자책 (E-book) DOCX
// ============================================================

function buildEbookChildren(capsule: LectureCapsuleRecord): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = []
  const totalDuration = capsule.syllabus.reduce((sum, s) => sum + s.duration_min, 0)
  let chapterNum = 1

  // ── 표지 ──────────────────────────────────────────────────────
  children.push(emptyLine(), emptyLine(), emptyLine())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.SOLID, color: 'EDE9FE' },
    children: [text('  체계적 전문 실용서  ', { bold: true, size: SMALL_SIZE, color: '7C3AED' })],
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(capsule.capsule_title, { bold: true, size: 64 })],
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`${capsule.level} 레벨  ·  총 ${totalDuration}분`, { size: H2_SIZE, color: '7C3AED' })],
    spacing: { after: 160 },
  }))
  children.push(divider())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`NPLatform 부동산 전문가 ${capsule.expert_sources.length}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '666666' })],
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
  }))
  children.push(pageBreak())

  // ── 이 책에 대하여 ─────────────────────────────────────────────
  children.push(heading('이 책에 대하여', HeadingLevel.HEADING_1))
  children.push(infoParagraph(`이 책은 부동산 투자 교육의 핵심 주제인 "${capsule.capsule_title}"을(를) 체계적으로 다루는 전문 실용서입니다. NPLatform 부동산 전문가 ${capsule.expert_sources.length}명의 강의 데이터를 분석하여 가장 효과적인 학습 경로를 설계했습니다.`))
  children.push(emptyLine())

  children.push(subHeading('이 책의 특징'))
  children.push(bodyParagraph(`• 다수 전문가의 관점 종합: ${capsule.expert_sources.length}명의 강의에서 추출한 핵심 지식을 하나의 일관된 흐름으로 정리`))
  children.push(bodyParagraph(`• 실전 중심: 이론과 사례를 균형 있게 다루어 즉시 활용 가능한 지식 제공`))
  children.push(bodyParagraph(`• 체계적 구성: ${capsule.syllabus.length}개 챕터에 걸쳐 기초부터 심화까지 단계별 학습 가능`))
  children.push(bodyParagraph(`• 학습 지원: 각 챕터별 핵심 포인트, 자기 진단, 체크리스트 제공`))
  children.push(emptyLine())

  children.push(subHeading('대상 독자'))
  children.push(bodyParagraph(`• 레벨: ${capsule.level}`))
  children.push(bodyParagraph(`• ${capsule.level} 수준의 부동산 투자에 관심 있는 분`))
  children.push(bodyParagraph('• 실무에서 바로 적용 가능한 전문 지식이 필요한 분'))
  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    children.push(bodyParagraph(`• 선수 지식: ${capsule.prerequisite_concepts.map(p => p.name).join(', ')} 이해 후 권장`))
  }
  children.push(pageBreak())

  // ── 목차 ──────────────────────────────────────────────────────
  children.push(heading('목  차', HeadingLevel.HEADING_1))
  children.push(emptyLine())
  children.push(bodyParagraph('이 책에 대하여'))
  children.push(bodyParagraph('종합 요약'))
  children.push(emptyLine())

  let tocNum = 1
  for (const item of capsule.syllabus) {
    children.push(bodyParagraph(`제${tocNum}장  ${item.topic}`, { spacing: 60 }))
    tocNum++
  }
  if (capsule.case_study_refs.length > 0) {
    children.push(bodyParagraph(`제${tocNum}장  종합 사례 분석`, { spacing: 60 }))
    tocNum++
  }
  children.push(bodyParagraph(`제${tocNum}장  학습 체크리스트 & 자기 진단`, { spacing: 60 }))
  tocNum++
  children.push(bodyParagraph(`제${tocNum}장  용어 정리`, { spacing: 60 }))
  tocNum++
  children.push(bodyParagraph(`제${tocNum}장  참고 자료`, { spacing: 60 }))
  children.push(pageBreak())

  // ── 종합 요약 ─────────────────────────────────────────────────
  children.push(heading('종합 요약', HeadingLevel.HEADING_1))
  children.push(infoParagraph(`"${capsule.capsule_title}"은 부동산 투자 교육에서 ${capsule.level} 레벨에 해당하는 핵심 주제입니다. 이 책에서는 총 ${capsule.syllabus.length}개의 챕터를 통해 이 주제를 깊이 있게 다룹니다.`))
  children.push(emptyLine())

  for (const line of capsule.overview.split('\n')) {
    if (line.trim()) children.push(bodyParagraph(line.trim()))
  }
  children.push(emptyLine())

  children.push(subHeading('이 책에서 배울 수 있는 것'))
  for (const item of capsule.syllabus) {
    const points = matchTheoryPoints(item.topic, capsule.theory_points)
    children.push(bodyParagraph(`• ${item.topic}: ${points[0] || item.description || '핵심 개념 학습'}`, { indent: true }))
  }
  children.push(emptyLine())

  children.push(subHeading('전문가 분석 개요'))
  children.push(bodyParagraph(`• 분석 참여 전문가: ${capsule.expert_sources.length}명`))
  children.push(bodyParagraph(`• 핵심 이론 포인트: ${capsule.theory_points.length}개`))
  children.push(bodyParagraph(`• 실전 사례: ${capsule.case_study_refs.length}건`))
  children.push(bodyParagraph(`• 총 학습 시간: ${totalDuration}분`))
  children.push(pageBreak())

  // ── 챕터별 본문 ───────────────────────────────────────────────
  for (const item of capsule.syllabus) {
    const chapterPoints = matchTheoryPoints(item.topic, capsule.theory_points)

    // 챕터 표지
    children.push(...sectionCover(
      `제${chapterNum}장: ${item.topic}`,
      `${TYPE_LABELS[item.type] || item.type}형  ·  학습시간 ${item.duration_min}분`,
      chapterNum
    ))

    // ■ 도입
    children.push(subHeading('■ 도입 — 왜 이 주제가 중요한가'))
    children.push(bodyParagraph(`${item.topic}은(는) 부동산 투자에서 반드시 이해해야 하는 핵심 개념입니다. 이 챕터에서는 ${item.description || `${item.topic}의 본질과 실전 활용 방법`}을 체계적으로 학습합니다.`))
    children.push(emptyLine())
    children.push(bodyParagraph('실무에서 이 개념이 자주 등장하는 상황:'))
    children.push(bodyParagraph(`• 부동산 매매/임대 계약 과정에서`, { indent: true }))
    children.push(bodyParagraph(`• 투자 수익성 분석 단계에서`, { indent: true }))
    children.push(bodyParagraph(`• 리스크 관리 및 법적 검토 시`, { indent: true }))
    children.push(emptyLine())

    // ■ 핵심 개념
    children.push(subHeading('■ 핵심 개념 상세 설명'))
    children.push(infoParagraph(`다수 전문가의 설명 방식을 종합하여, 가장 이해하기 쉽고 정확한 방식으로 ${item.topic}을(를) 설명합니다.`))
    children.push(emptyLine())

    if (chapterPoints.length > 0) {
      for (let pi = 0; pi < chapterPoints.length; pi++) {
        children.push(new Paragraph({
          children: [text(`${pi + 1}. ${chapterPoints[pi]}`, { bold: true, size: BODY_SIZE })],
          spacing: { before: 120, after: 80 },
          indent: { left: 200 },
        }))
        // 각 포인트에 대한 설명 추가
        children.push(bodyParagraph(
          `이 개념은 실제 투자 현장에서 중요하게 활용됩니다. 핵심은 체계적인 이해와 실전 적용 능력을 갖추는 것입니다.`,
          { indent: true }
        ))
        children.push(emptyLine())
      }
    } else {
      children.push(bodyParagraph(`${item.topic}의 핵심 개념은 다음과 같습니다:`))
      children.push(bodyParagraph('• 기본 정의와 법적/경제적 의미 이해', { indent: true }))
      children.push(bodyParagraph('• 실무에서의 활용 맥락과 절차', { indent: true }))
      children.push(bodyParagraph('• 관련 개념과의 연결 및 구분', { indent: true }))
    }
    children.push(emptyLine())

    // ■ 전문가 관점 비교
    children.push(subHeading('■ 전문가 관점 비교'))
    children.push(infoParagraph('NPLatform 부동산 전문가들은 이 주제에 대해 다양한 관점을 제시합니다. 아래는 주요 접근 방식의 비교입니다.'))
    children.push(emptyLine())
    children.push(bodyParagraph('접근법 A — 이론 중심 관점:'))
    children.push(bodyParagraph(`  ${item.topic}의 법적/제도적 구조를 먼저 이해하고, 이를 바탕으로 실전에 적용하는 방식입니다. 특히 초보 투자자에게 권장되는 접근법입니다.`, { indent: true }))
    children.push(emptyLine())
    children.push(bodyParagraph('접근법 B — 실전 중심 관점:'))
    children.push(bodyParagraph(`  실제 사례를 먼저 분석하여 패턴을 파악하고, 이론을 역방향으로 습득하는 방식입니다. 경험이 어느 정도 있는 투자자에게 효과적입니다.`, { indent: true }))
    children.push(emptyLine())
    children.push(bodyParagraph('통합적 관점:'))
    children.push(bodyParagraph(`  두 접근법을 상황에 따라 유연하게 활용하는 것이 가장 효과적입니다. 이 챕터는 두 관점을 모두 반영하여 구성했습니다.`, { indent: true }))
    children.push(emptyLine())

    // ■ 실전 사례
    children.push(subHeading('■ 실전 사례와 적용'))
    children.push(infoParagraph('전문가들이 실제 투자 현장에서 경험한 사례를 바탕으로 작성했습니다.'))
    children.push(emptyLine())

    const relatedCases = capsule.case_study_refs.filter((ref: any) => {
      const refText = `${ref.label || ''} ${ref.context || ''}`.toLowerCase()
      return item.topic.toLowerCase().split(/\s+/).some(w => refText.includes(w))
    })

    if (relatedCases.length > 0) {
      for (let ci = 0; ci < Math.min(2, relatedCases.length); ci++) {
        const ref = relatedCases[ci]
        children.push(bodyParagraph(`사례 ${ci + 1}: [${ref.label || '사례'}] ${ref.number || ref.matched || ''}`))
        if (ref.context) {
          children.push(bodyParagraph(ref.context, { indent: true }))
        }
        children.push(bodyParagraph('이 사례에서 얻을 수 있는 교훈:', { indent: true }))
        children.push(bodyParagraph(`→ ${item.topic}에 대한 실전 이해를 높이고, 유사한 상황에서 올바른 판단을 내릴 수 있습니다.`, { indent: true }))
        children.push(emptyLine())
      }
    } else {
      children.push(bodyParagraph(`${item.topic}과 관련된 실전 시나리오:`))
      children.push(bodyParagraph('시나리오 1: 초보 투자자가 처음 마주치는 상황', { indent: true }))
      children.push(bodyParagraph(`  → ${item.topic}의 기본을 모르면 불리한 계약 조건에 서명할 위험이 있습니다.`, { indent: true }))
      children.push(emptyLine())
      children.push(bodyParagraph('시나리오 2: 중급 투자자의 응용 사례', { indent: true }))
      children.push(bodyParagraph(`  → ${item.topic}을(를) 활용하여 투자 수익률을 최적화하는 전략을 구사할 수 있습니다.`, { indent: true }))
    }
    children.push(emptyLine())

    // ■ 실전 적용 가이드
    children.push(subHeading('■ 실전 적용 가이드'))
    children.push(bodyParagraph(`${item.topic}을(를) 실제 투자에 적용할 때 주의할 점:`))
    children.push(emptyLine())
    children.push(bodyParagraph('✅ 해야 할 것 (Do\'s):'))
    children.push(bodyParagraph('• 관련 법령 및 규정을 최신 버전으로 확인하기', { indent: true }))
    children.push(bodyParagraph('• 전문가(법무사, 공인중개사 등)와 반드시 협의하기', { indent: true }))
    children.push(bodyParagraph('• 사례별로 다를 수 있으므로 개별 상황 면밀히 검토하기', { indent: true }))
    children.push(emptyLine())
    children.push(bodyParagraph('❌ 피해야 할 것 (Don\'ts):'))
    children.push(bodyParagraph('• 인터넷 정보만 믿고 중요한 결정 내리기', { indent: true }))
    children.push(bodyParagraph('• 관련 서류 미검토 상태에서 계약 진행하기', { indent: true }))
    children.push(bodyParagraph('• 단기 수익에만 집중하여 리스크 간과하기', { indent: true }))
    children.push(emptyLine())

    // ■ 핵심 정리
    children.push(subHeading('■ 챕터 핵심 정리'))
    children.push(infoParagraph(`제${chapterNum}장 "${item.topic}"에서 반드시 기억할 핵심 포인트:`))
    const summaryPoints = chapterPoints.length > 0 ? chapterPoints : capsule.theory_points.slice(0, 3)
    for (let sp = 0; sp < Math.min(5, summaryPoints.length); sp++) {
      children.push(bodyParagraph(`${sp + 1}. ${summaryPoints[sp]}`))
    }
    children.push(emptyLine())
    children.push(new Paragraph({
      children: [text(`📌 학습 소요시간: ${item.duration_min}분  |  유형: ${TYPE_LABELS[item.type] || item.type}`, { size: SMALL_SIZE, color: '999999' })],
      spacing: { after: 100 },
    }))

    children.push(pageBreak())
    chapterNum++
  }

  // ── 종합 사례 분석 ─────────────────────────────────────────────
  if (capsule.case_study_refs.length > 0) {
    children.push(heading(`제${chapterNum}장: 종합 사례 분석`, HeadingLevel.HEADING_1))
    children.push(infoParagraph(`총 ${capsule.case_study_refs.length}건의 실전 사례를 분석합니다. 각 사례에서 얻을 수 있는 투자 교훈에 주목하세요.`))
    children.push(emptyLine())

    for (let i = 0; i < capsule.case_study_refs.length; i++) {
      const ref = capsule.case_study_refs[i]
      const label = ref.label || ref.type || '사례'
      const number = ref.number || ref.matched || ''
      children.push(subHeading(`사례 ${i + 1}: [${label}] ${number}`))
      if (ref.context) {
        children.push(bodyParagraph('사례 내용:'))
        children.push(bodyParagraph(ref.context, { indent: true }))
      }
      if (ref.court) {
        children.push(bodyParagraph(`• 관할/출처: ${ref.court}`, { indent: true }))
      }
      children.push(emptyLine())
      children.push(bodyParagraph('이 사례의 핵심 교훈:'))
      children.push(bodyParagraph(`• ${label} 관련 사항은 계약 전 반드시 확인이 필요합니다.`, { indent: true }))
      children.push(bodyParagraph(`• 전문가의 조언을 구하여 리스크를 최소화하세요.`, { indent: true }))
      children.push(emptyLine())
    }
    children.push(pageBreak())
    chapterNum++
  }

  // ── 학습 체크리스트 ────────────────────────────────────────────
  children.push(heading(`제${chapterNum}장: 학습 체크리스트 & 자기 진단`, HeadingLevel.HEADING_1))
  children.push(infoParagraph('이 책을 다 읽은 후 아래 항목들을 확인하세요. 모든 항목에 자신 있게 답할 수 있다면 학습 목표를 달성한 것입니다.'))
  children.push(emptyLine())

  children.push(subHeading('학습 체크리스트'))
  for (const item of capsule.syllabus) {
    children.push(checkItem(`${item.topic}의 핵심 개념을 남에게 설명할 수 있다`))
  }
  for (const point of capsule.theory_points.slice(0, 5)) {
    children.push(checkItem(point))
  }
  children.push(checkItem('관련 실전 사례를 2개 이상 들 수 있다'))
  children.push(checkItem('주의사항과 흔한 실수를 3가지 이상 알고 있다'))
  children.push(emptyLine())

  children.push(subHeading('자기 진단 질문'))
  children.push(bodyParagraph('다음 질문에 자신의 말로 답해보세요:'))
  children.push(emptyLine())
  for (let i = 0; i < Math.min(5, capsule.syllabus.length); i++) {
    children.push(bodyParagraph(`Q${i + 1}. ${capsule.syllabus[i].topic}을(를) 실제 투자에 어떻게 적용할 수 있나요?`))
    children.push(new Paragraph({
      children: [text('나의 답변: ________________________________________________________________________', { size: BODY_SIZE, color: 'CCCCCC' })],
      spacing: { after: 120 },
      indent: { left: 200 },
    }))
    children.push(emptyLine())
  }
  children.push(pageBreak())
  chapterNum++

  // ── 용어 정리 ────────────────────────────────────────────────
  children.push(heading(`제${chapterNum}장: 용어 정리`, HeadingLevel.HEADING_1))
  children.push(infoParagraph('이 책에서 사용된 주요 용어를 정리합니다. 처음 접하는 용어가 있다면 이 챕터를 먼저 참고하세요.'))
  children.push(emptyLine())

  for (const point of capsule.theory_points) {
    const colonIdx = point.indexOf(':')
    if (colonIdx > 0) {
      const term = point.substring(0, colonIdx).trim()
      const def = point.substring(colonIdx + 1).trim()
      children.push(new Paragraph({
        children: [text(term, { bold: true, size: BODY_SIZE }), text(': ', { size: BODY_SIZE }), text(def, { size: BODY_SIZE })],
        spacing: { after: 100, line: 360 },
      }))
    } else {
      children.push(new Paragraph({
        children: [text('▪ ', { bold: true, size: BODY_SIZE, color: '7C3AED' }), text(point, { size: BODY_SIZE })],
        spacing: { after: 100, line: 360 },
      }))
    }
  }
  children.push(pageBreak())
  chapterNum++

  // ── 참고 자료 ─────────────────────────────────────────────────
  children.push(heading(`제${chapterNum}장: 참고 자료`, HeadingLevel.HEADING_1))

  children.push(subHeading('전문가 출처'))
  children.push(infoParagraph(`이 책은 NPLatform 부동산 전문가 ${capsule.expert_sources.length}명의 강의를 AI가 종합 분석하여 제작했습니다. 개별 채널명 및 이름은 출처 정책에 따라 공개하지 않습니다.`))
  children.push(bodyParagraph(`• 참여 전문가 수: ${capsule.expert_sources.length}명`))
  children.push(bodyParagraph(`• 평균 관련도: ${capsule.expert_sources.length > 0 ? Math.round(capsule.expert_sources.reduce((s, e) => s + e.relevance, 0) / capsule.expert_sources.length * 100) : 0}%`))
  children.push(emptyLine())

  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    children.push(subHeading('선수 학습 개념'))
    children.push(bodyParagraph('이 책을 읽기 전에 이해하면 도움이 되는 개념:'))
    for (const prereq of capsule.prerequisite_concepts) {
      children.push(bodyParagraph(`• ${prereq.name}`, { indent: true }))
    }
    children.push(emptyLine())
  }

  children.push(subHeading('학습 가이드'))
  for (const line of capsule.teaching_guidelines.split('\n')) {
    if (line.trim()) children.push(bodyParagraph(`• ${line.trim()}`))
  }
  children.push(emptyLine())

  children.push(divider())
  children.push(new Paragraph({
    children: [text(`출처: NPLatform 부동산 전문가 ${capsule.expert_sources.length}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '999999' })],
    alignment: AlignmentType.CENTER,
  }))
  children.push(new Paragraph({
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
    alignment: AlignmentType.CENTER,
  }))

  return children
}

// ============================================================
// Public API
// ============================================================

export function generateLecturePlan(capsule: LectureCapsuleRecord): Document {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    sections: [{ children: buildLecturePlanChildren(capsule) }],
  })
}

export function generateEbook(capsule: LectureCapsuleRecord): Document {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    sections: [{ children: buildEbookChildren(capsule) }],
  })
}

export async function packDocxToBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc) as Promise<Buffer>
}

// ============================================================
// AI 강의안 DOCX (Phase 5-2)
// ============================================================

export function generateAILecturePlanDocx(
  capsule: LectureCapsuleRecord,
  plan: LecturePlanResult,
  ontologyContext?: ConceptOntologyContext,
): Document {
  const children: (Paragraph | Table)[] = []

  // Cover
  children.push(emptyLine(), emptyLine())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(capsule.capsule_title, { bold: true, size: TITLE_SIZE })],
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text('AI 합성 강의안', { size: H2_SIZE, color: '7C3AED' })],
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`NPLatform 부동산 전문가 ${ontologyContext?.expert_count || 0}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '666666' })],
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
  }))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  // 0. 온톨로지 분석 개요
  if (ontologyContext) {
    children.push(heading('0. 온톨로지 분석 개요', HeadingLevel.HEADING_1))
    children.push(bodyParagraph(`로드맵 위치: ${ontologyContext.roadmap_position.level} 과정 ${ontologyContext.roadmap_position.order_in_level}/${ontologyContext.roadmap_position.total_in_level} (${ontologyContext.roadmap_position.lecture_level})`))
    children.push(bodyParagraph(`참여 전문가: ${ontologyContext.expert_count}명 | 관련 영상: ${ontologyContext.video_count}개`))
    children.push(bodyParagraph(`핵심 키워드: ${ontologyContext.keywords.slice(0, 8).join(', ')}`))

    if (ontologyContext.prerequisites.length > 0) {
      children.push(bodyParagraph(`선수 개념: ${ontologyContext.prerequisites.map(p => p.name).join(', ')}`, { bullet: true }))
    }
    if (ontologyContext.successors.length > 0) {
      children.push(bodyParagraph(`후속 개념: ${ontologyContext.successors.map(s => s.name).join(', ')}`, { bullet: true }))
    }
    children.push(emptyLine())
  }

  // 1. 강의 목표
  children.push(heading('1. 강의 목표', HeadingLevel.HEADING_1))
  children.push(bodyParagraph(plan.lecture_goal))
  children.push(bodyParagraph(`대상: ${plan.target_description}`))
  children.push(emptyLine())

  // 2. 온톨로지 분석 요약
  if (plan.ontology_summary) {
    children.push(heading('2. 분석 요약', HeadingLevel.HEADING_1))
    children.push(bodyParagraph(`선별 대본: ${plan.ontology_summary.selected_transcript_count}개`, { bullet: true }))
    children.push(bodyParagraph(`이론 비율: ${plan.ontology_summary.theory_ratio}% | 사례 비율: ${plan.ontology_summary.case_ratio}%`, { bullet: true }))
    children.push(bodyParagraph(`핵심 키워드: ${plan.ontology_summary.core_keywords?.join(', ') || ''}`, { bullet: true }))
    children.push(emptyLine())
  }

  // 3. 커리큘럼 테이블
  children.push(heading('3. 강의 커리큘럼', HeadingLevel.HEADING_1))

  const currHeaderCells = ['시간', '내용', '방식'].map(label =>
    new TableCell({
      children: [new Paragraph({ children: [text(label, { bold: true, size: SMALL_SIZE, color: 'FFFFFF' })] })],
      shading: { type: ShadingType.SOLID, color: '7C3AED' },
    })
  )

  const currRows = plan.curriculum.map(item =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [text(item.time_range || '', { size: SMALL_SIZE })] })] }),
        new TableCell({
          children: [
            new Paragraph({ children: [text(item.title, { size: SMALL_SIZE, bold: true })] }),
            ...(item.teaching_notes ? [new Paragraph({ children: [text(item.teaching_notes, { size: 16, color: '666666' })], spacing: { before: 50 } })] : []),
          ],
        }),
        new TableCell({
          children: [new Paragraph({ children: [text(
            TYPE_LABELS[item.content_type] || item.content_type, { size: SMALL_SIZE }
          )] })],
        }),
      ],
    })
  )

  children.push(new Table({
    rows: [new TableRow({ children: currHeaderCells }), ...currRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }))
  children.push(emptyLine())

  // 4. 섹션별 상세
  children.push(heading('4. 섹션별 강의 노트', HeadingLevel.HEADING_1))
  for (const item of plan.curriculum) {
    children.push(new Paragraph({
      children: [text(`■ ${item.title} (${item.time_range})`, { bold: true, size: H2_SIZE })],
      spacing: { before: 200, after: 100 },
    }))

    if (item.teaching_notes) {
      children.push(bodyParagraph(item.teaching_notes))
    }

    if (item.key_points && item.key_points.length > 0) {
      for (const kp of item.key_points) {
        children.push(bodyParagraph(kp, { bullet: true }))
      }
    }

    if (item.case_reference) {
      children.push(bodyParagraph(`사례: ${item.case_reference}`, { spacing: 50 }))
    }

    if (item.slide_guide) {
      children.push(new Paragraph({
        children: [text(`슬라이드: ${item.slide_guide}`, { size: SMALL_SIZE, color: '999999' })],
        spacing: { after: 50 },
      }))
    }

    if (item.expected_questions && item.expected_questions.length > 0) {
      children.push(new Paragraph({
        children: [text('예상 질문:', { size: SMALL_SIZE, color: '7C3AED' })],
        spacing: { before: 50 },
      }))
      for (const q of item.expected_questions) {
        children.push(bodyParagraph(`  Q. ${q}`, { spacing: 30 }))
      }
    }
  }

  // 5. 참고 자료
  if (plan.supplementary_notes) {
    children.push(heading('5. 참고 자료', HeadingLevel.HEADING_1))
    children.push(bodyParagraph(plan.supplementary_notes))
  }

  // Footer
  children.push(emptyLine())
  children.push(new Paragraph({
    children: [text(`출처: NPLatform 부동산 전문가 ${ontologyContext?.expert_count || 0}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '999999' })],
  }))

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    sections: [{ children }],
  })
}

// ============================================================
// AI 전자책 DOCX (Phase 5-3)
// ============================================================

export function generateAIEbookDocx(capsule: EnrichedCapsule): Document {
  const children: (Paragraph | Table)[] = []
  const ai = capsule.ai
  const ctx = capsule.ontologyContext

  // Cover
  children.push(emptyLine(), emptyLine(), emptyLine())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(capsule.capsule_title, { bold: true, size: 64 })],
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text('체계적 전문 실용서', { size: H2_SIZE, color: '7C3AED' })],
    spacing: { after: 150 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`NPLatform 부동산 전문가 ${ai?.ontology_summary?.expert_count || 0}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '666666' })],
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
  }))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  // 1. 온톨로지 분석 개요
  if (ctx) {
    children.push(heading('온톨로지 분석 개요', HeadingLevel.HEADING_1))
    children.push(bodyParagraph(`이 책이 다루는 주제: ${capsule.capsule_title}`))
    children.push(bodyParagraph(`로드맵 위치: ${ctx.roadmap_position.level} 과정 ${ctx.roadmap_position.order_in_level}/${ctx.roadmap_position.total_in_level}`))
    children.push(bodyParagraph(`분석 참여 전문가: ${ctx.expert_count}명 | 관련 영상: ${ctx.video_count}개`))
    children.push(bodyParagraph(`핵심 키워드: ${ctx.keywords.slice(0, 10).join(', ')}`))
    if (ai?.ontology_summary?.prerequisites && ai.ontology_summary.prerequisites.length > 0) {
      children.push(bodyParagraph(`선수 개념: ${ai.ontology_summary.prerequisites.join(', ')}`, { bullet: true }))
    }
    if (ai?.ontology_summary?.successors && ai.ontology_summary.successors.length > 0) {
      children.push(bodyParagraph(`후속 개념: ${ai.ontology_summary.successors.join(', ')}`, { bullet: true }))
    }
    children.push(new Paragraph({ children: [new PageBreak()] }))
  }

  // 2. 종합 요약
  if (ai?.executive_summary) {
    children.push(heading('종합 요약', HeadingLevel.HEADING_1))
    for (const line of ai.executive_summary.split('\n')) {
      if (line.trim()) children.push(bodyParagraph(line.trim()))
    }
    children.push(new Paragraph({ children: [new PageBreak()] }))
  }

  // 3. 목차
  children.push(heading('목차', HeadingLevel.HEADING_1))
  let chNum = 1
  for (const item of capsule.syllabus) {
    children.push(bodyParagraph(`제${chNum}장  ${item.topic}`, { spacing: 60 }))
    chNum++
  }
  children.push(bodyParagraph(`제${chNum}장  종합 사례 연구`, { spacing: 60 }))
  chNum++
  children.push(bodyParagraph(`제${chNum}장  전문가 비교 종합 분석`, { spacing: 60 }))
  chNum++
  children.push(bodyParagraph(`제${chNum}장  학습 체크리스트 & 자기 진단`, { spacing: 60 }))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  // 4. 챕터들
  chNum = 1
  for (const item of capsule.syllabus) {
    const chContent = ai?.chapter_contents?.[item.topic]
    children.push(heading(`제${chNum}장: ${item.topic}`, HeadingLevel.HEADING_1))

    if (chContent) {
      // 도입
      if (chContent.introduction) {
        children.push(new Paragraph({
          children: [text('■ 도입', { bold: true, size: H2_SIZE, color: '7C3AED' })],
          spacing: { before: 150, after: 100 },
        }))
        for (const line of chContent.introduction.split('\n')) {
          if (line.trim()) children.push(bodyParagraph(line.trim()))
        }
      }

      // 핵심 개념
      if (chContent.core_explanation) {
        children.push(new Paragraph({
          children: [text('■ 핵심 개념 상세 설명', { bold: true, size: H2_SIZE, color: '7C3AED' })],
          spacing: { before: 200, after: 100 },
        }))
        for (const line of chContent.core_explanation.split('\n')) {
          if (line.trim()) children.push(bodyParagraph(line.trim()))
        }
      }

      // 전문가 비교
      if (chContent.expert_comparison) {
        children.push(new Paragraph({
          children: [text('■ 전문가 관점 비교', { bold: true, size: H2_SIZE, color: '7C3AED' })],
          spacing: { before: 200, after: 100 },
        }))
        for (const line of chContent.expert_comparison.split('\n')) {
          if (line.trim()) children.push(bodyParagraph(line.trim()))
        }
      }

      // 실전 사례
      if (chContent.practical_cases) {
        children.push(new Paragraph({
          children: [text('■ 실전 사례와 적용', { bold: true, size: H2_SIZE, color: '7C3AED' })],
          spacing: { before: 200, after: 100 },
        }))
        for (const line of chContent.practical_cases.split('\n')) {
          if (line.trim()) children.push(bodyParagraph(line.trim()))
        }
      }

      // 적용 가이드
      if (chContent.application_guide) {
        children.push(new Paragraph({
          children: [text('■ 실전 적용 가이드', { bold: true, size: H2_SIZE, color: '7C3AED' })],
          spacing: { before: 200, after: 100 },
        }))
        for (const line of chContent.application_guide.split('\n')) {
          if (line.trim()) children.push(bodyParagraph(line.trim()))
        }
      }

      // 핵심 정리
      if (chContent.key_takeaways && chContent.key_takeaways.length > 0) {
        children.push(new Paragraph({
          children: [text('■ 챕터 핵심 정리', { bold: true, size: H2_SIZE, color: '7C3AED' })],
          spacing: { before: 200, after: 100 },
        }))
        for (const kt of chContent.key_takeaways) {
          children.push(bodyParagraph(kt, { bullet: true }))
        }
      }
    } else {
      // 폴백: 기존 방식
      if (item.description) children.push(bodyParagraph(item.description))
      children.push(bodyParagraph(`학습 소요시간: ${item.duration_min}분`, { spacing: 50 }))
    }

    children.push(new Paragraph({ children: [new PageBreak()] }))
    chNum++
  }

  // 5. 종합 사례 연구
  if (ai?.comprehensive_case_study) {
    children.push(heading(`제${chNum}장: 종합 사례 연구`, HeadingLevel.HEADING_1))
    for (const line of ai.comprehensive_case_study.split('\n')) {
      if (line.trim()) children.push(bodyParagraph(line.trim()))
    }
    children.push(new Paragraph({ children: [new PageBreak()] }))
    chNum++
  }

  // 6. 전문가 비교 종합
  if (ai?.comparative_analysis) {
    children.push(heading(`제${chNum}장: 전문가 비교 종합 분석`, HeadingLevel.HEADING_1))
    for (const line of ai.comparative_analysis.split('\n')) {
      if (line.trim()) children.push(bodyParagraph(line.trim()))
    }
    children.push(new Paragraph({ children: [new PageBreak()] }))
    chNum++
  }

  // 7. 체크리스트 + 자기 진단
  children.push(heading(`제${chNum}장: 학습 체크리스트 & 자기 진단`, HeadingLevel.HEADING_1))

  if (ai?.learning_checklist && ai.learning_checklist.length > 0) {
    children.push(new Paragraph({
      children: [text('학습 체크리스트', { bold: true, size: H2_SIZE })],
      spacing: { before: 100, after: 100 },
    }))
    for (const item of ai.learning_checklist) {
      children.push(bodyParagraph(`☐ ${item}`, { spacing: 50 }))
    }
  }

  if (ai?.self_assessment && ai.self_assessment.length > 0) {
    children.push(new Paragraph({
      children: [text('자기 진단 질문', { bold: true, size: H2_SIZE })],
      spacing: { before: 200, after: 100 },
    }))
    for (let i = 0; i < ai.self_assessment.length; i++) {
      children.push(bodyParagraph(`${i + 1}. ${ai.self_assessment[i]}`, { spacing: 80 }))
    }
  }

  if (ai?.next_steps) {
    children.push(new Paragraph({
      children: [text('다음 학습 추천', { bold: true, size: H2_SIZE })],
      spacing: { before: 200, after: 100 },
    }))
    children.push(bodyParagraph(ai.next_steps))
  }

  // Footer
  children.push(emptyLine())
  children.push(new Paragraph({
    children: [text(`출처: NPLatform 부동산 전문가 ${ai?.ontology_summary?.expert_count || 0}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '999999' })],
  }))

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    sections: [{ children }],
  })
}

// ============================================================
// Atomic 캡슐 학습자료 DOCX (Phase 6)
// 완전 자기완결형 학습 캡슐을 전문 교재 수준의 DOCX로 출력
// ============================================================

export interface AtomicCapsuleDocxInput {
  conceptName: string
  conceptLevel: string
  domainName: string
  capsules: Array<{
    topic: string
    description: string
    order_in_concept: number
    difficulty: string
    estimated_min: number
    content_json: AtomicCapsuleContent | null
  }>
}

const DIFF_LABELS: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export function generateAtomicCapsuleDocx(input: AtomicCapsuleDocxInput): Document {
  const children: (Paragraph | Table)[] = []
  const { conceptName, conceptLevel, domainName, capsules } = input
  const totalMin = capsules.reduce((s, c) => s + (c.estimated_min || 10), 0)

  // ── 표지 ──
  children.push(emptyLine(), emptyLine(), emptyLine())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(conceptName, { bold: true, size: 64 })],
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text('Atomic 캡슐 완전 학습 교재', { size: H1_SIZE, color: '7C3AED' })],
    spacing: { after: 150 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`${domainName} > ${conceptLevel} 과정`, { size: H2_SIZE, color: '6B7280' })],
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`총 ${capsules.length}개 캡슐 · 예상 학습시간 ${totalMin >= 60 ? `${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분` : `${totalMin}분`}`, { size: SMALL_SIZE, color: '666666' })],
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
  }))
  children.push(pageBreak())

  // ── 목차 ──
  children.push(heading('목차', HeadingLevel.HEADING_1))
  for (const cap of capsules) {
    const diff = DIFF_LABELS[cap.difficulty] || cap.difficulty
    children.push(bodyParagraph(`${cap.order_in_concept}. ${cap.topic} [${diff}] (${cap.estimated_min}분)`, { spacing: 60 }))
  }
  children.push(pageBreak())

  // ── 캡슐별 상세 ──
  for (const cap of capsules) {
    const c = cap.content_json
    const diff = DIFF_LABELS[cap.difficulty] || cap.difficulty

    // 캡슐 헤더
    children.push(...sectionCover(
      `캡슐 ${cap.order_in_concept}: ${cap.topic}`,
      `${diff} · ${cap.estimated_min}분`,
      cap.order_in_concept,
    ))

    if (!c) {
      children.push(bodyParagraph(cap.description || '콘텐츠가 아직 생성되지 않았습니다.'))
      children.push(pageBreak())
      continue
    }

    // 1. 개념 정의
    children.push(subHeading('1. 개념 정의'))
    children.push(infoParagraph(`[공식 정의] ${c.definition.formal}`))
    children.push(emptyLine())
    children.push(bodyParagraph(c.definition.plain))
    if (c.definition.key_characteristics.length > 0) {
      children.push(new Paragraph({
        children: [text('핵심 특성:', { bold: true, size: BODY_SIZE })],
        spacing: { before: 100, after: 60 },
      }))
      for (const kc of c.definition.key_characteristics) {
        children.push(bodyParagraph(kc, { bullet: true }))
      }
    }

    // 2. 왜 중요한가
    children.push(subHeading('2. 왜 중요한가'))
    children.push(bodyParagraph(c.importance.why_essential))
    children.push(infoParagraph(`[투자 영향] ${c.importance.investment_impact}`))

    // 3. 핵심 원리 단계별
    children.push(subHeading('3. 핵심 원리'))
    for (const p of c.principles) {
      children.push(new Paragraph({
        children: [text(`Step ${p.step}: ${p.title}`, { bold: true, size: H3_SIZE })],
        spacing: { before: 150, after: 80 },
      }))
      children.push(bodyParagraph(p.explanation))
      if (p.example) {
        children.push(infoParagraph(`[예시] ${p.example}`))
      }
    }

    // 4. 법령 근거
    children.push(subHeading('4. 법령 근거', '2563EB'))
    if (c.legal_foundation.laws.length > 0) {
      const lawHeaderCells = ['법령명', '조항', '요약'].map(label =>
        new TableCell({
          children: [new Paragraph({ children: [text(label, { bold: true, size: SMALL_SIZE, color: 'FFFFFF' })] })],
          shading: { type: ShadingType.SOLID, color: '2563EB' },
        })
      )
      const lawRows = c.legal_foundation.laws.map(law =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [text(law.law_name, { size: SMALL_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [text(law.article, { size: SMALL_SIZE, bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [text(law.summary, { size: SMALL_SIZE })] })] }),
          ],
        })
      )
      children.push(new Table({
        rows: [new TableRow({ children: lawHeaderCells }), ...lawRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }))
    }
    if (c.legal_foundation.latest_changes) {
      children.push(emptyLine())
      children.push(infoParagraph(`[최신 변경사항] ${c.legal_foundation.latest_changes}`))
    }

    // 5. 실전 사례
    children.push(subHeading('5. 실전 사례', '059669'))
    children.push(new Paragraph({
      children: [text('성공 사례', { bold: true, size: BODY_SIZE, color: '059669' })],
      spacing: { before: 100, after: 60 },
    }))
    children.push(bodyParagraph(c.cases.success_case))
    children.push(new Paragraph({
      children: [text('실패 사례', { bold: true, size: BODY_SIZE, color: 'DC2626' })],
      spacing: { before: 150, after: 60 },
    }))
    children.push(bodyParagraph(c.cases.failure_case))
    if (c.cases.scenario) {
      children.push(new Paragraph({
        children: [text('시뮬레이션 시나리오', { bold: true, size: BODY_SIZE, color: '7C3AED' })],
        spacing: { before: 150, after: 60 },
      }))
      children.push(bodyParagraph(c.cases.scenario))
    }

    // 6. 흔한 실수 TOP 3
    children.push(subHeading('6. 흔한 실수 TOP 3', 'DC2626'))
    for (let i = 0; i < c.common_mistakes.length; i++) {
      const m = c.common_mistakes[i]
      children.push(new Paragraph({
        children: [text(`실수 ${i + 1}: ${m.mistake}`, { bold: true, size: BODY_SIZE })],
        spacing: { before: 120, after: 50 },
      }))
      children.push(bodyParagraph(`실제: ${m.reality}`, { indent: true }))
      children.push(bodyParagraph(`바른 접근: ${m.correct_approach}`, { indent: true }))
    }

    // 7. 실전 체크리스트
    children.push(subHeading('7. 실전 체크리스트', 'F59E0B'))
    for (const item of c.checklist) {
      children.push(checkItem(item))
    }

    // 8. 연습문제
    const quizItems = c.quiz || []
    if (quizItems.length > 0) {
      children.push(subHeading('8. 연습문제'))
      for (let i = 0; i < quizItems.length; i++) {
        const q = quizItems[i]
        children.push(new Paragraph({
          children: [text(`Q${i + 1}. ${q.question}`, { bold: true, size: BODY_SIZE })],
          spacing: { before: 150, after: 60 },
        }))
        if (q.options && q.options.length > 0) {
          for (let j = 0; j < q.options.length; j++) {
            children.push(bodyParagraph(`  ${String.fromCharCode(9312 + j)} ${q.options[j]}`, { spacing: 40 }))
          }
        }
        children.push(infoParagraph(`정답: ${q.answer}`))
        children.push(bodyParagraph(`해설: ${q.explanation}`, { spacing: 60 }))
      }
    }

    // 9. 마스터 확인
    children.push(subHeading('9. 마스터 확인', '10B981'))
    if (c.mastery.criteria.length > 0) {
      children.push(new Paragraph({
        children: [text('마스터 기준 — 아래를 모두 이해했으면 이 캡슐을 마스터한 것입니다:', { bold: true, size: BODY_SIZE })],
        spacing: { after: 80 },
      }))
      for (const cr of c.mastery.criteria) {
        children.push(checkItem(cr))
      }
    }
    if (c.mastery.self_check.length > 0) {
      children.push(new Paragraph({
        children: [text('자기 확인 질문:', { bold: true, size: BODY_SIZE })],
        spacing: { before: 150, after: 80 },
      }))
      for (let i = 0; i < c.mastery.self_check.length; i++) {
        children.push(bodyParagraph(`${i + 1}. ${c.mastery.self_check[i]}`))
      }
    }
    if (c.mastery.next_topics.length > 0) {
      children.push(new Paragraph({
        children: [text('다음 학습 추천:', { bold: true, size: BODY_SIZE, color: '7C3AED' })],
        spacing: { before: 150, after: 80 },
      }))
      for (const nt of c.mastery.next_topics) {
        children.push(bodyParagraph(nt, { bullet: true }))
      }
    }

    // 출처
    if (c.sources && c.sources.length > 0) {
      children.push(divider())
      children.push(new Paragraph({
        children: [text(`참고 출처: ${c.sources.join(' | ')}`, { size: 16, color: '999999' })],
        spacing: { after: 100 },
      }))
    }

    // 다음 캡슐 전 페이지 구분
    children.push(pageBreak())
  }

  // ── 부록: 전체 키워드 ──
  children.push(heading('부록: 핵심 키워드 색인', HeadingLevel.HEADING_1))
  const allKeywords = new Set<string>()
  for (const cap of capsules) {
    const kw = cap.content_json?.keywords || []
    kw.forEach(k => allKeywords.add(k))
  }
  children.push(bodyParagraph([...allKeywords].join(', ')))

  // Footer
  children.push(emptyLine())
  children.push(new Paragraph({
    children: [text(`출처: NPLatform 부동산 전문가들의 강의를 AI가 종합 분석 · ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
  }))

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    sections: [{ children }],
  })
}
