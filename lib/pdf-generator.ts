import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as fs from 'fs'
import * as path from 'path'
import type { LectureCapsuleRecord } from './ontology-db'
import type { EnrichedCapsule, LecturePlanResult, ConceptOntologyContext } from './ebook-types'
import type { AtomicCapsuleContent } from './web-enricher'
import type { AtomicCapsuleDocxInput } from './docx-generator'

// jspdf uses points (1pt = 1/72 inch), A4 = 210×297mm
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - MARGIN * 2
const PURPLE = '#7C3AED'
const GRAY = '#666666'
const LIGHT_GRAY = '#999999'

// ============================================================
// 한글 폰트 등록 (Malgun Gothic)
// ============================================================

let _koreanFontBase64: string | null = null

function getKoreanFontBase64(): string | null {
  if (_koreanFontBase64 !== null) return _koreanFontBase64
  try {
    // public/fonts/malgun.ttf (배포 시 process.cwd() 기준)
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'malgun.ttf')
    if (fs.existsSync(fontPath)) {
      _koreanFontBase64 = fs.readFileSync(fontPath).toString('base64')
      return _koreanFontBase64
    }
  } catch {
    // 폰트 파일 없으면 무시 (기본 폰트로 폴백)
  }
  _koreanFontBase64 = ''
  return null
}

// 한글 폰트를 jsPDF 인스턴스에 등록하고 활성화
function registerKoreanFont(doc: jsPDF): void {
  const base64 = getKoreanFontBase64()
  if (!base64) return
  try {
    doc.addFileToVFS('malgun.ttf', base64)
    doc.addFont('malgun.ttf', 'MalgunGothic', 'normal')
    doc.setFont('MalgunGothic')
  } catch {
    // 폰트 등록 실패 시 기본 폰트 유지
  }
}

// jsPDF 팩토리 — 한글 폰트 자동 등록
function createDoc(): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  registerKoreanFont(doc)
  return doc
}

const KOREAN_FONT = 'MalgunGothic'

const TYPE_LABELS: Record<string, string> = {
  theory: '이론',
  case: '사례',
  practice: '실습',
  summary: '정리',
}

// ============================================================
// Helpers
// ============================================================

