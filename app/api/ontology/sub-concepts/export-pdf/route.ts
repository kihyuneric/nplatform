export const dynamic = 'force-dynamic'

/**
 * 하위 개념 기반 강의안/전자책 PDF 생성 API
 *
 * GET /api/ontology/sub-concepts/export-pdf?concept_id=1&type=lecture_plan|ebook
 *
 * ont_sub_concept의 합성된 콘텐츠를 활용하여 실질적인 PDF 교육 자료를 생성합니다.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as fs from 'fs'
import * as path from 'path'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - MARGIN * 2
const PURPLE = '#7C3AED'
const BLUE = '#2563EB'
const GREEN = '#059669'
const AMBER = '#D97706'
const GRAY = '#666666'
const LIGHT_GRAY = '#999999'

// ─── 한글 폰트 등록 ─────────────────────────────

let _koreanFontBase64: string | null = null

function getKoreanFontBase64(): string | null {
  if (_koreanFontBase64 !== null) return _koreanFontBase64
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'malgun.ttf')
    if (fs.existsSync(fontPath)) {
      _koreanFontBase64 = fs.readFileSync(fontPath).toString('base64')
      return _koreanFontBase64
    }
  } catch { /* ignore */ }
  _koreanFontBase64 = ''
  return null
}

function createDoc(): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const base64 = getKoreanFontBase64()
  if (base64) {
    try {
      doc.addFileToVFS('malgun.ttf', base64)
      doc.addFont('malgun.ttf', 'MalgunGothic', 'normal')
      doc.setFont('MalgunGothic')
    } catch { /* fallback to default font */ }
  }
  return doc
}

// ─── 헬퍼 ───────────────────────────────────────

function ensureSpace(doc: jsPDF, needed: number, y: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function drawWrapped(
  doc: jsPDF, text: string, x: number, y: number,
  maxWidth: number, lineH: number, fontSize: number,
  opts?: { color?: string }
): number {
  if (!text) return y
  doc.setFontSize(fontSize)
  doc.setTextColor(opts?.color || '#333333')
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = ensureSpace(doc, lineH, y)
    doc.text(line, x, y)
    y += lineH
  }
  return y
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, 14, y)
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

function subTitle(doc: jsPDF, title: string, y: number, color: string): number {
  y = ensureSpace(doc, 10, y)
  doc.setFontSize(12)
  doc.setTextColor(color)
  doc.text(title, MARGIN, y)
  y += 7
  doc.setTextColor('#333333')
  return y
}

function pageBreak(doc: jsPDF): number {
  doc.addPage()
  return MARGIN
}

