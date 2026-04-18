export const dynamic = 'force-dynamic'

// Atomic 캡슐 검색 API
// GET ?q=검색어&limit=20&offset=0
// 캡슐 주제, 설명, 개념명에서 통합 검색

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  const difficulty = searchParams.get('difficulty') // beginner, intermediate, advanced
  const conceptId = searchParams.get('concept_id')

  if (!query || query.length < 1) {
    return NextResponse.json({ error: '검색어를 입력해주세요 (q 파라미터)', results: [] }, { status: 400 })
  }

  try {
    // 1. Atomic 캡슐에서 topic, description 검색
    let capsuleQuery = supabase
      .from('ont_atomic_capsule')
      .select('atomic_id, concept_id, topic, description, order_in_concept, difficulty, estimated_min, content_json')
      .or(`topic.ilike.%${query}%,description.ilike.%${query}%`)
      .order('concept_id')
      .order('order_in_concept')

    if (difficulty) {
      capsuleQuery = capsuleQuery.eq('difficulty', difficulty)
    }
    if (conceptId) {
      capsuleQuery = capsuleQuery.eq('concept_id', Number(conceptId))
    }

    const { data: capsules, error: capsuleError } = await capsuleQuery
      .range(offset, offset + limit - 1)

    if (capsuleError) throw capsuleError

    // 2. 해당 캡슐들의 개념 정보 조회
    const conceptIds = [...new Set((capsules || []).map(c => c.concept_id))]
    let conceptMap = new Map<number, { name: string; level: string; domain_name: string }>()

    if (conceptIds.length > 0) {
      const { data: concepts } = await supabase
        .from('ont_concept')
        .select('concept_id, name, level, domain:ont_domain(name)')
        .in('concept_id', conceptIds)

      if (concepts) {
        for (const c of concepts) {
          conceptMap.set(c.concept_id, {
            name: c.name,
            level: c.level,
            domain_name: (c.domain as any)?.name || '',
          })
        }
      }
    }

    // 3. 결과 조합 + 관련도 점수 계산
    const results = (capsules || []).map(cap => {
      const concept = conceptMap.get(cap.concept_id)
      const topicMatch = cap.topic?.toLowerCase().includes(query.toLowerCase())
      const descMatch = cap.description?.toLowerCase().includes(query.toLowerCase())

      // 간단한 관련도 점수 (topic 매치가 더 높은 점수)
      let relevanceScore = 0
      if (topicMatch) relevanceScore += 80
      if (descMatch) relevanceScore += 40

      // content_json에서 정의 추출 (미리보기용)
      let preview = cap.description || ''
      if (!preview && cap.content_json) {
        try {
          const content = typeof cap.content_json === 'string' ? JSON.parse(cap.content_json) : cap.content_json
          if (content.definition?.plain) {
            preview = content.definition.plain.slice(0, 150)
          }
        } catch { /* best-effort: ignore parse/network errors */ }
      }

      return {
        atomic_id: cap.atomic_id,
        concept_id: cap.concept_id,
        topic: cap.topic,
        description: cap.description,
        preview: preview.slice(0, 200),
        order_in_concept: cap.order_in_concept,
        difficulty: cap.difficulty,
        estimated_min: cap.estimated_min,
        concept_name: concept?.name || '',
        concept_level: concept?.level || '',
        domain_name: concept?.domain_name || '',
        relevance_score: relevanceScore,
      }
    })

    // 관련도 순 정렬
    results.sort((a, b) => b.relevance_score - a.relevance_score)

    // 4. 전체 개수 (페이지네이션용)
    let countQuery = supabase
      .from('ont_atomic_capsule')
      .select('atomic_id', { count: 'exact', head: true })
      .or(`topic.ilike.%${query}%,description.ilike.%${query}%`)

    if (difficulty) countQuery = countQuery.eq('difficulty', difficulty)
    if (conceptId) countQuery = countQuery.eq('concept_id', Number(conceptId))

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      query,
      total: totalCount || 0,
      offset,
      limit,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
