export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  getLectureCapsules,
  generateCapsuleFromData,
  getConceptOntologyContext,
  getEbookCache,
  saveEbookCache,
  getLecturePlanHistory,
} from '@/lib/ontology-db'
import {
  generateLecturePlan,
  generateEbook,
  generateAIEbookDocx,
  generateAILecturePlanDocx,
  packDocxToBuffer,
} from '@/lib/docx-generator'
import { enrichCapsuleWithAI, isAIAvailable } from '@/lib/ai-synthesizer'
import type { EnrichedCapsule } from '@/lib/ebook-types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conceptId = Number(searchParams.get('concept_id'))
    const type = searchParams.get('type') || 'lecture_plan'
    const useAI = searchParams.get('ai') === 'true'
    const planId = searchParams.get('plan_id') ? Number(searchParams.get('plan_id')) : undefined
    const checkCache = searchParams.get('check_cache') === 'true'

    if (!conceptId || isNaN(conceptId)) {
      return NextResponse.json({ error: 'concept_id가 필요합니다.' }, { status: 400 })
    }

    // 캐시 상태 확인만 요청한 경우
    if (checkCache) {
      const cached = await getEbookCache(conceptId)
      return NextResponse.json({ cached: !!cached })
    }

    // Fetch or generate capsule
    let capsule
    const existing = await getLectureCapsules({ concept_id: conceptId })
    if (existing && existing.length > 0) {
      capsule = existing[0]
    } else {
      capsule = await generateCapsuleFromData(conceptId)
    }

    let doc

    if (type === 'lecture_plan') {
      // 관리자 AI 강의안 이력에서 최신/특정 강의안 사용
      const planHistory = await getLecturePlanHistory(conceptId)
      const targetPlan = planId
        ? planHistory.find((p: any) => p.plan_id === planId)
        : planHistory[0] // 최신 강의안

      if (targetPlan?.ai_result) {
        const ontologyContext = await getConceptOntologyContext(conceptId)
        doc = generateAILecturePlanDocx(capsule, targetPlan.ai_result, ontologyContext)
      } else {
        doc = generateLecturePlan(capsule)
      }
    } else if (type === 'ebook' && useAI && isAIAvailable()) {
      // AI 전자책 생성 (캐시 우선)
      const cached = await getEbookCache(conceptId)
      let enriched: EnrichedCapsule

      if (cached) {
        const ontologyContext = await getConceptOntologyContext(conceptId)
        enriched = { ...capsule, ai: cached.ai_content, ontologyContext }
      } else {
        const ontologyContext = await getConceptOntologyContext(conceptId)
        const { supabase } = await import('@/lib/ontology-db')
        const { data: videoLinks } = await supabase
          .from('ont_youtube_concept')
          .select('relevance, youtube:ont_youtube(youtube_id, title, channel_name, lecture_type)')
          .eq('concept_id', conceptId)
          .order('relevance', { ascending: false })
          .limit(20)

        const videoData = (videoLinks || []).map((vl: any) => ({
          ...vl.youtube,
          relevance: vl.relevance,
        }))

        const aiContent = await enrichCapsuleWithAI(capsule, ontologyContext, videoData)
        enriched = { ...capsule, ai: aiContent || undefined, ontologyContext }

        // 캐시 저장
        if (aiContent) {
          const totalChars = Object.values(aiContent.chapter_contents).reduce((sum, ch) => {
            return sum + (ch.introduction?.length || 0) + (ch.core_explanation?.length || 0) +
              (ch.expert_comparison?.length || 0) + (ch.practical_cases?.length || 0) +
              (ch.application_guide?.length || 0)
          }, 0)

          await saveEbookCache({
            concept_id: conceptId,
            ai_content: aiContent,
            chapter_count: capsule.syllabus.length,
            total_chars: totalChars,
            ai_model: 'claude-sonnet-4-20250514',
            ai_cost_usd: 0.015 * (capsule.syllabus.length + 1),
          })
        }
      }

      doc = enriched.ai ? generateAIEbookDocx(enriched) : generateEbook(capsule)
    } else {
      doc = generateEbook(capsule)
    }

    const buffer = await packDocxToBuffer(doc)

    // 파일명 결정
    let typeLabel: string
    if (type === 'lecture_plan') {
      typeLabel = '강의안'
    } else if (useAI) {
      typeLabel = 'AI전자책'
    } else {
      typeLabel = '전자책'
    }
    const filename = encodeURIComponent(`${capsule.capsule_title}_${typeLabel}.docx`)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[capsules/export] Error:', error)
    return NextResponse.json(
      { error: 'DOCX 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
