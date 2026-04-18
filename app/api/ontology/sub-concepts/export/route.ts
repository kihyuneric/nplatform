export const dynamic = 'force-dynamic'

/**
 * 하위 개념 기반 강의안/전자책 DOCX 생성 API
 *
 * GET /api/ontology/sub-concepts/export?concept_id=1&type=lecture_plan|ebook
 *
 * ont_sub_concept의 합성된 콘텐츠를 활용하여 실질적인 교육 자료를 생성합니다.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
  ShadingType,
  PageBreak,
  Packer,
} from 'docx'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

const FONT = '맑은 고딕'
const TITLE_SIZE = 56
const H1_SIZE = 36
const H2_SIZE = 28
const H3_SIZE = 24
const BODY_SIZE = 22
const SMALL_SIZE = 18

function txt(content: string, opts?: { bold?: boolean; size?: number; color?: string }): TextRun {
  return new TextRun({ text: content, bold: opts?.bold, size: opts?.size || BODY_SIZE, color: opts?.color, font: FONT })
}

function heading(content: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    heading: level,
    children: [txt(content, { bold: true, size: level === HeadingLevel.HEADING_1 ? H1_SIZE : level === HeadingLevel.HEADING_2 ? H2_SIZE : H3_SIZE })],
    spacing: { before: 300, after: 150 },
  })
}

function body(content: string, opts?: { bullet?: boolean; spacing?: number }): Paragraph {
  return new Paragraph({
    children: [txt(content)],
    bullet: opts?.bullet ? { level: 0 } : undefined,
    spacing: { after: opts?.spacing ?? 100 },
  })
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [], spacing: { after: 200 } })
}

function colorBox(content: string, label: string, color: string): Paragraph[] {
  return [
    new Paragraph({
      children: [txt(label, { bold: true, size: SMALL_SIZE, color })],
      spacing: { before: 150, after: 50 },
    }),
    new Paragraph({
      children: [txt(content, { size: BODY_SIZE })],
      spacing: { after: 100 },
    }),
  ]
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const conceptId = Number(searchParams.get('concept_id'))
    const type = searchParams.get('type') || 'lecture_plan' // lecture_plan | ebook

    if (!conceptId || isNaN(conceptId)) {
      return NextResponse.json({ error: 'concept_id가 필요합니다.' }, { status: 400 })
    }

    // 1. 상위 개념 정보
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

    let relNames: Record<number, string> = {}
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

    // DOCX 생성
    const children: (Paragraph | Table)[] = []

    if (type === 'ebook') {
      // ═══════════════════════════════════════
      // 전자책 생성
      // ═══════════════════════════════════════

      // 표지
      children.push(emptyLine(), emptyLine(), emptyLine())
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(concept.name, { bold: true, size: 64 })],
        spacing: { after: 200 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt('체계적 전문 실용서', { size: H2_SIZE, color: '7C3AED' })],
        spacing: { after: 150 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`도메인: ${domain?.name || ''} | 난이도: ${'★'.repeat(concept.difficulty)}`, { size: SMALL_SIZE, color: '666666' })],
        spacing: { after: 100 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '666666' })],
        spacing: { after: 100 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`총 ${subConcepts.length}챕터 | 학습시간 ${totalMinutes}분 | 근거 영상 ${videoCount}개`, { size: SMALL_SIZE, color: '999999' })],
        spacing: { after: 100 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
      }))
      children.push(new Paragraph({ children: [new PageBreak()] }))

      // 온톨로지 분석 개요
      children.push(heading('온톨로지 분석 개요', HeadingLevel.HEADING_1))
      children.push(body(`이 책은 25,000개 이상의 부동산 전문가 강의 대본을 온톨로지 엔진으로 분석하여, "${concept.name}" 주제에 대한 체계적 교육 콘텐츠를 AI가 종합 합성한 전문 실용서입니다.`))
      children.push(body(`분석 참여 전문가: ${expertCount}명 | 관련 영상: ${videoCount}개`, { spacing: 50 }))
      children.push(body(`핵심 키워드: ${(concept.keywords || []).slice(0, 10).join(', ')}`, { spacing: 50 }))
      if (prereqIds.length > 0) {
        children.push(body(`선수 개념: ${prereqIds.map(id => relNames[id] || '').filter(Boolean).join(', ')}`, { bullet: true }))
      }
      if (successorIds.length > 0) {
        children.push(body(`후속 개념: ${successorIds.map(id => relNames[id] || '').filter(Boolean).join(', ')}`, { bullet: true }))
      }
      children.push(new Paragraph({ children: [new PageBreak()] }))

      // 목차
      children.push(heading('목차', HeadingLevel.HEADING_1))
      children.push(body('Part 1. 온톨로지 분석 개요', { spacing: 60 }))
      subConcepts.forEach((sc: any, i: number) => {
        children.push(body(`Chapter ${i + 1}. ${sc.name}`, { spacing: 60 }))
      })
      children.push(body(`Part 2. 종합 학습 체크리스트 & 자기 진단`, { spacing: 60 }))
      children.push(new Paragraph({ children: [new PageBreak()] }))

      // 챕터별 콘텐츠
      subConcepts.forEach((sc: any, i: number) => {
        const content = sc.content
        children.push(heading(`Chapter ${i + 1}: ${sc.name}`, HeadingLevel.HEADING_1))

        if (!content) {
          children.push(body(sc.description || ''))
          children.push(body(`학습 시간: ${sc.estimated_minutes}분`, { spacing: 50 }))
        } else {
          // 도입
          if (content.explanation?.introduction) {
            children.push(...colorBox(content.explanation.introduction, '■ 왜 이 주제가 중요한가', '7C3AED'))
          }

          // 핵심 설명
          if (content.explanation?.core_content) {
            children.push(...colorBox(content.explanation.core_content, '■ 핵심 개념 상세 설명', '7C3AED'))
          }

          // 실무적 의미
          if (content.explanation?.practical_meaning) {
            children.push(...colorBox(content.explanation.practical_meaning, '■ 실무적 의미', '7C3AED'))
          }

          // 이론 포인트
          if (content.theory_points && content.theory_points.length > 0) {
            children.push(new Paragraph({
              children: [txt('■ 핵심 이론 포인트', { bold: true, size: H2_SIZE, color: '2563EB' })],
              spacing: { before: 200, after: 100 },
            }))
            for (const tp of content.theory_points) {
              children.push(new Paragraph({
                children: [txt(`${tp.title} (전문가 ${tp.expert_count}명)`, { bold: true, size: BODY_SIZE })],
                spacing: { before: 100, after: 50 },
              }))
              children.push(body(tp.content))
            }
          }

          // 전문가 관점 비교
          if (content.expert_comparison) {
            children.push(new Paragraph({
              children: [txt('■ 전문가 관점 비교', { bold: true, size: H2_SIZE, color: 'D97706' })],
              spacing: { before: 200, after: 100 },
            }))
            if (content.expert_comparison.overview) {
              children.push(body(content.expert_comparison.overview))
            }
            if (content.expert_comparison.perspectives) {
              for (const p of content.expert_comparison.perspectives) {
                children.push(new Paragraph({
                  children: [txt(p.label, { bold: true, size: BODY_SIZE })],
                  spacing: { before: 80, after: 30 },
                }))
                children.push(body(p.viewpoint))
                if (p.pros_cons) {
                  children.push(new Paragraph({
                    children: [txt(p.pros_cons, { size: SMALL_SIZE, color: '666666' })],
                    spacing: { after: 50 },
                  }))
                }
              }
            }
            if (content.expert_comparison.synthesis) {
              children.push(body(content.expert_comparison.synthesis, { spacing: 100 }))
            }
          }

          // 실전 사례
          if (content.practical_cases && content.practical_cases.length > 0) {
            children.push(new Paragraph({
              children: [txt('■ 실전 사례', { bold: true, size: H2_SIZE, color: '059669' })],
              spacing: { before: 200, after: 100 },
            }))
            for (const pc of content.practical_cases) {
              children.push(new Paragraph({
                children: [txt(pc.title, { bold: true, size: BODY_SIZE })],
                spacing: { before: 80, after: 30 },
              }))
              children.push(body(pc.scenario))
              children.push(new Paragraph({
                children: [txt(`교훈: ${pc.lesson}`, { bold: true, size: BODY_SIZE, color: '059669' })],
                spacing: { after: 80 },
              }))
            }
          }

          // 학습 체크리스트
          if (content.checklist && content.checklist.length > 0) {
            children.push(new Paragraph({
              children: [txt('■ 학습 체크리스트', { bold: true, size: H2_SIZE, color: '4F46E5' })],
              spacing: { before: 200, after: 100 },
            }))
            for (const item of content.checklist) {
              children.push(body(`☐ ${item}`, { spacing: 50 }))
            }
          }

          // 메타 정보
          if (content.meta) {
            children.push(emptyLine())
            children.push(new Paragraph({
              children: [txt(
                `출처: 전문가 ${content.meta.source_expert_count}명, 영상 ${content.meta.source_video_count}개 | ${content.meta.ai_generated ? 'AI 합성' : '대본 기반'} | ${content.meta.generated_at?.substring(0, 10) || ''}`,
                { size: SMALL_SIZE, color: '999999' }
              )],
            }))
          }
        }

        // 챕터 간 페이지 나누기
        if (i < subConcepts.length - 1) {
          children.push(new Paragraph({ children: [new PageBreak()] }))
        }
      })

      // 종합 자기 진단
      children.push(new Paragraph({ children: [new PageBreak()] }))
      children.push(heading('종합 학습 체크리스트 & 자기 진단', HeadingLevel.HEADING_1))

      // 전체 체크리스트 모음
      const allChecklist = subConcepts
        .filter((sc: any) => sc.content?.checklist)
        .flatMap((sc: any) => sc.content.checklist)
      if (allChecklist.length > 0) {
        children.push(new Paragraph({
          children: [txt('전체 학습 체크리스트', { bold: true, size: H2_SIZE })],
          spacing: { before: 100, after: 100 },
        }))
        for (const item of allChecklist) {
          children.push(body(`☐ ${item}`, { spacing: 40 }))
        }
      }

      // 전체 자기 진단 모음
      const allSelfAssessment = subConcepts
        .filter((sc: any) => sc.content?.self_assessment)
        .flatMap((sc: any) => sc.content.self_assessment)
      if (allSelfAssessment.length > 0) {
        children.push(new Paragraph({
          children: [txt('자기 진단 질문', { bold: true, size: H2_SIZE })],
          spacing: { before: 200, after: 100 },
        }))
        allSelfAssessment.forEach((sa: any, i: number) => {
          children.push(body(`Q${i + 1}. ${sa.question}`, { spacing: 30 }))
          children.push(new Paragraph({
            children: [txt(`힌트: ${sa.hint}`, { size: SMALL_SIZE, color: '999999' })],
            spacing: { after: 80 },
          }))
        })
      }

      // 다음 학습 추천
      if (successorIds.length > 0) {
        children.push(emptyLine())
        children.push(new Paragraph({
          children: [txt('다음 학습 추천', { bold: true, size: H2_SIZE })],
          spacing: { before: 200, after: 100 },
        }))
        children.push(body(`이 책을 완료한 후, 다음 개념을 학습하시면 됩니다: ${successorIds.map(id => relNames[id]).filter(Boolean).join(', ')}`))
      }

      // 꼬리말
      children.push(emptyLine())
      children.push(new Paragraph({
        children: [txt(`출처: NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석하여 생성한 콘텐츠입니다.`, { size: SMALL_SIZE, color: '999999' })],
      }))

    } else {
      // ═══════════════════════════════════════
      // 강의안 생성
      // ═══════════════════════════════════════

      // 표지
      children.push(emptyLine(), emptyLine())
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(concept.name, { bold: true, size: TITLE_SIZE })],
        spacing: { after: 200 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt('AI 합성 강의안', { size: H2_SIZE, color: '7C3AED' })],
        spacing: { after: 100 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`도메인: ${domain?.name || ''} | 난이도: ${'★'.repeat(concept.difficulty)} | 총 ${totalMinutes}분`, { size: SMALL_SIZE, color: '666666' })],
        spacing: { after: 100 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석`, { size: SMALL_SIZE, color: '666666' })],
        spacing: { after: 100 },
      }))
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [txt(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, { size: SMALL_SIZE, color: '999999' })],
      }))
      children.push(new Paragraph({ children: [new PageBreak()] }))

      // 온톨로지 분석 개요
      children.push(heading('0. 온톨로지 분석 개요', HeadingLevel.HEADING_1))
      children.push(body(`이 강의안은 25,000개 이상의 부동산 전문가 강의 대본을 온톨로지 엔진으로 분석하여, "${concept.name}" 주제에 대한 최적의 강의 구조를 AI가 설계한 결과물입니다.`))
      children.push(body(`분석 참여 전문가: ${expertCount}명 | 관련 영상: ${videoCount}개`))
      children.push(body(`하위 개념: ${subConcepts.length}개 | 총 학습 시간: ${totalMinutes}분 (${Math.round(totalMinutes / 60 * 10) / 10}시간)`))
      if (prereqIds.length > 0) {
        children.push(body(`선수 개념: ${prereqIds.map(id => relNames[id]).filter(Boolean).join(', ')}`, { bullet: true }))
      }
      if (successorIds.length > 0) {
        children.push(body(`후속 개념: ${successorIds.map(id => relNames[id]).filter(Boolean).join(', ')}`, { bullet: true }))
      }
      children.push(emptyLine())

      // 강의 개요
      children.push(heading('1. 강의 개요', HeadingLevel.HEADING_1))
      children.push(body(`강의 목표: ${concept.description}`))
      children.push(body(`대상 수준: ${concept.difficulty <= 2 ? '초보~중급' : '중급~고급'}`))
      children.push(body(`총 소요시간: ${totalMinutes}분`))
      children.push(body(`섹션 수: ${subConcepts.length}개 (하위 개념별 1개 섹션)`))
      children.push(emptyLine())

      // 커리큘럼 시간표
      children.push(heading('2. 커리큘럼 시간표', HeadingLevel.HEADING_1))

      const headerCells = ['시간', '내용', '방식', '근거 영상'].map(label =>
        new TableCell({
          children: [new Paragraph({ children: [txt(label, { bold: true, size: SMALL_SIZE, color: 'FFFFFF' })] })],
          shading: { type: ShadingType.SOLID, color: '7C3AED' },
        })
      )

      let time = 5
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [txt('0:00~0:05', { size: SMALL_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [txt('오프닝 & 개념 지도', { size: SMALL_SIZE, bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [txt('설명', { size: SMALL_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [txt('-', { size: SMALL_SIZE })] })] }),
          ],
        }),
      ]

      for (const sc of subConcepts) {
        const start = time
        const end = time + (sc.estimated_minutes || 15)
        time = end
        const fmt = (m: number) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}`
        const method = sc.order_in_parent <= 2 ? '이론' : sc.order_in_parent <= 5 ? '이론+사례' : '실습'
        tableRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [txt(`${fmt(start)}~${fmt(end)}`, { size: SMALL_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [txt(sc.name, { size: SMALL_SIZE, bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [txt(method, { size: SMALL_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [txt(`${sc.source_video_count || 0}개`, { size: SMALL_SIZE })] })] }),
          ],
        }))
      }

      tableRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [txt(`${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}~`, { size: SMALL_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [txt('종합 정리 & Q&A', { size: SMALL_SIZE, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [txt('참여', { size: SMALL_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [txt('-', { size: SMALL_SIZE })] })] }),
        ],
      }))

      children.push(new Table({
        rows: [new TableRow({ children: headerCells }), ...tableRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }))
      children.push(emptyLine())

      // 섹션별 강의 노트
      children.push(new Paragraph({ children: [new PageBreak()] }))
      children.push(heading('3. 섹션별 강의 노트', HeadingLevel.HEADING_1))

      for (const sc of subConcepts) {
        const content = sc.content
        children.push(new Paragraph({
          children: [txt(`■ 섹션 ${sc.order_in_parent}: ${sc.name} (${sc.estimated_minutes}분)`, { bold: true, size: H2_SIZE })],
          spacing: { before: 250, after: 100 },
        }))
        children.push(new Paragraph({
          children: [txt(sc.description, { size: SMALL_SIZE, color: '666666' })],
          spacing: { after: 100 },
        }))

        if (!content) {
          children.push(body('(콘텐츠 미합성 - AI 합성 후 업데이트됩니다)'))
        } else {
          // 강의 도입
          if (content.explanation?.introduction) {
            children.push(new Paragraph({
              children: [txt('도입 멘트:', { bold: true, size: BODY_SIZE, color: '7C3AED' })],
              spacing: { before: 50, after: 30 },
            }))
            children.push(body(content.explanation.introduction))
          }

          // 핵심 강의 내용
          if (content.explanation?.core_content) {
            children.push(new Paragraph({
              children: [txt('핵심 강의 내용:', { bold: true, size: BODY_SIZE, color: '7C3AED' })],
              spacing: { before: 100, after: 30 },
            }))
            children.push(body(content.explanation.core_content))
          }

          // 핵심 포인트
          if (content.theory_points && content.theory_points.length > 0) {
            children.push(new Paragraph({
              children: [txt('핵심 포인트:', { bold: true, size: BODY_SIZE, color: '2563EB' })],
              spacing: { before: 100, after: 30 },
            }))
            for (const tp of content.theory_points) {
              children.push(body(`• ${tp.title}: ${tp.content.substring(0, 200)}${tp.content.length > 200 ? '...' : ''}`, { spacing: 50 }))
            }
          }

          // 사례 활용
          if (content.practical_cases && content.practical_cases.length > 0) {
            children.push(new Paragraph({
              children: [txt('활용 사례:', { bold: true, size: BODY_SIZE, color: '059669' })],
              spacing: { before: 100, after: 30 },
            }))
            for (const pc of content.practical_cases.slice(0, 2)) {
              children.push(body(`[${pc.title}] ${pc.scenario.substring(0, 150)}...`, { spacing: 50 }))
            }
          }

          // 예상 질문
          if (content.self_assessment && content.self_assessment.length > 0) {
            children.push(new Paragraph({
              children: [txt('예상 질문:', { bold: true, size: BODY_SIZE, color: 'D97706' })],
              spacing: { before: 100, after: 30 },
            }))
            for (const sa of content.self_assessment.slice(0, 3)) {
              children.push(body(`Q. ${sa.question}`, { spacing: 30 }))
              children.push(new Paragraph({
                children: [txt(`   → 힌트: ${sa.hint}`, { size: SMALL_SIZE, color: '999999' })],
                spacing: { after: 50 },
              }))
            }
          }
        }
      }

      // 꼬리말
      children.push(emptyLine())
      children.push(new Paragraph({
        children: [txt(`출처: NPLatform 부동산 전문가 ${expertCount}명의 강의를 AI가 종합 분석하여 생성한 강의안입니다.`, { size: SMALL_SIZE, color: '999999' })],
      }))
    }

    // 문서 생성
    const doc = new Document({
      styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
      sections: [{ children }],
    })

    const buffer = await Packer.toBuffer(doc) as Buffer
    const typeLabel = type === 'ebook' ? '전자책' : '강의안'
    const filename = encodeURIComponent(`${concept.name}_${typeLabel}_하위개념기반.docx`)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[sub-concepts/export] Error:', error)
    return NextResponse.json(
      { error: 'DOCX 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
