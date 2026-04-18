export const dynamic = 'force-dynamic'

// Phase 5-4: AI 뉴스레터 PDF 생성 API
// GET ?type=daily_lesson&domain_id=1&concept_id=5
// → AI 뉴스레터 데이터를 생성하고 PDF로 반환

import { NextRequest, NextResponse } from 'next/server'
import { buildDailyNewsletter } from '@/lib/newsletter-data'
import { generateAINewsletterPdf } from '@/lib/pdf-generator'
import type { AINewsletterPdfData } from '@/lib/pdf-generator'
import type { NewsletterType } from '@/lib/ebook-types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'daily_lesson') as NewsletterType
    const domainId = searchParams.get('domain_id') ? Number(searchParams.get('domain_id')) : undefined
    const conceptId = searchParams.get('concept_id') ? Number(searchParams.get('concept_id')) : undefined

    // AI 뉴스레터 데이터 생성
    const newsletter = await buildDailyNewsletter({
      type,
      concept_id: conceptId,
      domain_id: domainId,
    })

    // PDF용 데이터 변환
    const pdfData: AINewsletterPdfData = {
      newsletter_type: newsletter.newsletter_type,
      title: newsletter.title,
      generated_at: newsletter.generated_at,
      ai_content: newsletter.ai_content,
      ontology_context: newsletter.ontology_context
        ? {
            keywords: newsletter.ontology_context.keywords,
            prerequisites: newsletter.ontology_context.prerequisites,
            successors: newsletter.ontology_context.successors,
            roadmap_position: newsletter.ontology_context.roadmap_position,
          }
        : undefined,
      target_capsule: newsletter.target_capsule
        ? {
            capsule_title: newsletter.target_capsule.capsule_title,
            level: newsletter.target_capsule.level,
            overview: newsletter.target_capsule.overview,
            expert_count: newsletter.target_capsule.expert_count,
          }
        : undefined,
      related_concepts: newsletter.related_concepts,
      learning_path_position: newsletter.learning_path_position,
    }

    const pdfBytes = generateAINewsletterPdf(pdfData)
    const today = new Date().toISOString().slice(0, 10)
    const filename = encodeURIComponent(`뉴스레터_${today}.pdf`)

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[newsletter/export-pdf] Error:', error)
    return NextResponse.json(
      { error: '뉴스레터 PDF 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