// ─── 메인 핸들러 ──────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const conceptId = Number(searchParams.get('concept_id'))
    const type = searchParams.get('type') || 'lecture_plan'

    if (!conceptId || isNaN(conceptId)) {
      return NextResponse.json({ error: 'concept_id가 필요합니다.' }, { status: 400 })
    }

    // 1. 상위 개념
    const { data: concept } = await supabase
      .from('ont_concept')
      .select('concept_id, name, description, difficulty, keywords, domain_id')
      .eq('concept_id', conceptId)
      .single()

    if (!concept) {
      return NextResponse.json({ error: '개념을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 2. 도메인
    const { data: domain } = await supabase
      .from('ont_domain')
      .select('name, color')
      .eq('domain_id', concept.domain_id)
      .single()

    // 3. 하위 개념 + 콘텐츠
    const { data: subConcepts } = await supabase
      .from('ont_sub_concept')
      .select('*')
      .eq('concept_id', conceptId)
      .order('order_in_parent')

    if (!subConcepts || subConcepts.length === 0) {
      return NextResponse.json({ error: '하위 개념이 없습니다.' }, { status: 404 })
    }

    // 4. 중요도
    const { data: importance } = await supabase
      .from('ont_concept_importance')
      .select('expert_count, video_count')
      .eq('concept_id', conceptId)
      .single()

    // 5. 관계
    const { data: rels } = await supabase
      .from('ont_relation')
      .select('relation_type, source_concept_id, target_concept_id')
      .or(`source_concept_id.eq.${conceptId},target_concept_id.eq.${conceptId}`)

    const prereqIds = (rels || [])
      .filter(r => r.relation_type === 'prerequisite' && r.target_concept_id === conceptId)
      .map(r => r.source_concept_id)
    const successorIds = (rels || [])
      .filter(r => r.relation_type === 'prerequisite' && r.source_concept_id === conceptId)
      .map(r => r.target_concept_id)

    const relNames: Record<number, string> = {}
    const allRelIds = [...prereqIds, ...successorIds]
    if (allRelIds.length > 0) {
      const { data: relConcepts } = await supabase
        .from('ont_concept')
        .select('concept_id, name')
        .in('concept_id', allRelIds)
      for (const rc of (relConcepts || [])) relNames[rc.concept_id] = rc.name
    }

    const expertCount = importance?.expert_count || 0
    const videoCount = importance?.video_count || 0
    const totalMinutes = subConcepts.reduce((sum: number, sc: any) => sum + (sc.estimated_minutes || 0), 0)

    // PDF 생성 (한글 폰트 자동 등록)
    const doc = createDoc()

    if (type === 'ebook') {
      // ═══════════════════════════════════════
      // 전자책 PDF
      // ═══════════════════════════════════════

      // 표지
      let y = 60
      doc.setFontSize(32)
      doc.setTextColor(PURPLE)
      const titleLines = doc.splitTextToSize(concept.name, CONTENT_W)
      for (const line of titleLines) {
        doc.text(line, PAGE_W / 2, y, { align: 'center' })
        y += 16
      }
      y += 6
      doc.setFontSize(16)
      doc.text('체계적 전문 실용서', PAGE_W / 2, y, { align: 'center' })
      y += 12
      doc.setFontSize(10)
      doc.setTextColor(GRAY)
      doc.text(`도메인: ${domain?.name || ''} | 난이도: ${'★'.repeat(concept.difficulty)}`, PAGE_W / 2, y, { align: 'center' })
      y += 8
      doc.text(`NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, PAGE_W / 2, y, { align: 'center' })
      y += 8
      doc.setFontSize(9)
      doc.setTextColor(LIGHT_GRAY)
      doc.text(`총 ${subConcepts.length}챕터 | 학습시간 ${totalMinutes}분 | 근거 영상 ${videoCount}개`, PAGE_W / 2, y, { align: 'center' })
      y += 8
      doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

      // 온톨로지 분석 개요
      y = pageBreak(doc)
      y = sectionTitle(doc, '온톨로지 분석 개요', y)
      y = drawWrapped(doc, `이 책은 25,000개 이상의 부동산 전문가 강의 대본을 온톨로지 엔진으로 분석하여, "${concept.name}" 주제에 대한 체계적 교육 콘텐츠를 AI가 종합 합성한 전문 실용서입니다.`, MARGIN, y, CONTENT_W, 6, 10)
      y += 2
      y = drawWrapped(doc, `분석 참여 전문가: ${expertCount}명 | 관련 영상: ${videoCount}개`, MARGIN, y, CONTENT_W, 6, 10)
      y = drawWrapped(doc, `핵심 키워드: ${(concept.keywords || []).slice(0, 10).join(', ')}`, MARGIN, y, CONTENT_W, 6, 10)
      y += 2
      if (prereqIds.length > 0) {
        y = drawWrapped(doc, `• 선수 개념: ${prereqIds.map(id => relNames[id]).filter(Boolean).join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      }
      if (successorIds.length > 0) {
        y = drawWrapped(doc, `• 후속 개념: ${successorIds.map(id => relNames[id]).filter(Boolean).join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      }

      // 목차
      y = pageBreak(doc)
      y = sectionTitle(doc, '목차', y)
      y = drawWrapped(doc, 'Part 1. 온톨로지 분석 개요', MARGIN + 5, y, CONTENT_W - 5, 7, 11)
      for (let i = 0; i < subConcepts.length; i++) {
        y = drawWrapped(doc, `Chapter ${i + 1}. ${subConcepts[i].name}`, MARGIN + 5, y, CONTENT_W - 5, 7, 11)
      }
      y = drawWrapped(doc, 'Part 2. 종합 학습 체크리스트 & 자기 진단', MARGIN + 5, y, CONTENT_W - 5, 7, 11)

      // 챕터별 콘텐츠
      for (let i = 0; i < subConcepts.length; i++) {
        const sc = subConcepts[i]
        const content = sc.content

        y = pageBreak(doc)
        y = sectionTitle(doc, `Chapter ${i + 1}: ${sc.name}`, y)

        if (!content) {
          y = drawWrapped(doc, sc.description || '', MARGIN, y, CONTENT_W, 6, 10)
          y = drawWrapped(doc, `학습 시간: ${sc.estimated_minutes}분`, MARGIN, y, CONTENT_W, 6, 9, { color: GRAY })
          continue
        }

        // 도입
        if (content.explanation?.introduction) {
          y = subTitle(doc, '■ 왜 이 주제가 중요한가', y, PURPLE)
          y = drawWrapped(doc, content.explanation.introduction, MARGIN, y, CONTENT_W, 5.5, 10)
          y += 4
        }

        // 핵심 설명
        if (content.explanation?.core_content) {
          y = subTitle(doc, '■ 핵심 개념 상세 설명', y, PURPLE)
          y = drawWrapped(doc, content.explanation.core_content, MARGIN, y, CONTENT_W, 5.5, 10)
          y += 4
        }

        // 실무적 의미
        if (content.explanation?.practical_meaning) {
          y = subTitle(doc, '■ 실무적 의미', y, PURPLE)
          y = drawWrapped(doc, content.explanation.practical_meaning, MARGIN, y, CONTENT_W, 5.5, 10)
          y += 4
        }

        // 이론 포인트
        if (content.theory_points && content.theory_points.length > 0) {
          y = subTitle(doc, '■ 핵심 이론 포인트', y, BLUE)
          for (const tp of content.theory_points) {
            y = ensureSpace(doc, 15, y)
            doc.setFontSize(11)
            doc.setTextColor('#333333')
            doc.text(`${tp.title} (전문가 ${tp.expert_count}명)`, MARGIN + 3, y)
            y += 6
            y = drawWrapped(doc, tp.content, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
            y += 3
          }
        }

        // 전문가 관점 비교
        if (content.expert_comparison) {
          y = subTitle(doc, '■ 전문가 관점 비교', y, AMBER)
          if (content.expert_comparison.overview) {
            y = drawWrapped(doc, content.expert_comparison.overview, MARGIN, y, CONTENT_W, 5.5, 10)
            y += 2
          }
          if (content.expert_comparison.perspectives) {
            for (const p of content.expert_comparison.perspectives) {
              y = ensureSpace(doc, 12, y)
              doc.setFontSize(10)
              doc.setTextColor(AMBER)
              doc.text(p.label, MARGIN + 3, y)
              y += 5.5
              y = drawWrapped(doc, p.viewpoint, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
              if (p.pros_cons) {
                y = drawWrapped(doc, p.pros_cons, MARGIN + 3, y, CONTENT_W - 3, 5, 9, { color: GRAY })
              }
              y += 2
            }
          }
          if (content.expert_comparison.synthesis) {
            y = drawWrapped(doc, content.expert_comparison.synthesis, MARGIN, y, CONTENT_W, 5.5, 10)
            y += 3
          }
        }

        // 실전 사례
        if (content.practical_cases && content.practical_cases.length > 0) {
          y = subTitle(doc, '■ 실전 사례', y, GREEN)
          for (const pc of content.practical_cases) {
            y = ensureSpace(doc, 15, y)
            doc.setFontSize(11)
            doc.setTextColor('#333333')
            doc.text(pc.title, MARGIN + 3, y)
            y += 6
            y = drawWrapped(doc, pc.scenario, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
            y += 1
            y = drawWrapped(doc, `교훈: ${pc.lesson}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10, { color: GREEN })
            y += 3
          }
        }

        // 학습 체크리스트
        if (content.checklist && content.checklist.length > 0) {
          y = subTitle(doc, '■ 학습 체크리스트', y, '#4F46E5')
          for (const item of content.checklist) {
            y = drawWrapped(doc, `☐ ${item}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
          }
          y += 3
        }

        // 메타
        if (content.meta) {
          y += 2
          y = drawWrapped(doc,
            `출처: 전문가 ${content.meta.source_expert_count}명, 영상 ${content.meta.source_video_count}개 | ${content.meta.ai_generated ? 'AI 합성' : '대본 기반'} | ${content.meta.generated_at?.substring(0, 10) || ''}`,
            MARGIN, y, CONTENT_W, 5, 8, { color: LIGHT_GRAY }
          )
        }
      }

      // 종합 학습 체크리스트 & 자기 진단
      y = pageBreak(doc)
      y = sectionTitle(doc, '종합 학습 체크리스트 & 자기 진단', y)

      const allChecklist = subConcepts
        .filter((sc: any) => sc.content?.checklist)
        .flatMap((sc: any) => sc.content.checklist)
      if (allChecklist.length > 0) {
        y = subTitle(doc, '전체 학습 체크리스트', y, PURPLE)
        for (const item of allChecklist) {
          y = drawWrapped(doc, `☐ ${item}`, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
        }
        y += 6
      }

      const allSelfAssessment = subConcepts
        .filter((sc: any) => sc.content?.self_assessment)
        .flatMap((sc: any) => sc.content.self_assessment)
      if (allSelfAssessment.length > 0) {
        y = subTitle(doc, '자기 진단 질문', y, PURPLE)
        allSelfAssessment.forEach((sa: any, i: number) => {
          y = ensureSpace(doc, 12, y)
          y = drawWrapped(doc, `Q${i + 1}. ${sa.question}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
          y = drawWrapped(doc, `힌트: ${sa.hint}`, MARGIN + 6, y, CONTENT_W - 6, 5, 9, { color: GRAY })
          y += 2
        })
      }

      // 다음 학습 추천
      if (successorIds.length > 0) {
        y += 4
        y = subTitle(doc, '다음 학습 추천', y, PURPLE)
        y = drawWrapped(doc,
          `이 책을 완료한 후, 다음 개념을 학습하시면 됩니다: ${successorIds.map(id => relNames[id]).filter(Boolean).join(', ')}`,
          MARGIN, y, CONTENT_W, 6, 10
        )
      }

      // 꼬리말
      y += 8
      y = drawWrapped(doc,
        `출처: NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석하여 생성한 콘텐츠입니다.`,
        MARGIN, y, CONTENT_W, 5, 8, { color: LIGHT_GRAY }
      )

    } else {
      // ═══════════════════════════════════════
      // 강의안 PDF
      // ═══════════════════════════════════════

      // 표지
      let y = 70
      doc.setFontSize(28)
      doc.setTextColor(PURPLE)
      const titleLines = doc.splitTextToSize(concept.name, CONTENT_W)
      for (const line of titleLines) {
        doc.text(line, PAGE_W / 2, y, { align: 'center' })
        y += 14
      }
      y += 6
      doc.setFontSize(16)
      doc.text('AI 합성 강의안', PAGE_W / 2, y, { align: 'center' })
      y += 10
      doc.setFontSize(10)
      doc.setTextColor(GRAY)
      doc.text(`도메인: ${domain?.name || ''} | 난이도: ${'★'.repeat(concept.difficulty)} | 총 ${totalMinutes}분`, PAGE_W / 2, y, { align: 'center' })
      y += 8
      doc.text(`NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, PAGE_W / 2, y, { align: 'center' })
      y += 8
      doc.setFontSize(9)
      doc.setTextColor(LIGHT_GRAY)
      doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, PAGE_W / 2, y, { align: 'center' })

      // 온톨로지 분석 개요
      y = pageBreak(doc)
      y = sectionTitle(doc, '0. 온톨로지 분석 개요', y)
      y = drawWrapped(doc, `이 강의안은 25,000개 이상의 부동산 전문가 강의 대본을 온톨로지 엔진으로 분석하여, "${concept.name}" 주제에 대한 최적의 강의 구조를 AI가 설계한 결과물입니다.`, MARGIN, y, CONTENT_W, 6, 10)
      y += 2
      y = drawWrapped(doc, `분석 참여 전문가: ${expertCount}명 | 관련 영상: ${videoCount}개`, MARGIN, y, CONTENT_W, 6, 10)
      y = drawWrapped(doc, `하위 개념: ${subConcepts.length}개 | 총 학습 시간: ${totalMinutes}분 (${Math.round(totalMinutes / 60 * 10) / 10}시간)`, MARGIN, y, CONTENT_W, 6, 10)
      if (prereqIds.length > 0) {
        y = drawWrapped(doc, `• 선수 개념: ${prereqIds.map(id => relNames[id]).filter(Boolean).join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      }
      if (successorIds.length > 0) {
        y = drawWrapped(doc, `• 후속 개념: ${successorIds.map(id => relNames[id]).filter(Boolean).join(', ')}`, MARGIN + 3, y, CONTENT_W - 3, 6, 10)
      }
      y += 6

      // 강의 개요
      y = sectionTitle(doc, '1. 강의 개요', y)
      y = drawWrapped(doc, `강의 목표: ${concept.description}`, MARGIN, y, CONTENT_W, 6, 10)
      y = drawWrapped(doc, `대상 수준: ${concept.difficulty <= 2 ? '초보~중급' : '중급~고급'}`, MARGIN, y, CONTENT_W, 6, 10)
      y = drawWrapped(doc, `총 소요시간: ${totalMinutes}분`, MARGIN, y, CONTENT_W, 6, 10)
      y = drawWrapped(doc, `섹션 수: ${subConcepts.length}개 (하위 개념별 1개 섹션)`, MARGIN, y, CONTENT_W, 6, 10)
      y += 6

      // 커리큘럼 시간표
      y = sectionTitle(doc, '2. 커리큘럼 시간표', y)

      let time = 5
      const tableBody: string[][] = [
        ['0:00~0:05', '오프닝 & 개념 지도', '설명', '-'],
      ]
      for (const sc of subConcepts) {
        const start = time
        const end = time + (sc.estimated_minutes || 15)
        time = end
        const fmt = (m: number) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}`
        const method = sc.order_in_parent <= 2 ? '이론' : sc.order_in_parent <= 5 ? '이론+사례' : '실습'
        tableBody.push([
          `${fmt(start)}~${fmt(end)}`,
          sc.name,
          method,
          `${sc.source_video_count || 0}개`,
        ])
      }
      tableBody.push([
        `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}~`,
        '종합 정리 & Q&A',
        '참여',
        '-',
      ])

      autoTable(doc, {
        startY: y,
        head: [['시간', '내용', '방식', '근거 영상']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
        },
        margin: { left: MARGIN, right: MARGIN },
      })
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 50

      // 섹션별 강의 노트
      y = pageBreak(doc)
      y = sectionTitle(doc, '3. 섹션별 강의 노트', y)

      for (const sc of subConcepts) {
        const content = sc.content

        y = ensureSpace(doc, 30, y)
        doc.setFontSize(13)
        doc.setTextColor(PURPLE)
        doc.text(`■ 섹션 ${sc.order_in_parent}: ${sc.name} (${sc.estimated_minutes}분)`, MARGIN, y)
        y += 7
        y = drawWrapped(doc, sc.description, MARGIN + 3, y, CONTENT_W - 3, 5, 9, { color: GRAY })
        y += 3

        if (!content) {
          y = drawWrapped(doc, '(콘텐츠 미합성 - AI 합성 후 업데이트됩니다)', MARGIN + 3, y, CONTENT_W - 3, 6, 10, { color: GRAY })
          y += 6
          continue
        }

        // 도입 멘트
        if (content.explanation?.introduction) {
          y = ensureSpace(doc, 10, y)
          doc.setFontSize(10)
          doc.setTextColor(PURPLE)
          doc.text('도입 멘트:', MARGIN + 3, y)
          y += 5.5
          y = drawWrapped(doc, content.explanation.introduction, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
          y += 3
        }

        // 핵심 강의 내용
        if (content.explanation?.core_content) {
          y = ensureSpace(doc, 10, y)
          doc.setFontSize(10)
          doc.setTextColor(PURPLE)
          doc.text('핵심 강의 내용:', MARGIN + 3, y)
          y += 5.5
          y = drawWrapped(doc, content.explanation.core_content, MARGIN + 3, y, CONTENT_W - 3, 5.5, 10)
          y += 3
        }

        // 핵심 포인트
        if (content.theory_points && content.theory_points.length > 0) {
          y = ensureSpace(doc, 10, y)
          doc.setFontSize(10)
          doc.setTextColor(BLUE)
          doc.text('핵심 포인트:', MARGIN + 3, y)
          y += 5.5
          for (const tp of content.theory_points) {
            const summary = tp.content.length > 200 ? tp.content.substring(0, 200) + '...' : tp.content
            y = drawWrapped(doc, `• ${tp.title}: ${summary}`, MARGIN + 5, y, CONTENT_W - 5, 5.5, 9)
            y += 1
          }
          y += 2
        }

        // 사례 활용
        if (content.practical_cases && content.practical_cases.length > 0) {
          y = ensureSpace(doc, 10, y)
          doc.setFontSize(10)
          doc.setTextColor(GREEN)
          doc.text('활용 사례:', MARGIN + 3, y)
          y += 5.5
          for (const pc of content.practical_cases.slice(0, 2)) {
            const scenario = pc.scenario.length > 150 ? pc.scenario.substring(0, 150) + '...' : pc.scenario
            y = drawWrapped(doc, `[${pc.title}] ${scenario}`, MARGIN + 5, y, CONTENT_W - 5, 5.5, 9)
            y += 1
          }
          y += 2
        }

        // 예상 질문
        if (content.self_assessment && content.self_assessment.length > 0) {
          y = ensureSpace(doc, 10, y)
          doc.setFontSize(10)
          doc.setTextColor(AMBER)
          doc.text('예상 질문:', MARGIN + 3, y)
          y += 5.5
          for (const sa of content.self_assessment.slice(0, 3)) {
            y = drawWrapped(doc, `Q. ${sa.question}`, MARGIN + 5, y, CONTENT_W - 5, 5.5, 9)
            y = drawWrapped(doc, `→ 힌트: ${sa.hint}`, MARGIN + 8, y, CONTENT_W - 8, 5, 8, { color: GRAY })
            y += 1
          }
        }

        y += 6
      }

      // 꼬리말
      y = ensureSpace(doc, 15, y)
      y += 5
      y = drawWrapped(doc,
        `출처: NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석하여 생성한 강의안입니다.`,
        MARGIN, y, CONTENT_W, 5, 8, { color: LIGHT_GRAY }
      )
    }

    // 페이지 번호
    const totalPages = doc.getNumberOfPages()
    const docTitle = type === 'ebook'
      ? `${concept.name} — 체계적 전문 실용서`
      : `${concept.name} — AI 합성 강의안`
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(LIGHT_GRAY)
      doc.text(docTitle, PAGE_W / 2, PAGE_H - 10, { align: 'center' })
      doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' })
    }

    const pdfBytes = doc.output('arraybuffer')
    const typeLabel = type === 'ebook' ? '전자책' : '강의안'
    const filename = encodeURIComponent(`${concept.name}_${typeLabel}_하위개념기반.pdf`)

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[sub-concepts/export-pdf] Error:', error)
    return NextResponse.json(
      { error: 'PDF 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