function ensureSpace(doc: jsPDF, needed: number, y: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function ensureKoreanFont(doc: jsPDF): void {
  const fontList = doc.getFontList()
  if (fontList['MalgunGothic']) {
    doc.setFont('MalgunGothic', 'normal')
  }
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number,
  options?: { bold?: boolean; color?: string }
): number {
  doc.setFontSize(fontSize)
  if (options?.color) doc.setTextColor(options.color)
  else doc.setTextColor('#333333')
  // 한글 폰트 유지
  ensureKoreanFont(doc)

  // jspdf splitTextToSize for Korean text wrapping
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = ensureSpace(doc, lineHeight, y)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

function addPageBreak(doc: jsPDF): number {
  doc.addPage()
  // 페이지 추가 후 한글 폰트 재적용
  ensureKoreanFont(doc)
  return MARGIN
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, 12, y)
  doc.setFontSize(16)
  doc.setTextColor(PURPLE)
  doc.text(title, MARGIN, y)
  y += 3
  doc.setDrawColor(PURPLE)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 8
  doc.setTextColor('#333333')
  return y
}

// ============================================================
// 강의안 PDF
// ============================================================

export function generateLecturePlanPdf(capsule: LectureCapsuleRecord): Uint8Array {
  const doc = createDoc()

  // --- Cover ---
  let y = 80
  doc.setFontSize(28)
  doc.setTextColor(PURPLE)
  const titleLines = doc.splitTextToSize(capsule.capsule_title, CONTENT_W)
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, y, { align: 'center' })
    y += 14
  }

  y += 10
  doc.setFontSize(11)
  doc.setTextColor(GRAY)
  doc.text(
    `레벨: ${capsule.level}  |  소요시간: ${capsule.recommended_duration}분  |  난이도: ${capsule.difficulty_score ?? '-'}`,
    PAGE_W / 2, y, { align: 'center' }
  )
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

  // --- Page 2: Content ---
  y = addPageBreak(doc)

  // 1. Overview
  y = drawSectionTitle(doc, '1. 개요', y)
  for (const line of capsule.overview.split('\n')) {
    if (line.trim()) {
      y = drawWrappedText(doc, line.trim(), MARGIN, y, CONTENT_W, 6, 11)
      y += 2
    }
  }
  y += 6

  // 2. Teaching Guidelines
  y = drawSectionTitle(doc, '2. 교수법 가이드라인', y)
  for (const line of capsule.teaching_guidelines.split('\n')) {
    if (line.trim()) {
      const bullet = line.trim().startsWith('-') ? line.trim() : `• ${line.trim()}`
      y = drawWrappedText(doc, bullet, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 1
    }
  }
  y += 6

  // 3. Syllabus Table
  y = drawSectionTitle(doc, '3. 강의 실라버스', y)
  const totalDuration = capsule.syllabus.reduce((s, item) => s + item.duration_min, 0)

  autoTable(doc, {
    startY: y,
    head: [['순서', '주제', '설명', '시간(분)', '유형']],
    body: [
      ...capsule.syllabus.map(item => [
        String(item.order),
        item.topic,
        item.description || '',
        String(item.duration_min),
        TYPE_LABELS[item.type] || item.type,
      ]),
      ['', '합계', '', `${totalDuration}분`, ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 40 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  y = (doc as any).lastAutoTable?.finalY + 8 || y + 50

  // 4. Theory Points
  y = ensureSpace(doc, 20, y)
  y = drawSectionTitle(doc, '4. 핵심 이론', y)
  for (const point of capsule.theory_points) {
    y = drawWrappedText(doc, `• ${point}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
    y += 1
  }
  y += 6

  // 5. Case Study Refs
  if (capsule.case_study_refs.length > 0) {
    y = ensureSpace(doc, 20, y)
    y = drawSectionTitle(doc, '5. 참고 사례', y)
    for (const ref of capsule.case_study_refs) {
      const label = ref.label || ref.type || '사례'
      const number = ref.number || ref.matched || ''
      const context = ref.context ? ` — ${ref.context}` : ''
      y = drawWrappedText(doc, `[${label}] ${number}${context}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 1
    }
    y += 6
  }

  // 6. Expert Sources
  if (capsule.expert_sources.length > 0) {
    y = ensureSpace(doc, 20, y)
    y = drawSectionTitle(doc, '6. 전문가 출처', y)
    for (const src of capsule.expert_sources) {
      y = drawWrappedText(doc, `• ${src.channel_name} (관련도 ${Math.round(src.relevance * 100)}%)`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 1
    }
    y += 6
  }

  // 7. Prerequisites
  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    y = ensureSpace(doc, 20, y)
    y = drawSectionTitle(doc, '7. 선수 개념', y)
    const names = capsule.prerequisite_concepts.map(p => p.name).join(', ')
    y = drawWrappedText(doc, names, MARGIN, y, CONTENT_W, 6, 10)
  }

  return doc.output('arraybuffer') as unknown as Uint8Array
}

// ============================================================
// 전자책 PDF
// ============================================================

export function generateEbookPdf(capsule: LectureCapsuleRecord): Uint8Array {
  const doc = createDoc()

  // --- Cover ---
  let y = 70
  doc.setFontSize(32)
  doc.setTextColor(PURPLE)
  const titleLines = doc.splitTextToSize(capsule.capsule_title, CONTENT_W)
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, y, { align: 'center' })
    y += 16
  }
  y += 10
  doc.setFontSize(14)
  doc.text(`${capsule.level} 레벨  |  총 ${capsule.recommended_duration}분`, PAGE_W / 2, y, { align: 'center' })
  y += 10
  doc.setFontSize(9)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

  // --- TOC ---
  y = addPageBreak(doc)
  y = drawSectionTitle(doc, '목차', y)
  let chapterNum = 1
  for (const item of capsule.syllabus) {
    y = drawWrappedText(doc, `제${chapterNum}장  ${item.topic}`, MARGIN + 5, y, CONTENT_W - 5, 7, 11)
    chapterNum++
  }
  if (capsule.case_study_refs.length > 0) {
    y = drawWrappedText(doc, `제${chapterNum}장  사례 연구`, MARGIN + 5, y, CONTENT_W - 5, 7, 11)
    chapterNum++
  }
  y = drawWrappedText(doc, `제${chapterNum}장  참고 자료`, MARGIN + 5, y, CONTENT_W - 5, 7, 11)

  // --- Chapters ---
  chapterNum = 1
  for (const item of capsule.syllabus) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, `제${chapterNum}장: ${item.topic}`, y)

    if (item.description) {
      y = drawWrappedText(doc, item.description, MARGIN, y, CONTENT_W, 6, 11)
      y += 4
    }

    // Match theory points
    const topicLower = item.topic.toLowerCase()
    const matching = capsule.theory_points.filter(
      p => p.toLowerCase().includes(topicLower) || topicLower.includes(p.split(':')[0]?.toLowerCase() || '')
    )
    if (matching.length > 0) {
      y += 4
      doc.setFontSize(13)
      doc.setTextColor(PURPLE)
      y = ensureSpace(doc, 10, y)
      doc.text('핵심 포인트', MARGIN, y)
      y += 7
      for (const point of matching) {
        y = drawWrappedText(doc, `• ${point}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
        y += 1
      }
    }

    // Duration note
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(LIGHT_GRAY)
    y = ensureSpace(doc, 8, y)
    doc.text(`학습 소요시간: ${item.duration_min}분  |  유형: ${TYPE_LABELS[item.type] || item.type}`, MARGIN, y)
    y += 6

    chapterNum++
  }

  // Case Study Chapter
  if (capsule.case_study_refs.length > 0) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, `제${chapterNum}장: 사례 연구`, y)
    y = drawWrappedText(doc, `총 ${capsule.case_study_refs.length}건의 실전 사례를 분석합니다.`, MARGIN, y, CONTENT_W, 6, 11)
    y += 6

    for (let i = 0; i < capsule.case_study_refs.length; i++) {
      const ref = capsule.case_study_refs[i]
      const label = ref.label || ref.type || '사례'
      const number = ref.number || ref.matched || ''
      y = ensureSpace(doc, 20, y)
      doc.setFontSize(12)
      doc.setTextColor('#333333')
      doc.text(`사례 ${i + 1}: [${label}] ${number}`, MARGIN, y)
      y += 7
      if (ref.context) {
        y = drawWrappedText(doc, ref.context, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
        y += 2
      }
      if (ref.court) {
        y = drawWrappedText(doc, `관할: ${ref.court}`, MARGIN + 3, y, CONTENT_W - 3, 6, 9, { color: GRAY })
        y += 2
      }
      y += 4
    }
    chapterNum++
  }

  // References Chapter
  y = addPageBreak(doc)
  y = drawSectionTitle(doc, `제${chapterNum}장: 참고 자료`, y)

  if (capsule.expert_sources.length > 0) {
    doc.setFontSize(13)
    doc.setTextColor(PURPLE)
    doc.text('전문가 출처', MARGIN, y)
    y += 7
    for (const src of capsule.expert_sources) {
      y = drawWrappedText(doc, `• ${src.channel_name} — 관련도 ${Math.round(src.relevance * 100)}%`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 1
    }
    y += 6
  }

  if (capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0) {
    doc.setFontSize(13)
    doc.setTextColor(PURPLE)
    y = ensureSpace(doc, 10, y)
    doc.text('선수 학습 개념', MARGIN, y)
    y += 7
    for (const prereq of capsule.prerequisite_concepts) {
      y = drawWrappedText(doc, `• ${prereq.name}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 1
    }
    y += 6
  }

  // Teaching Guidelines
  doc.setFontSize(13)
  doc.setTextColor(PURPLE)
  y = ensureSpace(doc, 10, y)
  doc.text('교수법 가이드라인', MARGIN, y)
  y += 7
  for (const line of capsule.teaching_guidelines.split('\n')) {
    if (line.trim()) {
      y = drawWrappedText(doc, line.trim().startsWith('-') ? line.trim() : `• ${line.trim()}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 1
    }
  }

  return doc.output('arraybuffer') as unknown as Uint8Array
}

// ============================================================
// 뉴스레터 PDF
// ============================================================

export interface NewsletterPdfData {
  generated_at: string
  period_start: string
  period_end: string
  trending_concepts: Array<{
    concept_name: string; domain_name: string;
    expert_count: number; video_count: number
  }>
  new_analyses: Array<{
    video_title: string; channel_name: string;
    lecture_type: string; concept_count: number
  }>
  coverage_update: {
    overall_rate: number
    domain_rates: Array<{ domain_name: string; rate: number }>
  }
  news_digest: Array<{
    title: string; summary: string; provider: string;
    direction: string; sentiment_score: number; published_at: string
  }>
  featured_capsule?: {
    concept_id: number; capsule_title: string;
    level: string; overview_snippet: string
  }
}

export function generateNewsletterPdf(data: NewsletterPdfData): Uint8Array {
  const doc = createDoc()

  // Header
  let y = MARGIN
  doc.setFillColor(124, 58, 237)
  doc.rect(0, 0, PAGE_W, 40, 'F')
  doc.setFontSize(22)
  doc.setTextColor('#FFFFFF')
  doc.text('부동산 온톨로지 뉴스레터', PAGE_W / 2, 20, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`${data.period_start} ~ ${data.period_end}`, PAGE_W / 2, 30, { align: 'center' })
  y = 50

  // 1. Trending Concepts
  y = drawSectionTitle(doc, '트렌딩 개념 Top 10', y)
  if (data.trending_concepts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['순위', '개념', '도메인', '전문가 수', '영상 수']],
      body: data.trending_concepts.map((c, i) => [
        String(i + 1), c.concept_name, c.domain_name,
        String(c.expert_count), String(c.video_count),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: MARGIN, right: MARGIN },
    })
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 30
  }

  // 2. New Analyses
  if (data.new_analyses.length > 0) {
    y = ensureSpace(doc, 20, y)
    y = drawSectionTitle(doc, '최근 분석 영상', y)
    for (const a of data.new_analyses) {
      y = ensureSpace(doc, 12, y)
      y = drawWrappedText(doc, `• ${a.video_title} — ${a.channel_name}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y = drawWrappedText(doc, `  유형: ${a.lecture_type} | 매핑 개념: ${a.concept_count}개`, MARGIN + 6, y, CONTENT_W - 6, 5, 8, { color: GRAY })
      y += 2
    }
    y += 4
  }

  // 3. Coverage Update
  y = ensureSpace(doc, 30, y)
  y = drawSectionTitle(doc, '커버리지 현황', y)
  doc.setFontSize(12)
  doc.setTextColor('#333333')
  y = ensureSpace(doc, 10, y)
  doc.text(`전체 커버리지: ${data.coverage_update.overall_rate}%`, MARGIN, y)
  y += 8

  for (const dr of data.coverage_update.domain_rates) {
    y = ensureSpace(doc, 10, y)
    doc.setFontSize(9)
    doc.setTextColor('#333333')
    doc.text(`${dr.domain_name}`, MARGIN, y)
    // Progress bar
    const barX = MARGIN + 45
    const barW = 80
    const barH = 4
    doc.setFillColor(230, 230, 230)
    doc.rect(barX, y - 3, barW, barH, 'F')
    doc.setFillColor(124, 58, 237)
    doc.rect(barX, y - 3, barW * (dr.rate / 100), barH, 'F')
    doc.text(`${dr.rate}%`, barX + barW + 3, y)
    y += 7
  }
  y += 4

  // 4. News Digest
  if (data.news_digest.length > 0) {
    y = ensureSpace(doc, 20, y)
    y = drawSectionTitle(doc, '뉴스 다이제스트', y)
    for (const n of data.news_digest.slice(0, 5)) {
      y = ensureSpace(doc, 16, y)
      const dirIcon = n.direction === '상승' ? '▲' : n.direction === '하락' ? '▼' : '•'
      y = drawWrappedText(doc, `${dirIcon} ${n.title}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y = drawWrappedText(doc, `${n.provider} | ${n.published_at}`, MARGIN + 6, y, CONTENT_W - 6, 5, 8, { color: GRAY })
      if (n.summary) {
        y = drawWrappedText(doc, n.summary.slice(0, 100) + (n.summary.length > 100 ? '...' : ''), MARGIN + 6, y, CONTENT_W - 6, 5, 8, { color: GRAY })
      }
      y += 3
    }
  }

  // 5. Featured Capsule
  if (data.featured_capsule) {
    y = ensureSpace(doc, 30, y)
    y = drawSectionTitle(doc, '추천 캡슐', y)
    y = drawWrappedText(doc, data.featured_capsule.capsule_title, MARGIN, y, CONTENT_W, 7, 12)
    y = drawWrappedText(doc, `${data.featured_capsule.level} 레벨`, MARGIN, y, CONTENT_W, 6, 9, { color: PURPLE })
    y += 2
    y = drawWrappedText(doc, data.featured_capsule.overview_snippet, MARGIN, y, CONTENT_W, 5, 9, { color: GRAY })
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(`부동산 온톨로지 뉴스레터 — ${data.generated_at}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' })
    doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' })
  }

  return doc.output('arraybuffer') as unknown as Uint8Array
}

// ============================================================
// AI 강의안 PDF (Phase 5-2)
// ============================================================

export function generateAILecturePlanPdf(
  capsule: LectureCapsuleRecord,
  plan: LecturePlanResult,
  ontologyContext?: ConceptOntologyContext,
): Uint8Array {
  const doc = createDoc()
  const expertCount = ontologyContext?.expert_count || 0

  // Cover
  let y = 70
  doc.setFontSize(28)
  doc.setTextColor(PURPLE)
  const titleLines = doc.splitTextToSize(capsule.capsule_title, CONTENT_W)
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, y, { align: 'center' })
    y += 14
  }
  y += 6
  doc.setFontSize(14)
  doc.text('AI 합성 강의안', PAGE_W / 2, y, { align: 'center' })
  y += 10
  doc.setFontSize(10)
  doc.setTextColor(GRAY)
  doc.text(`NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, PAGE_W / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

  // 온톨로지 개요
  if (ontologyContext) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, '0. 온톨로지 분석 개요', y)
    y = drawWrappedText(doc, `로드맵 위치: ${ontologyContext.roadmap_position.level} 과정 ${ontologyContext.roadmap_position.order_in_level}/${ontologyContext.roadmap_position.total_in_level} (${ontologyContext.roadmap_position.lecture_level})`, MARGIN, y, CONTENT_W, 6, 10)
    y = drawWrappedText(doc, `참여 전문가: ${expertCount}명 | 관련 영상: ${ontologyContext.video_count}개`, MARGIN, y, CONTENT_W, 6, 10)
    y = drawWrappedText(doc, `핵심 키워드: ${ontologyContext.keywords.slice(0, 8).join(', ')}`, MARGIN, y, CONTENT_W, 6, 10)
    y += 4
    if (ontologyContext.prerequisites.length > 0) {
      y = drawWrappedText(doc, `• 선수 개념: ${ontologyContext.prerequisites.map(p => p.name).join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
    }
    if (ontologyContext.successors.length > 0) {
      y = drawWrappedText(doc, `• 후속 개념: ${ontologyContext.successors.map(s => s.name).join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
    }
    y += 6
  }

  // 강의 목표
  y = ensureSpace(doc, 20, y)
  y = drawSectionTitle(doc, '1. 강의 목표', y)
  y = drawWrappedText(doc, plan.lecture_goal, MARGIN, y, CONTENT_W, 6, 11)
  y = drawWrappedText(doc, `대상: ${plan.target_description}`, MARGIN, y, CONTENT_W, 6, 10, { color: GRAY })
  y += 6

  // 커리큘럼 테이블
  y = ensureSpace(doc, 20, y)
  y = drawSectionTitle(doc, '2. 강의 커리큘럼', y)

  autoTable(doc, {
    startY: y,
    head: [['시간', '내용', '방식']],
    body: plan.curriculum.map(item => [
      item.time_range || '',
      item.title,
      TYPE_LABELS[item.content_type] || item.content_type,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: MARGIN, right: MARGIN },
  })
  y = (doc as any).lastAutoTable?.finalY + 8 || y + 50

  // 섹션별 상세
  y = ensureSpace(doc, 20, y)
  y = drawSectionTitle(doc, '3. 섹션별 강의 노트', y)
  for (const item of plan.curriculum) {
    y = ensureSpace(doc, 25, y)
    doc.setFontSize(12)
    doc.setTextColor('#333333')
    doc.text(`■ ${item.title} (${item.time_range})`, MARGIN, y)
    y += 7

    if (item.teaching_notes) {
      y = drawWrappedText(doc, item.teaching_notes, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 2
    }

    if (item.key_points && item.key_points.length > 0) {
      for (const kp of item.key_points) {
        y = drawWrappedText(doc, `• ${kp}`, MARGIN + 5, y, CONTENT_W - 5, 5, 9)
      }
      y += 2
    }

    if (item.case_reference) {
      y = drawWrappedText(doc, `사례: ${item.case_reference}`, MARGIN + 3, y, CONTENT_W - 3, 5, 9, { color: GRAY })
      y += 2
    }
    y += 3
  }

  // 참고 자료
  if (plan.supplementary_notes) {
    y = ensureSpace(doc, 20, y)
    y = drawSectionTitle(doc, '4. 참고 자료', y)
    y = drawWrappedText(doc, plan.supplementary_notes, MARGIN, y, CONTENT_W, 6, 10)
  }

  // Footer
  y = ensureSpace(doc, 15, y)
  y += 10
  doc.setFontSize(8)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(`출처: NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, MARGIN, y)

  return doc.output('arraybuffer') as unknown as Uint8Array
}

// ============================================================
// AI 전자책 PDF (Phase 5-3)
// ============================================================

export function generateAIEbookPdf(capsule: EnrichedCapsule): Uint8Array {
  const doc = createDoc()
  const ai = capsule.ai
  const ctx = capsule.ontologyContext
  const expertCount = ai?.ontology_summary?.expert_count || 0

  // Cover
  let y = 60
  doc.setFontSize(32)
  doc.setTextColor(PURPLE)
  const coverLines = doc.splitTextToSize(capsule.capsule_title, CONTENT_W)
  for (const line of coverLines) {
    doc.text(line, PAGE_W / 2, y, { align: 'center' })
    y += 16
  }
  y += 6
  doc.setFontSize(16)
  doc.text('체계적 전문 실용서', PAGE_W / 2, y, { align: 'center' })
  y += 12
  doc.setFontSize(10)
  doc.setTextColor(GRAY)
  doc.text(`NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, PAGE_W / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

  // 온톨로지 개요
  if (ctx) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, '온톨로지 분석 개요', y)
    y = drawWrappedText(doc, `로드맵 위치: ${ctx.roadmap_position.level} 과정 ${ctx.roadmap_position.order_in_level}/${ctx.roadmap_position.total_in_level}`, MARGIN, y, CONTENT_W, 6, 10)
    y = drawWrappedText(doc, `분석 참여 전문가: ${ctx.expert_count}명 | 관련 영상: ${ctx.video_count}개`, MARGIN, y, CONTENT_W, 6, 10)
    y = drawWrappedText(doc, `핵심 키워드: ${ctx.keywords.slice(0, 10).join(', ')}`, MARGIN, y, CONTENT_W, 6, 10)
    if (ai?.ontology_summary?.prerequisites && ai.ontology_summary.prerequisites.length > 0) {
      y += 2
      y = drawWrappedText(doc, `선수 개념: ${ai.ontology_summary.prerequisites.join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 9)
    }
    if (ai?.ontology_summary?.successors && ai.ontology_summary.successors.length > 0) {
      y = drawWrappedText(doc, `후속 개념: ${ai.ontology_summary.successors.join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 9)
    }
  }

  // 종합 요약
  if (ai?.executive_summary) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, '종합 요약', y)
    y = drawWrappedText(doc, ai.executive_summary, MARGIN, y, CONTENT_W, 6, 10)
  }

  // 목차
  y = addPageBreak(doc)
  y = drawSectionTitle(doc, '목차', y)
  let chNum = 1
  for (const item of capsule.syllabus) {
    y = drawWrappedText(doc, `제${chNum}장  ${item.topic}`, MARGIN + 5, y, CONTENT_W - 5, 7, 11)
    chNum++
  }

  // 챕터
  chNum = 1
  for (const item of capsule.syllabus) {
    const chContent = ai?.chapter_contents?.[item.topic]
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, `제${chNum}장: ${item.topic}`, y)

    if (chContent) {
      const sections = [
        { title: '도입', content: chContent.introduction },
        { title: '핵심 개념 상세 설명', content: chContent.core_explanation },
        { title: '전문가 관점 비교', content: chContent.expert_comparison },
        { title: '실전 사례와 적용', content: chContent.practical_cases },
        { title: '실전 적용 가이드', content: chContent.application_guide },
      ]

      for (const section of sections) {
        if (section.content) {
          y = ensureSpace(doc, 15, y)
          doc.setFontSize(12)
          doc.setTextColor(PURPLE)
          doc.text(`■ ${section.title}`, MARGIN, y)
          y += 7
          y = drawWrappedText(doc, section.content, MARGIN, y, CONTENT_W, 5.5, 10)
          y += 4
        }
      }

      if (chContent.key_takeaways && chContent.key_takeaways.length > 0) {
        y = ensureSpace(doc, 15, y)
        doc.setFontSize(12)
        doc.setTextColor(PURPLE)
        doc.text('■ 챕터 핵심 정리', MARGIN, y)
        y += 7
        for (const kt of chContent.key_takeaways) {
          y = drawWrappedText(doc, `• ${kt}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
          y += 1
        }
      }
    } else {
      if (item.description) {
        y = drawWrappedText(doc, item.description, MARGIN, y, CONTENT_W, 6, 11)
      }
    }
    chNum++
  }

  // 종합 사례 / 비교 분석 / 체크리스트
  if (ai?.comprehensive_case_study) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, `제${chNum}장: 종합 사례 연구`, y)
    y = drawWrappedText(doc, ai.comprehensive_case_study, MARGIN, y, CONTENT_W, 5.5, 10)
    chNum++
  }

  if (ai?.comparative_analysis) {
    y = addPageBreak(doc)
    y = drawSectionTitle(doc, `제${chNum}장: 전문가 비교 종합 분석`, y)
    y = drawWrappedText(doc, ai.comparative_analysis, MARGIN, y, CONTENT_W, 5.5, 10)
    chNum++
  }

  y = addPageBreak(doc)
  y = drawSectionTitle(doc, `제${chNum}장: 학습 체크리스트 & 자기 진단`, y)
  if (ai?.learning_checklist && ai.learning_checklist.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(PURPLE)
    doc.text('학습 체크리스트', MARGIN, y)
    y += 7
    for (const lc of ai.learning_checklist) {
      y = drawWrappedText(doc, `☐ ${lc}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
      y += 1
    }
    y += 4
  }
  if (ai?.self_assessment && ai.self_assessment.length > 0) {
    y = ensureSpace(doc, 15, y)
    doc.setFontSize(12)
    doc.setTextColor(PURPLE)
    doc.text('자기 진단 질문', MARGIN, y)
    y += 7
    ai.self_assessment.forEach((q, i) => {
      y = drawWrappedText(doc, `${i + 1}. ${q}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      y += 2
    })
  }
  if (ai?.next_steps) {
    y = ensureSpace(doc, 15, y)
    doc.setFontSize(12)
    doc.setTextColor(PURPLE)
    doc.text('다음 학습 추천', MARGIN, y)
    y += 7
    y = drawWrappedText(doc, ai.next_steps, MARGIN, y, CONTENT_W, 6, 10)
  }

  // Page footers
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(`${capsule.capsule_title} — 체계적 전문 실용서`, PAGE_W / 2, PAGE_H - 10, { align: 'center' })
    doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' })
  }

  return doc.output('arraybuffer') as unknown as Uint8Array
}

