export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getConceptDetail, getConceptOntologyContext } from '@/lib/ontology-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const conceptId = parseInt(id)
    if (isNaN(conceptId)) {
      return NextResponse.json({ error: '유효하지 않은 ID' }, { status: 400 })
    }

    // 기본 상세 + 온톨로지 컨텍스트 병렬 조회
    const [concept, ontologyContext] = await Promise.all([
      getConceptDetail(conceptId),
      getConceptOntologyContext(conceptId).catch(() => null),
    ])

    return NextResponse.json({
      ...concept,
      // 온톨로지 컨텍스트 병합
      ...(ontologyContext ? {
        expert_count: ontologyContext.expert_count,
        video_count: ontologyContext.video_count,
        avg_relevance: ontologyContext.avg_relevance,
        lecture_type_ratio: ontologyContext.lecture_type_ratio,
        keywords: ontologyContext.keywords,
        prerequisites: ontologyContext.prerequisites,
        successors: ontologyContext.successors,
        related: ontologyContext.related,
        roadmap_position: ontologyContext.roadmap_position,
      } : {}),
    })
  } catch (error) {
    console.error('[concept/[id]] Error:', error)
    return NextResponse.json({ error: '개념 조회 실패' }, { status: 500 })
  }
}
