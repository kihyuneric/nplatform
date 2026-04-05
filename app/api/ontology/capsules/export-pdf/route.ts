import { NextRequest, NextResponse } from 'next/server'
import { getLectureCapsules, generateCapsuleFromData, getConceptOntologyContext, getEbookCache, saveEbookCache } from '@/lib/ontology-db'
import { generateLecturePlanPdf, generateEbookPdf, generateAIEbookPdf } from '@/lib/pdf-generator'
import { enrichCapsuleWithAI, isAIAvailable } from '@/lib/ai-synthesizer'
import type { EnrichedCapsule } from '@/lib/ebook-types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conceptId = Number(searchParams.get('concept_id'))
    const type = searchParams.get('type') || 'lecture_plan'
    const useAI = searchParams.get('ai') === 'true'

    if (!conceptId || isNaN(conceptId)) {
      return NextResponse.json({ error: 'concept_id가 필요합니다.' }, { status: 400 })
    }

    let capsule
    const existing = await getLectureCapsules({ concept_id: conceptId })
    if (existing && existing.length > 0) {
      capsule = existing[0]
    } else {
      capsule = await generateCapsuleFromData(conceptId)
    }

    let pdfBytes: Uint8Array

    // AI 전자책 PDF
    if (type === 'ebook' && useAI && isAIAvailable()) {
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

      pdfBytes = enriched.ai ? generateAIEbookPdf(enriched) : generateEbookPdf(capsule)
    } else {
      pdfBytes = type === 'ebook'
        ? generateEbookPdf(capsule)
        : generateLecturePlanPdf(capsule)
    }

    const typeLabel = type === 'ebook' ? (useAI ? 'AI전자책' : '전자책') : '강의안'
    const filename = encodeURIComponent(`${capsule.capsule_title}_${typeLabel}.pdf`)

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[capsules/export-pdf] Error:', error)
    return NextResponse.json(
      { error: 'PDF 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