// ============================================================
// AI 뉴스레터 PDF (Phase 5-4) — A4 5페이지 이내
// ============================================================

export interface AINewsletterPdfData {
  newsletter_type: string
  title: string
  generated_at: string
  ai_content: {
    headline: string
    body: string
    key_takeaways: string[]
    call_to_action: string
  }
  ontology_context?: {
    keywords?: string[]
    prerequisites?: string[]
    successors?: string[]
    roadmap_position?: {
      level: string
      lecture_level: string
      order_in_level: number
      total_in_level: number
    }
  }
  target_capsule?: {
    capsule_title: string
    level: string
    overview: string
    expert_count: number
  }
  related_concepts?: Array<{ concept_name: string; domain_name: string }>
  learning_path_position?: {
    level: string
    lecture_level: string
    progress_hint: string
  }
}

const NEWSLETTER_TYPE_LABELS: Record<string, string> = {
  daily_lesson: '오늘의 학습',
  case_study: '사례 분석',
  expert_compare: '전문가 비교',
  learning_tip: '학습 팁',
  weekly_summary: '주간 요약',
}

export function generateAINewsletterPdf(data: AINewsletterPdfData): Uint8Array {
  const doc = createDoc()
  const typeLabel = NEWSLETTER_TYPE_LABELS[data.newsletter_type] || data.newsletter_type

  // 공통 섹션 헤더 그리기
  function drawSectionHeader(title: string, yPos: number): number {
    ensureKoreanFont(doc)
    doc.setFontSize(12)
    doc.setTextColor(PURPLE)
    doc.text(title, MARGIN, yPos)
    yPos += 2
    doc.setDrawColor(PURPLE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, yPos, MARGIN + CONTENT_W, yPos)
    return yPos + 7
  }

  // 공통 페이지 헤더 (작은 배너)
  function drawPageHeader(pageTitle: string): void {
    ensureKoreanFont(doc)
    doc.setFillColor(124, 58, 237)
    doc.rect(0, 0, PAGE_W, 12, 'F')
    doc.setFontSize(7)
    doc.setTextColor('#FFFFFF')
    doc.text(`NPLatform AI 교육 뉴스레터  |  ${typeLabel}  |  ${data.title}`, MARGIN, 8)
    doc.text(pageTitle, PAGE_W - MARGIN, 8, { align: 'right' })
  }

  // ──────────────────────────────────────────────────────────
  // Page 1: 표지 + 헤드라인
  // ──────────────────────────────────────────────────────────
  doc.setFillColor(124, 58, 237)
  doc.rect(0, 0, PAGE_W, 65, 'F')

  // 배너 상단 메타
  doc.setFontSize(8)
  doc.setTextColor('#D4BFFF')
  doc.text('NPLatform AI 교육 뉴스레터', MARGIN, 14)
  doc.text(data.generated_at, PAGE_W - MARGIN, 14, { align: 'right' })

  // 유형 뱃지
  doc.setFillColor(255, 255, 255, 0.2)
  doc.setFontSize(9)
  doc.setTextColor('#FFFFFF')
  doc.text(`[ ${typeLabel} ]`, PAGE_W / 2, 24, { align: 'center' })

  // 헤드라인 (대형)
  doc.setFontSize(20)
  const headlineLines = doc.splitTextToSize(data.ai_content.headline || data.title, CONTENT_W)
  let hY = 34
  for (const hl of headlineLines.slice(0, 2)) {
    ensureKoreanFont(doc)
    doc.text(hl, PAGE_W / 2, hY, { align: 'center' })
    hY += 10
  }

  // 캡슐 정보 (배너 하단)
  if (data.target_capsule) {
    doc.setFontSize(8)
    doc.setTextColor('#E9D5FF')
    doc.text(
      `${data.target_capsule.capsule_title}  |  ${data.target_capsule.level} 레벨  |  전문가 ${data.target_capsule.expert_count}명`,
      PAGE_W / 2, 58, { align: 'center' }
    )
  }

  let y = 74

  // ── 제목 ──
  doc.setFontSize(14)
  doc.setTextColor(PURPLE)
  ensureKoreanFont(doc)
  y = drawWrappedText(doc, data.title, MARGIN, y, CONTENT_W, 8, 14, { color: PURPLE })
  y += 6

  doc.setDrawColor('#E9D5FF')
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 8

  // ── 본문 ──
  y = drawSectionHeader('오늘의 핵심 학습 내용', y)
  y = drawWrappedText(doc, data.ai_content.body, MARGIN, y, CONTENT_W, 6, 10)
  y += 10

  // ── 핵심 포인트 박스 ──
  if (data.ai_content.key_takeaways?.length > 0) {
    const boxLines = data.ai_content.key_takeaways.length
    const boxH = 14 + boxLines * 9
    y = ensureSpace(doc, boxH + 10, y)
    doc.setFillColor(245, 240, 255)
    doc.roundedRect(MARGIN - 3, y - 5, CONTENT_W + 6, boxH, 3, 3, 'F')
    doc.setDrawColor(PURPLE)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN - 3, y - 5, CONTENT_W + 6, boxH, 3, 3, 'S')
    doc.setFontSize(11)
    doc.setTextColor(PURPLE)
    ensureKoreanFont(doc)
    doc.text('✦  핵심 포인트', MARGIN + 2, y + 1)
    y += 9
    doc.setFontSize(9.5)
    doc.setTextColor('#374151')
    for (const kt of data.ai_content.key_takeaways) {
      y = ensureSpace(doc, 8, y)
      ensureKoreanFont(doc)
      y = drawWrappedText(doc, `  ▶  ${kt}`, MARGIN + 4, y, CONTENT_W - 8, 7, 9.5)
    }
    y += 10
  }

  // ──────────────────────────────────────────────────────────
  // Page 2: 온톨로지 학습 위치 + 키워드 맵
  // ──────────────────────────────────────────────────────────
  doc.addPage()
  drawPageHeader('온톨로지 학습 위치')
  ensureKoreanFont(doc)
  y = 22

  if (data.ontology_context) {
    y = drawSectionHeader('학습 로드맵 위치', y)

    // 로드맵 레벨 바
    if (data.ontology_context.roadmap_position) {
      const rp = data.ontology_context.roadmap_position
      const levels = ['왕초보', '초보', '중급', '고급', '전문가']
      const barW = (CONTENT_W - 8) / levels.length
      for (let li = 0; li < levels.length; li++) {
        const isActive = levels[li] === rp.level
        if (isActive) {
          doc.setFillColor(124, 58, 237)
        } else {
          doc.setFillColor(230, 220, 248)
        }
        doc.roundedRect(MARGIN + li * (barW + 2), y, barW, 10, 2, 2, 'F')
        doc.setFontSize(7.5)
        doc.setTextColor(isActive ? '#FFFFFF' : '#9873D4')
        ensureKoreanFont(doc)
        doc.text(levels[li], MARGIN + li * (barW + 2) + barW / 2, y + 6.5, { align: 'center' })
      }
      y += 14
      doc.setFontSize(9)
      doc.setTextColor(GRAY)
      ensureKoreanFont(doc)
      doc.text(
        `현재 위치: ${rp.level} 과정  ${rp.order_in_level} / ${rp.total_in_level}번째 강의  |  수준: ${rp.lecture_level}`,
        MARGIN, y
      )
      y += 10
    }

    // 학습 경로 시각화 (선수 → 현재 → 후속)
    y = drawSectionHeader('개념 학습 경로', y)
    const preItems = (data.ontology_context.prerequisites || []).slice(0, 4)
    const sucItems = (data.ontology_context.successors || []).slice(0, 4)

    // 선수 개념
    if (preItems.length > 0) {
      doc.setFontSize(8)
      doc.setTextColor(PURPLE)
      ensureKoreanFont(doc)
      doc.text('선수 개념 (먼저 학습)', MARGIN, y)
      y += 5
      for (const pre of preItems) {
        doc.setFillColor(239, 246, 255)
        doc.roundedRect(MARGIN + 5, y - 3, CONTENT_W - 10, 9, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setTextColor('#1D4ED8')
        ensureKoreanFont(doc)
        doc.text(`← ${pre}`, MARGIN + 10, y + 3)
        y += 12
      }
      y += 2
    }

    // 현재 개념
    if (data.target_capsule) {
      doc.setFillColor(124, 58, 237)
      doc.roundedRect(MARGIN, y - 3, CONTENT_W, 13, 3, 3, 'F')
      doc.setFontSize(10)
      doc.setTextColor('#FFFFFF')
      ensureKoreanFont(doc)
      doc.text(`★  ${data.target_capsule.capsule_title}  (현재 학습)`, PAGE_W / 2, y + 5, { align: 'center' })
      y += 18
    }

    // 후속 개념
    if (sucItems.length > 0) {
      doc.setFontSize(8)
      doc.setTextColor(PURPLE)
      ensureKoreanFont(doc)
      doc.text('후속 개념 (다음 학습)', MARGIN, y)
      y += 5
      for (const suc of sucItems) {
        doc.setFillColor(240, 253, 244)
        doc.roundedRect(MARGIN + 5, y - 3, CONTENT_W - 10, 9, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setTextColor('#166534')
        ensureKoreanFont(doc)
        doc.text(`→ ${suc}`, MARGIN + 10, y + 3)
        y += 12
      }
      y += 4
    }

    // 키워드 태그 클라우드
    y = ensureSpace(doc, 30, y)
    y = drawSectionHeader('핵심 키워드', y)
    const kws = (data.ontology_context.keywords || []).slice(0, 15)
    let kwX = MARGIN
    let kwY = y
    for (const kw of kws) {
      const kwW = kw.length * 5 + 10
      if (kwX + kwW > PAGE_W - MARGIN) {
        kwX = MARGIN
        kwY += 10
      }
      doc.setFillColor(237, 233, 254)
      doc.roundedRect(kwX, kwY - 3, kwW, 8, 2, 2, 'F')
      doc.setFontSize(7.5)
      doc.setTextColor(PURPLE)
      ensureKoreanFont(doc)
      doc.text(kw, kwX + 5, kwY + 2)
      kwX += kwW + 4
    }
    y = kwY + 14
  }

  // ──────────────────────────────────────────────────────────
  // Page 3: 관련 개념 + 캡슐 개요 + 학습 가이드
  // ──────────────────────────────────────────────────────────
  doc.addPage()
  drawPageHeader('관련 개념 & 학습 가이드')
  ensureKoreanFont(doc)
  y = 22

  // 관련 개념 그리드
  if (data.related_concepts?.length) {
    y = drawSectionHeader('관련 학습 개념', y)
    const cols = 2
    const colW = (CONTENT_W - 4) / cols
    for (let ri = 0; ri < Math.min(8, data.related_concepts.length); ri++) {
      const r = data.related_concepts[ri]
      const col = ri % cols
      const row = Math.floor(ri / cols)
      const cx = MARGIN + col * (colW + 4)
      const cy = y + row * 14
      doc.setFillColor(248, 245, 255)
      doc.roundedRect(cx, cy, colW, 11, 2, 2, 'F')
      doc.setFontSize(8.5)
      doc.setTextColor('#374151')
      ensureKoreanFont(doc)
      doc.text(r.concept_name, cx + 4, cy + 5)
      doc.setFontSize(7)
      doc.setTextColor(PURPLE)
      doc.text(r.domain_name, cx + 4, cy + 9)
    }
    y += Math.ceil(Math.min(8, data.related_concepts.length) / cols) * 14 + 10
  }

  // 캡슐 개요
  if (data.target_capsule?.overview) {
    y = ensureSpace(doc, 40, y)
    y = drawSectionHeader('강의 캡슐 상세 개요', y)
    doc.setFillColor(250, 247, 255)
    const overviewText = data.target_capsule.overview.slice(0, 400)
    const overviewLines = doc.splitTextToSize(overviewText, CONTENT_W - 10)
    const overviewH = overviewLines.length * 6 + 10
    doc.roundedRect(MARGIN - 2, y - 3, CONTENT_W + 4, overviewH, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setTextColor('#374151')
    ensureKoreanFont(doc)
    for (const oline of overviewLines) {
      y = ensureSpace(doc, 7, y)
      doc.text(oline, MARGIN + 3, y)
      y += 6
    }
    y += 10
  }

  // 학습 진행도 + CTA
  if (data.learning_path_position?.progress_hint) {
    y = ensureSpace(doc, 24, y)
    doc.setFillColor(240, 235, 255)
    doc.roundedRect(MARGIN - 2, y - 4, CONTENT_W + 4, 18, 3, 3, 'F')
    doc.setFontSize(9)
    doc.setTextColor(PURPLE)
    ensureKoreanFont(doc)
    doc.text('학습 진행도:', MARGIN + 3, y + 3)
    doc.setTextColor('#374151')
    const progText = data.learning_path_position.progress_hint
    doc.text(progText, MARGIN + 26, y + 3)
    doc.setFontSize(8)
    doc.setTextColor(GRAY)
    doc.text(`레벨: ${data.learning_path_position.level}  |  ${data.learning_path_position.lecture_level}`, MARGIN + 3, y + 10)
    y += 24
  }

  // CTA 버튼
  y = ensureSpace(doc, 20, y)
  doc.setFillColor(124, 58, 237)
  doc.roundedRect(MARGIN, y, CONTENT_W, 15, 4, 4, 'F')
  doc.setFontSize(11)
  doc.setTextColor('#FFFFFF')
  ensureKoreanFont(doc)
  const ctaText = data.ai_content.call_to_action || '지금 바로 학습 시작하기'
  const ctaLines = doc.splitTextToSize(ctaText, CONTENT_W - 8)
  doc.text(ctaLines[0] || '', PAGE_W / 2, y + 9.5, { align: 'center' })
  y += 22

  // ──────────────────────────────────────────────────────────
  // Page 4: 이 뉴스레터에 대하여 + 출처
  // ──────────────────────────────────────────────────────────
  doc.addPage()
  drawPageHeader('발행 정보')
  ensureKoreanFont(doc)
  y = 22

  y = drawSectionHeader('이 뉴스레터에 대하여', y)
  doc.setFontSize(9.5)
  doc.setTextColor('#374151')
  ensureKoreanFont(doc)
  y = drawWrappedText(doc, '이 뉴스레터는 NPLatform 부동산 전문가들의 강의 데이터를 AI가 분석하여 자동 생성한 교육 콘텐츠입니다.', MARGIN, y, CONTENT_W, 6, 9.5)
  y += 4
  y = drawWrappedText(doc, '개별 전문가의 채널명 및 개인정보는 출처 정책에 따라 공개하지 않습니다.', MARGIN, y, CONTENT_W, 6, 9.5)
  y += 10

  y = drawSectionHeader('발행 정보', y)
  const infoRows = [
    ['발행일', data.generated_at],
    ['콘텐츠 유형', typeLabel],
    ['분석 모델', 'Claude Sonnet (Anthropic)'],
    ['데이터 출처', 'NPLatform 부동산 전문가 강의'],
  ]
  if (data.target_capsule) {
    infoRows.push(['강의 캡슐', `${data.target_capsule.capsule_title} (${data.target_capsule.level})`])
    infoRows.push(['분석 전문가', `${data.target_capsule.expert_count}명`])
  }

  for (const [label, value] of infoRows) {
    y = ensureSpace(doc, 8, y)
    doc.setFontSize(9)
    doc.setTextColor(PURPLE)
    ensureKoreanFont(doc)
    doc.text(`${label}:`, MARGIN, y)
    doc.setTextColor('#374151')
    doc.text(value, MARGIN + 35, y)
    y += 7
  }
  y += 6

  // 학습 다음 단계 안내
  y = ensureSpace(doc, 40, y)
  y = drawSectionHeader('다음 학습 단계', y)
  doc.setFontSize(9)
  doc.setTextColor('#374151')
  ensureKoreanFont(doc)
  if (data.ontology_context?.successors?.length) {
    y = drawWrappedText(doc, `이 주제를 완료한 후에는 다음 개념으로 이동하세요:`, MARGIN, y, CONTENT_W, 6, 9)
    y += 4
    for (const suc of (data.ontology_context.successors || []).slice(0, 5)) {
      y = ensureSpace(doc, 7, y)
      ensureKoreanFont(doc)
      y = drawWrappedText(doc, `  →  ${suc}`, MARGIN + 5, y, CONTENT_W - 5, 6, 9)
    }
  } else {
    y = drawWrappedText(doc, '계속해서 부동산 투자 교육 커리큘럼을 따라 학습하세요. 온톨로지 기반 로드맵이 최적의 학습 경로를 안내합니다.', MARGIN, y, CONTENT_W, 6, 9)
  }

  // ──────────────────────────────────────────────────────────
  // Page 5: 학습 실천 가이드 + 자기 점검표
  // ──────────────────────────────────────────────────────────
  doc.addPage()
  drawPageHeader('학습 실천 가이드')
  ensureKoreanFont(doc)
  y = 22

  y = drawSectionHeader('오늘의 학습 실천 체크리스트', y)
  const checkItems = [
    '오늘 배운 핵심 개념을 한 문장으로 요약할 수 있는가?',
    '핵심 키워드의 정의를 내 말로 설명할 수 있는가?',
    '실전 사례를 최소 하나 이상 떠올릴 수 있는가?',
    '이 개념이 실제 투자에서 어떻게 활용되는지 이해했는가?',
    '관련 개념(선수/후속)과의 연결고리를 파악했는가?',
    '오늘 배운 내용을 내일 실생활에 적용할 기회가 있는가?',
  ]
  for (const item of checkItems) {
    y = ensureSpace(doc, 10, y)
    doc.setFillColor(252, 250, 255)
    doc.roundedRect(MARGIN - 2, y - 3, CONTENT_W + 4, 9, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setTextColor('#374151')
    ensureKoreanFont(doc)
    doc.text('□', MARGIN + 2, y + 3)
    y = drawWrappedText(doc, item, MARGIN + 9, y, CONTENT_W - 9, 6, 9)
    y += 2
  }
  y += 6

  y = drawSectionHeader('오늘의 복습 메모', y)
  doc.setFontSize(9)
  doc.setTextColor(GRAY)
  ensureKoreanFont(doc)
  doc.text('이 칸에 오늘 배운 내용을 직접 정리해 보세요:', MARGIN, y)
  y += 6
  // 노트 줄
  for (let li = 0; li < 6; li++) {
    y = ensureSpace(doc, 10, y)
    doc.setDrawColor('#E5E7EB')
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y + 5, MARGIN + CONTENT_W, y + 5)
    y += 10
  }
  y += 6

  y = drawSectionHeader('이 뉴스레터 활용 팁', y)
  const tips = [
    '매일 5분! 뉴스레터를 읽으며 하루 학습 습관을 만들어 보세요.',
    '핵심 포인트를 소리 내어 읽으면 기억 효과가 2배 높아집니다.',
    '관련 개념을 클릭하여 연결된 개념도 함께 학습해 보세요.',
    '학습 로드맵을 따라가면 왕초보에서 전문가까지 체계적 성장 가능!',
    '궁금한 점은 NPLatform 커뮤니티에 질문해 보세요.',
  ]
  for (const tip of tips) {
    y = ensureSpace(doc, 8, y)
    doc.setFontSize(8.5)
    doc.setTextColor('#4B5563')
    ensureKoreanFont(doc)
    y = drawWrappedText(doc, `✦  ${tip}`, MARGIN, y, CONTENT_W, 6, 8.5)
    y += 2
  }

  // 하단 브랜드 박스
  y = ensureSpace(doc, 30, y)
  y += 4
  doc.setFillColor(124, 58, 237)
  doc.roundedRect(MARGIN - 2, y, CONTENT_W + 4, 22, 4, 4, 'F')
  doc.setFontSize(13)
  doc.setTextColor('#FFFFFF')
  ensureKoreanFont(doc)
  doc.text('NPLatform AI 교육 뉴스레터', PAGE_W / 2, y + 9, { align: 'center' })
  doc.setFontSize(8)
  doc.setTextColor('#E9D5FF')
  doc.text('부동산 투자 전문 지식을 AI가 매일 정리해 드립니다', PAGE_W / 2, y + 16, { align: 'center' })

  // 푸터 (전체 페이지)
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    ensureKoreanFont(doc)
    doc.setFillColor(245, 240, 255)
    doc.rect(0, PAGE_H - 14, PAGE_W, 14, 'F')
    doc.setFontSize(7)
    doc.setTextColor('#7C3AED')
    doc.text('출처: NPLatform 부동산 전문가들의 강의를 AI가 종합 분석하여 생성', PAGE_W / 2, PAGE_H - 7, { align: 'center' })
    doc.setTextColor(GRAY)
    doc.text(`${data.generated_at}  |  ${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' })
    doc.text('무단 복제 금지', MARGIN, PAGE_H - 7)
  }

  return doc.output('arraybuffer') as unknown as Uint8Array
}

// ============================================================
// Atomic 캡슐 학습자료 PDF (Phase 6)
// 완전 자기완결형 학습 캡슐 PDF — 법령/연습문제/마스터확인 포함
// ============================================================

const ATOMIC_DIFF_LABELS: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function drawCapsuleSectionTitle(doc: jsPDF, title: string, y: number, color?: string): number {
  y = ensureSpace(doc, 14, y)
  ensureKoreanFont(doc)
  doc.setFontSize(14)
  doc.setTextColor(color || PURPLE)
  doc.text(title, MARGIN, y)
  y += 2.5
  doc.setDrawColor(color || PURPLE)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 7
  doc.setTextColor('#333333')
  return y
}

export function generateAtomicCapsulePdf(input: AtomicCapsuleDocxInput): Uint8Array {
  const doc = createDoc()
  const { conceptName, conceptLevel, domainName, capsules } = input
  const totalMin = capsules.reduce((s, c) => s + (c.estimated_min || 10), 0)
  const totalTimeLabel = totalMin >= 60 ? `${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분` : `${totalMin}분`

  // ── 표지 ──
  let y = 70
  doc.setFontSize(30)
  doc.setTextColor(PURPLE)
  const titleLines = doc.splitTextToSize(conceptName, CONTENT_W)
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, y, { align: 'center' })
    y += 14
  }
  y += 8
  doc.setFontSize(16)
  doc.text('Atomic 캡슐 완전 학습 교재', PAGE_W / 2, y, { align: 'center' })
  y += 12
  doc.setFontSize(11)
  doc.setTextColor(GRAY)
  doc.text(`${domainName} > ${conceptLevel} 과정`, PAGE_W / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(10)
  doc.text(`총 ${capsules.length}개 캡슐 · 예상 학습시간 ${totalTimeLabel}`, PAGE_W / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

  // ── 목차 ──
  y = addPageBreak(doc)
  y = drawSectionTitle(doc, '목차', y)
  for (const cap of capsules) {
    const diff = ATOMIC_DIFF_LABELS[cap.difficulty] || cap.difficulty
    y = drawWrappedText(doc, `${cap.order_in_concept}. ${cap.topic} [${diff}] (${cap.estimated_min}분)`, MARGIN + 5, y, CONTENT_W - 5, 6.5, 10)
    y += 1
  }

  // ── 캡슐별 상세 ──
  for (const cap of capsules) {
    const c = cap.content_json
    const diff = ATOMIC_DIFF_LABELS[cap.difficulty] || cap.difficulty

    y = addPageBreak(doc)

    // 캡슐 헤더 배너
    doc.setFillColor(237, 233, 254)
    doc.rect(MARGIN, y - 5, CONTENT_W, 18, 'F')
    doc.setFontSize(9)
    doc.setTextColor(PURPLE)
    doc.text(`캡슐 ${cap.order_in_concept} / ${capsules.length}`, MARGIN + 3, y + 2)
    doc.text(`${diff} · ${cap.estimated_min}분`, PAGE_W - MARGIN - 3, y + 2, { align: 'right' })
    y += 8
    doc.setFontSize(18)
    doc.setTextColor('#1F2937')
    const capTitleLines = doc.splitTextToSize(cap.topic, CONTENT_W - 10)
    for (const line of capTitleLines) {
      doc.text(line, MARGIN + 5, y)
      y += 9
    }
    y += 8

    if (!c) {
      y = drawWrappedText(doc, cap.description || '콘텐츠가 아직 생성되지 않았습니다.', MARGIN, y, CONTENT_W, 6, 10)
      continue
    }

    // 1. 개념 정의
    y = drawCapsuleSectionTitle(doc, '1. 개념 정의', y)
    doc.setFillColor(245, 243, 255)
    const defLines = doc.splitTextToSize(`[공식 정의] ${c.definition.formal}`, CONTENT_W - 10)
    const defH = defLines.length * 5.5 + 6
    doc.rect(MARGIN, y - 3, CONTENT_W, defH, 'F')
    doc.setDrawColor(PURPLE)
    doc.setLineWidth(0.8)
    doc.line(MARGIN, y - 3, MARGIN, y - 3 + defH)
    doc.setFontSize(9)
    doc.setTextColor('#374151')
    for (const line of defLines) {
      doc.text(line, MARGIN + 5, y + 1)
      y += 5.5
    }
    y += 5
    y = drawWrappedText(doc, c.definition.plain, MARGIN, y, CONTENT_W, 5.5, 10)
    y += 3
    for (const kc of c.definition.key_characteristics) {
      y = drawWrappedText(doc, `• ${kc}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 9)
      y += 1
    }
    y += 4

    // 2. 왜 중요한가
    y = drawCapsuleSectionTitle(doc, '2. 왜 중요한가', y, '#D97706')
    y = drawWrappedText(doc, c.importance.why_essential, MARGIN, y, CONTENT_W, 5.5, 10)
    y += 3
    y = drawWrappedText(doc, `[투자 영향] ${c.importance.investment_impact}`, MARGIN + 3, y, CONTENT_W - 6, 5.5, 9)
    y += 5

    // 3. 핵심 원리
    y = drawCapsuleSectionTitle(doc, '3. 핵심 원리', y)
    for (const p of c.principles) {
      y = ensureSpace(doc, 20, y)
      doc.setFontSize(11)
      doc.setTextColor(PURPLE)
      doc.text(`Step ${p.step}: ${p.title}`, MARGIN, y)
      y += 6
      y = drawWrappedText(doc, p.explanation, MARGIN + 3, y, CONTENT_W - 3, 5.5, 9.5)
      if (p.example) {
        y += 1
        y = drawWrappedText(doc, `[예시] ${p.example}`, MARGIN + 6, y, CONTENT_W - 9, 5, 9, { color: '#6B7280' })
      }
      y += 4
    }

    // 4. 법령 근거
    y = drawCapsuleSectionTitle(doc, '4. 법령 근거', y, '#2563EB')
    if (c.legal_foundation.laws.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['법령명', '조항', '요약']],
        body: c.legal_foundation.laws.map(law => [law.law_name, law.article, law.summary]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 30 } },
        margin: { left: MARGIN, right: MARGIN },
      })
      y = (doc as any).lastAutoTable?.finalY + 5 || y + 30
    }
    if (c.legal_foundation.latest_changes) {
      y = drawWrappedText(doc, `[최신 변경] ${c.legal_foundation.latest_changes}`, MARGIN + 3, y, CONTENT_W - 6, 5.5, 9, { color: '#2563EB' })
      y += 4
    }

    // 5. 실전 사례
    y = drawCapsuleSectionTitle(doc, '5. 실전 사례', y, '#059669')
    doc.setFontSize(10)
    doc.setTextColor('#059669')
    doc.text('성공 사례', MARGIN, y)
    y += 5
    y = drawWrappedText(doc, c.cases.success_case, MARGIN + 3, y, CONTENT_W - 3, 5.5, 9.5)
    y += 4
    doc.setFontSize(10)
    doc.setTextColor('#DC2626')
    y = ensureSpace(doc, 12, y)
    doc.text('실패 사례', MARGIN, y)
    y += 5
    y = drawWrappedText(doc, c.cases.failure_case, MARGIN + 3, y, CONTENT_W - 3, 5.5, 9.5)
    if (c.cases.scenario) {
      y += 4
      doc.setFontSize(10)
      doc.setTextColor(PURPLE)
      y = ensureSpace(doc, 12, y)
      doc.text('시뮬레이션 시나리오', MARGIN, y)
      y += 5
      y = drawWrappedText(doc, c.cases.scenario, MARGIN + 3, y, CONTENT_W - 3, 5.5, 9.5)
    }
    y += 5

    // 6. 흔한 실수 TOP 3
    y = drawCapsuleSectionTitle(doc, '6. 흔한 실수 TOP 3', y, '#DC2626')
    for (let i = 0; i < c.common_mistakes.length; i++) {
      const m = c.common_mistakes[i]
      y = ensureSpace(doc, 25, y)
      doc.setFontSize(10)
      doc.setTextColor('#DC2626')
      doc.text(`실수 ${i + 1}: ${m.mistake}`, MARGIN, y)
      y += 5
      y = drawWrappedText(doc, `실제: ${m.reality}`, MARGIN + 5, y, CONTENT_W - 8, 5, 9)
      y = drawWrappedText(doc, `바른 접근: ${m.correct_approach}`, MARGIN + 5, y, CONTENT_W - 8, 5, 9, { color: '#059669' })
      y += 3
    }

    // 7. 실전 체크리스트
    y = drawCapsuleSectionTitle(doc, '7. 실전 체크리스트', y, '#D97706')
    for (const item of c.checklist) {
      y = ensureSpace(doc, 8, y)
      y = drawWrappedText(doc, `[ ] ${item}`, MARGIN + 3, y, CONTENT_W - 6, 5.5, 9.5)
      y += 1
    }
    y += 4

    // 8. 연습문제
    const quizItems = c.quiz || []
    if (quizItems.length > 0) {
      y = drawCapsuleSectionTitle(doc, '8. 연습문제', y)
      for (let i = 0; i < quizItems.length; i++) {
        const q = quizItems[i]
        y = ensureSpace(doc, 30, y)
        doc.setFontSize(10)
        doc.setTextColor('#1F2937')
        y = drawWrappedText(doc, `Q${i + 1}. ${q.question}`, MARGIN, y, CONTENT_W, 5.5, 10)
        y += 1
        if (q.options && q.options.length > 0) {
          const circled = ['\u2460', '\u2461', '\u2462', '\u2463']
          for (let j = 0; j < q.options.length; j++) {
            y = drawWrappedText(doc, `  ${circled[j] || (j + 1)} ${q.options[j]}`, MARGIN + 5, y, CONTENT_W - 8, 5, 9)
          }
        }
        y += 2
        doc.setFillColor(245, 243, 255)
        const ansLines = doc.splitTextToSize(`정답: ${q.answer}`, CONTENT_W - 12)
        const ansH = ansLines.length * 5 + 4
        y = ensureSpace(doc, ansH + 2, y)
        doc.rect(MARGIN + 3, y - 2, CONTENT_W - 6, ansH, 'F')
        doc.setFontSize(9)
        doc.setTextColor('#374151')
        for (const line of ansLines) {
          doc.text(line, MARGIN + 6, y + 1)
          y += 5
        }
        y += 2
        y = drawWrappedText(doc, `해설: ${q.explanation}`, MARGIN + 5, y, CONTENT_W - 8, 5, 9, { color: '#6B7280' })
        y += 5
      }
    }

    // 9. 마스터 확인
    y = drawCapsuleSectionTitle(doc, '9. 마스터 확인', y, '#10B981')
    if (c.mastery.criteria.length > 0) {
      doc.setFontSize(9.5)
      doc.setTextColor('#1F2937')
      y = drawWrappedText(doc, '마스터 기준:', MARGIN, y, CONTENT_W, 5.5, 10)
      y += 1
      for (const cr of c.mastery.criteria) {
        y = drawWrappedText(doc, `[ ] ${cr}`, MARGIN + 3, y, CONTENT_W - 6, 5.5, 9.5)
        y += 1
      }
      y += 3
    }
    if (c.mastery.self_check.length > 0) {
      y = drawWrappedText(doc, '자기 확인 질문:', MARGIN, y, CONTENT_W, 5.5, 10)
      y += 1
      for (let i = 0; i < c.mastery.self_check.length; i++) {
        y = drawWrappedText(doc, `${i + 1}. ${c.mastery.self_check[i]}`, MARGIN + 3, y, CONTENT_W - 6, 5.5, 9.5)
        y += 1
      }
      y += 3
    }
    if (c.mastery.next_topics.length > 0) {
      doc.setFontSize(9.5)
      doc.setTextColor(PURPLE)
      y = drawWrappedText(doc, '다음 학습 추천:', MARGIN, y, CONTENT_W, 5.5, 10, { color: PURPLE })
      y += 1
      for (const nt of c.mastery.next_topics) {
        y = drawWrappedText(doc, `• ${nt}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 9.5)
      }
    }

    // 출처
    if (c.sources && c.sources.length > 0) {
      y += 5
      y = ensureSpace(doc, 10, y)
      doc.setDrawColor('#E5E7EB')
      doc.setLineWidth(0.3)
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
      y += 4
      y = drawWrappedText(doc, `참고 출처: ${c.sources.join(' | ')}`, MARGIN, y, CONTENT_W, 4.5, 8, { color: LIGHT_GRAY })
    }
  }

  // 푸터
  const tp = doc.getNumberOfPages()
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i)
    ensureKoreanFont(doc)
    doc.setFontSize(7)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(`${conceptName} — Atomic 캡슐 학습 교재`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })
    doc.text(`${i} / ${tp}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' })
  }

  return doc.output('arraybuffer') as unknown as Uint8Array
}
